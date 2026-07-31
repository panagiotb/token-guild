import { describe, expect, it } from 'vitest';
import { DEFAULT_PROGRESS, StateManager } from '../../src/extension/stateManager';
import { validateTokenStreamEvent, validateWebviewMessage } from '../../src/shared/validation';

describe('runtime validation', () => {
  it('accepts a valid token event and rejects unsafe counts', () => {
    expect(validateTokenStreamEvent({ source: 'synthetic', accuracy: 'exact', timestampMs: 1, count: 2, tokensPerSecond: 4, confidence: 1 })).toMatchObject({ count: 2 });
    expect(() => validateTokenStreamEvent({ source: 'synthetic', accuracy: 'exact', timestampMs: 1, count: -1, tokensPerSecond: 4, confidence: 1 })).toThrow();
  });

  it('rejects unknown webview messages', () => {
    expect(() => validateWebviewMessage({ version: 1, type: 'EXECUTE_SCRIPT' })).toThrow();
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
});
