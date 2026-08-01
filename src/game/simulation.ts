import { calculateCooldown, calculateDamage, calculateProjectileSpeed, distance, getXpRequiredForLevel } from './math';
import { classDefinition, enemyDefinition, MVP_REGISTRY, passiveDefinition, weaponDefinition } from './content';
import { metaActionCharges, metaStatBonuses } from './meta';
import { BatteryEngine } from '../shared/battery';
import type { CombatStats, EnemyState, HeroId, PickupState, ProjectileState, RunState, TokenInput, UpgradeCard, WeaponLevelStats, WeaponState } from './types';

const DEFAULT_STAGE_ID = 'code-dungeon';
const MAX_ENEMIES = 60;
const MAX_SPAWN_PER_TICK = 24;
const MAX_PROJECTILES = 240;
const MAX_XP_PICKUPS = 400;
const EVOLUTION_MIN_STAGE_SECONDS = 600;
const MAX_WEAPON_SLOTS = 6;
const MAX_PASSIVE_SLOTS = 6;
const MAP_LIMIT = 160;
const HERO_CONTACT_RADIUS = 8;
const HERO_INVULNERABILITY_SECONDS = 0.5;
const BASE_WEAPON_IDS = ['broadsword', 'arcane_bolt', 'throwing_daggers', 'bouncing_arrow', 'aegis_barrier', 'bone_throw'] as const;
const HERO_NAMES: Record<HeroId, string> = { warrior: 'Warrior', wizard: 'Wizard', rogue: 'Rogue', ranger: 'Ranger', paladin: 'Paladin', necromancer: 'Necromancer' };

function cloneStats(stats: CombatStats): CombatStats {
  return { ...stats };
}

function nextRandom(state: RunState): number {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 0x100000000;
}

function shuffle<T>(state: RunState, values: T[]): T[] {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom(state) * (index + 1));
    const current = values[index];
    values[index] = values[swapIndex]!;
    values[swapIndex] = current!;
  }
  return values;
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

export function recalculateStats(state: RunState): void {
  const previousHpRatio = state.hero.stats.maxHp > 0 ? state.hero.stats.hp / state.hero.stats.maxHp : 1;
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
    const bonus = definition.valuePerLevel * rank;
    if (definition.stat === 'allStats') {
      stats.might += bonus; stats.area += bonus; stats.speed += bonus; stats.duration = (stats.duration ?? 0) + bonus;
    } else if (definition.stat === 'magnet') {
      stats.magnet *= 1 + bonus;
    } else {
      applyStatBonus(stats, definition.stat, bonus);
    }
  }
  state.hero.stats = stats;
  state.hero.stats.hp = Math.min(stats.maxHp, Math.max(0, previousHpRatio * stats.maxHp));
}

function weaponStats(state: RunState, weapon: WeaponState): WeaponLevelStats {
  const definition = weaponDefinition(weapon.id);
  const fallback: WeaponLevelStats = { damage: 5, cooldown: 1, amount: 1, area: 1, speed: 1, duration: 1, pierce: 0, knockback: 0 };
  return definition?.levels[Math.max(0, Math.min(definition.maxLevel, weapon.level) - 1)] ?? fallback;
}

export function getWeaponLevelStats(state: RunState, weaponId: string): WeaponLevelStats | undefined {
  const weapon = state.weapons.find((candidate) => candidate.id === weaponId);
  return weapon ? weaponStats(state, weapon) : undefined;
}

function stageDefinition(state: RunState) {
  return MVP_REGISTRY.stages.find((stage) => stage.id === state.stageId) ?? MVP_REGISTRY.stages[0]!;
}

function addEnemy(state: RunState, enemyId: string): void {
  const definition = enemyDefinition(enemyId);
  if (!definition) return;
  if (!definition.isBoss && state.enemies.length >= MAX_ENEMIES) return;
  const angle = nextRandom(state) * Math.PI * 2;
  const radius = definition.isBoss ? 140 : 90 + nextRandom(state) * 40;
  const minutes = Math.floor(state.elapsedSeconds / 60);
  const healthScale = 1 + minutes * 0.03;
  const speedScale = 1 + minutes * 0.01;
  const damageScale = 1 + minutes * 0.02;
  const maxHp = Math.max(1, Math.round(definition.maxHp * healthScale));
  state.enemies.push({ id: state.nextEntityId++, kind: definition.id as EnemyState['kind'], x: state.hero.x + Math.cos(angle) * radius, y: state.hero.y + Math.sin(angle) * radius, hp: maxHp, maxHp, speed: definition.speed * speedScale, damage: Math.max(0, Math.round(definition.damage * damageScale)), isBoss: definition.isBoss, isElite: definition.isElite });
  state.enemiesSpawned += 1;
}

function scheduleWaves(state: RunState): void {
  const stage = stageDefinition(state);
  if (!stage) return;
  for (const wave of stage.waves) {
    if (state.elapsedSeconds < wave.fromSecond || state.elapsedSeconds >= wave.untilSecond) continue;
    const previous = state.waveSpawnCounts[wave.id] ?? 0;
    const due = Math.floor((state.elapsedSeconds - wave.fromSecond) / wave.spawnEverySeconds) + 1;
    const active = state.enemies.filter((enemy) => enemy.kind === wave.enemy).length;
    const minimum = Math.max(0, wave.minimumAlive - active);
    const scheduled = Math.max(0, due - previous);
    const toSpawn = Math.min(MAX_SPAWN_PER_TICK, Math.max(scheduled, minimum), Math.max(0, wave.maximumAlive - active), MAX_ENEMIES - state.enemies.length);
    for (let index = 0; index < toSpawn; index += 1) addEnemy(state, wave.enemy);
    state.waveSpawnCounts[wave.id] = previous + toSpawn;
  }
}

function startFinale(state: RunState): void {
  if (state.stageFinaleStarted) return;
  const stage = stageDefinition(state);
  if (!stage || state.elapsedSeconds < stage.durationSeconds) return;
  state.stageFinaleStarted = true;
  state.bossSpawned = true;
  // The authored end-stage event clears the regular horde before the final
  // threat arrives, matching the readable finale sequence of the reference
  // game and preventing stale wave enemies from delaying completion.
  state.enemies = [];
  addEnemy(state, stage.boss);
}

function makeCardPool(state: RunState): UpgradeCard[] {
  const cards: UpgradeCard[] = [];
  for (const weapon of state.weapons) {
    const definition = weaponDefinition(weapon.id);
    if (definition && weapon.level < definition.maxLevel) cards.push({ id: `weapon-upgrade:${weapon.id}`, label: `Upgrade ${definition.name}`, kind: 'weapon', target: weapon.id });
  }
  if (state.weapons.length < MAX_WEAPON_SLOTS) {
    for (const id of BASE_WEAPON_IDS) {
      if (state.weapons.some((weapon) => weapon.id === id)) continue;
      const definition = weaponDefinition(id);
      if (definition) cards.push({ id: `weapon:${id}`, label: definition.name, kind: 'new-weapon', target: id });
    }
  }
  for (const [id, rank] of Object.entries(state.passives)) {
    const definition = passiveDefinition(id);
    if (definition && rank < definition.maxLevel) cards.push({ id: `passive-upgrade:${id}`, label: `Upgrade ${definition.name}`, kind: 'passive', target: id });
  }
  if (Object.keys(state.passives).length < MAX_PASSIVE_SLOTS) {
    for (const definition of MVP_REGISTRY.passives) {
      if (!state.passives[definition.id]) cards.push({ id: `passive:${definition.id}`, label: definition.name, kind: 'new-passive', target: definition.id });
    }
  }
  cards.push({ id: 'heal', label: 'Restore 25% health', kind: 'heal', target: 'heal' });
  return cards.filter((card) => !state.bannedUpgradeIds.includes(card.id));
}

function makeCards(state: RunState): UpgradeCard[] {
  const pool = shuffle(state, makeCardPool(state));
  const selected: UpgradeCard[] = [];
  for (const card of pool) {
    if (selected.some((candidate) => candidate.id === card.id)) continue;
    selected.push(card);
    if (selected.length === 3) break;
  }
  while (selected.length < 3) selected.push({ id: `heal:${selected.length}`, label: 'Restore 25% health', kind: 'heal', target: 'heal' });
  return selected;
}

function grantXp(state: RunState, amount: number): void {
  state.xp += Math.max(0, amount) * (1 + state.hero.stats.growth);
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

function awardGold(state: RunState, source: 'enemyKills' | 'bossChest' | 'overflow', amount: number): void {
  if (amount <= 0) return;
  state.gold += amount;
  state.goldBreakdown[source] += amount;
}

function isXpPickup(pickup: PickupState): boolean {
  return pickup.kind === 'xp-shard' || pickup.kind === 'xp-crystal' || pickup.kind === 'xp-orb' || pickup.kind === 'token-core';
}

function pickupKindForXp(value: number): PickupState['kind'] {
  if (value >= 10) return 'xp-orb';
  if (value >= 3) return 'xp-crystal';
  return 'xp-shard';
}

function dropEnemyPickup(state: RunState, enemy: EnemyState): void {
  const definition = enemyDefinition(enemy.kind);
  if (!definition || enemy.kind === 'timeout_reaper') return;
  const value = Math.max(0, definition.xp);
  state.pickups.push({ id: state.nextEntityId++, kind: pickupKindForXp(value), x: enemy.x, y: enemy.y, value });
}

function condenseXpPickups(state: RunState): void {
  const xpPickups = state.pickups.filter(isXpPickup);
  if (xpPickups.length <= MAX_XP_PICKUPS) return;
  const retained = xpPickups.slice(-(MAX_XP_PICKUPS - 1));
  const retainedIds = new Set(retained.map((pickup) => pickup.id));
  const condensedValue = xpPickups.filter((pickup) => !retainedIds.has(pickup.id)).reduce((sum, pickup) => sum + pickup.value, 0);
  state.pickups = state.pickups.filter((pickup) => !isXpPickup(pickup) || retainedIds.has(pickup.id));
  state.pickups.push({ id: state.nextEntityId++, kind: 'token-core', x: state.hero.x + MAP_LIMIT, y: state.hero.y, value: condensedValue });
}

function eligibleEvolution(state: RunState): { weapon: WeaponState; resultId: string } | undefined {
  if (state.elapsedSeconds < EVOLUTION_MIN_STAGE_SECONDS) return undefined;
  for (const weapon of state.weapons.slice().sort((a, b) => a.id.localeCompare(b.id))) {
    const definition = weaponDefinition(weapon.id);
    if (!definition?.evolution || weapon.level < definition.maxLevel) continue;
    if ((state.passives[definition.evolution.passiveId] ?? 0) < 1) continue;
    return { weapon, resultId: definition.evolution.resultId };
  }
  return undefined;
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
  const weapon = state.weapons.slice().sort((a, b) => a.id.localeCompare(b.id)).find((candidate) => {
    const definition = weaponDefinition(candidate.id);
    return definition !== undefined && candidate.level < definition.maxLevel;
  });
  if (weapon) {
    weapon.level += 1;
    const reward = `chest:weapon:${weapon.id}:level-${weapon.level}`;
    state.treasureHistory.push(reward);
    state.upgradeHistory.push(reward);
    return reward;
  }
  const passive = Object.keys(state.passives).sort().find((id) => {
    const definition = passiveDefinition(id);
    return definition !== undefined && state.passives[id]! < definition.maxLevel;
  });
  if (passive) {
    state.passives[passive] = (state.passives[passive] ?? 0) + 1;
    recalculateStats(state);
    const reward = `chest:passive:${passive}:rank-${state.passives[passive]}`;
    state.treasureHistory.push(reward);
    state.upgradeHistory.push(reward);
    return reward;
  }
  state.treasureHistory.push('chest:no-eligible-item');
  return 'chest:no-eligible-item';
}

export function openTreasureChest(state: RunState): string {
  if (state.bossRewardClaimed) return state.treasureHistory.at(-1) ?? 'chest:no-eligible-item';
  if (!state.bossRewardClaimed) {
    state.bossRewardClaimed = true;
    awardGold(state, 'bossChest', 100);
  }
  return resolveChestReward(state);
}

function selectedUpgrades(state: RunState): string[] {
  return [...state.upgradeHistory];
}

export function finishRun(state: RunState, outcome: 'victory' | 'defeat'): void {
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
    gold: state.gold,
    goldBreakdown: { ...state.goldBreakdown },
    enemiesSpawned: state.enemiesSpawned,
    enemiesDefeated: state.enemiesDefeated,
    damageByWeapon: { ...state.damageByWeapon },
    upgrades: selectedUpgrades(state),
    treasureRewards: [...state.treasureHistory]
  };
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
    phase: 'dungeon', heroId, stageId, stageClockScale: clockScale, seed: seed >>> 0, elapsedSeconds: 0, level: 1, xp: 0, totalTokens: 0, gold: 0,
    goldBreakdown: { enemyKills: 0, bossChest: 0, overflow: 0 }, tokenSource: 'synthetic', tokenAccuracy: 'exact', nextEntityId: 1,
    hero: { x: 0, y: 0, stats: cloneStats(baseStats), baseStats, invulnerabilityRemaining: 0 }, weapons: [{ id: config.startingWeaponId, level: 1, cooldownRemaining: 0 }],
    passives: {}, upgradeHistory: [], enemies: [], projectiles: [], pickups: [], pendingCards: [], pendingLevelUps: 0, rerollsRemaining: metaActionCharges(metaUpgrades).rerolls, skipsRemaining: metaActionCharges(metaUpgrades).skips, banishesRemaining: metaActionCharges(metaUpgrades).banishes, bannedUpgradeIds: [], enemiesSpawned: 0, enemiesDefeated: 0,
    bossSpawned: false, stageFinaleStarted: false, waveSpawnCounts: {}, bossRewardClaimed: false, damageByWeapon: {}, treasureHistory: [], metaUpgrades: { ...metaUpgrades },
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
  state.pendingTelemetry = { outputTokens: state.pendingTelemetry.outputTokens + outputTokens, inputTokens: state.pendingTelemetry.inputTokens + inputTokens, cacheTokens: state.pendingTelemetry.cacheTokens + cacheTokens, isAgentActive: state.pendingTelemetry.isAgentActive || input.isAgentActive === true || input.tokensPerSecond > 0 };
  return state;
}

function resolveCard(state: RunState, cardId: string): UpgradeCard {
  const direct = state.pendingCards.find((candidate) => candidate.id === cardId);
  if (direct) return direct;
  const alias = cardId === 'weapon-upgrade' ? state.pendingCards.find((candidate) => candidate.kind === 'weapon') : cardId === 'power-gauntlets' ? state.pendingCards.find((candidate) => candidate.target === 'power_gauntlets') : undefined;
  if (alias) return alias;
  throw new Error(`Unknown upgrade card: ${cardId}`);
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
    if (state.weapons.length >= MAX_WEAPON_SLOTS || state.weapons.some((weapon) => weapon.id === card.target)) throw new Error('Weapon slot is unavailable');
    state.weapons.push({ id: card.target, level: 1, cooldownRemaining: 0 });
  } else if (card.kind === 'passive' || card.kind === 'new-passive') {
    const definition = passiveDefinition(card.target);
    if (!definition) throw new Error('Passive is not registered');
    const current = state.passives[card.target] ?? 0;
    if (card.kind === 'new-passive' && current > 0) throw new Error('Passive is already equipped');
    if (card.kind === 'new-passive' && Object.keys(state.passives).length >= MAX_PASSIVE_SLOTS) throw new Error('Passive slot is unavailable');
    if (current >= definition.maxLevel) throw new Error('Passive is already at maximum level');
    state.passives[card.target] = current + 1;
    recalculateStats(state);
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
    state.phase = 'dungeon';
  }
  return state;
}

export function rerollLevelUp(state: RunState): RunState {
  if (state.phase !== 'level-up' || state.rerollsRemaining <= 0) throw new Error('Reroll is unavailable');
  state.rerollsRemaining -= 1;
  state.pendingCards = makeCards(state);
  state.upgradeHistory.push('action:reroll');
  return state;
}

export function skipLevelUp(state: RunState): RunState {
  if (state.phase !== 'level-up' || state.skipsRemaining <= 0) throw new Error('Skip is unavailable');
  state.skipsRemaining -= 1;
  state.pendingLevelUps = Math.max(0, state.pendingLevelUps - 1);
  state.upgradeHistory.push('action:skip');
  if (state.pendingLevelUps > 0) state.pendingCards = makeCards(state);
  else { state.pendingCards = []; state.phase = 'dungeon'; }
  return state;
}

export function banishLevelUpCard(state: RunState, cardId: string): RunState {
  if (state.phase !== 'level-up' || state.banishesRemaining <= 0) throw new Error('Banish is unavailable');
  if (!state.pendingCards.some((card) => card.id === cardId)) throw new Error('Unknown level-up card');
  state.banishesRemaining -= 1;
  state.bannedUpgradeIds.push(cardId);
  state.pendingCards = makeCards(state);
  state.upgradeHistory.push(`action:banish:${cardId}`);
  return state;
}

function targetFor(state: RunState): EnemyState | undefined {
  return state.enemies.slice().sort((a, b) => distance(a, state.hero) - distance(b, state.hero))[0];
}

function projectileSpeed(stats: WeaponLevelStats, combat: CombatStats): number {
  const baseSpeed = stats.speed <= 2 ? 80 * stats.speed : stats.speed;
  return calculateProjectileSpeed(baseSpeed, combat);
}

function createProjectile(state: RunState, weapon: WeaponState, stats: WeaponLevelStats, angle: number): void {
  if (state.projectiles.length >= MAX_PROJECTILES) return;
  const speed = projectileSpeed(stats, state.hero.stats);
  const projectile: ProjectileState = { id: state.nextEntityId++, weaponId: weapon.id, x: state.hero.x, y: state.hero.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, damage: calculateDamage(stats.damage, state.hero.stats), area: Math.max(3, stats.area * 5), remainingPierce: Math.max(0, Math.floor(stats.pierce)), remainingSeconds: Math.max(0.05, stats.duration), knockback: Math.max(0, stats.knockback), hitEnemyIds: [] };
  state.projectiles.push(projectile);
}

function applyHit(state: RunState, projectile: ProjectileState, enemy: EnemyState): void {
  if (projectile.hitEnemyIds.includes(enemy.id)) return;
  projectile.hitEnemyIds.push(enemy.id);
  enemy.hp -= projectile.damage;
  state.damageByWeapon[projectile.weaponId] = (state.damageByWeapon[projectile.weaponId] ?? 0) + projectile.damage;
  if (projectile.knockback > 0) {
    const dx = enemy.x - state.hero.x;
    const dy = enemy.y - state.hero.y;
    const length = Math.hypot(dx, dy) || 1;
    enemy.x += (dx / length) * projectile.knockback;
    enemy.y += (dy / length) * projectile.knockback;
  }
  projectile.remainingPierce -= 1;
}

function fireWeapon(state: RunState, weapon: WeaponState): void {
  const definition = weaponDefinition(weapon.id);
  if (!definition) return;
  const stats = weaponStats(state, weapon);
  const target = targetFor(state);
  const targetAngle = target ? Math.atan2(target.y - state.hero.y, target.x - state.hero.x) : nextRandom(state) * Math.PI * 2;
  const amount = Math.max(1, Math.floor(stats.amount * Math.max(1, state.hero.stats.amount)));
  if (definition.pattern === 'aura') {
    const radius = stats.area * (1 + (state.hero.stats.area ?? 0));
    const auraDamage = calculateDamage(stats.damage, state.hero.stats);
    for (const enemy of state.enemies) {
      if (distance(enemy, state.hero) > radius) continue;
      enemy.hp -= auraDamage;
      state.damageByWeapon[weapon.id] = (state.damageByWeapon[weapon.id] ?? 0) + auraDamage;
      const dx = enemy.x - state.hero.x;
      const dy = enemy.y - state.hero.y;
      const length = Math.hypot(dx, dy) || 1;
      enemy.x += (dx / length) * stats.knockback;
      enemy.y += (dy / length) * stats.knockback;
    }
  } else {
    const spread = definition.pattern === 'fan' ? 0.2 : 0;
    for (let index = 0; index < amount; index += 1) {
      const offset = amount === 1 ? 0 : (index - (amount - 1) / 2) * spread;
      createProjectile(state, weapon, stats, targetAngle + offset);
    }
  }
  weapon.cooldownRemaining = calculateCooldown(stats.cooldown, state.hero.stats);
}

function updateProjectiles(state: RunState, delta: number): void {
  const survivors: ProjectileState[] = [];
  for (const projectile of state.projectiles) {
    // Resolve a hit at the launch/current position as well as along the
    // movement step. This matters when a target reaches the hero between
    // weapon ticks: the projectile should still be able to hit it instead of
    // always starting outside the target's collision radius.
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0 || distance(projectile, enemy) > projectile.area) continue;
      applyHit(state, projectile, enemy);
      if (projectile.remainingPierce < 0) break;
    }
    if (projectile.remainingPierce < 0) continue;
    projectile.x += projectile.vx * delta;
    projectile.y += projectile.vy * delta;
    projectile.remainingSeconds -= delta;
    const definition = weaponDefinition(projectile.weaponId);
    if (definition?.pattern === 'ricochet') {
      if (projectile.x < -MAP_LIMIT || projectile.x > MAP_LIMIT) { projectile.vx *= -1; projectile.x = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, projectile.x)); }
      if (projectile.y < -MAP_LIMIT || projectile.y > MAP_LIMIT) { projectile.vy *= -1; projectile.y = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, projectile.y)); }
    }
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0 || distance(projectile, enemy) > projectile.area) continue;
      applyHit(state, projectile, enemy);
      if (projectile.remainingPierce < 0) break;
    }
    const inBounds = definition?.pattern === 'ricochet' || (Math.abs(projectile.x) <= MAP_LIMIT + 20 && Math.abs(projectile.y) <= MAP_LIMIT + 20);
    if (projectile.remainingSeconds > 0 && projectile.remainingPierce >= 0 && inBounds) survivors.push(projectile);
  }
  state.projectiles = survivors.slice(0, MAX_PROJECTILES);
}

export function tick(state: RunState, deltaSeconds: number, tokensPerSecond = 0): RunState {
  void tokensPerSecond;
  if (state.phase !== 'dungeon' || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return state;
  const delta = Math.min(deltaSeconds, 0.25);
  const telemetry = state.pendingTelemetry;
  state.pendingTelemetry = { outputTokens: 0, inputTokens: 0, cacheTokens: 0, isAgentActive: false };
  const batteryResult = BatteryEngine.processTick(delta, state.battery, telemetry.isAgentActive, BatteryEngine.calculateChargedTokens(telemetry));
  state.battery = batteryResult.newState;
  state.batteryCharging = batteryResult.isCharging;
  const freshOverflowIds = new Set<number>();
  if (batteryResult.goldSpawned > 0) {
    const id = state.nextEntityId++;
    freshOverflowIds.add(id);
    state.pickups.push({ id, kind: 'gold-coin', x: state.hero.x, y: state.hero.y, value: batteryResult.goldSpawned });
  }
  if (state.battery.isLockedOut) return state;
  state.elapsedSeconds += delta * state.stageClockScale;
  scheduleWaves(state);
  startFinale(state);

  state.hero.invulnerabilityRemaining = Math.max(0, state.hero.invulnerabilityRemaining - delta);
  if ((state.hero.stats.recovery ?? 0) > 0) state.hero.stats.hp = Math.min(state.hero.stats.maxHp, state.hero.stats.hp + (state.hero.stats.recovery ?? 0) * delta);
  for (const enemy of state.enemies) {
    if ((enemy.frozenRemaining ?? 0) > 0) {
      enemy.frozenRemaining = Math.max(0, (enemy.frozenRemaining ?? 0) - delta);
      continue;
    }
    const dx = state.hero.x - enemy.x;
    const dy = state.hero.y - enemy.y;
    const length = Math.hypot(dx, dy) || 1;
    enemy.x += (dx / length) * enemy.speed * delta;
    enemy.y += (dy / length) * enemy.speed * delta;
    if (distance(enemy, state.hero) < HERO_CONTACT_RADIUS && state.hero.invulnerabilityRemaining <= 0) {
      state.hero.stats.hp -= Math.max(0, enemy.damage - state.hero.stats.armor);
      state.hero.invulnerabilityRemaining = HERO_INVULNERABILITY_SECONDS;
    }
  }
  if (state.hero.stats.hp <= 0) {
    finishRun(state, 'defeat');
    return state;
  }

  for (const weapon of state.weapons) {
    weapon.cooldownRemaining -= delta;
    if (weapon.cooldownRemaining <= 0) fireWeapon(state, weapon);
  }
  updateProjectiles(state, delta);

  const dead = state.enemies.filter((enemy) => enemy.hp <= 0);
  for (const enemy of dead) {
    state.enemiesDefeated += 1;
    if (enemy.isBoss && enemy.kind !== 'timeout_reaper') state.pickups.push({ id: state.nextEntityId++, kind: 'gold-chest', x: enemy.x, y: enemy.y, value: 100 });
    else dropEnemyPickup(state, enemy);
  }
  state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
  condenseXpPickups(state);
  const collected: PickupState[] = [];
  for (const pickup of [...state.pickups]) {
    if (freshOverflowIds.has(pickup.id)) continue;
    if (collected.includes(pickup)) continue;
    if (distance(pickup, state.hero) > state.hero.stats.magnet) continue;
    if (pickup.kind === 'gold-chest') {
      openTreasureChest(state);
    } else if (pickup.kind === 'gold-coin') {
      awardGold(state, 'overflow', pickup.value);
    } else if (pickup.kind === 'gold-sack') {
      awardGold(state, 'enemyKills', pickup.value);
    } else if (pickup.kind === 'gold-hoard') {
      awardGold(state, 'bossChest', pickup.value);
    } else if (isXpPickup(pickup)) {
      grantXp(state, pickup.value);
      awardGold(state, 'enemyKills', pickup.value);
    } else if (pickup.kind === 'mana-roast') {
      state.hero.stats.hp = Math.min(state.hero.stats.maxHp, state.hero.stats.hp + 30);
    } else if (pickup.kind === 'mana-magnet') {
      for (const gem of state.pickups.filter(isXpPickup)) {
        grantXp(state, gem.value);
        awardGold(state, 'enemyKills', gem.value);
        collected.push(gem);
      }
    } else if (pickup.kind === 'chrono-stasis') {
      for (const enemy of state.enemies) enemy.frozenRemaining = 10;
    } else if (pickup.kind === 'arcane-cleanser') {
      for (const enemy of state.enemies) {
        state.enemiesDefeated += 1;
        dropEnemyPickup(state, enemy);
      }
      state.enemies = [];
    }
    collected.push(pickup);
  }
  state.pickups = state.pickups.filter((pickup) => !collected.includes(pickup));
  if (state.phase === 'dungeon' && (state.stageFinaleStarted || state.bossSpawned) && !state.enemies.some((enemy) => enemy.isBoss) && !state.pickups.some((pickup) => pickup.kind === 'gold-chest')) {
    finishRun(state, 'victory');
  }
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
  return { weapons: MAX_WEAPON_SLOTS, passives: MAX_PASSIVE_SLOTS };
}
