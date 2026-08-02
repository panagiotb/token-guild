import classes from './data/classes.json';
import passives from './data/passives.json';
import stages from './data/stages.json';
import weapons from './data/weapons.json';
import enemies from './data/enemies.json';
import drops from './data/drops.json';
import { loadMvpRegistry, type RegistryClass, type RegistryEnemy, type RegistryPassive, type RegistryPassiveEffect, type RegistryWeapon } from './registry';
import { getXpRequiredForLevel } from './math';

export const MVP_REGISTRY: ReturnType<typeof loadMvpRegistry> = loadMvpRegistry({ classes, weapons, passives, stages, enemies, drops });
/** Compatibility view for callers that render the first 40 authored rows;
 * the simulation itself always resolves the formula for the requested level. */
export const XP_THRESHOLDS: readonly number[] = Object.freeze(Array.from({ length: 40 }, (_, index) => getXpRequiredForLevel(index + 1)));

export function weaponDefinition(id: string): RegistryWeapon | undefined {
  return MVP_REGISTRY.weapons.find((weapon) => weapon.id === id);
}

export function classDefinition(id: string): RegistryClass | undefined {
  return MVP_REGISTRY.classes.find((hero) => hero.id === id);
}

export function passiveDefinition(id: string): RegistryPassive | undefined {
  return MVP_REGISTRY.passives.find((passive) => passive.id === id);
}

/** Resolve cumulative authored effects for a passive rank. Keeping this next
 * to the canonical registry prevents simulation and UI copy from inventing
 * different rank behavior for changing-effect passives. */
export function passiveEffectsAtRank(definition: RegistryPassive, rank: number): readonly RegistryPassiveEffect[] {
  const cappedRank = Math.max(0, Math.min(definition.maxLevel, Math.floor(Number.isFinite(rank) ? rank : 0)));
  if (cappedRank === 0) return [];
  if (definition.levelEffects) return definition.levelEffects.slice(0, cappedRank).flat();
  if (definition.stat === 'maxHealth') {
    // Max Health is one of the source stats whose item levels multiply the
    // current total. Return one cumulative effect so the simulation does not
    // accidentally interpret the per-level value as an additive bonus.
    return [{ stat: definition.stat, value: (1 + definition.valuePerLevel) ** cappedRank - 1 }];
  }
  return [{ stat: definition.stat, value: definition.valuePerLevel * cappedRank }];
}

export function enemyDefinition(id: string): RegistryEnemy | undefined {
  return MVP_REGISTRY.enemies.find((enemy) => enemy.id === id);
}
