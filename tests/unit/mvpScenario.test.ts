import { describe, expect, it } from 'vitest';
import { DEFAULT_PROGRESS, StateManager } from '../../src/extension/stateManager';
import { applyTokenInput, chooseUpgrade, createRun, tick } from '../../src/game/simulation';

describe('MVP Guild-to-run scenario', () => {
  it('completes a deterministic run and persists its reward once', async () => {
    const run = createRun('warrior', 123);
    run.hero.stats.hp = 100000; run.hero.stats.maxHp = 100000;
    run.hero.stats.magnet = 1000;
    for (let index = 0; index < 800 && run.phase !== 'summary'; index += 1) {
      if (run.phase === 'level-up') chooseUpgrade(run, run.pendingCards[0]?.id ?? 'heal');
      applyTokenInput(run, { count: 3, tokensPerSecond: 40 });
      tick(run, 0.25, 40);
    }
    expect(run.summary?.outcome).toBe('victory');

    const values = new Map<string, unknown>();
    const storage = { get: <T>(key: string) => values.get(key) as T | undefined, update: async (key: string, value: unknown) => { values.set(key, value); } };
    const manager = new StateManager(storage);
    const first = await manager.applyRunReward(DEFAULT_PROGRESS, 'scenario-1', run.summary?.gold ?? 0, run.summary?.tokens ?? 0);
    const second = await manager.applyRunReward(first, 'scenario-1', run.summary?.gold ?? 0, run.summary?.tokens ?? 0);
    expect(second).toEqual(first);
  });
});
