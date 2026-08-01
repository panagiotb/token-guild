import { describe, expect, it } from 'vitest';
import { DEFAULT_PROGRESS, StateManager } from '../../src/extension/stateManager';
import { validateTokenStreamEvent, validateWebviewMessage } from '../../src/shared/validation';

describe('runtime validation', () => {
  it('accepts a valid token event and rejects unsafe counts', () => {
    expect(validateTokenStreamEvent({ source: 'synthetic', accuracy: 'exact', timestampMs: 1, count: 2, tokensPerSecond: 4, confidence: 1 })).toMatchObject({ count: 2 });
    expect(() => validateTokenStreamEvent({ source: 'synthetic', accuracy: 'exact', timestampMs: 1, count: -1, tokensPerSecond: 4, confidence: 1 })).toThrow();
    expect(validateTokenStreamEvent({ source: 'synthetic', accuracy: 'exact', timestampMs: 1, count: 2, tokensPerSecond: 4, confidence: 1, inputTokens: 3, cacheTokens: 4, isAgentActive: true })).toMatchObject({ inputTokens: 3, cacheTokens: 4, isAgentActive: true });
    expect(() => validateTokenStreamEvent({ source: 'synthetic', accuracy: 'exact', timestampMs: 1, count: 2, tokensPerSecond: 4, confidence: 1, inputTokens: -1 })).toThrow();
  });

  it('rejects unknown webview messages', () => {
    expect(() => validateWebviewMessage({ version: 1, type: 'EXECUTE_SCRIPT' })).toThrow();
  });

  it('validates hero progression fields on reward messages', () => {
    expect(() => validateWebviewMessage({ version: 1, type: 'RECORD_RUN_REWARD', payload: { runId: 'run-1', gold: 4, tokens: 8, heroId: 'wizard', level: 3 } })).not.toThrow();
    expect(() => validateWebviewMessage({ version: 1, type: 'RECORD_RUN_REWARD', payload: { runId: 'run-1', gold: 4, tokens: 8, heroId: 'wizard', level: 0 } })).toThrow();
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
    expect(() => validateWebviewMessage({ version: 1, type: 'SAVE_PROGRESS', payload: { ...DEFAULT_PROGRESS, batteryLevel: 5 } })).not.toThrow();
    expect(() => validateWebviewMessage({ version: 1, type: 'SAVE_PROGRESS', payload: { ...DEFAULT_PROGRESS, batteryLevel: 6 } })).toThrow();
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
});
