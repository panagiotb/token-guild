import { describe, expect, it } from 'vitest';
import { calculateBerserkSpeed, calculateDamage, getXpRequiredForLevel } from '../../src/game/math';
import { applyTokenInput, chooseUpgrade, createRun, getBossTimeSeconds, getHeroMoveSpeed, tick } from '../../src/game/simulation';

describe('deterministic game math', () => {
  it('uses the mapped XP curve and berserk multiplier', () => {
    expect(getXpRequiredForLevel(1)).toBe(5);
    expect(getXpRequiredForLevel(20)).toBe(2000);
    expect(calculateDamage(20, { hp: 100, maxHp: 100, armor: 0, moveSpeed: 1, might: 0.1, area: 0, speed: 0, cooldown: 0, amount: 1, magnet: 1, growth: 0 }, 39)).toBe(22);
    expect(calculateDamage(20, { hp: 100, maxHp: 100, armor: 0, moveSpeed: 1, might: 0.1, area: 0, speed: 0, cooldown: 0, amount: 1, magnet: 1, growth: 0 }, 40)).toBe(33);
    expect(calculateBerserkSpeed(40, 40)).toBe(60);
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
    expect(run.pendingCards.map((card) => card.id)).toEqual(['weapon-upgrade', 'power-gauntlets', 'heal']);
    chooseUpgrade(run, 'power-gauntlets');
    expect(run.phase).toBe('dungeon');
    expect(run.hero.stats.might).toBeCloseTo(0.1);
    expect(run.passives.power_gauntlets).toBe(1);
    expect(run.goldBreakdown.enemyKills).toBe(5);
    expect(run.upgradeHistory).toEqual(['power_gauntlets']);
    expect(getHeroMoveSpeed(run, 40)).toBe(60);
  });

  it('tracks spawned and defeated enemies separately', () => {
    const run = createRun('warrior', 5);
    for (let index = 0; index < 4; index += 1) tick(run, 0.25, 0);
    expect(run.enemiesSpawned).toBe(1);
    expect(run.enemiesDefeated).toBe(0);
    expect(run.enemies.length).toBe(1);
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
    expect(run.goldBreakdown).toEqual({ enemyKills: 0, bossChest: 100 });
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

  it('applies persistent Guild upgrades at run start', () => {
    const run = createRun('warrior', 1, { might: 2 });
    expect(run.hero.stats.might).toBeCloseTo(0.1);
  });

  it('starts every run at level one even when a hero has a higher recorded best', () => {
    const run = createRun('wizard', 17, { might: 4 });
    expect(run.level).toBe(1);
  });

  it('spawns a boss on deterministic schedule and eventually reaches victory', () => {
    const run = createRun('warrior', 7);
    run.hero.stats.hp = 10000;
    run.hero.stats.maxHp = 10000;
    run.hero.stats.magnet = 1000;
    let elapsed = 0;
    while (run.phase !== 'summary' && elapsed < getBossTimeSeconds() + 90) {
      if (run.phase === 'level-up') chooseUpgrade(run, run.pendingCards[0]?.id ?? 'heal');
      tick(run, 0.25, 40);
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
    expect(summary.gold).toBe(summary.goldBreakdown.enemyKills + summary.goldBreakdown.bossChest);
    expect(summary.goldBreakdown.bossChest).toBe(100);
    expect(run.pickups.filter((pickup) => pickup.kind === 'gold-chest')).toEqual([]);
  });

  it('keeps the entity pool bounded during a five-minute fixture', () => {
    const run = createRun('paladin', 99);
    run.hero.stats.hp = 100000; run.hero.stats.maxHp = 100000;
    run.hero.stats.magnet = 1000;
    for (let index = 0; index < 1200; index += 1) {
      if (run.phase === 'summary') break;
      if (run.phase === 'level-up') chooseUpgrade(run, run.pendingCards[0]?.id ?? 'heal');
      tick(run, 0.25, 12);
      if (run.phase === 'level-up') chooseUpgrade(run, run.pendingCards[0]?.id ?? 'heal');
    }
    expect(run.enemies.length).toBeLessThanOrEqual(60);
    expect(run.phase).toBe('summary');
  });
});
