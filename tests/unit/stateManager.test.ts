import { describe, expect, it } from 'vitest';
import { checkpointHostRun, createHostRun } from '../../src/extension/hostRun';
import { DEFAULT_PROGRESS, migrateProgress, StateManager } from '../../src/extension/stateManager';

class MemoryMemento {
  private readonly values = new Map<string, unknown>();

  public get<T>(key: string): T | undefined {
    return this.values.get(key) as T | undefined;
  }

  public async update(key: string, value: unknown): Promise<void> {
    this.values.set(key, value);
  }
}

describe('StateManager active-run checkpoints', () => {
  it('round-trips detached checkpoints independently from wallet progress', async () => {
    const storage = new MemoryMemento();
    const manager = new StateManager(storage);
    const checkpoint = checkpointHostRun(createHostRun(DEFAULT_PROGRESS, 'warrior', 'stored-run'));
    await manager.saveRunCheckpoints([checkpoint]);
    expect(await manager.loadRunCheckpoints()).toEqual([checkpoint]);
    expect(await manager.load()).toEqual(DEFAULT_PROGRESS);
  });

  it('rejects more than the bounded number of active sessions', async () => {
    const manager = new StateManager(new MemoryMemento());
    const checkpoint = checkpointHostRun(createHostRun(DEFAULT_PROGRESS, 'warrior', 'stored-run'));
    await expect(manager.saveRunCheckpoints([checkpoint, checkpoint, checkpoint, checkpoint, checkpoint])).rejects.toThrow('Too many active run checkpoints');
  });

  it('clears checkpoints without resetting wallet progress', async () => {
    const storage = new MemoryMemento();
    const manager = new StateManager(storage);
    const checkpoint = checkpointHostRun(createHostRun(DEFAULT_PROGRESS, 'wizard', 'clear-run'));
    await manager.saveRunCheckpoints([checkpoint]);
    await manager.clearRunCheckpoints();
    expect(await manager.loadRunCheckpoints()).toEqual([]);
    expect((await manager.load()).gold).toBe(0);
  });

  it('clears recovery data when the progress reset API is used', async () => {
    const storage = new MemoryMemento();
    const manager = new StateManager(storage);
    await manager.saveRunCheckpoints([checkpointHostRun(createHostRun(DEFAULT_PROGRESS, 'warrior', 'reset-run'))]);
    await manager.reset();
    expect(await manager.loadRunCheckpoints()).toEqual([]);
  });
});

describe('StateManager capability persistence', () => {
  it('persists independently versioned domains while retaining a legacy aggregate mirror', async () => {
    const storage = new MemoryMemento();
    const manager = new StateManager(storage);
    const progress = {
      ...DEFAULT_PROGRESS,
      gold: 42,
      totalTokens: 123,
      unlockedHeroes: ['warrior', 'wizard'],
      unlockedStages: ['code-dungeon'],
      relics: ['magic-banger'],
      upgrades: { might: 2 },
      batteryLevel: 3,
      runCount: 4,
      completedRunIds: ['run-1', 'run-2']
    };

    await manager.save(progress);

    expect(storage.get('tokenGuild.persistence.layout')).toEqual({ version: 1, state: 'ready' });
    expect(storage.get<Record<string, unknown>>('tokenGuild.wallet')).toEqual({ version: 1, value: { gold: 42, totalTokens: 123 } });
    expect(storage.get<Record<string, unknown>>('tokenGuild.runHistory')).toEqual({ version: 1, value: { runCount: 4, completedRunIds: ['run-1', 'run-2'] } });
    expect(await new StateManager(storage).load()).toMatchObject({ gold: 42, totalTokens: 123, batteryLevel: 3, runCount: 4, completedRunIds: ['run-1', 'run-2'] });
    expect(storage.get('tokenGuild.progress')).toMatchObject({ gold: 42, totalTokens: 123 });
  });

  it('falls back to the aggregate mirror when a domain is corrupted or a write is interrupted', async () => {
    const storage = new MemoryMemento();
    const manager = new StateManager(storage);
    const progressed = { ...DEFAULT_PROGRESS, gold: 77, unlockedHeroes: ['warrior', 'wizard'], relics: ['magic-banger'] };
    await manager.save(progressed);

    await storage.update('tokenGuild.unlocks', { version: 1, value: 'corrupt-domain' });
    expect(await manager.load()).toMatchObject({ gold: 77, unlockedHeroes: ['warrior', 'wizard'], relics: ['magic-banger'] });

    await storage.update('tokenGuild.persistence.layout', { version: 1, state: 'writing' });
    expect(await manager.load()).toMatchObject({ gold: 77, unlockedHeroes: ['warrior', 'wizard'], relics: ['magic-banger'] });
  });

  it('resets every progression domain and the detached run cache together', async () => {
    const storage = new MemoryMemento();
    const manager = new StateManager(storage);
    await manager.save({ ...DEFAULT_PROGRESS, gold: 99, batteryLevel: 4, relics: ['magic-banger'] });
    await manager.reset();

    expect(await manager.load()).toEqual(DEFAULT_PROGRESS);
    expect(storage.get<Record<string, unknown>>('tokenGuild.wallet')).toEqual({ version: 1, value: { gold: 0, totalTokens: 0 } });
    expect(storage.get<Record<string, unknown>>('tokenGuild.collection')).toEqual({ version: 1, value: { relics: [] } });
    expect(await manager.loadRunCheckpoints()).toEqual([]);
  });

  it('normalizes known over-cap ranks during legacy migration while retaining safe unknown keys', () => {
    const migrated = migrateProgress({
      schemaVersion: 1,
      gold: 10,
      unlockedHeroes: ['warrior'],
      unlockedStages: ['code-dungeon'],
      relics: [],
      upgrades: { might: 99, revival: 4, future_capability: 7 },
      heroRecords: {},
      runCount: 0,
      totalTokens: 0,
      batteryLevel: 1,
      completedRunIds: [],
      settings: { muted: false, volume: 0.08 }
    });
    expect(migrated.upgrades).toMatchObject({ might: 5, revival: 1, future_capability: 7 });
  });

  it('repairs over-cap known ranks on a current-schema reload before returning progress', async () => {
    const storage = new MemoryMemento();
    await storage.update('tokenGuild.progress', { ...DEFAULT_PROGRESS, upgrades: { might: 99, future_capability: 2000 } });
    const manager = new StateManager(storage);
    const loaded = await manager.load();
    expect(loaded.upgrades).toMatchObject({ might: 5, future_capability: 999 });
    expect((storage.get<Record<string, unknown>>('tokenGuild.progress')?.upgrades as Record<string, number>).might).toBe(5);
  });
});
