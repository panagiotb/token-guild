import { calculateBerserkSpeed, calculateCooldown, calculateDamage, distance, getXpRequiredForLevel } from './math';
import type { CombatStats, HeroId, PickupState, RunState, TokenInput, UpgradeCard } from './types';

const BOSS_TIME_SECONDS = 30;
const MAX_ENEMIES = 60;
const WEAPON_DAMAGE: Record<string, number> = {
  broadsword: 20,
  arcane_bolt: 10,
  throwing_daggers: 7,
  bouncing_arrow: 10,
  aegis_barrier: 5,
  bone_throw: 8,
  excalibur: 35,
  archmage_staff: 24,
  sanctuary: 18
};
const WEAPON_COOLDOWN: Record<string, number> = {
  broadsword: 1.35,
  arcane_bolt: 1,
  throwing_daggers: 1,
  bouncing_arrow: 3,
  aegis_barrier: 1,
  bone_throw: 1.4,
  excalibur: 1,
  archmage_staff: 0.75,
  sanctuary: 0.8
};

const HEROES: Record<HeroId, { stats: CombatStats; weapon: string }> = {
  warrior: { stats: { hp: 100, maxHp: 100, armor: 1, moveSpeed: 40, might: 0, area: 0, speed: 0, cooldown: 0, amount: 1, magnet: 32, growth: 0 }, weapon: 'broadsword' },
  wizard: { stats: { hp: 100, maxHp: 100, armor: 0, moveSpeed: 40, might: 0, area: 0, speed: 0, cooldown: 0, amount: 1, magnet: 32, growth: 0.1 }, weapon: 'arcane_bolt' },
  rogue: { stats: { hp: 120, maxHp: 120, armor: 0, moveSpeed: 42, might: 0, area: 0, speed: 0, cooldown: 0, amount: 2, magnet: 32, growth: 0 }, weapon: 'throwing_daggers' },
  ranger: { stats: { hp: 100, maxHp: 100, armor: 0, moveSpeed: 40, might: 0, area: 0, speed: 0.1, cooldown: 0, amount: 1, magnet: 32, growth: 0 }, weapon: 'bouncing_arrow' },
  paladin: { stats: { hp: 110, maxHp: 110, armor: 2, moveSpeed: 35, might: 0, area: 0, speed: 0, cooldown: 0, amount: 1, magnet: 40, growth: 0 }, weapon: 'aegis_barrier' },
  necromancer: { stats: { hp: 100, maxHp: 100, armor: 0, moveSpeed: 40, might: 0, area: 0, speed: 0, cooldown: 0, amount: 1, magnet: 32, growth: 0 }, weapon: 'bone_throw' }
};
const HERO_NAMES: Record<HeroId, string> = { warrior: 'Warrior', wizard: 'Wizard', rogue: 'Rogue', ranger: 'Ranger', paladin: 'Paladin', necromancer: 'Necromancer' };

function cloneStats(stats: CombatStats): CombatStats {
  return { ...stats };
}

function nextRandom(state: RunState): number {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 0x100000000;
}

function addEnemy(state: RunState, isBoss = false): void {
  if (!isBoss && state.enemies.length >= MAX_ENEMIES) return;
  const angle = nextRandom(state) * Math.PI * 2;
  const radius = isBoss ? 140 : 90 + nextRandom(state) * 40;
  const kind = isBoss ? 'terminal_exit_boss' : (['syntax_specter', 'bug_bat', 'memory_golem'] as const)[Math.floor(nextRandom(state) * 3)] ?? 'syntax_specter';
  const maxHp = isBoss ? 120 : kind === 'memory_golem' ? 55 : kind === 'bug_bat' ? 18 : 28;
  state.enemies.push({ id: state.nextEntityId++, kind, x: state.hero.x + Math.cos(angle) * radius, y: state.hero.y + Math.sin(angle) * radius, hp: maxHp, maxHp, speed: isBoss ? 8 : kind === 'bug_bat' ? 18 : 10, damage: isBoss ? 4 : 1, isBoss, isElite: !isBoss && kind === 'memory_golem' });
  state.enemiesSpawned += 1;
}

function makeCards(state: RunState): UpgradeCard[] {
  const cards: UpgradeCard[] = [
    { id: 'weapon-upgrade', label: 'Upgrade weapon', kind: 'weapon', target: state.weapons[0]?.id ?? 'broadsword' },
    { id: 'power-gauntlets', label: 'Power Gauntlets', kind: 'passive', target: 'power_gauntlets' },
    { id: 'heal', label: 'Restore 25% health', kind: 'heal', target: 'heal' }
  ];
  return cards;
}

function grantXp(state: RunState, amount: number): void {
  state.xp += Math.max(0, amount) * (1 + state.hero.stats.growth);
  while (state.xp >= getXpRequiredForLevel(state.level)) {
    state.xp -= getXpRequiredForLevel(state.level);
    state.level += 1;
    state.pendingCards = makeCards(state);
    state.phase = 'level-up';
    break;
  }
}

function awardGold(state: RunState, source: 'enemyKills' | 'bossChest', amount: number): void {
  if (amount <= 0) return;
  state.gold += amount;
  state.goldBreakdown[source] += amount;
}

export function grantBossReward(state: RunState): void {
  if (state.bossRewardClaimed) return;
  state.bossRewardClaimed = true;
  awardGold(state, 'bossChest', 100);
}

function selectedUpgrades(state: RunState): string[] {
  return [...state.upgradeHistory];
}

export function finishRun(state: RunState, outcome: 'victory' | 'defeat'): void {
  state.phase = 'summary';
  state.outcome = outcome;
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
    upgrades: selectedUpgrades(state)
  };
}

export function createRun(heroId: HeroId, seed = 1, metaUpgrades: Readonly<Record<string, number>> = {}): RunState {
  const config = HEROES[heroId];
  if (!config) throw new Error(`Unknown hero: ${heroId}`);
  const stats = cloneStats(config.stats);
  stats.might += (metaUpgrades.might ?? 0) * 0.05;
  return { phase: 'dungeon', heroId, seed: seed >>> 0, elapsedSeconds: 0, level: 1, xp: 0, totalTokens: 0, gold: 0, goldBreakdown: { enemyKills: 0, bossChest: 0 }, tokenSource: 'synthetic', tokenAccuracy: 'exact', nextEntityId: 1, hero: { x: 0, y: 0, stats }, weapons: [{ id: config.weapon, level: 1, cooldownRemaining: 0 }], passives: {}, upgradeHistory: [], enemies: [], pickups: [], pendingCards: [], enemiesSpawned: 0, enemiesDefeated: 0, bossSpawned: false, bossRewardClaimed: false, powerChargeReady: false, hazardsTriggered: 0, damageByWeapon: {} };
}

export function applyTokenInput(state: RunState, input: TokenInput): RunState {
  if (state.phase !== 'dungeon' || !Number.isFinite(input.count) || input.count < 0) return state;
  state.totalTokens += input.count;
  grantXp(state, input.count);
  return state;
}

export function chooseUpgrade(state: RunState, cardId: string): RunState {
  if (state.phase !== 'level-up') return state;
  const card = state.pendingCards.find((candidate) => candidate.id === cardId);
  if (!card) throw new Error(`Unknown upgrade card: ${cardId}`);
  if (card.kind === 'weapon') {
    const weapon = state.weapons.find((candidate) => candidate.id === card.target);
    if (weapon) {
      weapon.level = Math.min(8, weapon.level + 1);
      state.upgradeHistory.push(`${weapon.id}:level-${weapon.level}`);
    }
  } else if (card.kind === 'passive') {
    state.passives[card.target] = Math.min(5, (state.passives[card.target] ?? 0) + 1);
    if (card.target === 'power_gauntlets') state.hero.stats.might += 0.1;
    state.upgradeHistory.push(card.target);
  } else {
    state.hero.stats.hp = Math.min(state.hero.stats.maxHp, state.hero.stats.hp + state.hero.stats.maxHp * 0.25);
    state.upgradeHistory.push(card.id);
  }
  state.pendingCards = [];
  state.phase = 'dungeon';
  return state;
}

export function tick(state: RunState, deltaSeconds: number, tokensPerSecond = 0): RunState {
  if (state.phase !== 'dungeon' || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return state;
  const delta = Math.min(deltaSeconds, 0.25);
  state.elapsedSeconds += delta;
  if (!state.bossSpawned && state.elapsedSeconds >= BOSS_TIME_SECONDS) {
    addEnemy(state, true);
    state.bossSpawned = true;
  } else if (!state.bossSpawned && state.elapsedSeconds >= 1 && Math.floor(state.elapsedSeconds) !== Math.floor(state.elapsedSeconds - delta)) {
    addEnemy(state);
  }

  for (const enemy of state.enemies) {
    const dx = state.hero.x - enemy.x;
    const dy = state.hero.y - enemy.y;
    const length = Math.hypot(dx, dy) || 1;
    enemy.x += (dx / length) * enemy.speed * delta;
    enemy.y += (dy / length) * enemy.speed * delta;
    if (distance(enemy, state.hero) < 8) state.hero.stats.hp -= Math.max(0, enemy.damage - state.hero.stats.armor) * delta;
  }
  if (state.hero.stats.hp <= 0) {
    finishRun(state, 'defeat');
    return state;
  }

  const weapon = state.weapons[0];
  if (weapon) {
    weapon.cooldownRemaining -= delta;
    if (weapon.cooldownRemaining <= 0) {
      const target = state.enemies.slice().sort((a, b) => distance(a, state.hero) - distance(b, state.hero))[0];
      if (target) {
        const damage = calculateDamage(WEAPON_DAMAGE[weapon.id] ?? 5, state.hero.stats, tokensPerSecond) * Math.max(1, state.hero.stats.amount);
        target.hp -= damage;
        state.damageByWeapon[weapon.id] = (state.damageByWeapon[weapon.id] ?? 0) + damage;
        weapon.cooldownRemaining = calculateCooldown(WEAPON_COOLDOWN[weapon.id] ?? 1, state.hero.stats) / (tokensPerSecond >= 40 ? 1.5 : 1);
      }
    }
  }

  const dead = state.enemies.filter((enemy) => enemy.hp <= 0);
  for (const enemy of dead) {
    state.enemiesDefeated += 1;
    if (enemy.isBoss) {
      grantBossReward(state);
      // The marker communicates the boss reward source; the reward was already
      // claimed at defeat, so pickup collection must not credit it again.
      state.pickups.push({ id: state.nextEntityId++, kind: 'gold-chest', x: enemy.x, y: enemy.y, value: 0 });
    } else {
      awardGold(state, 'enemyKills', 1);
      state.pickups.push({ id: state.nextEntityId++, kind: 'xp-shard', x: enemy.x, y: enemy.y, value: 1 });
    }
  }
  state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
  if (state.bossSpawned && !state.enemies.some((enemy) => enemy.isBoss)) {
    finishRun(state, 'victory');
    return state;
  }

  const collected: PickupState[] = [];
  for (const pickup of state.pickups) {
    if (distance(pickup, state.hero) <= state.hero.stats.magnet) {
      if (pickup.kind !== 'gold-chest') grantXp(state, pickup.value);
      collected.push(pickup);
    }
  }
  state.pickups = state.pickups.filter((pickup) => !collected.includes(pickup));
  return state;
}

export function getBossTimeSeconds(): number {
  return BOSS_TIME_SECONDS;
}

export function getHeroMoveSpeed(state: RunState, tokensPerSecond: number): number {
  return calculateBerserkSpeed(state.hero.stats.moveSpeed, tokensPerSecond);
}
