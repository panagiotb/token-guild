import { describe, expect, it } from 'vitest';
import classes from '../../src/game/data/classes.json';
import weapons from '../../src/game/data/weapons.json';
import passives from '../../src/game/data/passives.json';
import stages from '../../src/game/data/stages.json';
import enemies from '../../src/game/data/enemies.json';
import drops from '../../src/game/data/drops.json';
import { loadMvpRegistry } from '../../src/game/registry';

describe('MVP registry', () => {
  it('loads the frozen content and resolves references', () => {
    const registry = loadMvpRegistry({ classes, weapons, passives, stages, enemies });
    expect(registry.classes).toHaveLength(6);
    expect(registry.weapons.map((entry) => entry.id)).toEqual(expect.arrayContaining(['broadsword', 'arcane_bolt', 'throwing_daggers', 'bouncing_arrow', 'aegis_barrier', 'bone_throw', 'fire_wand', 'battle_axe', 'celestial_cross', 'orbiting_grimoire', 'alchemist_fire', 'excalibur', 'archmage_staff', 'sanctuary', 'hellfire', 'scythe_of_doom', 'heaven_blade', 'unabridged_codex', 'philosophers_potion']));
    expect(registry.passives.map((entry) => entry.id)).toEqual(expect.arrayContaining(['power_gauntlets', 'haste_amulet', 'orb_of_expansion', 'token_magnetism', 'clover']));
    expect(registry.weapons.find((entry) => entry.id === 'broadsword')?.rarityWeight).toBe(100);
    expect(registry.weapons.find((entry) => entry.id === 'bone_throw')?.rarityWeight).toBe(1);
    expect(registry.passives.find((entry) => entry.id === 'heart_of_vitality')?.rarityWeight).toBe(90);
    for (const hero of registry.classes) expect(registry.weapons.some((weapon) => weapon.id === hero.startingWeaponId)).toBe(true);
    for (const weapon of registry.weapons.filter((candidate) => candidate.evolution)) expect(registry.passives.some((passive) => passive.id === weapon.evolution?.passiveId)).toBe(true);
    expect(registry.stages[0]?.id).toBe('code-dungeon');
    expect(registry.stages[0]).toMatchObject({
      topology: 'open',
      modifiers: [],
      dropTableId: 'code-dungeon',
      spawnPolicy: { enemyInnerRadius: 215, enemyOuterRadius: 265, bossRadius: 235, enemyPersistenceRadius: 720 },
      scaling: { healthPerMinute: 0.03, damagePerMinute: 0.02, speedPerMinute: 0.01 },
      combat: { contactRadius: 8, contactInvulnerabilitySeconds: 0.5 },
      finale: { graceSeconds: 60, threatIntervalSeconds: 60, clearRegularEnemies: true, invulnerableThreat: true }
    });
    expect(registry.enemies).toHaveLength(9);
    expect(registry.stages[0]?.waves).toHaveLength(10);
    expect(registry.passives.find((entry) => entry.id === 'pandoras_box')?.levelEffects).toHaveLength(9);
    const daggers = registry.weapons.find((entry) => entry.id === 'throwing_daggers');
    expect(daggers).toMatchObject({ pattern: 'targeted', aim: 'facing', projectileInterval: 0.1 });
    expect(daggers?.levels.map((level) => level.projectileInterval)).toEqual([0.1, 0.1, 0.1, 0.08, 0.08, 0.06, 0.06, 0.04]);
    expect(registry.weapons.find((entry) => entry.id === 'arcane_bolt')?.aim).toBe('target');
    expect(registry.weapons.find((entry) => entry.id === 'arcane_bolt')?.projectileInterval).toBeCloseTo(0.1);
    expect(registry.weapons.find((entry) => entry.id === 'archmage_staff')).toMatchObject({ projectileInterval: 0.1, levels: [{ amount: 4 }] });
    expect(registry.weapons.find((entry) => entry.id === 'thousand_blades')).toMatchObject({ pattern: 'targeted', aim: 'facing', projectileInterval: 0.05, levels: [{ amount: 6, pierce: 3 }] });
    expect(registry.weapons.find((entry) => entry.id === 'no_future')).toMatchObject({ explosion: { onBounce: true, onContact: true, radiusMultiplier: 1, retaliatoryArmorBonusPerPoint: 0.1 }, levels: [{ damage: 30, cooldown: 1.4, speed: 224, duration: 3, pierce: 99 }] });
    const fireWand = registry.weapons.find((entry) => entry.id === 'fire_wand');
    expect(fireWand).toMatchObject({ rarityWeight: 80, pattern: 'fan', aim: 'random', ignoreDuration: true, projectileInterval: 0.02, maxLevel: 8 });
    expect(fireWand?.levels.map((level) => ({ damage: level.damage, speed: level.speed, amount: level.amount }))).toEqual([
      { damage: 20, speed: 0.75, amount: 3 }, { damage: 30, speed: 0.75, amount: 3 }, { damage: 40, speed: 0.9, amount: 3 }, { damage: 50, speed: 0.9, amount: 3 },
      { damage: 60, speed: 1.08, amount: 3 }, { damage: 70, speed: 1.08, amount: 3 }, { damage: 80, speed: 1.296, amount: 3 }, { damage: 90, speed: 1.35, amount: 3 }
    ]);
    expect(fireWand?.evolution).toEqual({ passiveId: 'power_gauntlets', resultId: 'hellfire' });
    expect(registry.weapons.find((entry) => entry.id === 'hellfire')).toMatchObject({ rarityWeight: 1, pattern: 'targeted', aim: 'random', ignoreDuration: true, projectileInterval: 0.2, maxLevel: 1, levels: [{ damage: 100, amount: 2, pierce: 99 }] });
    const battleAxe = registry.weapons.find((entry) => entry.id === 'battle_axe');
    expect(battleAxe).toMatchObject({ rarityWeight: 100, pattern: 'fan', aim: 'facing', ignoreDuration: true, projectileInterval: 0.2, maxLevel: 8 });
    expect(battleAxe?.levels.map((level) => ({ damage: level.damage, amount: level.amount, pierce: level.pierce }))).toEqual([
      { damage: 20, amount: 1, pierce: 3 }, { damage: 20, amount: 2, pierce: 3 }, { damage: 40, amount: 2, pierce: 3 }, { damage: 40, amount: 2, pierce: 5 },
      { damage: 40, amount: 3, pierce: 5 }, { damage: 60, amount: 3, pierce: 5 }, { damage: 60, amount: 3, pierce: 7 }, { damage: 80, amount: 3, pierce: 7 }
    ]);
    expect(battleAxe?.evolution).toEqual({ passiveId: 'orb_of_expansion', resultId: 'scythe_of_doom' });
    expect(registry.weapons.find((entry) => entry.id === 'scythe_of_doom')).toMatchObject({ rarityWeight: 1, pattern: 'fan', aim: 'random', ignoreDuration: true, projectileInterval: 0.05, maxLevel: 1, levels: [{ damage: 60, amount: 9, area: 1.2, speed: 0.8, duration: 30, pierce: 1000 }] });
    const cross = registry.weapons.find((entry) => entry.id === 'celestial_cross');
    expect(cross).toMatchObject({ rarityWeight: 80, pattern: 'boomerang', aim: 'target', ignoreDuration: true, projectileInterval: 0.1, maxLevel: 8 });
    expect(cross?.levels.map((level) => ({ damage: level.damage, amount: level.amount, area: level.area, speed: level.speed }))).toEqual([
      { damage: 5, amount: 1, area: 1, speed: 1 }, { damage: 10, amount: 1, area: 1, speed: 1 }, { damage: 10, amount: 2, area: 1, speed: 1 }, { damage: 15, amount: 2, area: 1.1, speed: 1 },
      { damage: 20, amount: 2, area: 1.1, speed: 1.2 }, { damage: 20, amount: 3, area: 1.1, speed: 1.2 }, { damage: 25, amount: 3, area: 1.2, speed: 1.2 }, { damage: 35, amount: 3, area: 1.2, speed: 1.5 }
    ]);
    expect(cross?.evolution).toEqual({ passiveId: 'clover', resultId: 'heaven_blade' });
    expect(registry.weapons.find((entry) => entry.id === 'heaven_blade')).toMatchObject({ rarityWeight: 1, pattern: 'boomerang', aim: 'target', ignoreDuration: true, projectileInterval: 0.5, maxLevel: 1, levels: [{ damage: 77, amount: 1, area: 1.2, speed: 2, cooldown: 3.3, pierce: 30 }] });
    const grimoire = registry.weapons.find((entry) => entry.id === 'orbiting_grimoire');
    expect(grimoire).toMatchObject({ rarityWeight: 80, pattern: 'orbit', ignoreDuration: false, maxLevel: 8 });
    expect(grimoire?.levels.map((level) => ({ damage: level.damage, amount: level.amount, area: level.area, speed: level.speed, duration: level.duration }))).toEqual([
      { damage: 10, amount: 1, area: 1, speed: 1, duration: 3 }, { damage: 10, amount: 2, area: 1, speed: 1, duration: 3 }, { damage: 10, amount: 2, area: 1.25, speed: 1.3, duration: 3 }, { damage: 20, amount: 2, area: 1.25, speed: 1.3, duration: 3.5 },
      { damage: 20, amount: 3, area: 1.25, speed: 1.3, duration: 3.5 }, { damage: 20, amount: 3, area: 1.5, speed: 1.6, duration: 3.5 }, { damage: 30, amount: 3, area: 1.5, speed: 1.6, duration: 4 }, { damage: 30, amount: 4, area: 1.5, speed: 1.6, duration: 4 }
    ]);
    expect(grimoire?.evolution).toEqual({ passiveId: 'spellbinder_scroll', resultId: 'unabridged_codex' });
    expect(registry.weapons.find((entry) => entry.id === 'unabridged_codex')).toMatchObject({ rarityWeight: 1, pattern: 'orbit', ignoreDuration: false, maxLevel: 1, levels: [{ damage: 30, amount: 4, area: 1.75, speed: 1.5, duration: 3, knockback: 4 }] });
    const alchemistFire = registry.weapons.find((entry) => entry.id === 'alchemist_fire');
    expect(alchemistFire).toMatchObject({ rarityWeight: 100, pattern: 'pool', aim: 'target', ignoreSpeed: true, projectileInterval: 0.3, poolLimit: 20, projectileHitboxDelaySeconds: 0.5, maxLevel: 8 });
    expect(alchemistFire?.levels.map((level) => ({ damage: level.damage, amount: level.amount, area: level.area, duration: level.duration }))).toEqual([
      { damage: 10, amount: 1, area: 1, duration: 2 }, { damage: 10, amount: 2, area: 1.2, duration: 2 }, { damage: 20, amount: 2, area: 1.2, duration: 2.5 }, { damage: 20, amount: 3, area: 1.4, duration: 2.5 },
      { damage: 30, amount: 3, area: 1.4, duration: 2.75 }, { damage: 30, amount: 4, area: 1.6, duration: 2.75 }, { damage: 35, amount: 4, area: 1.6, duration: 3 }, { damage: 40, amount: 4, area: 1.8, duration: 3 }
    ]);
    expect(alchemistFire?.evolution).toEqual({ passiveId: 'token_magnetism', resultId: 'philosophers_potion' });
    expect(registry.weapons.find((entry) => entry.id === 'philosophers_potion')).toMatchObject({ rarityWeight: 1, pattern: 'pool', poolLimit: 30, projectileHitboxDelaySeconds: 0.5, maxLevel: 1, levels: [{ damage: 40, amount: 4, area: 2, duration: 4 }] });
    expect(registry.weapons.find((entry) => entry.id === 'excalibur')).toMatchObject({ levels: [{ damage: 35, cooldown: 1, area: 1.3, duration: 0.35, knockback: 12 }] });
    expect(registry.weapons.find((entry) => entry.id === 'sanctuary')).toMatchObject({ levels: [{ damage: 18, cooldown: 0.8, area: 58, knockback: 20 }] });
    expect(registry.weapons.find((entry) => entry.id === 'broadsword')).toMatchObject({ ignoreSpeed: true, ignoreDuration: true });
    expect(registry.weapons.find((entry) => entry.id === 'arcane_bolt')).toMatchObject({ ignoreSpeed: false, ignoreDuration: true });
    expect(registry.weapons.find((entry) => entry.id === 'throwing_daggers')).toMatchObject({ ignoreSpeed: false, ignoreDuration: true });
    expect(registry.classes.find((entry) => entry.id === 'wizard')?.unlock).toMatchObject({ metric: 'hero-level', threshold: 5, heroId: 'warrior', description: 'Reach Level 5 with Warrior' });
    expect(registry.classes.find((entry) => entry.id === 'rogue')?.unlock).toMatchObject({ metric: 'gold', threshold: 100 });
    for (const weapon of registry.weapons) {
      expect(weapon.levels).toHaveLength(weapon.maxLevel);
      expect(weapon.levels.every((level) => Number.isFinite(level.damage) && Number.isFinite(level.cooldown))).toBe(true);
      if (weapon.pattern === 'targeted') expect(['target', 'facing', 'random']).toContain(weapon.aim);
    }
  });

  it('requires every first-roster evolution to declare its authored attack pattern', () => {
    const registry = loadMvpRegistry({ classes, weapons, passives, stages, enemies });
    const patterns = Object.fromEntries(registry.weapons.filter((weapon) => !weapon.evolution).map((weapon) => [weapon.id, weapon.pattern]));
    expect(patterns).toMatchObject({
      excalibur: 'slash',
      archmage_staff: 'targeted',
      thousand_blades: 'targeted',
      no_future: 'ricochet',
      sanctuary: 'aura',
      heaven_blade: 'boomerang',
      unabridged_codex: 'orbit',
      philosophers_potion: 'pool'
    });
    expect(registry.weapons.find((weapon) => weapon.id === 'fire_wand')?.pattern).toBe('fan');
    expect(registry.weapons.find((weapon) => weapon.id === 'broadsword')?.pattern).toBe('slash');
  });

  it('validates source drop tables and rejects reward-ineligible pickup kinds', () => {
    const registry = loadMvpRegistry({ classes, weapons, passives, stages, enemies, drops });
    expect(registry.drops.tables).toHaveLength(1);
    expect(registry.drops.tables[0]?.eliteDropChance).toBeCloseTo(0.38);
    expect(registry.drops.tables[0]).toMatchObject({ lightSourceSpawnChance: 0.1, lightSourceMaxSpawnChance: 0.5 });
    expect(registry.drops.tables[0]?.chest).toEqual({ baseTier: 1, fiveItemChance: 0.01, threeItemChance: 0.02 });
    expect(registry.drops.tables[0]?.lightSources).toHaveLength(7);
    expect(registry.drops.tables[0]?.elite).toHaveLength(5);
    const table = drops.tables[0]!;
    expect(() => loadMvpRegistry({ classes, weapons, passives, stages, enemies, drops: { tables: [{ ...table, lightSources: [{ ...table.lightSources[0], kind: 'xp-shard' }] }] } })).toThrow(/non-floor-drop/);
    expect(() => loadMvpRegistry({ classes, weapons, passives, stages, enemies, drops: { tables: [{ ...table, eliteDropChance: 2 }] } })).toThrow(/eliteDropChance is invalid/);
    expect(() => loadMvpRegistry({ classes, weapons, passives, stages, enemies, drops: { tables: [{ ...table, lightSourceSpawnChance: 0.6, lightSourceMaxSpawnChance: 0.5 }] } })).toThrow(/light-source spawn chances are invalid/);
    expect(() => loadMvpRegistry({ classes, weapons, passives, stages, enemies, drops: { tables: [{ ...table, chest: { ...table.chest, baseTier: 2 } }] } })).toThrow(/chest\.baseTier is invalid/);
    expect(() => loadMvpRegistry({ classes, weapons, passives, stages, enemies, drops: { tables: [{ ...table, chest: { ...table.chest, fiveItemChance: 2 } }] } })).toThrow(/chest chances are invalid/);
  });

  it('keeps light-source Luck ownership explicit for common gold versus rare drops', () => {
    const registry = loadMvpRegistry({ classes, weapons, passives, stages, enemies, drops });
    const table = registry.drops.tables[0]!;
    const byKind = new Map(table.lightSources.map((entry) => [entry.kind, entry]));
    expect(byKind.get('gold-coin')?.luckScaled).toBe(false);
    expect(byKind.get('gold-sack')?.luckScaled).toBe(false);
    for (const kind of ['gold-hoard', 'arcane-cleanser', 'chrono-stasis', 'mana-magnet', 'mana-roast'] as const) {
      expect(byKind.get(kind)?.luckScaled, `${kind} should be Luck-scaled`).toBe(true);
    }
  });

  it('rejects duplicate or broken registry references', () => {
    expect(() => loadMvpRegistry({ classes: [{ ...classes[0], id: classes[1]!.id }, ...classes.slice(1)], weapons, passives, stages, enemies })).toThrow(/duplicate IDs/);
    expect(() => loadMvpRegistry({ classes: [{ ...classes[0], startingWeaponId: 'missing' }, ...classes.slice(1)], weapons, passives, stages, enemies })).toThrow(/missing weapon/);
    expect(() => loadMvpRegistry({ classes: [{ ...classes[0], passive: { ...classes[0]!.passive, stat: 'unregistered' } }, ...classes.slice(1)], weapons, passives, stages, enemies })).toThrow(/passive\.stat is invalid/);
    expect(() => loadMvpRegistry({ classes, weapons, passives: [{ ...passives[0], stat: 'unregistered' }, ...passives.slice(1)], stages, enemies })).toThrow(/passives\[0\]\.stat is invalid/);
    expect(() => loadMvpRegistry({ classes, weapons, passives, stages, enemies: [{ ...enemies[0], movementPattern: 'teleport' }, ...enemies.slice(1)] })).toThrow(/movementPattern is invalid/);
    expect(() => loadMvpRegistry({ classes, weapons, passives, stages: [{ ...stages[0], topology: 'teleport' }], enemies })).toThrow(/topology is invalid/);
    expect(() => loadMvpRegistry({ classes, weapons: [{ ...weapons[0], aim: 'teleport' }, ...weapons.slice(1)], passives, stages, enemies })).toThrow(/aim is invalid/);
    expect(() => loadMvpRegistry({ classes, weapons: [{ ...weapons[0], rarityWeight: -1 }, ...weapons.slice(1)], passives, stages, enemies })).toThrow(/rarityWeight is invalid/);
    expect(() => loadMvpRegistry({ classes, weapons, passives: [{ ...passives[0], rarityWeight: -1 }, ...passives.slice(1)], stages, enemies })).toThrow(/rarityWeight is invalid/);
    expect(() => loadMvpRegistry({ classes, weapons: [{ ...weapons[0], ignoreSpeed: 'yes' }, ...weapons.slice(1)], passives, stages, enemies })).toThrow(/ignoreSpeed is invalid/);
    expect(() => loadMvpRegistry({ classes, weapons: [{ ...weapons[0], projectileInterval: -1 }, ...weapons.slice(1)], passives, stages, enemies })).toThrow(/projectileInterval is invalid/);
    expect(() => loadMvpRegistry({ classes, weapons: [{ ...weapons[0], projectileInterval: 11 }, ...weapons.slice(1)], passives, stages, enemies })).toThrow(/projectileInterval is invalid/);
    expect(() => loadMvpRegistry({ classes, weapons: [{ ...weapons[0], poolLimit: 0 }, ...weapons.slice(1)], passives, stages, enemies })).toThrow(/poolLimit is invalid/);
    expect(() => loadMvpRegistry({ classes, weapons: [{ ...weapons[0], poolLimit: 241 }, ...weapons.slice(1)], passives, stages, enemies })).toThrow(/poolLimit is invalid/);
    expect(() => loadMvpRegistry({ classes, weapons: [{ ...weapons[0], projectileHitboxDelaySeconds: 6 }, ...weapons.slice(1)], passives, stages, enemies })).toThrow(/projectileHitboxDelaySeconds is invalid/);
    expect(() => loadMvpRegistry({ classes, weapons: [{ ...weapons[0], explosion: { onBounce: false, onContact: false, radiusMultiplier: 1 } }, ...weapons.slice(1)], passives, stages, enemies })).toThrow(/explosion must have a trigger/);
    expect(() => loadMvpRegistry({ classes, weapons: [{ ...weapons[0], explosion: { onBounce: true, onContact: false, radiusMultiplier: 11 } }, ...weapons.slice(1)], passives, stages, enemies })).toThrow(/explosion\.radiusMultiplier is invalid/);
    expect(() => loadMvpRegistry({ classes, weapons: [{ ...weapons[0], explosion: { onBounce: true, onContact: false, radiusMultiplier: 0 } }, ...weapons.slice(1)], passives, stages, enemies })).toThrow(/explosion\.radiusMultiplier is invalid/);
    expect(() => loadMvpRegistry({ classes, weapons: [{ ...weapons[0], explosion: { onBounce: true, onContact: false, radiusMultiplier: 1, retaliatoryArmorBonusPerPoint: 1.1 } }, ...weapons.slice(1)], passives, stages, enemies })).toThrow(/retaliatoryArmorBonusPerPoint is invalid/);
    expect(() => loadMvpRegistry({ classes: [{ ...classes[0], unlock: { metric: 'invalid', threshold: 5 } }, ...classes.slice(1)], weapons, passives, stages, enemies })).toThrow(/unlock.metric is invalid/);
    expect(() => loadMvpRegistry({ classes: [{ ...classes[0], unlock: { metric: 'gold', threshold: 1.5 } }, ...classes.slice(1)], weapons, passives, stages, enemies })).toThrow(/unlock.threshold is invalid/);
    expect(() => loadMvpRegistry({ classes: [{ ...classes[0], unlock: { metric: 'hero-level', threshold: 5, heroId: 'missing' } }, ...classes.slice(1)], weapons, passives, stages, enemies })).toThrow(/missing unlock hero/);
  });

  it('rejects unsafe stage perimeter, scaling, and finale contracts', () => {
    const stage = stages[0]!;
    expect(() => loadMvpRegistry({ classes, weapons, passives, enemies, stages: [{ ...stage, spawnPolicy: { ...stage.spawnPolicy, enemyOuterRadius: stage.spawnPolicy.enemyInnerRadius - 1 } }] })).toThrow(/spawnPolicy radii are invalid/);
    expect(() => loadMvpRegistry({ classes, weapons, passives, enemies, stages: [{ ...stage, scaling: { ...stage.scaling, healthPerMinute: 11 } }] })).toThrow(/scaling is too large/);
    expect(() => loadMvpRegistry({ classes, weapons, passives, enemies, stages: [{ ...stage, combat: { ...stage.combat, contactRadius: 101 } }] })).toThrow(/combat is too large/);
    expect(() => loadMvpRegistry({ classes, weapons, passives, enemies, stages: [{ ...stage, finale: { ...stage.finale, graceSeconds: 0 } }] })).toThrow(/finale\.graceSeconds is invalid/);
    expect(() => loadMvpRegistry({ classes, weapons, passives, enemies, stages: [{ ...stage, dropTableId: 'missing' }] })).toThrow(/missing drop table/);
  });
});
