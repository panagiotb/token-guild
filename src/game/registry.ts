import type { CombatStats, WeaponLevelStats, WeaponPattern } from './types';

export interface RegistryClass {
  id: string;
  name: string;
  startingWeaponId: string;
  baseStats: CombatStats;
  passive: { stat: string; valuePerLevel: number; intervalLevels: number; maxBonus: number };
}

export interface RegistryWeapon {
  id: string;
  name: string;
  damage: number;
  cooldown: number;
  maxLevel: number;
  pattern: WeaponPattern;
  levels: WeaponLevelStats[];
  evolution?: { passiveId: string; resultId: string };
}

export interface RegistryPassive {
  id: string;
  name: string;
  stat: string;
  valuePerLevel: number;
  maxLevel: number;
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

export interface RegistryStage {
  id: string;
  name: string;
  durationSeconds: number;
  boss: string;
  waves: RegistryWave[];
}

const WEAPON_PATTERNS: readonly WeaponPattern[] = ['targeted', 'fan', 'ricochet', 'aura', 'bone'];
const STAT_KEYS: readonly (keyof CombatStats)[] = ['hp', 'maxHp', 'armor', 'moveSpeed', 'might', 'area', 'speed', 'cooldown', 'amount', 'magnet', 'growth', 'duration', 'luck', 'greed', 'curse', 'recovery', 'revival'];

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
  return {
    damage: numberField(source, 'damage', label),
    cooldown: numberField(source, 'cooldown', label),
    amount: numberField(source, 'amount', label, 1),
    area: numberField(source, 'area', label),
    speed: numberField(source, 'speed', label),
    duration: numberField(source, 'duration', label),
    pierce: numberField(source, 'pierce', label),
    knockback: numberField(source, 'knockback', label)
  };
}

function legacyLevels(value: Record<string, unknown>, label: string, maxLevel: number): WeaponLevelStats[] {
  const damage = numberField(value, 'damage', label);
  const cooldown = numberField(value, 'cooldown', label);
  return Array.from({ length: maxLevel }, () => ({ damage, cooldown, amount: 1, area: 1, speed: 1, duration: 1, pierce: 0, knockback: 0 }));
}

export function loadMvpRegistry(input: { classes: unknown; weapons: unknown; passives: unknown; stages: unknown; enemies?: unknown }): { classes: RegistryClass[]; weapons: RegistryWeapon[]; passives: RegistryPassive[]; stages: RegistryStage[]; enemies: RegistryEnemy[] } {
  if (!Array.isArray(input.classes) || !Array.isArray(input.weapons) || !Array.isArray(input.passives) || !Array.isArray(input.stages)) throw new Error('All MVP registries must be arrays');
  const classes = input.classes.map((raw, index) => {
    const value = record(raw, `classes[${index}]`);
    const passive = record(value.passive, `classes[${index}].passive`);
    const fallbackStats: CombatStats = { hp: 100, maxHp: 100, armor: 0, moveSpeed: 40, might: 0, area: 0, speed: 0, cooldown: 0, amount: 1, magnet: 32, growth: 0, duration: 0, luck: 0, greed: 0, curse: 0, recovery: 0, revival: 0 };
    return {
      id: stringField(value, 'id', `classes[${index}]`),
      name: stringField(value, 'name', `classes[${index}]`),
      startingWeaponId: stringField(value, 'startingWeaponId', `classes[${index}]`),
      baseStats: value.baseStats === undefined ? fallbackStats : combatStats(value.baseStats, `classes[${index}].baseStats`),
      passive: {
        stat: stringField(passive, 'stat', `classes[${index}].passive`),
        valuePerLevel: numberField(passive, 'valuePerLevel', `classes[${index}].passive`),
        intervalLevels: numberField(passive, 'intervalLevels', `classes[${index}].passive`, 1),
        maxBonus: numberField(passive, 'maxBonus', `classes[${index}].passive`)
      }
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
    const result: RegistryWeapon = { id: stringField(value, 'id', `weapons[${index}]`), name: stringField(value, 'name', `weapons[${index}]`), damage: levels[0]?.damage ?? numberField(value, 'damage', `weapons[${index}]`), cooldown: levels[0]?.cooldown ?? numberField(value, 'cooldown', `weapons[${index}]`), maxLevel, pattern: pattern as WeaponPattern, levels };
    if (value.evolution !== undefined) {
      const evolution = record(value.evolution, `weapons[${index}].evolution`);
      result.evolution = { passiveId: stringField(evolution, 'passiveId', `weapons[${index}].evolution`), resultId: stringField(evolution, 'resultId', `weapons[${index}].evolution`) };
    }
    return result;
  });
  const passives = input.passives.map((raw, index) => {
    const value = record(raw, `passives[${index}]`);
    return { id: stringField(value, 'id', `passives[${index}]`), name: stringField(value, 'name', `passives[${index}]`), stat: stringField(value, 'stat', `passives[${index}]`), valuePerLevel: numberField(value, 'valuePerLevel', `passives[${index}]`), maxLevel: numberField(value, 'maxLevel', `passives[${index}]`, 1) };
  });
  const rawEnemies = input.enemies ?? [];
  if (!Array.isArray(rawEnemies)) throw new Error('enemies must be an array');
  const enemies = rawEnemies.map((raw, index) => {
    const value = record(raw, `enemies[${index}]`);
    return {
      id: stringField(value, 'id', `enemies[${index}]`),
      name: stringField(value, 'name', `enemies[${index}]`),
      maxHp: numberField(value, 'maxHp', `enemies[${index}]`, 1),
      speed: numberField(value, 'speed', `enemies[${index}]`),
      damage: numberField(value, 'damage', `enemies[${index}]`),
      xp: numberField(value, 'xp', `enemies[${index}]`, 0),
      isElite: value.isElite === true,
      isBoss: value.isBoss === true
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
    return { id: stringField(value, 'id', `stages[${index}]`), name: stringField(value, 'name', `stages[${index}]`), durationSeconds: numberField(value, 'durationSeconds', `stages[${index}]`, 1), boss: stringField(value, 'boss', `stages[${index}]`), waves };
  });
  unique(classes.map((entry) => entry.id), 'classes'); unique(weapons.map((entry) => entry.id), 'weapons'); unique(passives.map((entry) => entry.id), 'passives'); unique(stages.map((entry) => entry.id), 'stages'); unique(enemies.map((entry) => entry.id), 'enemies');
  const weaponIds = new Set(weapons.map((entry) => entry.id)); const passiveIds = new Set(passives.map((entry) => entry.id));
  const enemyIds = new Set(enemies.map((entry) => entry.id));
  for (const entry of classes) if (!weaponIds.has(entry.startingWeaponId)) throw new Error(`Class ${entry.id} references missing weapon`);
  for (const entry of weapons) if (entry.evolution && (!passiveIds.has(entry.evolution.passiveId) || !weaponIds.has(entry.evolution.resultId))) throw new Error(`Weapon ${entry.id} has a broken evolution reference`);
  for (const stage of stages) {
    if (!enemyIds.has(stage.boss)) throw new Error(`Stage ${stage.id} references missing boss`);
    for (const wave of stage.waves) if (!enemyIds.has(wave.enemy)) throw new Error(`Stage ${stage.id} references missing enemy ${wave.enemy}`);
  }
  return { classes, weapons, passives, stages, enemies };
}
