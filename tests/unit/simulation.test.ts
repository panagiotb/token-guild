import { describe, expect, it } from 'vitest';
import { calculateDamage, getXpRequiredForLevel } from '../../src/game/math';
import { applyTokenInput, chooseUpgrade, createRun, finishRun, getBossTimeSeconds, getHeroMoveSpeed, getWeaponLevelStats, openTreasureChest, recalculateStats, tick } from '../../src/game/simulation';

describe('deterministic game math', () => {
  it('uses the mapped XP curve and keeps combat independent from tokens', () => {
    expect(getXpRequiredForLevel(1)).toBe(5);
    expect(getXpRequiredForLevel(20)).toBe(2600);
    expect(calculateDamage(20, { hp: 100, maxHp: 100, armor: 0, moveSpeed: 1, might: 0.1, area: 0, speed: 0, cooldown: 0, amount: 1, magnet: 1, growth: 0 }, 39)).toBe(22);
    expect(calculateDamage(20, { hp: 100, maxHp: 100, armor: 0, moveSpeed: 1, might: 0.1, area: 0, speed: 0, cooldown: 0, amount: 1, magnet: 1, growth: 0 }, 400)).toBe(22);
  });
});

describe('deterministic run simulation', () => {
  it('pauses at level-up and resumes after choosing a valid card', () => {
    const run = createRun('warrior', 42);
    applyTokenInput(run, { count: 5, tokensPerSecond: 10 });
    expect(run.totalTokens).toBe(5);
    expect(run.xp).toBe(0);
    expect(run.phase).toBe('dungeon');
    for (let index = 0; index < 5; index += 1) run.pickups.push({ id: index + 1, kind: 'xp-shard', x: 0, y: 0, value: 1 });
    tick(run, 0.25, 10);
    expect(run.phase).toBe('level-up');
    expect(run.pendingCards).toHaveLength(3);
    expect(run.pendingCards.every((card) => card.id.length > 0)).toBe(true);
    const chosen = run.pendingCards[0]!;
    chooseUpgrade(run, chosen.id);
    expect(run.phase).toBe('dungeon');
    expect(run.upgradeHistory).toEqual([chosen.id]);
    expect(run.goldBreakdown.enemyKills).toBe(5);
    expect(getHeroMoveSpeed(run, 40)).toBe(run.hero.stats.moveSpeed);
  });

  it('tracks spawned and defeated enemies separately', () => {
    const run = createRun('warrior', 5);
    for (let index = 0; index < 4; index += 1) tick(run, 0.25, 0);
    expect(run.enemiesSpawned).toBe(7);
    expect(run.enemiesDefeated).toBe(0);
    expect(run.enemies.length).toBe(7);
  });

  it('credits a boss chest once when the hero collects it', () => {
    const run = createRun('paladin', 23);
    run.hero.stats.hp = 1000;
    run.hero.stats.maxHp = 1000;
    run.bossSpawned = true;
    run.enemies.push({ id: 99, kind: 'terminal_exit_boss', x: 0, y: 0, hp: 0, maxHp: 120, speed: 0, damage: 0, isBoss: true, isElite: false });
    tick(run, 0.25, 0);
    expect(run.phase).toBe('summary');
    expect(run.gold).toBe(100);
    expect(run.goldBreakdown).toEqual({ enemyKills: 0, bossChest: 100, overflow: 0 });
    expect(run.pickups).toEqual([]);
    expect(run.summary?.gold).toBe(100);
  });

  it('keeps gold pending until a distant drop is collected', () => {
    const run = createRun('paladin', 24);
    run.hero.stats.hp = 1000;
    run.hero.stats.maxHp = 1000;
    run.bossSpawned = true;
    run.enemies.push({ id: 99, kind: 'terminal_exit_boss', x: 120, y: 0, hp: 0, maxHp: 120, speed: 0, damage: 0, isBoss: true, isElite: false });
    tick(run, 0.25, 0);
    expect(run.phase).toBe('dungeon');
    expect(run.gold).toBe(0);
    expect(run.pickups).toEqual([expect.objectContaining({ kind: 'gold-chest', value: 100 })]);
    run.hero.x = run.pickups[0]!.x;
    tick(run, 0.25, 0);
    expect(run.phase).toBe('summary');
    expect(run.gold).toBe(100);
    expect(run.pickups).toEqual([]);
  });

  it('credits XP and ordinary gold only when its gem is collected', () => {
    const collected = createRun('warrior', 25);
    collected.enemies.push({ id: 1, kind: 'syntax_specter', x: 0, y: 0, hp: 0, maxHp: 28, speed: 0, damage: 0, isBoss: false, isElite: false });
    tick(collected, 0.25, 0);
    expect(collected.gold).toBe(1);
    expect(collected.xp).toBe(1);
    expect(collected.pickups).toEqual([]);

    const pending = createRun('warrior', 26);
    pending.enemies.push({ id: 1, kind: 'syntax_specter', x: 100, y: 0, hp: 0, maxHp: 28, speed: 0, damage: 0, isBoss: false, isElite: false });
    tick(pending, 0.25, 0);
    expect(pending.gold).toBe(0);
    expect(pending.xp).toBe(0);
    expect(pending.pickups).toEqual([expect.objectContaining({ kind: 'xp-shard', value: 1 })]);
  });

  it('spawns overflow gold at the hero and credits it only on collection', () => {
    const run = createRun('warrior', 27);
    applyTokenInput(run, { count: 10000, outputTokens: 10000, tokensPerSecond: 10, isAgentActive: true });
    tick(run, 0.25, 10);
    const coin = run.pickups.find((pickup) => pickup.kind === 'gold-coin');
    expect(coin).toBeDefined();
    expect(run.gold).toBe(0);
    expect(coin?.value).toBeGreaterThan(0);
    tick(run, 0.25, 10);
    expect(run.gold).toBe(coin?.value);
    expect(run.goldBreakdown.overflow).toBe(coin?.value);
  });

  it('freezes the run while depleted and re-ignites after incoming charge', () => {
    const run = createRun('warrior', 28);
    run.battery = { ...run.battery, currentCapacity: 1 };
    tick(run, 0.25, 0);
    expect(run.battery.isLockedOut).toBe(true);
    const elapsed = run.elapsedSeconds;
    tick(run, 0.25, 0);
    expect(run.elapsedSeconds).toBe(elapsed);
    applyTokenInput(run, { count: 800, tokensPerSecond: 10, isAgentActive: true });
    tick(run, 0.25, 10);
    expect(run.battery.isLockedOut).toBe(false);
  });

  it('applies persistent Guild upgrades at run start', () => {
    const run = createRun('warrior', 1, { might: 2 });
    expect(run.hero.stats.might).toBeCloseTo(0.1);
  });

  it('starts with the persisted battery capacity level', () => {
    const run = createRun('warrior', 2, { batteryLevel: 3 });
    expect(run.battery.level).toBe(3);
    expect(run.battery.maxCapacity).toBe(13284);
    expect(run.battery.currentCapacity).toBe(13284);
  });

  it('starts every run at level one even when a hero has a higher recorded best', () => {
    const run = createRun('wizard', 17, { might: 4 });
    expect(run.level).toBe(1);
  });

  it('spawns a boss on deterministic schedule and eventually reaches victory', () => {
    const run = createRun('warrior', 7, {}, { clockScale: 60 });
    run.hero.stats.hp = 10000;
    run.hero.stats.maxHp = 10000;
    run.hero.stats.magnet = 1000;
    let elapsed = 0;
    while (run.phase !== 'summary' && elapsed < getBossTimeSeconds() + 90) {
      if (run.phase === 'level-up') chooseUpgrade(run, run.pendingCards[0]?.id ?? 'heal');
      run.hero.stats.magnet = 1000;
      tick(run, 0.25, 40);
      if (run.stageFinaleStarted) {
        const finalThreat = run.enemies.find((enemy) => enemy.kind === 'timeout_reaper');
        if (finalThreat) finalThreat.hp = 0;
      }
      elapsed += 0.25;
    }
    expect(run.bossSpawned).toBe(true);
    expect(run.phase).toBe('summary');
    expect(run.outcome).toBe('victory');
    const summary = run.summary!;
    expect(summary.heroId).toBe('warrior');
    expect(summary.heroName).toBe('Warrior');
    expect(summary.level).toBeGreaterThanOrEqual(1);
    expect(summary.tokenSource).toBe('synthetic');
    expect(summary.tokenAccuracy).toBe('exact');
    expect(summary.enemiesSpawned).toBe(run.enemiesSpawned);
    expect(summary.gold).toBe(summary.goldBreakdown.enemyKills + summary.goldBreakdown.bossChest + summary.goldBreakdown.overflow);
    expect(summary.goldBreakdown.bossChest).toBe(0);
    expect(run.pickups.filter((pickup) => pickup.kind === 'gold-chest')).toEqual([]);
  });

  it('keeps the entity pool bounded during a five-minute fixture', () => {
    const run = createRun('paladin', 99, {}, { clockScale: 60 });
    run.hero.stats.hp = 100000; run.hero.stats.maxHp = 100000;
    run.hero.stats.magnet = 1000;
    for (let index = 0; index < 1200; index += 1) {
      if (run.phase === 'summary') break;
      if (run.phase === 'level-up') chooseUpgrade(run, run.pendingCards[0]?.id ?? 'heal');
      run.hero.stats.magnet = 1000;
      tick(run, 0.25, 12);
      if (run.stageFinaleStarted) {
        const finalThreat = run.enemies.find((enemy) => enemy.kind === 'timeout_reaper');
        if (finalThreat) finalThreat.hp = 0;
      }
      if (run.phase === 'level-up') chooseUpgrade(run, run.pendingCards[0]?.id ?? 'heal');
    }
    expect(run.enemies.length).toBeLessThanOrEqual(60);
    expect(run.phase).toBe('summary');
  });
});

describe('P0 registry-driven combat foundations', () => {
  it('loads the six hero boundaries and applies their level passives', () => {
    const paladin = createRun('paladin', 1);
    expect(paladin.hero.stats.maxHp).toBe(70);
    expect(paladin.hero.stats.magnet).toBeCloseTo(40);

    const warrior = createRun('warrior', 2);
    warrior.level = 10;
    recalculateStats(warrior);
    expect(warrior.hero.stats.might).toBeCloseTo(0.1);

    const necromancer = createRun('necromancer', 3);
    necromancer.level = 20;
    recalculateStats(necromancer);
    expect(necromancer.hero.stats.amount).toBe(2);
  });

  it('exposes real level rows and supports adding a second weapon', () => {
    const run = createRun('warrior', 4);
    expect(getWeaponLevelStats(run, 'broadsword')).toMatchObject({ damage: 20, amount: 1, cooldown: 1.35 });
    run.phase = 'level-up';
    run.pendingCards = [{ id: 'weapon-upgrade:broadsword', label: 'Upgrade Broadsword', kind: 'weapon', target: 'broadsword' }];
    chooseUpgrade(run, 'weapon-upgrade:broadsword');
    expect(getWeaponLevelStats(run, 'broadsword')?.damage).toBe(25);

    run.phase = 'level-up';
    run.pendingCards = [{ id: 'weapon:arcane_bolt', label: 'Arcane Bolt', kind: 'new-weapon', target: 'arcane_bolt' }];
    chooseUpgrade(run, 'weapon:arcane_bolt');
    expect(run.weapons.map((weapon) => weapon.id)).toContain('arcane_bolt');
  });

  it('queues multiple level-ups and resolves one card per level', () => {
    const run = createRun('wizard', 5);
    for (let index = 0; index < 25; index += 1) run.pickups.push({ id: index + 1, kind: 'xp-shard', x: 0, y: 0, value: 1 });
    tick(run, 0.25, 0);
    expect(run.level).toBe(3);
    expect(run.pendingLevelUps).toBe(2);
    expect(run.phase).toBe('level-up');
    const first = run.pendingCards[0]!.id;
    chooseUpgrade(run, first);
    expect(run.pendingLevelUps).toBe(1);
    chooseUpgrade(run, run.pendingCards[0]!.id);
    expect(run.pendingLevelUps).toBe(0);
    expect(run.phase).toBe('dungeon');
  });

  it('uses contact invulnerability and cleans up spent projectiles', () => {
    const run = createRun('warrior', 6);
    run.enemies.push({ id: 77, kind: 'syntax_specter', x: 0, y: 0, hp: 28, maxHp: 28, speed: 0, damage: 3, isBoss: false, isElite: false });
    tick(run, 0.25, 0);
    const afterFirstHit = run.hero.stats.hp;
    expect(afterFirstHit).toBe(98);
    tick(run, 0.25, 0);
    expect(run.hero.stats.hp).toBe(afterFirstHit);
    tick(run, 0.25, 0);
    expect(run.hero.stats.hp).toBeLessThan(afterFirstHit);
    expect(run.projectiles.every((projectile) => projectile.remainingSeconds > 0)).toBe(true);
  });
});

describe('P1 authored Code Dungeon stage loop', () => {
  it('keeps production timing separate from the explicit accelerated fixture', () => {
    const production = createRun('warrior', 101);
    for (let index = 0; index < 4; index += 1) tick(production, 0.25, 0);
    expect(production.elapsedSeconds).toBeCloseTo(1);
    expect(production.stageFinaleStarted).toBe(false);

    const accelerated = createRun('warrior', 102, {}, { clockScale: 60 });
    tick(accelerated, 0.25, 0);
    expect(accelerated.elapsedSeconds).toBeCloseTo(15);
    expect(accelerated.stageFinaleStarted).toBe(false);
  });

  it('uses every authored wave family, off-screen placement, and bounded active pool', () => {
    const run = createRun('warrior', 103);
    const waveEnemies = ['bug_bat', 'syntax_specter', 'deprecated_zombie', 'unused_variable_phantom', 'memory_golem', 'compiler_hydra', 'infinite_loop_fiend'] as const;
    for (const enemy of waveEnemies) {
      run.enemies = [];
      const wave = ({
        bug_bat: 0, syntax_specter: 0, deprecated_zombie: 300, unused_variable_phantom: 300,
        memory_golem: 600, compiler_hydra: 600, infinite_loop_fiend: 900
      } as const)[enemy];
      run.elapsedSeconds = wave + 0.25;
      tick(run, 0.01, 0);
      expect(run.enemies.some((candidate) => candidate.kind === enemy)).toBe(true);
      const spawned = run.enemies.find((candidate) => candidate.kind === enemy)!;
      expect(Math.hypot(spawned.x - run.hero.x, spawned.y - run.hero.y)).toBeGreaterThanOrEqual(90);
    }
    run.elapsedSeconds = 1499.9;
    for (let index = 0; index < 100; index += 1) tick(run, 0.25, 0);
    expect(run.enemies.length).toBeLessThanOrEqual(60);
  });

  it('scales authored enemy health and damage with stage minutes', () => {
    const run = createRun('warrior', 104);
    run.elapsedSeconds = 0;
    tick(run, 0.01, 0);
    const early = run.enemies.find((enemy) => enemy.kind === 'bug_bat')!;
    run.enemies = [];
    run.elapsedSeconds = 600;
    tick(run, 0.01, 0);
    const later = run.enemies.find((enemy) => enemy.kind === 'memory_golem')!;
    expect(later.maxHp).toBeGreaterThan(early.maxHp);
    expect(later.damage).toBeGreaterThanOrEqual(early.damage);
  });

  it('covers final-threat victory and defeat paths', () => {
    const victory = createRun('warrior', 105);
    victory.hero.stats.hp = 100000; victory.hero.stats.maxHp = 100000; victory.hero.stats.magnet = 1000;
    victory.elapsedSeconds = 1799.9;
    tick(victory, 0.25, 0);
    const victoryThreat = victory.enemies.find((enemy) => enemy.kind === 'timeout_reaper')!;
    victoryThreat.hp = 0;
    tick(victory, 0.25, 0);
    expect(victory.stageFinaleStarted).toBe(true);
    expect(victory.outcome).toBe('victory');

    const defeat = createRun('warrior', 106);
    defeat.hero.stats.hp = 1; defeat.hero.stats.maxHp = 1; defeat.hero.stats.armor = 0;
    defeat.elapsedSeconds = 1799.9;
    tick(defeat, 0.25, 0);
    const defeatThreat = defeat.enemies.find((enemy) => enemy.kind === 'timeout_reaper')!;
    defeatThreat.x = defeat.hero.x; defeatThreat.y = defeat.hero.y;
    tick(defeat, 0.25, 0);
    expect(defeat.stageFinaleStarted).toBe(true);
    expect(defeat.outcome).toBe('defeat');
  });
});

describe('P2 pickups, treasure, and evolution', () => {
  it('keeps gem XP and gold collection-owned and preserves tier values', () => {
    const run = createRun('warrior', 201);
    run.pickups.push(
      { id: 1, kind: 'xp-shard', x: 0, y: 0, value: 1 },
      { id: 2, kind: 'xp-crystal', x: 0, y: 0, value: 5 },
      { id: 3, kind: 'xp-orb', x: 0, y: 0, value: 12 }
    );
    tick(run, 0.01, 0);
    expect(run.gold).toBe(18);
    expect(run.pickups.filter((pickup) => pickup.kind.startsWith('xp-'))).toEqual([]);

    const pending = createRun('warrior', 202);
    pending.pickups.push({ id: 1, kind: 'xp-orb', x: 100, y: 0, value: 12 });
    tick(pending, 0.01, 0);
    expect(pending.gold).toBe(0);
    expect(pending.xp).toBe(0);
    expect(pending.pickups).toHaveLength(1);
    pending.hero.x = 100;
    tick(pending, 0.01, 0);
    expect(pending.gold).toBe(12);
    expect(pending.level).toBe(2);
    expect(pending.xp).toBe(7);
  });

  it('condenses excess XP gems into one lossless token core', () => {
    const run = createRun('warrior', 203);
    for (let index = 0; index < 401; index += 1) run.pickups.push({ id: index + 1, kind: 'xp-shard', x: 100, y: 0, value: 1 });
    tick(run, 0.01, 0);
    const xp = run.pickups.filter((pickup) => pickup.kind === 'xp-shard' || pickup.kind === 'xp-crystal' || pickup.kind === 'xp-orb' || pickup.kind === 'token-core');
    expect(xp).toHaveLength(400);
    expect(xp.find((pickup) => pickup.kind === 'token-core')?.value).toBe(2);
    expect(xp.reduce((sum, pickup) => sum + pickup.value, 0)).toBe(401);
  });

  it('applies tactical floor pickup effects without granting unrelated rewards', () => {
    const run = createRun('warrior', 204);
    run.hero.stats.hp = 50;
    run.enemies.push({ id: 90, kind: 'syntax_specter', x: 40, y: 0, hp: 15, maxHp: 15, speed: 0, damage: 1, isBoss: false, isElite: false });
    run.pickups.push(
      { id: 1, kind: 'mana-roast', x: 0, y: 0, value: 30 },
      { id: 2, kind: 'chrono-stasis', x: 0, y: 0, value: 0 },
      { id: 3, kind: 'mana-magnet', x: 0, y: 0, value: 0 },
      { id: 4, kind: 'xp-shard', x: 40, y: 0, value: 1 }
    );
    tick(run, 0.01, 0);
    expect(run.hero.stats.hp).toBe(80);
    expect(run.enemies[0]?.frozenRemaining).toBeGreaterThan(9);
    expect(run.gold).toBe(1);
    expect(run.enemies.some((enemy) => enemy.id === 90)).toBe(true);

    const cleanser = createRun('warrior', 205);
    cleanser.enemies.push({ id: 91, kind: 'syntax_specter', x: 0, y: 0, hp: 15, maxHp: 15, speed: 0, damage: 1, isBoss: false, isElite: false });
    cleanser.pickups.push({ id: 1, kind: 'arcane-cleanser', x: 0, y: 0, value: 0 });
    tick(cleanser, 0.01, 0);
    expect(cleanser.enemies).toEqual([]);
    expect(cleanser.pickups.some((pickup) => pickup.kind === 'xp-shard')).toBe(true);
  });

  it('evolves an eligible maxed weapon only from a late collected chest', () => {
    const run = createRun('warrior', 206);
    run.elapsedSeconds = 600;
    run.weapons[0]!.level = 8;
    run.passives.heart_of_vitality = 1;
    run.pickups.push({ id: 1, kind: 'gold-chest', x: 0, y: 0, value: 100 });
    tick(run, 0.01, 0);
    expect(run.weapons[0]).toMatchObject({ id: 'excalibur', level: 1, cooldownRemaining: 0 });
    expect(run.gold).toBe(100);
    expect(run.treasureHistory).toEqual(['evolution:broadsword:excalibur']);

    const early = createRun('warrior', 207);
    early.elapsedSeconds = 599;
    early.weapons[0]!.level = 8;
    early.passives.heart_of_vitality = 1;
    early.pickups.push({ id: 1, kind: 'gold-chest', x: 0, y: 0, value: 100 });
    tick(early, 0.01, 0);
    expect(early.weapons[0]?.id).toBe('broadsword');
    expect(early.treasureHistory[0]).toMatch(/^chest:/);
  });

  it('guards chest ownership, handles missing requirements, and records no-item fallbacks', () => {
    const missingPassive = createRun('warrior', 208);
    missingPassive.elapsedSeconds = 600;
    missingPassive.weapons[0]!.level = 8;
    expect(openTreasureChest(missingPassive)).toMatch(/^chest:/);
    expect(missingPassive.weapons[0]?.id).toBe('broadsword');

    const duplicate = createRun('warrior', 209);
    duplicate.elapsedSeconds = 600;
    duplicate.pickups.push({ id: 1, kind: 'gold-chest', x: 0, y: 0, value: 100 }, { id: 1, kind: 'gold-chest', x: 0, y: 0, value: 100 });
    tick(duplicate, 0.01, 0);
    expect(duplicate.gold).toBe(100);
    expect(duplicate.treasureHistory).toHaveLength(1);

    const none = createRun('warrior', 210);
    none.elapsedSeconds = 600;
    none.weapons = [
      { id: 'excalibur', level: 1, cooldownRemaining: 0 }, { id: 'archmage_staff', level: 1, cooldownRemaining: 0 },
      { id: 'thousand_blades', level: 1, cooldownRemaining: 0 }, { id: 'no_future', level: 1, cooldownRemaining: 0 },
      { id: 'sanctuary', level: 1, cooldownRemaining: 0 }, { id: 'bone_throw', level: 8, cooldownRemaining: 0 }
    ];
    for (const id of ['power_gauntlets', 'iron_armor', 'heart_of_vitality', 'phoenix_amulet', 'haste_amulet', 'orb_of_expansion']) none.passives[id] = 5;
    expect(openTreasureChest(none)).toBe('chest:no-eligible-item');
  });

  it('carries treasure rewards into the run summary', () => {
    const run = createRun('warrior', 211);
    run.treasureHistory.push('evolution:broadsword:excalibur');
    finishRun(run, 'victory');
    expect(run.summary?.treasureRewards).toEqual(['evolution:broadsword:excalibur']);
  });
});
