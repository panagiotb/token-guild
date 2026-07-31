import type * as vscode from 'vscode';
import type { PersistedProgress } from '../shared/types';
import { validateProgress } from '../shared/validation';

const STORAGE_KEY = 'tokenGuild.progress';

export const DEFAULT_PROGRESS: PersistedProgress = {
  schemaVersion: 1,
  gold: 0,
  unlockedHeroes: ['warrior', 'wizard', 'rogue', 'ranger', 'paladin', 'necromancer'],
  upgrades: {},
  runCount: 0,
  totalTokens: 0,
  completedRunIds: [],
  settings: { muted: false, volume: 0.08 }
};

export class StateManager {
  public constructor(private readonly storage: Pick<vscode.Memento, 'get' | 'update'>) {}

  public async load(): Promise<PersistedProgress> {
    const raw = this.storage.get<unknown>(STORAGE_KEY);
    if (raw === undefined) return DEFAULT_PROGRESS;
    try {
      return validateProgress(raw);
    } catch {
      await this.storage.update(STORAGE_KEY, DEFAULT_PROGRESS);
      return DEFAULT_PROGRESS;
    }
  }

  public async save(progress: PersistedProgress): Promise<void> {
    await this.storage.update(STORAGE_KEY, validateProgress(progress));
  }

  public async reset(): Promise<void> {
    await this.storage.update(STORAGE_KEY, DEFAULT_PROGRESS);
  }

  public async applyRunReward(progress: PersistedProgress, runId: string, gold: number, tokens: number): Promise<PersistedProgress> {
    const current = validateProgress(progress);
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(runId)) throw new Error('Invalid run ID');
    if (!Number.isFinite(gold) || gold < 0 || !Number.isFinite(tokens) || tokens < 0) throw new Error('Invalid run reward');
    if (current.completedRunIds.includes(runId)) return current;
    const next: PersistedProgress = { ...current, gold: current.gold + gold, totalTokens: current.totalTokens + tokens, runCount: current.runCount + 1, completedRunIds: [...current.completedRunIds, runId] };
    await this.save(next);
    return next;
  }
}
