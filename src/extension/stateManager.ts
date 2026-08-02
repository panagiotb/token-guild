import type * as vscode from 'vscode';
import { PROGRESS_SCHEMA_VERSION } from '../shared/types';
import type { HeroProgressRecord, PersistedProgress } from '../shared/types';
import { validateProgress } from '../shared/validation';
import { META_UPGRADES, metaUpgradeCost, metaUpgradeDefinition, metaUpgradeRefund, normalizeMetaUpgrades } from '../game/meta';
import { MVP_REGISTRY } from '../game/content';
import { BatteryEngine } from '../shared/battery';
import type { HostRunCheckpoint } from './hostRun';

const STORAGE_KEY = 'tokenGuild.progress';
const RUN_CHECKPOINTS_KEY = 'tokenGuild.activeRuns';
const PERSISTENCE_LAYOUT_KEY = 'tokenGuild.persistence.layout';
const PERSISTENCE_LAYOUT_VERSION = 1 as const;
const MAX_ACTIVE_RUN_CHECKPOINTS = 4;
const MAX_RUN_CHECKPOINT_BYTES = 512_000;
const HERO_IDS = ['warrior', 'wizard', 'rogue', 'ranger', 'paladin', 'necromancer'] as const;

const DOMAIN_KEYS = {
  wallet: 'tokenGuild.wallet',
  collection: 'tokenGuild.collection',
  unlocks: 'tokenGuild.unlocks',
  settings: 'tokenGuild.settings',
  battery: 'tokenGuild.battery',
  upgrades: 'tokenGuild.upgrades',
  runHistory: 'tokenGuild.runHistory'
} as const;

type ProgressStorage = Pick<vscode.Memento, 'get' | 'update'>;

interface StoredDomain<T> {
  readonly version: typeof PERSISTENCE_LAYOUT_VERSION;
  readonly value: T;
}

interface PersistenceLayout {
  readonly version: typeof PERSISTENCE_LAYOUT_VERSION;
  readonly state: 'writing' | 'ready';
}

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

function applyRegistryUnlocks(unlockedHeroes: readonly string[], heroId: string | undefined, level: number | undefined, nextGold: number, nextRunCount: number): string[] {
  const unlocked = new Set(unlockedHeroes);
  for (const hero of MVP_REGISTRY.classes) {
    const condition = hero.unlock;
    if (!condition) continue;
    const met = condition.metric === 'gold'
      ? nextGold >= condition.threshold
      : condition.metric === 'run-count'
        ? nextRunCount >= condition.threshold
        : level !== undefined && level >= condition.threshold && (condition.heroId === undefined || condition.heroId === heroId);
    if (met) unlocked.add(hero.id);
  }
  return [...unlocked];
}

function storedDomain<T>(value: T): StoredDomain<T> {
  return { version: PERSISTENCE_LAYOUT_VERSION, value };
}

function readDomain<T>(storage: ProgressStorage, key: string): T | undefined {
  const raw = storage.get<unknown>(key);
  if (!isRecord(raw) || raw.version !== PERSISTENCE_LAYOUT_VERSION || !('value' in raw)) return undefined;
  return raw.value as T;
}

function hasReadyPersistenceLayout(storage: ProgressStorage): boolean {
  const raw = storage.get<unknown>(PERSISTENCE_LAYOUT_KEY);
  return isRecord(raw) && raw.version === PERSISTENCE_LAYOUT_VERSION && raw.state === 'ready';
}

function domainsForProgress(progress: PersistedProgress): {
  wallet: { gold: number; totalTokens: number };
  collection: { relics: readonly string[] };
  unlocks: { unlockedHeroes: readonly string[]; unlockedStages: readonly string[]; heroRecords: Readonly<Record<string, HeroProgressRecord>> };
  settings: { muted: boolean; volume: number };
  battery: { batteryLevel: number };
  upgrades: Readonly<Record<string, number>>;
  runHistory: { runCount: number; completedRunIds: readonly string[] };
} {
  return {
    wallet: { gold: progress.gold, totalTokens: progress.totalTokens },
    collection: { relics: progress.relics },
    unlocks: { unlockedHeroes: progress.unlockedHeroes, unlockedStages: progress.unlockedStages, heroRecords: progress.heroRecords },
    settings: { muted: progress.settings.muted, volume: progress.settings.volume },
    battery: { batteryLevel: progress.batteryLevel },
    upgrades: progress.upgrades,
    runHistory: { runCount: progress.runCount, completedRunIds: progress.completedRunIds }
  };
}

/**
 * Reconstructs the aggregate progress view from the independently stored
 * domains. A missing/corrupt domain is reported as unavailable so callers can
 * fall back to the legacy aggregate mirror rather than silently dropping
 * valid progress during a partial write or interrupted migration.
 */
function readDomainProgress(storage: ProgressStorage): PersistedProgress | undefined {
  if (!hasReadyPersistenceLayout(storage)) return undefined;
  const wallet = readDomain<unknown>(storage, DOMAIN_KEYS.wallet);
  const collection = readDomain<unknown>(storage, DOMAIN_KEYS.collection);
  const unlocks = readDomain<unknown>(storage, DOMAIN_KEYS.unlocks);
  const settings = readDomain<unknown>(storage, DOMAIN_KEYS.settings);
  const battery = readDomain<unknown>(storage, DOMAIN_KEYS.battery);
  const upgrades = readDomain<unknown>(storage, DOMAIN_KEYS.upgrades);
  const runHistory = readDomain<unknown>(storage, DOMAIN_KEYS.runHistory);
  const domains = [wallet, collection, unlocks, settings, battery, upgrades, runHistory];
  if (domains.some((domain) => domain === undefined) || domains.some((domain) => !isRecord(domain))) return undefined;

  const walletRecord = wallet as Record<string, unknown>;
  const collectionRecord = collection as Record<string, unknown>;
  const unlocksRecord = unlocks as Record<string, unknown>;
  const settingsRecord = settings as Record<string, unknown>;
  const batteryRecord = battery as Record<string, unknown>;
  const runHistoryRecord = runHistory as Record<string, unknown>;
  const unlockedHeroes = safeStringArray(unlocksRecord.unlockedHeroes, DEFAULT_PROGRESS.unlockedHeroes, 64);
  const candidate: PersistedProgress = {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    gold: nonNegativeNumber(walletRecord.gold, DEFAULT_PROGRESS.gold),
    unlockedHeroes,
    unlockedStages: safeStringArray(unlocksRecord.unlockedStages, DEFAULT_PROGRESS.unlockedStages, 64),
    relics: safeStringArray(collectionRecord.relics, DEFAULT_PROGRESS.relics, 64),
    upgrades: normalizeMetaUpgrades(safeUpgrades(upgrades)),
    heroRecords: safeHeroRecords(unlocksRecord.heroRecords, unlockedHeroes),
    runCount: nonNegativeNumber(runHistoryRecord.runCount, DEFAULT_PROGRESS.runCount),
    totalTokens: nonNegativeNumber(walletRecord.totalTokens, DEFAULT_PROGRESS.totalTokens),
    batteryLevel: typeof batteryRecord.batteryLevel === 'number' && Number.isInteger(batteryRecord.batteryLevel) && batteryRecord.batteryLevel >= 1 && batteryRecord.batteryLevel <= 5 ? batteryRecord.batteryLevel : DEFAULT_PROGRESS.batteryLevel,
    completedRunIds: safeStringArray(runHistoryRecord.completedRunIds, DEFAULT_PROGRESS.completedRunIds, 128),
    settings: safeSettings(settingsRecord)
  };
  try {
    return validateProgress(candidate);
  } catch {
    return undefined;
  }
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
    upgrades: normalizeMetaUpgrades(safeUpgrades(raw.upgrades)),
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
    const domainProgress = readDomainProgress(this.storage);
    if (domainProgress) return domainProgress;
    const raw = this.storage.get<unknown>(STORAGE_KEY);
    if (raw === undefined) return DEFAULT_PROGRESS;
    try {
      const current = validateProgress(raw);
      const upgrades = normalizeMetaUpgrades(current.upgrades);
      const normalized = JSON.stringify(upgrades) !== JSON.stringify(current.upgrades) ? { ...current, upgrades } : current;
      // A valid legacy aggregate is migrated into the domain layout on the
      // first load. The aggregate mirror remains for rollback/corruption
      // recovery and older extension versions.
      await this.persistProgress(normalized);
      return normalized;
    } catch {
      const migrated = migrateProgress(raw);
      await this.persistProgress(migrated);
      return migrated;
    }
  }

  public async save(progress: PersistedProgress): Promise<void> {
    await this.persistProgress(validateProgress(progress));
  }

  public async reset(): Promise<void> {
    await this.persistProgress(DEFAULT_PROGRESS);
    await this.clearRunCheckpoints();
  }

  /** Load detached run checkpoints separately from wallet/progression data.
   * Invalid checkpoint contents are returned for host-side structural
   * validation; they never enter the persistent reward path directly. */
  public async loadRunCheckpoints(): Promise<HostRunCheckpoint[]> {
    const raw = this.storage.get<unknown>(RUN_CHECKPOINTS_KEY);
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, MAX_ACTIVE_RUN_CHECKPOINTS) as HostRunCheckpoint[];
  }

  /** Persist only a bounded, JSON-safe set of active run checkpoints. The
   * simulation remains the authority; this is a crash/reload recovery cache,
   * not a second wallet or reward ledger. */
  public async saveRunCheckpoints(checkpoints: readonly HostRunCheckpoint[]): Promise<void> {
    if (checkpoints.length > MAX_ACTIVE_RUN_CHECKPOINTS) throw new Error('Too many active run checkpoints');
    const serialized = JSON.stringify(checkpoints);
    if (serialized.length > MAX_RUN_CHECKPOINT_BYTES) throw new Error('Active run checkpoints exceed storage limit');
    await this.storage.update(RUN_CHECKPOINTS_KEY, JSON.parse(serialized));
  }

  public async clearRunCheckpoints(): Promise<void> {
    await this.storage.update(RUN_CHECKPOINTS_KEY, []);
  }

  public async purchaseUpgrade(progress: PersistedProgress, upgradeId: string): Promise<PersistedProgress> {
    const current = validateProgress(progress);
    const definition = metaUpgradeDefinition(upgradeId);
    if (!definition) throw new Error('Unknown meta upgrade');
    const rank = current.upgrades[upgradeId] ?? 0;
    const totalBought = META_UPGRADES.reduce((total, entry) => total + Math.max(0, Math.min(entry.maxRank, Math.floor(current.upgrades[entry.id] ?? 0))), 0);
    const cost = metaUpgradeCost(upgradeId, rank, totalBought + 1);
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

  public async purchaseBattery(progress: PersistedProgress): Promise<PersistedProgress> {
    const current = validateProgress(progress);
    const nextLevel = current.batteryLevel + 1;
    const cost = BatteryEngine.upgradeCost(nextLevel);
    if (nextLevel > BatteryEngine.MAX_LEVEL) throw new Error('Token battery is at maximum level');
    if (current.gold < cost) throw new Error('Insufficient gold');
    return this.saveAndReturn({ ...current, gold: current.gold - cost, batteryLevel: nextLevel });
  }

  public async updateSettings(progress: PersistedProgress, settings: { muted: boolean; volume: number }): Promise<PersistedProgress> {
    const current = validateProgress(progress);
    if (typeof settings.muted !== 'boolean' || !Number.isFinite(settings.volume) || settings.volume < 0 || settings.volume > 1) throw new Error('Invalid audio settings');
    return this.saveAndReturn({ ...current, settings: { muted: settings.muted, volume: settings.volume } });
  }

  private async saveAndReturn(next: PersistedProgress): Promise<PersistedProgress> {
    await this.save(next);
    return next;
  }

  /**
   * Writes a compatibility aggregate plus independently versioned domains.
   * The layout marker is set to `writing` before mutations and `ready` only
   * after every domain has been written. If the host is interrupted midway,
   * the next load ignores the partial domains and safely uses the aggregate
   * mirror instead of combining unrelated generations.
   */
  private async persistProgress(progress: PersistedProgress): Promise<void> {
    const domains = domainsForProgress(progress);
    const writing: PersistenceLayout = { version: PERSISTENCE_LAYOUT_VERSION, state: 'writing' };
    const ready: PersistenceLayout = { version: PERSISTENCE_LAYOUT_VERSION, state: 'ready' };
    await this.storage.update(PERSISTENCE_LAYOUT_KEY, writing);
    await this.storage.update(STORAGE_KEY, progress);
    await this.storage.update(DOMAIN_KEYS.wallet, storedDomain(domains.wallet));
    await this.storage.update(DOMAIN_KEYS.collection, storedDomain(domains.collection));
    await this.storage.update(DOMAIN_KEYS.unlocks, storedDomain(domains.unlocks));
    await this.storage.update(DOMAIN_KEYS.settings, storedDomain(domains.settings));
    await this.storage.update(DOMAIN_KEYS.battery, storedDomain(domains.battery));
    await this.storage.update(DOMAIN_KEYS.upgrades, storedDomain(domains.upgrades));
    await this.storage.update(DOMAIN_KEYS.runHistory, storedDomain(domains.runHistory));
    await this.storage.update(PERSISTENCE_LAYOUT_KEY, ready);
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
    const nextUnlocked = applyRegistryUnlocks(current.unlockedHeroes, heroId, level, nextGold, nextRunCount);
    const nextRelics = new Set(current.relics);
    if (nextRunCount >= 1) nextRelics.add('magic-banger');
    if ((level ?? 0) >= 10) nextRelics.add('grim-grimoire');
    if (nextRunCount >= 3) nextRelics.add('milky-way-map');
    const next: PersistedProgress = { ...current, gold: nextGold, totalTokens: current.totalTokens + tokens, runCount: nextRunCount, completedRunIds: [...current.completedRunIds, runId], heroRecords, unlockedHeroes: nextUnlocked, relics: [...nextRelics] };
    await this.save(next);
    return next;
  }
}
