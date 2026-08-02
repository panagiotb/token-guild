import { describe, expect, it } from 'vitest';
import { createRun } from '../../src/game/simulation';
import { createHostRun, createHostSnapshot } from '../../src/extension/hostRun';
import { DEFAULT_PROGRESS } from '../../src/extension/stateManager';
import { isRunSnapshot, shouldAcceptRunSnapshot } from '../../src/webview/snapshot';

describe('run snapshot boundary', () => {
  it('accepts a valid host snapshot and rejects replayed or foreign sequences', () => {
    const snapshot = createHostSnapshot(createHostRun(DEFAULT_PROGRESS, 'warrior', 'run-1'));
    expect(isRunSnapshot(snapshot)).toBe(true);
    expect(shouldAcceptRunSnapshot(undefined, -1, snapshot)).toBe(true);
    expect(shouldAcceptRunSnapshot('run-1', snapshot.sequence, snapshot)).toBe(false);
    expect(shouldAcceptRunSnapshot('other-run', -1, snapshot)).toBe(false);
  });

  it('fails closed for malformed state envelopes', () => {
    const state = createRun('warrior');
    state.lightSources.push({ id: 1, x: 10, y: -10, hp: 10, maxHp: 10 });
    const snapshot = { runId: 'run-1', sequence: 0, nextIntentSequence: 1, state };
    expect(isRunSnapshot(snapshot)).toBe(true);
    expect(isRunSnapshot({ ...snapshot, sequence: -1 })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, hero: { ...state.hero, x: Number.NaN } } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, hero: { ...state.hero, facingX: Number.NaN } } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, enemies: 'not-an-array' } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, enemies: [{ ...state.enemies[0], movementPattern: 'teleport' }] } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, enemies: [{ ...state.enemies[0], isFinaleThreat: 'yes' }] } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, lightSources: [{ id: 1, x: 0, y: 0, hp: 11, maxHp: 10 }] } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, goldBreakdown: { ...state.goldBreakdown, stageCompletion: -1 } } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, goldBreakdown: { ...state.goldBreakdown, eliteDrops: -1 } } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, revivalsRemaining: -1 } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, revivalsUsed: -1 } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, finaleThreatsSpawned: -1 } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, stageFinaleDeadline: Number.NaN } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, collectedPickupIds: [Number.NaN] } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, visualEffects: [{ kind: 'explosion', x: 0, y: 0, radius: 1, durationSeconds: 0.45, remainingSeconds: Number.NaN }] } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, hero: { ...state.hero, stats: { ...state.hero.stats, hp: state.hero.stats.maxHp + 1 } } } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, hero: { ...state.hero, stats: { ...state.hero.stats, amount: 1001 } } } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, hero: { ...state.hero, stats: { ...state.hero.stats, amount: 12 } } } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, hero: { ...state.hero, stats: { ...state.hero.stats, might: 9 } } } })).toBe(true);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, hero: { ...state.hero, stats: { ...state.hero.stats, might: 10 } } } })).toBe(false);
    for (const [key, value] of [['area', 10], ['speed', 5], ['duration', 5] ] as const) {
      expect(isRunSnapshot({ ...snapshot, state: { ...state, hero: { ...state.hero, stats: { ...state.hero.stats, [key]: value } } } })).toBe(false);
    }
    expect(isRunSnapshot({ ...snapshot, state: { ...state, hero: { ...state.hero, stats: { ...state.hero.stats, amount: 11 } } } })).toBe(true);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, hero: { ...state.hero, baseStats: { ...state.hero.baseStats, maxHp: 101 } } } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, battery: { ...state.battery, level: 2 } } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, enemies: [{ id: 1, kind: 'syntax_specter', x: 0, y: 0, hp: 1, maxHp: 1, speed: 1, damage: 1, isBoss: false, isElite: false }, { id: 1, kind: 'bug_bat', x: 1, y: 1, hp: 1, maxHp: 1, speed: 1, damage: 1, isBoss: false, isElite: false }] } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, projectiles: [{ id: 2, weaponId: 'bouncing_arrow', x: 0, y: 0, vx: 1, vy: 0, damage: 1, area: 1, remainingPierce: 0, remainingSeconds: 1, knockback: 0, hitEnemyIds: [], hitCooldowns: { '7': Number.NaN } }] } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, projectiles: [{ id: 2, weaponId: 'celestial_cross', x: 0, y: 0, vx: 1, vy: 0, damage: 1, area: 1, remainingPierce: 30, remainingSeconds: 1, knockback: 1, hitEnemyIds: [], boomerangOriginX: 0, boomerangOriginY: 0, boomerangReturning: false }] } })).toBe(true);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, projectiles: [{ id: 2, weaponId: 'celestial_cross', x: 0, y: 0, vx: 1, vy: 0, damage: 1, area: 1, remainingPierce: 30, remainingSeconds: 1, knockback: 1, hitEnemyIds: [], boomerangOriginX: 0, boomerangReturning: false }] } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, projectiles: [{ id: 2, weaponId: 'bouncing_arrow', x: 0, y: 0, vx: 1, vy: 0, damage: 1, area: 1, remainingPierce: 0, remainingSeconds: 1, knockback: 0, hitEnemyIds: [], boomerangOriginX: 0, boomerangOriginY: 0, boomerangReturning: false }] } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, projectiles: [{ id: 2, weaponId: 'orbiting_grimoire', x: 44, y: 0, vx: 0, vy: 0, damage: 1, area: 1, remainingPierce: 30, remainingSeconds: 1, knockback: 1, hitEnemyIds: [], orbitAngle: 0, orbitRadius: 44, orbitAngularSpeed: 2 }] } })).toBe(true);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, projectiles: [{ id: 2, weaponId: 'orbiting_grimoire', x: 44, y: 0, vx: 0, vy: 0, damage: 1, area: 1, remainingPierce: 30, remainingSeconds: 1, knockback: 1, hitEnemyIds: [], orbitAngle: 0, orbitRadius: 44 }] } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, projectiles: [{ id: 2, weaponId: 'celestial_cross', x: 0, y: 0, vx: 1, vy: 0, damage: 1, area: 1, remainingPierce: 30, remainingSeconds: 1, knockback: 1, hitEnemyIds: [], orbitAngle: 0, orbitRadius: 44, orbitAngularSpeed: 2 }] } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, projectiles: [{ id: 2, weaponId: 'alchemist_fire', x: 0, y: 0, vx: 0, vy: 0, damage: 10, area: 5, remainingPierce: 99, remainingSeconds: 2, knockback: 0, hitEnemyIds: [], hitCooldowns: { '7': 0.5 } }] } })).toBe(true);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, projectiles: [{ id: 2, weaponId: 'alchemist_fire', x: 0, y: 0, vx: 0, vy: 0, damage: 10, area: 5, remainingPierce: 99, remainingSeconds: 2, knockback: 0, hitEnemyIds: [], hitCooldowns: { '7': 5.1 } }] } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, projectiles: [{ id: 2, weaponId: 'celestial_cross', x: 0, y: 0, vx: 1, vy: 0, damage: 1, area: 1, remainingPierce: 30, remainingSeconds: 1, knockback: 1, hitEnemyIds: [], hitCooldowns: { '7': 0.5 } }] } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, weapons: [{ id: 'aegis_barrier', level: 1, cooldownRemaining: 0, auraHitCooldowns: { '7': Number.NaN } }] } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, weapons: [{ id: 'aegis_barrier', level: 1, cooldownRemaining: 0, auraHitCooldowns: Object.fromEntries(Array.from({ length: 71 }, (_, index) => [String(index), 0.25])) }] } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, weapons: [{ id: 'arcane_bolt', level: 2, cooldownRemaining: 0.9, pendingShots: 1, shotIntervalRemaining: 0.1 }] } })).toBe(true);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, weapons: [{ id: 'arcane_bolt', level: 2, cooldownRemaining: 0.9, pendingShots: 241, shotIntervalRemaining: 0.1 }] } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, weapons: [{ id: 'broadsword', level: 1, cooldownRemaining: 0, pendingShots: 1 }] } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, weapons: [{ id: 'battle_axe', level: 5, cooldownRemaining: 3.8, pendingShots: 2, shotIntervalRemaining: 0.2, pendingVolleyAngle: 0.25, pendingVolleyTotal: 3 }] } })).toBe(true);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, weapons: [{ id: 'battle_axe', level: 5, cooldownRemaining: 3.8, pendingShots: 2, shotIntervalRemaining: 0.2, pendingVolleyTotal: 3 }] } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, weapons: [{ id: 'battle_axe', level: 5, cooldownRemaining: 3.8, pendingShots: 2, shotIntervalRemaining: 0.2, pendingVolleyAngle: 0.25, pendingVolleyTotal: 2 }] } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, weapons: [{ id: 'arcane_bolt', level: 2, cooldownRemaining: 0.9, pendingShots: 1, shotIntervalRemaining: 0.1, pendingVolleyAngle: 0, pendingVolleyTotal: 2 }] } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, heroId: 'not-a-hero' } })).toBe(false);
    expect(isRunSnapshot({ ...snapshot, state: { ...state, stageId: 'missing-stage' } })).toBe(false);
  });

  it('accepts a paused revival snapshot as a renderable run phase', () => {
    const state = createRun('warrior', 42, { revival: 1 });
    state.phase = 'revival';
    const snapshot = { runId: 'revival-run', sequence: 0, nextIntentSequence: 1, state };
    expect(isRunSnapshot(snapshot)).toBe(true);
  });

  it('validates host-owned dungeon pause state', () => {
    const state = createRun('warrior', 43);
    state.paused = true;
    expect(isRunSnapshot({ runId: 'paused-run', sequence: 0, nextIntentSequence: 1, state })).toBe(true);
    expect(isRunSnapshot({ runId: 'paused-run', sequence: 0, nextIntentSequence: 1, state: { ...state, paused: 'yes' as never } })).toBe(false);
  });
});
