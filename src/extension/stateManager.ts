import type * as vscode from 'vscode';
import { PROGRESS_SCHEMA_VERSION } from '../shared/types';
import type { HeroProgressRecord, PersistedProgress } from '../shared/types';
import { validateProgress } from '../shared/validation';
import { metaUpgradeCost, metaUpgradeDefinition, metaUpgradeRefund } from '../game/meta';

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
  unlockedHeroes: ['warrior'],
  unlockedStages: ['code-dungeon'],
  relics: [],
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
  const unlockedStages = safeStringArray(raw.unlockedStages, DEFAULT_PROGRESS.unlockedStages, 64);
  const relics = safeStringArray(raw.relics, DEFAULT_PROGRESS.relics, 64);
  const completedRunIds = safeStringArray(raw.completedRunIds, [], 128);
  const candidate: PersistedProgress = {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    gold: nonNegativeNumber(raw.gold, DEFAULT_PROGRESS.gold),
    unlockedHeroes,
    unlockedStages,
    relics,
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

  public async purchaseUpgrade(progress: PersistedProgress, upgradeId: string): Promise<PersistedProgress> {
    const current = validateProgress(progress);
    const definition = metaUpgradeDefinition(upgradeId);
    if (!definition) throw new Error('Unknown meta upgrade');
    const rank = current.upgrades[upgradeId] ?? 0;
    const cost = metaUpgradeCost(upgradeId, rank);
    if (!Number.isFinite(cost) || rank >= definition.maxRank) throw new Error('Meta upgrade is at maximum rank');
    if (current.gold < cost) throw new Error('Insufficient gold');
    return this.saveAndReturn({ ...current, gold: current.gold - cost, upgrades: { ...current.upgrades, [upgradeId]: rank + 1 } });
  }

  public async refundUpgrades(progress: PersistedProgress): Promise<PersistedProgress> {
    const current = validateProgress(progress);
    const refund = metaUpgradeRefund(current.upgrades);
    const upgrades = { ...current.upgrades };
    for (const key of Object.keys(upgrades)) if (metaUpgradeDefinition(key)) delete upgrades[key];
    return this.saveAndReturn({ ...current, gold: current.gold + refund, upgrades });
  }

  private async saveAndReturn(next: PersistedProgress): Promise<PersistedProgress> {
    await this.save(next);
    return next;
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
    const nextRunCount = current.runCount + 1;
    const nextGold = current.gold + gold;
    const nextUnlocked = new Set(current.unlockedHeroes);
    if (heroId === 'warrior' && (level ?? 0) >= 5) nextUnlocked.add('wizard');
    if (nextGold >= 100) nextUnlocked.add('rogue');
    if (nextRunCount >= 3) nextUnlocked.add('ranger');
    if ((level ?? 0) >= 10) nextUnlocked.add('paladin');
    if (nextRunCount >= 5) nextUnlocked.add('necromancer');
    const nextRelics = new Set(current.relics);
    if (nextRunCount >= 1) nextRelics.add('magic-banger');
    if ((level ?? 0) >= 10) nextRelics.add('grim-grimoire');
    if (nextRunCount >= 3) nextRelics.add('milky-way-map');
    const next: PersistedProgress = { ...current, gold: nextGold, totalTokens: current.totalTokens + tokens, runCount: nextRunCount, completedRunIds: [...current.completedRunIds, runId], heroRecords, unlockedHeroes: [...nextUnlocked], relics: [...nextRelics] };
    await this.save(next);
    return next;
  }
}
