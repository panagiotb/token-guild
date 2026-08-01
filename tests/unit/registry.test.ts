import { describe, expect, it } from 'vitest';
import classes from '../../src/game/data/classes.json';
import weapons from '../../src/game/data/weapons.json';
import passives from '../../src/game/data/passives.json';
import stages from '../../src/game/data/stages.json';
import enemies from '../../src/game/data/enemies.json';
import { loadMvpRegistry } from '../../src/game/registry';

describe('MVP registry', () => {
  it('loads the frozen content and resolves references', () => {
    const registry = loadMvpRegistry({ classes, weapons, passives, stages, enemies });
    expect(registry.classes).toHaveLength(6);
    expect(registry.weapons.map((entry) => entry.id)).toEqual(expect.arrayContaining(['broadsword', 'arcane_bolt', 'throwing_daggers', 'bouncing_arrow', 'aegis_barrier', 'bone_throw', 'excalibur', 'archmage_staff', 'sanctuary']));
    expect(registry.passives.map((entry) => entry.id)).toEqual(expect.arrayContaining(['power_gauntlets', 'haste_amulet', 'orb_of_expansion', 'token_magnetism']));
    for (const hero of registry.classes) expect(registry.weapons.some((weapon) => weapon.id === hero.startingWeaponId)).toBe(true);
    for (const weapon of registry.weapons.filter((candidate) => candidate.evolution)) expect(registry.passives.some((passive) => passive.id === weapon.evolution?.passiveId)).toBe(true);
    expect(registry.stages[0]?.id).toBe('code-dungeon');
    expect(registry.enemies).toHaveLength(9);
    expect(registry.stages[0]?.waves).toHaveLength(10);
  });

  it('rejects duplicate or broken registry references', () => {
    expect(() => loadMvpRegistry({ classes: [{ ...classes[0], id: classes[1]!.id }, ...classes.slice(1)], weapons, passives, stages, enemies })).toThrow(/duplicate IDs/);
    expect(() => loadMvpRegistry({ classes: [{ ...classes[0], startingWeaponId: 'missing' }, ...classes.slice(1)], weapons, passives, stages, enemies })).toThrow(/missing weapon/);
  });
});
