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
    expect(run.phase).toBe('level-up');
    expect(run.pendingCards.map((card) => card.id)).toEqual(['weapon-upgrade', 'power-gauntlets', 'heal']);
    chooseUpgrade(run, 'power-gauntlets');
    expect(run.phase).toBe('dungeon');
    expect(run.hero.stats.might).toBeCloseTo(0.1);
    expect(run.passives.power_gauntlets).toBe(1);
    expect(getHeroMoveSpeed(run, 40)).toBe(60);
  });

  it('tracks spawned and defeated enemies separately', () => {
    const run = createRun('warrior', 5);
    for (let index = 0; index < 4; index += 1) tick(run, 0.25, 0);
    expect(run.enemiesSpawned).toBe(1);
    expect(run.enemiesDefeated).toBe(0);
    expect(run.enemies.length).toBe(1);
  });

  it('applies persistent Guild upgrades at run start', () => {
    const run = createRun('warrior', 1, { might: 2 });
    expect(run.hero.stats.might).toBeCloseTo(0.1);
  });

  it('spawns a boss on deterministic schedule and eventually reaches victory', () => {
    const run = createRun('warrior', 7);
    run.hero.stats.hp = 10000;
    run.hero.stats.maxHp = 10000;
    let elapsed = 0;
    while (run.phase !== 'summary' && elapsed < getBossTimeSeconds() + 90) {
      if (run.phase === 'level-up') chooseUpgrade(run, run.pendingCards[0]?.id ?? 'heal');
      tick(run, 0.25, 40);
      elapsed += 0.25;
    }
    expect(run.bossSpawned).toBe(true);
    expect(run.phase).toBe('summary');
    expect(run.outcome).toBe('victory');
  });

  it('keeps the entity pool bounded during a five-minute fixture', () => {
    const run = createRun('paladin', 99);
    run.hero.stats.hp = 100000; run.hero.stats.maxHp = 100000;
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
