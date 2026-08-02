import { describe, expect, it } from 'vitest';
import { DEFAULT_PROGRESS, StateManager } from '../../src/extension/stateManager';
import { validateTokenStreamEvent, validateWebviewMessage } from '../../src/shared/validation';
import { createRun, rerollLevelUp, skipLevelUp, banishLevelUpCard, tick } from '../../src/game/simulation';
import { BatteryEngine } from '../../src/shared/battery';

describe('runtime validation', () => {
  it('accepts a valid token event and rejects unsafe counts', () => {
    expect(validateTokenStreamEvent({ source: 'synthetic', accuracy: 'exact', timestampMs: 1, count: 2, tokensPerSecond: 4, confidence: 1 })).toMatchObject({ count: 2 });
    expect(() => validateTokenStreamEvent({ source: 'synthetic', accuracy: 'exact', timestampMs: 1, count: -1, tokensPerSecond: 4, confidence: 1 })).toThrow();
    expect(validateTokenStreamEvent({ source: 'synthetic', accuracy: 'exact', timestampMs: 1, count: 2, tokensPerSecond: 4, confidence: 1, inputTokens: 3, cacheTokens: 4, isAgentActive: true })).toMatchObject({ inputTokens: 3, cacheTokens: 4, isAgentActive: true });
    expect(validateTokenStreamEvent({ source: 'otlp', accuracy: 'exact', timestampMs: 1, count: 2, tokensPerSecond: 4, confidence: 1, outputTokens: 2, reasoningTokens: 1 })).toMatchObject({ reasoningTokens: 1 });
    expect(() => validateTokenStreamEvent({ source: 'synthetic', accuracy: 'exact', timestampMs: 1, count: 2, tokensPerSecond: 4, confidence: 1, inputTokens: -1 })).toThrow();
    expect(() => validateTokenStreamEvent({ source: 'otlp', accuracy: 'exact', timestampMs: 1, count: 2, tokensPerSecond: 4, confidence: 1, reasoningTokens: -1 })).toThrow();
    expect(() => validateTokenStreamEvent({ source: 'synthetic', accuracy: 'exact', timestampMs: 1, count: 1_000_001, tokensPerSecond: 4, confidence: 1 })).toThrow();
    expect(() => validateTokenStreamEvent({ source: 'synthetic', accuracy: 'exact', timestampMs: 1, count: 2, tokensPerSecond: 1_000_001, confidence: 1 })).toThrow();
  });

  it('rejects unknown webview messages', () => {
    expect(() => validateWebviewMessage({ version: 1, type: 'EXECUTE_SCRIPT' })).toThrow();
  });

  it('validates hero progression fields on reward messages', () => {
    expect(() => validateWebviewMessage({ version: 1, type: 'RECORD_RUN_REWARD', payload: { runId: 'run-1' } })).not.toThrow();
    expect(() => validateWebviewMessage({ version: 1, type: 'RECORD_RUN_REWARD', payload: { runId: 'run 1' } })).toThrow();
    expect(() => validateWebviewMessage({ version: 1, type: 'RUN_STEP', payload: { runId: 'run-1', intentSequence: 1, deltaSeconds: 0.25, input: { up: false, down: false, left: true, right: false } } })).not.toThrow();
    expect(() => validateWebviewMessage({ version: 1, type: 'RUN_STEP', payload: { runId: 'run-1', intentSequence: 1, deltaSeconds: 0.5, input: { up: false, down: false, left: true, right: false } } })).toThrow();
    expect(() => validateWebviewMessage({ version: 1, type: 'RUN_ACTION', payload: { runId: 'run-1', intentSequence: 2, action: 'upgrade', cardId: 'weapon:arcane_bolt' } })).not.toThrow();
    expect(() => validateWebviewMessage({ version: 1, type: 'RUN_ACTION', payload: { runId: 'run-1', intentSequence: 3, action: 'revive' } })).not.toThrow();
    expect(() => validateWebviewMessage({ version: 1, type: 'RUN_ACTION', payload: { runId: 'run-1', intentSequence: 4, action: 'quit' } })).not.toThrow();
    expect(() => validateWebviewMessage({ version: 1, type: 'RUN_ACTION', payload: { runId: 'run-1', intentSequence: 5, action: 'pause' } })).not.toThrow();
    expect(() => validateWebviewMessage({ version: 1, type: 'RUN_ACTION', payload: { runId: 'run-1', intentSequence: 6, action: 'resume' } })).not.toThrow();
    expect(() => validateWebviewMessage({ version: 1, type: 'RUN_ACTION', payload: { runId: 'run-1', intentSequence: 2, action: 'upgrade', cardId: '__proto__' } })).toThrow();
    expect(() => validateWebviewMessage({ version: 1, type: 'RUN_TELEMETRY', payload: { runId: 'run-1', intentSequence: 3, event: { source: 'synthetic', accuracy: 'exact', timestampMs: 1, count: 1, tokensPerSecond: 1, confidence: 1 } } })).not.toThrow();
    expect(() => validateWebviewMessage({ version: 1, type: 'RUN_STEP', payload: { runId: 'run-1', intentSequence: 0, deltaSeconds: 0.25, input: { up: false, down: false, left: true, right: false } } })).toThrow();
    expect(() => validateWebviewMessage({ version: 1, type: 'START_RUN', payload: { heroId: 'warrior', stageId: 'code-dungeon', runId: 'run-1' } })).not.toThrow();
    expect(() => validateWebviewMessage({ version: 1, type: 'START_RUN', payload: { heroId: 'warrior', stageId: '__proto__', runId: 'run-1' } })).toThrow();
    expect(() => validateWebviewMessage({ version: 1, type: 'START_RUN', payload: { heroId: 'warrior', runId: 'run-1' } })).toThrow();
  });
});

describe('StateManager', () => {
  it('returns defaults and repairs corrupt storage', async () => {
    const values = new Map<string, unknown>([['tokenGuild.progress', { broken: true }]]);
    const storage = { get: <T>(key: string) => values.get(key) as T | undefined, update: async (key: string, value: unknown) => { values.set(key, value); } };
    const manager = new StateManager(storage);
    await expect(manager.load()).resolves.toEqual(DEFAULT_PROGRESS);
    expect(values.get('tokenGuild.progress')).toEqual(DEFAULT_PROGRESS);
  });

  it('does not apply a run reward twice', async () => {
    const values = new Map<string, unknown>();
    const storage = { get: <T>(key: string) => values.get(key) as T | undefined, update: async (key: string, value: unknown) => { values.set(key, value); } };
    const manager = new StateManager(storage);
    const first = await manager.applyRunReward(DEFAULT_PROGRESS, 'run-1', 10, 20);
    const second = await manager.applyRunReward(first, 'run-1', 10, 20);
    expect(second).toEqual(first);
  });

  it('migrates legacy progress and preserves valid wallet/settings fields', async () => {
    const values = new Map<string, unknown>([['tokenGuild.progress', { schemaVersion: 1, gold: 125, unlockedHeroes: ['wizard'], upgrades: { might: 2 }, runCount: 3, totalTokens: 44, completedRunIds: ['old-run'], settings: { muted: true, volume: 0.4 } }]]);
    const storage = { get: <T>(key: string) => values.get(key) as T | undefined, update: async (key: string, value: unknown) => { values.set(key, value); } };
    const manager = new StateManager(storage);
    const migrated = await manager.load();
    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.gold).toBe(125);
    expect(migrated.settings).toEqual({ muted: true, volume: 0.4 });
    expect(migrated.heroRecords.wizard).toEqual({ highestLevel: 1 });
    expect(migrated.batteryLevel).toBe(1);
    expect(values.get('tokenGuild.progress')).toEqual(migrated);
  });

  it('repairs corrupt/future hero records without erasing valid wallet data', async () => {
    const values = new Map<string, unknown>([['tokenGuild.progress', { schemaVersion: 99, gold: 80, runCount: 2, totalTokens: 9, unlockedHeroes: ['wizard'], upgrades: {}, completedRunIds: [], settings: { muted: false, volume: 0.2 }, heroRecords: { wizard: { highestLevel: -4 } } }]]);
    const storage = { get: <T>(key: string) => values.get(key) as T | undefined, update: async (key: string, value: unknown) => { values.set(key, value); } };
    const migrated = await new StateManager(storage).load();
    expect(migrated.gold).toBe(80);
    expect(migrated.settings.volume).toBe(0.2);
    expect(migrated.heroRecords.wizard).toEqual({ highestLevel: 1 });
  });

  it('accepts and persists a bounded battery level', () => {
    expect(() => validateWebviewMessage({ version: 1, type: 'SAVE_PROGRESS', payload: { ...DEFAULT_PROGRESS, batteryLevel: 5 } })).toThrow();
  });

  it('validates narrow host-owned intents', () => {
    expect(() => validateWebviewMessage({ version: 1, type: 'PURCHASE_UPGRADE', payload: { upgradeId: 'might' } })).not.toThrow();
    expect(() => validateWebviewMessage({ version: 1, type: 'PURCHASE_BATTERY' })).not.toThrow();
    expect(() => validateWebviewMessage({ version: 1, type: 'REFUND_UPGRADES' })).not.toThrow();
    expect(() => validateWebviewMessage({ version: 1, type: 'UPDATE_SETTINGS', payload: { muted: true, volume: 0.5 } })).not.toThrow();
    expect(() => validateWebviewMessage({ version: 1, type: 'UPDATE_TELEMETRY_SETTINGS', payload: { syntheticEnabled: false } })).not.toThrow();
    expect(() => validateWebviewMessage({ version: 1, type: 'UPDATE_TELEMETRY_SETTINGS', payload: { syntheticEnabled: 'false' } })).toThrow();
    expect(() => validateWebviewMessage({ version: 1, type: 'PURCHASE_UPGRADE', payload: { upgradeId: '__proto__' } })).toThrow();
  });

  it('records the highest reached hero level once with an idempotent reward', async () => {
    const values = new Map<string, unknown>();
    const storage = { get: <T>(key: string) => values.get(key) as T | undefined, update: async (key: string, value: unknown) => { values.set(key, value); } };
    const manager = new StateManager(storage);
    const first = await manager.applyRunReward(DEFAULT_PROGRESS, 'level-run', 10, 20, 'wizard', 4);
    expect(first.heroRecords.wizard).toEqual({ highestLevel: 4 });
    const duplicate = await manager.applyRunReward(first, 'level-run', 10, 20, 'wizard', 8);
    expect(duplicate).toEqual(first);
  });

  it('resets hero records and wallet together', async () => {
    const values = new Map<string, unknown>();
    const storage = { get: <T>(key: string) => values.get(key) as T | undefined, update: async (key: string, value: unknown) => { values.set(key, value); } };
    const manager = new StateManager(storage);
    const progressed = await manager.applyRunReward(DEFAULT_PROGRESS, 'reset-run', 100, 10, 'wizard', 5);
    expect(progressed.gold).toBe(100);
    await manager.reset();
    expect(values.get('tokenGuild.progress')).toEqual(DEFAULT_PROGRESS);
  });

  it('migrates P3 arrays without erasing legacy wallet progress', async () => {
    const values = new Map<string, unknown>([['tokenGuild.progress', { schemaVersion: 3, gold: 12, unlockedHeroes: ['wizard'], upgrades: {}, runCount: 1, totalTokens: 4, batteryLevel: 2, completedRunIds: ['old'], settings: { muted: false, volume: 0.2 }, heroRecords: { wizard: { highestLevel: 2 } } }]]);
    const storage = { get: <T>(key: string) => values.get(key) as T | undefined, update: async (key: string, value: unknown) => { values.set(key, value); } };
    const migrated = await new StateManager(storage).load();
    expect(migrated.gold).toBe(12);
    expect(migrated.unlockedStages).toEqual(['code-dungeon']);
    expect(migrated.relics).toEqual([]);
  });

  it('purchases bounded upgrades at global PowerUp costs and refunds only registered ranks', async () => {
    const values = new Map<string, unknown>();
    const storage = { get: <T>(key: string) => values.get(key) as T | undefined, update: async (key: string, value: unknown) => { values.set(key, value); } };
    const manager = new StateManager(storage);
    const funded = { ...DEFAULT_PROGRESS, gold: 1000, upgrades: { legacy: 7 }, batteryLevel: 3 };
    const first = await manager.purchaseUpgrade(funded, 'might');
    expect(first.gold).toBe(800);
    expect(first.upgrades).toMatchObject({ might: 1, legacy: 7 });
    const second = await manager.purchaseUpgrade(first, 'might');
    expect(second.gold).toBe(376);
    const crossUpgrade = await manager.purchaseUpgrade({ ...second, gold: 10000 }, 'armor');
    expect(crossUpgrade.gold).toBe(9374);
    await expect(manager.purchaseUpgrade({ ...second, gold: 0 }, 'might')).rejects.toThrow(/Insufficient/);
    const refunded = await manager.refundUpgrades(second);
    expect(refunded.gold).toBe(1000);
    expect(refunded.upgrades).toEqual({ legacy: 7 });
    expect(refunded.batteryLevel).toBe(3);
    const batteryFunding = BatteryEngine.upgradeCost(2) + 100;
    const batteryPurchased = await manager.purchaseBattery({ ...DEFAULT_PROGRESS, gold: batteryFunding });
    expect(batteryPurchased.batteryLevel).toBe(2);
    expect(batteryPurchased.gold).toBe(100);
    const settingsUpdated = await manager.updateSettings(batteryPurchased, { muted: true, volume: 0.3 });
    expect(settingsUpdated.settings).toEqual({ muted: true, volume: 0.3 });
  });

  it('unlocks heroes and relic records through idempotent run rewards', async () => {
    const values = new Map<string, unknown>();
    const storage = { get: <T>(key: string) => values.get(key) as T | undefined, update: async (key: string, value: unknown) => { values.set(key, value); } };
    const manager = new StateManager(storage);
    let progress = await manager.applyRunReward(DEFAULT_PROGRESS, 'unlock-1', 0, 0, 'warrior', 5);
    expect(progress.unlockedHeroes).toContain('wizard');
    expect(progress.relics).toContain('magic-banger');
    progress = await manager.applyRunReward(progress, 'unlock-2', 100, 0, 'warrior', 1);
    expect(progress.unlockedHeroes).toContain('rogue');
    progress = await manager.applyRunReward(progress, 'unlock-3', 0, 0, 'warrior', 1);
    progress = await manager.applyRunReward(progress, 'unlock-4', 0, 0, 'warrior', 10);
    expect(progress.unlockedHeroes).toContain('ranger');
    expect(progress.unlockedHeroes).toContain('paladin');
    expect(progress.relics).toContain('grim-grimoire');
    progress = await manager.applyRunReward(progress, 'unlock-5', 0, 0, 'warrior', 1);
    expect(progress.unlockedHeroes).toContain('necromancer');
    await expect(manager.applyRunReward(progress, 'unlock-5', 999, 0, 'warrior', 99)).resolves.toEqual(progress);
  });

  it('gates and consumes per-run reroll, skip, and banish actions', () => {
    const locked = createRun('warrior', 301);
    locked.phase = 'level-up';
    locked.pendingCards = [{ id: 'heal', label: 'Heal', kind: 'heal', target: 'heal' }];
    expect(() => rerollLevelUp(locked)).toThrow(/unavailable/);

    const run = createRun('warrior', 302, { reroll: 1, skip: 1, banish: 1 });
    for (let index = 0; index < 5; index += 1) run.pickups.push({ id: index + 1, kind: 'xp-shard', x: 0, y: 0, value: 1 });
    tick(run, 0.01, 0);
    expect(run.phase).toBe('level-up');
    const first = run.pendingCards.map((card) => card.id);
    rerollLevelUp(run);
    expect(run.rerollsRemaining).toBe(0);
    expect(run.pendingCards).toHaveLength(3);
    const banished = run.pendingCards[0]!.id;
    banishLevelUpCard(run, banished);
    expect(run.banishesRemaining).toBe(0);
    expect(run.pendingCards.some((card) => card.id === banished)).toBe(false);
    skipLevelUp(run);
    expect(run.skipsRemaining).toBe(0);
    expect(run.phase).toBe('dungeon');
    expect(run.xp).toBe(3);
    expect(first.length).toBe(3);
  });
});
