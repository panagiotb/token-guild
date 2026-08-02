import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PROGRESS, StateManager } from '../../src/extension/stateManager';

const telemetryConfig = vi.hoisted(() => ({ syntheticEnabled: true, otlpEnabled: false, otlpPort: 0 }));

vi.mock('vscode', () => ({
  ConfigurationTarget: { Global: 1 },
  Uri: { joinPath: (base: { fsPath: string }, ...parts: string[]) => ({ fsPath: [base.fsPath, ...parts].join('/'), toString: () => `vscode-resource:${parts.join('/')}` }) },
  workspace: {
    onDidChangeConfiguration: () => ({ dispose: vi.fn() }),
    getConfiguration: () => ({
      get: <T>(key: string, fallback: T) => (key in telemetryConfig ? telemetryConfig[key as keyof typeof telemetryConfig] as T : fallback),
      update: vi.fn(async (key: string, value: unknown) => { if (key in telemetryConfig) telemetryConfig[key as keyof typeof telemetryConfig] = value as never; })
    })
  },
  window: { showErrorMessage: vi.fn(), showWarningMessage: vi.fn(), registerWebviewViewProvider: vi.fn() }
}));

interface FakeView {
  readonly webview: {
    options?: unknown;
    html?: string;
    readonly cspSource: string;
    onDidReceiveMessage(listener: (message: unknown) => void): { dispose(): void };
    postMessage(message: unknown): Promise<boolean>;
    asWebviewUri(uri: { toString(): string }): { toString(): string };
  };
  onDidDispose(listener: () => void): { dispose(): void };
  emit(message: unknown): Promise<void>;
  dispose(): void;
}

function createFakeView(): FakeView {
  const messageListeners: Array<(message: unknown) => void> = [];
  const disposeListeners: Array<() => void> = [];
  const posted: unknown[] = [];
  const view = {
    webview: {
      cspSource: 'webview-csp',
      onDidReceiveMessage: (listener: (message: unknown) => void) => { messageListeners.push(listener); return { dispose: vi.fn() }; },
      postMessage: async (message: unknown) => { posted.push(message); return true; },
      asWebviewUri: (uri: { toString(): string }) => uri
    },
    onDidDispose: (listener: () => void) => { disposeListeners.push(listener); return { dispose: vi.fn() }; },
    emit: async (message: unknown) => { for (const listener of messageListeners) listener(message); await new Promise<void>((resolve) => setTimeout(resolve, 0)); },
    dispose: () => { for (const listener of disposeListeners) listener(); }
  } satisfies FakeView;
  Object.defineProperty(view, 'posted', { value: posted });
  return view;
}

function postedMessages(view: FakeView): unknown[] {
  return (view as unknown as { posted: unknown[] }).posted;
}

describe('extension host reconnect boundary', () => {
  afterEach(() => { telemetryConfig.syntheticEnabled = true; telemetryConfig.otlpEnabled = false; telemetryConfig.otlpPort = 0; vi.restoreAllMocks(); });

  it('dispatches an OTLP completion directly into the host session', async () => {
    telemetryConfig.otlpEnabled = true;
    const { GuildViewProvider } = await import('../../src/extension/extension');
    const values = new Map<string, unknown>();
    const storage = { get: <T>(key: string) => values.get(key) as T | undefined, update: async (key: string, value: unknown) => { values.set(key, value); } };
    const provider = new GuildViewProvider({ fsPath: process.cwd() } as never, new StateManager(storage));
    const view = createFakeView();
    await provider.resolveWebviewView(view as never);
    await view.emit({ version: 1, type: 'START_RUN', payload: { heroId: 'warrior', stageId: 'code-dungeon', runId: 'otlp-run' } });
    await view.emit({ version: 1, type: 'UPDATE_TELEMETRY_SETTINGS', payload: { syntheticEnabled: false } });
    await view.emit({ version: 1, type: 'RUN_STEP', payload: { runId: 'otlp-run', intentSequence: 1, deltaSeconds: 0.25, input: { up: false, down: false, left: false, right: false } } });
    const syntheticOff = postedMessages(view).filter((message) => (message as { type?: string }).type === 'RUN_SNAPSHOT').at(-1) as { payload: { state: { totalTokens: number } } };
    expect(syntheticOff.payload.state.totalTokens).toBe(0);
    await view.emit({ version: 1, type: 'UPDATE_TELEMETRY_SETTINGS', payload: { syntheticEnabled: true } });
    await view.emit({ version: 1, type: 'RUN_STEP', payload: { runId: 'otlp-run', intentSequence: 2, deltaSeconds: 0.25, input: { up: false, down: false, left: false, right: false } } });
    const status = postedMessages(view).filter((message) => (message as { type?: string }).type === 'TELEMETRY_STATUS').at(-1) as { payload: { endpoint?: string } } | undefined;
    expect(status?.payload.endpoint).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/v1\/logs$/);
    const endpoint = status?.payload.endpoint;
    expect(endpoint).toBeDefined();
    const response = await fetch(endpoint!, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ resourceLogs: [{ scopeLogs: [{ logRecords: [{ eventId: 'completion-1', timeUnixNano: '1700000000000000000', attributes: [
        { key: 'event.name', value: { stringValue: 'codex.sse_event' } },
        { key: 'event.kind', value: { stringValue: 'response.completed' } },
        { key: 'gen_ai.usage.output_tokens', value: { intValue: '25' } }
      ] }]}]}] })
    });
    expect(response.status).toBe(200);
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
    const snapshots = postedMessages(view).filter((message) => (message as { type?: string }).type === 'RUN_SNAPSHOT') as Array<{ payload: { state: { totalTokens: number; tokenLedger: { synthetic: { outputTokens: number }; otlp: { outputTokens: number } } } } }>;
    const latest = snapshots.at(-1);
    expect(latest?.payload.state.totalTokens).toBe(50);
    expect(latest?.payload.state.tokenLedger.synthetic.outputTokens).toBe(25);
    expect(latest?.payload.state.tokenLedger.otlp.outputTokens).toBe(25);
    expect(postedMessages(view).some((message) => (message as { type?: string }).type === 'TOKEN_STREAM')).toBe(false);
    provider.dispose();
  });

  it('restores a checkpoint for a new webview and rejects stale callbacks after provider disposal', async () => {
    vi.resetModules();
    const { GuildViewProvider } = await import('../../src/extension/extension');
    const values = new Map<string, unknown>();
    const storage = { get: <T>(key: string) => values.get(key) as T | undefined, update: async (key: string, value: unknown) => { values.set(key, value); } };
    const state = new StateManager(storage);
    const extensionUri = { fsPath: process.cwd() } as never;
    const firstProvider = new GuildViewProvider(extensionUri, state);
    const firstView = createFakeView();
    await firstProvider.resolveWebviewView(firstView as never);
    await firstView.emit({ version: 1, type: 'START_RUN', payload: { heroId: 'warrior', stageId: 'code-dungeon', runId: 'reconnect-run' } });
    expect(postedMessages(firstView).some((message) => (message as { type?: string }).type === 'RUN_SNAPSHOT')).toBe(true);

    // Reward recording is terminal-only. A webview cannot cash out a partial
    // host session and then discard its remaining simulation state.
    await firstView.emit({ version: 1, type: 'RECORD_RUN_REWARD', payload: { runId: 'reconnect-run' } });
    expect(postedMessages(firstView).some((message) => (message as { type?: string }).type === 'RUN_ERROR')).toBe(true);
    expect(await state.load()).toEqual(DEFAULT_PROGRESS);

    const beforeForgedEvent = (postedMessages(firstView).filter((message) => (message as { type?: string }).type === 'RUN_SNAPSHOT').at(-1) as { payload: { state: { totalTokens: number } } }).payload.state.totalTokens;
    await firstView.emit({ version: 1, type: 'RUN_TELEMETRY', payload: { runId: 'reconnect-run', intentSequence: 1, event: { source: 'synthetic', accuracy: 'exact', timestampMs: 1, count: 999_999, outputTokens: 999_999, tokensPerSecond: 100, confidence: 1 } } });
    const afterForgedEvent = (postedMessages(firstView).filter((message) => (message as { type?: string }).type === 'RUN_SNAPSHOT').at(-1) as { payload: { state: { totalTokens: number } } }).payload.state.totalTokens;
    expect(afterForgedEvent).toBe(beforeForgedEvent);
    expect(postedMessages(firstView).some((message) => (message as { type?: string }).type === 'RUN_ERROR')).toBe(true);

    const beforeStaleMessage = postedMessages(firstView).length;
    firstProvider.dispose();
    await firstView.emit({ version: 1, type: 'START_RUN', payload: { heroId: 'warrior', stageId: 'code-dungeon', runId: 'stale-run' } });
    expect(postedMessages(firstView)).toHaveLength(beforeStaleMessage);

    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const secondProvider = new GuildViewProvider(extensionUri, state);
    const secondView = createFakeView();
    await secondProvider.resolveWebviewView(secondView as never);
    await secondView.emit({ version: 1, type: 'READY' });
    const restored = postedMessages(secondView).find((message) => (message as { type?: string }).type === 'RUN_SNAPSHOT') as { type: string; payload: { runId: string; state: { elapsedSeconds: number }; nextIntentSequence: number } } | undefined;
    expect(restored?.payload.runId).toBe('reconnect-run');
    expect(restored?.payload.nextIntentSequence).toBe(1);

    await secondView.emit({ version: 1, type: 'RUN_STEP', payload: { runId: 'reconnect-run', intentSequence: 1, deltaSeconds: 0.25, input: { up: false, down: false, left: true, right: false } } });
    const advanced = postedMessages(secondView).filter((message) => (message as { type?: string }).type === 'RUN_SNAPSHOT').at(-1) as { payload: { state: { elapsedSeconds: number; totalTokens: number; tokenLedger: { synthetic: { outputTokens: number } } } } } | undefined;
    expect(advanced?.payload.state.elapsedSeconds).toBeGreaterThan(0);
    expect(advanced?.payload.state.totalTokens).toBe(25);
    expect(advanced?.payload.state.tokenLedger.synthetic.outputTokens).toBe(25);
    await secondView.emit({ version: 1, type: 'RUN_STEP', payload: { runId: 'reconnect-run', intentSequence: 1, deltaSeconds: 0.25, input: { up: false, down: false, left: true, right: false } } });
    expect(postedMessages(secondView).some((message) => (message as { type?: string }).type === 'RUN_ERROR')).toBe(true);
    secondProvider.dispose();
    expect(await state.load()).toEqual(DEFAULT_PROGRESS);
  });

  it('restores a paused level-up overlay and resumes through the host action boundary', async () => {
    vi.resetModules();
    const { GuildViewProvider } = await import('../../src/extension/extension');
    const { advanceHostRun, checkpointHostRun, createHostRun, restoreHostRun } = await import('../../src/extension/hostRun');
    const values = new Map<string, unknown>();
    const storage = { get: <T>(key: string) => values.get(key) as T | undefined, update: async (key: string, value: unknown) => { values.set(key, value); } };
    const state = new StateManager(storage);
    const paused = createHostRun(DEFAULT_PROGRESS, 'warrior', 'level-up-reconnect');
    paused.state.pickups.push(...Array.from({ length: 5 }, (_, index) => ({ id: index + 1, kind: 'xp-shard' as const, x: 0, y: 0, value: 1 })));
    paused.state.nextEntityId = 6;
    expect(advanceHostRun(paused, 0.01, { up: false, down: false, left: false, right: false }, 1, false)).toBe(true);
    expect(paused.state.phase).toBe('level-up');
    const checkpoint = checkpointHostRun(paused);
    expect(() => restoreHostRun(checkpoint)).not.toThrow();
    await state.saveRunCheckpoints([checkpoint]);

    const provider = new GuildViewProvider({ fsPath: process.cwd() } as never, state);
    const view = createFakeView();
    await provider.resolveWebviewView(view as never);
    await view.emit({ version: 1, type: 'READY' });
    const restored = postedMessages(view).filter((message) => (message as { type?: string }).type === 'RUN_SNAPSHOT').at(-1) as { payload: { runId: string; nextIntentSequence: number; state: { phase: string; pendingCards: Array<{ id: string }> } } } | undefined;
    expect(restored?.payload.runId).toBe('level-up-reconnect');
    expect(restored?.payload.state.phase).toBe('level-up');
    const cardId = restored?.payload.state.pendingCards[0]?.id;
    expect(cardId).toBeDefined();
    await view.emit({ version: 1, type: 'RUN_ACTION', payload: { runId: 'level-up-reconnect', action: 'upgrade', cardId, intentSequence: restored!.payload.nextIntentSequence } });
    const resumed = postedMessages(view).filter((message) => (message as { type?: string }).type === 'RUN_SNAPSHOT').at(-1) as { payload: { state: { phase: string; pendingLevelUps: number } } } | undefined;
    expect(resumed?.payload.state.phase).toBe('dungeon');
    expect(resumed?.payload.state.pendingLevelUps).toBe(0);
    await view.emit({ version: 1, type: 'RUN_ACTION', payload: { runId: 'level-up-reconnect', action: 'upgrade', cardId, intentSequence: restored!.payload.nextIntentSequence } });
    expect(postedMessages(view).some((message) => (message as { type?: string }).type === 'RUN_ERROR')).toBe(true);
    provider.dispose();
  });

  it('persists and restores a long-running provider session without replay drift', async () => {
    vi.resetModules();
    const { GuildViewProvider } = await import('../../src/extension/extension');
    const values = new Map<string, unknown>();
    const storage = { get: <T>(key: string) => values.get(key) as T | undefined, update: async (key: string, value: unknown) => { values.set(key, value); } };
    const state = new StateManager(storage);
    const extensionUri = { fsPath: process.cwd() } as never;
    const firstProvider = new GuildViewProvider(extensionUri, state);
    const firstView = createFakeView();
    await firstProvider.resolveWebviewView(firstView as never);
    await firstView.emit({ version: 1, type: 'START_RUN', payload: { heroId: 'warrior', stageId: 'code-dungeon', runId: 'provider-long-run' } });
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    type SnapshotMessage = { type: 'RUN_SNAPSHOT'; payload: { runId: string; sequence: number; nextIntentSequence: number; state: { phase: string; elapsedSeconds: number; totalTokens: number; pendingCards: Array<{ id: string }>; } } };
    const latestSnapshot = (): SnapshotMessage | undefined => postedMessages(firstView).filter((message): message is SnapshotMessage => (message as { type?: string }).type === 'RUN_SNAPSHOT').at(-1);
    const flushHostQueue = async (): Promise<void> => { await new Promise<void>((resolve) => setTimeout(resolve, 5)); };
    // Exercise the production message boundary for a sustained deterministic
    // run, rather than proving only that one checkpoint-shaped object can be
    // serialized. Every accepted step persists a detached checkpoint. Combat
    // can legitimately pause for level-up, so resolve each pending card via
    // the same host action boundary before sending the next movement intent.
    let nextIntent = 1;
    for (let index = 0; index < 120; index += 1) {
      await firstView.emit({ version: 1, type: 'RUN_STEP', payload: {
        runId: 'provider-long-run',
        intentSequence: nextIntent++,
        deltaSeconds: 0.25,
        input: { up: index % 13 === 0, down: false, left: index % 5 === 0, right: index % 7 === 0 }
      } });
      await flushHostQueue();
      let snapshot = latestSnapshot();
      while (snapshot?.payload.state.phase === 'level-up') {
        const card = snapshot.payload.state.pendingCards[0];
        expect(card?.id).toBeDefined();
        await firstView.emit({ version: 1, type: 'RUN_ACTION', payload: { runId: 'provider-long-run', action: 'upgrade', cardId: card!.id, intentSequence: nextIntent++ } });
        await flushHostQueue();
        snapshot = latestSnapshot();
      }
    }
    await flushHostQueue();
    const beforeDispose = postedMessages(firstView).filter((message) => (message as { type?: string }).type === 'RUN_SNAPSHOT').at(-1) as { payload: { runId: string; sequence: number; nextIntentSequence: number; state: unknown } } | undefined;
    expect(beforeDispose?.payload.runId).toBe('provider-long-run');
    expect(beforeDispose?.payload.sequence).toBeGreaterThan(120);
    expect(beforeDispose?.payload.nextIntentSequence).toBeGreaterThan(121);
    expect(JSON.stringify(beforeDispose?.payload.state).length).toBeLessThan(512_000);

    firstProvider.dispose();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const secondProvider = new GuildViewProvider(extensionUri, state);
    const secondView = createFakeView();
    await secondProvider.resolveWebviewView(secondView as never);
    await secondView.emit({ version: 1, type: 'READY' });
    const restored = postedMessages(secondView).filter((message) => (message as { type?: string }).type === 'RUN_SNAPSHOT').at(-1) as { payload: { runId: string; sequence: number; nextIntentSequence: number; state: unknown } } | undefined;
    expect(restored?.payload.runId).toBe(beforeDispose?.payload.runId);
    expect(restored?.payload.sequence).toBe(beforeDispose?.payload.sequence);
    expect(restored?.payload.nextIntentSequence).toBe(beforeDispose?.payload.nextIntentSequence);
    expect(restored?.payload.state).toEqual(beforeDispose?.payload.state);

    const resumedIntent = beforeDispose!.payload.nextIntentSequence;
    await secondView.emit({ version: 1, type: 'RUN_STEP', payload: {
      runId: 'provider-long-run', intentSequence: resumedIntent, deltaSeconds: 0.25,
      input: { up: false, down: true, left: false, right: false }
    } });
    const advanced = postedMessages(secondView).filter((message) => (message as { type?: string }).type === 'RUN_SNAPSHOT').at(-1) as { payload: { sequence: number; nextIntentSequence: number; state: { elapsedSeconds: number; totalTokens: number } } } | undefined;
    expect(advanced?.payload.sequence).toBe(beforeDispose!.payload.sequence + 1);
    expect(advanced?.payload.nextIntentSequence).toBe(resumedIntent + 1);
    const restoredElapsed = (restored?.payload.state as { elapsedSeconds?: unknown } | undefined)?.elapsedSeconds;
    expect(advanced?.payload.state.elapsedSeconds).toBeGreaterThan(typeof restoredElapsed === 'number' ? restoredElapsed : 0);
    expect(advanced?.payload.state.totalTokens).toBe(3_025);

    await secondView.emit({ version: 1, type: 'RUN_STEP', payload: {
      runId: 'provider-long-run', intentSequence: resumedIntent, deltaSeconds: 0.25,
      input: { up: false, down: true, left: false, right: false }
    } });
    expect(postedMessages(secondView).some((message) => (message as { type?: string }).type === 'RUN_ERROR')).toBe(true);
    secondProvider.dispose();

    // Exercise the successful terminal path through the same provider
    // boundary, then replay the reward request to prove wallet idempotency.
    const { checkpointHostRun, createHostRun } = await import('../../src/extension/hostRun');
    const { finishRun } = await import('../../src/game/simulation');
    const completed = createHostRun(DEFAULT_PROGRESS, 'warrior', 'completed-provider-run');
    completed.state.stageFinaleStarted = true;
    finishRun(completed.state, 'victory', 'stage-timer');
    await state.saveRunCheckpoints([checkpointHostRun(completed)]);
    const thirdProvider = new GuildViewProvider(extensionUri, state);
    const thirdView = createFakeView();
    await thirdProvider.resolveWebviewView(thirdView as never);
    await thirdView.emit({ version: 1, type: 'READY' });
    await thirdView.emit({ version: 1, type: 'RECORD_RUN_REWARD', payload: { runId: 'completed-provider-run' } });
    const rewarded = await state.load();
    expect(rewarded.gold).toBe(500);
    expect(rewarded.completedRunIds).toEqual(['completed-provider-run']);
    await thirdView.emit({ version: 1, type: 'RECORD_RUN_REWARD', payload: { runId: 'completed-provider-run' } });
    expect(await state.load()).toEqual(rewarded);
    thirdProvider.dispose();
  });
});
