import type { Accuracy, TelemetrySource, TokenStreamEvent } from '../shared/types';

export type HeroId = 'warrior' | 'wizard' | 'rogue' | 'ranger' | 'paladin' | 'necromancer';
export type RunPhase = 'dungeon' | 'level-up' | 'summary';
export type RunOutcome = 'victory' | 'defeat';
export type PickupKind = 'xp-shard' | 'xp-crystal' | 'xp-orb' | 'gold-chest';

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
}

export interface WeaponState {
  id: string;
  level: number;
  cooldownRemaining: number;
}

export interface EnemyState {
  id: number;
  kind: 'syntax_specter' | 'bug_bat' | 'memory_golem' | 'terminal_exit_boss';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  isBoss: boolean;
  isElite: boolean;
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
  kind: 'weapon' | 'passive' | 'heal';
  target: string;
}

export interface GoldBreakdown {
  readonly enemyKills: number;
  readonly bossChest: number;
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
}

export interface RunState {
  phase: RunPhase;
  outcome?: RunOutcome;
  heroId: HeroId;
  seed: number;
  elapsedSeconds: number;
  level: number;
  xp: number;
  totalTokens: number;
  gold: number;
  goldBreakdown: { enemyKills: number; bossChest: number };
  tokenSource: TelemetrySource;
  tokenAccuracy: Accuracy;
  nextEntityId: number;
  hero: { x: number; y: number; stats: CombatStats };
  weapons: WeaponState[];
  passives: Record<string, number>;
  upgradeHistory: string[];
  enemies: EnemyState[];
  pickups: PickupState[];
  pendingCards: UpgradeCard[];
  enemiesSpawned: number;
  enemiesDefeated: number;
  bossSpawned: boolean;
  bossRewardClaimed: boolean;
  powerChargeReady: boolean;
  hazardsTriggered: number;
  damageByWeapon: Record<string, number>;
  summary?: RunSummary;
}

export type TokenInput = Pick<TokenStreamEvent, 'count' | 'tokensPerSecond'>;
