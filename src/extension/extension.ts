import * as vscode from 'vscode';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { renderWebviewHtml } from './webviewHtml';
import { StateManager } from './stateManager';
import { validateTokenStreamEvent, validateWebviewMessage } from '../shared/validation';
import type { WebviewToHostMessage } from '../shared/types';
import { OtlpTelemetryServer, DEFAULT_OTLP_PORT } from '../telemetry/otlpServer';

class GuildViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  public static readonly viewId = 'tokenGuild.guildView';
  private webviewView: vscode.WebviewView | undefined;
  private telemetryServer: OtlpTelemetryServer | undefined;
  private telemetryPort: number | undefined;
  private readonly configurationSubscription: vscode.Disposable;
  private telemetryWork: Promise<void> = Promise.resolve();

  public constructor(private readonly extensionUri: vscode.Uri, private readonly state: StateManager) {
    this.configurationSubscription = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('tokenGuild.telemetry')) void this.scheduleTelemetryConfiguration();
    });
  }

  public async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    this.webviewView = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview')]
    };

    let messageQueue: Promise<void> = Promise.resolve();
    webviewView.webview.onDidReceiveMessage((rawMessage: unknown) => {
      messageQueue = messageQueue.then(async () => {
        try {
          const message = validateWebviewMessage(rawMessage);
          await this.handleMessage(webviewView, message);
        } catch (error) {
          const detail = error instanceof Error ? error.message : 'Unknown message error';
          void vscode.window.showErrorMessage(`Token Guild message rejected: ${detail}`);
        }
      });
      void messageQueue;
    }, undefined, []);

    const templatePath = join(this.extensionUri.fsPath, 'dist', 'webview', 'index.html');
    const template = await readFile(templatePath, 'utf8');
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
    this.configurationSubscription.dispose();
    void this.telemetryServer?.stop();
    this.telemetryServer = undefined;
    this.webviewView = undefined;
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
    const payload = {
      syntheticEnabled: settings.syntheticEnabled,
      otlpEnabled: this.telemetryServer?.listening === true,
      ...(this.telemetryServer?.address ? { endpoint: this.telemetryServer.address } : {})
    };
    await this.webviewView.webview.postMessage({ version: 1, type: 'TELEMETRY_STATUS', payload });
  }

  private async configureTelemetry(): Promise<void> {
    const settings = this.telemetrySettings();
    if (!this.webviewView || !settings.otlpEnabled) {
      await this.telemetryServer?.stop();
      this.telemetryServer = undefined;
      this.telemetryPort = undefined;
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
          if (this.webviewView) void this.webviewView.webview.postMessage({ version: 1, type: 'TOKEN_STREAM', payload: event });
        } catch {
          // The receiver already normalizes its own output; a second validation boundary keeps IPC defensive.
        }
      }
    });
    this.telemetryServer = server;
    this.telemetryPort = settings.port;
    try {
      await server.start();
    } catch {
      this.telemetryServer = undefined;
      this.telemetryPort = undefined;
      await server.stop();
      void vscode.window.showErrorMessage('Token Guild could not start its local OTLP telemetry adapter. Check the configured port.');
    }
    await this.postTelemetryStatus();
  }

  private async handleMessage(webviewView: vscode.WebviewView, message: WebviewToHostMessage): Promise<void> {
    if (message.type === 'READY') {
      await webviewView.webview.postMessage({ version: 1, type: 'LOAD_PROGRESS', payload: await this.state.load() });
      await this.postTelemetryStatus();
    } else if (message.type === 'SAVE_PROGRESS') {
      await this.state.save(message.payload);
    } else if (message.type === 'RECORD_RUN_REWARD') {
      await this.state.applyRunReward(await this.state.load(), message.payload.runId, message.payload.gold, message.payload.tokens, message.payload.heroId, message.payload.level);
      await webviewView.webview.postMessage({ version: 1, type: 'LOAD_PROGRESS', payload: await this.state.load() });
    } else if (message.type === 'RESET_PROGRESS') {
      await this.state.reset();
      await webviewView.webview.postMessage({ version: 1, type: 'LOAD_PROGRESS', payload: await this.state.load() });
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
      if (confirmation === 'Reset') await state.reset();
    })
  );
}

export function deactivate(): void {
  // All extension resources are owned by subscriptions and are disposed by VS Code.
}
