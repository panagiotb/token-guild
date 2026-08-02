import type { UpgradeCard, RunState } from '../game/types';
import { passiveDefinition, passiveEffectsAtRank, weaponDefinition } from '../game/content';

function formatValue(value: number, stat: string): string {
  if (stat === 'might' || stat === 'cooldown' || stat === 'area' || stat === 'speed' || stat === 'duration' || stat === 'growth' || stat === 'greed' || stat === 'curse' || stat === 'allStats') return `+${Math.round(value * 100)}% ${stat === 'allStats' ? 'all stats' : stat}`;
  if (stat === 'maxHealth') return `+${Math.round(value * 100)}% max health`;
  if (stat === 'recovery') return `+${value} recovery`;
  if (stat === 'magnet') return `+${Math.round(value * 100)}% pickup range`;
  if (stat === 'amount') return `+${value} projectile`;
  if (stat === 'armor') return `+${value} armor`;
  if (stat === 'revival') return `+${value} revival`;
  return `+${value} ${stat}`;
}

function passiveEffect(id: string, rank: number): string {
  const definition = passiveDefinition(id);
  if (!definition) return 'No registered passive effect';
  const effects = passiveEffectsAtRank(definition, rank);
  if (effects.length === 0) return 'No registered passive effect';
  const totals = new Map<string, number>();
  for (const effect of effects) totals.set(effect.stat, (totals.get(effect.stat) ?? 0) + effect.value);
  return [...totals.entries()].map(([stat, value]) => formatValue(value, stat)).join('; ');
}

function formatWeaponNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function weaponEffect(id: string, level: number): string {
  const definition = weaponDefinition(id);
  const stats = definition?.levels[Math.max(0, Math.min(definition.maxLevel, level) - 1)];
  if (!definition || !stats) return 'No registered weapon effect';
  const projectileLabel = `${stats.amount} projectile${stats.amount === 1 ? '' : 's'}`;
  const projectileInterval = stats.projectileInterval ?? definition.projectileInterval;
  const sequenceLabel = projectileInterval > 0 && stats.amount > 1
    ? ` at ${formatWeaponNumber(projectileInterval)}s intervals`
    : '';
  const pierceLabel = stats.pierce > 0 ? `, ${stats.pierce} pierce` : '';
  return `Deals ${formatWeaponNumber(stats.damage)} damage every ${formatWeaponNumber(stats.cooldown)}s with ${projectileLabel}${sequenceLabel}${pierceLabel} (${definition.pattern}).`;
}

function weaponUpgradeEffect(id: string, currentLevel: number): string {
  const definition = weaponDefinition(id);
  if (!definition) return 'No registered weapon effect';
  const nextLevel = Math.min(definition.maxLevel, currentLevel + 1);
  const previous = definition.levels[Math.max(0, currentLevel - 1)];
  const next = definition.levels[nextLevel - 1];
  if (!previous || !next) return weaponEffect(id, nextLevel);
  const changes: string[] = [];
  if (next.damage !== previous.damage) changes.push(`damage ${formatWeaponNumber(previous.damage)}→${formatWeaponNumber(next.damage)}`);
  if (next.amount !== previous.amount) changes.push(`${formatWeaponNumber(next.amount)} projectile${next.amount === 1 ? '' : 's'}`);
  if (next.cooldown !== previous.cooldown) changes.push(`cooldown ${formatWeaponNumber(previous.cooldown)}→${formatWeaponNumber(next.cooldown)}s`);
  if (next.area !== previous.area) changes.push(`area ${formatWeaponNumber(next.area)}`);
  if (next.speed !== previous.speed) changes.push(`speed ${formatWeaponNumber(next.speed)}`);
  if (next.duration !== previous.duration) changes.push(`duration ${formatWeaponNumber(next.duration)}s`);
  if (next.pierce !== previous.pierce) changes.push(`${formatWeaponNumber(next.pierce)} pierce`);
  if (next.knockback !== previous.knockback) changes.push(`knockback ${formatWeaponNumber(next.knockback)}`);
  // Keep the copy ASCII-safe in the webview. Older content was authored with
  // a corrupted arrow glyph; normalizing the change fragments here prevents
  // that artifact from reaching the player while preserving exact values.
  const changeCopy = Array.from(changes.join(', '), (character) => character.charCodeAt(0) <= 127 ? character : ' to ').join('');
  const projectileInterval = next.projectileInterval ?? definition.projectileInterval;
  const sequenceCopy = projectileInterval > 0 && next.amount > 1
    ? `; releases at ${formatWeaponNumber(projectileInterval)}s intervals`
    : '';
  return changes.length > 0 ? `Level ${nextLevel}: ${changeCopy}${sequenceCopy}.` : `Level ${nextLevel}: ${weaponEffect(id, nextLevel)}`;
}

export function describeUpgrade(card: UpgradeCard, run: RunState): string {
  if (card.kind === 'gold') return 'Adds 10 base gold to the run; Greed applies and the result is recorded in the level-up ledger.';
  if (card.id === 'floor-chicken') return 'Restore 25% of maximum health immediately.';
  if (card.kind === 'heal') return 'Restore 25% of maximum health immediately.';
  if (card.kind === 'new-weapon') return `Adds ${card.label} as a level 1 automatic attack. ${weaponEffect(card.target, 1)}`;
  if (card.kind === 'weapon') {
    const weapon = run.weapons.find((entry) => entry.id === card.target);
    const nextLevel = (weapon?.level ?? 0) + 1;
    return `Raises ${card.label} to level ${nextLevel}. ${weaponUpgradeEffect(card.target, weapon?.level ?? 0)}`;
  }
  if (card.kind === 'new-passive') return `Adds ${card.label}: ${passiveEffect(card.target, 1)}.`;
  const passive = run.passives[card.target] ?? 0;
  return `Raises ${card.label} to rank ${passive + 1}: ${passiveEffect(card.target, passive + 1)}.`;
}
