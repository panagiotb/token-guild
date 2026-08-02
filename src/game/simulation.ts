import { calculateAuraRadius, calculateCooldown, calculateDamage, calculateEnemyMoveSpeed, calculatePickupHealing, calculateProjectileArea, calculateProjectileLifetime, calculateProjectileSpeed, calculateRetaliatoryDamage, calculateWeaponAmount, distance, getOwnedItemChoiceChance, getThresholdGrowthBonus, getXpRequiredForLevel } from './math';
import { classDefinition, enemyDefinition, MVP_REGISTRY, passiveDefinition, passiveEffectsAtRank, weaponDefinition } from './content';
import { metaActionCharges, metaStatBonuses } from './meta';
import { BatteryEngine } from '../shared/battery';
import { isWithinProjectileCullRadius, perimeterSpawnPoint, ricochetBounds, shouldDespawnEnemy, shouldRelocateBoss, WORLD_POLICIES } from './worldPolicies';
import { maxCombatStatFor, SIMULATION_POLICIES } from './policies';
import { goldBreakdownTotal } from './types';
import { baseWeaponDefinitions, hasEligibleWeaponOrPassive, isBanishableUpgradeCard, isUpgradeCardBanned, isUpgradeCardEligible, isUpgradeItemBanned, upgradeItemKey } from './upgradeEligibility';
import type { CombatStats, EnemyState, GoldSource, HeroId, InputSnapshot, LightSourceState, PickupState, ProjectileState, RunCompletionReason, RunState, RunSummary, TokenInput, TokenSourceLedger, UpgradeCard, VisualEffectState, WeaponLevelStats, WeaponState } from './types';

export const DEFAULT_STAGE_ID = 'code-dungeon';
const EVOLUTION_MIN_STAGE_SECONDS = 600;
/** Fixed domain step. Render/IPC cadence may vary, but combat is advanced in
 * stable 10 ms quanta so an input recording replays identically at 30/60 FPS
 * and across irregular host messages. */
/** The base-game knockback effect lasts 120 ms before normal approach resumes. */
const ENEMY_KNOCKBACK_SECONDS = 0.12;
const PICKUP_COLLECTION_RADIUS = 10;
const PICKUP_ATTRACTION_SPEED = 160;
const BOOMERANG_RETURN_DISTANCE = 150;
const BOOMERANG_HERO_RETURN_RADIUS = 12;
const ORBIT_MAX_RADIUS = 180;
const POOL_DEFAULT_RADIUS = 72;
const HERO_NAMES: Record<HeroId, string> = { warrior: 'Warrior', wizard: 'Wizard', rogue: 'Rogue', ranger: 'Ranger', paladin: 'Paladin', necromancer: 'Necromancer' };
const EMPTY_INPUT: InputSnapshot = { up: false, down: false, left: false, right: false };

/**
 * Code Dungeon's first-stage light-source table follows the researched
 * survivor contract: Gold Coin and Coin Bag are the common, non-Luck-scaled
 * entries; rare entries have authored weights and unlock at a minimum run
 * level; Luck multiplies only the eligible rare weights. The pickup IDs are
 * Token Guild's existing, readable equivalents for the base effects.
 */
function emptyTokenLedger(): Record<'synthetic' | 'otlp' | 'proxy' | 'buffer', TokenSourceLedger> {
  return {
    synthetic: { outputTokens: 0, inputTokens: 0, cacheTokens: 0, events: 0, exactEvents: 0, estimatedEvents: 0 },
    otlp: { outputTokens: 0, inputTokens: 0, cacheTokens: 0, events: 0, exactEvents: 0, estimatedEvents: 0 },
    proxy: { outputTokens: 0, inputTokens: 0, cacheTokens: 0, events: 0, exactEvents: 0, estimatedEvents: 0 },
    buffer: { outputTokens: 0, inputTokens: 0, cacheTokens: 0, events: 0, exactEvents: 0, estimatedEvents: 0 }
  };
}

function cloneStats(stats: CombatStats): CombatStats {
  return { ...stats };
}

function nextRandom(state: RunState): number {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 0x100000000;
}

function classPassiveBonus(state: RunState): number {
  const definition = classDefinition(state.heroId);
  if (!definition || definition.passive.intervalLevels < 1) return 0;
  const intervals = Math.floor(state.level / definition.passive.intervalLevels);
  return Math.min(definition.passive.maxBonus, intervals * definition.passive.valuePerLevel);
}

function applyStatBonus(stats: CombatStats, stat: string, value: number): void {
  if (!Number.isFinite(value) || value === 0) return;
  if (stat === 'maxHealth') {
    const ratio = stats.maxHp > 0 ? stats.hp / stats.maxHp : 1;
    stats.maxHp *= 1 + value;
    stats.hp = Math.min(stats.maxHp, Math.max(0, ratio * stats.maxHp));
  } else if (stat in stats) {
    const key = stat as keyof CombatStats;
    const current = stats[key];
    if (typeof current === 'number') stats[key] = current + value;
  }
}

function applyOmniBonus(stats: CombatStats, value: number): void {
  // Token Guild's Pandora's Box maps to the verified Omni contract: Might,
  // projectile Speed, Duration, and Area. These are additive percentage
  // stats in the domain model, so each authored rank adds its own value.
  stats.might += value;
  stats.speed += value;
  stats.duration = (stats.duration ?? 0) + value;
  stats.area += value;
}

export function recalculateStats(state: RunState): void {
  const previousRevivalStat = Math.max(0, Math.floor(state.hero.stats.revival ?? 0));
  const previousRevivalCharges = Math.max(0, Math.floor(state.revivalsRemaining ?? 0));
  const previousHpRatio = state.hero.stats.maxHp > 0 ? state.hero.stats.hp / state.hero.stats.maxHp : 1;
  normalizeInventoryCaps(state);
  const stats = cloneStats(state.hero.baseStats);
  const meta = metaStatBonuses(state.metaUpgrades);
  stats.might += meta.might;
  stats.armor += meta.armor;
  applyStatBonus(stats, 'maxHealth', meta.maxHealth);
  stats.recovery = (stats.recovery ?? 0) + meta.recovery;
  stats.cooldown += meta.cooldown;
  stats.area += meta.area;
  stats.speed += meta.speed;
  stats.duration = (stats.duration ?? 0) + meta.duration;
  stats.amount += meta.amount;
  stats.moveSpeed *= 1 + meta.moveSpeed;
  stats.magnet *= 1 + meta.magnet;
  stats.luck = (stats.luck ?? 0) + meta.luck;
  stats.growth += meta.growth;
  stats.greed = (stats.greed ?? 0) + meta.greed;
  stats.curse = (stats.curse ?? 0) + meta.curse;
  stats.revival = (stats.revival ?? 0) + meta.revival;
  const classDefinitionValue = classDefinition(state.heroId);
  if (classDefinitionValue) {
    const bonus = classPassiveBonus(state);
    if (classDefinitionValue.passive.stat === 'magnet') stats.magnet *= 1 + bonus;
    else if (classDefinitionValue.passive.stat === 'maxHealth') applyStatBonus(stats, classDefinitionValue.passive.stat, bonus);
    else applyStatBonus(stats, classDefinitionValue.passive.stat, bonus);
  }
  for (const [id, rank] of Object.entries(state.passives)) {
    const definition = passiveDefinition(id);
    if (!definition || rank <= 0) continue;
    for (const effect of passiveEffectsAtRank(definition, rank)) {
      if (effect.stat === 'allStats') applyOmniBonus(stats, effect.value);
      else if (effect.stat === 'magnet') stats.magnet *= 1 + effect.value;
      else applyStatBonus(stats, effect.stat, effect.value);
    }
  }
  stats.growth += getThresholdGrowthBonus(state.level);
  for (const key of ['might', 'area', 'speed', 'duration'] as const) {
    const value = stats[key] ?? 0;
    stats[key] = Math.min(maxCombatStatFor(key), value);
  }
  // Amount is an integer stat in the base-game contract. Normalize the
  // derived value here so every downstream weapon projection sees the same
  // bounded value, including restored/test-hydrated runs.
  stats.amount = Math.min(maxCombatStatFor('amount'), Math.max(1, Math.floor(stats.amount)));
  state.hero.stats = stats;
  state.hero.stats.hp = Math.min(stats.maxHp, Math.max(0, previousHpRatio * stats.maxHp));
  const nextRevivalStat = Math.max(0, Math.floor(stats.revival ?? 0));
  const newlyGrantedCharges = Math.max(0, nextRevivalStat - previousRevivalStat);
  state.revivalsRemaining = Math.min(nextRevivalStat, previousRevivalCharges + newlyGrantedCharges);
}

/** Normalize restored or test-hydrated inventory before deriving stats. This
 * keeps authored max levels authoritative for state, UI, card eligibility, and
 * combat instead of merely clamping one calculation at a time. */
function normalizeInventoryCaps(state: RunState): void {
  for (const weapon of state.weapons) {
    const definition = weaponDefinition(weapon.id);
    if (!definition) continue;
    weapon.level = Math.max(1, Math.min(definition.maxLevel, Math.floor(Number.isFinite(weapon.level) ? weapon.level : 1)));
  }
  for (const [id, rank] of Object.entries(state.passives)) {
    const definition = passiveDefinition(id);
    if (!definition) {
      delete state.passives[id];
      continue;
    }
    const normalized = Math.max(0, Math.min(definition.maxLevel, Math.floor(Number.isFinite(rank) ? rank : 0)));
    if (normalized === 0) delete state.passives[id];
    else state.passives[id] = normalized;
  }
}

export function getBaseWeaponIds(): readonly string[] {
  return baseWeaponDefinitions().map((weapon) => weapon.id);
}

function weaponStats(state: RunState, weapon: WeaponState): WeaponLevelStats {
  const definition = weaponDefinition(weapon.id);
  const fallback: WeaponLevelStats = { damage: 5, cooldown: 1, amount: 1, area: 1, speed: 1, duration: 1, pierce: 0, knockback: 0 };
  const level = Number.isFinite(weapon.level) ? Math.floor(weapon.level) : 1;
  return definition?.levels[Math.max(0, Math.min(definition.maxLevel, level) - 1)] ?? fallback;
}

function weaponProjectileInterval(definition: ReturnType<typeof weaponDefinition>, stats: WeaponLevelStats): number {
  return Math.max(0, stats.projectileInterval ?? definition?.projectileInterval ?? 0);
}

export function getWeaponLevelStats(state: RunState, weaponId: string): WeaponLevelStats | undefined {
  const weapon = state.weapons.find((candidate) => candidate.id === weaponId);
  return weapon ? weaponStats(state, weapon) : undefined;
}

function stageDefinition(state: RunState) {
  return MVP_REGISTRY.stages.find((stage) => stage.id === state.stageId) ?? MVP_REGISTRY.stages[0]!;
}

function stageDropTable(state: RunState) {
  const stage = stageDefinition(state);
  return MVP_REGISTRY.drops.tables.find((table) => table.id === stage.dropTableId) ?? MVP_REGISTRY.drops.tables[0]!;
}

/** Older checkpoints predate explicit finale flags. Keep their timeout boss
 * behavior safe while allowing future stages to choose a different boss ID. */
function isStageFinaleThreat(state: RunState, enemy: EnemyState): boolean {
  return enemy.isFinaleThreat === true || (state.stageFinaleStarted && enemy.isBoss && enemy.kind === stageDefinition(state).boss);
}

function isInvulnerableStageThreat(state: RunState, enemy: EnemyState): boolean {
  return enemy.isInvulnerable === true || (isStageFinaleThreat(state, enemy) && stageDefinition(state).finale.invulnerableThreat);
}

function addEnemy(state: RunState, enemyId: string, options: { finaleThreat?: boolean } = {}): void {
  const definition = enemyDefinition(enemyId);
  if (!definition) return;
  const stage = stageDefinition(state);
  if (!definition.isBoss && state.enemies.length >= SIMULATION_POLICIES.maxEnemies) return;
  const point = definition.isBoss
    ? perimeterSpawnPoint(state.hero, nextRandom(state), 0, stage.spawnPolicy.bossRadius, stage.spawnPolicy.bossRadius)
    : perimeterSpawnPoint(state.hero, nextRandom(state), nextRandom(state), stage.spawnPolicy.enemyInnerRadius, stage.spawnPolicy.enemyOuterRadius);
  const minutes = Math.floor(state.elapsedSeconds / 60);
  const curseScale = 1 + Math.max(0, state.hero.stats.curse ?? 0);
  const healthScale = (1 + minutes * stage.scaling.healthPerMinute) * curseScale;
  // Curse increases enemy health, speed, spawn frequency, and quantity. It
  // does not increase contact damage; the stage's authored minute scaling is
  // the sole source of enemy damage progression.
  const damageScale = 1 + minutes * stage.scaling.damagePerMinute;
  const maxHp = Math.max(1, Math.round(definition.maxHp * healthScale));
  state.enemies.push({ id: state.nextEntityId++, kind: definition.id as EnemyState['kind'], x: point.x, y: point.y, hp: maxHp, maxHp, speed: calculateEnemyMoveSpeed(definition.speed, state.elapsedSeconds, stage.scaling.speedPerMinute) * curseScale, damage: Math.max(0, Math.round(definition.damage * damageScale)), knockbackResistance: definition.isBoss ? 0.9 : definition.isElite ? 0.4 : 0, isBoss: definition.isBoss, isElite: definition.isElite, ...(options.finaleThreat ? { isFinaleThreat: true, isInvulnerable: stage.finale.invulnerableThreat } : {}), movementPattern: definition.movementPattern, movementPhase: nextRandom(state) * Math.PI * 2 });
  state.enemiesSpawned += 1;
}

function scheduleWaves(state: RunState): void {
  const stage = stageDefinition(state);
  if (!stage) return;
  for (const wave of stage.waves) {
    if (state.elapsedSeconds < wave.fromSecond || state.elapsedSeconds >= wave.untilSecond) continue;
    const previous = state.waveSpawnCounts[wave.id] ?? 0;
    const active = state.enemies.filter((enemy) => enemy.kind === wave.enemy).length;
    const curseScale = 1 + Math.max(0, state.hero.stats.curse ?? 0);
    // Curse increases both the authored minimum/maximum density and the
    // frequency of attempts. Keeping the effective interval in the wave
    // scheduler makes the effect deterministic and independent of render/IPC
    // cadence.
    const effectiveSpawnInterval = wave.spawnEverySeconds / curseScale;
    const due = Math.floor((state.elapsedSeconds - wave.fromSecond) / effectiveSpawnInterval) + 1;
    const scaledMinimumAlive = Math.min(SIMULATION_POLICIES.maxEnemies, Math.ceil(wave.minimumAlive * curseScale));
    const scaledMaximumAlive = Math.min(SIMULATION_POLICIES.maxEnemies, Math.max(scaledMinimumAlive, Math.ceil(wave.maximumAlive * curseScale)));
    const minimum = Math.max(0, scaledMinimumAlive - active);
    const scheduled = Math.max(0, due - previous);
    const toSpawn = Math.min(SIMULATION_POLICIES.maxSpawnPerStep, Math.max(scheduled, minimum), Math.max(0, scaledMaximumAlive - active), SIMULATION_POLICIES.maxEnemies - state.enemies.length);
    for (let index = 0; index < toSpawn; index += 1) addEnemy(state, wave.enemy);
    state.waveSpawnCounts[wave.id] = previous + toSpawn;
  }
}

function startFinale(state: RunState): void {
  if (state.stageFinaleStarted) return;
  const stage = stageDefinition(state);
  if (!stage || state.elapsedSeconds < stage.durationSeconds) return;
  state.stageFinaleStarted = true;
  state.stageFinaleStartedAt = state.elapsedSeconds;
  state.stageFinaleDeadline = state.elapsedSeconds + stage.finale.graceSeconds;
  state.bossSpawned = true;
  // The authored end-stage event clears the regular horde before the final
  // threat arrives, matching the readable finale sequence of the reference
  // game and preventing stale wave enemies from delaying completion.
  if (stage.finale.clearRegularEnemies) state.enemies = [];
  addEnemy(state, stage.boss, { finaleThreat: true });
  state.finaleThreatsSpawned = 1;
}

function scheduleFinaleThreats(state: RunState): void {
  if (!state.stageFinaleStarted) return;
  const stage = stageDefinition(state);
  const elapsedAfterLimit = Math.max(0, state.elapsedSeconds - stage.durationSeconds);
  // The reference stage keeps the end threat present and adds another one at
  // each subsequent minute. It is intentionally an end-state actor, not a
  // kill target that can be farmed for XP or gold.
  const desiredThreats = Math.floor(elapsedAfterLimit / stage.finale.threatIntervalSeconds) + 1;
  const activeThreats = state.enemies.filter((enemy) => isStageFinaleThreat(state, enemy)).length;
  for (let index = activeThreats; index < desiredThreats; index += 1) {
    addEnemy(state, stage.boss, { finaleThreat: true });
    state.finaleThreatsSpawned += 1;
  }
}

function makeCardPool(state: RunState): UpgradeCard[] {
  const cards: UpgradeCard[] = [];
  for (const weapon of state.weapons) {
    const definition = weaponDefinition(weapon.id);
    if (definition && weapon.level < definition.maxLevel) cards.push({ id: `weapon-upgrade:${weapon.id}`, label: `Upgrade ${definition.name}`, kind: 'weapon', target: weapon.id });
  }
  if (state.weapons.length < SIMULATION_POLICIES.maxWeaponSlots) {
    for (const definition of baseWeaponDefinitions()) {
      if (state.weapons.some((weapon) => weapon.id === definition.id)) continue;
      cards.push({ id: `weapon:${definition.id}`, label: definition.name, kind: 'new-weapon', target: definition.id });
    }
  }
  for (const [id, rank] of Object.entries(state.passives)) {
    const definition = passiveDefinition(id);
    if (definition && rank < definition.maxLevel) cards.push({ id: `passive-upgrade:${id}`, label: `Upgrade ${definition.name}`, kind: 'passive', target: id });
  }
  if (Object.keys(state.passives).length < SIMULATION_POLICIES.maxPassiveSlots) {
    for (const definition of MVP_REGISTRY.passives) {
      if (!state.passives[definition.id]) cards.push({ id: `passive:${definition.id}`, label: definition.name, kind: 'new-passive', target: definition.id });
    }
  }
  // Eligibility must be resolved before choosing the fallback. A run can
  // have open slots while every remaining item is banished; treating the
  // pre-filter card list as actionable would leave only generic healing
  // cards instead of the base-game Coin Bag/Floor Chicken choices.
  const eligibleItems = cards.filter((card) => isUpgradeCardEligible(state, card));
  if (eligibleItems.length > 0) {
    eligibleItems.push({ id: 'heal', label: 'Restore 25% health', kind: 'heal', target: 'heal' });
    return eligibleItems;
  }
  const fallbackCards: UpgradeCard[] = [
    { id: 'coin-bag', label: 'Coin Bag', kind: 'gold', target: 'gold' },
    { id: 'floor-chicken', label: 'Floor Chicken', kind: 'heal', target: 'heal' }
  ];
  return fallbackCards.filter((card) => isUpgradeCardEligible(state, card));
}

function makeCards(state: RunState): UpgradeCard[] {
  const pool = makeCardPool(state);
  const selected: UpgradeCard[] = [];
  const luck = Math.max(0, state.hero.stats.luck ?? 0);
  // Base-game Luck can occasionally expose a fourth level-up option. A
  // bounded deterministic roll keeps this content-owned and replayable.
  const maxChoices = luck > 0 && nextRandom(state) < luck / (1 + luck) ? 4 : 3;
  // Existing inventory items use the source-backed owned-item chance. The
  // registry rarity is the item-pool weight for both level-up and chest
  // selection; non-item fallback cards retain small authored weights. A heal
  // remains a low-weight fallback when no owned item is selected, and all
  // choices stay unique because the selected card is removed from the pool.
  const ownedItemChance = getOwnedItemChoiceChance(state.level, luck);
  const cardWeight = (card: UpgradeCard): number => {
    if (card.kind === 'weapon' || card.kind === 'new-weapon') return weaponDefinition(card.target)?.rarityWeight ?? 1;
    if (card.kind === 'passive' || card.kind === 'new-passive') return passiveDefinition(card.target)?.rarityWeight ?? 1;
    return card.kind === 'heal' ? 1 : 2;
  };
  const selectWeightedCard = (candidates: readonly UpgradeCard[]): UpgradeCard => {
    const totalWeight = candidates.reduce((sum, card) => sum + cardWeight(card), 0);
    let roll = nextRandom(state) * totalWeight;
    let selectedCard = candidates[candidates.length - 1]!;
    for (const card of candidates) {
      roll -= cardWeight(card);
      if (roll < 0) { selectedCard = card; break; }
    }
    return selectedCard;
  };
  // The source performs two independent owned-item checks, then fills any
  // remaining option slots from the full pool. Removing a selected card from
  // the shared pool prevents duplicate options and mirrors the source's
  // duplicate-roll fallback without introducing a second card identity.
  for (let check = 0; check < Math.min(2, maxChoices) && pool.length > 0; check += 1) {
    const owned = pool.filter((card) => card.kind === 'weapon' || card.kind === 'passive');
    if (owned.length === 0 || nextRandom(state) >= ownedItemChance) continue;
    const selectedCard = selectWeightedCard(owned);
    const selectedIndex = pool.indexOf(selectedCard);
    if (selectedIndex < 0) throw new Error('Level-up card selection lost its pool identity');
    selected.push(pool.splice(selectedIndex, 1)[0]!);
  }
  while (pool.length > 0 && selected.length < maxChoices) {
    const selectedCard = selectWeightedCard(pool);
    const selectedIndex = pool.indexOf(selectedCard);
    if (selectedIndex < 0) throw new Error('Level-up card selection lost its pool identity');
    selected.push(pool.splice(selectedIndex, 1)[0]!);
  }
  while (selected.length < 3) selected.push({ id: `heal:${selected.length}`, label: 'Restore 25% health', kind: 'heal', target: 'heal' });
  return selected;
}

function advanceExperience(state: RunState, amount: number): void {
  state.xp += Math.max(0, amount);
  while (state.xp >= getXpRequiredForLevel(state.level)) {
    state.xp -= getXpRequiredForLevel(state.level);
    state.level += 1;
    state.pendingLevelUps += 1;
    recalculateStats(state);
  }
  if (state.pendingLevelUps > 0 && state.phase === 'dungeon') {
    state.pendingCards = makeCards(state);
    state.phase = 'level-up';
  }
}

function grantXp(state: RunState, amount: number): void {
  advanceExperience(state, Math.max(0, amount) * (1 + state.hero.stats.growth));
}

/** Skip replaces the card reward with a direct 20% of the next-level
 * requirement. It is an XP award rather than a gem, so Growth is not applied
 * a second time; progression still uses the same level/pending-level loop. */
function grantSkipExperience(state: RunState): void {
  const required = getXpRequiredForLevel(state.level);
  advanceExperience(state, required * 0.2);
}

function awardGold(state: RunState, source: 'enemyKills' | 'eliteDrops' | 'bossChest' | 'overflow' | 'lightSources' | 'stageCompletion' | 'levelUp', amount: number, applyGreed = true): void {
  if (amount <= 0) return;
  // Greed is an additive modifier to the 100% base multiplier. Preserve
  // negative authored modifiers (for example, a character with -50% Greed)
  // while preventing malformed values from turning a reward negative.
  const greedMultiplier = applyGreed ? Math.max(0, 1 + (state.hero.stats.greed ?? 0)) : 1;
  const awarded = Math.max(0, Math.round(amount * greedMultiplier));
  state.gold += awarded;
  state.goldBreakdown[source] = (state.goldBreakdown[source] ?? 0) + awarded;
}

function scheduleLightSources(state: RunState): void {
  // The selected drop table owns the first-stage base and maximum chance.
  // Luck raises the base chance to that authored cap; once the source cap is
  // full, the attempt remains deterministic but no longer receives Luck's
  // bonus.
  const attemptsDue = Math.floor(state.elapsedSeconds);
  const stage = stageDefinition(state);
  const dropRules = stageDropTable(state);
  const previousAttempts = state.waveSpawnCounts['light-source-attempts'] ?? 0;
  if (attemptsDue <= previousAttempts) return;
  state.waveSpawnCounts['light-source-attempts'] = attemptsDue;
  for (let attempt = previousAttempts; attempt < attemptsDue; attempt += 1) {
    const atCapacity = state.lightSources.length >= SIMULATION_POLICIES.maxLightSources;
    const luck = atCapacity ? 0 : Math.max(0, state.hero.stats.luck ?? 0);
    const spawnChance = Math.min(dropRules.lightSourceMaxSpawnChance, dropRules.lightSourceSpawnChance * (1 + luck));
    if (nextRandom(state) >= spawnChance) continue;
    // When the authored source cap is full, the replacement appears at the
    // closest valid perimeter distance so it remains reachable instead of
    // silently creating another distant objective. The existing bounded
    // source is still replaced deterministically to preserve the cap.
    const angle = nextRandom(state);
    const point = atCapacity
      ? perimeterSpawnPoint(state.hero, angle, 0, stage.spawnPolicy.lightSourceInnerRadius, stage.spawnPolicy.lightSourceInnerRadius)
      : perimeterSpawnPoint(state.hero, angle, nextRandom(state), stage.spawnPolicy.lightSourceInnerRadius, stage.spawnPolicy.lightSourceOuterRadius);
    if (atCapacity) state.lightSources.shift();
    state.lightSources.push({ id: state.nextEntityId++, x: point.x, y: point.y, hp: SIMULATION_POLICIES.lightSourceMaxHp, maxHp: SIMULATION_POLICIES.lightSourceMaxHp });
  }
}

export function resolveLightSourceDrop(state: RunState): { kind: PickupState['kind']; value: number } {
  const luck = Math.max(0, state.hero.stats.luck ?? 0);
  const table = stageDropTable(state);
  const eligible = table.lightSources.filter((entry) => state.level >= entry.minLevel);
  const totalWeight = eligible.reduce((sum, entry) => sum + entry.weight * (entry.luckScaled ? 1 + luck : 1), 0);
  let roll = nextRandom(state) * totalWeight;
  let result = eligible.at(-1)!;
  for (const entry of eligible) {
    roll -= entry.weight * (entry.luckScaled ? 1 + luck : 1);
    if (roll < 0) { result = entry; break; }
  }
  return { kind: result.kind, value: result.value };
}

/** Resolve the elite-only tactical/light-source drop table. Keeping its
 * chance, weights, level gates, and value multiplier in the validated content
 * registry prevents a threshold chain in the simulation from becoming an
 * untracked balance rule. */
export function resolveEliteDrop(state: RunState): { kind: PickupState['kind']; valueMultiplier: number } | undefined {
  const dropTable = stageDropTable(state);
  const table = dropTable.elite.filter((entry) => state.level >= entry.minLevel);
  const dropChance = Math.max(0, Math.min(1, dropTable.eliteDropChance));
  // The chance gate and the reward table are independent authored checks.
  // Reusing the gate roll would bias the reward toward early table entries
  // whenever the chance is below 100%, making drop occurrence affect item
  // rarity and diverging from deterministic weighted selection.
  const chanceRoll = nextRandom(state);
  if (table.length === 0 || chanceRoll >= dropChance) return undefined;
  const luck = Math.max(0, state.hero.stats.luck ?? 0);
  const totalWeight = table.reduce((sum, entry) => sum + entry.weight * (entry.luckScaled ? 1 + luck : 1), 0);
  let weightedRoll = nextRandom(state) * totalWeight;
  let result = table.at(-1)!;
  for (const entry of table) {
    weightedRoll -= entry.weight * (entry.luckScaled ? 1 + luck : 1);
    if (weightedRoll < 0) { result = entry; break; }
  }
  return { kind: result.kind, valueMultiplier: result.valueMultiplier };
}

function dropLightSourcePickup(state: RunState, source: LightSourceState): void {
  const result = resolveLightSourceDrop(state);
  const goldSource: GoldSource | undefined = result.kind.startsWith('gold-') ? 'lightSources' : undefined;
  state.pickups.push({ id: state.nextEntityId++, kind: result.kind, x: source.x, y: source.y, value: result.value, ...(goldSource ? { goldSource } : {}) });
}

function isXpPickup(pickup: PickupState): boolean {
  return pickup.kind === 'xp-shard' || pickup.kind === 'xp-crystal' || pickup.kind === 'xp-orb' || pickup.kind === 'token-core';
}

export function pickupKindForXp(value: number): PickupState['kind'] {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  if (safeValue > SIMULATION_POLICIES.xpGemGreenMaxValue) return 'xp-orb';
  if (safeValue > SIMULATION_POLICIES.xpGemBlueMaxValue) return 'xp-crystal';
  return 'xp-shard';
}

function dropEnemyPickup(state: RunState, enemy: EnemyState): void {
  const definition = enemyDefinition(enemy.kind);
  if (!definition || isStageFinaleThreat(state, enemy)) return;
  if (enemy.isElite && !enemy.isBoss) {
    const drop = resolveEliteDrop(state);
    if (drop) state.pickups.push({ id: state.nextEntityId++, kind: drop.kind, x: enemy.x, y: enemy.y, value: drop.valueMultiplier > 0 ? Math.max(5, Math.round(definition.xp * drop.valueMultiplier)) : 0, ...(drop.kind.startsWith('gold-') ? { goldSource: 'eliteDrops' as const } : {}) });
  }
  const value = Math.max(0, definition.xp);
  state.pickups.push({ id: state.nextEntityId++, kind: pickupKindForXp(value), x: enemy.x, y: enemy.y, value });
}

function condenseXpPickups(state: RunState): void {
  const xpPickups = state.pickups.filter(isXpPickup);
  const nonXpCount = state.pickups.length - xpPickups.length;
  const xpLimit = Math.max(1, Math.min(SIMULATION_POLICIES.maxXpPickups, SIMULATION_POLICIES.maxPickups - nonXpCount));
  if (xpPickups.length <= xpLimit) return;
  // The base game stops creating separate gems after 400 are present and
  // accumulates the overflow in one red gem. Keep the same bounded shape while
  // retaining every point of XP for deterministic collection/replay.
  const retainedCount = Math.max(0, xpLimit - 1);
  const retained = retainedCount > 0 ? xpPickups.slice(-retainedCount) : [];
  const retainedIds = new Set(retained.map((pickup) => pickup.id));
  const condensedValue = xpPickups.filter((pickup) => !retainedIds.has(pickup.id)).reduce((sum, pickup) => sum + pickup.value, 0);
  state.pickups = state.pickups.filter((pickup) => !isXpPickup(pickup) || retainedIds.has(pickup.id));
  state.pickups.push({ id: state.nextEntityId++, kind: 'token-core', x: state.hero.x + WORLD_POLICIES.pickupCondensationOffset, y: state.hero.y, value: condensedValue });
}

/** Move pickups through the magnet field before resolving collection. The
 * collection radius is deliberately separate from the magnet stat so a gem
 * visibly travels toward the hero instead of being credited at the edge of
 * the field. */
function attractPickups(state: RunState, delta: number): void {
  const magnetRadius = Math.max(PICKUP_COLLECTION_RADIUS, state.hero.stats.magnet);
  for (const pickup of state.pickups) {
    const dx = state.hero.x - pickup.x;
    const dy = state.hero.y - pickup.y;
    const length = Math.hypot(dx, dy);
    if (length <= PICKUP_COLLECTION_RADIUS || length > magnetRadius) continue;
    const travel = Math.min(length - PICKUP_COLLECTION_RADIUS, PICKUP_ATTRACTION_SPEED * delta);
    pickup.x += (dx / length) * travel;
    pickup.y += (dy / length) * travel;
  }
}

function rememberCollectedPickupIds(state: RunState, ids: Iterable<number>, lookup?: Set<number>): void {
  for (const id of ids) {
    if (!Number.isSafeInteger(id) || id < 0 || lookup?.has(id) || state.collectedPickupIds.includes(id)) continue;
    state.collectedPickupIds.push(id);
    lookup?.add(id);
  }
  const overflow = state.collectedPickupIds.length - SIMULATION_POLICIES.maxCollectedPickupIds;
  if (overflow > 0) state.collectedPickupIds.splice(0, overflow);
}

/** Apply one authored floor-pickup effect at the collection boundary. Keeping
 * this separate from movement/rendering makes ownership and duplicate
 * handling explicit: the host simulation grants every reward or tactical
 * effect exactly once. */
function applyCollectedPickupEffect(state: RunState, pickup: PickupState, collectedIds: Set<number>, collectedPickupLookup: ReadonlySet<number>): void {
  if (pickup.kind === 'gold-chest') {
    openTreasureChest(state, pickup.id);
    return;
  }
  if (pickup.kind === 'gold-coin' || pickup.kind === 'gold-sack' || pickup.kind === 'gold-hoard') {
    // Authored gold pickups are collectible-source owned. The legacy
    // `enemyKills` bucket remains only for grandfathered summaries and is
    // never inferred for a new pickup without an explicit source tag.
    awardGold(state, pickup.goldSource ?? 'lightSources', pickup.value);
    return;
  }
  if (isXpPickup(pickup)) {
    grantXp(state, pickup.value);
    return;
  }
  if (pickup.kind === 'mana-roast') {
    // Floor Chicken's equivalent heals through the shared Recovery projection,
    // but never exceeds maximum health. Per-second Recovery regeneration is
    // intentionally handled separately in the fixed simulation step.
    state.hero.stats.hp = Math.min(state.hero.stats.maxHp, state.hero.stats.hp + calculatePickupHealing(30, state.hero.stats));
    return;
  }
  if (pickup.kind === 'mana-magnet') {
    // Vacuum is collection-owned: all currently spawned gems are consumed by
    // this one pickup, and each gem contributes XP once through grantXp.
    for (const gem of state.pickups.filter(isXpPickup)) {
      if (collectedIds.has(gem.id) || collectedPickupLookup.has(gem.id)) continue;
      grantXp(state, gem.value);
      collectedIds.add(gem.id);
    }
    return;
  }
  if (pickup.kind === 'chrono-stasis') {
    for (const enemy of state.enemies) enemy.frozenRemaining = Math.max(enemy.frozenRemaining ?? 0, 10);
    return;
  }
  if (pickup.kind === 'arcane-cleanser') {
    const survivingBosses: EnemyState[] = [];
    for (const enemy of state.enemies) {
      if (enemy.isBoss) {
        survivingBosses.push(enemy);
        continue;
      }
      state.enemiesDefeated += 1;
      dropEnemyPickup(state, enemy);
    }
    state.enemies = survivingBosses;
  }
}

function eligibleEvolution(state: RunState): { weapon: WeaponState; resultId: string } | undefined {
  if (state.elapsedSeconds < EVOLUTION_MIN_STAGE_SECONDS) return undefined;
  const candidates = state.weapons.slice().sort((a, b) => a.id.localeCompare(b.id)).flatMap((weapon) => {
    const definition = weaponDefinition(weapon.id);
    if (!definition?.evolution || weapon.level < definition.maxLevel || isUpgradeItemBanned(state, weapon.id) || (state.passives[definition.evolution.passiveId] ?? 0) < 1) return [];
    return [{ weapon, resultId: definition.evolution.resultId }];
  });
  return candidates.length > 0 ? candidates[Math.floor(nextRandom(state) * candidates.length)] : undefined;
}

type ChestRewardCandidate =
  | { kind: 'weapon'; id: string; weight: number; weapon: WeaponState }
  | { kind: 'passive'; id: string; weight: number };

/** Pick one eligible owned item using the source rarity weight. Rarity is
 * content data, not presentation order, so a reordered registry cannot alter
 * replay outcomes. Zero-weight legacy/special entries are intentionally not
 * selected until their source-specific unlock contract exists. */
function chooseChestCandidate(state: RunState, candidates: ChestRewardCandidate[]): ChestRewardCandidate | undefined {
  const eligible = candidates.filter((candidate) => Number.isFinite(candidate.weight) && candidate.weight > 0);
  const totalWeight = eligible.reduce((total, candidate) => total + candidate.weight, 0);
  if (eligible.length === 0 || totalWeight <= 0) return undefined;
  let roll = nextRandom(state) * totalWeight;
  for (const candidate of eligible) {
    roll -= candidate.weight;
    if (roll < 0) return candidate;
  }
  return eligible.at(-1);
}

function resolveChestReward(state: RunState): string {
  const evolution = eligibleEvolution(state);
  if (evolution) {
    const baseId = evolution.weapon.id;
    evolution.weapon.id = evolution.resultId;
    evolution.weapon.level = 1;
    evolution.weapon.cooldownRemaining = 0;
    const reward = `evolution:${baseId}:${evolution.resultId}`;
    state.treasureHistory.push(reward);
    state.upgradeHistory.push(reward);
    return reward;
  }
  const weaponCandidates: ChestRewardCandidate[] = state.weapons.slice().sort((a, b) => a.id.localeCompare(b.id)).flatMap((candidate) => {
    const definition = weaponDefinition(candidate.id);
    if (definition === undefined || isUpgradeItemBanned(state, candidate.id) || candidate.level >= definition.maxLevel) return [];
    return [{ kind: 'weapon' as const, id: candidate.id, weight: definition.rarityWeight, weapon: candidate }];
  });
  const passiveCandidates: ChestRewardCandidate[] = Object.keys(state.passives).sort().flatMap((id) => {
    const definition = passiveDefinition(id);
    const rank = state.passives[id] ?? 0;
    if (definition === undefined || isUpgradeItemBanned(state, id) || rank <= 0 || rank >= definition.maxLevel) return [];
    return [{ kind: 'passive' as const, id, weight: definition.rarityWeight }];
  });
  const candidate = chooseChestCandidate(state, [...weaponCandidates, ...passiveCandidates]);
  if (candidate?.kind === 'weapon') {
    candidate.weapon.level += 1;
    const reward = `chest:weapon:${candidate.id}:level-${candidate.weapon.level}`;
    state.treasureHistory.push(reward);
    state.upgradeHistory.push(reward);
    return reward;
  }
  if (candidate?.kind === 'passive') {
    state.passives[candidate.id] = (state.passives[candidate.id] ?? 0) + 1;
    recalculateStats(state);
    const reward = `chest:passive:${candidate.id}:rank-${state.passives[candidate.id]}`;
    state.treasureHistory.push(reward);
    state.upgradeHistory.push(reward);
    return reward;
  }
  state.treasureHistory.push('chest:no-eligible-item');
  return 'chest:no-eligible-item';
}

type ChestTier = 1 | 3 | 5;

function chestKey(chestId?: number): string {
  return chestId === undefined ? 'legacy-boss' : String(chestId);
}

/**
 * Treasure quality is checked once per chest and retained by chest identity.
 * Code Dungeon uses a base tier-one chest; Luck can promote it to the
 * documented three- or five-item tiers without making render/replay timing
 * part of the result. The probabilities are intentionally explicit MVP
 * content until per-stage chest tables are added to the parity registry.
 */
function resolveChestTier(state: RunState): ChestTier {
  const luck = Math.max(0, state.hero.stats.luck ?? 0);
  const rules = stageDropTable(state).chest;
  // Vampire Survivors treats the displayed Luck bonus as a modification to
  // a 100% base value. Each chest has independent authored checks from the
  // highest tier down; Luck multiplies the check rather than adding an
  // arbitrary global offset. The stage table owns the fallback tier and
  // chances so later stages can declare their own chest balance.
  const totalLuck = 1 + luck;
  if (nextRandom(state) < Math.min(1, rules.fiveItemChance * totalLuck)) return 5;
  if (nextRandom(state) < Math.min(1, rules.threeItemChance * totalLuck)) return 3;
  return rules.baseTier;
}

function chestGold(state: RunState): number {
  // The base game documents a 60–500 coin chest range. Greed is applied by
  // awardGold, so this value remains the unmodified source result.
  return 60 + Math.floor(nextRandom(state) * 441);
}

export function openTreasureChest(state: RunState, chestId?: number): string {
  if (chestId !== undefined && state.claimedChestIds.includes(chestId)) {
    return state.chestRewards[String(chestId)]?.[0] ?? 'chest:no-eligible-item';
  }
  if (chestId === undefined && state.bossRewardClaimed) return state.treasureHistory.at(-1) ?? 'chest:no-eligible-item';
  // Identified stage chests and the legacy un-identified boss chest have
  // separate ownership ledgers. A regular chest must never consume the boss
  // reward claim, otherwise a later boss defeat can lose its only chest.
  if (chestId === undefined) state.bossRewardClaimed = true;
  if (chestId !== undefined) state.claimedChestIds.push(chestId);
  const key = chestKey(chestId);
  const tier = resolveChestTier(state);
  const gold = chestGold(state);
  state.chestRewardTiers[key] = tier;
  state.chestGoldRewards[key] = gold;
  awardGold(state, 'bossChest', gold);
  const historyStart = state.treasureHistory.length;
  const rewards = Array.from({ length: tier }, () => resolveChestReward(state));
  const reward = rewards[0] ?? 'chest:no-eligible-item';
  if (chestId !== undefined) state.chestRewards[String(chestId)] = state.treasureHistory.slice(historyStart);
  else state.chestRewards[key] = state.treasureHistory.slice(historyStart);
  state.chestPresentationRemaining = SIMULATION_POLICIES.chestPresentationSeconds;
  return reward;
}

function selectedUpgrades(state: RunState): string[] {
  return [...state.upgradeHistory];
}

function awardStageCompletion(state: RunState): void {
  if (!state.stageFinaleStarted || state.stageRewardAwarded) return;
  // Completing a stage grants 500 coins. Unused revivals are worth 100 each;
  // revivals spent during the finale add the escalating 100/200/300/400
  // bonus described by the base-game reward loop.
  const unusedRevivalGold = Math.max(0, state.revivalsRemaining) * 100;
  const finaleRevivalGold = finaleRevivalBonus(state.finaleRevivalsUsed);
  // The stage completion/revival reward is an end-state bonus, not a pickup or
  // chest. Keep it outside Greed so the run ledger reflects the authored
  // 500-coin reward plus revival bonuses exactly.
  awardGold(state, 'stageCompletion', 500 + unusedRevivalGold + finaleRevivalGold, false);
  state.stageRewardAwarded = true;
}

/** Used finale revivals add an escalating end-state bonus. Keep this pure so
 * ledger accounting, summaries, and tests cannot drift from one another. */
function finaleRevivalBonus(chargesUsed: number): number {
  let bonus = 0;
  for (let index = 1; index <= Math.max(0, Math.floor(chargesUsed)); index += 1) bonus += Math.min(index, 4) * 100;
  return bonus;
}

export function finishRun(state: RunState, outcome: 'victory' | 'defeat', reason?: RunCompletionReason): void {
  if (state.phase === 'summary') return;
  state.paused = false;
  if (outcome === 'victory') awardStageCompletion(state);
  if (goldBreakdownTotal(state.goldBreakdown) !== state.gold) throw new Error('Gold ledger is not reconciled');
  const completionReason: RunCompletionReason = reason ?? (outcome === 'defeat' ? 'defeat' : state.stageFinaleStarted ? 'stage-timer' : 'boss-defeat');
  const stageFinaleDurationSeconds = state.stageFinaleStarted && state.stageFinaleStartedAt !== undefined
    ? Math.max(0, state.elapsedSeconds - state.stageFinaleStartedAt)
    : undefined;
  state.phase = 'summary';
  state.outcome = outcome;
  state.projectiles = [];
  state.summary = {
    outcome,
    heroId: state.heroId,
    heroName: HERO_NAMES[state.heroId],
    level: state.level,
    elapsedSeconds: state.elapsedSeconds,
    tokens: state.totalTokens,
    tokenSource: state.tokenSource,
    tokenAccuracy: state.tokenAccuracy,
    tokenLedger: Object.fromEntries(Object.entries(state.tokenLedger).map(([source, ledger]) => [source, { ...ledger }])) as NonNullable<RunSummary['tokenLedger']>,
    gold: state.gold,
    goldBreakdown: { ...state.goldBreakdown },
    enemiesSpawned: state.enemiesSpawned,
    enemiesDefeated: state.enemiesDefeated,
    damageByWeapon: { ...state.damageByWeapon },
    upgrades: selectedUpgrades(state),
    treasureRewards: [...state.treasureHistory],
    revivalsUsed: state.revivalsUsed,
    revivalsRemaining: state.revivalsRemaining,
    ...(state.stageRewardAwarded ? { stageRewardBasis: { baseGold: 500, unusedRevivalCharges: Math.max(0, state.revivalsRemaining), finaleRevivalCharges: Math.max(0, state.finaleRevivalsUsed), finaleRevivalBonus: finaleRevivalBonus(state.finaleRevivalsUsed) } } : {}),
    stageFinaleStarted: state.stageFinaleStarted,
    completionReason,
    finaleThreatsSpawned: state.finaleThreatsSpawned,
    ...(stageFinaleDurationSeconds === undefined ? {} : { stageFinaleDurationSeconds })
  };
}

/**
 * Spend one authored revival charge after the death presentation. The choice
 * is deliberately explicit so a run cannot silently consume a scarce charge
 * while the player is away from the screen.
 */
export function reviveRun(state: RunState): void {
  if (state.phase !== 'revival') throw new Error('Revival is not available');
  if (state.revivalsRemaining <= 0) throw new Error('No revivals remaining');
  state.revivalsRemaining -= 1;
  state.revivalsUsed += 1;
  if (state.stageFinaleStarted) state.finaleRevivalsUsed += 1;
  state.hero.stats.hp = Math.max(1, state.hero.stats.maxHp * 0.5);
  state.hero.invulnerabilityRemaining = 2;
  state.paused = false;
  state.phase = 'dungeon';
}

/** End a run from the death presentation without spending a revival. */
export function declineRevival(state: RunState): void {
  if (state.phase !== 'revival') throw new Error('Revival is not available');
  state.paused = false;
  finishRun(state, state.stageFinaleStarted ? 'victory' : 'defeat', state.stageFinaleStarted ? 'revival-choice' : 'defeat');
}

/** Pause/resume is a domain transition rather than a renderer-only flag. A
 * host snapshot can therefore restore the exact paused state without letting
 * a reloaded webview advance the run behind the player's back. */
export function setRunPaused(state: RunState, paused: boolean): RunState {
  if (state.phase !== 'dungeon') throw new Error('Pause is only available during the dungeon');
  state.paused = paused;
  return state;
}

export interface RunOptions {
  readonly stageId?: string;
  readonly clockScale?: number;
}

export function createRun(heroId: HeroId, seed = 1, metaUpgrades: Readonly<Record<string, number>> = {}, options: RunOptions = {}): RunState {
  const config = classDefinition(heroId);
  if (!config) throw new Error(`Unknown hero: ${heroId}`);
  const stageId = options.stageId ?? DEFAULT_STAGE_ID;
  const stage = MVP_REGISTRY.stages.find((candidate) => candidate.id === stageId);
  if (!stage) throw new Error(`Unknown stage: ${stageId}`);
  const clockScale = Number.isFinite(options.clockScale) && (options.clockScale ?? 1) > 0 ? options.clockScale! : 1;
  const baseStats = cloneStats(config.baseStats);
  const state: RunState = {
    phase: 'dungeon', paused: false, heroId, stageId, stageClockScale: clockScale, seed: seed >>> 0, elapsedSeconds: 0, simulationRemainderSeconds: 0, chestPresentationRemaining: 0, level: 1, xp: 0, totalTokens: 0, gold: 0,
    goldBreakdown: { enemyKills: 0, eliteDrops: 0, bossChest: 0, overflow: 0, lightSources: 0, stageCompletion: 0, levelUp: 0 }, tokenSource: 'synthetic', tokenAccuracy: 'exact', tokenLedger: emptyTokenLedger(), nextEntityId: 1,
    hero: { x: 0, y: 0, stats: cloneStats(baseStats), baseStats, invulnerabilityRemaining: 0, facingX: 1, facingY: 0 }, weapons: [{ id: config.startingWeaponId, level: 1, cooldownRemaining: 0 }],
    passives: {}, upgradeHistory: [], enemies: [], projectiles: [], lightSources: [], pickups: [], visualEffects: [], collectedPickupIds: [], pendingCards: [], pendingLevelUps: 0, revivalsRemaining: 0, revivalsUsed: 0, rerollsRemaining: metaActionCharges(metaUpgrades).rerolls, skipsRemaining: metaActionCharges(metaUpgrades).skips, banishesRemaining: metaActionCharges(metaUpgrades).banishes, bannedUpgradeIds: [], enemiesSpawned: 0, enemiesDefeated: 0,
    bossSpawned: false, stageFinaleStarted: false, finaleThreatsSpawned: 0, waveSpawnCounts: {}, bossRewardClaimed: false, claimedChestIds: [], chestRewards: {}, chestGoldRewards: {}, chestRewardTiers: {}, stageRewardAwarded: false, finaleRevivalsUsed: 0, damageByWeapon: {}, treasureHistory: [], metaUpgrades: { ...metaUpgrades },
    battery: BatteryEngine.createState(metaUpgrades.batteryLevel ?? 1), batteryCharging: false, pendingTelemetry: { outputTokens: 0, inputTokens: 0, cacheTokens: 0, isAgentActive: false }
  };
  recalculateStats(state);
  return state;
}

export function applyTokenInput(state: RunState, input: TokenInput): RunState {
  if (state.phase !== 'dungeon' || !Number.isFinite(input.count) || input.count < 0) return state;
  if (input.source) state.tokenSource = input.source;
  if (input.accuracy) state.tokenAccuracy = input.accuracy;
  const outputTokens = Number.isFinite(input.outputTokens ?? input.count) ? Math.max(0, input.outputTokens ?? input.count) : 0;
  const inputTokens = Number.isFinite(input.inputTokens ?? 0) ? Math.max(0, input.inputTokens ?? 0) : 0;
  const cacheTokens = Number.isFinite(input.cacheTokens ?? 0) ? Math.max(0, input.cacheTokens ?? 0) : 0;
  state.totalTokens += outputTokens;
  const ledger = state.tokenLedger[input.source ?? state.tokenSource];
  ledger.outputTokens += outputTokens;
  ledger.inputTokens += inputTokens;
  ledger.cacheTokens += cacheTokens;
  ledger.events += 1;
  if ((input.accuracy ?? state.tokenAccuracy) === 'exact') ledger.exactEvents += 1;
  else ledger.estimatedEvents += 1;
  state.pendingTelemetry = { outputTokens: state.pendingTelemetry.outputTokens + outputTokens, inputTokens: state.pendingTelemetry.inputTokens + inputTokens, cacheTokens: state.pendingTelemetry.cacheTokens + cacheTokens, isAgentActive: state.pendingTelemetry.isAgentActive || input.isAgentActive === true || input.tokensPerSecond > 0 };
  return state;
}

function resolveCard(state: RunState, cardId: string): UpgradeCard {
  const direct = state.pendingCards.find((candidate) => candidate.id === cardId);
  if (direct) {
    if (!isUpgradeCardEligible(state, direct)) throw new Error('Upgrade card is no longer eligible');
    return direct;
  }
  const alias = cardId === 'weapon-upgrade' ? state.pendingCards.find((candidate) => candidate.kind === 'weapon') : cardId === 'power-gauntlets' ? state.pendingCards.find((candidate) => candidate.target === 'power_gauntlets') : undefined;
  if (alias) {
    if (!isUpgradeCardEligible(state, alias)) throw new Error('Upgrade card is no longer eligible');
    return alias;
  }
  throw new Error(`Unknown upgrade card: ${cardId}`);
}

/** Resume the dungeon after a level-up choice. The base-game transition gives
 * the player a brief safety window; reuse the stage-owned contact protection
 * duration so the rule remains data-driven and bounded with the normal hit
 * cooldown rather than inventing a second timing constant. */
function resumeAfterLevelUp(state: RunState): void {
  state.phase = 'dungeon';
  state.hero.invulnerabilityRemaining = Math.max(state.hero.invulnerabilityRemaining, stageDefinition(state).combat.contactInvulnerabilitySeconds);
}

export function chooseUpgrade(state: RunState, cardId: string): RunState {
  if (state.phase !== 'level-up') return state;
  const card = resolveCard(state, cardId);
  if (card.kind === 'weapon') {
    const weapon = state.weapons.find((candidate) => candidate.id === card.target);
    const definition = weaponDefinition(card.target);
    if (!weapon || !definition || weapon.level >= definition.maxLevel) throw new Error('Weapon is already at maximum level');
    weapon.level += 1;
  } else if (card.kind === 'new-weapon') {
    if (state.weapons.length >= SIMULATION_POLICIES.maxWeaponSlots || state.weapons.some((weapon) => weapon.id === card.target)) throw new Error('Weapon slot is unavailable');
    state.weapons.push({ id: card.target, level: 1, cooldownRemaining: 0 });
  } else if (card.kind === 'passive' || card.kind === 'new-passive') {
    const definition = passiveDefinition(card.target);
    if (!definition) throw new Error('Passive is not registered');
    const current = state.passives[card.target] ?? 0;
    if (card.kind === 'new-passive' && current > 0) throw new Error('Passive is already equipped');
    if (card.kind === 'new-passive' && Object.keys(state.passives).length >= SIMULATION_POLICIES.maxPassiveSlots) throw new Error('Passive slot is unavailable');
    if (current >= definition.maxLevel) throw new Error('Passive is already at maximum level');
    state.passives[card.target] = current + 1;
    recalculateStats(state);
  } else if (card.kind === 'gold') {
    awardGold(state, 'levelUp', 10);
  } else {
    state.hero.stats.hp = Math.min(state.hero.stats.maxHp, state.hero.stats.hp + state.hero.stats.maxHp * 0.25);
  }
  state.upgradeHistory.push(card.id);
  state.pendingLevelUps = Math.max(0, state.pendingLevelUps - 1);
  if (state.pendingLevelUps > 0) {
    state.pendingCards = makeCards(state);
    state.phase = 'level-up';
  } else {
    state.pendingCards = [];
    resumeAfterLevelUp(state);
  }
  return state;
}

export function rerollLevelUp(state: RunState): RunState {
  if (state.phase !== 'level-up' || state.rerollsRemaining <= 0 || !hasEligibleWeaponOrPassive(state)) throw new Error('Reroll is unavailable');
  state.rerollsRemaining -= 1;
  state.pendingCards = makeCards(state);
  state.upgradeHistory.push('action:reroll');
  return state;
}

export function skipLevelUp(state: RunState): RunState {
  if (state.phase !== 'level-up' || state.skipsRemaining <= 0 || !hasEligibleWeaponOrPassive(state)) throw new Error('Skip is unavailable');
  state.skipsRemaining -= 1;
  grantSkipExperience(state);
  state.pendingLevelUps = Math.max(0, state.pendingLevelUps - 1);
  state.upgradeHistory.push('action:skip');
  if (state.pendingLevelUps > 0) state.pendingCards = makeCards(state);
  else { state.pendingCards = []; resumeAfterLevelUp(state); }
  return state;
}

export function banishLevelUpCard(state: RunState, cardId: string): RunState {
  if (state.phase !== 'level-up' || state.banishesRemaining <= 0) throw new Error('Banish is unavailable');
  const card = state.pendingCards.find((candidate) => candidate.id === cardId);
  if (!card) throw new Error('Unknown level-up card');
  if (!isBanishableUpgradeCard(card) || isUpgradeCardBanned(state, card)) throw new Error('Only an unbanished weapon or passive can be banished');
  state.banishesRemaining -= 1;
  state.bannedUpgradeIds.push(cardId, upgradeItemKey(card.target));
  state.pendingCards = makeCards(state);
  state.upgradeHistory.push(`action:banish:${cardId}`);
  return state;
}

function targetFor(state: RunState): EnemyState | undefined {
  return state.enemies.slice().sort((a, b) => distance(a, state.hero) - distance(b, state.hero))[0];
}

function projectileSpeed(stats: WeaponLevelStats, combat: CombatStats, ignoreSpeed = false): number {
  const baseSpeed = stats.speed <= 2 ? 80 * stats.speed : stats.speed;
  return calculateProjectileSpeed(baseSpeed, ignoreSpeed ? { ...combat, speed: 0 } : combat);
}

function projectileLifetime(stats: WeaponLevelStats, combat: CombatStats, ignoreDuration = false): number {
  return calculateProjectileLifetime(stats.duration, ignoreDuration ? { ...combat, duration: 0 } : combat);
}

function poolDropPosition(state: RunState, angle: number, index: number, total: number): { x: number; y: number } {
  if (index === 0) {
    const target = targetFor(state);
    if (target) return { x: target.x, y: target.y };
  }
  const ringAngle = angle + (total > 1 ? (Math.PI * 2 * index) / total : 0);
  const radius = Math.min(180, POOL_DEFAULT_RADIUS + Math.max(0, index - 1) * 12);
  return { x: state.hero.x + Math.cos(ringAngle) * radius, y: state.hero.y + Math.sin(ringAngle) * radius };
}

function createProjectile(state: RunState, weapon: WeaponState, stats: WeaponLevelStats, angle: number, poolIndex = 0, poolTotal = 1): void {
  if (state.projectiles.length >= SIMULATION_POLICIES.maxProjectiles) return;
  const definition = weaponDefinition(weapon.id);
  const speed = projectileSpeed(stats, state.hero.stats, definition?.ignoreSpeed === true);
  const area = calculateProjectileArea(stats.area, state.hero.stats);
  const isOrbit = definition?.pattern === 'orbit';
  const isPool = definition?.pattern === 'pool';
  const orbitScale = Math.max(0, stats.area) * (1 + Math.max(0, state.hero.stats.area ?? 0));
  const orbitRadius = Math.min(ORBIT_MAX_RADIUS, Math.max(12, 44 * orbitScale));
  const orbitAngularSpeed = Math.max(0.1, stats.speed * 2);
  const poolPosition = isPool ? poolDropPosition(state, angle, poolIndex, poolTotal) : undefined;
  const startX = isOrbit ? state.hero.x + Math.cos(angle) * orbitRadius : poolPosition?.x ?? state.hero.x;
  const startY = isOrbit ? state.hero.y + Math.sin(angle) * orbitRadius : poolPosition?.y ?? state.hero.y;
  const projectile: ProjectileState = { id: state.nextEntityId++, weaponId: weapon.id, x: startX, y: startY, vx: isOrbit || isPool ? 0 : Math.cos(angle) * speed, vy: isOrbit || isPool ? 0 : Math.sin(angle) * speed, damage: calculateDamage(stats.damage, state.hero.stats), area, remainingPierce: Math.max(0, Math.floor(stats.pierce)), remainingSeconds: projectileLifetime(stats, state.hero.stats, definition?.ignoreDuration === true), knockback: Math.max(0, stats.knockback), hitEnemyIds: [], ...(definition?.pattern === 'boomerang' ? { boomerangOriginX: state.hero.x, boomerangOriginY: state.hero.y, boomerangReturning: false } : {}), ...(isOrbit ? { orbitAngle: angle, orbitRadius, orbitAngularSpeed } : {}), ...(isPool ? { hitCooldowns: {} } : {}) };
  if (isPool && definition.poolLimit !== undefined) {
    const existing = state.projectiles.findIndex((candidate) => candidate.weaponId === weapon.id);
    const activeCount = state.projectiles.reduce((count, candidate) => count + (candidate.weaponId === weapon.id ? 1 : 0), 0);
    if (activeCount >= definition.poolLimit && existing >= 0) state.projectiles.splice(existing, 1);
  }
  state.projectiles.push(projectile);
}

/** Create a Whip-family attack as a hero-anchored hitbox. Unlike a moving
 * projectile, a slash keeps the facing vector only for directional targeting;
 * its position is fixed for the authored attack duration and its collision
 * pass accepts every enemy in the forward half-plane once. */
function createSlashProjectile(state: RunState, weapon: WeaponState, stats: WeaponLevelStats, angle: number): void {
  if (state.projectiles.length >= SIMULATION_POLICIES.maxProjectiles) return;
  const area = calculateProjectileArea(stats.area, state.hero.stats);
  const facingX = Math.cos(angle);
  const facingY = Math.sin(angle);
  const offset = area * 0.65;
  state.projectiles.push({
    id: state.nextEntityId++,
    weaponId: weapon.id,
    x: state.hero.x + facingX * offset,
    y: state.hero.y + facingY * offset,
    // Slash projectiles retain the direction vector for the forward-cone
    // collision test but do not use it as world velocity.
    vx: facingX,
    vy: facingY,
    damage: calculateDamage(stats.damage, state.hero.stats),
    area,
    remainingPierce: 0,
    remainingSeconds: projectileLifetime(stats, state.hero.stats, true),
    knockback: Math.max(0, stats.knockback),
    hitEnemyIds: []
  });
}

function isPersistentBouncePattern(weaponId: string): boolean {
  const pattern = weaponDefinition(weaponId)?.pattern;
  return pattern === 'ricochet' || pattern === 'bone' || pattern === 'orbit' || pattern === 'pool';
}

function isBoomerangPattern(weaponId: string): boolean {
  return weaponDefinition(weaponId)?.pattern === 'boomerang';
}

function isOrbitPattern(weaponId: string): boolean {
  return weaponDefinition(weaponId)?.pattern === 'orbit';
}

function isProjectileHitCooldownPattern(weaponId: string): boolean {
  const pattern = weaponDefinition(weaponId)?.pattern;
  return pattern === 'ricochet' || pattern === 'pool';
}

function projectileHitboxDelay(weaponId: string): number {
  return weaponDefinition(weaponId)?.projectileHitboxDelaySeconds ?? SIMULATION_POLICIES.projectileHitboxDelaySeconds;
}

function weaponExplosion(weaponId: string): NonNullable<ReturnType<typeof weaponDefinition>>['explosion'] | undefined {
  return weaponDefinition(weaponId)?.explosion;
}

function addVisualEffect(state: RunState, effect: VisualEffectState): void {
  if (!Number.isFinite(effect.x) || !Number.isFinite(effect.y) || !Number.isFinite(effect.radius) || effect.radius <= 0) return;
  const effects = state.visualEffects ?? (state.visualEffects = []);
  effects.push(effect);
  if (effects.length > SIMULATION_POLICIES.maxVisualEffects) effects.splice(0, effects.length - SIMULATION_POLICIES.maxVisualEffects);
}

function addWeaponExplosionEffect(state: RunState, projectile: ProjectileState, radius: number): void {
  addVisualEffect(state, { kind: 'explosion', x: projectile.x, y: projectile.y, radius, durationSeconds: SIMULATION_POLICIES.visualEffectDurationSeconds, remainingSeconds: SIMULATION_POLICIES.visualEffectDurationSeconds });
}

function decayVisualEffects(state: RunState, delta: number): void {
  if (!state.visualEffects) return;
  state.visualEffects = state.visualEffects
    .map((effect) => ({ ...effect, remainingSeconds: Math.max(0, effect.remainingSeconds - delta) }))
    .filter((effect) => effect.remainingSeconds > 0)
    .slice(-SIMULATION_POLICIES.maxVisualEffects);
}

function decayProjectileHitCooldowns(projectile: ProjectileState, delta: number): void {
  if (!projectile.hitCooldowns) return;
  for (const [id, remaining] of Object.entries(projectile.hitCooldowns)) {
    const next = remaining - delta;
    if (next <= 0) delete projectile.hitCooldowns[id];
    else projectile.hitCooldowns[id] = next;
  }
}

function decayAuraHitCooldowns(weapon: WeaponState, delta: number): void {
  if (!weapon.auraHitCooldowns) return;
  for (const [id, remaining] of Object.entries(weapon.auraHitCooldowns)) {
    const next = remaining - delta;
    if (next <= 0) delete weapon.auraHitCooldowns[id];
    else weapon.auraHitCooldowns[id] = next;
  }
}

function hasAuraHitCooldown(weapon: WeaponState, targetId: number): boolean {
  return (weapon.auraHitCooldowns?.[String(targetId)] ?? 0) > 0;
}

function recordAuraHit(weapon: WeaponState, targetId: number, cooldown: number): void {
  const hitCooldowns = weapon.auraHitCooldowns ?? (weapon.auraHitCooldowns = {});
  if (hitCooldowns[String(targetId)] === undefined && Object.keys(hitCooldowns).length >= SIMULATION_POLICIES.maxAuraHitCooldownEntries) {
    const oldest = Object.keys(hitCooldowns)[0];
    if (oldest !== undefined) delete hitCooldowns[oldest];
  }
  hitCooldowns[String(targetId)] = Math.min(SIMULATION_POLICIES.maxAuraHitCooldownSeconds, Math.max(0, cooldown));
}

function hasProjectileHitCooldown(projectile: ProjectileState, targetId: number): boolean {
  return isProjectileHitCooldownPattern(projectile.weaponId) && (projectile.hitCooldowns?.[String(targetId)] ?? 0) > 0;
}

function recordProjectileHit(projectile: ProjectileState, targetId: number): void {
  if (!isProjectileHitCooldownPattern(projectile.weaponId)) {
    projectile.hitEnemyIds.push(targetId);
    return;
  }
  const hitCooldowns = projectile.hitCooldowns ?? (projectile.hitCooldowns = {});
  hitCooldowns[String(targetId)] = projectileHitboxDelay(projectile.weaponId);
}

function applyHit(state: RunState, projectile: ProjectileState, enemy: EnemyState): void {
  if (hasProjectileHitCooldown(projectile, enemy.id) || (!isProjectileHitCooldownPattern(projectile.weaponId) && projectile.hitEnemyIds.includes(enemy.id))) return;
  if (weaponDefinition(projectile.weaponId)?.pattern === 'slash' && !isInSlashArc(state, projectile, enemy)) return;
  recordProjectileHit(projectile, enemy.id);
  enemy.hp -= projectile.damage;
  state.damageByWeapon[projectile.weaponId] = (state.damageByWeapon[projectile.weaponId] ?? 0) + projectile.damage;
  if (projectile.knockback > 0) {
    applyEnemyKnockback(enemy, state.hero.x, state.hero.y, projectile.knockback);
  }
  const definition = weaponDefinition(projectile.weaponId);
  if (definition?.pattern === 'bone') {
    // Bone follows the documented bouncing-projectile contract: it keeps
    // travelling after a hit and reflects its velocity from the enemy instead
    // of consuming the weapon's ordinary pierce budget. The hit-ID ledger
    // prevents a single overlap from damaging the same enemy repeatedly in
    // one pass.
    reflectProjectileFromPoint(projectile, enemy);
  } else if (definition?.pattern !== 'slash' && !isPersistentBouncePattern(projectile.weaponId)) {
    // Runetracer's screen-bouncing analogue (Bouncing Arrow) has infinite
    // pierce; it damages every enemy along its route without consuming the
    // ordinary projectile pierce budget.
    projectile.remainingPierce -= 1;
  }
}

function isInSlashArc(state: RunState, projectile: ProjectileState, target: { x: number; y: number }): boolean {
  const dx = target.x - state.hero.x;
  const dy = target.y - state.hero.y;
  return dx * projectile.vx + dy * projectile.vy >= 0;
}

function reflectProjectileFromPoint(projectile: ProjectileState, point: { x: number; y: number }): void {
  const normalX = projectile.x - point.x;
  const normalY = projectile.y - point.y;
  const length = Math.hypot(normalX, normalY);
  if (length < 1e-6) {
    projectile.vx = -projectile.vx;
    projectile.vy = -projectile.vy;
    return;
  }
  const nx = normalX / length;
  const ny = normalY / length;
  const dot = projectile.vx * nx + projectile.vy * ny;
  projectile.vx -= 2 * dot * nx;
  projectile.vy -= 2 * dot * ny;
}

function applyEnemyKnockback(enemy: EnemyState, sourceX: number, sourceY: number, strength: number): void {
  const resistance = Math.max(0, Math.min(1, enemy.knockbackResistance ?? 0));
  const effectiveStrength = Math.max(0, strength) * (1 - resistance);
  if (effectiveStrength <= 0) return;
  const dx = enemy.x - sourceX;
  const dy = enemy.y - sourceY;
  const length = Math.hypot(dx, dy) || 1;
  const directionX = dx / length;
  const directionY = dy / length;
  // Keep the established hit displacement so existing weapon balance does not
  // change abruptly, then carry the reaction for the documented short window.
  enemy.x += directionX * effectiveStrength;
  enemy.y += directionY * effectiveStrength;
  enemy.knockbackRemaining = ENEMY_KNOCKBACK_SECONDS;
  enemy.knockbackDirectionX = directionX;
  enemy.knockbackDirectionY = directionY;
  enemy.knockbackSpeed = Math.max(1, enemy.speed) * effectiveStrength;
}

function applyLightSourceHit(state: RunState, projectile: ProjectileState, source: LightSourceState): void {
  if (hasProjectileHitCooldown(projectile, source.id) || (!isProjectileHitCooldownPattern(projectile.weaponId) && projectile.hitEnemyIds.includes(source.id))) return;
  if (weaponDefinition(projectile.weaponId)?.pattern === 'slash' && !isInSlashArc(state, projectile, source)) return;
  recordProjectileHit(projectile, source.id);
  source.hp -= projectile.damage;
  state.damageByWeapon[projectile.weaponId] = (state.damageByWeapon[projectile.weaponId] ?? 0) + projectile.damage;
  const definition = weaponDefinition(projectile.weaponId);
  if (definition?.pattern === 'bone') reflectProjectileFromPoint(projectile, source);
  else if (!isPersistentBouncePattern(projectile.weaponId)) projectile.remainingPierce -= 1;
}

function applyWeaponExplosion(state: RunState, projectile: ProjectileState, retaliatory = false): void {
  const explosion = weaponExplosion(projectile.weaponId);
  const multiplier = explosion?.radiusMultiplier ?? SIMULATION_POLICIES.noFutureExplosionRadiusMultiplier;
  const radius = projectile.area * multiplier;
  if (radius <= 0) return;
  const armorBonusPerPoint = retaliatory ? (explosion?.retaliatoryArmorBonusPerPoint ?? 0) : 0;
  const explosionDamage = calculateRetaliatoryDamage(projectile.damage, state.hero.stats.armor, armorBonusPerPoint, SIMULATION_POLICIES.maxRetaliatoryArmorBonus);
  addWeaponExplosionEffect(state, projectile, radius);
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 || distance(projectile, enemy) > radius) continue;
    enemy.hp -= explosionDamage;
    state.damageByWeapon[projectile.weaponId] = (state.damageByWeapon[projectile.weaponId] ?? 0) + explosionDamage;
    applyEnemyKnockback(enemy, projectile.x, projectile.y, projectile.knockback);
  }
  for (const source of state.lightSources) {
    if (source.hp <= 0 || distance(projectile, source) > radius) continue;
    source.hp -= explosionDamage;
    state.damageByWeapon[projectile.weaponId] = (state.damageByWeapon[projectile.weaponId] ?? 0) + explosionDamage;
  }
}

/** Resolve a weapon's authored launch direction at the moment a projectile is
 * released. Targeted weapons reacquire a target for every queued shot, while
 * facing weapons retain the hero's last normalized movement direction. Keeping
 * this in one helper prevents sequential volleys from silently falling back to
 * nearest-target aim when their registry contract is directional. */
function weaponLaunchAngle(state: RunState, definition: ReturnType<typeof weaponDefinition>): number {
  if (!definition) return 0;
  const target = targetFor(state);
  const targetAngle = target ? Math.atan2(target.y - state.hero.y, target.x - state.hero.x) : nextRandom(state) * Math.PI * 2;
  const facingX = Number.isFinite(state.hero.facingX) ? state.hero.facingX! : 1;
  const facingY = Number.isFinite(state.hero.facingY) ? state.hero.facingY! : 0;
  const facingAngle = Math.atan2(facingY, facingX);
  if (definition.pattern === 'bone' || definition.pattern === 'ricochet') return nextRandom(state) * Math.PI * 2;
  if (definition.aim === 'facing') return facingAngle;
  if (definition.aim === 'random') return nextRandom(state) * Math.PI * 2;
  return targetAngle;
}

function fireWeapon(state: RunState, weapon: WeaponState): void {
  const definition = weaponDefinition(weapon.id);
  if (!definition) return;
  const stats = weaponStats(state, weapon);
  const launchAngle = weaponLaunchAngle(state, definition);
  const amount = Math.min(SIMULATION_POLICIES.maxProjectiles, calculateWeaponAmount(stats.amount, state.hero.stats));
  const cooldown = calculateCooldown(stats.cooldown, state.hero.stats);
  if (definition.pattern === 'aura') {
    const radius = calculateAuraRadius(stats.area, state.hero.stats);
    const auraDamage = calculateDamage(stats.damage, state.hero.stats);
    for (const enemy of state.enemies) {
      if (distance(enemy, state.hero) > radius || hasAuraHitCooldown(weapon, enemy.id)) continue;
      enemy.hp -= auraDamage;
      state.damageByWeapon[weapon.id] = (state.damageByWeapon[weapon.id] ?? 0) + auraDamage;
      applyEnemyKnockback(enemy, state.hero.x, state.hero.y, stats.knockback);
      recordAuraHit(weapon, enemy.id, cooldown);
    }
    for (const source of state.lightSources) {
      if (distance(source, state.hero) > radius || hasAuraHitCooldown(weapon, source.id)) continue;
      source.hp -= auraDamage;
      state.damageByWeapon[weapon.id] = (state.damageByWeapon[weapon.id] ?? 0) + auraDamage;
      recordAuraHit(weapon, source.id, cooldown);
    }
  } else {
    // Magic Wand's authored contract fires additional projectiles in a short
    // sequence rather than spawning the entire Amount volley at one instant.
    // Keep the queue on the weapon so it survives level-up pauses,
    // checkpoints, and host snapshots. Each queued shot reacquires the
    // nearest eligible target when it is actually released.
    const projectileInterval = weaponProjectileInterval(definition, stats);
    if ((definition.pattern === 'targeted' || definition.pattern === 'fan' || definition.pattern === 'boomerang' || definition.pattern === 'pool') && projectileInterval > 0 && amount > 0) {
      const initialOffset = definition.pattern === 'fan' ? fanProjectileOffset(0, amount) : 0;
      createProjectile(state, weapon, stats, launchAngle + initialOffset, 0, amount);
      weapon.pendingShots = Math.max(0, amount - 1);
      weapon.shotIntervalRemaining = weapon.pendingShots > 0 ? projectileInterval : 0;
      if ((definition.pattern === 'fan' || definition.pattern === 'pool') && weapon.pendingShots > 0) {
        weapon.pendingVolleyAngle = launchAngle;
        weapon.pendingVolleyTotal = amount;
      }
      weapon.cooldownRemaining = cooldown;
      return;
    }
    const spread = definition.pattern === 'fan' ? 0.2 : 0;
    for (let index = 0; index < amount; index += 1) {
      const offset = amount === 1 ? 0 : (index - (amount - 1) / 2) * spread;
      if (definition.pattern === 'slash') createSlashProjectile(state, weapon, stats, launchAngle + offset);
      else createProjectile(state, weapon, stats, launchAngle + offset);
    }
  }
  weapon.cooldownRemaining = cooldown;
}

function fanProjectileOffset(index: number, total: number): number {
  return total <= 1 ? 0 : (index - (total - 1) / 2) * 0.2;
}

function fireQueuedProjectile(state: RunState, weapon: WeaponState): void {
  const definition = weaponDefinition(weapon.id);
  if (!definition || (definition.pattern !== 'targeted' && definition.pattern !== 'fan' && definition.pattern !== 'boomerang' && definition.pattern !== 'pool') || weaponProjectileInterval(definition, weaponStats(state, weapon)) <= 0 || (weapon.pendingShots ?? 0) <= 0) return;
  const stats = weaponStats(state, weapon);
  const pending = Math.max(0, Math.floor(weapon.pendingShots ?? 0));
  const total = definition.pattern === 'fan' ? Math.max(pending + 1, Math.floor(weapon.pendingVolleyTotal ?? pending + 1)) : 1;
  // `pending` excludes the projectile already released at volley index zero,
  // so the next queued projectile is the authored offset at `total - pending`.
  const index = definition.pattern === 'fan' ? Math.max(0, total - pending) : 0;
  const launchAngle = definition.pattern === 'fan' && Number.isFinite(weapon.pendingVolleyAngle) ? weapon.pendingVolleyAngle! : weaponLaunchAngle(state, definition);
  createProjectile(state, weapon, stats, launchAngle + (definition.pattern === 'fan' ? fanProjectileOffset(index, total) : 0), index, total);
  weapon.pendingShots = Math.max(0, Math.floor(weapon.pendingShots ?? 0) - 1);
  if ((weapon.pendingShots ?? 0) === 0) {
    weapon.shotIntervalRemaining = 0;
    delete weapon.pendingVolleyAngle;
    delete weapon.pendingVolleyTotal;
  }
}

function updateWeapon(state: RunState, weapon: WeaponState, delta: number): void {
  const definition = weaponDefinition(weapon.id);
  if (!definition) return;
  const projectileInterval = weaponProjectileInterval(definition, weaponStats(state, weapon));
  const pending = Math.max(0, Math.floor(weapon.pendingShots ?? 0));
  if (pending > 0 && projectileInterval > 0) {
    weapon.pendingShots = pending;
    weapon.shotIntervalRemaining = Math.max(0, (weapon.shotIntervalRemaining ?? projectileInterval) - delta);
    // A bounded loop is important when a restored checkpoint has accumulated
    // more wall time than one fixed step. The queue itself is capped by the
    // shared projectile policy.
    let releases = 0;
    while ((weapon.pendingShots ?? 0) > 0 && (weapon.shotIntervalRemaining ?? 0) <= Number.EPSILON && releases < SIMULATION_POLICIES.maxProjectiles) {
      fireQueuedProjectile(state, weapon);
      releases += 1;
      if ((weapon.pendingShots ?? 0) > 0) weapon.shotIntervalRemaining = (weapon.shotIntervalRemaining ?? 0) + projectileInterval;
    }
  }
  weapon.cooldownRemaining -= delta;
  if ((weapon.pendingShots ?? 0) <= 0 && weapon.cooldownRemaining <= 0) fireWeapon(state, weapon);
}

function updateProjectiles(state: RunState, delta: number): void {
  const survivors: ProjectileState[] = [];
  for (const projectile of state.projectiles) {
    decayProjectileHitCooldowns(projectile, delta);
    const definition = weaponDefinition(projectile.weaponId);
    // Resolve a hit at the launch/current position as well as along the
    // movement step. This matters when a target reaches the hero between
    // weapon ticks: the projectile should still be able to hit it instead of
    // always starting outside the target's collision radius.
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0 || distance(projectile, enemy) > projectile.area) continue;
      applyHit(state, projectile, enemy);
      if (projectile.remainingPierce < 0) break;
    }
    if (projectile.remainingPierce >= 0) {
      for (const source of state.lightSources) {
        if (source.hp <= 0 || distance(projectile, source) > projectile.area) continue;
        applyLightSourceHit(state, projectile, source);
        if (projectile.remainingPierce < 0) break;
      }
    }
    if (projectile.remainingPierce < 0) continue;
    if (isOrbitPattern(projectile.weaponId)) {
      projectile.orbitAngle = (projectile.orbitAngle ?? 0) + (projectile.orbitAngularSpeed ?? 0.1) * delta;
      const radius = projectile.orbitRadius ?? 44;
      projectile.x = state.hero.x + Math.cos(projectile.orbitAngle) * radius;
      projectile.y = state.hero.y + Math.sin(projectile.orbitAngle) * radius;
    } else if (isBoomerangPattern(projectile.weaponId)) {
      const originX = projectile.boomerangOriginX ?? projectile.x;
      const originY = projectile.boomerangOriginY ?? projectile.y;
      const travelled = Math.hypot(projectile.x - originX, projectile.y - originY);
      if (projectile.boomerangReturning !== true && (projectile.hitEnemyIds.length > 0 || travelled >= BOOMERANG_RETURN_DISTANCE)) projectile.boomerangReturning = true;
      if (projectile.boomerangReturning === true) {
        const toHeroX = state.hero.x - projectile.x;
        const toHeroY = state.hero.y - projectile.y;
        const heroDistance = Math.hypot(toHeroX, toHeroY);
        if (heroDistance <= BOOMERANG_HERO_RETURN_RADIUS) continue;
        const speed = Math.hypot(projectile.vx, projectile.vy) || 1;
        projectile.vx = (toHeroX / (heroDistance || 1)) * speed;
        projectile.vy = (toHeroY / (heroDistance || 1)) * speed;
      }
      projectile.x += projectile.vx * delta;
      projectile.y += projectile.vy * delta;
    } else if (definition?.pattern !== 'slash' && definition?.pattern !== 'pool') {
      projectile.x += projectile.vx * delta;
      projectile.y += projectile.vy * delta;
    }
    projectile.remainingSeconds -= delta;
    if (definition?.pattern === 'ricochet' || definition?.pattern === 'bone') {
      const bounds = ricochetBounds(state.hero);
      let bounced = false;
      if (projectile.x < bounds.minX || projectile.x > bounds.maxX) { projectile.vx *= -1; projectile.x = Math.max(bounds.minX, Math.min(bounds.maxX, projectile.x)); bounced = true; }
      if (projectile.y < bounds.minY || projectile.y > bounds.maxY) { projectile.vy *= -1; projectile.y = Math.max(bounds.minY, Math.min(bounds.maxY, projectile.y)); bounced = true; }
      if (bounced && weaponExplosion(projectile.weaponId)?.onBounce === true) applyWeaponExplosion(state, projectile);
    }
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0 || distance(projectile, enemy) > projectile.area) continue;
      applyHit(state, projectile, enemy);
      if (projectile.remainingPierce < 0) break;
    }
    if (projectile.remainingPierce >= 0) {
      for (const source of state.lightSources) {
        if (source.hp <= 0 || distance(projectile, source) > projectile.area) continue;
        applyLightSourceHit(state, projectile, source);
        if (projectile.remainingPierce < 0) break;
      }
    }
    const inBounds = definition?.pattern === 'ricochet' || definition?.pattern === 'bone' || definition?.pattern === 'boomerang' || definition?.pattern === 'orbit' || definition?.pattern === 'pool' || isWithinProjectileCullRadius(projectile, state.hero);
    if (projectile.remainingSeconds > 0 && projectile.remainingPierce >= 0 && inBounds) survivors.push(projectile);
  }
  state.projectiles = survivors.slice(0, SIMULATION_POLICIES.maxProjectiles);
}

function moveHero(state: RunState, input: InputSnapshot, delta: number): void {
  if (state.battery.isLockedOut) return;
  const horizontal = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const vertical = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const length = Math.hypot(horizontal, vertical);
  if (length === 0) return;
  state.hero.facingX = horizontal / length;
  state.hero.facingY = vertical / length;
  state.hero.x += (horizontal / length) * state.hero.stats.moveSpeed * delta;
  state.hero.y += (vertical / length) * state.hero.stats.moveSpeed * delta;
}

function moveEnemyTowardHero(state: RunState, enemy: EnemyState, delta: number): void {
  if ((enemy.knockbackRemaining ?? 0) > 0) {
    const knockbackDelta = Math.min(delta, enemy.knockbackRemaining ?? 0);
    enemy.x += (enemy.knockbackDirectionX ?? 0) * (enemy.knockbackSpeed ?? 0) * knockbackDelta;
    enemy.y += (enemy.knockbackDirectionY ?? 0) * (enemy.knockbackSpeed ?? 0) * knockbackDelta;
    enemy.knockbackRemaining = Math.max(0, (enemy.knockbackRemaining ?? 0) - delta);
    if ((enemy.knockbackRemaining ?? 0) > 0) return;
  }
  const dx = state.hero.x - enemy.x;
  const dy = state.hero.y - enemy.y;
  const length = Math.hypot(dx, dy) || 1;
  let directionX = dx / length;
  let directionY = dy / length;
  if (enemy.movementPattern === 'wavy') {
    // Preserve the documented approach-to-player behavior while adding a
    // bounded lateral weave. Renormalizing keeps speed unchanged.
    const phase = enemy.movementPhase ?? 0;
    const weave = Math.sin(state.elapsedSeconds * 2.2 + phase) * 0.35;
    const perpendicularX = -directionY;
    const perpendicularY = directionX;
    directionX += perpendicularX * weave;
    directionY += perpendicularY * weave;
    const adjustedLength = Math.hypot(directionX, directionY) || 1;
    directionX /= adjustedLength;
    directionY /= adjustedLength;
  }
  enemy.x += directionX * enemy.speed * delta;
  enemy.y += directionY * enemy.speed * delta;
}

function tickFixedStep(state: RunState, deltaSeconds: number, tokensPerSecond = 0, input: InputSnapshot = EMPTY_INPUT): RunState {
  void tokensPerSecond;
  if (state.phase !== 'dungeon' || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return state;
  const delta = Math.min(deltaSeconds, SIMULATION_POLICIES.maxStepSeconds);
  const chestPresentationRemaining = Math.max(0, state.chestPresentationRemaining ?? 0);
  if (chestPresentationRemaining > 0) {
    state.chestPresentationRemaining = Math.max(0, Math.round((chestPresentationRemaining - delta) * 1e9) / 1e9);
    return state;
  }
  const telemetry = state.pendingTelemetry;
  state.pendingTelemetry = { outputTokens: 0, inputTokens: 0, cacheTokens: 0, isAgentActive: false };
  const batteryResult = BatteryEngine.processTick(delta, state.battery, telemetry.isAgentActive, BatteryEngine.calculateChargedTokens(telemetry));
  state.battery = batteryResult.newState;
  state.batteryCharging = batteryResult.isCharging;
  if (state.battery.isLockedOut) return state;
  // Effects advance only when simulation time advances; chest presentation and
  // battery lockout intentionally freeze gameplay and its visual timeline.
  decayVisualEffects(state, delta);
  state.elapsedSeconds = Math.round((state.elapsedSeconds + delta * state.stageClockScale) * 1e9) / 1e9;
  moveHero(state, input, delta);
  scheduleWaves(state);
  scheduleLightSources(state);
  startFinale(state);
  scheduleFinaleThreats(state);
  const stage = stageDefinition(state);
  // Reaching the authored end-stage window is a completion condition even if
  // the invulnerable final threat never contacts the hero. The threat remains
  // visible for one minute so the player sees the end-state sequence, then the
  // run resolves with its stage reward instead of hanging indefinitely.
  if (state.stageFinaleStarted && state.elapsedSeconds >= (state.stageFinaleDeadline ?? stage.durationSeconds + stage.finale.graceSeconds)) {
    finishRun(state, 'victory', 'stage-timer');
    return state;
  }

  state.hero.invulnerabilityRemaining = Math.max(0, state.hero.invulnerabilityRemaining - delta);
  if ((state.hero.stats.recovery ?? 0) > 0) state.hero.stats.hp = Math.min(state.hero.stats.maxHp, state.hero.stats.hp + (state.hero.stats.recovery ?? 0) * delta);
  for (const enemy of state.enemies) {
    if ((enemy.frozenRemaining ?? 0) > 0) {
      enemy.frozenRemaining = Math.max(0, (enemy.frozenRemaining ?? 0) - delta);
      continue;
    }
    moveEnemyTowardHero(state, enemy, delta);
    if (distance(enemy, state.hero) < stage.combat.contactRadius && state.hero.invulnerabilityRemaining <= 0) {
      const hpBeforeContact = state.hero.stats.hp;
      if (isStageFinaleThreat(state, enemy)) state.hero.stats.hp = 0;
      else state.hero.stats.hp -= Math.max(1, enemy.damage - state.hero.stats.armor);
      if (state.hero.stats.hp < hpBeforeContact) {
        for (const projectile of state.projectiles) if (weaponExplosion(projectile.weaponId)?.onContact === true) applyWeaponExplosion(state, projectile, true);
      }
      state.hero.invulnerabilityRemaining = stage.combat.contactInvulnerabilitySeconds;
    }
  }
  for (const enemy of state.enemies) {
    if (!shouldRelocateBoss(enemy, state.hero, stage.spawnPolicy.enemyPersistenceRadius)) continue;
    const point = perimeterSpawnPoint(state.hero, nextRandom(state), 0, stage.spawnPolicy.bossRadius, stage.spawnPolicy.bossRadius);
    enemy.x = point.x;
    enemy.y = point.y;
  }
  // Non-bosses that fall well outside the active camera are despawned rather
  // than retained forever. This is a world-relative persistence rule, not a
  // hidden map wall; bosses and their result ownership always remain present.
  state.enemies = state.enemies.filter((enemy) => !shouldDespawnEnemy(enemy, state.hero, stage.spawnPolicy.enemyPersistenceRadius));
  if (state.hero.stats.hp <= 0) {
    if (state.revivalsRemaining > 0) {
      state.phase = 'revival';
      state.hero.invulnerabilityRemaining = 0;
      return state;
    } else {
      finishRun(state, state.stageFinaleStarted ? 'victory' : 'defeat', state.stageFinaleStarted ? 'final-threat' : 'defeat');
      return state;
    }
  }

  for (const weapon of state.weapons) {
    decayAuraHitCooldowns(weapon, delta);
    updateWeapon(state, weapon, delta);
  }
  updateProjectiles(state, delta);

  // The timeout threat is an end-state actor, not a normal killable boss.
  // Keep it alive until the result sequence resolves rather than allowing a
  // projectile to turn the stage into an incorrect early victory.
  for (const enemy of state.enemies) if (isInvulnerableStageThreat(state, enemy) && enemy.hp <= 0) enemy.hp = enemy.maxHp;
  const dead = state.enemies.filter((enemy) => enemy.hp <= 0);
  for (const enemy of dead) {
    state.enemiesDefeated += 1;
    if (enemy.isBoss && !isStageFinaleThreat(state, enemy)) state.pickups.push({ id: state.nextEntityId++, kind: 'gold-chest', x: enemy.x, y: enemy.y, value: 100 });
    else dropEnemyPickup(state, enemy);
  }
  state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
  const destroyedLightSources = state.lightSources.filter((source) => source.hp <= 0);
  for (const source of destroyedLightSources) dropLightSourcePickup(state, source);
  state.lightSources = state.lightSources.filter((source) => source.hp > 0);
  condenseXpPickups(state);
  attractPickups(state, delta);
  const collectedIds = new Set<number>();
  // In-memory callers may hydrate a pre-ledger checkpoint directly; keep the
  // same lossless migration behavior as the host restore boundary.
  if (!state.collectedPickupIds) state.collectedPickupIds = [];
  const collectedPickupLookup = new Set(state.collectedPickupIds);
  const chestPresentationBeforeCollection = state.chestPresentationRemaining ?? 0;
  for (const pickup of [...state.pickups]) {
    // Duplicate IDs can arrive from restored or malformed state. Only the
    // first instance may own a reward/effect in this collection pass or in a
    // later pass after a malformed/restored duplicate is reintroduced.
    if (collectedIds.has(pickup.id)) continue;
    if (collectedPickupLookup.has(pickup.id)) {
      collectedIds.add(pickup.id);
      continue;
    }
    if (distance(pickup, state.hero) > PICKUP_COLLECTION_RADIUS) continue;
    applyCollectedPickupEffect(state, pickup, collectedIds, collectedPickupLookup);
    collectedIds.add(pickup.id);
    rememberCollectedPickupIds(state, collectedIds, collectedPickupLookup);
  }
  state.pickups = state.pickups.filter((pickup) => !collectedIds.has(pickup.id));
  // A chest collected in this fixed step owns the next presentation window;
  // do not immediately resolve a boss victory or continue combat underneath
  // the reward banner. The following fixed steps count down the pause.
  if ((state.chestPresentationRemaining ?? 0) > chestPresentationBeforeCollection) return state;
  if (state.phase === 'dungeon' && (state.stageFinaleStarted || state.bossSpawned) && !state.enemies.some((enemy) => enemy.isBoss) && !state.pickups.some((pickup) => pickup.kind === 'gold-chest')) {
    finishRun(state, 'victory', state.stageFinaleStarted ? 'final-threat' : 'boss-defeat');
  }
  return state;
}

export function tick(state: RunState, deltaSeconds: number, tokensPerSecond = 0, input: InputSnapshot = EMPTY_INPUT): RunState {
  if (state.phase !== 'dungeon' || state.paused || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return state;
  const delta = Math.min(deltaSeconds, 0.25);
  state.simulationRemainderSeconds = Math.max(0, state.simulationRemainderSeconds ?? 0) + delta;
  let steps = 0;
  while (state.simulationRemainderSeconds + Number.EPSILON >= SIMULATION_POLICIES.fixedStepSeconds && state.phase === 'dungeon') {
    state.simulationRemainderSeconds = Math.round((state.simulationRemainderSeconds - SIMULATION_POLICIES.fixedStepSeconds) * 1e9) / 1e9;
    tickFixedStep(state, SIMULATION_POLICIES.fixedStepSeconds, tokensPerSecond, input);
    steps += 1;
    // A malformed restored snapshot must never spin the host indefinitely.
    if (steps >= 25) break;
  }
  if (state.simulationRemainderSeconds < Number.EPSILON) state.simulationRemainderSeconds = 0;
  return state;
}

export function getBossTimeSeconds(): number {
  return stageDefinition(createRun('warrior')).durationSeconds;
}

export function getHeroMoveSpeed(state: RunState, tokensPerSecond = 0): number {
  void tokensPerSecond;
  return state.hero.stats.moveSpeed;
}

export function getInventoryLimits(): { weapons: number; passives: number } {
  return { weapons: SIMULATION_POLICIES.maxWeaponSlots, passives: SIMULATION_POLICIES.maxPassiveSlots };
}
