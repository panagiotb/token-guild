import type { Accuracy, TelemetrySource } from '../shared/types';
import type { IBatteryState, ITokenTelemetryBatch } from '../shared/battery';

export type HeroId = 'warrior' | 'wizard' | 'rogue' | 'ranger' | 'paladin' | 'necromancer';
export type RunPhase = 'dungeon' | 'level-up' | 'summary';
export type RunOutcome = 'victory' | 'defeat';
export type PickupKind = 'xp-shard' | 'xp-crystal' | 'xp-orb' | 'token-core' | 'gold-chest' | 'gold-coin' | 'gold-sack' | 'gold-hoard' | 'mana-roast' | 'mana-magnet' | 'chrono-stasis' | 'arcane-cleanser';
export type WeaponPattern = 'targeted' | 'fan' | 'ricochet' | 'aura' | 'bone';

export interface CombatStats {
  hp: number;
  maxHp: number;
  armor: number;
  moveSpeed: number;
  might: number;
  area: number;
  speed: number;
  cooldown: number;
  amount: number;
  magnet: number;
  growth: number;
  duration?: number;
  luck?: number;
  greed?: number;
  curse?: number;
  recovery?: number;
  revival?: number;
}

export interface WeaponLevelStats {
  damage: number;
  cooldown: number;
  amount: number;
  area: number;
  speed: number;
  duration: number;
  pierce: number;
  knockback: number;
}

export interface WeaponState {
  id: string;
  level: number;
  cooldownRemaining: number;
}

export interface ProjectileState {
  id: number;
  weaponId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  area: number;
  remainingPierce: number;
  remainingSeconds: number;
  knockback: number;
  hitEnemyIds: number[];
}

export type EnemyKind = 'syntax_specter' | 'bug_bat' | 'memory_golem' | 'terminal_exit_boss' | 'deprecated_zombie' | 'unused_variable_phantom' | 'infinite_loop_fiend' | 'compiler_hydra' | 'timeout_reaper';

export interface EnemyState {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  isBoss: boolean;
  isElite: boolean;
  frozenRemaining?: number;
}

export interface PickupState {
  id: number;
  kind: PickupKind;
  x: number;
  y: number;
  value: number;
}

export interface UpgradeCard {
  id: string;
  label: string;
  kind: 'weapon' | 'new-weapon' | 'passive' | 'new-passive' | 'heal';
  target: string;
}

export interface GoldBreakdown {
  readonly enemyKills: number;
  readonly bossChest: number;
  readonly overflow: number;
}

export interface RunSummary {
  outcome: RunOutcome;
  heroId: HeroId;
  heroName: string;
  level: number;
  elapsedSeconds: number;
  tokens: number;
  tokenSource: TelemetrySource;
  tokenAccuracy: Accuracy;
  gold: number;
  goldBreakdown: GoldBreakdown;
  enemiesSpawned: number;
  enemiesDefeated: number;
  damageByWeapon: Readonly<Record<string, number>>;
  upgrades: readonly string[];
  treasureRewards?: readonly string[];
}

export interface RunState {
  phase: RunPhase;
  outcome?: RunOutcome;
  heroId: HeroId;
  stageId: string;
  stageClockScale: number;
  seed: number;
  elapsedSeconds: number;
  level: number;
  xp: number;
  totalTokens: number;
  gold: number;
  goldBreakdown: { enemyKills: number; bossChest: number; overflow: number };
  tokenSource: TelemetrySource;
  tokenAccuracy: Accuracy;
  nextEntityId: number;
  hero: { x: number; y: number; stats: CombatStats; baseStats: CombatStats; invulnerabilityRemaining: number };
  weapons: WeaponState[];
  passives: Record<string, number>;
  upgradeHistory: string[];
  enemies: EnemyState[];
  projectiles: ProjectileState[];
  pickups: PickupState[];
  pendingCards: UpgradeCard[];
  pendingLevelUps: number;
  rerollsRemaining: number;
  skipsRemaining: number;
  banishesRemaining: number;
  bannedUpgradeIds: string[];
  enemiesSpawned: number;
  enemiesDefeated: number;
  bossSpawned: boolean;
  stageFinaleStarted: boolean;
  waveSpawnCounts: Record<string, number>;
  bossRewardClaimed: boolean;
  damageByWeapon: Record<string, number>;
  treasureHistory: string[];
  metaUpgrades: Record<string, number>;
  summary?: RunSummary;
  battery: IBatteryState;
  batteryCharging: boolean;
  pendingTelemetry: ITokenTelemetryBatch;
}

export interface TokenInput {
  readonly source?: TelemetrySource;
  readonly accuracy?: Accuracy;
  readonly count: number;
  readonly tokensPerSecond: number;
  readonly outputTokens?: number;
  readonly inputTokens?: number;
  readonly cacheTokens?: number;
  readonly isAgentActive?: boolean;
}
