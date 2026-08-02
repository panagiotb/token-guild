/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PROGRESS } from '../../src/extension/stateManager';
import { advanceHostRun, applyHostAction, createHostRun, createHostSnapshot } from '../../src/extension/hostRun';
import { META_UPGRADES } from '../../src/game/meta';

describe('production webview interaction boundary', () => {
  const posted: unknown[] = [];

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    posted.length = 0;
    document.body.innerHTML = '<main id="app"></main>';
    document.documentElement.dataset.tokenGuildTest = 'true';
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => ({ beginPath: vi.fn(), closePath: vi.fn(), fill: vi.fn(), fillRect: vi.fn(), strokeRect: vi.fn(), stroke: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), arc: vi.fn(), clearRect: vi.fn(), fillText: vi.fn() })
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', { configurable: true, value: () => 'data:image/png;base64,fixture' });
    Object.defineProperty(globalThis, 'acquireVsCodeApi', { configurable: true, value: () => ({ postMessage: (message: unknown) => posted.push(message) }) });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    delete document.documentElement.dataset.tokenGuildTest;
    delete (globalThis as { __tokenGuildTest?: unknown }).__tokenGuildTest;
  });

  it('keeps controls wired to host intents and preserves keyboard focus ownership', async () => {
    await import('../../src/webview/main');
    window.dispatchEvent(new MessageEvent('message', { data: { version: 1, type: 'LOAD_PROGRESS', payload: { ...DEFAULT_PROGRESS, gold: 10_000, unlockedHeroes: ['warrior', 'wizard', 'rogue', 'ranger', 'paladin', 'necromancer'] } } }));
    expect(document.querySelector('#hero-description')?.textContent).toContain('starts with Broadsword');

    const firstUpgrade = document.querySelector<HTMLButtonElement>('.meta-upgrade');
    expect(firstUpgrade).not.toBeNull();
    expect(document.querySelectorAll<HTMLButtonElement>('.meta-upgrade')).toHaveLength(META_UPGRADES.length);
    firstUpgrade?.click();
    expect(posted.some((message) => (message as { type?: string }).type === 'PURCHASE_UPGRADE')).toBe(true);

    document.querySelector<HTMLButtonElement>('#start-run')?.click();
    expect(document.activeElement?.id).toBe('game-canvas');
    expect(posted).toContainEqual({ version: 1, type: 'START_RUN', payload: { heroId: 'warrior', stageId: 'code-dungeon', runId: expect.any(String) } });
    expect(document.querySelector('#battery-widget')?.getAttribute('data-tooltip')).toContain('Tokens Stored:');
    expect(document.querySelector('#battery-widget')?.closest('.map-toolbar')).not.toBeNull();
    expect(document.querySelector('.battery-copy')).toBeNull();
    const keydown = new KeyboardEvent('keydown', { key: 'w', bubbles: true, cancelable: true });
    window.dispatchEvent(keydown);
    expect(keydown.defaultPrevented).toBe(true);

    document.querySelector<HTMLButtonElement>('#pause-toggle')?.click();
    expect(document.querySelector('#guild-content')?.classList.contains('hidden')).toBe(true);
    const pausedKeydown = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    window.dispatchEvent(pausedKeydown);
    expect(pausedKeydown.defaultPrevented).toBe(false);

    const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
    document.querySelector<HTMLButtonElement>('#pause-toggle')?.click();
    const pointerDown = new Event('pointerdown', { bubbles: true, cancelable: true });
    canvas.dispatchEvent(pointerDown);
    expect(pointerDown.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(canvas);
    const selectStart = new Event('selectstart', { bubbles: true, cancelable: true });
    canvas.dispatchEvent(selectStart);
    expect(selectStart.defaultPrevented).toBe(true);
    const dragStart = new Event('dragstart', { bubbles: true, cancelable: true });
    canvas.dispatchEvent(dragStart);
    expect(dragStart.defaultPrevented).toBe(true);
    window.dispatchEvent(new Event('resize'));
  });

  it('routes production pause and resume through the host snapshot boundary', async () => {
    delete document.documentElement.dataset.tokenGuildTest;
    await import('../../src/webview/main');
    window.dispatchEvent(new MessageEvent('message', { data: { version: 1, type: 'LOAD_PROGRESS', payload: { ...DEFAULT_PROGRESS } } }));
    document.querySelector<HTMLButtonElement>('#start-run')?.click();
    const start = posted.find((message) => (message as { type?: string }).type === 'START_RUN') as { payload: { runId: string } } | undefined;
    expect(start).toBeDefined();
    const session = createHostRun(DEFAULT_PROGRESS, 'warrior', start!.payload.runId);
    window.dispatchEvent(new MessageEvent('message', { data: { version: 1, type: 'RUN_SNAPSHOT', payload: createHostSnapshot(session) } }));

    document.querySelector<HTMLButtonElement>('#pause-toggle')?.click();
    expect(posted).toContainEqual({ version: 1, type: 'RUN_ACTION', payload: { runId: start!.payload.runId, intentSequence: 1, action: 'pause' } });
    expect(document.querySelector('#guild-content')?.classList.contains('hidden')).toBe(true);

    expect(applyHostAction(session, 'pause', undefined, 1)).toBe(true);
    window.dispatchEvent(new MessageEvent('message', { data: { version: 1, type: 'RUN_SNAPSHOT', payload: createHostSnapshot(session) } }));
    document.querySelector<HTMLButtonElement>('#pause-toggle')?.click();
    expect(posted).toContainEqual({ version: 1, type: 'RUN_ACTION', payload: { runId: start!.payload.runId, intentSequence: 2, action: 'resume' } });
  });

  it('opens explanatory dialogs and keeps synthetic income as a narrow host setting', async () => {
    await import('../../src/webview/main');
    window.dispatchEvent(new MessageEvent('message', { data: { version: 1, type: 'TELEMETRY_STATUS', payload: { syntheticEnabled: true, otlpEnabled: true, health: 'receiving', acceptedEvents: 3, lastEventAt: Date.now(), endpoint: 'http://127.0.0.1:4318/v1/logs' } } }));
    expect(document.querySelector('#telemetry-health')?.textContent).toContain('Live telemetry receiving');
    expect(document.querySelector('#telemetry-health')?.textContent).toContain('3 accepted');
    window.dispatchEvent(new MessageEvent('message', { data: { version: 1, type: 'LOAD_PROGRESS', payload: { ...DEFAULT_PROGRESS, gold: 10_000 } } }));
    document.querySelector<HTMLButtonElement>('#start-run')?.click();

    document.querySelector<HTMLButtonElement>('#token-info')?.click();
    expect(document.querySelector<HTMLDialogElement>('#token-dialog')?.hasAttribute('open')).toBe(true);
    document.querySelector<HTMLButtonElement>('#gold-info')?.click();
    expect(document.querySelector<HTMLDialogElement>('#gold-dialog')?.hasAttribute('open')).toBe(true);
    document.querySelector<HTMLButtonElement>('#synthetic-toggle')?.click();
    expect(posted).toContainEqual({ version: 1, type: 'UPDATE_TELEMETRY_SETTINGS', payload: { syntheticEnabled: false } });
    expect(document.querySelector<HTMLButtonElement>('#synthetic-toggle')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('renders a concrete level-up overlay without replacing it on duplicate frames', async () => {
    await import('../../src/webview/main');
    window.dispatchEvent(new MessageEvent('message', { data: { version: 1, type: 'LOAD_PROGRESS', payload: { ...DEFAULT_PROGRESS, gold: 10_000 } } }));
    document.querySelector<HTMLButtonElement>('#start-run')?.click();
    vi.advanceTimersByTime(5000);
    const overlay = document.querySelector<HTMLElement>('#cards');
    if (overlay?.classList.contains('hidden')) {
      // Enemies now spawn outside the logical viewport. Continue only until
      // the first level-up or a bounded timeout rather than assuming that
      // an off-screen spawn is immediately killable.
      for (let attempt = 0; attempt < 11 && overlay.classList.contains('hidden'); attempt += 1) vi.advanceTimersByTime(5000);
    }
    expect(document.querySelectorAll<HTMLButtonElement>('.upgrade-card').length).toBeGreaterThan(0);
    const firstButton = document.querySelector<HTMLButtonElement>('.upgrade-card')!;
    const signatureBefore = overlay?.innerHTML;
    document.querySelector<HTMLButtonElement>('#pause-toggle')?.click();
    document.querySelector<HTMLButtonElement>('#pause-toggle')?.click();
    expect(overlay?.innerHTML).toBe(signatureBefore);
    firstButton.click();
    expect(overlay?.classList.contains('hidden')).toBe(true);
  });

  it('renders the revival decision and posts a host-owned revive intent', async () => {
    await import('../../src/webview/main');
    const session = createHostRun({ ...DEFAULT_PROGRESS, upgrades: { revival: 1 } }, 'warrior', 'revival-ui-run');
    session.state.phase = 'revival';
    session.state.hero.stats.hp = 0;
    session.sequence += 1;
    window.dispatchEvent(new MessageEvent('message', { data: { version: 1, type: 'RUN_SNAPSHOT', payload: createHostSnapshot(session) } }));
    expect(document.querySelector('#revival-overlay')?.classList.contains('hidden')).toBe(false);
    expect(document.querySelector('#revival-count')?.textContent).toContain('1 revival remaining');
    document.querySelector<HTMLButtonElement>('#revive-run')?.click();
    expect(document.querySelector('#revival-overlay')?.classList.contains('hidden')).toBe(true);
    expect(posted.some((message) => (message as { type?: string }).type === 'RUN_ACTION' && (message as { payload?: { action?: string } }).payload?.action === 'revive')).toBe(true);
  });

  it('renders the production summary and triggers the exact PNG export action', async () => {
    await import('../../src/webview/main');
    window.dispatchEvent(new MessageEvent('message', { data: { version: 1, type: 'LOAD_PROGRESS', payload: { ...DEFAULT_PROGRESS, gold: 10_000 } } }));
    document.querySelector<HTMLButtonElement>('#start-run')?.click();
    const testApi = (globalThis as unknown as { __tokenGuildTest?: { finishRun: () => void } }).__tokenGuildTest;
    expect(testApi).toBeDefined();
    testApi?.finishRun();
    expect(document.querySelector('#summary-screen')?.classList.contains('hidden')).toBe(false);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    document.querySelector<HTMLButtonElement>('#share-card')?.click();
    expect(click).toHaveBeenCalled();
    expect(document.querySelector<HTMLButtonElement>('#return-guild')).not.toBeNull();
    click.mockRestore();
  });

  it('exercises Banish, Reroll, and Skip controls through the production overlay', async () => {
    await import('../../src/webview/main');
    window.dispatchEvent(new MessageEvent('message', { data: { version: 1, type: 'LOAD_PROGRESS', payload: { ...DEFAULT_PROGRESS, gold: 10_000, upgrades: { reroll: 1, skip: 1, banish: 1 } } } }));
    document.querySelector<HTMLButtonElement>('#start-run')?.click();
    // The production spawn ring is outside the viewport; allow the authored
    // enemies enough deterministic time to approach before asserting the UI.
    vi.advanceTimersByTime(60_000);
    const overlay = document.querySelector<HTMLElement>('#cards')!;
    expect(overlay.classList.contains('hidden')).toBe(false);
    const banish = overlay.querySelector<HTMLButtonElement>('.card-action');
    expect(banish).not.toBeNull();
    banish?.click();
    const reroll = overlay.querySelector<HTMLButtonElement>('.level-up-actions button');
    expect(reroll).not.toBeNull();
    reroll?.click();
    const skip = overlay.querySelector<HTMLButtonElement>('.level-up-actions button:last-child');
    expect(skip).not.toBeNull();
    skip?.click();
    expect(overlay.classList.contains('hidden')).toBe(true);
    expect(skip?.title).toContain('20% of the XP');
  });

  it('does not render Banish for fallback healing cards', async () => {
    await import('../../src/webview/main');
    const session = createHostRun({ ...DEFAULT_PROGRESS, upgrades: { banish: 1 } }, 'warrior', 'fallback-banish-ui');
    session.state.phase = 'level-up';
    session.state.pendingLevelUps = 1;
    session.state.banishesRemaining = 1;
    session.state.pendingCards = [{ id: 'heal', label: 'Restore 25% health', kind: 'heal', target: 'heal' }];
    session.sequence += 1;
    window.dispatchEvent(new MessageEvent('message', { data: { version: 1, type: 'RUN_SNAPSHOT', payload: createHostSnapshot(session) } }));
    expect(document.querySelector('.upgrade-card')).not.toBeNull();
    expect(document.querySelector('.card-action')).toBeNull();
  });

  it('adopts canonical host snapshots and ignores replayed snapshots', async () => {
    await import('../../src/webview/main');
    const session = createHostRun(DEFAULT_PROGRESS, 'wizard', 'reconnect-run');
    const initial = createHostSnapshot(session);
    window.dispatchEvent(new MessageEvent('message', { data: { version: 1, type: 'RUN_SNAPSHOT', payload: initial } }));
    expect(document.querySelector('#run-screen')?.classList.contains('hidden')).toBe(false);
    expect(document.querySelector('#character-title')?.textContent).toBe('Wizard');

    advanceHostRun(session, 0.25, { up: false, down: false, left: false, right: true });
    const next = createHostSnapshot(session);
    window.dispatchEvent(new MessageEvent('message', { data: { version: 1, type: 'RUN_SNAPSHOT', payload: next } }));
    const clockAfterNext = document.querySelector('#clock-hud')?.textContent;
    expect(document.querySelectorAll('.character-stat')).toHaveLength(15);
    expect(document.querySelector('.character-stat[data-stat="luck"]')?.getAttribute('data-tooltip')).toContain('favorable');
    const replay = { ...initial, state: { ...initial.state, elapsedSeconds: 99 } };
    window.dispatchEvent(new MessageEvent('message', { data: { version: 1, type: 'RUN_SNAPSHOT', payload: replay } }));
    expect(document.querySelector('#clock-hud')?.textContent).toBe(clockAfterNext);
  });

  it('presents a collected chest reward in the map without changing reward ownership', async () => {
    await import('../../src/webview/main');
    const session = createHostRun(DEFAULT_PROGRESS, 'warrior', 'treasure-run');
    session.state.pickups.push({ id: 700, kind: 'gold-chest', x: 0, y: 0, value: 100 });
    window.dispatchEvent(new MessageEvent('message', { data: { version: 1, type: 'RUN_SNAPSHOT', payload: createHostSnapshot(session) } }));
    advanceHostRun(session, 0.25, { up: false, down: false, left: false, right: false }, 1);
    const next = createHostSnapshot(session);
    window.dispatchEvent(new MessageEvent('message', { data: { version: 1, type: 'RUN_SNAPSHOT', payload: next } }));
    expect(session.state.claimedChestIds).toEqual([700]);
    expect(document.querySelector('#run-event-banner')?.textContent).toContain('Treasure opened');
    expect(document.querySelector('#run-event-banner')?.classList.contains('visible')).toBe(true);
  });

  it('keeps the end-state threat presentation visible in the map snapshot', async () => {
    await import('../../src/webview/main');
    const session = createHostRun(DEFAULT_PROGRESS, 'warrior', 'finale-presentation-run');
    session.state.stageFinaleStarted = true;
    session.state.stageFinaleStartedAt = 1800;
    session.state.stageFinaleDeadline = 1860;
    session.state.elapsedSeconds = 1805;
    session.state.finaleThreatsSpawned = 1;
    session.state.bossSpawned = true;
    session.sequence += 1;
    window.dispatchEvent(new MessageEvent('message', { data: { version: 1, type: 'RUN_SNAPSHOT', payload: createHostSnapshot(session) } }));
    expect(document.querySelector('#finale-status')?.classList.contains('hidden')).toBe(false);
    expect(document.querySelector('#finale-status')?.textContent).toContain('Final threat active');
    expect(document.querySelector('#finale-status')?.textContent).toContain('00:55 remaining');
  });

  it('does not advance a production webview locally before the host snapshot arrives', async () => {
    delete document.documentElement.dataset.tokenGuildTest;
    await import('../../src/webview/main');
    window.dispatchEvent(new MessageEvent('message', { data: { version: 1, type: 'LOAD_PROGRESS', payload: { ...DEFAULT_PROGRESS } } }));
    document.querySelector<HTMLButtonElement>('#start-run')?.click();
    vi.advanceTimersByTime(500);
    expect(document.querySelector('#clock-hud')?.textContent).toBe('00:00');
    expect(posted.some((message) => (message as { type?: string }).type === 'RUN_STEP')).toBe(false);
    expect(document.querySelector('#host-sync-status')?.textContent).toContain('Connecting');

    const runId = (posted.find((message) => (message as { type?: string }).type === 'START_RUN') as { payload: { runId: string } }).payload.runId;
    const session = createHostRun(DEFAULT_PROGRESS, 'warrior', runId);
    window.dispatchEvent(new MessageEvent('message', { data: { version: 1, type: 'RUN_SNAPSHOT', payload: createHostSnapshot(session) } }));
    expect(document.querySelector('#host-sync-status')?.classList.contains('hidden')).toBe(true);
    vi.advanceTimersByTime(500);
    const firstStep = posted.find((message) => (message as { type?: string }).type === 'RUN_STEP') as { payload: { intentSequence: number } } | undefined;
    expect(firstStep?.payload.intentSequence).toBeGreaterThanOrEqual(1);
    for (let index = 0; index < 5; index += 1) advanceHostRun(session, 0.25, { up: false, down: false, left: false, right: false });
    window.dispatchEvent(new MessageEvent('message', { data: { version: 1, type: 'RUN_SNAPSHOT', payload: createHostSnapshot(session) } }));
    expect(document.querySelector('#clock-hud')?.textContent).toBe('00:01');

    session.state.phase = 'level-up';
    session.state.pendingLevelUps = 1;
    session.state.pendingCards = [{ id: 'heal', label: 'Restore 25% health', kind: 'heal', target: 'heal' }];
    session.sequence += 1;
    window.dispatchEvent(new MessageEvent('message', { data: { version: 1, type: 'RUN_SNAPSHOT', payload: createHostSnapshot(session) } }));
    const upgrade = document.querySelector<HTMLButtonElement>('.upgrade-card');
    expect(upgrade).not.toBeNull();
    upgrade?.click();
    const action = posted.find((message) => (message as { type?: string }).type === 'RUN_ACTION') as { payload: { intentSequence: number } } | undefined;
    expect(action?.payload.intentSequence).toBeGreaterThan((firstStep?.payload.intentSequence ?? 0));
    expect(action).toBeDefined();
    expect(session.state.upgradeHistory).toEqual([]);
    expect(upgrade?.disabled).toBe(true);
    window.dispatchEvent(new MessageEvent('message', { data: { version: 1, type: 'RUN_ERROR', payload: { runId, message: 'Action rejected', nextIntentSequence: action?.payload.intentSequence } } }));
    expect(upgrade?.disabled).toBe(false);
    expect(document.querySelector('#game-announce')?.textContent).toContain('Action rejected');
    upgrade?.click();
    const retry = posted.filter((message) => (message as { type?: string }).type === 'RUN_ACTION').at(-1) as { payload: { intentSequence: number } } | undefined;
    expect(retry?.payload.intentSequence).toBe(action?.payload.intentSequence);
  });
});
