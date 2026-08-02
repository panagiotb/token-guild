import type { RunSnapshot } from '../shared/types';
import { maxCombatStatFor, SIMULATION_POLICIES } from '../game/policies';
import { MVP_REGISTRY } from '../game/content';
import { BatteryEngine } from '../shared/battery';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasFiniteCoordinates(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y);
}

const COMBAT_STAT_KEYS = ['hp', 'maxHp', 'armor', 'moveSpeed', 'might', 'area', 'speed', 'cooldown', 'amount', 'magnet', 'growth', 'duration', 'luck', 'greed', 'curse', 'recovery', 'revival'] as const;

function hasValidHeroStats(hero: unknown, heroId: unknown): boolean {
  if (!isRecord(hero) || !isRecord(hero.stats) || !isRecord(hero.baseStats) || typeof heroId !== 'string') return false;
  const canonicalClass = MVP_REGISTRY.classes.find((candidate) => candidate.id === heroId);
  if (!canonicalClass) return false;
  const stats = hero.stats;
  const baseStats = hero.baseStats;
  if (!COMBAT_STAT_KEYS.every((key) => {
    const current = stats[key];
    const base = baseStats[key];
    const canonical = canonicalClass.baseStats[key];
    const maximum = maxCombatStatFor(key);
    return isFiniteNumber(current) && current >= 0 && current <= maximum
      && isFiniteNumber(base) && base >= 0 && base <= maximum
      && isFiniteNumber(canonical) && Math.abs(base - canonical) <= 1e-9;
  })) return false;
  const hp = stats.hp;
  const maxHp = stats.maxHp;
  const amount = stats.amount;
  return isFiniteNumber(hp) && isFiniteNumber(maxHp) && isFiniteNumber(amount) && maxHp > 0 && hp >= 0 && hp <= maxHp && amount >= 1;
}

function hasUniqueEntityIds(values: unknown[]): boolean {
  const ids = values.map((value) => isRecord(value) ? value.id : undefined);
  if (ids.some((id) => !Number.isSafeInteger(id) || (id as number) < 0)) return false;
  return new Set(ids as number[]).size === ids.length;
}

function hasValidProjectileHitCooldowns(value: unknown, definition: { pattern: string; projectileHitboxDelaySeconds?: number }): boolean {
  if (value === undefined) return true;
  if (!isRecord(value) || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  if (definition.pattern !== 'ricochet' && definition.pattern !== 'pool') return false;
  const maximumDelay = definition.projectileHitboxDelaySeconds ?? SIMULATION_POLICIES.maxProjectileHitboxDelaySeconds;
  return entries.length <= SIMULATION_POLICIES.maxProjectileHitCooldownEntries && entries.every(([id, remaining]) => /^\d+$/.test(id) && isFiniteNumber(remaining) && remaining >= 0 && remaining <= maximumDelay);
}

function hasValidBoomerangState(projectile: Record<string, unknown>, definition: { pattern: string }): boolean {
  const hasOriginX = projectile.boomerangOriginX !== undefined;
  const hasOriginY = projectile.boomerangOriginY !== undefined;
  const hasReturning = projectile.boomerangReturning !== undefined;
  if (!hasOriginX && !hasOriginY && !hasReturning) return definition.pattern !== 'boomerang';
  return definition.pattern === 'boomerang'
    && hasOriginX
    && hasOriginY
    && hasReturning
    && isFiniteNumber(projectile.boomerangOriginX)
    && isFiniteNumber(projectile.boomerangOriginY)
    && typeof projectile.boomerangReturning === 'boolean';
}

function hasValidOrbitState(projectile: Record<string, unknown>, definition: { pattern: string }): boolean {
  const hasAngle = projectile.orbitAngle !== undefined;
  const hasRadius = projectile.orbitRadius !== undefined;
  const hasSpeed = projectile.orbitAngularSpeed !== undefined;
  if (!hasAngle && !hasRadius && !hasSpeed) return definition.pattern !== 'orbit';
  return definition.pattern === 'orbit'
    && hasAngle
    && hasRadius
    && hasSpeed
    && isFiniteNumber(projectile.orbitAngle)
    && isFiniteNumber(projectile.orbitRadius)
    && projectile.orbitRadius > 0
    && projectile.orbitRadius <= 180
    && isFiniteNumber(projectile.orbitAngularSpeed)
    && projectile.orbitAngularSpeed > 0
    && projectile.orbitAngularSpeed <= 100;
}

function hasValidAuraHitCooldowns(value: unknown): boolean {
  if (value === undefined) return true;
  if (!isRecord(value) || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return entries.length <= SIMULATION_POLICIES.maxAuraHitCooldownEntries && entries.every(([id, remaining]) => /^\d+$/.test(id) && isFiniteNumber(remaining) && remaining >= 0 && remaining <= SIMULATION_POLICIES.maxAuraHitCooldownSeconds);
}

function hasValidPendingVolleyState(weapon: Record<string, unknown>, definition: { pattern: string }): boolean {
  const hasAngle = weapon.pendingVolleyAngle !== undefined;
  const hasTotal = weapon.pendingVolleyTotal !== undefined;
  const pending = weapon.pendingShots;
  if (!hasAngle && !hasTotal) {
    return !(definition.pattern === 'fan' && pending !== undefined && typeof pending === 'number' && pending > 0);
  }
  return definition.pattern === 'fan'
    && typeof pending === 'number'
    && Number.isSafeInteger(pending)
    && pending > 0
    && isFiniteNumber(weapon.pendingVolleyAngle)
    && typeof weapon.pendingVolleyTotal === 'number'
    && Number.isSafeInteger(weapon.pendingVolleyTotal)
    && weapon.pendingVolleyTotal > pending
    && weapon.pendingVolleyTotal <= SIMULATION_POLICIES.maxProjectiles;
}

/** Keep host messages fail-closed at the webview boundary. The complete
 * simulation state is validated more deeply by the domain; this guard checks
 * the envelope and the fields needed before replacing the render state. */
export function isRunSnapshot(value: unknown): value is RunSnapshot {
  if (!isRecord(value) || typeof value.runId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value.runId) || typeof value.sequence !== 'number' || !Number.isSafeInteger(value.sequence) || value.sequence < 0 || typeof value.nextIntentSequence !== 'number' || !Number.isSafeInteger(value.nextIntentSequence) || value.nextIntentSequence < 1 || !isRecord(value.state)) return false;
  const state = value.state;
  const hero = state.hero;
  const battery = state.battery;
  const enemies = state.enemies;
  const projectiles = state.projectiles;
  const lightSources = state.lightSources;
  const pickups = state.pickups;
  const weapons = state.weapons;
  const visualEffects = state.visualEffects;
  const collectedPickupIds = state.collectedPickupIds;
  const pendingCards = state.pendingCards;
  const goldBreakdown = state.goldBreakdown;
  const validGoldBreakdown = isRecord(goldBreakdown)
    && ['enemyKills', 'eliteDrops', 'bossChest', 'overflow', 'lightSources', 'stageCompletion', 'levelUp'].every((key) => goldBreakdown[key] === undefined || (isFiniteNumber(goldBreakdown[key]) && goldBreakdown[key] >= 0));
  return (state.phase === 'dungeon' || state.phase === 'level-up' || state.phase === 'revival' || state.phase === 'summary')
    && (state.paused === undefined || typeof state.paused === 'boolean')
    && typeof state.heroId === 'string' && MVP_REGISTRY.classes.some((hero) => hero.id === state.heroId)
    && typeof state.stageId === 'string' && MVP_REGISTRY.stages.some((stage) => stage.id === state.stageId)
    && isFiniteNumber(state.elapsedSeconds) && state.elapsedSeconds >= 0
    && isFiniteNumber(state.simulationRemainderSeconds) && state.simulationRemainderSeconds >= 0 && state.simulationRemainderSeconds < 0.25
    && (state.chestPresentationRemaining === undefined || (isFiniteNumber(state.chestPresentationRemaining) && state.chestPresentationRemaining >= 0 && state.chestPresentationRemaining <= 5))
    && typeof state.level === 'number' && Number.isSafeInteger(state.level) && state.level >= 1
    && typeof state.revivalsRemaining === 'number' && Number.isSafeInteger(state.revivalsRemaining) && state.revivalsRemaining >= 0
    && typeof state.revivalsUsed === 'number' && Number.isSafeInteger(state.revivalsUsed) && state.revivalsUsed >= 0
    && typeof state.finaleThreatsSpawned === 'number' && Number.isSafeInteger(state.finaleThreatsSpawned) && state.finaleThreatsSpawned >= 0
    && (state.stageFinaleStartedAt === undefined || (isFiniteNumber(state.stageFinaleStartedAt) && state.stageFinaleStartedAt >= 0))
    && (state.stageFinaleDeadline === undefined || (isFiniteNumber(state.stageFinaleDeadline) && state.stageFinaleDeadline >= 0))
    && isFiniteNumber(state.totalTokens) && state.totalTokens >= 0
    && isFiniteNumber(state.gold) && state.gold >= 0
    && validGoldBreakdown
    && hasFiniteCoordinates(hero)
    && (hero.facingX === undefined || isFiniteNumber(hero.facingX))
    && (hero.facingY === undefined || isFiniteNumber(hero.facingY))
    && hasValidHeroStats(hero, state.heroId)
    && isRecord(battery) && isFiniteNumber(battery.currentCapacity) && isFiniteNumber(battery.maxCapacity) && battery.maxCapacity === BatteryEngine.capacityForLevel(battery.level as number) && battery.maxCapacity > 0 && battery.currentCapacity >= 0 && battery.currentCapacity <= battery.maxCapacity && Number.isInteger(battery.level) && (battery.level as number) >= 1 && (battery.level as number) <= BatteryEngine.MAX_LEVEL && typeof battery.isLockedOut === 'boolean' && (battery.idleTimeSeconds === undefined || (isFiniteNumber(battery.idleTimeSeconds) && battery.idleTimeSeconds >= 0))
    && Array.isArray(enemies) && enemies.length <= SIMULATION_POLICIES.maxEnemies && hasUniqueEntityIds(enemies) && enemies.every((enemy) => isRecord(enemy) && typeof enemy.kind === 'string' && hasFiniteCoordinates(enemy) && isFiniteNumber(enemy.hp) && enemy.hp >= 0 && isFiniteNumber(enemy.maxHp) && enemy.maxHp > 0 && enemy.hp <= enemy.maxHp && isFiniteNumber(enemy.speed) && enemy.speed >= 0 && isFiniteNumber(enemy.damage) && enemy.damage >= 0 && typeof enemy.isBoss === 'boolean' && typeof enemy.isElite === 'boolean' && (enemy.isFinaleThreat === undefined || typeof enemy.isFinaleThreat === 'boolean') && (enemy.isInvulnerable === undefined || typeof enemy.isInvulnerable === 'boolean') && (enemy.movementPattern === undefined || enemy.movementPattern === 'chase' || enemy.movementPattern === 'wavy') && (enemy.movementPhase === undefined || isFiniteNumber(enemy.movementPhase)) && (enemy.knockbackResistance === undefined || (isFiniteNumber(enemy.knockbackResistance) && enemy.knockbackResistance >= 0 && enemy.knockbackResistance <= 1)))
    && Array.isArray(projectiles) && projectiles.length <= SIMULATION_POLICIES.maxProjectiles && hasUniqueEntityIds(projectiles) && projectiles.every((projectile) => { const definition = isRecord(projectile) && typeof projectile.weaponId === 'string' ? MVP_REGISTRY.weapons.find((candidate) => candidate.id === projectile.weaponId) : undefined; return isRecord(projectile) && definition !== undefined && hasFiniteCoordinates(projectile) && isFiniteNumber(projectile.vx) && isFiniteNumber(projectile.vy) && isFiniteNumber(projectile.damage) && projectile.damage >= 0 && isFiniteNumber(projectile.area) && projectile.area >= 0 && Array.isArray(projectile.hitEnemyIds) && projectile.hitEnemyIds.length <= SIMULATION_POLICIES.maxEnemies && projectile.hitEnemyIds.every((id) => Number.isSafeInteger(id) && id >= 0) && hasValidProjectileHitCooldowns(projectile.hitCooldowns, definition) && hasValidBoomerangState(projectile, definition) && hasValidOrbitState(projectile, definition); })
    && Array.isArray(lightSources) && lightSources.length <= SIMULATION_POLICIES.maxLightSources && hasUniqueEntityIds(lightSources) && lightSources.every((source) => isRecord(source) && hasFiniteCoordinates(source) && isFiniteNumber(source.hp) && source.hp >= 0 && isFiniteNumber(source.maxHp) && source.maxHp > 0 && source.hp <= source.maxHp)
    && Array.isArray(pickups) && pickups.length <= SIMULATION_POLICIES.maxPickups && hasUniqueEntityIds(pickups) && pickups.every((pickup) => isRecord(pickup) && typeof pickup.kind === 'string' && hasFiniteCoordinates(pickup) && isFiniteNumber(pickup.value) && pickup.value >= 0 && (pickup.goldSource === undefined || pickup.goldSource === 'enemyKills' || pickup.goldSource === 'eliteDrops' || pickup.goldSource === 'bossChest' || pickup.goldSource === 'lightSources' || pickup.goldSource === 'stageCompletion' || pickup.goldSource === 'levelUp'))
    && Array.isArray(weapons) && weapons.length <= SIMULATION_POLICIES.maxWeaponSlots && weapons.every((weapon) => { const definition = isRecord(weapon) && typeof weapon.id === 'string' ? MVP_REGISTRY.weapons.find((candidate) => candidate.id === weapon.id) : undefined; return isRecord(weapon) && definition !== undefined && isFiniteNumber(weapon.level) && Number.isSafeInteger(weapon.level) && weapon.level >= 1 && isFiniteNumber(weapon.cooldownRemaining) && weapon.cooldownRemaining >= 0 && (weapon.pendingShots === undefined || (typeof weapon.pendingShots === 'number' && Number.isSafeInteger(weapon.pendingShots) && weapon.pendingShots >= 0 && weapon.pendingShots <= SIMULATION_POLICIES.maxProjectiles && definition.projectileInterval > 0)) && (weapon.shotIntervalRemaining === undefined || (isFiniteNumber(weapon.shotIntervalRemaining) && weapon.shotIntervalRemaining >= 0 && weapon.shotIntervalRemaining <= SIMULATION_POLICIES.maxWeaponSequenceIntervalSeconds && definition.projectileInterval > 0)) && hasValidPendingVolleyState(weapon, definition) && hasValidAuraHitCooldowns(weapon.auraHitCooldowns); })
    && (visualEffects === undefined || (Array.isArray(visualEffects) && visualEffects.length <= SIMULATION_POLICIES.maxVisualEffects && visualEffects.every((effect) => isRecord(effect) && effect.kind === 'explosion' && hasFiniteCoordinates(effect) && isFiniteNumber(effect.radius) && effect.radius > 0 && isFiniteNumber(effect.durationSeconds) && effect.durationSeconds > 0 && effect.durationSeconds <= SIMULATION_POLICIES.visualEffectDurationSeconds && isFiniteNumber(effect.remainingSeconds) && effect.remainingSeconds >= 0 && effect.remainingSeconds <= effect.durationSeconds)))
    && (collectedPickupIds === undefined || (Array.isArray(collectedPickupIds) && collectedPickupIds.length <= SIMULATION_POLICIES.maxCollectedPickupIds && collectedPickupIds.every((id) => Number.isSafeInteger(id) && id >= 0) && new Set(collectedPickupIds).size === collectedPickupIds.length))
    && Array.isArray(pendingCards) && pendingCards.length <= 4 && pendingCards.every((card) => isRecord(card) && typeof card.id === 'string' && typeof card.label === 'string' && typeof card.kind === 'string' && typeof card.target === 'string');
}

export function shouldAcceptRunSnapshot(currentRunId: string | undefined, lastSequence: number, snapshot: RunSnapshot): boolean {
  if (currentRunId !== undefined && currentRunId !== snapshot.runId) return false;
  return snapshot.sequence > lastSequence;
}
