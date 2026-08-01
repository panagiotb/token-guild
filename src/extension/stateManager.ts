import type * as vscode from 'vscode';
import { PROGRESS_SCHEMA_VERSION } from '../shared/types';
import type { HeroProgressRecord, PersistedProgress } from '../shared/types';
import { validateProgress } from '../shared/validation';

const STORAGE_KEY = 'tokenGuild.progress';
const HERO_IDS = ['warrior', 'wizard', 'rogue', 'ranger', 'paladin', 'necromancer'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function defaultHeroRecords(): Readonly<Record<string, HeroProgressRecord>> {
  return Object.fromEntries(HERO_IDS.map((heroId) => [heroId, { highestLevel: 1 }])) as Record<string, HeroProgressRecord>;
}

function nonNegativeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function safeStringArray(value: unknown, fallback: readonly string[], maxLength: number): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const strings = value.filter((item): item is string => typeof item === 'string' && item.length > 0 && item.length <= maxLength && item !== '__proto__' && item !== 'constructor' && item !== 'prototype');
  return strings.length > 0 || value.length === 0 ? [...new Set(strings)] : [...fallback];
}

function safeUpgrades(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  const upgrades: Record<string, number> = Object.create(null) as Record<string, number>;
  for (const [key, rank] of Object.entries(value)) {
    if (key.length > 0 && key.length <= 64 && key !== '__proto__' && key !== 'constructor' && key !== 'prototype' && typeof rank === 'number' && Number.isFinite(rank) && Number.isInteger(rank) && rank >= 0) upgrades[key] = rank;
  }
  return upgrades;
}

function safeHeroRecords(value: unknown, unlockedHeroes: readonly string[]): Record<string, HeroProgressRecord> {
  const source = isRecord(value) ? value : {};
  const heroIds = new Set<string>([...HERO_IDS, ...unlockedHeroes]);
  const records: Record<string, HeroProgressRecord> = Object.create(null) as Record<string, HeroProgressRecord>;
  for (const heroId of heroIds) {
    const candidate = source[heroId];
    const level = isRecord(candidate) ? candidate.highestLevel : undefined;
    records[heroId] = typeof level === 'number' && Number.isInteger(level) && level >= 1 && level <= 999 ? { highestLevel: level } : { highestLevel: 1 };
  }
  return records;
}

function safeSettings(value: unknown): { muted: boolean; volume: number } {
  if (!isRecord(value)) return { ...DEFAULT_PROGRESS.settings };
  return typeof value.muted === 'boolean' && typeof value.volume === 'number' && Number.isFinite(value.volume) && value.volume >= 0 && value.volume <= 1
    ? { muted: value.muted, volume: value.volume }
    : { ...DEFAULT_PROGRESS.settings };
}

export const DEFAULT_PROGRESS: PersistedProgress = {
  schemaVersion: PROGRESS_SCHEMA_VERSION,
  gold: 0,
  unlockedHeroes: [...HERO_IDS],
  upgrades: {},
  heroRecords: defaultHeroRecords(),
  runCount: 0,
  totalTokens: 0,
  batteryLevel: 1,
  completedRunIds: [],
  settings: { muted: false, volume: 0.08 }
};

/**
 * Upgrades legacy, corrupt, or future progress to the current safe shape.
 * Known valid wallet/settings/aggregate fields are retained; invalid fields
 * receive defaults so a bad hero record cannot erase unrelated progress.
 */
export function migrateProgress(raw: unknown): PersistedProgress {
  if (!isRecord(raw)) return DEFAULT_PROGRESS;
  const unlockedHeroes = safeStringArray(raw.unlockedHeroes, DEFAULT_PROGRESS.unlockedHeroes, 64);
  const completedRunIds = safeStringArray(raw.completedRunIds, [], 128);
  const candidate: PersistedProgress = {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    gold: nonNegativeNumber(raw.gold, DEFAULT_PROGRESS.gold),
    unlockedHeroes,
    upgrades: safeUpgrades(raw.upgrades),
    heroRecords: safeHeroRecords(raw.heroRecords, unlockedHeroes),
    runCount: nonNegativeNumber(raw.runCount, DEFAULT_PROGRESS.runCount),
    totalTokens: nonNegativeNumber(raw.totalTokens, DEFAULT_PROGRESS.totalTokens),
    batteryLevel: typeof raw.batteryLevel === 'number' && Number.isInteger(raw.batteryLevel) && raw.batteryLevel >= 1 && raw.batteryLevel <= 5 ? raw.batteryLevel : DEFAULT_PROGRESS.batteryLevel,
    completedRunIds,
    settings: safeSettings(raw.settings)
  };
  try {
    return validateProgress(candidate);
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export class StateManager {
  public constructor(private readonly storage: Pick<vscode.Memento, 'get' | 'update'>) {}

  public async load(): Promise<PersistedProgress> {
    const raw = this.storage.get<unknown>(STORAGE_KEY);
    if (raw === undefined) return DEFAULT_PROGRESS;
    try {
      return validateProgress(raw);
    } catch {
      const migrated = migrateProgress(raw);
      await this.storage.update(STORAGE_KEY, migrated);
      return migrated;
    }
  }

  public async save(progress: PersistedProgress): Promise<void> {
    await this.storage.update(STORAGE_KEY, validateProgress(progress));
  }

  public async reset(): Promise<void> {
    await this.storage.update(STORAGE_KEY, DEFAULT_PROGRESS);
  }

  public async applyRunReward(progress: PersistedProgress, runId: string, gold: number, tokens: number, heroId?: string, level?: number): Promise<PersistedProgress> {
    const current = validateProgress(progress);
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(runId)) throw new Error('Invalid run ID');
    if (!Number.isFinite(gold) || gold < 0 || !Number.isFinite(tokens) || tokens < 0) throw new Error('Invalid run reward');
    if ((heroId === undefined) !== (level === undefined)) throw new Error('Invalid hero progression reward');
    if (heroId !== undefined && level !== undefined && (heroId.length === 0 || heroId.length > 64 || !HERO_IDS.includes(heroId as typeof HERO_IDS[number]) || !Number.isInteger(level) || level < 1 || level > 999)) throw new Error('Invalid hero progression reward');
    if (current.completedRunIds.includes(runId)) return current;
    const heroRecords = { ...current.heroRecords };
    if (heroId !== undefined && level !== undefined) {
      const previous = heroRecords[heroId]?.highestLevel ?? 1;
      heroRecords[heroId] = { highestLevel: Math.max(previous, level) };
    }
    const next: PersistedProgress = { ...current, gold: current.gold + gold, totalTokens: current.totalTokens + tokens, runCount: current.runCount + 1, completedRunIds: [...current.completedRunIds, runId], heroRecords };
    await this.save(next);
    return next;
  }
}
