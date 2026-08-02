import type { CombatStats, EnemyMovementPattern, PickupKind, WeaponAim, WeaponLevelStats, WeaponPattern } from './types';
import { SIMULATION_POLICIES } from './policies';

export interface RegistryClass {
  id: string;
  name: string;
  startingWeaponId: string;
  baseStats: CombatStats;
  passive: { stat: string; valuePerLevel: number; intervalLevels: number; maxBonus: number };
  unlock?: RegistryUnlockCondition;
}

export type RegistryUnlockMetric = 'hero-level' | 'gold' | 'run-count';

export interface RegistryUnlockCondition {
  metric: RegistryUnlockMetric;
  threshold: number;
  heroId?: string;
  description: string;
}

export interface RegistryWeapon {
  id: string;
  name: string;
  /** Source item-pool weight used by level-up and treasure selection. */
  rarityWeight: number;
  damage: number;
  cooldown: number;
  maxLevel: number;
  pattern: WeaponPattern;
  aim: WeaponAim;
  /** Some base-game weapon families deliberately ignore projectile-stat
   * modifiers. Keeping these as registry-owned flags avoids weapon-ID checks
   * in the simulation and makes the exception explicit in content data. */
  ignoreSpeed: boolean;
  ignoreDuration: boolean;
  /** Optional authored interval between additional projectiles. A value of
   * zero means the weapon fires its volley immediately. */
  projectileInterval: number;
  /** Maximum number of persistent floor zones owned by this weapon. */
  poolLimit?: number;
  /** Per-target hitbox delay for persistent projectiles such as floor pools. */
  projectileHitboxDelaySeconds?: number;
  /** Optional authored area explosion behavior for persistent projectiles.
   * Keeping this in content data prevents evolved-weapon effects from being
   * inferred from an ID in the simulation. */
  explosion?: RegistryWeaponExplosion;
  levels: WeaponLevelStats[];
  evolution?: { passiveId: string; resultId: string };
}

export interface RegistryWeaponExplosion {
  onBounce: boolean;
  onContact: boolean;
  radiusMultiplier: number;
  /** Additive retaliatory-explosion damage bonus per point of Armor. */
  retaliatoryArmorBonusPerPoint: number;
}

export interface RegistryPassive {
  id: string;
  name: string;
  /** Source item-pool weight used by level-up and treasure selection. */
  rarityWeight: number;
  stat: string;
  valuePerLevel: number;
  maxLevel: number;
  /** Optional authored per-level effects for passives whose effect changes
   * across ranks (for example Omni followed by a final Curse rank). */
  levelEffects?: readonly (readonly RegistryPassiveEffect[])[];
}

export interface RegistryPassiveEffect {
  stat: string;
  value: number;
}

export interface RegistryEnemy {
  id: string;
  name: string;
  maxHp: number;
  speed: number;
  damage: number;
  xp: number;
  isElite: boolean;
  isBoss: boolean;
  movementPattern: EnemyMovementPattern;
}

export interface RegistryWave {
  id: string;
  fromSecond: number;
  untilSecond: number;
  enemy: string;
  spawnEverySeconds: number;
  minimumAlive: number;
  maximumAlive: number;
}

export interface RegistryStageSpawnPolicy {
  enemyInnerRadius: number;
  enemyOuterRadius: number;
  bossRadius: number;
  lightSourceInnerRadius: number;
  lightSourceOuterRadius: number;
  enemyPersistenceRadius: number;
}

export interface RegistryStageScaling {
  healthPerMinute: number;
  damagePerMinute: number;
  speedPerMinute: number;
}

export interface RegistryStageFinale {
  graceSeconds: number;
  threatIntervalSeconds: number;
  clearRegularEnemies: boolean;
  invulnerableThreat: boolean;
}

export interface RegistryStageCombat {
  contactRadius: number;
  contactInvulnerabilitySeconds: number;
}

export interface RegistryStage {
  id: string;
  name: string;
  durationSeconds: number;
  boss: string;
  topology: 'open' | 'corridor' | 'bounded';
  modifiers: string[];
  spawnPolicy: RegistryStageSpawnPolicy;
  scaling: RegistryStageScaling;
  combat: RegistryStageCombat;
  finale: RegistryStageFinale;
  dropTableId: string;
  waves: RegistryWave[];
}

export interface RegistryLightSourceDrop {
  kind: PickupKind;
  value: number;
  weight: number;
  minLevel: number;
  luckScaled: boolean;
}

export interface RegistryEliteDrop {
  kind: PickupKind;
  weight: number;
  valueMultiplier: number;
  minLevel: number;
  luckScaled: boolean;
}

/** Stage-owned treasure quality contract. `fiveItemChance` and
 * `threeItemChance` are the base checks for level-3 and level-2 treasure;
 * total Luck multiplies each check and the table's base tier is the fallback
 * when both checks fail. Keeping these values in the drop table prevents a
 * global chest rule from silently leaking into later stages. */
export interface RegistryChestRules {
  baseTier: 1 | 3 | 5;
  fiveItemChance: number;
  threeItemChance: number;
}

export interface RegistryDropTable {
  id: string;
  eliteDropChance: number;
  lightSourceSpawnChance: number;
  lightSourceMaxSpawnChance: number;
  lightSources: RegistryLightSourceDrop[];
  elite: RegistryEliteDrop[];
  chest: RegistryChestRules;
}

export interface RegistryDrops {
  tables: RegistryDropTable[];
}

const WEAPON_PATTERNS: readonly WeaponPattern[] = ['targeted', 'fan', 'boomerang', 'orbit', 'pool', 'slash', 'ricochet', 'aura', 'bone'];
const WEAPON_AIMS: readonly WeaponAim[] = ['target', 'facing', 'random'];
const ENEMY_MOVEMENT_PATTERNS: readonly EnemyMovementPattern[] = ['chase', 'wavy'];
const STAGE_TOPOLOGIES = ['open', 'corridor', 'bounded'] as const;
const PICKUP_KINDS: readonly PickupKind[] = ['xp-shard', 'xp-crystal', 'xp-orb', 'token-core', 'gold-chest', 'gold-coin', 'gold-sack', 'gold-hoard', 'light-source', 'mana-roast', 'mana-magnet', 'chrono-stasis', 'arcane-cleanser'];
const STAT_KEYS: readonly (keyof CombatStats)[] = ['hp', 'maxHp', 'armor', 'moveSpeed', 'might', 'area', 'speed', 'cooldown', 'amount', 'magnet', 'growth', 'duration', 'luck', 'greed', 'curse', 'recovery', 'revival'];
/** Stats that a class trait or passive may authoritatively modify. Raw HP and
 * maxHp are runtime values; max-health modifiers use the explicit
 * `maxHealth` capability instead. */
const CAPABILITY_STAT_KEYS = new Set<string>(['might', 'armor', 'maxHealth', 'recovery', 'cooldown', 'area', 'speed', 'duration', 'amount', 'moveSpeed', 'magnet', 'luck', 'growth', 'greed', 'curse', 'revival', 'allStats']);
const UNLOCK_METRICS: readonly RegistryUnlockMetric[] = ['hero-level', 'gold', 'run-count'];

const DEFAULT_STAGE_SPAWN_POLICY: RegistryStageSpawnPolicy = {
  enemyInnerRadius: 215,
  enemyOuterRadius: 265,
  bossRadius: 235,
  lightSourceInnerRadius: 230,
  lightSourceOuterRadius: 290,
  enemyPersistenceRadius: 720
};
const DEFAULT_STAGE_SCALING: RegistryStageScaling = { healthPerMinute: 0.03, damagePerMinute: 0.02, speedPerMinute: 0.01 };
const DEFAULT_STAGE_COMBAT: RegistryStageCombat = { contactRadius: 8, contactInvulnerabilitySeconds: 0.5 };
const DEFAULT_STAGE_FINALE: RegistryStageFinale = { graceSeconds: 60, threatIntervalSeconds: 60, clearRegularEnemies: true, invulnerableThreat: true };

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function stringField(value: Record<string, unknown>, key: string, label: string): string {
  if (typeof value[key] !== 'string' || value[key].length === 0 || value[key].length > 64) throw new Error(`${label}.${key} is invalid`);
  return value[key];
}

function numberField(value: Record<string, unknown>, key: string, label: string, minimum = 0): number {
  if (typeof value[key] !== 'number' || !Number.isFinite(value[key]) || value[key] < minimum) throw new Error(`${label}.${key} is invalid`);
  return value[key];
}

function booleanField(value: Record<string, unknown>, key: string, label: string): boolean {
  if (typeof value[key] !== 'boolean') throw new Error(`${label}.${key} is invalid`);
  return value[key] as boolean;
}

function weaponExplosion(value: unknown, label: string): RegistryWeaponExplosion | undefined {
  if (value === undefined) return undefined;
  const source = record(value, `${label}.explosion`);
  const explosion = {
    onBounce: booleanField(source, 'onBounce', `${label}.explosion`),
    onContact: booleanField(source, 'onContact', `${label}.explosion`),
    radiusMultiplier: numberField(source, 'radiusMultiplier', `${label}.explosion`),
    // Legacy checkpoints/content fixtures predate the Armor-scaled
    // retaliation field. Treat omission as the neutral multiplier while
    // rejecting malformed values when the field is present.
    retaliatoryArmorBonusPerPoint: source.retaliatoryArmorBonusPerPoint === undefined
      ? 0
      : numberField(source, 'retaliatoryArmorBonusPerPoint', `${label}.explosion`, 0)
  } satisfies RegistryWeaponExplosion;
  if (explosion.radiusMultiplier <= 0 || explosion.radiusMultiplier > 10) throw new Error(`${label}.explosion.radiusMultiplier is invalid`);
  if (explosion.retaliatoryArmorBonusPerPoint > 1) throw new Error(`${label}.explosion.retaliatoryArmorBonusPerPoint is invalid`);
  if (!explosion.onBounce && !explosion.onContact) throw new Error(`${label}.explosion must have a trigger`);
  return explosion;
}

function capabilityStatField(value: Record<string, unknown>, key: string, label: string): string {
  const stat = stringField(value, key, label);
  if (!CAPABILITY_STAT_KEYS.has(stat)) throw new Error(`${label}.${key} is invalid`);
  return stat;
}

function classUnlock(value: unknown, label: string): RegistryUnlockCondition | undefined {
  if (value === undefined) return undefined;
  const source = record(value, `${label}.unlock`);
  const metric = stringField(source, 'metric', `${label}.unlock`);
  if (!UNLOCK_METRICS.includes(metric as RegistryUnlockMetric)) throw new Error(`${label}.unlock.metric is invalid`);
  const threshold = numberField(source, 'threshold', `${label}.unlock`, 1);
  if (!Number.isInteger(threshold)) throw new Error(`${label}.unlock.threshold is invalid`);
  const heroId = source.heroId === undefined ? undefined : stringField(source, 'heroId', `${label}.unlock`);
  const description = source.description === undefined
    ? metric === 'gold' ? `Reach ${threshold} Guild gold` : metric === 'run-count' ? `Complete ${threshold} runs` : `Reach Level ${threshold}${heroId ? ` with ${heroId}` : ''}`
    : stringField(source, 'description', `${label}.unlock`);
  return { metric: metric as RegistryUnlockMetric, threshold, ...(heroId === undefined ? {} : { heroId }), description };
}

function passiveLevelEffects(value: unknown, maxLevel: number, label: string): readonly (readonly RegistryPassiveEffect[])[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length !== maxLevel) throw new Error(`${label}.levelEffects must contain maxLevel entries`);
  return value.map((rawLevel, levelIndex) => {
    if (!Array.isArray(rawLevel) || rawLevel.length === 0) throw new Error(`${label}.levelEffects[${levelIndex}] is invalid`);
    return rawLevel.map((rawEffect, effectIndex) => {
      const effect = record(rawEffect, `${label}.levelEffects[${levelIndex}][${effectIndex}]`);
      return {
        stat: capabilityStatField(effect, 'stat', `${label}.levelEffects[${levelIndex}][${effectIndex}]`),
        value: numberField(effect, 'value', `${label}.levelEffects[${levelIndex}][${effectIndex}]`)
      } satisfies RegistryPassiveEffect;
    });
  });
}

function stageSpawnPolicy(value: unknown, label: string): RegistryStageSpawnPolicy {
  const source: Record<string, unknown> = value === undefined ? { ...DEFAULT_STAGE_SPAWN_POLICY } : record(value, `${label}.spawnPolicy`);
  const policy = {
    enemyInnerRadius: numberField(source, 'enemyInnerRadius', `${label}.spawnPolicy`, 1),
    enemyOuterRadius: numberField(source, 'enemyOuterRadius', `${label}.spawnPolicy`, 1),
    bossRadius: numberField(source, 'bossRadius', `${label}.spawnPolicy`, 1),
    lightSourceInnerRadius: numberField(source, 'lightSourceInnerRadius', `${label}.spawnPolicy`, 1),
    lightSourceOuterRadius: numberField(source, 'lightSourceOuterRadius', `${label}.spawnPolicy`, 1),
    enemyPersistenceRadius: numberField(source, 'enemyPersistenceRadius', `${label}.spawnPolicy`, 1)
  } satisfies RegistryStageSpawnPolicy;
  if (policy.enemyOuterRadius < policy.enemyInnerRadius || policy.lightSourceOuterRadius < policy.lightSourceInnerRadius || policy.enemyPersistenceRadius <= policy.enemyOuterRadius) throw new Error(`${label}.spawnPolicy radii are invalid`);
  return policy;
}

function stageScaling(value: unknown, label: string): RegistryStageScaling {
  const source: Record<string, unknown> = value === undefined ? { ...DEFAULT_STAGE_SCALING } : record(value, `${label}.scaling`);
  const scaling = {
    healthPerMinute: numberField(source, 'healthPerMinute', `${label}.scaling`),
    damagePerMinute: numberField(source, 'damagePerMinute', `${label}.scaling`),
    speedPerMinute: numberField(source, 'speedPerMinute', `${label}.scaling`)
  } satisfies RegistryStageScaling;
  if (scaling.healthPerMinute > 10 || scaling.damagePerMinute > 10 || scaling.speedPerMinute > 10) throw new Error(`${label}.scaling is too large`);
  return scaling;
}

function stageFinale(value: unknown, label: string): RegistryStageFinale {
  const source: Record<string, unknown> = value === undefined ? { ...DEFAULT_STAGE_FINALE } : record(value, `${label}.finale`);
  return {
    graceSeconds: numberField(source, 'graceSeconds', `${label}.finale`, 1),
    threatIntervalSeconds: numberField(source, 'threatIntervalSeconds', `${label}.finale`, 1),
    clearRegularEnemies: source.clearRegularEnemies === undefined ? DEFAULT_STAGE_FINALE.clearRegularEnemies : booleanField(source, 'clearRegularEnemies', `${label}.finale`),
    invulnerableThreat: source.invulnerableThreat === undefined ? DEFAULT_STAGE_FINALE.invulnerableThreat : booleanField(source, 'invulnerableThreat', `${label}.finale`)
  };
}

function stageCombat(value: unknown, label: string): RegistryStageCombat {
  const source: Record<string, unknown> = value === undefined ? { ...DEFAULT_STAGE_COMBAT } : record(value, `${label}.combat`);
  const combat = {
    contactRadius: numberField(source, 'contactRadius', `${label}.combat`, 0.1),
    contactInvulnerabilitySeconds: numberField(source, 'contactInvulnerabilitySeconds', `${label}.combat`, 0)
  } satisfies RegistryStageCombat;
  if (combat.contactRadius > 100 || combat.contactInvulnerabilitySeconds > 10) throw new Error(`${label}.combat is too large`);
  return combat;
}

function pickupKindField(value: Record<string, unknown>, key: string, label: string): PickupKind {
  const kind = stringField(value, key, label);
  if (!PICKUP_KINDS.includes(kind as PickupKind)) throw new Error(`${label}.${key} is invalid`);
  return kind as PickupKind;
}

function parseDropTable(value: unknown, label: string, fallbackId: string): RegistryDropTable {
  const source = record(value, label);
  const id = source.id === undefined ? fallbackId : stringField(source, 'id', label);
  const lightSources = source.lightSources === undefined ? [] : source.lightSources;
  const elite = source.elite === undefined ? [] : source.elite;
  if (!Array.isArray(lightSources) || !Array.isArray(elite)) throw new Error('drops tables must be arrays');
  const parsedLightSources = lightSources.map((raw, index) => {
    const entry = record(raw, `${label}.lightSources[${index}]`);
    return {
      kind: pickupKindField(entry, 'kind', `${label}.lightSources[${index}]`),
      value: numberField(entry, 'value', `${label}.lightSources[${index}]`),
      weight: numberField(entry, 'weight', `${label}.lightSources[${index}]`, Number.EPSILON),
      minLevel: numberField(entry, 'minLevel', `${label}.lightSources[${index}]`, 1),
      luckScaled: booleanField(entry, 'luckScaled', `${label}.lightSources[${index}]`)
    } satisfies RegistryLightSourceDrop;
  });
  const parsedElite = elite.map((raw, index) => {
    const entry = record(raw, `${label}.elite[${index}]`);
    return {
      kind: pickupKindField(entry, 'kind', `${label}.elite[${index}]`),
      weight: numberField(entry, 'weight', `${label}.elite[${index}]`, Number.EPSILON),
      valueMultiplier: numberField(entry, 'valueMultiplier', `${label}.elite[${index}]`),
      minLevel: numberField(entry, 'minLevel', `${label}.elite[${index}]`, 1),
      luckScaled: booleanField(entry, 'luckScaled', `${label}.elite[${index}]`)
    } satisfies RegistryEliteDrop;
  });
  const eliteDropChance = numberField(source, 'eliteDropChance', label);
  if (eliteDropChance > 1) throw new Error(`${label}.eliteDropChance is invalid`);
  const lightSourceSpawnChance = source.lightSourceSpawnChance === undefined ? 0.1 : numberField(source, 'lightSourceSpawnChance', label, Number.EPSILON);
  const lightSourceMaxSpawnChance = source.lightSourceMaxSpawnChance === undefined ? 0.5 : numberField(source, 'lightSourceMaxSpawnChance', label, Number.EPSILON);
  if (lightSourceSpawnChance > 1 || lightSourceMaxSpawnChance > 1 || lightSourceMaxSpawnChance < lightSourceSpawnChance) throw new Error(`${label}.light-source spawn chances are invalid`);
  const rawChest = source.chest === undefined ? {} : record(source.chest, `${label}.chest`);
  const baseTierValue = rawChest.baseTier === undefined ? 1 : numberField(rawChest, 'baseTier', `${label}.chest`, 1);
  if (baseTierValue !== 1 && baseTierValue !== 3 && baseTierValue !== 5) throw new Error(`${label}.chest.baseTier is invalid`);
  const chest = {
    baseTier: baseTierValue as RegistryChestRules['baseTier'],
    fiveItemChance: rawChest.fiveItemChance === undefined ? 0 : numberField(rawChest, 'fiveItemChance', `${label}.chest`),
    threeItemChance: rawChest.threeItemChance === undefined ? 0 : numberField(rawChest, 'threeItemChance', `${label}.chest`)
  } satisfies RegistryChestRules;
  if (chest.fiveItemChance > 1 || chest.threeItemChance > 1) throw new Error(`${label}.chest chances are invalid`);
  unique(parsedLightSources.map((entry) => entry.kind), `${label}.lightSources`);
  unique(parsedElite.map((entry) => entry.kind), `${label}.elite`);
  if (parsedLightSources.length > 0 && parsedLightSources.reduce((sum, entry) => sum + entry.weight, 0) <= 0) throw new Error(`${label}.lightSources has no positive weight`);
  if (parsedElite.length > 0 && parsedElite.reduce((sum, entry) => sum + entry.weight, 0) <= 0) throw new Error(`${label}.elite has no positive weight`);
  if (parsedLightSources.some((entry) => entry.kind === 'xp-shard' || entry.kind === 'xp-crystal' || entry.kind === 'xp-orb' || entry.kind === 'token-core' || entry.kind === 'gold-chest' || entry.kind === 'light-source')) throw new Error(`${label}.lightSources contains a non-floor-drop kind`);
  if (parsedElite.some((entry) => entry.kind === 'xp-shard' || entry.kind === 'xp-crystal' || entry.kind === 'xp-orb' || entry.kind === 'token-core' || entry.kind === 'gold-chest' || entry.kind === 'light-source')) throw new Error(`${label}.elite contains a non-elite-drop kind`);
  return { id, eliteDropChance, lightSourceSpawnChance, lightSourceMaxSpawnChance, lightSources: parsedLightSources, elite: parsedElite, chest };
}

function registryDrops(value: unknown): RegistryDrops {
  const source = record(value, 'drops');
  const tables = Array.isArray(source.tables)
    ? source.tables.map((table, index) => parseDropTable(table, `drops.tables[${index}]`, `${index}`))
    : [parseDropTable(source, 'drops', 'code-dungeon')];
  unique(tables.map((table) => table.id), 'drops.tables');
  return { tables };
}

function unique(ids: string[], label: string): void {
  if (new Set(ids).size !== ids.length) throw new Error(`${label} contains duplicate IDs`);
}

function combatStats(value: unknown, label: string): CombatStats {
  const source = record(value, label);
  const stats = {} as CombatStats;
  for (const key of STAT_KEYS) stats[key] = numberField(source, key, `${label}.${key}`);
  return stats;
}

function weaponLevel(value: unknown, label: string): WeaponLevelStats {
  const source = record(value, label);
  const projectileInterval = source.projectileInterval === undefined ? undefined : numberField(source, 'projectileInterval', label);
  if (projectileInterval !== undefined && projectileInterval > SIMULATION_POLICIES.maxWeaponSequenceIntervalSeconds) throw new Error(`${label}.projectileInterval is invalid`);
  return {
    damage: numberField(source, 'damage', label),
    cooldown: numberField(source, 'cooldown', label),
    amount: numberField(source, 'amount', label, 1),
    area: numberField(source, 'area', label),
    speed: numberField(source, 'speed', label),
    duration: numberField(source, 'duration', label),
    pierce: numberField(source, 'pierce', label),
    knockback: numberField(source, 'knockback', label),
    ...(projectileInterval === undefined ? {} : { projectileInterval })
  };
}

function legacyLevels(value: Record<string, unknown>, label: string, maxLevel: number): WeaponLevelStats[] {
  const damage = numberField(value, 'damage', label);
  const cooldown = numberField(value, 'cooldown', label);
  return Array.from({ length: maxLevel }, () => ({ damage, cooldown, amount: 1, area: 1, speed: 1, duration: 1, pierce: 0, knockback: 0 }));
}

export function loadMvpRegistry(input: { classes: unknown; weapons: unknown; passives: unknown; stages: unknown; enemies?: unknown; drops?: unknown }): { classes: RegistryClass[]; weapons: RegistryWeapon[]; passives: RegistryPassive[]; stages: RegistryStage[]; enemies: RegistryEnemy[]; drops: RegistryDrops } {
  if (!Array.isArray(input.classes) || !Array.isArray(input.weapons) || !Array.isArray(input.passives) || !Array.isArray(input.stages)) throw new Error('All MVP registries must be arrays');
  const classes = input.classes.map((raw, index) => {
    const value = record(raw, `classes[${index}]`);
    const passive = record(value.passive, `classes[${index}].passive`);
    const unlock = classUnlock(value.unlock, `classes[${index}]`);
    const fallbackStats: CombatStats = { hp: 100, maxHp: 100, armor: 0, moveSpeed: 40, might: 0, area: 0, speed: 0, cooldown: 0, amount: 1, magnet: 30, growth: 0, duration: 0, luck: 0, greed: 0, curse: 0, recovery: 0, revival: 0 };
    return {
      id: stringField(value, 'id', `classes[${index}]`),
      name: stringField(value, 'name', `classes[${index}]`),
      startingWeaponId: stringField(value, 'startingWeaponId', `classes[${index}]`),
      baseStats: value.baseStats === undefined ? fallbackStats : combatStats(value.baseStats, `classes[${index}].baseStats`),
      passive: {
        stat: capabilityStatField(passive, 'stat', `classes[${index}].passive`),
        valuePerLevel: numberField(passive, 'valuePerLevel', `classes[${index}].passive`),
        intervalLevels: numberField(passive, 'intervalLevels', `classes[${index}].passive`, 1),
        maxBonus: numberField(passive, 'maxBonus', `classes[${index}].passive`)
      },
      ...(unlock === undefined ? {} : { unlock })
    };
  });
  const weapons = input.weapons.map((raw, index) => {
    const value = record(raw, `weapons[${index}]`);
    const maxLevel = numberField(value, 'maxLevel', `weapons[${index}]`, 1);
    const levels = value.levels === undefined ? legacyLevels(value, `weapons[${index}]`, maxLevel) : (() => {
      if (!Array.isArray(value.levels) || value.levels.length !== maxLevel) throw new Error(`weapons[${index}].levels must contain maxLevel entries`);
      return value.levels.map((entry, levelIndex) => weaponLevel(entry, `weapons[${index}].levels[${levelIndex}]`));
    })();
    const pattern = value.pattern === undefined ? 'targeted' : stringField(value, 'pattern', `weapons[${index}]`);
    if (!WEAPON_PATTERNS.includes(pattern as WeaponPattern)) throw new Error(`weapons[${index}].pattern is invalid`);
    const aim = value.aim === undefined ? 'target' : stringField(value, 'aim', `weapons[${index}]`);
    if (!WEAPON_AIMS.includes(aim as WeaponAim)) throw new Error(`weapons[${index}].aim is invalid`);
    const ignoreSpeed = value.ignoreSpeed === undefined ? false : booleanField(value, 'ignoreSpeed', `weapons[${index}]`);
    const ignoreDuration = value.ignoreDuration === undefined ? false : booleanField(value, 'ignoreDuration', `weapons[${index}]`);
    const projectileInterval = value.projectileInterval === undefined ? 0 : numberField(value, 'projectileInterval', `weapons[${index}]`);
    if (projectileInterval > SIMULATION_POLICIES.maxWeaponSequenceIntervalSeconds) throw new Error(`weapons[${index}].projectileInterval is invalid`);
    const poolLimit = value.poolLimit === undefined ? undefined : numberField(value, 'poolLimit', `weapons[${index}]`, 1);
    if (poolLimit !== undefined && (!Number.isSafeInteger(poolLimit) || poolLimit > SIMULATION_POLICIES.maxProjectiles)) throw new Error(`weapons[${index}].poolLimit is invalid`);
    const projectileHitboxDelaySeconds = value.projectileHitboxDelaySeconds === undefined ? undefined : numberField(value, 'projectileHitboxDelaySeconds', `weapons[${index}]`);
    if (projectileHitboxDelaySeconds !== undefined && projectileHitboxDelaySeconds > SIMULATION_POLICIES.maxProjectileHitboxDelaySeconds) throw new Error(`weapons[${index}].projectileHitboxDelaySeconds is invalid`);
    const explosion = weaponExplosion(value.explosion, `weapons[${index}]`);
    const rarityWeight = value.rarityWeight === undefined ? 1 : numberField(value, 'rarityWeight', `weapons[${index}]`);
    const result: RegistryWeapon = { id: stringField(value, 'id', `weapons[${index}]`), name: stringField(value, 'name', `weapons[${index}]`), rarityWeight, damage: levels[0]?.damage ?? numberField(value, 'damage', `weapons[${index}]`), cooldown: levels[0]?.cooldown ?? numberField(value, 'cooldown', `weapons[${index}]`), maxLevel, pattern: pattern as WeaponPattern, aim: aim as WeaponAim, ignoreSpeed, ignoreDuration, projectileInterval, ...(poolLimit === undefined ? {} : { poolLimit }), ...(projectileHitboxDelaySeconds === undefined ? {} : { projectileHitboxDelaySeconds }), ...(explosion ? { explosion } : {}), levels };
    if (value.evolution !== undefined) {
      const evolution = record(value.evolution, `weapons[${index}].evolution`);
      result.evolution = { passiveId: stringField(evolution, 'passiveId', `weapons[${index}].evolution`), resultId: stringField(evolution, 'resultId', `weapons[${index}].evolution`) };
    }
    return result;
  });
  const passives = input.passives.map((raw, index) => {
    const value = record(raw, `passives[${index}]`);
    const label = `passives[${index}]`;
    const maxLevel = numberField(value, 'maxLevel', label, 1);
    const levelEffects = passiveLevelEffects(value.levelEffects, maxLevel, label);
    const rarityWeight = value.rarityWeight === undefined ? 1 : numberField(value, 'rarityWeight', label);
    return { id: stringField(value, 'id', label), name: stringField(value, 'name', label), rarityWeight, stat: capabilityStatField(value, 'stat', label), valuePerLevel: numberField(value, 'valuePerLevel', label), maxLevel, ...(levelEffects ? { levelEffects } : {}) };
  });
  const rawEnemies = input.enemies ?? [];
  if (!Array.isArray(rawEnemies)) throw new Error('enemies must be an array');
  const enemies = rawEnemies.map((raw, index) => {
    const value = record(raw, `enemies[${index}]`);
    const movementPattern = value.movementPattern === undefined ? 'chase' : stringField(value, 'movementPattern', `enemies[${index}]`);
    if (!ENEMY_MOVEMENT_PATTERNS.includes(movementPattern as EnemyMovementPattern)) throw new Error(`enemies[${index}].movementPattern is invalid`);
    return {
      id: stringField(value, 'id', `enemies[${index}]`),
      name: stringField(value, 'name', `enemies[${index}]`),
      maxHp: numberField(value, 'maxHp', `enemies[${index}]`, 1),
      speed: numberField(value, 'speed', `enemies[${index}]`),
      damage: numberField(value, 'damage', `enemies[${index}]`),
      xp: numberField(value, 'xp', `enemies[${index}]`, 0),
      isElite: value.isElite === true,
      isBoss: value.isBoss === true,
      movementPattern: movementPattern as EnemyMovementPattern
    } satisfies RegistryEnemy;
  });
  const stages = input.stages.map((raw, index) => {
    const value = record(raw, `stages[${index}]`);
    if (!Array.isArray(value.waves)) throw new Error(`stages[${index}].waves must be an array`);
    const waves = value.waves.map((rawWave, waveIndex) => {
      const wave = record(rawWave, `stages[${index}].waves[${waveIndex}]`);
      const fromSecond = numberField(wave, 'fromSecond', `stages[${index}].waves[${waveIndex}]`, 0);
      const untilSecond = wave.untilSecond === undefined ? Number.POSITIVE_INFINITY : numberField(wave, 'untilSecond', `stages[${index}].waves[${waveIndex}]`, fromSecond + 0.1);
      if (untilSecond <= fromSecond) throw new Error(`stages[${index}].waves[${waveIndex}] interval is invalid`);
      return {
        id: typeof wave.id === 'string' && wave.id.length > 0 ? wave.id : `${index}:${waveIndex}`,
        fromSecond,
        untilSecond,
        enemy: stringField(wave, 'enemy', `stages[${index}].waves[${waveIndex}]`),
        spawnEverySeconds: numberField(wave, 'spawnEverySeconds', `stages[${index}].waves[${waveIndex}]`, 0.1),
        minimumAlive: wave.minimumAlive === undefined ? 0 : numberField(wave, 'minimumAlive', `stages[${index}].waves[${waveIndex}]`, 0),
        maximumAlive: wave.maximumAlive === undefined ? 60 : numberField(wave, 'maximumAlive', `stages[${index}].waves[${waveIndex}]`, 1)
      } satisfies RegistryWave;
    });
    unique(waves.map((wave) => wave.id), `stages[${index}].waves`);
    const topology = value.topology === undefined ? 'open' : stringField(value, 'topology', `stages[${index}]`);
    if (!STAGE_TOPOLOGIES.includes(topology as (typeof STAGE_TOPOLOGIES)[number])) throw new Error(`stages[${index}].topology is invalid`);
    const modifiers = value.modifiers === undefined ? [] : value.modifiers;
    if (!Array.isArray(modifiers) || modifiers.some((modifier) => typeof modifier !== 'string' || modifier.length === 0 || modifier.length > 64)) throw new Error(`stages[${index}].modifiers is invalid`);
    const label = `stages[${index}]`;
    const id = stringField(value, 'id', label);
    const dropTableId = value.dropTableId === undefined ? id : stringField(value, 'dropTableId', label);
    return { id, name: stringField(value, 'name', label), durationSeconds: numberField(value, 'durationSeconds', label, 1), boss: stringField(value, 'boss', label), topology: topology as RegistryStage['topology'], modifiers: [...new Set(modifiers)], spawnPolicy: stageSpawnPolicy(value.spawnPolicy, label), scaling: stageScaling(value.scaling, label), combat: stageCombat(value.combat, label), finale: stageFinale(value.finale, label), dropTableId, waves };
  });
  unique(classes.map((entry) => entry.id), 'classes'); unique(weapons.map((entry) => entry.id), 'weapons'); unique(passives.map((entry) => entry.id), 'passives'); unique(stages.map((entry) => entry.id), 'stages'); unique(enemies.map((entry) => entry.id), 'enemies');
  const weaponIds = new Set(weapons.map((entry) => entry.id)); const passiveIds = new Set(passives.map((entry) => entry.id)); const classIds = new Set(classes.map((entry) => entry.id));
  const enemyIds = new Set(enemies.map((entry) => entry.id));
  for (const entry of classes) if (!weaponIds.has(entry.startingWeaponId)) throw new Error(`Class ${entry.id} references missing weapon`);
  for (const entry of classes) if (entry.unlock?.heroId && !classIds.has(entry.unlock.heroId)) throw new Error(`Class ${entry.id} references missing unlock hero`);
  for (const entry of weapons) if (entry.evolution && (!passiveIds.has(entry.evolution.passiveId) || !weaponIds.has(entry.evolution.resultId))) throw new Error(`Weapon ${entry.id} has a broken evolution reference`);
  for (const stage of stages) {
    if (!enemyIds.has(stage.boss)) throw new Error(`Stage ${stage.id} references missing boss`);
    for (const wave of stage.waves) if (!enemyIds.has(wave.enemy)) throw new Error(`Stage ${stage.id} references missing enemy ${wave.enemy}`);
  }
  const drops = registryDrops(input.drops ?? { eliteDropChance: 0, lightSources: [], elite: [] });
  const dropTableIds = new Set(drops.tables.map((table) => table.id));
  for (const stage of stages) if (!dropTableIds.has(stage.dropTableId)) throw new Error(`Stage ${stage.id} references missing drop table ${stage.dropTableId}`);
  return { classes, weapons, passives, stages, enemies, drops };
}
