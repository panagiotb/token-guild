import * as vscode from 'vscode';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { renderWebviewHtml } from './webviewHtml';
import { StateManager } from './stateManager';
import { validateTokenStreamEvent, validateWebviewMessage } from '../shared/validation';
import type { WebviewToHostMessage } from '../shared/types';
import { OtlpTelemetryServer, DEFAULT_OTLP_PORT } from '../telemetry/otlpServer';
import { applyHostAction, applyHostTelemetry, checkpointHostRun, createHostRun, createHostSnapshot, advanceHostRun, getHostRunResult, restoreHostRun, type HostRunSession } from './hostRun';
import { MVP_REGISTRY } from '../game/content';
import type { HeroId } from '../game/types';
import { RestoreGate } from './restoreGate';
import { WebviewLifecycle, type WebviewAttachment } from './webviewLifecycle';

export class GuildViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  public static readonly viewId = 'tokenGuild.guildView';
  private static readonly maxActiveRuns = 4;
  private webviewView: vscode.WebviewView | undefined;
  private telemetryServer: OtlpTelemetryServer | undefined;
  private telemetryPort: number | undefined;
  private telemetryAcceptedEvents = 0;
  private telemetryLastEventAt: number | undefined;
  private telemetryError: string | undefined;
  private readonly configurationSubscription: vscode.Disposable;
  private telemetryWork: Promise<void> = Promise.resolve();
  /** Serializes webview intents and adapter events against the same host run
   * state. An OTLP callback must never race a movement/action mutation. */
  private hostWork: Promise<void> = Promise.resolve();
  private readonly activeRuns = new Map<string, HostRunSession>();
  private foregroundRunId: string | undefined;
  private readonly webviewLifecycle = new WebviewLifecycle();
  private readonly checkpointRestoreGate = new RestoreGate();

  public constructor(private readonly extensionUri: vscode.Uri, private readonly state: StateManager) {
    this.configurationSubscription = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('tokenGuild.telemetry')) void this.scheduleTelemetryConfiguration();
    });
  }

  public async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    const attachment = this.webviewLifecycle.attach();
    this.webviewView = webviewView;
    webviewView.onDidDispose(() => {
      this.webviewLifecycle.detach(attachment);
      if (this.webviewView === webviewView) this.webviewView = undefined;
    });
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview')]
    };

    webviewView.webview.onDidReceiveMessage((rawMessage: unknown) => {
      this.hostWork = this.hostWork.then(async () => {
        try {
          const message = validateWebviewMessage(rawMessage);
          if (this.webviewLifecycle.isCurrent(attachment)) await this.handleMessage(webviewView, attachment, message);
        } catch (error) {
          const detail = error instanceof Error ? error.message : 'Unknown message error';
          const candidate = rawMessage as { payload?: { runId?: unknown } };
          const runId = candidate?.payload?.runId;
          if (this.webviewLifecycle.isCurrent(attachment) && typeof runId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(runId)) {
            const session = this.activeRuns.get(runId);
            void webviewView.webview.postMessage({ version: 1, type: 'RUN_ERROR', payload: { runId, message: detail.slice(0, 240), ...(session ? { nextIntentSequence: session.lastIntentSequence + 1 } : {}) } });
          }
          void vscode.window.showErrorMessage(`Token Guild message rejected: ${detail}`);
        }
      });
      void this.hostWork;
    }, undefined, []);

    const templatePath = join(this.extensionUri.fsPath, 'dist', 'webview', 'index.html');
    const template = await readFile(templatePath, 'utf8');
    if (!this.webviewLifecycle.isCurrent(attachment)) return;
    const nonce = randomBytes(18).toString('base64url');
    webviewView.webview.html = renderWebviewHtml(
      template,
      webviewView.webview.cspSource,
      (path) => webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', path)).toString(),
      nonce
    );
    await this.scheduleTelemetryConfiguration();
  }

  public dispose(): void {
    this.webviewLifecycle.invalidate();
    this.configurationSubscription.dispose();
    void this.telemetryServer?.stop();
    // Checkpoints are already persisted after every accepted intent, but save
    // the detached final cache as a last lifecycle boundary as well. This
    // keeps extension-host reload recovery independent of webview lifetime.
    void this.state.saveRunCheckpoints([...this.activeRuns.values()].map(checkpointHostRun)).catch((error: unknown) => {
      console.warn(`Token Guild final run checkpoint was not persisted: ${error instanceof Error ? error.message : 'unknown error'}`);
    });
    this.telemetryServer = undefined;
    this.webviewView = undefined;
    this.telemetryAcceptedEvents = 0;
    this.telemetryLastEventAt = undefined;
    this.activeRuns.clear();
    this.foregroundRunId = undefined;
  }

  public async resetProgress(): Promise<void> {
    this.activeRuns.clear();
    this.foregroundRunId = undefined;
    await this.state.reset();
    if (this.webviewView) await this.webviewView.webview.postMessage({ version: 1, type: 'LOAD_PROGRESS', payload: await this.state.load() });
  }

  private scheduleTelemetryConfiguration(): Promise<void> {
    this.telemetryWork = this.telemetryWork.then(() => this.configureTelemetry());
    return this.telemetryWork;
  }

  private telemetrySettings(): { syntheticEnabled: boolean; otlpEnabled: boolean; port: number } {
    const configuration = vscode.workspace.getConfiguration('tokenGuild.telemetry');
    const syntheticEnabled = configuration.get<boolean>('syntheticEnabled', true);
    const otlpEnabled = configuration.get<boolean>('otlpEnabled', false);
    const configuredPort = configuration.get<number>('otlpPort', DEFAULT_OTLP_PORT);
    const port = Number.isInteger(configuredPort) && configuredPort >= 0 && configuredPort <= 65_535 ? configuredPort : DEFAULT_OTLP_PORT;
    return { syntheticEnabled, otlpEnabled, port };
  }

  private async postTelemetryStatus(): Promise<void> {
    if (!this.webviewView) return;
    const settings = this.telemetrySettings();
    const listening = this.telemetryServer?.listening === true;
    const health = !settings.otlpEnabled ? 'disabled' : this.telemetryError ? 'error' : !listening ? 'error' : this.telemetryLastEventAt !== undefined && Date.now() - this.telemetryLastEventAt <= 120_000 ? 'receiving' : 'waiting';
    const payload = {
      syntheticEnabled: settings.syntheticEnabled,
      otlpEnabled: listening,
      health,
      acceptedEvents: this.telemetryAcceptedEvents,
      ...(this.telemetryLastEventAt !== undefined ? { lastEventAt: this.telemetryLastEventAt } : {}),
      ...(this.telemetryError ? { error: this.telemetryError } : {}),
      ...(this.telemetryServer?.logsAddress || this.telemetryServer?.address ? { endpoint: this.telemetryServer.logsAddress ?? this.telemetryServer.address } : {})
    };
    await this.webviewView.webview.postMessage({ version: 1, type: 'TELEMETRY_STATUS', payload });
  }

  private telemetrySession(): HostRunSession | undefined {
    const preferred = this.foregroundRunId ? this.activeRuns.get(this.foregroundRunId) : undefined;
    if (preferred?.state.phase === 'dungeon') return preferred;
    return [...this.activeRuns.values()].find((session) => session.state.phase === 'dungeon');
  }

  /** Apply an adapter event directly to the canonical host session. The
   * webview receives only the resulting snapshot; it cannot echo the event
   * back as a client intent or choose a run/source identity. */
  private async applyAdapterTelemetry(event: ReturnType<typeof validateTokenStreamEvent>): Promise<void> {
    if (event.source !== 'otlp') return;
    const session = this.telemetrySession();
    if (!session) return;
    const accepted = applyHostTelemetry(session, { ...event, runId: session.runId });
    if (!accepted) return;
    await this.persistRunCheckpoints();
    if (this.webviewView) await this.webviewView.webview.postMessage({ version: 1, type: 'RUN_SNAPSHOT', payload: createHostSnapshot(session) });
  }

  private enqueueAdapterTelemetry(event: ReturnType<typeof validateTokenStreamEvent>): void {
    this.hostWork = this.hostWork.then(() => this.applyAdapterTelemetry(event)).catch((error: unknown) => {
      this.telemetryError = 'A live telemetry event was rejected by the host run boundary.';
      console.warn(`Token Guild telemetry event rejected: ${error instanceof Error ? error.message : 'unknown error'}`);
    });
    void this.hostWork;
  }

  private async configureTelemetry(): Promise<void> {
    const settings = this.telemetrySettings();
    if (!this.webviewView || !settings.otlpEnabled) {
      await this.telemetryServer?.stop();
      this.telemetryServer = undefined;
      this.telemetryPort = undefined;
      this.telemetryAcceptedEvents = 0;
      this.telemetryLastEventAt = undefined;
      this.telemetryError = undefined;
      await this.postTelemetryStatus();
      return;
    }
    if (this.telemetryServer?.listening && this.telemetryPort === settings.port) {
      await this.postTelemetryStatus();
      return;
    }
    await this.telemetryServer?.stop();
    const server = new OtlpTelemetryServer({
      port: settings.port,
      onEvent: (rawEvent) => {
        try {
          const event = validateTokenStreamEvent(rawEvent);
          this.telemetryAcceptedEvents = Math.min(Number.MAX_SAFE_INTEGER, this.telemetryAcceptedEvents + 1);
          this.telemetryLastEventAt = Date.now();
          this.telemetryError = undefined;
          this.enqueueAdapterTelemetry(event);
          void this.postTelemetryStatus();
        } catch {
          // The receiver already normalizes its own output; a second validation boundary keeps IPC defensive.
        }
      }
    });
    this.telemetryServer = server;
    this.telemetryPort = settings.port;
    this.telemetryAcceptedEvents = 0;
    this.telemetryLastEventAt = undefined;
    this.telemetryError = undefined;
    try {
      await server.start();
    } catch {
      this.telemetryServer = undefined;
      this.telemetryPort = undefined;
      this.telemetryError = 'The local telemetry adapter could not start on the configured port.';
      await server.stop();
      void vscode.window.showErrorMessage('Token Guild could not start its local OTLP telemetry adapter. Check the configured port.');
    }
    await this.postTelemetryStatus();
  }

  private async persistRunCheckpoints(): Promise<void> {
    try {
      await this.state.saveRunCheckpoints([...this.activeRuns.values()].map(checkpointHostRun));
    } catch (error) {
      // A checkpoint is a recovery cache, never a reason to reject an
      // already-accepted gameplay intent or duplicate a reward.
      console.warn(`Token Guild run checkpoint was not persisted: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  private restoreRunCheckpoints(): Promise<void> {
    return this.checkpointRestoreGate.ensure(async () => {
      const progress = await this.state.load();
      const stored = await this.state.loadRunCheckpoints();
      for (const checkpoint of stored) {
        const candidate = checkpoint as unknown as { runId?: unknown };
        if (this.activeRuns.size >= 4 || typeof candidate.runId !== 'string' || progress.completedRunIds.includes(candidate.runId) || this.activeRuns.has(candidate.runId)) continue;
        try {
          const session = restoreHostRun(checkpoint);
          this.activeRuns.set(session.runId, session);
          if (!this.foregroundRunId && session.state.phase === 'dungeon') this.foregroundRunId = session.runId;
        } catch {
          // Drop malformed/stale recovery data; wallet/progression remains intact.
        }
      }
      await this.persistRunCheckpoints();
    });
  }

  private async handleMessage(webviewView: vscode.WebviewView, attachment: WebviewAttachment, message: WebviewToHostMessage): Promise<void> {
    if (!this.webviewLifecycle.isCurrent(attachment)) return;
    const canPost = (): boolean => this.webviewLifecycle.isCurrent(attachment) && this.webviewView === webviewView;
    const postProgress = async (): Promise<void> => {
      if (!canPost()) return;
      await webviewView.webview.postMessage({ version: 1, type: 'LOAD_PROGRESS', payload: await this.state.load() });
    };
    const postRunSnapshot = async (session: HostRunSession): Promise<void> => {
      await this.persistRunCheckpoints();
      if (!canPost()) return;
      await webviewView.webview.postMessage({ version: 1, type: 'RUN_SNAPSHOT', payload: createHostSnapshot(session) });
    };
    const postIntentError = async (session: HostRunSession, message: string): Promise<void> => {
      if (!canPost()) return;
      await webviewView.webview.postMessage({ version: 1, type: 'RUN_ERROR', payload: { runId: session.runId, message, nextIntentSequence: session.lastIntentSequence + 1 } });
    };
    const postActiveRunSnapshots = async (): Promise<void> => {
      for (const session of this.activeRuns.values()) await postRunSnapshot(session);
    };
    if (message.type === 'READY') {
      await this.restoreRunCheckpoints();
      await postProgress();
      await this.postTelemetryStatus();
      await postActiveRunSnapshots();
    } else if (message.type === 'PURCHASE_UPGRADE') {
      await this.state.purchaseUpgrade(await this.state.load(), message.payload.upgradeId);
      await postProgress();
    } else if (message.type === 'PURCHASE_BATTERY') {
      await this.state.purchaseBattery(await this.state.load());
      await postProgress();
    } else if (message.type === 'REFUND_UPGRADES') {
      await this.state.refundUpgrades(await this.state.load());
      await postProgress();
    } else if (message.type === 'UPDATE_SETTINGS') {
      await this.state.updateSettings(await this.state.load(), message.payload);
      await postProgress();
    } else if (message.type === 'UPDATE_TELEMETRY_SETTINGS') {
      await vscode.workspace.getConfiguration('tokenGuild.telemetry').update('syntheticEnabled', message.payload.syntheticEnabled, vscode.ConfigurationTarget.Global);
      await this.postTelemetryStatus();
    } else if (message.type === 'RUN_TELEMETRY') {
      // Production telemetry is sourced by the host adapter. Keeping this
      // message recognizable lets old/test clients receive a bounded error,
      // but it can never mutate a canonical run from a webview payload.
      throw new Error('Run telemetry intents are not accepted from production webviews');
    } else if (message.type === 'RUN_STEP') {
      const session = this.activeRuns.get(message.payload.runId);
      if (!session) throw new Error('Run step was not started by this host');
      const accepted = advanceHostRun(session, message.payload.deltaSeconds, message.payload.input, message.payload.intentSequence, this.telemetrySettings().syntheticEnabled);
      if (accepted) await postRunSnapshot(session);
      else await postIntentError(session, 'Run-step intent was duplicate or out of order; resynchronizing.');
    } else if (message.type === 'RUN_ACTION') {
      const session = this.activeRuns.get(message.payload.runId);
      if (!session) throw new Error('Run action was not started by this host');
      const accepted = applyHostAction(session, message.payload.action, message.payload.cardId, message.payload.intentSequence);
      if (accepted) await postRunSnapshot(session);
      else await postIntentError(session, 'Run action was duplicate or out of order; resynchronizing.');
    } else if (message.type === 'RECORD_RUN_REWARD') {
      const current = await this.state.load();
      const session = this.activeRuns.get(message.payload.runId);
      if (!session && !current.completedRunIds.includes(message.payload.runId)) throw new Error('Run reward was not started by this host');
      if (session) {
        // A client may request reward recording only after the canonical host
        // simulation has reached its terminal summary.  Deriving a summary
        // from an active dungeon would let a forged client cash out a partial
        // run and then discard the remaining session state.
        if (session.state.phase !== 'summary') throw new Error('Run reward is not complete');
        const summary = getHostRunResult(session);
        await this.state.applyRunReward(current, message.payload.runId, summary.gold, summary.tokens, session.heroId, summary.level);
      }
      this.activeRuns.delete(message.payload.runId);
      if (this.foregroundRunId === message.payload.runId) this.foregroundRunId = undefined;
      await this.persistRunCheckpoints();
      await postProgress();
    } else if (message.type === 'START_RUN') {
      const current = await this.state.load();
      if (!current.unlockedHeroes.includes(message.payload.heroId)) throw new Error('Hero is not unlocked');
      if (!current.unlockedStages.includes(message.payload.stageId)) throw new Error('Stage is not unlocked');
      if (!/^(warrior|wizard|rogue|ranger|paladin|necromancer)$/.test(message.payload.heroId)) throw new Error('Hero is not registered');
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(message.payload.stageId) || !MVP_REGISTRY.stages.some((stage) => stage.id === message.payload.stageId)) throw new Error('Stage is not registered');
      if (this.activeRuns.size >= GuildViewProvider.maxActiveRuns) throw new Error('Too many active runs');
      if (this.activeRuns.has(message.payload.runId) || current.completedRunIds.includes(message.payload.runId)) throw new Error('Run ID is already used');
      const heroId = message.payload.heroId as HeroId;
      const session = createHostRun(current, heroId, message.payload.runId, 0xdecafbad, message.payload.stageId);
      this.activeRuns.set(message.payload.runId, session);
      this.foregroundRunId = message.payload.runId;
      await postRunSnapshot(session);
    } else if (message.type === 'RESET_PROGRESS') {
      // A reset invalidates every in-flight run. Retaining sessions here
      // would let a stale webview submit an old run ID after the reset and
      // reintroduce rewards into the freshly reset wallet.
      this.activeRuns.clear();
      this.foregroundRunId = undefined;
      await this.state.clearRunCheckpoints();
      await this.state.reset();
      await postProgress();
    }
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const state = new StateManager(context.globalState);
  const provider = new GuildViewProvider(context.extensionUri, state);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      GuildViewProvider.viewId,
      provider,
      { webviewOptions: { retainContextWhenHidden: false } }
    ),
    provider,
    vscode.commands.registerCommand('tokenGuild.resetProgress', async () => {
      const confirmation = await vscode.window.showWarningMessage('Reset all Token Guild progress?', { modal: true }, 'Reset');
      if (confirmation === 'Reset') await provider.resetProgress();
    })
  );
}

export function deactivate(): void {
  // All extension resources are owned by subscriptions and are disposed by VS Code.
}
