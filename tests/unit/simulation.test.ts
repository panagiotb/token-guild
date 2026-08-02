import { describe, expect, it } from 'vitest';
import { calculateAuraRadius, calculateCooldown, calculateDamage, calculateEnemyMoveSpeed, calculatePickupHealing, calculateProjectileArea, calculateProjectileLifetime, calculateRetaliatoryDamage, calculateWeaponAmount, getOwnedItemChoiceChance, getThresholdGrowthBonus, getXpRequiredForLevel } from '../../src/game/math';
import { applyTokenInput, banishLevelUpCard, chooseUpgrade, createRun, declineRevival, finishRun, getBaseWeaponIds, getBossTimeSeconds, getHeroMoveSpeed, getWeaponLevelStats, openTreasureChest, pickupKindForXp, recalculateStats, rerollLevelUp, resolveEliteDrop, resolveLightSourceDrop, reviveRun, setRunPaused, skipLevelUp, tick } from '../../src/game/simulation';
import { MVP_REGISTRY } from '../../src/game/content';
import { SIMULATION_POLICIES } from '../../src/game/policies';
import { META_UPGRADES } from '../../src/game/meta';
import { goldBreakdownTotal } from '../../src/game/types';
import { isUpgradeCardEligible } from '../../src/game/upgradeEligibility';
import { WORLD_POLICIES } from '../../src/game/worldPolicies';

describe('deterministic game math', () => {
  it('uses the mapped XP curve and keeps combat independent from tokens', () => {
    expect([1, 2, 3, 19, 20, 21, 39, 40, 41].map(getXpRequiredForLevel)).toEqual([5, 15, 25, 185, 795, 267, 501, 2914, 648]);
    expect(getThresholdGrowthBonus(20)).toBe(1);
    expect(getThresholdGrowthBonus(21)).toBe(0);
    expect(getThresholdGrowthBonus(40)).toBe(1);
    expect(getThresholdGrowthBonus(41)).toBe(0);
    expect(calculateDamage(20, { hp: 100, maxHp: 100, armor: 0, moveSpeed: 1, might: 0.1, area: 0, speed: 0, cooldown: 0, amount: 1, magnet: 1, growth: 0 }, 39)).toBe(22);
    expect(calculateDamage(20, { hp: 100, maxHp: 100, armor: 0, moveSpeed: 1, might: 0.1, area: 0, speed: 0, cooldown: 0, amount: 1, magnet: 1, growth: 0 }, 400)).toBe(22);
    expect(calculatePickupHealing(30, { hp: 50, maxHp: 200, armor: 0, moveSpeed: 40, might: 0, area: 0, speed: 0, cooldown: 0, amount: 1, magnet: 32, growth: 0, recovery: 1 })).toBe(60);
    expect(calculatePickupHealing(30, { hp: 50, maxHp: 200, armor: 0, moveSpeed: 40, might: 0, area: 0, speed: 0, cooldown: 0, amount: 1, magnet: 32, growth: 0, recovery: Number.NaN })).toBe(30);
    expect(() => calculatePickupHealing(-1, { hp: 1, maxHp: 1, armor: 0, moveSpeed: 40, might: 0, area: 0, speed: 0, cooldown: 0, amount: 1, magnet: 32, growth: 0 })).toThrow();
    expect(calculateRetaliatoryDamage(30, 1)).toBe(33);
    expect(calculateRetaliatoryDamage(30, 100)).toBe(180);
    expect(calculateRetaliatoryDamage(30, Number.NaN)).toBe(30);
    expect(() => calculateRetaliatoryDamage(-1, 1)).toThrow();
  });

  it('resolves source-backed owned-item level-up chance by parity and Luck', () => {
    expect(getOwnedItemChoiceChance(1, 0)).toBeCloseTo(0.3);
    expect(getOwnedItemChoiceChance(2, 0)).toBeCloseTo(0.6);
    expect(getOwnedItemChoiceChance(1, 1)).toBeCloseTo(0.8);
    expect(getOwnedItemChoiceChance(2, 1)).toBe(1);
    expect(getOwnedItemChoiceChance(2, 1_000_000)).toBe(1);
    expect(() => getOwnedItemChoiceChance(0, 0)).toThrow();
    expect(() => getOwnedItemChoiceChance(1, Number.NaN)).toThrow();
  });

  it('applies and then removes the source-backed Growth threshold bonus', () => {
    const level20 = createRun('warrior', 600);
    level20.level = 20;
    recalculateStats(level20);
    expect(level20.hero.stats.growth).toBeCloseTo(1);

    const level21 = createRun('warrior', 601);
    level21.level = 21;
    recalculateStats(level21);
    expect(level21.hero.stats.growth).toBeCloseTo(0);

    const level40 = createRun('warrior', 602);
    level40.level = 40;
    recalculateStats(level40);
    expect(level40.hero.stats.growth).toBeCloseTo(1);

    const level41 = createRun('warrior', 603);
    level41.level = 41;
    recalculateStats(level41);
    expect(level41.hero.stats.growth).toBeCloseTo(0);
  });

  it('normalizes derived Amount to the source-backed character bonus cap', () => {
    const run = createRun('warrior', 603);
    run.hero.baseStats.amount = 99;
    run.hero.baseStats.might = 99;
    run.hero.baseStats.area = 99;
    run.hero.baseStats.speed = 99;
    run.hero.baseStats.duration = 99;
    recalculateStats(run);
    expect(run.hero.stats.amount).toBe(11);
    expect(run.hero.stats.might).toBe(9);
    expect(run.hero.stats.area).toBe(9);
    expect(run.hero.stats.speed).toBe(4);
    expect(run.hero.stats.duration).toBe(4);
  });

  it('projects exposed weapon stats through the shared formula boundary', () => {
    const stats = { hp: 100, maxHp: 100, armor: 0, moveSpeed: 40, might: 0, area: 0.5, speed: 0, cooldown: 0, amount: 2, magnet: 32, growth: 0, duration: 0.25 };
    expect(calculateWeaponAmount(1, stats)).toBe(2);
    expect(calculateWeaponAmount(2, stats)).toBe(3);
    expect(calculateProjectileArea(1, stats)).toBeCloseTo(7.5);
    expect(calculateAuraRadius(10, stats)).toBeCloseTo(15);
    expect(calculateProjectileLifetime(2, stats)).toBeCloseTo(2.5);
    expect(calculateCooldown(1, { ...stats, cooldown: 0.95 })).toBeCloseTo(0.1);
    expect(calculateWeaponAmount(0, { ...stats, amount: 999 })).toBe(1);
    expect(calculateWeaponAmount(2, { ...stats, amount: 1 })).toBe(2);
    expect(calculateProjectileLifetime(-1, stats)).toBe(0.05);
  });
});

describe('deterministic run simulation', () => {
  it('pauses and resumes the domain without advancing time, battery, or movement', () => {
    const run = createRun('warrior', 700);
    run.battery = { ...run.battery, currentCapacity: 20 };
    setRunPaused(run, true);
    const before = { elapsed: run.elapsedSeconds, x: run.hero.x, capacity: run.battery.currentCapacity };
    tick(run, 1, 0, { up: false, down: false, left: false, right: true });
    expect(run.paused).toBe(true);
    expect(run.elapsedSeconds).toBe(before.elapsed);
    expect(run.hero.x).toBe(before.x);
    expect(run.battery.currentCapacity).toBe(before.capacity);
    setRunPaused(run, false);
    tick(run, 0.25, 0, { up: false, down: false, left: false, right: true });
    expect(run.paused).toBe(false);
    expect(run.elapsedSeconds).toBeGreaterThan(before.elapsed);
    expect(run.hero.x).toBeGreaterThan(before.x);
  });

  it('rejects pause transitions outside active dungeon play', () => {
    const run = createRun('warrior', 701);
    run.phase = 'level-up';
    expect(() => setRunPaused(run, true)).toThrow('Pause is only available');
  });

  it('sums every optional and required gold ledger source', () => {
    expect(goldBreakdownTotal({ enemyKills: 2, eliteDrops: 3, bossChest: 5, overflow: 7, lightSources: 11, stageCompletion: 13, levelUp: 17 })).toBe(58);
    expect(goldBreakdownTotal({ enemyKills: 2, bossChest: 5, overflow: 7 })).toBe(14);
  });

  it('maps XP values to the documented blue, green, and red gem tiers', () => {
    expect(pickupKindForXp(2)).toBe('xp-shard');
    expect(pickupKindForXp(3)).toBe('xp-crystal');
    expect(pickupKindForXp(9)).toBe('xp-crystal');
    expect(pickupKindForXp(10)).toBe('xp-orb');
    expect(pickupKindForXp(Number.NaN)).toBe('xp-shard');
  });

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
    expect(run.hero.invulnerabilityRemaining).toBe(0.5);
    expect(run.upgradeHistory).toEqual([chosen.id]);
    expect(run.goldBreakdown.enemyKills).toBe(0);
    expect(getHeroMoveSpeed(run, 40)).toBe(run.hero.stats.moveSpeed);

    // The transition protection is active immediately after the card closes,
    // then normal contact damage resumes after the authored window.
    run.enemies = [{ id: 999, kind: 'bug_bat', x: run.hero.x, y: run.hero.y, hp: 100, maxHp: 100, speed: 0, damage: 10, isBoss: false, isElite: false }];
    run.projectiles = [];
    run.weapons[0]!.cooldownRemaining = 999;
    run.hero.stats.hp = run.hero.stats.maxHp;
    tick(run, 0.02, 0);
    expect(run.hero.stats.hp).toBe(run.hero.stats.maxHp);
    tick(run, 0.5, 0);
    expect(run.hero.stats.hp).toBeLessThan(run.hero.stats.maxHp);
  });

  it('keeps additive telemetry provenance instead of overwriting the source', () => {
    const run = createRun('warrior', 43);
    applyTokenInput(run, { source: 'synthetic', accuracy: 'exact', count: 10, outputTokens: 10, tokensPerSecond: 100 });
    applyTokenInput(run, { source: 'otlp', accuracy: 'estimated', count: 8, outputTokens: 5, inputTokens: 30, cacheTokens: 100, tokensPerSecond: 8 });
    expect(run.tokenSource).toBe('otlp');
    expect(run.tokenLedger.synthetic.outputTokens).toBe(10);
    expect(run.tokenLedger.otlp).toMatchObject({ outputTokens: 5, inputTokens: 30, cacheTokens: 100, events: 1, estimatedEvents: 1 });
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
    expect(run.phase).toBe('dungeon');
    for (let index = 0; index < 6; index += 1) tick(run, 0.25, 0);
    tick(run, 0.01, 0);
    expect(run.phase).toBe('summary');
    expect(run.gold).toBeGreaterThanOrEqual(60);
    expect(run.gold).toBeLessThanOrEqual(500);
    expect(run.goldBreakdown.bossChest).toBe(run.gold);
    expect(run.goldBreakdown.stageCompletion).toBe(0);
    expect(run.pickups).toEqual([]);
    expect(run.summary?.gold).toBe(run.gold);
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
    for (let index = 0; index < 6; index += 1) tick(run, 0.25, 0);
    tick(run, 0.01, 0);
    expect(run.phase).toBe('summary');
    expect(run.gold).toBeGreaterThanOrEqual(60);
    expect(run.gold).toBeLessThanOrEqual(500);
    expect(run.pickups).toEqual([]);
  });

  it('claims each chest by pickup identity and keeps duplicate collection idempotent', () => {
    const run = createRun('warrior', 34);
    run.pickups.push({ id: 501, kind: 'gold-chest', x: 0, y: 0, value: 100 }, { id: 502, kind: 'gold-chest', x: 0, y: 0, value: 100 });
    tick(run, 0.25, 0);
    expect(run.claimedChestIds).toEqual([501, 502]);
    expect(run.goldBreakdown.bossChest).toBeGreaterThanOrEqual(120);
    expect(run.goldBreakdown.bossChest).toBeLessThanOrEqual(1000);
    run.pickups.push({ id: 501, kind: 'gold-chest', x: 0, y: 0, value: 100 });
    tick(run, 0.25, 0);
    expect(run.goldBreakdown.bossChest).toBe(run.chestGoldRewards['501']! + run.chestGoldRewards['502']!);
  });

  it('uses stage-owned chest checks and multiplies each tier chance by total Luck', () => {
    const tiers = new Set<1 | 3 | 5>();
    for (let seed = 1; seed <= 5000; seed += 1) {
      const run = createRun('warrior', seed);
      openTreasureChest(run);
      tiers.add(run.chestRewardTiers['legacy-boss'] as 1 | 3 | 5);
    }
    expect(tiers).toEqual(new Set([1, 3, 5]));

    // Find a deterministic roll that is outside the base 1% five-item
    // chance but inside the 2% chance after a +100% Luck bonus. The same
    // seed must therefore resolve to the fallback/three-item path at zero
    // Luck and the five-item path at +100% Luck.
    let discriminatingSeed: number | undefined;
    for (let seed = 1; seed <= 100000 && discriminatingSeed === undefined; seed += 1) {
      const base = createRun('warrior', seed);
      openTreasureChest(base);
      const boosted = createRun('warrior', seed);
      boosted.hero.stats.luck = 1;
      openTreasureChest(boosted);
      if (base.chestRewardTiers['legacy-boss'] !== 5 && boosted.chestRewardTiers['legacy-boss'] === 5) discriminatingSeed = seed;
    }
    expect(discriminatingSeed).toBeDefined();
  });

  it('credits XP only when its gem is collected', () => {
    const collected = createRun('warrior', 25);
    collected.enemies.push({ id: 1, kind: 'syntax_specter', x: 0, y: 0, hp: 0, maxHp: 28, speed: 0, damage: 0, isBoss: false, isElite: false });
    tick(collected, 0.25, 0);
    expect(collected.gold).toBe(0);
    expect(collected.xp).toBe(1);
    expect(collected.pickups).toEqual([]);

    const pending = createRun('warrior', 26);
    pending.enemies.push({ id: 1, kind: 'syntax_specter', x: 100, y: 0, hp: 0, maxHp: 28, speed: 0, damage: 0, isBoss: false, isElite: false });
    tick(pending, 0.25, 0);
    expect(pending.gold).toBe(0);
    expect(pending.xp).toBe(0);
    expect(pending.pickups).toEqual([expect.objectContaining({ kind: 'xp-shard', value: 1 })]);
  });

  it('attracts nearby pickups through the magnet field before collection', () => {
    const run = createRun('warrior', 26);
    run.hero.stats.magnet = 40;
    run.pickups.push({ id: 900, kind: 'xp-shard', x: 35, y: 0, value: 2 });
    tick(run, 0.05, 0);
    expect(run.pickups[0]?.x).toBeLessThan(35);
    expect(run.xp).toBe(0);
    tick(run, 0.25, 0);
    expect(run.pickups.some((pickup) => pickup.id === 900)).toBe(false);
    expect(run.xp).toBe(2);
  });

  it('never creates gameplay gold from battery overflow', () => {
    const run = createRun('warrior', 27);
    applyTokenInput(run, { count: 10000, outputTokens: 10000, tokensPerSecond: 10, isAgentActive: true });
    tick(run, 0.25, 10);
    const coin = run.pickups.find((pickup) => pickup.kind === 'gold-coin');
    expect(coin).toBeUndefined();
    expect(run.gold).toBe(0);
    tick(run, 0.25, 10);
    expect(run.gold).toBe(0);
    expect(run.goldBreakdown.overflow).toBe(0);
  });

  it('creates destructible light sources outside the hero and pays only after a drop is collected', () => {
    const run = createRun('warrior', 271);
    run.elapsedSeconds = 15;
    tick(run, 0.01, 0);
    const source = run.lightSources[0];
    expect(source).toBeDefined();
    expect(run.gold).toBe(0);
    expect(run.goldBreakdown.lightSources).toBe(0);
    expect(Math.hypot(source!.x - run.hero.x, source!.y - run.hero.y)).toBeGreaterThanOrEqual(150);

    source!.hp = 0;
    tick(run, 0.01, 0);
    const tacticalKinds = new Set(['mana-roast', 'mana-magnet', 'chrono-stasis', 'arcane-cleanser']);
    const drop = run.pickups.find((pickup) => pickup.goldSource === 'lightSources' || tacticalKinds.has(pickup.kind));
    expect(drop).toBeDefined();
    expect(run.gold).toBe(0);
    expect(run.lightSources.some((candidate) => candidate.id === source!.id)).toBe(false);
    if (tacticalKinds.has(drop!.kind)) {
      run.hero.x = drop!.x;
      run.hero.y = drop!.y;
      tick(run, 0.01, 0);
      expect(run.gold).toBe(0);
      return;
    }
    run.hero.x = drop!.x;
    run.hero.y = drop!.y;
    tick(run, 0.01, 0);
    expect(run.gold).toBeGreaterThan(0);
    expect(run.gold).toBe(run.goldBreakdown.lightSources);
    expect(run.pickups.some((pickup) => pickup.id === drop!.id)).toBe(false);
  });

  it('uses the authored light-source weights and minimum-level gates', () => {
    const early = createRun('warrior', 273);
    const earlyKinds = new Set<string>();
    for (let sample = 0; sample < 64; sample += 1) {
      early.seed = Math.floor(((sample + 0.5) / 64) * 0xffffffff) >>> 0;
      earlyKinds.add(resolveLightSourceDrop(early).kind);
    }
    expect(earlyKinds).toEqual(new Set(['gold-coin', 'gold-sack', 'mana-roast']));

    const late = createRun('warrior', 274);
    late.level = 12;
    const lateKinds = new Set<string>();
    for (let sample = 0; sample < 256; sample += 1) {
      late.seed = Math.floor(((sample + 0.5) / 256) * 0xffffffff) >>> 0;
      lateKinds.add(resolveLightSourceDrop(late).kind);
    }
    expect(lateKinds).toEqual(new Set(['gold-coin', 'gold-sack', 'gold-hoard', 'arcane-cleanser', 'chrono-stasis', 'mana-magnet', 'mana-roast']));
  });

  it('uses the validated elite table without granting a drop outside its chance', () => {
    const run = createRun('warrior', 276);
    const kinds = new Set<string>();
    let noDrop = false;
    for (let seed = 1; seed <= 100000; seed += 1) {
      run.seed = seed;
      const result = resolveEliteDrop(run);
      if (result) kinds.add(result.kind);
      else noDrop = true;
    }
    expect(kinds).toEqual(new Set(['mana-roast', 'mana-magnet', 'chrono-stasis', 'arcane-cleanser', 'gold-sack']));
    expect(noDrop).toBe(true);
  });

  it('draws elite reward selection independently after the chance gate', () => {
    // The first roll is inside the 38% drop chance and the second is in the
    // final gold-sack weight bucket. Reusing the first roll would select an
    // early tactical entry instead, so this locks the two-check contract.
    const run = createRun('warrior', 3594602695);
    expect(resolveEliteDrop(run)).toEqual({ kind: 'gold-sack', valueMultiplier: 2 });
  });

  it('applies Greed once at collection and preserves the authored gold source', () => {
    const run = createRun('warrior', 277, { greed: 1 });
    run.pickups.push({ id: 901, kind: 'gold-sack', x: 0, y: 0, value: 10, goldSource: 'lightSources' });
    tick(run, 0.01, 0);
    expect(run.gold).toBe(11);
    expect(run.goldBreakdown.lightSources).toBe(11);
    expect(run.goldBreakdown.enemyKills).toBe(0);
  });

  it('preserves negative Greed modifiers as a reduced positive gold multiplier', () => {
    const run = createRun('warrior', 279);
    run.hero.stats.greed = -0.5;
    run.pickups.push({ id: 903, kind: 'gold-sack', x: 0, y: 0, value: 10, goldSource: 'lightSources' });
    tick(run, 0.01, 0);
    expect(run.gold).toBe(5);
    expect(run.goldBreakdown.lightSources).toBe(5);
  });

  it('credits elite gold drops to the elite source ledger, never enemy kills', () => {
    const run = createRun('warrior', 278, { greed: 1 });
    run.pickups.push({ id: 902, kind: 'gold-sack', x: 0, y: 0, value: 10, goldSource: 'eliteDrops' });
    tick(run, 0.01, 0);
    expect(run.gold).toBe(11);
    expect(run.goldBreakdown.eliteDrops).toBe(11);
    expect(run.goldBreakdown.enemyKills).toBe(0);
  });

  it('attempts light-source spawns at one-second cadence and replaces with a closest-ring source at the cap', () => {
    const run = createRun('warrior', 275);
    run.elapsedSeconds = 1;
    run.seed = 1972;
    run.nextEntityId = 100;
    run.weapons[0]!.cooldownRemaining = 100;
    run.enemies = Array.from({ length: SIMULATION_POLICIES.maxEnemies }, (_, index) => ({ id: index + 1, kind: 'bug_bat' as const, x: 1000, y: 1000, hp: 10, maxHp: 10, speed: 0, damage: 0, isBoss: false, isElite: false }));
    run.lightSources = Array.from({ length: 10 }, (_, index) => ({ id: index + 1, x: index, y: 0, hp: 10, maxHp: 10 }));
    tick(run, 0.01, 0);
    expect(run.waveSpawnCounts['light-source-attempts']).toBe(1);
    expect(run.lightSources).toHaveLength(10);
    expect(run.lightSources.some((source) => source.id === 1)).toBe(false);
    const replacement = run.lightSources.find((source) => source.id === 100);
    expect(replacement).toBeDefined();
    expect(Math.hypot(replacement!.x - run.hero.x, replacement!.y - run.hero.y)).toBeCloseTo(230, 6);
    expect(run.lightSources.every((source) => source.hp === source.maxHp)).toBe(true);
  });

  it('does not let Luck increase a light-source attempt while the source cap is full', () => {
    const makeAtCapacityRun = (luck: number) => {
      const run = createRun('warrior', 275, { luck });
      run.elapsedSeconds = 1;
      run.seed = 1972;
      run.nextEntityId = 100;
      run.weapons[0]!.cooldownRemaining = 100;
      // Keep wave scheduling from consuming RNG so the two runs exercise the
      // same light-source attempt and replacement path.
      run.enemies = Array.from({ length: SIMULATION_POLICIES.maxEnemies }, (_, index) => ({ id: index + 1, kind: 'bug_bat' as const, x: 1000, y: 1000, hp: 10, maxHp: 10, speed: 0, damage: 0, isBoss: false, isElite: false }));
      run.lightSources = Array.from({ length: SIMULATION_POLICIES.maxLightSources }, (_, index) => ({ id: index + 1, x: index, y: 0, hp: 10, maxHp: 10 }));
      return run;
    };

    const noLuck = makeAtCapacityRun(0);
    const highLuck = makeAtCapacityRun(100);
    tick(noLuck, 0.01, 0);
    tick(highLuck, 0.01, 0);
    expect(highLuck.lightSources).toEqual(noLuck.lightSources);
    expect(highLuck.waveSpawnCounts['light-source-attempts']).toBe(1);
  });

  it('lets projectiles destroy a light source exactly once', () => {
    const run = createRun('wizard', 272);
    const source = { id: 700, x: 100, y: 0, hp: 5, maxHp: 10 };
    run.lightSources.push(source);
    run.weapons[0]!.cooldownRemaining = 100;
    run.projectiles.push({ id: 701, weaponId: run.weapons[0]!.id, x: 100, y: 0, vx: 0, vy: 0, damage: 10, area: 5, remainingPierce: 0, remainingSeconds: 1, knockback: 0, hitEnemyIds: [] });
    tick(run, 0.01, 0);
    expect(run.lightSources).toEqual([]);
    expect(run.pickups.length).toBe(1);
    const drop = run.pickups[0]!;
    run.hero.x = drop.x;
    run.hero.y = drop.y;
    tick(run, 0.01, 0);
    const goldAfterCollection = run.gold;
    tick(run, 0.01, 0);
    expect(run.gold).toBe(goldAfterCollection);
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

  it('preserves escape headroom for base and fully agile heroes', () => {
    const baseSpeed = getHeroMoveSpeed(createRun('warrior'));
    const agileSpeed = getHeroMoveSpeed(createRun('warrior', 1, { agility: 2 }));
    expect(baseSpeed).toBe(40);
    expect(agileSpeed).toBe(44);
    expect(calculateEnemyMoveSpeed(10, 120, 0.05)).toBe(11);

    const stage = MVP_REGISTRY.stages.find((candidate) => candidate.id === 'code-dungeon')!;
    for (const wave of stage.waves) {
      const enemy = MVP_REGISTRY.enemies.find((candidate) => candidate.id === wave.enemy)!;
      const latestSpawn = Math.max(wave.fromSecond, wave.untilSecond - 0.001);
      const scaledSpeed = calculateEnemyMoveSpeed(enemy.speed, latestSpawn);
      if (wave.fromSecond === 0) expect(scaledSpeed, `${enemy.name} opening speed`).toBeLessThan(baseSpeed);
      expect(scaledSpeed, `${enemy.name} speed with maximum Agility`).toBeLessThan(agileSpeed);
    }
  });

  it('keeps the first-stage accelerated checkpoints bounded and deterministic', () => {
    const checkpoints = [0, 1, 300, 600, 900, 1200, 1500, 1800] as const;
    const runTo = (seed: number): Map<number, { elapsed: number; enemies: number; spawned: number; finale: boolean }> => {
      const run = createRun('warrior', seed);
      run.hero.invulnerabilityRemaining = Number.POSITIVE_INFINITY;
      const snapshots = new Map<number, { elapsed: number; enemies: number; spawned: number; finale: boolean }>();
      for (const checkpoint of checkpoints) {
        let iterations = 0;
        while (run.elapsedSeconds < checkpoint) {
          if (run.phase === 'level-up') {
            const card = run.pendingCards[0];
            if (card) chooseUpgrade(run, card.id);
            continue;
          }
          if (run.phase !== 'dungeon') break;
          applyTokenInput(run, { count: 25, outputTokens: 25, tokensPerSecond: 100, isAgentActive: true });
          tick(run, 0.25, 0);
          iterations += 1;
          if (iterations > checkpoint * 8 + 100) throw new Error(`checkpoint did not advance: ${checkpoint}`);
        }
        snapshots.set(checkpoint, { elapsed: run.elapsedSeconds, enemies: run.enemies.length, spawned: run.enemiesSpawned, finale: run.stageFinaleStarted });
        expect(run.enemies.length).toBeLessThanOrEqual(SIMULATION_POLICIES.maxEnemies);
        expect(run.projectiles.length).toBeLessThanOrEqual(240);
        expect(run.pickups.length).toBeLessThanOrEqual(512);
      }
      return snapshots;
    };
    const first = runTo(510);
    const replay = runTo(510);
    expect(replay).toEqual(first);
    expect(first.get(0)?.elapsed).toBe(0);
    expect(first.get(1800)?.finale, JSON.stringify(first.get(1800))).toBe(true);
    expect(first.get(1800)?.spawned).toBeGreaterThan(0);
  });

  it('uses a bounded deterministic weave for authored wavy enemies', () => {
    const run = createRun('warrior', 303);
    run.enemies.push({ id: 1, kind: 'syntax_specter', x: 100, y: 0, hp: 100, maxHp: 100, speed: 20, damage: 0, isBoss: false, isElite: false, movementPattern: 'wavy', movementPhase: 0 });
    tick(run, 0.1, 0);
    const first = { ...run.enemies[0]! };
    expect(first.x).toBeLessThan(100);
    expect(first.y).not.toBe(0);
    const replay = createRun('warrior', 303);
    replay.enemies.push({ id: 1, kind: 'syntax_specter', x: 100, y: 0, hp: 100, maxHp: 100, speed: 20, damage: 0, isBoss: false, isElite: false, movementPattern: 'wavy', movementPhase: 0 });
    tick(replay, 0.1, 0);
    expect(replay.enemies[0]).toEqual(first);
    expect(Math.hypot(first.x - 100, first.y)).toBeCloseTo(2, 2);
  });

  it('applies a normalized input snapshot inside the deterministic simulation', () => {
    const run = createRun('warrior', 30);
    tick(run, 0.25, 0, { up: true, down: false, left: false, right: true });
    expect(run.hero.x).toBeCloseTo(10 / Math.sqrt(2));
    expect(run.hero.y).toBeCloseTo(-10 / Math.sqrt(2));
    const pausedPosition = { ...run.hero };
    tick(run, 0.25, 0, { up: false, down: false, left: false, right: false });
    expect(run.hero.x).toBeCloseTo(pausedPosition.x);
    expect(run.hero.y).toBeCloseTo(pausedPosition.y);
  });

  it('replays identical state across regular and irregular render cadences', () => {
    const regular = createRun('wizard', 302);
    const irregular = createRun('wizard', 302);
    const event = { source: 'synthetic' as const, accuracy: 'exact' as const, timestampMs: 250, count: 25, outputTokens: 25, tokensPerSecond: 100, confidence: 1, isAgentActive: true };
    applyTokenInput(regular, event);
    applyTokenInput(irregular, event);
    tick(regular, 0.25, 0, { up: false, down: false, left: false, right: true });
    tick(irregular, 0.13, 0, { up: false, down: false, left: false, right: true });
    tick(irregular, 0.12, 0, { up: false, down: false, left: false, right: true });
    expect(irregular).toEqual(regular);
  });

  it('applies exposed economy and survival stats in the simulation', () => {
    const greedy = createRun('warrior', 31, { greed: 5 });
    greedy.enemies.push({ id: 1, kind: 'syntax_specter', x: 0, y: 0, hp: 0, maxHp: 28, speed: 0, damage: 0, isBoss: false, isElite: false });
    tick(greedy, 0.25, 0);
    expect(greedy.gold).toBe(0);

    const cursed = createRun('warrior', 32, { curse: 5 });
    tick(cursed, 0.25, 0);
    expect(cursed.enemies[0]?.maxHp).toBeGreaterThan(5);

    const revived = createRun('warrior', 33, { revival: 1 });
    revived.enemies.push({ id: 1, kind: 'terminal_exit_boss', x: 0, y: 0, hp: 9999, maxHp: 9999, speed: 0, damage: 999, isBoss: true, isElite: false });
    tick(revived, 0.25, 0);
    expect(revived.phase).toBe('revival');
    expect(revived.revivalsRemaining).toBe(1);
    reviveRun(revived);
    expect(revived.phase).toBe('dungeon');
    expect(revived.revivalsRemaining).toBe(0);
    expect(revived.hero.stats.hp).toBeGreaterThan(0);
    expect(revived.revivalsUsed).toBe(1);
    recalculateStats(revived);
    expect(revived.revivalsRemaining).toBe(0);
  });

  it('keeps directional weapons on the hero facing while targeted weapons track enemies', () => {
    const daggers = createRun('rogue', 360);
    daggers.weapons[0]!.cooldownRemaining = 0;
    daggers.enemies = [{ id: 900, kind: 'syntax_specter', x: -100, y: 0, hp: 100, maxHp: 100, speed: 0, damage: 0, isBoss: false, isElite: false }];
    tick(daggers, 0.01, 0);
    expect(daggers.projectiles.at(-1)!.vx).toBeGreaterThan(0);

    // Finish the queued second dagger before starting a new cooldown cycle.
    tick(daggers, 0.1, 0);
    daggers.weapons[0]!.cooldownRemaining = 0;
    tick(daggers, 0.01, 0, { up: false, down: false, left: true, right: false });
    expect(daggers.hero.facingX).toBe(-1);
    expect(daggers.projectiles.at(-1)!.vx).toBeLessThan(0);

    const targeted = createRun('wizard', 361);
    targeted.weapons[0]!.cooldownRemaining = 0;
    targeted.enemies = [{ id: 901, kind: 'syntax_specter', x: -100, y: 0, hp: 100, maxHp: 100, speed: 0, damage: 0, isBoss: false, isElite: false }];
    tick(targeted, 0.01, 0);
    expect(targeted.projectiles.at(-1)!.vx).toBeLessThan(0);

    const bouncing = createRun('ranger', 362);
    bouncing.weapons[0]!.cooldownRemaining = 0;
    bouncing.enemies = [{ id: 902, kind: 'syntax_specter', x: 0, y: 100, hp: 100, maxHp: 100, speed: 0, damage: 0, isBoss: false, isElite: false }];
    tick(bouncing, 0.01, 0);
    expect(Math.abs(bouncing.projectiles.at(-1)!.vx)).toBeGreaterThan(0.01);
  });

  it('fires Fire Wand as a random fan and keeps its authored speed and duration rules', () => {
    const run = createRun('warrior', 3631);
    run.weapons = [{ id: 'fire_wand', level: 1, cooldownRemaining: 0 }];
    run.enemies = [];
    tick(run, 0.01, 0);
    expect(run.projectiles.filter((projectile) => projectile.weaponId === 'fire_wand')).toHaveLength(1);
    expect(run.weapons[0]).toMatchObject({ pendingShots: 2, shotIntervalRemaining: 0.02, pendingVolleyTotal: 3 });
    tick(run, 0.01, 0);
    expect(run.projectiles.filter((projectile) => projectile.weaponId === 'fire_wand')).toHaveLength(1);
    tick(run, 0.01, 0);
    expect(run.projectiles.filter((projectile) => projectile.weaponId === 'fire_wand')).toHaveLength(2);
    tick(run, 0.02, 0);
    const projectiles = run.projectiles.filter((projectile) => projectile.weaponId === 'fire_wand');
    expect(projectiles).toHaveLength(3);
    expect(new Set(projectiles.map((projectile) => `${projectile.vx.toFixed(4)}:${projectile.vy.toFixed(4)}`)).size).toBe(3);
    expect(getWeaponLevelStats(run, 'fire_wand')).toMatchObject({ damage: 20, amount: 3, speed: 0.75, duration: 0.1, pierce: 0 });
    expect(projectiles.every((projectile) => projectile.remainingSeconds > 0)).toBe(true);

    const maxed = createRun('warrior', 3632);
    maxed.weapons = [{ id: 'fire_wand', level: 8, cooldownRemaining: 0 }];
    maxed.enemies = [];
    maxed.hero.stats.duration = 0.75;
    tick(maxed, 0.01, 0);
    expect(getWeaponLevelStats(maxed, 'fire_wand')).toMatchObject({ damage: 90, speed: 1.35 });
    expect(maxed.projectiles[0]?.remainingSeconds).toBeCloseTo(0.09);
  });

  it('releases the Axe family as a facing fan with stable queued offsets', () => {
    const run = createRun('warrior', 3633);
    run.weapons = [{ id: 'battle_axe', level: 5, cooldownRemaining: 0 }];
    run.enemies = [];
    tick(run, 0.01, 0);
    expect(run.projectiles.filter((projectile) => projectile.weaponId === 'battle_axe')).toHaveLength(1);
    expect(run.weapons[0]).toMatchObject({ pendingShots: 2, shotIntervalRemaining: 0.2, pendingVolleyTotal: 3 });
    const firstAngle = Math.atan2(run.projectiles[0]!.vy, run.projectiles[0]!.vx);
    tick(run, 0.19, 0);
    expect(run.projectiles.filter((projectile) => projectile.weaponId === 'battle_axe')).toHaveLength(1);
    tick(run, 0.01, 0);
    expect(run.projectiles.filter((projectile) => projectile.weaponId === 'battle_axe')).toHaveLength(2);
    tick(run, 0.2, 0);
    const projectiles = run.projectiles.filter((projectile) => projectile.weaponId === 'battle_axe');
    expect(projectiles).toHaveLength(3);
    expect(Math.atan2(projectiles[1]!.vy, projectiles[1]!.vx) - firstAngle).toBeCloseTo(0.2, 4);
    expect(Math.atan2(projectiles[2]!.vy, projectiles[2]!.vx) - firstAngle).toBeCloseTo(0.4, 4);

    const evolved = createRun('warrior', 3634);
    evolved.weapons = [{ id: 'scythe_of_doom', level: 1, cooldownRemaining: 0 }];
    evolved.enemies = [];
    tick(evolved, 0.01, 0);
    expect(evolved.projectiles.filter((projectile) => projectile.weaponId === 'scythe_of_doom')).toHaveLength(1);
    expect(evolved.weapons[0]).toMatchObject({ pendingShots: 8, shotIntervalRemaining: 0.05, pendingVolleyTotal: 9 });
    expect(getWeaponLevelStats(evolved, 'scythe_of_doom')).toMatchObject({ area: 1.2, speed: 0.8, duration: 30, pierce: 1000 });
  });

  it('returns Cross-family projectiles to the hero and preserves boomerang state', () => {
    const run = createRun('warrior', 3635);
    run.weapons = [{ id: 'celestial_cross', level: 3, cooldownRemaining: 0 }];
    run.enemies = [];
    tick(run, 0.01, 0);
    run.weapons[0]!.cooldownRemaining = 100;
    expect(run.projectiles).toHaveLength(1);
    expect(run.weapons[0]).toMatchObject({ pendingShots: 1, shotIntervalRemaining: 0.1 });
    expect(run.projectiles[0]).toMatchObject({ boomerangOriginX: 0, boomerangOriginY: 0, boomerangReturning: false });
    for (let index = 0; index < 8; index += 1) tick(run, 0.25, 0);
    expect(run.projectiles.length).toBeGreaterThanOrEqual(1);
    expect(run.projectiles.some((projectile) => projectile.boomerangReturning === true)).toBe(true);
    for (let index = 0; index < 8; index += 1) tick(run, 0.25, 0);
    expect(run.projectiles).toHaveLength(0);

    const evolved = createRun('warrior', 3636);
    evolved.weapons = [{ id: 'heaven_blade', level: 1, cooldownRemaining: 0 }];
    evolved.enemies = [];
    tick(evolved, 0.01, 0);
    expect(evolved.projectiles[0]).toMatchObject({ boomerangOriginX: 0, boomerangOriginY: 0, boomerangReturning: false });
    expect(evolved.weapons[0]).toMatchObject({ pendingShots: 0, shotIntervalRemaining: 0 });
    expect(getWeaponLevelStats(evolved, 'heaven_blade')).toMatchObject({ damage: 77, area: 1.2, speed: 2, cooldown: 3.3, pierce: 30 });

    const grimoire = createRun('warrior', 3637);
    grimoire.weapons = [{ id: 'orbiting_grimoire', level: 2, cooldownRemaining: 0 }];
    grimoire.enemies = [];
    tick(grimoire, 0.01, 0);
    grimoire.weapons[0]!.cooldownRemaining = 100;
    expect(grimoire.projectiles).toHaveLength(2);
    expect(grimoire.projectiles.every((projectile) => Number.isFinite(projectile.orbitAngle) && projectile.orbitRadius === 44 && projectile.orbitAngularSpeed === 2)).toBe(true);
    const firstOrbitAngle = grimoire.projectiles[0]!.orbitAngle!;
    tick(grimoire, 0.25, 0);
    expect(grimoire.projectiles[0]!.orbitAngle).toBeGreaterThan(firstOrbitAngle);
    expect(Math.hypot(grimoire.projectiles[0]!.x - grimoire.hero.x, grimoire.projectiles[0]!.y - grimoire.hero.y)).toBeCloseTo(44, 3);
    for (let index = 0; index < 12; index += 1) tick(grimoire, 0.25, 0);
    expect(grimoire.projectiles).toHaveLength(0);
  });

  it('keeps Santa Water pools stationary, damageable on a hitbox delay, and pool-bounded', () => {
    const run = createRun('warrior', 3638);
    run.weapons = [{ id: 'alchemist_fire', level: 1, cooldownRemaining: 0 }];
    run.enemies = [{ id: 938, kind: 'syntax_specter', x: 0.5, y: 0, hp: 100, maxHp: 100, speed: 0, damage: 0, isBoss: false, isElite: false }];
    tick(run, 0.01, 0);
    expect(run.projectiles).toHaveLength(1);
    expect(run.projectiles[0]).toMatchObject({ x: 0.5, y: 0, vx: 0, vy: 0, hitCooldowns: { '938': expect.any(Number) } });
    expect(run.enemies[0]?.hp).toBe(90);
    run.weapons[0]!.cooldownRemaining = 100;
    tick(run, 0.25, 0);
    tick(run, 0.24, 0);
    expect(run.enemies[0]?.hp).toBe(90);
    tick(run, 0.02, 0);
    expect(run.enemies[0]?.hp).toBe(80);

    const bounded = createRun('warrior', 3639);
    bounded.weapons = [{ id: 'alchemist_fire', level: 1, cooldownRemaining: 0 }];
    bounded.enemies = [];
    for (let index = 0; index < 21; index += 1) {
      bounded.weapons[0]!.cooldownRemaining = 0;
      tick(bounded, 0.01, 0);
    }
    expect(bounded.projectiles.filter((projectile) => projectile.weaponId === 'alchemist_fire')).toHaveLength(20);

    const evolved = createRun('warrior', 3640);
    evolved.weapons = [{ id: 'philosophers_potion', level: 1, cooldownRemaining: 0 }];
    evolved.enemies = [];
    tick(evolved, 0.01, 0);
    expect(evolved.projectiles[0]).toMatchObject({ vx: 0, vy: 0 });
    expect(getWeaponLevelStats(evolved, 'philosophers_potion')).toMatchObject({ damage: 40, area: 2, duration: 4, amount: 4 });
    expect(evolved.weapons[0]).toMatchObject({ pendingShots: 3, shotIntervalRemaining: 0.3, pendingVolleyTotal: 4 });
  });

  it('releases Throwing Daggers as a rapid facing stream instead of a simultaneous volley', () => {
    const run = createRun('warrior', 363);
    run.weapons = [{ id: 'throwing_daggers', level: 3, cooldownRemaining: 0 }]; // Three authored daggers.
    run.enemies = [{ id: 903, kind: 'syntax_specter', x: -100, y: 0, hp: 100, maxHp: 100, speed: 0, damage: 0, isBoss: false, isElite: false }];

    tick(run, 0.01, 0);
    expect(run.projectiles).toHaveLength(1);
    expect(run.weapons[0]).toMatchObject({ pendingShots: 2, shotIntervalRemaining: 0.1 });
    expect(run.projectiles[0]?.vx).toBeGreaterThan(0);

    // Knife's authored projectile interval is 0.1 seconds. The queued
    // releases remain aimed from the hero's current facing, not at a target.
    tick(run, 0.09, 0);
    expect(run.projectiles).toHaveLength(1);
    tick(run, 0.01, 0);
    expect(run.projectiles).toHaveLength(2);
    expect(run.projectiles.at(-1)?.vx).toBeGreaterThan(0);
    expect(run.weapons[0]?.pendingShots).toBe(1);
  });

  it('applies the Knife interval reductions at the authored dagger ranks', () => {
    const run = createRun('warrior', 364);
    run.weapons = [{ id: 'throwing_daggers', level: 4, cooldownRemaining: 0 }];
    run.enemies = [{ id: 904, kind: 'syntax_specter', x: -100, y: 0, hp: 100, maxHp: 100, speed: 0, damage: 0, isBoss: false, isElite: false }];
    tick(run, 0.01, 0);
    expect(run.projectiles).toHaveLength(1);
    expect(run.weapons[0]).toMatchObject({ pendingShots: 2, shotIntervalRemaining: 0.08 });
    tick(run, 0.07, 0);
    expect(run.projectiles).toHaveLength(1);
    tick(run, 0.01, 0);
    expect(run.projectiles).toHaveLength(2);

    run.weapons[0]!.level = 8;
    run.weapons[0]!.cooldownRemaining = 0;
    delete run.weapons[0]!.pendingShots;
    delete run.weapons[0]!.shotIntervalRemaining;
    tick(run, 0.01, 0);
    expect(run.weapons[0]).toMatchObject({ pendingShots: 4, shotIntervalRemaining: 0.04 });
  });

  it('fires Magic Wand analogue Amount in a target-reacquiring sequence', () => {
    const run = createRun('wizard', 369);
    run.weapons[0]!.level = 2; // Arcane Bolt level 2 authors two missiles.
    run.weapons[0]!.cooldownRemaining = 0;
    run.enemies = [{ id: 914, kind: 'syntax_specter', x: 100, y: 0, hp: 100, maxHp: 100, speed: 0, damage: 0, isBoss: false, isElite: false }];

    tick(run, 0.01, 0);
    expect(run.projectiles).toHaveLength(1);
    expect(run.weapons[0]).toMatchObject({ pendingShots: 1, shotIntervalRemaining: 0.1 });
    expect(run.projectiles[0]?.vx).toBeGreaterThan(0);

    // The source's additional projectile interval is 0.1 seconds. Moving the
    // target during the sequence proves the second shot acquires the nearest
    // eligible enemy at release time rather than caching the first aim.
    run.enemies[0]!.x = -100;
    tick(run, 0.09, 0);
    expect(run.projectiles).toHaveLength(1);
    tick(run, 0.01, 0);
    expect(run.projectiles).toHaveLength(2);
    expect(run.projectiles.at(-1)?.vx).toBeLessThan(0);
    expect(run.weapons[0]?.pendingShots).toBe(0);
  });

  it('keeps the Thousand Edge analogue on facing during its queued stream', () => {
    const run = createRun('warrior', 370);
    run.weapons = [{ id: 'thousand_blades', level: 1, cooldownRemaining: 0 }];
    run.enemies = [{ id: 915, kind: 'syntax_specter', x: -100, y: 0, hp: 100, maxHp: 100, speed: 0, damage: 0, isBoss: false, isElite: false }];

    tick(run, 0.01, 0);
    expect(run.projectiles).toHaveLength(1);
    expect(run.weapons[0]).toMatchObject({ pendingShots: 5, shotIntervalRemaining: 0.05 });
    expect(run.projectiles[0]?.vx).toBeGreaterThan(0);

    // Release-time aim must use the hero's updated facing rather than the
    // nearest enemy. The second knife therefore turns left after input turns
    // the hero, even though the target was already on that side.
    tick(run, 0.04, 0, { up: false, down: false, left: true, right: false });
    expect(run.projectiles).toHaveLength(1);
    tick(run, 0.01, 0, { up: false, down: false, left: true, right: false });
    expect(run.projectiles).toHaveLength(2);
    expect(run.projectiles.at(-1)?.vx).toBeLessThan(0);
    expect(run.weapons[0]?.pendingShots).toBe(4);
  });

  it('uses a hero-anchored forward slash for the Whip-family weapon', () => {
    const run = createRun('warrior', 367);
    run.weapons[0]!.cooldownRemaining = 0;
    run.enemies = [
      { id: 910, kind: 'syntax_specter', x: 5, y: 0, hp: 100, maxHp: 100, speed: 0, damage: 0, isBoss: false, isElite: false },
      { id: 911, kind: 'syntax_specter', x: -5, y: 0, hp: 100, maxHp: 100, speed: 0, damage: 0, isBoss: false, isElite: false }
    ];
    tick(run, 0.01, 0);
    expect(run.enemies.find((enemy) => enemy.id === 910)?.hp).toBeLessThan(100);
    expect(run.enemies.find((enemy) => enemy.id === 911)?.hp).toBe(100);
    expect(run.projectiles[0]).toMatchObject({ vx: 1, vy: 0 });
    const x = run.projectiles[0]?.x ?? 0;
    tick(run, 0.1, 0, { up: false, down: false, left: false, right: false });
    expect(run.projectiles[0]?.x).toBeCloseTo(x);

    const evolved = createRun('warrior', 368);
    evolved.weapons = [{ id: 'excalibur', level: 1, cooldownRemaining: 0 }];
    evolved.enemies = [
      { id: 912, kind: 'syntax_specter', x: 5, y: 0, hp: 100, maxHp: 100, speed: 0, damage: 0, isBoss: false, isElite: false },
      { id: 913, kind: 'syntax_specter', x: -5, y: 0, hp: 100, maxHp: 100, speed: 0, damage: 0, isBoss: false, isElite: false }
    ];
    tick(evolved, 0.01, 0);
    expect(evolved.enemies.find((enemy) => enemy.id === 912)?.hp).toBeLessThan(100);
    expect(evolved.enemies.find((enemy) => enemy.id === 913)?.hp).toBe(100);
  });

  it('adds Amount to the authored weapon projectile count without multiplying it', () => {
    const run = createRun('warrior', 366);
    run.weapons[0]!.level = 3; // Broadsword authors two projectiles at level 3.
    run.hero.stats.amount = 2; // One additional projectile from Amount.
    run.weapons[0]!.cooldownRemaining = 0;
    tick(run, 0.01, 0);
    expect(run.projectiles).toHaveLength(3);
  });

  it('keeps Whip-derived Broadsword projectiles independent of Speed and Duration stats', () => {
    const base = createRun('warrior', 363);
    base.weapons[0]!.cooldownRemaining = 0;
    tick(base, 0.01, 0);
    const modified = createRun('warrior', 363);
    modified.hero.stats.speed = 0.75;
    modified.hero.stats.duration = 0.75;
    modified.weapons[0]!.cooldownRemaining = 0;
    tick(modified, 0.01, 0);
    expect(Math.hypot(modified.projectiles[0]!.vx, modified.projectiles[0]!.vy)).toBeCloseTo(Math.hypot(base.projectiles[0]!.vx, base.projectiles[0]!.vy));
    expect(modified.projectiles[0]!.remainingSeconds).toBeCloseTo(base.projectiles[0]!.remainingSeconds);
  });

  it('keeps Magic Wand and Knife-derived projectiles independent of Duration', () => {
    for (const [heroId, seed] of [['wizard', 364], ['rogue', 365] ] as const) {
      const base = createRun(heroId, seed);
      base.weapons[0]!.cooldownRemaining = 0;
      tick(base, 0.01, 0);
      const modified = createRun(heroId, seed);
      modified.hero.stats.duration = 0.9;
      modified.weapons[0]!.cooldownRemaining = 0;
      tick(modified, 0.01, 0);
      expect(modified.projectiles[0]!.remainingSeconds).toBeCloseTo(base.projectiles[0]!.remainingSeconds);
    }
  });

  it('pauses for an explicit revival choice and ends before the finale when declined', () => {
    const run = createRun('warrior', 34, { revival: 1 });
    run.enemies.push({ id: 1, kind: 'terminal_exit_boss', x: 0, y: 0, hp: 9999, maxHp: 9999, speed: 0, damage: 999, isBoss: true, isElite: false });
    tick(run, 0.25, 0);
    expect(run.phase).toBe('revival');
    expect(run.hero.stats.hp).toBeLessThanOrEqual(0);
    declineRevival(run);
    expect(run.phase).toBe('summary');
    expect(run.summary?.outcome).toBe('defeat');
  });

  it('keeps finale revival accounting deterministic when the player declines', () => {
    const run = createRun('warrior', 35, { revival: 1 });
    run.stageFinaleStarted = true;
    run.enemies.push({ id: 1, kind: 'terminal_exit_boss', x: 0, y: 0, hp: 9999, maxHp: 9999, speed: 0, damage: 999, isBoss: true, isElite: false });
    tick(run, 0.25, 0);
    expect(run.phase).toBe('revival');
    declineRevival(run);
    expect(run.summary?.outcome).toBe('victory');
    expect(run.goldBreakdown.stageCompletion).toBe(600);
    expect(run.stageRewardAwarded).toBe(true);
  });

  it('applies Area to projectile collision size as well as aura size', () => {
    const base = createRun('wizard', 338);
    base.weapons[0]!.cooldownRemaining = 0;
    tick(base, 0.01, 0);
    const expanded = createRun('wizard', 339);
    expanded.hero.stats.area = 1;
    expanded.weapons[0]!.cooldownRemaining = 0;
    tick(expanded, 0.01, 0);
    expect(expanded.projectiles[0]!.area).toBeCloseTo(base.projectiles[0]!.area * 2);
  });

  it('applies Curse to enemy speed and wave density without exceeding the pool cap', () => {
    const normal = createRun('warrior', 334);
    const cursed = createRun('warrior', 334, { curse: 1 });
    cursed.weapons[0]!.cooldownRemaining = 100000;
    cursed.hero.stats.hp = 1_000_000;
    cursed.hero.stats.maxHp = 1_000_000;
    tick(normal, 0.25, 0);
    tick(cursed, 0.25, 0);
    expect(cursed.enemies.length).toBeGreaterThan(normal.enemies.length);
    expect(cursed.enemies[0]!.speed).toBeGreaterThan(normal.enemies[0]!.speed);
    expect(cursed.enemies[0]!.damage).toBe(normal.enemies[0]!.damage);
    const dense = createRun('warrior', 336, { curse: 5 });
    dense.elapsedSeconds = 1200;
    dense.weapons[0]!.cooldownRemaining = 100000;
    dense.hero.stats.hp = 1_000_000;
    dense.hero.stats.maxHp = 1_000_000;
    for (let index = 0; index < 160; index += 1) tick(dense, 0.25, 0);
    expect(dense.enemies.length).toBeGreaterThan(60);
    expect(dense.enemies.length).toBeLessThanOrEqual(SIMULATION_POLICIES.maxEnemies);
    expect(cursed.enemies.length).toBeLessThanOrEqual(SIMULATION_POLICIES.maxEnemies);
  });

  it('applies Curse to authored spawn cadence, not only alive density', () => {
    const normal = createRun('warrior', 340);
    const cursed = createRun('warrior', 341, { curse: 1 });
    normal.elapsedSeconds = 4;
    cursed.elapsedSeconds = 4;
    tick(normal, 0.01, 0);
    tick(cursed, 0.01, 0);
    const normalBats = normal.enemies.filter((enemy) => enemy.kind === 'bug_bat').length;
    const cursedBats = cursed.enemies.filter((enemy) => enemy.kind === 'bug_bat').length;
    expect(cursedBats).toBeGreaterThan(normalBats);
  });

  it('despawns a distant normal enemy and relocates a persistent distant boss', () => {
    const run = createRun('warrior', 336);
    run.enemies.push(
      { id: 801, kind: 'syntax_specter', x: 1000, y: 0, hp: 10, maxHp: 10, speed: 0, damage: 0, isBoss: false, isElite: false },
      { id: 802, kind: 'terminal_exit_boss', x: 1000, y: 0, hp: 10, maxHp: 10, speed: 0, damage: 0, isBoss: true, isElite: false }
    );
    tick(run, 0.01, 0);
    const boss = run.enemies.find((enemy) => enemy.id === 802);
    expect(boss).toBeDefined();
    expect(Math.hypot(boss!.x - run.hero.x, boss!.y - run.hero.y)).toBe(WORLD_POLICIES.bossSpawnRadius);
    expect(run.enemies.map((enemy) => enemy.id)).not.toContain(801);
  });

  it('applies elite and boss knockback resistance without making normal enemies immune', () => {
    const run = createRun('warrior', 337);
    run.weapons[0]!.cooldownRemaining = 100;
    run.enemies.push(
      { id: 811, kind: 'syntax_specter', x: 100, y: 0, hp: 100, maxHp: 100, speed: 0, damage: 0, isBoss: false, isElite: false },
      { id: 812, kind: 'terminal_exit_boss', x: 100, y: 0, hp: 100, maxHp: 100, speed: 0, damage: 0, knockbackResistance: 0.9, isBoss: true, isElite: true }
    );
    run.projectiles.push({ id: 813, weaponId: run.weapons[0]!.id, x: 100, y: 0, vx: 0, vy: 0, damage: 1, area: 5, remainingPierce: 2, remainingSeconds: 1, knockback: 10, hitEnemyIds: [] });
    tick(run, 0.01, 0);
    const normal = run.enemies.find((enemy) => enemy.id === 811)!;
    const boss = run.enemies.find((enemy) => enemy.id === 812)!;
    expect(normal.x).toBeGreaterThan(105);
    expect(boss.x).toBeCloseTo(101);
  });

  it('keeps knockback active for the documented short reaction window before chase resumes', () => {
    const run = createRun('warrior', 338);
    run.weapons[0]!.cooldownRemaining = 100;
    run.enemies.push({ id: 814, kind: 'syntax_specter', x: 20, y: 0, hp: 100, maxHp: 100, speed: 10, damage: 0, isBoss: false, isElite: false });
    run.projectiles.push({ id: 815, weaponId: run.weapons[0]!.id, x: 20, y: 0, vx: 0, vy: 0, damage: 1, area: 5, remainingPierce: 0, remainingSeconds: 1, knockback: 2, hitEnemyIds: [] });

    tick(run, 0.01, 0);
    const enemy = run.enemies.find((candidate) => candidate.id === 814)!;
    expect(enemy.knockbackRemaining).toBeGreaterThan(0);
    const duringKnockback = enemy.x;
    tick(run, 0.05, 0);
    expect(enemy.x).toBeGreaterThan(duringKnockback);
    tick(run, 0.1, 0);
    expect(enemy.knockbackRemaining).toBe(0);
    const afterKnockback = enemy.x;
    tick(run, 0.01, 0);
    expect(enemy.x).toBeLessThan(afterKnockback);
  });

  it('starts with the persisted battery capacity level', () => {
    const run = createRun('warrior', 2, { batteryLevel: 3 });
    expect(run.battery.level).toBe(3);
    expect(run.battery.maxCapacity).toBe(13284);
    expect(run.battery.currentCapacity).toBe(13284);
  });

  it('normalizes hydrated weapon and passive ranks to authored caps before deriving stats', () => {
    const run = createRun('warrior', 339);
    run.weapons[0]!.level = 99;
    run.passives.power_gauntlets = 99;
    run.passives.unknown_passive = 99;
    recalculateStats(run);
    expect(run.weapons[0]!.level).toBe(8);
    expect(run.passives.power_gauntlets).toBe(5);
    expect(run.passives.unknown_passive).toBeUndefined();
    expect(run.hero.stats.might).toBeCloseTo(0.5);
  });

  it('starts every run at level one even when a hero has a higher recorded best', () => {
    const run = createRun('wizard', 17, { might: 4 });
    expect(run.level).toBe(1);
  });

  it('spawns a boss on deterministic schedule and eventually reaches victory', () => {
    const run = createRun('warrior', 7, {}, { clockScale: 60 });
    run.hero.baseStats.hp = 1_000_000_000;
    run.hero.baseStats.maxHp = 1_000_000_000;
    run.hero.stats.hp = 1_000_000_000;
    run.hero.stats.maxHp = 1_000_000_000;
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
    expect(summary.gold).toBe(goldBreakdownTotal(summary.goldBreakdown));
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
    expect(run.enemies.length).toBeLessThanOrEqual(SIMULATION_POLICIES.maxEnemies);
    expect(run.phase).toBe('summary');
  });
});

describe('P0 registry-driven combat foundations', () => {
  it('loads the six hero boundaries and applies their level passives', () => {
    const paladin = createRun('paladin', 1);
    expect(paladin.hero.stats.maxHp).toBe(70);
    expect(paladin.hero.stats.magnet).toBeCloseTo(37.5);

    const warrior = createRun('warrior', 2);
    warrior.level = 10;
    recalculateStats(warrior);
    expect(warrior.hero.stats.might).toBeCloseTo(0.1);

    const necromancer = createRun('necromancer', 3);
    necromancer.level = 20;
    recalculateStats(necromancer);
    expect(necromancer.hero.stats.amount).toBe(2);
  });

  it('audits every registered passive stat at rank one', () => {
    const expected = [
      ['power_gauntlets', 'might', 0.1], ['iron_armor', 'armor', 2], ['heart_of_vitality', 'maxHp', 120],
      ['phoenix_amulet', 'recovery', 0.2], ['haste_amulet', 'cooldown', 0.08], ['orb_of_expansion', 'area', 0.1],
      ['iron_bracer', 'speed', 0.1], ['spellbinder_scroll', 'duration', 0.1], ['ring_of_duplication', 'amount', 2],
      ['token_magnetism', 'magnet', 45], ['crown_of_wisdom', 'growth', 0.08], ['stone_mask', 'greed', 0.1],
      ['skull_of_doom', 'curse', 0.1], ['tiragisu_ankh', 'revival', 1]
    ] as const;
    for (const [id, stat, value] of expected) {
      const run = createRun('warrior', 450);
      run.passives[id] = 1;
      recalculateStats(run);
      expect(run.hero.stats[stat], id).toBeCloseTo(value);
    }
    const allStats = createRun('warrior', 451);
    allStats.passives.pandoras_box = 1;
    recalculateStats(allStats);
    expect(allStats.hero.stats).toMatchObject({ might: 0.04, area: 0.04, speed: 0.04, duration: 0.04 });

    const omniCap = createRun('warrior', 452);
    omniCap.passives.pandoras_box = 8;
    recalculateStats(omniCap);
    expect(omniCap.hero.stats).toMatchObject({ might: 0.25, area: 0.25, speed: 0.25, duration: 0.25, curse: 0 });

    const cursedMax = createRun('warrior', 453);
    cursedMax.passives.pandoras_box = 9;
    recalculateStats(cursedMax);
    expect(cursedMax.hero.stats).toMatchObject({ might: 0.25, area: 0.25, speed: 0.25, duration: 0.25, curse: 1 });

    // Max-rank coverage keeps a registry-only capability from appearing
    // functional at rank one while failing at its authored boundary. These
    // projections also exercise the shared stat caps and the separate
    // revival-charge derivation path.
    const maxRankExpectations = [
      ['power_gauntlets', { might: 0.5 }],
      ['iron_armor', { armor: 6 }],
      ['heart_of_vitality', { maxHp: 248.832 }],
      ['phoenix_amulet', { recovery: 1 }],
      ['haste_amulet', { cooldown: 0.4 }],
      ['orb_of_expansion', { area: 0.5 }],
      ['iron_bracer', { speed: 0.5 }],
      ['spellbinder_scroll', { duration: 0.5 }],
      ['ring_of_duplication', { amount: 3 }],
      ['token_magnetism', { magnet: 119.40075 }],
      ['crown_of_wisdom', { growth: 0.4 }],
      ['stone_mask', { greed: 0.5 }],
      ['skull_of_doom', { curse: 0.5 }],
      ['tiragisu_ankh', { revival: 2 }]
    ] as const;
    for (const [id, expected] of maxRankExpectations) {
      const run = createRun('warrior', 454);
      const definition = MVP_REGISTRY.passives.find((passive) => passive.id === id)!;
      run.passives[id] = definition.maxLevel;
      recalculateStats(run);
      for (const [stat, value] of Object.entries(expected)) expect(run.hero.stats[stat as keyof typeof run.hero.stats], `${id}:${stat}`).toBeCloseTo(value);
      if (id === 'tiragisu_ankh') expect(run.revivalsRemaining).toBe(2);
    }
  });

  it('audits every spendable meta stat at rank one and maximum rank', () => {
    for (const definition of META_UPGRADES) {
      if (!definition.stat) continue;
      const baseline = createRun('warrior', 460);
      const rankOne = createRun('warrior', 461);
      const maxRank = createRun('warrior', 462);
      rankOne.metaUpgrades[definition.id] = 1;
      maxRank.metaUpgrades[definition.id] = definition.maxRank;
      recalculateStats(baseline);
      recalculateStats(rankOne);
      recalculateStats(maxRank);
      const statKey = definition.stat === 'maxHealth' ? 'maxHp' : definition.stat;
      const baselineValue = baseline.hero.stats[statKey as keyof typeof baseline.hero.stats];
      const rankOneValue = rankOne.hero.stats[statKey as keyof typeof rankOne.hero.stats];
      const maxRankValue = maxRank.hero.stats[statKey as keyof typeof maxRank.hero.stats];
      expect(typeof baselineValue, `${definition.id} baseline`).toBe('number');
      expect(Number.isFinite(rankOneValue), `${definition.id} rank one`).toBe(true);
      expect(Number.isFinite(maxRankValue), `${definition.id} max rank`).toBe(true);
      expect(rankOneValue, `${definition.id} rank one effect`).toBeGreaterThan(baselineValue as number);
      expect(maxRankValue, `${definition.id} max rank effect`).toBeGreaterThanOrEqual(rankOneValue as number);
    }

    const agile = createRun('warrior', 465, { agility: 2 });
    const duration = createRun('warrior', 466, { duration: 2 });
    const magnet = createRun('warrior', 467, { magnet: 2 });
    expect(agile.hero.stats.moveSpeed).toBe(44);
    expect(duration.hero.stats.duration).toBeCloseTo(0.3);
    expect(magnet.hero.stats.magnet).toBeCloseTo(46.875);

    const vitality = createRun('warrior', 468, { vitality: 3 });
    expect(vitality.hero.stats.maxHp).toBeCloseTo(133.1);

    const stackedHealth = createRun('warrior', 469);
    stackedHealth.passives.heart_of_vitality = 5;
    stackedHealth.metaUpgrades.vitality = 3;
    recalculateStats(stackedHealth);
    expect(stackedHealth.hero.stats.maxHp).toBeCloseTo(331.196592);

    const baseline = createRun('warrior', 463);
    const telemetry = createRun('warrior', 464);
    applyTokenInput(telemetry, { source: 'otlp', accuracy: 'exact', count: 5000, outputTokens: 5000, tokensPerSecond: 100, isAgentActive: true });
    recalculateStats(baseline);
    recalculateStats(telemetry);
    expect(telemetry.hero.stats).toEqual(baseline.hero.stats);
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

  it('keeps level-up cards bound to registered content and current inventory', () => {
    const run = createRun('warrior', 404);
    const evolvedWeaponCard = { id: 'weapon:excalibur', label: 'Excalibur', kind: 'new-weapon' as const, target: 'excalibur' };
    expect(isUpgradeCardEligible(run, evolvedWeaponCard)).toBe(false);
    run.phase = 'level-up';
    run.pendingCards = [evolvedWeaponCard];
    expect(() => chooseUpgrade(run, evolvedWeaponCard.id)).toThrow('no longer eligible');

    const capped = createRun('warrior', 405);
    capped.weapons[0]!.level = 8;
    const staleWeaponCard = { id: 'weapon-upgrade:broadsword', label: 'Upgrade Broadsword', kind: 'weapon' as const, target: 'broadsword' };
    expect(isUpgradeCardEligible(capped, staleWeaponCard)).toBe(false);
    capped.phase = 'level-up';
    capped.pendingCards = [staleWeaponCard];
    expect(() => chooseUpgrade(capped, staleWeaponCard.id)).toThrow('no longer eligible');
  });

  it('uses authored stats and attack behavior for evolved first-roster weapons', () => {
    const expected = [
      { id: 'excalibur', damage: 35, cooldown: 1 },
      { id: 'archmage_staff', damage: 24, cooldown: 0.75 },
      { id: 'thousand_blades', damage: 24, cooldown: 0.8 },
      { id: 'no_future', damage: 30, cooldown: 1.4 },
      { id: 'hellfire', damage: 100, cooldown: 3 },
      { id: 'scythe_of_doom', damage: 60, cooldown: 4 },
      { id: 'heaven_blade', damage: 77, cooldown: 3.3 },
      { id: 'unabridged_codex', damage: 30, cooldown: 3 },
      { id: 'philosophers_potion', damage: 40, cooldown: 4 }
    ] as const;
    for (const weapon of expected) {
      const run = createRun('warrior', 41);
      run.weapons = [{ id: weapon.id, level: 1, cooldownRemaining: 0 }];
      expect(getWeaponLevelStats(run, weapon.id)).toMatchObject({ damage: weapon.damage, cooldown: weapon.cooldown });
      if (weapon.id === 'excalibur') expect(getWeaponLevelStats(run, weapon.id)).toMatchObject({ area: 1.3, duration: 0.35, knockback: 12 });
      if (weapon.id === 'no_future') expect(getWeaponLevelStats(run, weapon.id)).toMatchObject({ speed: 224, duration: 3, pierce: 99 });
      tick(run, 0.01, 0);
      expect(run.projectiles.filter((projectile) => projectile.weaponId === weapon.id)).toHaveLength(weapon.id === 'unabridged_codex' ? 4 : 1);
      if (weapon.id === 'archmage_staff') expect(run.weapons[0]).toMatchObject({ pendingShots: 3, shotIntervalRemaining: 0.1 });
      if (weapon.id === 'hellfire') {
        expect(getWeaponLevelStats(run, weapon.id)).toMatchObject({ amount: 2, pierce: 99, duration: 0.1 });
        expect(run.weapons[0]).toMatchObject({ pendingShots: 1, shotIntervalRemaining: 0.2 });
      }
      if (weapon.id === 'scythe_of_doom') expect(run.weapons[0]).toMatchObject({ pendingShots: 8, shotIntervalRemaining: 0.05 });
      if (weapon.id === 'heaven_blade') expect(run.projectiles[0]).toMatchObject({ boomerangReturning: false, boomerangOriginX: 0, boomerangOriginY: 0 });
      if (weapon.id === 'unabridged_codex') expect(run.projectiles[0]).toMatchObject({ orbitRadius: 77, orbitAngularSpeed: 3 });
      if (weapon.id === 'philosophers_potion') expect(run.projectiles[0]).toMatchObject({ vx: 0, vy: 0, hitCooldowns: {} });
    }

    const sanctuary = createRun('warrior', 42);
    sanctuary.weapons = [{ id: 'sanctuary', level: 1, cooldownRemaining: 0 }];
    sanctuary.enemies.push({ id: 700, kind: 'syntax_specter', x: 0.5, y: 0, hp: 100, maxHp: 100, speed: 0, damage: 0, isBoss: false, isElite: false });
    tick(sanctuary, 0.01, 0);
    expect(sanctuary.enemies[0]?.hp).toBe(82);
  });

  it('keeps Garlic-like aura hits on a per-target cooldown across radius exits', () => {
    const run = createRun('paladin', 4201);
    run.weapons = [{ id: 'aegis_barrier', level: 1, cooldownRemaining: 0 }];
    run.enemies = [{ id: 701, kind: 'syntax_specter', x: 0.5, y: 0, hp: 100, maxHp: 100, speed: 0, damage: 0, isBoss: false, isElite: false }];

    tick(run, 0.01, 0);
    const afterFirstHit = run.enemies[0]!.hp;
    expect(afterFirstHit).toBe(95);
    expect(run.weapons[0]?.auraHitCooldowns).toEqual({ '701': expect.any(Number) });

    run.enemies[0]!.x = 100;
    run.weapons[0]!.cooldownRemaining = 0;
    tick(run, 0.01, 0);
    run.enemies[0]!.x = 0.5;
    run.weapons[0]!.cooldownRemaining = 0;
    tick(run, 0.01, 0);
    expect(run.enemies[0]!.hp).toBe(afterFirstHit);

    for (let index = 0; index < 4; index += 1) tick(run, 0.25, 0);
    run.weapons[0]!.cooldownRemaining = 0;
    tick(run, 0.01, 0);
    expect(run.enemies[0]!.hp).toBeLessThan(afterFirstHit);
  });

  it('keeps Bone projectiles alive and bouncing after enemy and screen-edge hits', () => {
    const run = createRun('necromancer', 4531);
    run.weapons[0]!.cooldownRemaining = 0;
    tick(run, 0.01, 0);
    const projectile = run.projectiles[0]!;
    expect(projectile).toBeDefined();
    run.weapons[0]!.cooldownRemaining = 10;
    projectile.x = 1;
    projectile.y = 0;
    projectile.vx = 0;
    projectile.vy = 0;
    run.enemies = [{ id: 701, kind: 'syntax_specter', x: 1, y: 0, hp: 100, maxHp: 100, speed: 0, damage: 0, isBoss: false, isElite: false }];
    tick(run, 0.01, 0);
    expect(run.enemies[0]?.hp).toBeLessThan(100);
    expect(run.projectiles).toHaveLength(1);

    const edge = run.projectiles[0]!;
    edge.x = 159.9;
    edge.y = 0;
    edge.vx = 100;
    edge.vy = 0;
    run.enemies = [];
    tick(run, 0.01, 0);
    expect(run.projectiles).toHaveLength(1);
    expect(run.projectiles[0]?.vx).toBeLessThan(0);
  });

  it('lets the Bouncing Arrow analogue pierce every enemy on its route', () => {
    const run = createRun('warrior', 4532);
    run.weapons = [{ id: 'bouncing_arrow', level: 1, cooldownRemaining: 0 }];
    tick(run, 0.01, 0);
    expect(run.projectiles).toHaveLength(1);
    const projectile = run.projectiles[0]!;
    projectile.x = 0;
    projectile.y = 0;
    projectile.vx = 0;
    projectile.vy = 0;
    run.enemies = [701, 702, 703].map((id) => ({ id, kind: 'syntax_specter' as const, x: 0, y: 0, hp: 100, maxHp: 100, speed: 0, damage: 0, isBoss: false, isElite: false }));

    tick(run, 0.01, 0);

    expect(run.enemies.every((enemy) => enemy.hp < 100)).toBe(true);
    expect(run.projectiles).toHaveLength(1);
    expect(run.projectiles[0]?.remainingPierce).toBeGreaterThanOrEqual(0);
  });

  it('re-hits a Bouncing Arrow target only after its bounded hitbox delay', () => {
    const run = createRun('warrior', 4533);
    run.weapons = [{ id: 'bouncing_arrow', level: 1, cooldownRemaining: 0 }];
    tick(run, 0.01, 0);
    const projectile = run.projectiles[0]!;
    projectile.x = 0;
    projectile.y = 0;
    projectile.vx = 0;
    projectile.vy = 0;
    run.enemies = [{ id: 704, kind: 'syntax_specter', x: 0, y: 0, hp: 100, maxHp: 100, speed: 0, damage: 0, isBoss: false, isElite: false }];

    tick(run, 0.01, 0);
    const afterFirstHit = run.enemies[0]!.hp;
    tick(run, 0.25, 0);
    tick(run, 0.24, 0);
    expect(run.enemies[0]!.hp).toBe(afterFirstHit);
    tick(run, 0.02, 0);
    expect(run.enemies[0]!.hp).toBeLessThan(afterFirstHit);
  });

  it('applies the NO FUTURE bounce explosion to nearby enemies', () => {
    const run = createRun('warrior', 4534);
    run.weapons = [{ id: 'no_future', level: 1, cooldownRemaining: 0 }];
    tick(run, 0.01, 0);
    const projectile = run.projectiles[0]!;
    projectile.x = 159.9;
    projectile.y = 0;
    projectile.vx = 100;
    projectile.vy = 0;
    run.enemies = [{ id: 705, kind: 'syntax_specter', x: 160, y: 0, hp: 100, maxHp: 100, speed: 0, damage: 0, isBoss: false, isElite: false }];
    projectile.hitCooldowns = { '705': 0.5 };

    tick(run, 0.01, 0);

    expect(run.projectiles).toHaveLength(1);
    expect(run.projectiles[0]?.vx).toBeLessThan(0);
    expect(run.enemies[0]?.hp).toBeLessThan(100);
    expect(run.visualEffects).toHaveLength(1);
    expect(run.visualEffects?.[0]).toMatchObject({ kind: 'explosion', x: 160, y: 0, radius: 5 });
    tick(run, 0.25, 0);
    tick(run, 0.25, 0);
    expect(run.visualEffects).toHaveLength(0);
  });

  it('triggers the NO FUTURE retaliation explosion when contact damage lands', () => {
    const run = createRun('warrior', 4535);
    run.weapons = [{ id: 'no_future', level: 1, cooldownRemaining: 10 }];
    run.projectiles = [{ id: 1, weaponId: 'no_future', x: 0, y: 0, vx: 0, vy: 0, damage: 30, area: 5, remainingPierce: 0, remainingSeconds: 1, knockback: 0, hitEnemyIds: [], hitCooldowns: { '706': 0.5 } }];
    run.nextEntityId = 2;
    run.enemies = [{ id: 706, kind: 'syntax_specter', x: 0, y: 0, hp: 100, maxHp: 100, speed: 0, damage: 3, isBoss: false, isElite: false }];

    tick(run, 0.01, 0);

    expect(run.hero.stats.hp).toBe(98);
    expect(run.enemies[0]?.hp).toBeLessThan(100);
    expect(run.visualEffects).toHaveLength(1);
  });

  it('uses Armor only for NO FUTURE retaliatory explosion damage', () => {
    const makeRun = (heroId: 'wizard' | 'warrior', seed: number) => {
      const run = createRun(heroId, seed);
      run.weapons = [{ id: 'no_future', level: 1, cooldownRemaining: 10 }];
      run.projectiles = [{ id: 1, weaponId: 'no_future', x: 0, y: 0, vx: 0, vy: 0, damage: 30, area: 5, remainingPierce: 0, remainingSeconds: 1, knockback: 0, hitEnemyIds: [] }];
      run.nextEntityId = 2;
      run.enemies = [{ id: 707, kind: 'syntax_specter', x: 0, y: 0, hp: 100, maxHp: 100, speed: 0, damage: 3, isBoss: false, isElite: false }];
      return run;
    };
    const noArmor = makeRun('wizard', 4536);
    const armor = makeRun('warrior', 4537);
    tick(noArmor, 0.01, 0);
    tick(armor, 0.01, 0);
    expect(noArmor.enemies[0]?.hp).toBe(40);
    expect(armor.enemies[0]?.hp).toBe(37);

    const makeBounceRun = (heroId: 'wizard' | 'warrior', seed: number) => {
      const run = createRun(heroId, seed);
      run.weapons = [{ id: 'no_future', level: 1, cooldownRemaining: 10 }];
      run.projectiles = [{ id: 1, weaponId: 'no_future', x: 159.9, y: 0, vx: 100, vy: 0, damage: 30, area: 5, remainingPierce: 0, remainingSeconds: 1, knockback: 0, hitEnemyIds: [], hitCooldowns: { '708': 0.5 } }];
      run.nextEntityId = 2;
      run.enemies = [{ id: 708, kind: 'syntax_specter', x: 160, y: 0, hp: 100, maxHp: 100, speed: 0, damage: 0, isBoss: false, isElite: false }];
      return run;
    };
    const bounceNoArmor = makeBounceRun('wizard', 4538);
    const bounceArmor = makeBounceRun('warrior', 4539);
    tick(bounceNoArmor, 0.01, 0);
    tick(bounceArmor, 0.01, 0);
    expect(bounceArmor.enemies[0]?.hp).toBe(bounceNoArmor.enemies[0]?.hp);

    const capped = makeRun('warrior', 4540);
    capped.hero.stats.armor = 100;
    capped.enemies[0]!.hp = 1_000;
    capped.enemies[0]!.maxHp = 1_000;
    tick(capped, 0.01, 0);
    expect(capped.enemies[0]?.hp).toBe(790);
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

    const skipped = createRun('wizard', 6, { skip: 2 });
    for (let index = 0; index < 25; index += 1) skipped.pickups.push({ id: index + 1, kind: 'xp-shard', x: 0, y: 0, value: 1 });
    tick(skipped, 0.25, 0);
    expect(skipped.level).toBe(3);
    expect(skipped.pendingLevelUps).toBe(2);
    skipLevelUp(skipped);
    expect(skipped.skipsRemaining).toBe(1);
    expect(skipped.pendingLevelUps).toBe(1);
    expect(skipped.xp).toBeCloseTo(12.5);
    skipLevelUp(skipped);
    expect(skipped.skipsRemaining).toBe(0);
    expect(skipped.pendingLevelUps).toBe(0);
    expect(skipped.phase).toBe('dungeon');
    expect(skipped.xp).toBeCloseTo(17.5);
  });

  it('keeps weighted level-up choices unique and excludes maxed inventory entries', () => {
    const run = createRun('warrior', 7);
    run.weapons[0]!.level = 8;
    run.passives.power_gauntlets = 5;
    for (let index = 0; index < 5; index += 1) run.pickups.push({ id: index + 1, kind: 'xp-shard', x: 0, y: 0, value: 1 });
    tick(run, 0.01, 0);
    expect(run.pendingCards).toHaveLength(3);
    expect(new Set(run.pendingCards.map((card) => card.id)).size).toBe(3);
    expect(run.pendingCards.some((card) => card.id === 'weapon-upgrade:broadsword')).toBe(false);
    expect(run.pendingCards.some((card) => card.id === 'passive-upgrade:power_gauntlets')).toBe(false);
  });

  it('keeps a banished item excluded from future cards and chest upgrades', () => {
    const run = createRun('warrior', 701);
    run.phase = 'level-up';
    run.pendingLevelUps = 1;
    run.banishesRemaining = 1;
    run.pendingCards = [
      { id: 'weapon-upgrade:broadsword', label: 'Upgrade Broadsword', kind: 'weapon', target: 'broadsword' },
      { id: 'heal', label: 'Restore 25% health', kind: 'heal', target: 'heal' }
    ];
    banishLevelUpCard(run, 'weapon-upgrade:broadsword');
    expect(run.banishesRemaining).toBe(0);
    expect(run.bannedUpgradeIds).toEqual(expect.arrayContaining(['weapon-upgrade:broadsword', 'item:broadsword']));
    expect(run.pendingCards.some((card) => card.target === 'broadsword')).toBe(false);
    const fallback = createRun('warrior', 703);
    fallback.phase = 'level-up';
    fallback.pendingLevelUps = 1;
    fallback.banishesRemaining = 1;
    fallback.pendingCards = [{ id: 'heal', label: 'Restore 25% health', kind: 'heal', target: 'heal' }];
    expect(() => banishLevelUpCard(fallback, 'heal')).toThrow(/weapon or passive/);

    run.phase = 'dungeon';
    run.elapsedSeconds = 600;
    run.weapons = [{ id: 'broadsword', level: 8, cooldownRemaining: 0 }];
    run.passives = { heart_of_vitality: 5 };
    const reward = openTreasureChest(run);
    expect(reward).toBe('chest:no-eligible-item');
    expect(run.weapons[0]).toMatchObject({ id: 'broadsword', level: 8 });

    const legacy = createRun('warrior', 702);
    legacy.elapsedSeconds = 600;
    legacy.weapons = [{ id: 'broadsword', level: 8, cooldownRemaining: 0 }];
    legacy.passives = { heart_of_vitality: 5 };
    legacy.bannedUpgradeIds = ['weapon-upgrade:broadsword'];
    expect(openTreasureChest(legacy)).toBe('chest:no-eligible-item');
  });

  it('derives new weapon choices from every non-evolution registry entry', () => {
    const evolvedIds = new Set(MVP_REGISTRY.weapons.flatMap((weapon) => weapon.evolution ? [weapon.evolution.resultId] : []));
    const expected = MVP_REGISTRY.weapons.filter((weapon) => !evolvedIds.has(weapon.id)).map((weapon) => weapon.id);
    expect(getBaseWeaponIds()).toEqual(expected);
    expect(getBaseWeaponIds()).not.toContain('excalibur');
  });

  it('can expose a fourth unique level-up option when Luck is high', () => {
    const run = createRun('wizard', 9);
    run.hero.baseStats.luck = 1_000_000_000;
    recalculateStats(run);
    run.pickups.push({ id: 1, kind: 'xp-shard', x: 0, y: 0, value: 5 });
    tick(run, 0.01, 0);
    expect(run.pendingCards).toHaveLength(4);
    expect(new Set(run.pendingCards.map((card) => card.id)).size).toBe(4);
  });

  it('prefers owned weapon/passive upgrades when the source-backed chance is guaranteed', () => {
    const run = createRun('warrior', 10);
    run.passives.power_gauntlets = 1;
    run.hero.baseStats.luck = 1_000_000_000;
    recalculateStats(run);
    run.pickups.push({ id: 1, kind: 'xp-shard', x: 0, y: 0, value: 5 });
    tick(run, 0.01, 0);
    expect(run.pendingCards).toHaveLength(4);
    expect(run.pendingCards.slice(0, 2).every((card) => card.kind === 'weapon' || card.kind === 'passive')).toBe(true);
  });

  it('offers a Coin Bag fallback when every inventory slot is maxed', () => {
    const run = createRun('warrior', 8);
    run.weapons = ['broadsword', 'arcane_bolt', 'throwing_daggers', 'bouncing_arrow', 'aegis_barrier', 'bone_throw'].map((id) => ({ id, level: 8, cooldownRemaining: 0 }));
    run.passives = {
      power_gauntlets: 5, iron_armor: 5, heart_of_vitality: 5, phoenix_amulet: 5,
      haste_amulet: 5, orb_of_expansion: 5, iron_bracer: 5, spellbinder_scroll: 5,
      ring_of_duplication: 2, token_magnetism: 5, crown_of_wisdom: 5, stone_mask: 5,
      skull_of_doom: 5, tiragisu_ankh: 2, pandoras_box: 9
    };
    recalculateStats(run);
    run.pickups.push({ id: 1, kind: 'xp-shard', x: 0, y: 0, value: 5 });
    tick(run, 0.01, 0);
    const coinBag = run.pendingCards.find((card) => card.id === 'coin-bag');
    expect(coinBag).toMatchObject({ kind: 'gold', target: 'gold' });
    run.rerollsRemaining = 1;
    run.skipsRemaining = 1;
    expect(() => rerollLevelUp(run)).toThrow(/unavailable/);
    expect(() => skipLevelUp(run)).toThrow(/unavailable/);
    chooseUpgrade(run, 'coin-bag');
    expect(run.gold).toBe(15);
    expect(run.goldBreakdown.levelUp).toBe(15);
  });

  it('offers fallback rewards when every remaining item is banished', () => {
    const run = createRun('warrior', 81);
    run.bannedUpgradeIds = [
      ...MVP_REGISTRY.weapons.filter((weapon) => !MVP_REGISTRY.weapons.some((candidate) => candidate.evolution?.resultId === weapon.id)).map((weapon) => `item:${weapon.id}`),
      ...MVP_REGISTRY.passives.map((passive) => `item:${passive.id}`)
    ];
    run.pickups.push({ id: 1, kind: 'xp-shard', x: 0, y: 0, value: 5 });
    tick(run, 0.01, 0);
    expect(run.pendingCards.map((card) => card.id)).toEqual(expect.arrayContaining(['coin-bag', 'floor-chicken']));
    expect(run.pendingCards.every((card) => card.kind === 'gold' || card.kind === 'heal')).toBe(true);
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

  it('keeps ordinary contact damage at one after armor mitigation', () => {
    const run = createRun('warrior', 341);
    run.hero.stats.armor = 99;
    run.enemies.push({ id: 78, kind: 'syntax_specter', x: 0, y: 0, hp: 100, maxHp: 100, speed: 0, damage: 3, isBoss: false, isElite: false });
    tick(run, 0.01, 0);
    expect(run.hero.stats.hp).toBe(run.hero.stats.maxHp - 1);
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
    expect(run.enemies.length).toBeLessThanOrEqual(SIMULATION_POLICIES.maxEnemies);
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
    expect(victoryThreat.isFinaleThreat).toBe(true);
    expect(victoryThreat.isInvulnerable).toBe(true);
    expect(victory.stageFinaleDeadline).toBe(1860);
    victoryThreat.hp = 0;
    tick(victory, 0.25, 0);
    expect(victory.stageFinaleStarted).toBe(true);
    expect(victory.outcome).toBeUndefined();
    victory.elapsedSeconds = 1810;
    tick(victory, 0.25, 0);
    expect(victory.outcome).toBeUndefined();
    victoryThreat.x = victory.hero.x; victoryThreat.y = victory.hero.y;
    tick(victory, 0.25, 0);
    expect(victory.outcome).toBe('victory');

    const repeated = createRun('warrior', 107);
    repeated.elapsedSeconds = 1799.9;
    tick(repeated, 0.25, 0);
    repeated.elapsedSeconds = 1859.9;
    tick(repeated, 0.25, 0);
    expect(repeated.enemies.filter((enemy) => enemy.kind === 'timeout_reaper')).toHaveLength(2);

    const defeat = createRun('warrior', 106);
    defeat.hero.stats.hp = 1; defeat.hero.stats.maxHp = 1; defeat.hero.stats.armor = 0;
    defeat.elapsedSeconds = 1799.9;
    tick(defeat, 0.25, 0);
    const defeatThreat = defeat.enemies.find((enemy) => enemy.kind === 'timeout_reaper')!;
    defeatThreat.x = defeat.hero.x; defeatThreat.y = defeat.hero.y;
    tick(defeat, 0.25, 0);
    expect(defeat.stageFinaleStarted).toBe(true);
    expect(defeat.outcome).toBe('victory');
  });

  it('resolves the stage after the one-minute final-threat window without requiring a kill', () => {
    const run = createRun('warrior', 108);
    run.elapsedSeconds = 1799.9;
    tick(run, 0.25, 0);
    expect(run.stageFinaleStarted).toBe(true);
    expect(run.outcome).toBeUndefined();
    run.elapsedSeconds = 1859.9;
    tick(run, 0.25, 0);
    expect(run.elapsedSeconds).toBeGreaterThanOrEqual(1860);
    expect(run.outcome).toBe('victory');
    expect(run.goldBreakdown.stageCompletion).toBeGreaterThan(0);
    expect(run.summary?.completionReason).toBe('stage-timer');
    expect(run.summary?.stageFinaleDurationSeconds).toBeGreaterThanOrEqual(60);
    expect(run.summary?.finaleThreatsSpawned).toBe(2);
  });
});

describe('P2 pickups, treasure, and evolution', () => {
  it('keeps gem XP collection-owned and preserves tier values', () => {
    const run = createRun('warrior', 201);
    run.pickups.push(
      { id: 1, kind: 'xp-shard', x: 0, y: 0, value: 1 },
      { id: 2, kind: 'xp-crystal', x: 0, y: 0, value: 5 },
      { id: 3, kind: 'xp-orb', x: 0, y: 0, value: 12 }
    );
    tick(run, 0.01, 0);
    expect(run.gold).toBe(0);
    expect(run.pickups.filter((pickup) => pickup.kind.startsWith('xp-'))).toEqual([]);

    const pending = createRun('warrior', 202);
    pending.pickups.push({ id: 1, kind: 'xp-orb', x: 100, y: 0, value: 12 });
    tick(pending, 0.01, 0);
    expect(pending.gold).toBe(0);
    expect(pending.xp).toBe(0);
    expect(pending.pickups).toHaveLength(1);
    pending.hero.x = 100;
    tick(pending, 0.01, 0);
    expect(pending.gold).toBe(0);
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
    expect(run.gold).toBe(0);
    expect(run.enemies.some((enemy) => enemy.id === 90)).toBe(true);

    const cleanser = createRun('warrior', 205);
    cleanser.enemies.push({ id: 91, kind: 'syntax_specter', x: 0, y: 0, hp: 15, maxHp: 15, speed: 0, damage: 1, isBoss: false, isElite: false });
    cleanser.enemies.push({ id: 92, kind: 'terminal_exit_boss', x: 20, y: 0, hp: 100, maxHp: 100, speed: 0, damage: 0, isBoss: true, isElite: false });
    cleanser.pickups.push({ id: 1, kind: 'arcane-cleanser', x: 0, y: 0, value: 0 });
    tick(cleanser, 0.01, 0);
    expect(cleanser.enemies.map((enemy) => enemy.id)).toEqual([92]);
    expect(cleanser.enemiesDefeated).toBeGreaterThanOrEqual(1);
    expect(cleanser.pickups.some((pickup) => pickup.kind === 'xp-shard')).toBe(true);
  });

  it('scales collected healing through Recovery without changing regeneration cadence', () => {
    const run = createRun('warrior', 2041);
    run.hero.stats.maxHp = 200;
    run.hero.stats.hp = 50;
    run.hero.stats.recovery = 1;
    run.pickups.push({ id: 11, kind: 'mana-roast', x: 0, y: 0, value: 30 });
    tick(run, 0.01, 0);
    expect(run.hero.stats.hp).toBeCloseTo(110.01, 5);

    const capped = createRun('warrior', 2042);
    capped.hero.stats.hp = 95;
    capped.hero.stats.recovery = 1;
    capped.pickups.push({ id: 12, kind: 'mana-roast', x: 0, y: 0, value: 30 });
    tick(capped, 0.01, 0);
    expect(capped.hero.stats.hp).toBe(100);
  });

  it('credits a duplicate pickup ID only once at the collection boundary', () => {
    const run = createRun('warrior', 2051);
    run.pickups.push(
      { id: 77, kind: 'gold-coin', x: 0, y: 0, value: 3, goldSource: 'lightSources' },
      { id: 77, kind: 'gold-coin', x: 0, y: 0, value: 99, goldSource: 'lightSources' }
    );
    tick(run, 0.01, 0);
    expect(run.gold).toBe(3);
    expect(run.goldBreakdown.lightSources).toBe(3);
    expect(run.pickups).toEqual([]);
    run.pickups.push({ id: 77, kind: 'gold-coin', x: 0, y: 0, value: 99, goldSource: 'lightSources' });
    tick(run, 0.01, 0);
    expect(run.gold).toBe(3);
    expect(run.collectedPickupIds).toContain(77);
  });

  it('evolves an eligible maxed weapon only from a late collected chest', () => {
    const run = createRun('warrior', 206);
    run.elapsedSeconds = 600;
    run.weapons[0]!.level = 8;
    run.passives.heart_of_vitality = 1;
    run.pickups.push({ id: 1, kind: 'gold-chest', x: 0, y: 0, value: 100 });
    tick(run, 0.01, 0);
    expect(run.weapons[0]).toMatchObject({ id: 'excalibur', level: 1, cooldownRemaining: 0 });
    expect(run.gold).toBeGreaterThanOrEqual(60);
    expect(run.gold).toBeLessThanOrEqual(500);
    expect(run.treasureHistory).toEqual(['evolution:broadsword:excalibur']);

    const early = createRun('warrior', 207);
    early.elapsedSeconds = 599;
    early.weapons[0]!.level = 8;
    early.passives.heart_of_vitality = 1;
    early.pickups.push({ id: 1, kind: 'gold-chest', x: 0, y: 0, value: 100 });
    tick(early, 0.01, 0);
    expect(early.weapons[0]?.id).toBe('broadsword');
    expect(early.treasureHistory[0]).toMatch(/^chest:/);

    const recipes = [
      ['broadsword', 'heart_of_vitality', 'excalibur'],
      ['arcane_bolt', 'haste_amulet', 'archmage_staff'],
      ['throwing_daggers', 'iron_bracer', 'thousand_blades'],
      ['bouncing_arrow', 'iron_armor', 'no_future'],
      ['aegis_barrier', 'phoenix_amulet', 'sanctuary'],
      ['fire_wand', 'power_gauntlets', 'hellfire'],
      ['battle_axe', 'orb_of_expansion', 'scythe_of_doom'],
      ['celestial_cross', 'clover', 'heaven_blade'],
      ['orbiting_grimoire', 'spellbinder_scroll', 'unabridged_codex'],
      ['alchemist_fire', 'token_magnetism', 'philosophers_potion']
    ] as const;
    for (const [index, [baseId, passiveId, evolvedId]] of recipes.entries()) {
      const recipeRun = createRun('warrior', 2060 + index);
      recipeRun.elapsedSeconds = 600;
      recipeRun.weapons = [{ id: baseId, level: 8, cooldownRemaining: 0 }];
      recipeRun.passives[passiveId] = 1;
      recipeRun.pickups.push({ id: 1, kind: 'gold-chest', x: 0, y: 0, value: 100 });
      tick(recipeRun, 0.01, 0);
      expect(recipeRun.weapons[0]).toMatchObject({ id: evolvedId, level: 1 });
      expect(recipeRun.treasureHistory).toEqual([`evolution:${baseId}:${evolvedId}`]);
    }
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
    expect(duplicate.gold).toBeGreaterThanOrEqual(60);
    expect(duplicate.gold).toBeLessThanOrEqual(500);
    expect(duplicate.treasureHistory).toHaveLength(1);
    expect(duplicate.chestRewards['1']).toEqual([duplicate.treasureHistory[0]]);

    const independent = createRun('warrior', 212);
    const firstReward = openTreasureChest(independent, 41);
    const secondReward = openTreasureChest(independent, 42);
    expect(openTreasureChest(independent, 41)).toBe(firstReward);
    expect(openTreasureChest(independent, 42)).toBe(secondReward);

    const bossAfterStageChest = createRun('warrior', 2121);
    openTreasureChest(bossAfterStageChest, 43);
    const historyAfterStageChest = bossAfterStageChest.treasureHistory.length;
    const bossReward = openTreasureChest(bossAfterStageChest);
    expect(bossAfterStageChest.bossRewardClaimed).toBe(true);
    expect(bossAfterStageChest.treasureHistory.length).toBeGreaterThan(historyAfterStageChest);
    expect(openTreasureChest(bossAfterStageChest)).toBe(bossReward);

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

  it('pauses the dungeon for chest presentation before resuming combat', () => {
    const run = createRun('warrior', 216);
    run.pickups.push({ id: 701, kind: 'gold-chest', x: 0, y: 0, value: 100 });
    tick(run, 0.01, 0);
    const elapsedAtChest = run.elapsedSeconds;
    expect(run.chestPresentationRemaining).toBe(1.5);
    const xAtChest = run.hero.x;
    for (let index = 0; index < 6; index += 1) tick(run, 0.25, 0, { up: false, down: false, left: false, right: true });
    expect(run.chestPresentationRemaining).toBe(0);
    expect(run.elapsedSeconds).toBeCloseTo(elapsedAtChest, 8);
    expect(run.hero.x).toBe(xAtChest);
    tick(run, 0.01, 0, { up: false, down: false, left: false, right: true });
    expect(run.elapsedSeconds).toBeGreaterThan(elapsedAtChest);
    expect(run.hero.x).toBeGreaterThan(xAtChest);
  });

  it('retains chest quality and random gold by chest identity', () => {
    const base = createRun('warrior', 213);
    const first = openTreasureChest(base, 61);
    expect(base.chestRewardTiers['61']).toBe(1);
    expect(base.chestGoldRewards['61']).toBeGreaterThanOrEqual(60);
    expect(base.chestGoldRewards['61']).toBeLessThanOrEqual(500);
    const gold = base.gold;
    expect(openTreasureChest(base, 61)).toBe(first);
    expect(base.gold).toBe(gold);

    const lucky = createRun('warrior', 214);
    lucky.hero.stats.luck = 2;
    openTreasureChest(lucky, 62);
    const tier = lucky.chestRewardTiers['62']!;
    expect([1, 3, 5]).toContain(tier);
    expect(lucky.chestRewards['62']).toHaveLength(tier);
  });

  it('selects chest upgrades from the seeded pool of eligible owned items', () => {
    const rewards = new Set<string>();
    for (let seed = 3000; seed < 3128; seed += 1) {
      const run = createRun('warrior', seed);
      run.weapons = [
        { id: 'broadsword', level: 1, cooldownRemaining: 0 },
        { id: 'arcane_bolt', level: 1, cooldownRemaining: 0 }
      ];
      rewards.add(openTreasureChest(run, seed));
    }
    expect(rewards).toEqual(new Set([
      'chest:weapon:broadsword:level-2',
      'chest:weapon:arcane_bolt:level-2'
    ]));

    const first = createRun('warrior', 3091);
    first.weapons = [
      { id: 'broadsword', level: 1, cooldownRemaining: 0 },
      { id: 'arcane_bolt', level: 1, cooldownRemaining: 0 }
    ];
    const second = createRun('warrior', 3091);
    second.weapons = [
      { id: 'broadsword', level: 1, cooldownRemaining: 0 },
      { id: 'arcane_bolt', level: 1, cooldownRemaining: 0 }
    ];
    expect(openTreasureChest(first, 3091)).toBe(openTreasureChest(second, 3091));
    expect(first.chestRewards['3091']).toEqual(second.chestRewards['3091']);
    expect(first.chestGoldRewards['3091']).toBe(second.chestGoldRewards['3091']);

    const ownedPassiveOnly = createRun('warrior', 3130);
    ownedPassiveOnly.weapons[0]!.level = 8;
    for (const id of Object.keys(ownedPassiveOnly.passives)) ownedPassiveOnly.passives[id] = 0;
    ownedPassiveOnly.passives.power_gauntlets = 1;
    expect(openTreasureChest(ownedPassiveOnly, 3130)).toBe('chest:passive:power_gauntlets:rank-2');
  });

  it('uses source rarity weights across the shared owned weapon/passive chest pool', () => {
    const counts = { common: 0, rare: 0 };
    for (let seed = 4000; seed < 5000; seed += 1) {
      const run = createRun('warrior', seed);
      run.weapons = [
        { id: 'broadsword', level: 1, cooldownRemaining: 0 },
        { id: 'bone_throw', level: 1, cooldownRemaining: 0 }
      ];
      const reward = openTreasureChest(run, seed);
      if (reward.startsWith('chest:weapon:broadsword:')) counts.common += 1;
      if (reward.startsWith('chest:weapon:bone_throw:')) counts.rare += 1;
    }
    expect(counts.common).toBeGreaterThan(950);
    expect(counts.rare).toBeLessThan(50);

    const crossType = createRun('warrior', 5001);
    crossType.weapons = [{ id: 'bone_throw', level: 1, cooldownRemaining: 0 }];
    crossType.passives.power_gauntlets = 1;
    const crossTypeReward = openTreasureChest(crossType, 5001);
    expect(crossTypeReward.startsWith('chest:passive:power_gauntlets:')).toBe(true);
  });

  it('awards stage completion gold once and includes unused revivals', () => {
    const run = createRun('warrior', 215);
    run.stageFinaleStarted = true;
    run.revivalsRemaining = 2;
    finishRun(run, 'victory');
    expect(run.goldBreakdown.stageCompletion).toBe(700);
    expect(run.summary?.stageRewardBasis).toEqual({ baseGold: 500, unusedRevivalCharges: 2, finaleRevivalCharges: 0, finaleRevivalBonus: 0 });
    expect(run.gold).toBe(700);
    finishRun(run, 'victory');
    expect(run.gold).toBe(700);

    const used = createRun('warrior', 217);
    used.stageFinaleStarted = true;
    used.finaleRevivalsUsed = 3;
    finishRun(used, 'victory');
    expect(used.goldBreakdown.stageCompletion).toBe(1100);
    expect(used.summary?.stageRewardBasis).toEqual({ baseGold: 500, unusedRevivalCharges: 0, finaleRevivalCharges: 3, finaleRevivalBonus: 600 });
  });

  it('keeps the stage completion and revival bonus outside Greed', () => {
    const run = createRun('warrior', 218, { greed: 1 });
    run.stageFinaleStarted = true;
    run.revivalsRemaining = 2;
    finishRun(run, 'victory', 'stage-timer');
    expect(run.goldBreakdown.stageCompletion).toBe(700);
    expect(run.gold).toBe(700);
    expect(run.summary?.stageRewardBasis).toEqual({ baseGold: 500, unusedRevivalCharges: 2, finaleRevivalCharges: 0, finaleRevivalBonus: 0 });
  });

  it('carries treasure rewards into the run summary', () => {
    const run = createRun('warrior', 211);
    run.treasureHistory.push('evolution:broadsword:excalibur');
    finishRun(run, 'victory');
    expect(run.summary?.treasureRewards).toEqual(['evolution:broadsword:excalibur']);
  });
});
