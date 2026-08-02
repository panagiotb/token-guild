import { describe, expect, it } from 'vitest';
import { isOutsideViewport, isWithinProjectileCullRadius, perimeterSpawnPoint, ricochetBounds, shouldDespawnEnemy, shouldRelocateBoss, WORLD_POLICIES } from '../../src/game/worldPolicies';
import { SIMULATION_POLICIES } from '../../src/game/policies';

describe('named open-world policies', () => {
  it('keeps deterministic simulation budgets positive and centralized', () => {
    expect(SIMULATION_POLICIES.fixedStepSeconds).toBe(0.01);
    expect(SIMULATION_POLICIES.maxEnemies).toBeGreaterThan(0);
    expect(SIMULATION_POLICIES.maxEnemies).toBeGreaterThanOrEqual(162);
    expect(SIMULATION_POLICIES.maxProjectiles).toBeGreaterThan(SIMULATION_POLICIES.maxEnemies);
    expect(SIMULATION_POLICIES.maxXpPickups).toBeGreaterThan(SIMULATION_POLICIES.maxProjectiles);
    expect(SIMULATION_POLICIES.maxPickups).toBeGreaterThan(SIMULATION_POLICIES.maxXpPickups);
  });
  it('keeps projectile culling relative to the moving hero, not world origin', () => {
    const hero = { x: 100_000, y: -100_000 };
    expect(isWithinProjectileCullRadius({ x: hero.x + WORLD_POLICIES.projectileCullRadius - 1, y: hero.y }, hero)).toBe(true);
    expect(isWithinProjectileCullRadius({ x: hero.x + WORLD_POLICIES.projectileCullRadius + 1, y: hero.y }, hero)).toBe(false);
  });

  it('keeps ricochet bounds centered on the current hero position', () => {
    expect(ricochetBounds({ x: 5000, y: -3000 })).toEqual({ minX: 4840, maxX: 5160, minY: -3160, maxY: -2840 });
  });

  it('despawns only non-bosses beyond the active world persistence radius', () => {
    const hero = { x: 100_000, y: -100_000 };
    expect(shouldDespawnEnemy({ x: hero.x + WORLD_POLICIES.enemyCullRadius + 1, y: hero.y, isBoss: false }, hero)).toBe(true);
    expect(shouldDespawnEnemy({ x: hero.x + WORLD_POLICIES.enemyCullRadius + 1, y: hero.y, isBoss: true }, hero)).toBe(false);
  });

  it('relocates persistent bosses after the same world-relative threshold', () => {
    const hero = { x: 100_000, y: -100_000 };
    expect(shouldRelocateBoss({ x: hero.x + WORLD_POLICIES.enemyCullRadius + 1, y: hero.y, isBoss: true }, hero)).toBe(true);
    expect(shouldRelocateBoss({ x: hero.x + WORLD_POLICIES.enemyCullRadius + 1, y: hero.y, isBoss: false }, hero)).toBe(false);
    expect(shouldDespawnEnemy({ x: hero.x + 101, y: hero.y, isBoss: false }, hero, 100)).toBe(true);
    expect(shouldRelocateBoss({ x: hero.x + 101, y: hero.y, isBoss: true }, hero, 100)).toBe(true);
  });

  it('places regular spawns outside every edge of the logical viewport', () => {
    const hero = { x: 100_000, y: -100_000 };
    const point = perimeterSpawnPoint(hero, 0.125, 0, WORLD_POLICIES.enemySpawnInnerRadius, WORLD_POLICIES.enemySpawnOuterRadius);
    expect(isOutsideViewport(point, hero)).toBe(true);
    expect(Math.hypot(point.x - hero.x, point.y - hero.y)).toBeCloseTo(WORLD_POLICIES.enemySpawnInnerRadius, 8);
    expect(perimeterSpawnPoint(hero, Number.NaN, Number.NaN, 10, 20)).toEqual({ x: hero.x + 10, y: hero.y });
  });

  it('keeps the spawn policy camera-relative after large travel', () => {
    const hero = { x: -900_000, y: 700_000 };
    const point = perimeterSpawnPoint(hero, 0.5, 1, WORLD_POLICIES.lightSourceInnerRadius, WORLD_POLICIES.lightSourceOuterRadius);
    expect(isOutsideViewport(point, hero)).toBe(true);
    expect(point).toEqual({ x: hero.x - WORLD_POLICIES.lightSourceOuterRadius, y: hero.y });
  });
});
