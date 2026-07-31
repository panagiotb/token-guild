export interface RegistryClass { id: string; name: string; startingWeaponId: string; passive: { stat: string; valuePerLevel: number; intervalLevels: number; maxBonus: number } }
export interface RegistryWeapon { id: string; name: string; damage: number; cooldown: number; maxLevel: number; evolution?: { passiveId: string; resultId: string } }
export interface RegistryPassive { id: string; name: string; stat: string; valuePerLevel: number; maxLevel: number }
export interface RegistryStage { id: string; name: string; durationSeconds: number; boss: string; waves: Array<{ fromSecond: number; enemy: string; spawnEverySeconds: number }> }

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

export function loadMvpRegistry(input: { classes: unknown; weapons: unknown; passives: unknown; stages: unknown }): { classes: RegistryClass[]; weapons: RegistryWeapon[]; passives: RegistryPassive[]; stages: RegistryStage[] } {
  if (!Array.isArray(input.classes) || !Array.isArray(input.weapons) || !Array.isArray(input.passives) || !Array.isArray(input.stages)) throw new Error('All MVP registries must be arrays');
  const classes = input.classes.map((raw, index) => { const value = record(raw, `classes[${index}]`); const passive = record(value.passive, `classes[${index}].passive`); return { id: stringField(value, 'id', `classes[${index}]`), name: stringField(value, 'name', `classes[${index}]`), startingWeaponId: stringField(value, 'startingWeaponId', `classes[${index}]`), passive: { stat: stringField(passive, 'stat', `classes[${index}].passive`), valuePerLevel: numberField(passive, 'valuePerLevel', `classes[${index}].passive`), intervalLevels: numberField(passive, 'intervalLevels', `classes[${index}].passive`, 1), maxBonus: numberField(passive, 'maxBonus', `classes[${index}].passive`) } }; });
  const weapons = input.weapons.map((raw, index) => { const value = record(raw, `weapons[${index}]`); const result: RegistryWeapon = { id: stringField(value, 'id', `weapons[${index}]`), name: stringField(value, 'name', `weapons[${index}]`), damage: numberField(value, 'damage', `weapons[${index}]`), cooldown: numberField(value, 'cooldown', `weapons[${index}]`), maxLevel: numberField(value, 'maxLevel', `weapons[${index}]`, 1) }; if (value.evolution !== undefined) { const evolution = record(value.evolution, `weapons[${index}].evolution`); result.evolution = { passiveId: stringField(evolution, 'passiveId', `weapons[${index}].evolution`), resultId: stringField(evolution, 'resultId', `weapons[${index}].evolution`) }; } return result; });
  const passives = input.passives.map((raw, index) => { const value = record(raw, `passives[${index}]`); return { id: stringField(value, 'id', `passives[${index}]`), name: stringField(value, 'name', `passives[${index}]`), stat: stringField(value, 'stat', `passives[${index}]`), valuePerLevel: numberField(value, 'valuePerLevel', `passives[${index}]`), maxLevel: numberField(value, 'maxLevel', `passives[${index}]`, 1) }; });
  const stages = input.stages.map((raw, index) => { const value = record(raw, `stages[${index}]`); if (!Array.isArray(value.waves)) throw new Error(`stages[${index}].waves must be an array`); return { id: stringField(value, 'id', `stages[${index}]`), name: stringField(value, 'name', `stages[${index}]`), durationSeconds: numberField(value, 'durationSeconds', `stages[${index}]`, 1), boss: stringField(value, 'boss', `stages[${index}]`), waves: value.waves.map((rawWave, waveIndex) => { const wave = record(rawWave, `stages[${index}].waves[${waveIndex}]`); return { fromSecond: numberField(wave, 'fromSecond', `wave`, 0), enemy: stringField(wave, 'enemy', `wave`), spawnEverySeconds: numberField(wave, 'spawnEverySeconds', `wave`, 0.1) }; }) }; });
  unique(classes.map((entry) => entry.id), 'classes'); unique(weapons.map((entry) => entry.id), 'weapons'); unique(passives.map((entry) => entry.id), 'passives'); unique(stages.map((entry) => entry.id), 'stages');
  const weaponIds = new Set(weapons.map((entry) => entry.id)); const passiveIds = new Set(passives.map((entry) => entry.id));
  for (const entry of classes) if (!weaponIds.has(entry.startingWeaponId)) throw new Error(`Class ${entry.id} references missing weapon`);
  for (const entry of weapons) if (entry.evolution && (!passiveIds.has(entry.evolution.passiveId) || !weaponIds.has(entry.evolution.resultId))) throw new Error(`Weapon ${entry.id} has a broken evolution reference`);
  return { classes, weapons, passives, stages };
}
