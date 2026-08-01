import classes from './data/classes.json';
import passives from './data/passives.json';
import stages from './data/stages.json';
import weapons from './data/weapons.json';
import progression from './data/progression.json';
import enemies from './data/enemies.json';
import { loadMvpRegistry, type RegistryClass, type RegistryEnemy, type RegistryPassive, type RegistryStage, type RegistryWeapon } from './registry';

export const MVP_REGISTRY: { classes: RegistryClass[]; weapons: RegistryWeapon[]; passives: RegistryPassive[]; stages: RegistryStage[]; enemies: RegistryEnemy[] } = loadMvpRegistry({ classes, weapons, passives, stages, enemies });
export const XP_THRESHOLDS: readonly number[] = progression.xpToNextLevel;

export function weaponDefinition(id: string): RegistryWeapon | undefined {
  return MVP_REGISTRY.weapons.find((weapon) => weapon.id === id);
}

export function classDefinition(id: string): RegistryClass | undefined {
  return MVP_REGISTRY.classes.find((hero) => hero.id === id);
}

export function passiveDefinition(id: string): RegistryPassive | undefined {
  return MVP_REGISTRY.passives.find((passive) => passive.id === id);
}

export function enemyDefinition(id: string): RegistryEnemy | undefined {
  return MVP_REGISTRY.enemies.find((enemy) => enemy.id === id);
}
