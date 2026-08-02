import progression from './data/progression.json';
import type { CombatStats } from './types';
import { SIMULATION_POLICIES } from './policies';

/** XP required to move from `level` to `level + 1` in the authored first-stage
 * Vampire Survivors progression contract. The threshold bonuses deliberately
 * apply to the level being left (20 -> 21 and 40 -> 41). */
export function getXpRequiredForLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1) throw new Error('Level must be a positive integer');
  const rules = progression.levelRequirements;
  const base = level <= rules.earlyLastLevel
    ? level * rules.earlyIncrement - 5
    : level <= rules.midLastLevel
      ? level * rules.midIncrement - 6
      : level * rules.lateIncrement - 8;
  const thresholdBonus = level === rules.earlyLastLevel
    ? rules.level20BonusXp
    : level === rules.midLastLevel
      ? rules.level40BonusXp
      : 0;
  return base + thresholdBonus;
}

/** Temporary +100% Growth applied exactly at the documented level thresholds.
 * Recalculation is derived from the current level, so the bonus automatically
 * disappears at levels 21 and 41 without accumulating across upgrades. */
export function getThresholdGrowthBonus(level: number): number {
  if (!Number.isInteger(level) || level < 1) throw new Error('Level must be a positive integer');
  if (level === 20) return progression.thresholds.level20BonusGrowth;
  if (level === 40) return progression.thresholds.level40BonusGrowth;
  return 0;
}

/**
 * Source-backed chance that a level-up roll prefers an item already owned by
 * the player. Vampire Survivors checks this twice per level-up; the first
 * stage uses the same bounded chance for each card selection. `luck` is the
 * additive bonus (0 means the 100% base total Luck), and the level parity
 * term is 30% on odd levels and 60% on even levels.
 */
export function getOwnedItemChoiceChance(level: number, luck: number): number {
  if (!Number.isInteger(level) || level < 1) throw new Error('Level must be a positive integer');
  if (!Number.isFinite(luck) || luck < 0) throw new Error('Luck must be a non-negative finite number');
  const totalLuck = 1 + luck;
  const parityBonus = level % 2 === 0 ? 0.6 : 0.3;
  return Math.min(1, Math.max(0, 1 + parityBonus - 1 / totalLuck));
}

export function calculateDamage(baseDamage: number, stats: CombatStats, tokensPerSecond = 0): number {
  if (!Number.isFinite(baseDamage) || baseDamage < 0) throw new Error('Base damage must be non-negative');
  void tokensPerSecond;
  return Math.max(0, Math.round(baseDamage * (1 + stats.might)));
}

export function calculateCooldown(baseCooldown: number, stats: CombatStats): number {
  // The base-game total Cooldown floor is 10%; the shared policy keeps this
  // rule consistent across weapons, auras, checkpoints, and replay.
  return baseCooldown * Math.max(SIMULATION_POLICIES.minCooldownMultiplier, 1 - stats.cooldown);
}

/** Canonical weapon/passive stat projections. Keeping these conversions in
 * one domain module prevents a new renderer or reward path from inventing a
 * second interpretation of an exposed stat. Values intentionally preserve
 * the current MVP balance until the parity matrix supplies a verified cap. */
export function calculateWeaponAmount(baseAmount: number, stats: CombatStats): number {
  // Weapon levels own their authored projectile count. Amount is the number
  // of additional projectiles above the combat-stat baseline of one, so a
  // weapon that already fires two projectiles becomes three with +1 Amount,
  // not four. Keep the projection integer and fail safe for malformed input.
  const authored = Math.max(0, Number.isFinite(baseAmount) ? baseAmount : 0);
  if (authored < 1) return 1;
  const bonus = Math.max(0, Number.isFinite(stats.amount) ? stats.amount - 1 : 0);
  return Math.max(1, Math.floor(authored + bonus));
}

export function calculateProjectileArea(baseArea: number, stats: CombatStats): number {
  return Math.max(3, Math.max(0, baseArea) * 5 * (1 + Math.max(0, stats.area ?? 0)));
}

export function calculateAuraRadius(baseArea: number, stats: CombatStats): number {
  return Math.max(0, baseArea) * (1 + Math.max(0, stats.area ?? 0));
}

export function calculateProjectileLifetime(baseDuration: number, stats: CombatStats): number {
  return Math.max(0.05, Math.max(0, baseDuration) * (1 + Math.max(0, stats.duration ?? 0)));
}

export function calculateProjectileSpeed(baseSpeed: number, stats: CombatStats): number {
  return Math.max(0, baseSpeed * (1 + (stats.speed ?? 0)));
}

/**
 * Projects the authored healing value of a collected floor pickup through
 * Recovery. Recovery is additive in the base-game contract and is separate
 * from the per-second regeneration tick owned by the simulation loop.
 */
export function calculatePickupHealing(baseHealing: number, stats: CombatStats): number {
  if (!Number.isFinite(baseHealing) || baseHealing < 0) throw new Error('Base healing must be non-negative');
  const recovery = Number.isFinite(stats.recovery) ? Math.max(0, stats.recovery ?? 0) : 0;
  return Math.max(0, baseHealing * (1 + recovery));
}

/**
 * Projects retaliatory damage through Armor. Armor's own stat has no gameplay
 * ceiling, but the retaliatory multiplier is capped by the shared policy so
 * high-value saves cannot turn a special effect into unbounded damage.
 */
export function calculateRetaliatoryDamage(baseDamage: number, armor: number, bonusPerPoint = 0.1, maximumBonus = 5): number {
  if (!Number.isFinite(baseDamage) || baseDamage < 0) throw new Error('Base damage must be non-negative');
  const safeArmor = Number.isFinite(armor) ? Math.max(0, armor) : 0;
  const safeBonusPerPoint = Number.isFinite(bonusPerPoint) ? Math.max(0, bonusPerPoint) : 0;
  const safeMaximumBonus = Number.isFinite(maximumBonus) ? Math.max(0, maximumBonus) : 0;
  return Math.max(0, baseDamage * (1 + Math.min(safeMaximumBonus, safeArmor * safeBonusPerPoint)));
}

/** Applies the stage-owned per-minute enemy pacing curve. */
export function calculateEnemyMoveSpeed(baseSpeed: number, elapsedSeconds: number, speedPerMinute = 0.01): number {
  if (!Number.isFinite(baseSpeed) || baseSpeed < 0) throw new Error('Enemy speed must be non-negative');
  if (!Number.isFinite(speedPerMinute) || speedPerMinute < 0) throw new Error('Enemy speed scaling must be non-negative');
  const safeSeconds = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  return baseSpeed * (1 + minutes * speedPerMinute);
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
