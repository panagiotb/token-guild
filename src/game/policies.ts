/**
 * Named simulation budgets and cadence rules. Keeping these values together
 * gives stage/content work one reviewed policy boundary instead of scattering
 * resource caps through combat, pickups, IPC validation, and the renderer.
 */
import type { CombatStats } from './types';

export const SIMULATION_POLICIES = {
  fixedStepSeconds: 0.01,
  maxStepSeconds: 0.25,
  /** Chest rewards are presented before combat resumes. This is simulation
   * time, not a renderer timer, so host snapshots and replay preserve it. */
  chestPresentationSeconds: 1.5,
  maxChestPresentationSeconds: 5,
  /** Code Dungeon's largest overlapping authored waves total 54 enemies.
   * The maximum currently reachable Curse stack is +200%, so the valid
   * first-stage envelope is 162 active enemies. Keep a bounded 192-entry
   * transport/simulation ceiling so authored density is not truncated while
   * malformed or future state remains resource-bounded. */
  maxEnemies: 192,
  maxSpawnPerStep: 24,
  maxProjectiles: 240,
  /** Safety ceiling for a registry-authored sequential projectile interval. */
  maxWeaponSequenceIntervalSeconds: 10,
  /** Runetracer-like persistent projectiles may hit one target again after
   * this authored delay; the ledger is bounded by the active target envelope. */
  projectileHitboxDelaySeconds: 0.5,
  /** Validation ceiling for registry-owned persistent projectile delays. */
  maxProjectileHitboxDelaySeconds: 5,
  maxProjectileHitCooldownEntries: 70,
  /** Aura hit cooldowns are weapon-owned and bounded by the active enemy
   * envelope. The value is a validation ceiling; each entry uses the
   * effective authored weapon cooldown. */
  maxAuraHitCooldownSeconds: 5,
  maxAuraHitCooldownEntries: 70,
  /** Base-game total Cooldown cannot fall below 10%; this is a gameplay
   * floor, distinct from the detached-state finite-stat safety ceiling. */
  minCooldownMultiplier: 0.1,
  /** Fallback explosion radius for legacy checkpoints that predate the
   * registry-owned weapon explosion multiplier. */
  noFutureExplosionRadiusMultiplier: 1,
  /** Presentation only; effects are bounded and expire in simulation time. */
  visualEffectDurationSeconds: 0.45,
  maxVisualEffects: 64,
  maxXpPickups: 400,
  /** XP condensation is a gameplay cap; this larger envelope also reserves
   * room for uncollected gold, chests, and tactical floor effects so a
   * checkpoint cannot reject a valid long run merely because pickup kinds are
   * mixed. */
  maxPickups: 512,
  /** Base-game gem colors hold up to 2 XP (blue) and 9 XP (green); red
   * contains larger/coalesced values. */
  xpGemBlueMaxValue: 2,
  xpGemGreenMaxValue: 9,
  /** Retain a bounded identity ledger so a malformed/restored pickup cannot
   * be collected repeatedly without allowing long runs to grow snapshots
   * without limit. Entity IDs are never reused by the simulation. */
  maxCollectedPickupIds: 16_384,
  maxLightSources: 10,
  lightSourceMaxHp: 10,
  maxWeaponSlots: 6,
  maxPassiveSlots: 6,
  /** Detached checkpoints must not reintroduce extreme finite stats that can
   * amplify projectile/entity loops or destabilize the renderer. This is a
   * safety envelope, not a gameplay balance cap. */
  maxCombatStatValue: 1000,
  /** Vampire Survivors documents an upper limit of 10 bonus points for
   * character/PowerUp/item Amount. The domain stores a baseline-inclusive
   * value of one, so its corresponding current-stat ceiling is 11. This is
   * the first source-backed gameplay cap; the broader safety ceiling remains
   * separate. */
  maxAmountBonus: 10,
  maxAmountStat: 11,
  /** Source-backed total-stat caps expressed in this domain's bonus units:
   * Might/Area total 1000% => +900% (9), Speed/Duration total 500% => +400%
   * (4). */
  maxMightBonus: 9,
  maxAreaBonus: 9,
  maxSpeedBonus: 4,
  maxDurationBonus: 4,
  /** Armor itself is uncapped, but retaliatory damage gains at most +500%
   * from Armor (the first 50 points at +10% each). */
  maxRetaliatoryArmorBonus: 5
} as const;

export type SimulationPolicies = typeof SIMULATION_POLICIES;

/** Resolve the authoritative validation ceiling for one combat stat. Keeping
 * this in the shared policy module prevents checkpoint and renderer guards
 * from drifting apart as more source-backed caps are added. */
export function maxCombatStatFor(key: keyof CombatStats): number {
  if (key === 'amount') return SIMULATION_POLICIES.maxAmountStat;
  if (key === 'might') return SIMULATION_POLICIES.maxMightBonus;
  if (key === 'area') return SIMULATION_POLICIES.maxAreaBonus;
  if (key === 'speed') return SIMULATION_POLICIES.maxSpeedBonus;
  if (key === 'duration') return SIMULATION_POLICIES.maxDurationBonus;
  return SIMULATION_POLICIES.maxCombatStatValue;
}
