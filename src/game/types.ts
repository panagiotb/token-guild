import type { Accuracy, TelemetrySource } from '../shared/types';
import type { IBatteryState, ITokenTelemetryBatch } from '../shared/battery';

export type HeroId = 'warrior' | 'wizard' | 'rogue' | 'ranger' | 'paladin' | 'necromancer';
export type RunPhase = 'dungeon' | 'level-up' | 'revival' | 'summary';
export type RunOutcome = 'victory' | 'defeat';
/** Stable reason shown in the end-of-run presentation. */
export type RunCompletionReason = 'stage-timer' | 'final-threat' | 'boss-defeat' | 'revival-choice' | 'defeat';
export type PickupKind = 'xp-shard' | 'xp-crystal' | 'xp-orb' | 'token-core' | 'gold-chest' | 'gold-coin' | 'gold-sack' | 'gold-hoard' | 'light-source' | 'mana-roast' | 'mana-magnet' | 'chrono-stasis' | 'arcane-cleanser';
export type WeaponPattern = 'targeted' | 'fan' | 'boomerang' | 'orbit' | 'pool' | 'slash' | 'ricochet' | 'aura' | 'bone';
/** How an authored weapon chooses its launch direction before applying its
 * pattern. Targeting is the safe legacy default; facing preserves directional
 * weapons such as Broadsword and Throwing Daggers. */
export type WeaponAim = 'target' | 'facing' | 'random';
export type EnemyMovementPattern = 'chase' | 'wavy';

export interface InputSnapshot {
  readonly up: boolean;
  readonly down: boolean;
  readonly left: boolean;
  readonly right: boolean;
}

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
  /** Optional per-rank interval between additional projectiles. When absent,
   * the weapon-level interval is used. */
  projectileInterval?: number;
}

export interface WeaponState {
  id: string;
  level: number;
  cooldownRemaining: number;
  /** Remaining shots in an authored sequential volley. Legacy checkpoints
   * may omit this field and therefore have no queued shots. */
  pendingShots?: number;
  /** Time until the next shot in a sequential volley. */
  shotIntervalRemaining?: number;
  /** Shared launch direction for a queued fan volley. Keeping this in the
   * domain state means a paused/restored Axe-family volley cannot silently
   * reroll its arc. */
  pendingVolleyAngle?: number;
  /** Authored Amount used to reconstruct the stable fan offset at release. */
  pendingVolleyTotal?: number;
  /** Garlic-like aura attacks remember each target's hit cooldown even when
   * that target briefly leaves the radius. Optional for legacy checkpoints. */
  auraHitCooldowns?: Record<string, number>;
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
  /** Remaining per-target hitbox delay for persistent ricochet projectiles.
   * Optional so older checkpoints remain migratable. */
  hitCooldowns?: Record<string, number>;
  /** Boomerang weapons retain their launch origin and return phase so a
   * paused/restored projectile cannot silently change direction. */
  boomerangOriginX?: number;
  boomerangOriginY?: number;
  boomerangReturning?: boolean;
  /** Orbiting weapons keep their angular position and radius in the domain
   * so camera movement, pause, and checkpoints cannot desync the ring. */
  orbitAngle?: number;
  orbitRadius?: number;
  orbitAngularSpeed?: number;
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
  /** Fraction of weapon knockback ignored by elites/bosses. */
  knockbackResistance?: number;
  isBoss: boolean;
  isElite: boolean;
  /** True only for the stage-owned end-threat sequence. */
  isFinaleThreat?: boolean;
  /** Finale threat invulnerability is content-owned, not inferred from an ID. */
  isInvulnerable?: boolean;
  /** Authored movement family. Older restored runs default to straight chase. */
  movementPattern?: EnemyMovementPattern;
  /** Stable phase used by deterministic non-linear movement families. */
  movementPhase?: number;
  frozenRemaining?: number;
  /** Remaining duration of the brief reverse-movement knockback reaction. */
  knockbackRemaining?: number;
  /** Unit direction away from the damaging source while knocked back. */
  knockbackDirectionX?: number;
  knockbackDirectionY?: number;
  /** World-units-per-second knockback movement, after resistance. */
  knockbackSpeed?: number;
}

export type GoldSource = 'enemyKills' | 'eliteDrops' | 'bossChest' | 'lightSources' | 'stageCompletion' | 'levelUp';

export interface PickupState {
  id: number;
  kind: PickupKind;
  x: number;
  y: number;
  value: number;
  /** Gold drops retain their owning source so collection cannot accidentally
   * attribute a light-source drop to an elite kill (or vice versa). */
  goldSource?: GoldSource;
}

export interface LightSourceState {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
}

/** Host-owned, gameplay-neutral presentation state. Effects are persisted in
 * snapshots so a reconnect cannot lose or invent a combat cue. They never
 * participate in collision, rewards, or progression. */
export interface VisualEffectState {
  kind: 'explosion';
  x: number;
  y: number;
  radius: number;
  durationSeconds: number;
  remainingSeconds: number;
}

export interface UpgradeCard {
  id: string;
  label: string;
  kind: 'weapon' | 'new-weapon' | 'passive' | 'new-passive' | 'heal' | 'gold';
  target: string;
}

export interface GoldBreakdown {
  readonly enemyKills: number;
  readonly eliteDrops?: number;
  readonly bossChest: number;
  readonly overflow: number;
  readonly lightSources?: number;
  readonly stageCompletion?: number;
  readonly levelUp?: number;
}

/** Sum all source-owned gold, including optional legacy fields from older
 * summaries. Keeping this in the domain model prevents UI/export code from
 * silently omitting a newly introduced ledger bucket. */
export function goldBreakdownTotal(breakdown: GoldBreakdown): number {
  return breakdown.enemyKills
    + (breakdown.eliteDrops ?? 0)
    + breakdown.bossChest
    + breakdown.overflow
    + (breakdown.lightSources ?? 0)
    + (breakdown.stageCompletion ?? 0)
    + (breakdown.levelUp ?? 0);
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
  tokenLedger?: Readonly<Record<TelemetrySource, TokenSourceLedger>>;
  gold: number;
  goldBreakdown: GoldBreakdown;
  enemiesSpawned: number;
  enemiesDefeated: number;
  damageByWeapon: Readonly<Record<string, number>>;
  upgrades: readonly string[];
  treasureRewards?: readonly string[];
  /** End-state accounting is optional for compatibility with older saved summaries. */
  revivalsUsed?: number;
  revivalsRemaining?: number;
  /** Transparent basis for the stage-completion reward; the gold ledger keeps
   * the Greed-adjusted total in `goldBreakdown.stageCompletion`. */
  stageRewardBasis?: { baseGold: number; unusedRevivalCharges: number; finaleRevivalCharges: number; finaleRevivalBonus?: number };
  stageFinaleStarted?: boolean;
  completionReason?: RunCompletionReason;
  stageFinaleDurationSeconds?: number;
  finaleThreatsSpawned?: number;
}

export interface TokenSourceLedger {
  outputTokens: number;
  inputTokens: number;
  cacheTokens: number;
  events: number;
  exactEvents: number;
  estimatedEvents: number;
}

export interface RunState {
  phase: RunPhase;
  /** Host-owned pause state. This is separate from level-up/revival phases so
   * a paused dungeon can be restored and resumed without advancing time. */
  paused: boolean;
  outcome?: RunOutcome;
  heroId: HeroId;
  stageId: string;
  stageClockScale: number;
  seed: number;
  elapsedSeconds: number;
  /** Accumulated render/input time waiting for the deterministic simulation step. */
  simulationRemainderSeconds: number;
  /** Remaining host-owned chest reward presentation time. While positive the
   * dungeon remains visible, but movement, combat, battery drain, and stage
   * time do not advance. */
  chestPresentationRemaining: number;
  level: number;
  xp: number;
  totalTokens: number;
  gold: number;
  goldBreakdown: { enemyKills: number; eliteDrops: number; bossChest: number; overflow: number; lightSources: number; stageCompletion: number; levelUp: number };
  tokenSource: TelemetrySource;
  tokenAccuracy: Accuracy;
  tokenLedger: Record<TelemetrySource, TokenSourceLedger>;
  nextEntityId: number;
  hero: { x: number; y: number; stats: CombatStats; baseStats: CombatStats; invulnerabilityRemaining: number; facingX?: number; facingY?: number };
  weapons: WeaponState[];
  passives: Record<string, number>;
  upgradeHistory: string[];
  enemies: EnemyState[];
  projectiles: ProjectileState[];
  lightSources: LightSourceState[];
  pickups: PickupState[];
  /** Bounded transient presentation effects; optional for legacy snapshots. */
  visualEffects?: VisualEffectState[];
  /** Bounded identity ledger for collection-owned pickup effects. Legacy
   * checkpoints may omit it and are migrated to an empty ledger. */
  collectedPickupIds: number[];
  pendingCards: UpgradeCard[];
  pendingLevelUps: number;
  /** Runtime charges remaining for revival. This is intentionally separate from
   * derived combat stats so recalculating stats cannot restore a spent charge. */
  revivalsRemaining: number;
  /** Number of explicit revival choices accepted during this run. */
  revivalsUsed: number;
  rerollsRemaining: number;
  skipsRemaining: number;
  banishesRemaining: number;
  bannedUpgradeIds: string[];
  enemiesSpawned: number;
  enemiesDefeated: number;
  bossSpawned: boolean;
  stageFinaleStarted: boolean;
  /** Simulation time at which the final-threat sequence became visible. */
  stageFinaleStartedAt?: number;
  /** Absolute simulation deadline for the bounded final-threat window. */
  stageFinaleDeadline?: number;
  /** Number of final threats created during this stage's end sequence. */
  finaleThreatsSpawned: number;
  waveSpawnCounts: Record<string, number>;
  bossRewardClaimed: boolean;
  claimedChestIds: number[];
  /** Rewards are keyed by chest entity id so duplicate collection can never
   * replay the most recently opened chest's reward. */
  chestRewards: Record<string, string[]>;
  /** Gold and tier are persisted by chest identity so re-render/replay cannot
   * roll a different result after the chest has already been claimed. */
  chestGoldRewards: Record<string, number>;
  chestRewardTiers: Record<string, 1 | 3 | 5>;
  stageRewardAwarded: boolean;
  finaleRevivalsUsed: number;
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
