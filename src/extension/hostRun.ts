import { applyTokenInput, banishLevelUpCard, chooseUpgrade, createRun, declineRevival, DEFAULT_STAGE_ID, rerollLevelUp, reviveRun, setRunPaused, skipLevelUp, tick } from '../game/simulation';
import { classDefinition, enemyDefinition, MVP_REGISTRY, passiveDefinition, weaponDefinition } from '../game/content';
import { metaUpgradeDefinition } from '../game/meta';
import { maxCombatStatFor, SIMULATION_POLICIES } from '../game/policies';
import { validatePendingUpgradeCards } from '../game/upgradeEligibility';
import { MAX_TOKEN_EVENT_COUNT, validateTokenStreamEvent } from '../shared/validation';
import { BatteryEngine } from '../shared/battery';
import type { InputSnapshot, HeroId, ProjectileState, RunState, RunSummary, WeaponState } from '../game/types';
import type { PersistedProgress, RunSnapshot, TokenStreamEvent } from '../shared/types';

export interface HostRunSession {
  readonly runId: string;
  readonly heroId: HeroId;
  readonly state: RunState;
  sequence: number;
  /** Last accepted client intent. This makes retries idempotent and rejects
   * future/out-of-order messages without advancing the canonical run. */
  lastIntentSequence: number;
}

/** A run may be long-lived, but it must not accumulate unbounded producer
 * value from one compromised or misconfigured telemetry source. The limit is
 * well above the deterministic MVP fixture and is enforced before mutation. */
export const MAX_RUN_OUTPUT_TOKENS = 100_000_000;

/** A bounded, detached host checkpoint that can survive a webview reload.
 * It intentionally contains only the canonical simulation snapshot and
 * sequencing metadata; persistent wallet/reward state remains StateManager's
 * responsibility. */
export interface HostRunCheckpoint {
  readonly runId: string;
  readonly heroId: HeroId;
  readonly sequence: number;
  readonly lastIntentSequence: number;
  readonly state: RunState;
}

export function createHostRun(progress: PersistedProgress, heroId: HeroId, runId: string, seed = 0xdecafbad, stageId = DEFAULT_STAGE_ID): HostRunSession {
  return { runId, heroId, state: createRun(heroId, seed, { ...progress.upgrades, batteryLevel: progress.batteryLevel }, { stageId }), sequence: 0, lastIntentSequence: 0 };
}

function intentIsNext(session: HostRunSession, intentSequence: number | undefined): boolean {
  if (intentSequence === undefined) return true;
  return Number.isSafeInteger(intentSequence) && intentSequence > session.lastIntentSequence && intentSequence === session.lastIntentSequence + 1;
}

function commitIntent(session: HostRunSession, intentSequence: number | undefined): void {
  if (intentSequence !== undefined) session.lastIntentSequence = intentSequence;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function boundedString(value: unknown, maximum = 128): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maximum;
}

function nonNegativeFinite(value: unknown): value is number {
  return finite(value) && value >= 0;
}

function validateNumberRecord(value: unknown, label: string, options: { integer?: boolean; maximum?: number } = {}): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`Invalid checkpoint ${label}`);
  const entries = Object.entries(value);
  if (entries.length > 4096) throw new Error(`Invalid checkpoint ${label}`);
  for (const [key, entry] of entries) {
    if (!boundedString(key) || !nonNegativeFinite(entry) || (options.integer && !Number.isSafeInteger(entry)) || (options.maximum !== undefined && entry > options.maximum)) throw new Error(`Invalid checkpoint ${label}`);
  }
}

/** Validate the extra state needed to resume a fan volley deterministically.
 * A queued fan shot must retain the launch angle and authored Amount; without
 * both values a restored run could silently reroll its arc or derive a
 * different offset sequence. These fields are intentionally rejected for
 * non-fan weapons so they cannot become an untrusted side channel. */
function validatePendingVolleyState(weapon: WeaponState, definition: ReturnType<typeof weaponDefinition>): void {
  const hasAngle = weapon.pendingVolleyAngle !== undefined;
  const hasTotal = weapon.pendingVolleyTotal !== undefined;
  const pending = weapon.pendingShots;
  if (!hasAngle && !hasTotal) {
    if (definition?.pattern === 'fan' && pending !== undefined && pending > 0) throw new Error('Invalid checkpoint weapon sequence');
    return;
  }
  if (definition?.pattern !== 'fan'
    || pending === undefined
    || pending <= 0
    || !hasAngle
    || !hasTotal
    || !finite(weapon.pendingVolleyAngle)
    || !nonNegativeInteger(weapon.pendingVolleyTotal)
    || weapon.pendingVolleyTotal <= pending
    || weapon.pendingVolleyTotal > SIMULATION_POLICIES.maxProjectiles) {
    throw new Error('Invalid checkpoint weapon sequence');
  }
}

function validateBoomerangState(projectile: ProjectileState, definition: ReturnType<typeof weaponDefinition>): void {
  const hasOriginX = projectile.boomerangOriginX !== undefined;
  const hasOriginY = projectile.boomerangOriginY !== undefined;
  const hasReturning = projectile.boomerangReturning !== undefined;
  if (!hasOriginX && !hasOriginY && !hasReturning) {
    const hasOrbitState = projectile.orbitAngle !== undefined || projectile.orbitRadius !== undefined || projectile.orbitAngularSpeed !== undefined;
    if (definition?.pattern === 'boomerang' && !hasOrbitState) throw new Error('Invalid checkpoint projectile boomerang state');
    return;
  }
  if (definition?.pattern !== 'boomerang'
    || !hasOriginX
    || !hasOriginY
    || !hasReturning
    || !finite(projectile.boomerangOriginX)
    || !finite(projectile.boomerangOriginY)
    || typeof projectile.boomerangReturning !== 'boolean') throw new Error('Invalid checkpoint projectile boomerang state');
}

function validateOrbitState(projectile: ProjectileState, definition: ReturnType<typeof weaponDefinition>): void {
  const hasAngle = projectile.orbitAngle !== undefined;
  const hasRadius = projectile.orbitRadius !== undefined;
  const hasSpeed = projectile.orbitAngularSpeed !== undefined;
  if (!hasAngle && !hasRadius && !hasSpeed) {
    if (definition?.pattern === 'orbit') throw new Error('Invalid checkpoint projectile orbit state');
    return;
  }
  if (definition?.pattern !== 'orbit'
    || !hasAngle
    || !hasRadius
    || !hasSpeed
    || !finite(projectile.orbitAngle)
    || !finite(projectile.orbitRadius)
    || projectile.orbitRadius <= 0
    || projectile.orbitRadius > 180
    || !finite(projectile.orbitAngularSpeed)
    || projectile.orbitAngularSpeed <= 0
    || projectile.orbitAngularSpeed > 100) throw new Error('Invalid checkpoint projectile orbit state');
}

function validateEntityIds(values: readonly { id: unknown }[], label: string, maximum: number, nextEntityId: number, seen: Set<number>): void {
  if (!Array.isArray(values) || values.length > maximum) throw new Error(`Checkpoint exceeds ${label} limit`);
  for (const value of values) {
    if (!nonNegativeInteger(value.id) || value.id >= nextEntityId || seen.has(value.id)) throw new Error(`Invalid checkpoint ${label} identity`);
    seen.add(value.id);
  }
}

function validateCheckpointInventory(state: RunState): void {
  if (!Array.isArray(state.weapons) || state.weapons.length > SIMULATION_POLICIES.maxWeaponSlots) throw new Error('Invalid checkpoint weapons');
  for (const weapon of state.weapons) {
    const definition = typeof weapon?.id === 'string' ? weaponDefinition(weapon.id) : undefined;
    if (!definition || !nonNegativeInteger(weapon.level) || weapon.level < 1 || weapon.level > definition.maxLevel || !nonNegativeFinite(weapon.cooldownRemaining)) throw new Error('Invalid checkpoint weapon');
    if (weapon.pendingShots !== undefined && (!nonNegativeInteger(weapon.pendingShots) || weapon.pendingShots > SIMULATION_POLICIES.maxProjectiles || definition.projectileInterval <= 0)) throw new Error('Invalid checkpoint weapon sequence');
    if (weapon.shotIntervalRemaining !== undefined && (!nonNegativeFinite(weapon.shotIntervalRemaining) || weapon.shotIntervalRemaining > SIMULATION_POLICIES.maxWeaponSequenceIntervalSeconds || definition.projectileInterval <= 0)) throw new Error('Invalid checkpoint weapon sequence');
    validatePendingVolleyState(weapon, definition);
    if (weapon.auraHitCooldowns !== undefined) {
      if (definition.pattern !== 'aura' || typeof weapon.auraHitCooldowns !== 'object' || weapon.auraHitCooldowns === null || Array.isArray(weapon.auraHitCooldowns)) throw new Error('Invalid checkpoint aura hit cooldowns');
      const entries = Object.entries(weapon.auraHitCooldowns);
      if (entries.length > SIMULATION_POLICIES.maxAuraHitCooldownEntries || entries.some(([id, remaining]) => !/^\d+$/.test(id) || !nonNegativeFinite(remaining) || remaining > SIMULATION_POLICIES.maxAuraHitCooldownSeconds)) throw new Error('Invalid checkpoint aura hit cooldowns');
    }
  }
  if (typeof state.passives !== 'object' || state.passives === null || Array.isArray(state.passives) || Object.keys(state.passives).length > SIMULATION_POLICIES.maxPassiveSlots) throw new Error('Invalid checkpoint passives');
  for (const [id, rank] of Object.entries(state.passives)) {
    const definition = passiveDefinition(id);
    if (!definition || !nonNegativeInteger(rank) || rank < 1 || rank > definition.maxLevel) throw new Error('Invalid checkpoint passive');
  }
  if (!Array.isArray(state.upgradeHistory) || state.upgradeHistory.length > 4096 || state.upgradeHistory.some((id) => !boundedString(id))) throw new Error('Invalid checkpoint upgrade history');
  if (!Array.isArray(state.bannedUpgradeIds) || state.bannedUpgradeIds.length > 4096 || state.bannedUpgradeIds.some((id) => !boundedString(id))) throw new Error('Invalid checkpoint banish history');
  validateNumberRecord(state.metaUpgrades, 'meta upgrades', { integer: true, maximum: 999 });
  for (const [id, rank] of Object.entries(state.metaUpgrades)) {
    const definition = metaUpgradeDefinition(id);
    if (definition && rank > definition.maxRank) throw new Error('Invalid checkpoint meta upgrade');
  }
}

/** Older token-free fixtures and early checkpoints could hydrate entity
 * arrays without advancing the allocator. Repair that losslessly before the
 * strict identity check so the next generated entity cannot collide with a
 * restored pickup or chest. */
function normalizeCheckpointEntitySequence(state: RunState): void {
  let maximum = 0;
  const consider = (value: unknown): void => { if (Number.isSafeInteger(value) && (value as number) >= 0) maximum = Math.max(maximum, value as number); };
  for (const collection of [state.enemies, state.projectiles, state.lightSources, state.pickups]) for (const entity of collection) consider(entity.id);
  for (const id of state.collectedPickupIds ?? []) consider(id);
  for (const id of state.claimedChestIds ?? []) consider(id);
  for (const id of Object.keys(state.chestRewards ?? {})) if (/^\d+$/.test(id)) consider(Number(id));
  for (const id of Object.keys(state.chestGoldRewards ?? {})) if (/^\d+$/.test(id)) consider(Number(id));
  for (const id of Object.keys(state.chestRewardTiers ?? {})) if (/^\d+$/.test(id)) consider(Number(id));
  if (maximum >= Number.MAX_SAFE_INTEGER) throw new Error('Invalid checkpoint entity identity');
  state.nextEntityId = Math.max(1, Number.isSafeInteger(state.nextEntityId) ? state.nextEntityId : 1, maximum + 1);
}

/** Check every numeric surface that can re-enter the authoritative simulation
 * through a detached checkpoint. The webview has its own render guard, but a
 * restored host session must fail closed before any tick, reward, or adapter
 * event can observe corrupted state. */
function validateCheckpointState(state: RunState): void {
  if (!nonNegativeInteger(state.seed) || state.seed > 0xffffffff) throw new Error('Invalid checkpoint seed');
  if (!finite(state.stageClockScale) || state.stageClockScale <= 0 || state.stageClockScale > 1000) throw new Error('Invalid checkpoint clock scale');
  if (!finite(state.elapsedSeconds) || state.elapsedSeconds < 0 || !finite(state.simulationRemainderSeconds) || state.simulationRemainderSeconds < 0 || state.simulationRemainderSeconds >= SIMULATION_POLICIES.maxStepSeconds) throw new Error('Invalid checkpoint simulation time');
  if (!finite(state.chestPresentationRemaining) || state.chestPresentationRemaining < 0 || state.chestPresentationRemaining > SIMULATION_POLICIES.maxChestPresentationSeconds) throw new Error('Invalid checkpoint chest presentation');
  if (!nonNegativeInteger(state.level) || !finite(state.xp) || state.xp < 0 || !finite(state.totalTokens) || state.totalTokens < 0 || state.totalTokens > MAX_RUN_OUTPUT_TOKENS || !finite(state.gold) || state.gold < 0) throw new Error('Invalid checkpoint economy');
  if (!nonNegativeInteger(state.nextEntityId) || !nonNegativeInteger(state.pendingLevelUps) || !nonNegativeInteger(state.revivalsRemaining) || !nonNegativeInteger(state.revivalsUsed) || !nonNegativeInteger(state.rerollsRemaining) || !nonNegativeInteger(state.skipsRemaining) || !nonNegativeInteger(state.banishesRemaining) || !nonNegativeInteger(state.enemiesSpawned) || !nonNegativeInteger(state.enemiesDefeated) || !nonNegativeInteger(state.finaleThreatsSpawned)) throw new Error('Invalid checkpoint counters');
  if (typeof state.paused !== 'boolean' || typeof state.bossSpawned !== 'boolean' || typeof state.stageFinaleStarted !== 'boolean' || typeof state.bossRewardClaimed !== 'boolean' || typeof state.stageRewardAwarded !== 'boolean' || typeof state.batteryCharging !== 'boolean' || (state.outcome !== undefined && state.outcome !== 'victory' && state.outcome !== 'defeat') || (state.tokenSource !== 'synthetic' && state.tokenSource !== 'otlp' && state.tokenSource !== 'proxy' && state.tokenSource !== 'buffer') || (state.tokenAccuracy !== 'exact' && state.tokenAccuracy !== 'estimated')) throw new Error('Invalid checkpoint flags');
  for (const value of [state.stageFinaleStartedAt, state.stageFinaleDeadline]) if (value !== undefined && (!finite(value) || value < 0)) throw new Error('Invalid checkpoint finale timing');
  if (!Array.isArray(state.treasureHistory) || state.treasureHistory.length > 4096 || state.treasureHistory.some((entry) => !boundedString(entry, 256))) throw new Error('Invalid checkpoint treasure history');
  if (state.phase !== 'level-up' && (state.pendingLevelUps !== 0 || state.pendingCards.length !== 0)) throw new Error('Invalid checkpoint pending state');
  if (state.visualEffects !== undefined) {
    if (!Array.isArray(state.visualEffects) || state.visualEffects.length > SIMULATION_POLICIES.maxVisualEffects) throw new Error('Invalid checkpoint visual effects');
    for (const effect of state.visualEffects) {
      if (!effect || effect.kind !== 'explosion' || !finite(effect.x) || !finite(effect.y) || !finite(effect.radius) || effect.radius <= 0 || !finite(effect.durationSeconds) || effect.durationSeconds <= 0 || effect.durationSeconds > SIMULATION_POLICIES.visualEffectDurationSeconds || !finite(effect.remainingSeconds) || effect.remainingSeconds < 0 || effect.remainingSeconds > effect.durationSeconds) throw new Error('Invalid checkpoint visual effect');
    }
  }
  const stats = state.hero?.stats;
  const baseStats = state.hero?.baseStats;
  const statKeys: readonly (keyof RunState['hero']['stats'])[] = ['hp', 'maxHp', 'armor', 'moveSpeed', 'might', 'area', 'speed', 'cooldown', 'amount', 'magnet', 'growth', 'duration', 'luck', 'greed', 'curse', 'recovery', 'revival'];
  const canonicalClass = classDefinition(state.heroId);
  if (!state.hero || !finite(state.hero.x) || !finite(state.hero.y) || !finite(state.hero.invulnerabilityRemaining) || state.hero.invulnerabilityRemaining < 0 || !stats || !baseStats || !canonicalClass) throw new Error('Invalid checkpoint hero');
  for (const key of statKeys) {
    const current = stats[key];
    const base = baseStats[key];
    const canonical = canonicalClass.baseStats[key];
    const maximum = maxCombatStatFor(key);
    if (!finite(current) || !finite(base) || current < 0 || current > maximum || base < 0 || base > maximum || !finite(canonical) || Math.abs(base - canonical) > 1e-9) throw new Error('Invalid checkpoint hero stats');
  }
  if (stats.maxHp <= 0 || stats.hp < 0 || stats.hp > stats.maxHp || stats.moveSpeed < 0 || stats.amount < 1 || stats.magnet < 0) throw new Error('Invalid checkpoint hero stats');
  if (state.hero.facingX !== undefined && !finite(state.hero.facingX)) throw new Error('Invalid checkpoint hero facing');
  if (state.hero.facingY !== undefined && !finite(state.hero.facingY)) throw new Error('Invalid checkpoint hero facing');
  validateCheckpointInventory(state);
  if (!finite(state.battery.currentCapacity) || !finite(state.battery.maxCapacity) || state.battery.maxCapacity <= 0 || state.battery.currentCapacity < 0 || state.battery.currentCapacity > state.battery.maxCapacity || !nonNegativeInteger(state.battery.level) || state.battery.level < 1 || state.battery.level > 5 || state.battery.maxCapacity !== BatteryEngine.capacityForLevel(state.battery.level) || !finite(state.battery.idleTimeSeconds) || state.battery.idleTimeSeconds < 0 || !finite(state.battery.sessionOverflowTotal) || state.battery.sessionOverflowTotal < 0 || typeof state.battery.isLockedOut !== 'boolean') throw new Error('Invalid checkpoint battery');
  if (!finite(state.pendingTelemetry.outputTokens) || state.pendingTelemetry.outputTokens < 0 || !finite(state.pendingTelemetry.inputTokens) || state.pendingTelemetry.inputTokens < 0 || !finite(state.pendingTelemetry.cacheTokens) || state.pendingTelemetry.cacheTokens < 0 || typeof state.pendingTelemetry.isAgentActive !== 'boolean') throw new Error('Invalid checkpoint telemetry');
  const seenEntityIds = new Set<number>();
  validateEntityIds(state.enemies, 'enemy', SIMULATION_POLICIES.maxEnemies, state.nextEntityId, seenEntityIds);
  for (const enemy of state.enemies) {
    if (!enemyDefinition(enemy.kind) || typeof enemy.isBoss !== 'boolean' || typeof enemy.isElite !== 'boolean' || !finite(enemy.x) || !finite(enemy.y) || !finite(enemy.hp) || !finite(enemy.maxHp) || enemy.maxHp <= 0 || enemy.hp < 0 || enemy.hp > enemy.maxHp || !finite(enemy.speed) || enemy.speed < 0 || !finite(enemy.damage) || enemy.damage < 0 || (enemy.movementPattern !== undefined && enemy.movementPattern !== 'chase' && enemy.movementPattern !== 'wavy')) throw new Error('Invalid checkpoint enemy');
    for (const value of [enemy.frozenRemaining, enemy.knockbackRemaining, enemy.knockbackDirectionX, enemy.knockbackDirectionY, enemy.knockbackSpeed, enemy.movementPhase]) if (value !== undefined && !finite(value)) throw new Error('Invalid checkpoint enemy');
  }
  validateEntityIds(state.projectiles, 'projectile', SIMULATION_POLICIES.maxProjectiles, state.nextEntityId, seenEntityIds);
  for (const projectile of state.projectiles) {
    if (!weaponDefinition(projectile.weaponId) || !finite(projectile.x) || !finite(projectile.y) || !finite(projectile.vx) || !finite(projectile.vy) || !finite(projectile.damage) || projectile.damage < 0 || !finite(projectile.area) || projectile.area < 0 || !finite(projectile.remainingSeconds) || projectile.remainingSeconds < 0 || !nonNegativeInteger(projectile.remainingPierce) || !Array.isArray(projectile.hitEnemyIds) || projectile.hitEnemyIds.length > SIMULATION_POLICIES.maxEnemies || projectile.hitEnemyIds.some((id) => !nonNegativeInteger(id))) throw new Error('Invalid checkpoint projectile');
    if (projectile.hitCooldowns !== undefined) {
      const pattern = weaponDefinition(projectile.weaponId)?.pattern;
      if ((pattern !== 'ricochet' && pattern !== 'pool') || typeof projectile.hitCooldowns !== 'object' || projectile.hitCooldowns === null || Array.isArray(projectile.hitCooldowns)) throw new Error('Invalid checkpoint projectile hit cooldowns');
      const entries = Object.entries(projectile.hitCooldowns);
      if (entries.length > SIMULATION_POLICIES.maxProjectileHitCooldownEntries || entries.some(([id, remaining]) => !/^\d+$/.test(id) || !nonNegativeFinite(remaining) || remaining > SIMULATION_POLICIES.maxProjectileHitboxDelaySeconds)) throw new Error('Invalid checkpoint projectile hit cooldowns');
    }
    validateBoomerangState(projectile, weaponDefinition(projectile.weaponId));
    validateOrbitState(projectile, weaponDefinition(projectile.weaponId));
  }
  validateEntityIds(state.lightSources, 'light source', SIMULATION_POLICIES.maxLightSources, state.nextEntityId, seenEntityIds);
  for (const source of state.lightSources) if (!finite(source.x) || !finite(source.y) || !finite(source.hp) || !finite(source.maxHp) || source.maxHp <= 0 || source.hp < 0 || source.hp > source.maxHp) throw new Error('Invalid checkpoint light source');
  validateEntityIds(state.pickups, 'pickup', SIMULATION_POLICIES.maxPickups, state.nextEntityId, seenEntityIds);
  const pickupKinds = new Set(['xp-shard', 'xp-crystal', 'xp-orb', 'token-core', 'gold-chest', 'gold-coin', 'gold-sack', 'gold-hoard', 'light-source', 'mana-roast', 'mana-magnet', 'chrono-stasis', 'arcane-cleanser']);
  const goldSources = new Set(['enemyKills', 'eliteDrops', 'bossChest', 'lightSources', 'stageCompletion', 'levelUp']);
  for (const pickup of state.pickups) if (!pickupKinds.has(pickup.kind) || !finite(pickup.x) || !finite(pickup.y) || !finite(pickup.value) || pickup.value < 0 || (pickup.goldSource !== undefined && !goldSources.has(pickup.goldSource))) throw new Error('Invalid checkpoint pickup');
  if (!Array.isArray(state.collectedPickupIds) || state.collectedPickupIds.length > SIMULATION_POLICIES.maxCollectedPickupIds || state.collectedPickupIds.some((id) => !nonNegativeInteger(id) || id >= state.nextEntityId || seenEntityIds.has(id))) throw new Error('Invalid checkpoint pickup ledger');
  if (new Set(state.collectedPickupIds).size !== state.collectedPickupIds.length) throw new Error('Invalid checkpoint pickup ledger');
  validateNumberRecord(state.waveSpawnCounts, 'wave counters', { integer: true });
  validateNumberRecord(state.damageByWeapon, 'damage ledger');
  validateNumberRecord(state.goldBreakdown, 'gold ledger');
  if (typeof state.tokenLedger !== 'object' || state.tokenLedger === null || Array.isArray(state.tokenLedger) || !['synthetic', 'otlp', 'proxy', 'buffer'].every((source) => source in state.tokenLedger)) throw new Error('Invalid checkpoint token ledger');
  for (const source of Object.values(state.tokenLedger)) {
    if (!source || !nonNegativeFinite(source.outputTokens) || !nonNegativeFinite(source.inputTokens) || !nonNegativeFinite(source.cacheTokens) || !nonNegativeInteger(source.events) || !nonNegativeInteger(source.exactEvents) || !nonNegativeInteger(source.estimatedEvents) || source.events !== source.exactEvents + source.estimatedEvents) throw new Error('Invalid checkpoint token ledger');
  }
  if (!Array.isArray(state.claimedChestIds) || state.claimedChestIds.length > SIMULATION_POLICIES.maxPickups || state.claimedChestIds.some((id) => !nonNegativeInteger(id) || id >= state.nextEntityId || seenEntityIds.has(id)) || new Set(state.claimedChestIds).size !== state.claimedChestIds.length) throw new Error('Invalid checkpoint chest ledger');
  if (typeof state.chestRewards !== 'object' || state.chestRewards === null || Array.isArray(state.chestRewards) || typeof state.chestGoldRewards !== 'object' || state.chestGoldRewards === null || Array.isArray(state.chestGoldRewards) || typeof state.chestRewardTiers !== 'object' || state.chestRewardTiers === null || Array.isArray(state.chestRewardTiers)) throw new Error('Invalid checkpoint chest ledger');
  const chestRewards = Object.entries(state.chestRewards);
  const chestGoldRewards = Object.entries(state.chestGoldRewards);
  const chestRewardTiers = Object.entries(state.chestRewardTiers);
  if (chestRewards.length > SIMULATION_POLICIES.maxPickups || chestGoldRewards.length > SIMULATION_POLICIES.maxPickups || chestRewardTiers.length > SIMULATION_POLICIES.maxPickups) throw new Error('Invalid checkpoint chest ledger');
  for (const [id, rewards] of chestRewards) if (!/^\d+$/.test(id) || !Array.isArray(rewards) || rewards.length > 8 || rewards.some((reward) => !boundedString(reward))) throw new Error('Invalid checkpoint chest reward');
  for (const [id, reward] of chestGoldRewards) if (!/^\d+$/.test(id) || !nonNegativeFinite(reward)) throw new Error('Invalid checkpoint chest gold');
  for (const [id, tier] of chestRewardTiers) if (!/^\d+$/.test(id) || (tier !== 1 && tier !== 3 && tier !== 5)) throw new Error('Invalid checkpoint chest tier');
}

export function applyHostTelemetry(session: HostRunSession, event: TokenStreamEvent, intentSequence?: number): boolean {
  if (!intentIsNext(session, intentSequence)) return false;
  // Level-up/revival pauses do not advance the simulation, but accepting the
  // validated producer event keeps the host sequence/replay deterministic;
  // `applyTokenInput` itself correctly defers charging until the next dungeon
  // tick. A completed summary is terminal and must reject further telemetry.
  if (session.state.phase === 'summary') return false;
  let validated: TokenStreamEvent;
  try { validated = validateTokenStreamEvent(event); }
  catch { return false; }
  const outputTokens = Math.max(0, validated.outputTokens ?? validated.count);
  if (outputTokens > MAX_TOKEN_EVENT_COUNT || session.state.totalTokens > MAX_RUN_OUTPUT_TOKENS - outputTokens) return false;
  applyTokenInput(session.state, validated);
  commitIntent(session, intentSequence);
  session.sequence += 1;
  return true;
}

export function advanceHostRun(session: HostRunSession, deltaSeconds: number, input: InputSnapshot, intentSequence?: number, syntheticEnabled = false): boolean {
  if (!intentIsNext(session, intentSequence)) return false;
  if (syntheticEnabled && session.state.phase === 'dungeon' && !session.state.paused) {
    const outputTokens = Math.max(0, Math.min(MAX_TOKEN_EVENT_COUNT, deltaSeconds * 100));
    applyTokenInput(session.state, { source: 'synthetic', accuracy: 'exact', count: outputTokens, outputTokens, inputTokens: 0, cacheTokens: 0, tokensPerSecond: 100, isAgentActive: true });
  }
  tick(session.state, deltaSeconds, 0, input);
  commitIntent(session, intentSequence);
  session.sequence += 1;
  return true;
}

export function applyHostAction(session: HostRunSession, action: 'upgrade' | 'reroll' | 'skip' | 'banish' | 'revive' | 'quit' | 'pause' | 'resume', cardId?: string, intentSequence?: number): boolean {
  if (!intentIsNext(session, intentSequence)) return false;
  if (action === 'upgrade') chooseUpgrade(session.state, cardId ?? '');
  else if (action === 'reroll') rerollLevelUp(session.state);
  else if (action === 'skip') skipLevelUp(session.state);
  else if (action === 'banish') banishLevelUpCard(session.state, cardId ?? '');
  else if (action === 'revive') reviveRun(session.state);
  else if (action === 'quit') declineRevival(session.state);
  else if (action === 'pause') setRunPaused(session.state, true);
  else if (action === 'resume') setRunPaused(session.state, false);
  else throw new Error('Unknown run action');
  commitIntent(session, intentSequence);
  session.sequence += 1;
  return true;
}

/** Create a detached snapshot so the host session cannot be mutated through a
 * webview object reference. RunState contains only structured-clone-safe data. */
export function createHostSnapshot(session: HostRunSession): RunSnapshot {
  const state = JSON.parse(JSON.stringify(session.state)) as RunState;
  return { runId: session.runId, sequence: session.sequence, nextIntentSequence: session.lastIntentSequence + 1, state };
}

/** Detach a host session for a reconnect/replay boundary without retaining a
 * reference to the live simulation object. */
export function checkpointHostRun(session: HostRunSession): HostRunCheckpoint {
  const snapshot = createHostSnapshot(session);
  return { runId: snapshot.runId, heroId: session.heroId, sequence: snapshot.sequence, lastIntentSequence: snapshot.nextIntentSequence - 1, state: snapshot.state };
}

/** Restore only structurally valid checkpoints. The caller still owns where
 * checkpoints are persisted; this function never writes wallet or reward
 * state and therefore cannot duplicate a completed run. */
export function restoreHostRun(checkpoint: HostRunCheckpoint): HostRunSession {
  if (!checkpoint || typeof checkpoint !== 'object') throw new Error('Invalid host checkpoint');
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(checkpoint.runId)) throw new Error('Invalid checkpoint run ID');
  if (!['warrior', 'wizard', 'rogue', 'ranger', 'paladin', 'necromancer'].includes(checkpoint.heroId)) throw new Error('Invalid checkpoint hero');
  if (checkpoint.heroId !== checkpoint.state.heroId) throw new Error('Checkpoint hero does not match state');
  if (typeof checkpoint.state.stageId !== 'string' || !MVP_REGISTRY.stages.some((stage) => stage.id === checkpoint.state.stageId)) throw new Error('Invalid checkpoint stage');
  if (!Number.isSafeInteger(checkpoint.sequence) || checkpoint.sequence < 0) throw new Error('Invalid checkpoint sequence');
  if (!Number.isSafeInteger(checkpoint.lastIntentSequence) || checkpoint.lastIntentSequence < 0) throw new Error('Invalid checkpoint intent sequence');
  if (checkpoint.lastIntentSequence > checkpoint.sequence) throw new Error('Checkpoint intent sequence is ahead of host sequence');
  if (checkpoint.state.phase !== 'dungeon' && checkpoint.state.phase !== 'level-up' && checkpoint.state.phase !== 'revival' && checkpoint.state.phase !== 'summary') throw new Error('Invalid checkpoint phase');
const state = JSON.parse(JSON.stringify(checkpoint.state)) as RunState;
  // Checkpoints created before chest presentation was persisted remain valid;
  // malformed present values still fail closed in validateCheckpointState.
  if (state.chestPresentationRemaining === undefined) state.chestPresentationRemaining = 0;
  // Legacy checkpoints predate host-owned pause state; they were always
  // running, so migrate them to an explicit unpaused value.
  if (state.paused === undefined) state.paused = false;
  // Legacy checkpoints predate host-owned presentation effects.
  if (state.visualEffects === undefined) state.visualEffects = [];
  // Legacy checkpoints predate the bounded pickup identity ledger.
  if (state.collectedPickupIds === undefined) state.collectedPickupIds = [];
  if (!Array.isArray(state.enemies) || state.enemies.length > SIMULATION_POLICIES.maxEnemies || !Array.isArray(state.projectiles) || state.projectiles.length > SIMULATION_POLICIES.maxProjectiles || !Array.isArray(state.lightSources) || state.lightSources.length > SIMULATION_POLICIES.maxLightSources || !Array.isArray(state.pickups) || state.pickups.length > SIMULATION_POLICIES.maxPickups || !Array.isArray(state.pendingCards) || state.pendingCards.length > 4) throw new Error('Checkpoint exceeds simulation limits');
  // Legacy checkpoints predate persistent-projectile hitbox ledgers. Keep the
  // migrated shape explicit for ricochet projectiles so future snapshots are
  // stable while preserving ordinary/Bone hit identity semantics.
  for (const projectile of state.projectiles) if ((weaponDefinition(projectile.weaponId)?.pattern === 'ricochet' || weaponDefinition(projectile.weaponId)?.pattern === 'pool') && projectile.hitCooldowns === undefined) projectile.hitCooldowns = {};
  // Legacy checkpoints predate persistent aura hit ledgers. Keep the migrated
  // shape explicit for aura weapons so replay and snapshot validation agree.
  for (const weapon of state.weapons) if (weaponDefinition(weapon.id)?.pattern === 'aura' && weapon.auraHitCooldowns === undefined) weapon.auraHitCooldowns = {};
  normalizeCheckpointEntitySequence(state);
  validateCheckpointState(state);
  validatePendingUpgradeCards(state);
  return { runId: checkpoint.runId, heroId: checkpoint.heroId, state, sequence: checkpoint.sequence, lastIntentSequence: checkpoint.lastIntentSequence };
}

export function getHostRunResult(session: HostRunSession): RunSummary {
  if (!session.state.summary) throw new Error('Run result is not complete');
  return session.state.summary;
}
