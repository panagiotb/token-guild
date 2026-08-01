import progression from './data/progression.json';
import type { CombatStats } from './types';

/** XP required to move from `level` to `level + 1` in the locked P0 table. */
export function getXpRequiredForLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1) throw new Error('Level must be a positive integer');
  const tableValue = progression.xpToNextLevel[level - 1];
  if (tableValue !== undefined) return tableValue;
  const multiplier = Math.min(8, 5 + 1.5 * Math.floor(level / 20));
  return Math.floor(multiplier * level * level);
}

export function calculateDamage(baseDamage: number, stats: CombatStats, tokensPerSecond = 0): number {
  if (!Number.isFinite(baseDamage) || baseDamage < 0) throw new Error('Base damage must be non-negative');
  void tokensPerSecond;
  return Math.max(0, Math.round(baseDamage * (1 + stats.might)));
}

export function calculateCooldown(baseCooldown: number, stats: CombatStats): number {
  return baseCooldown * Math.max(0.15, 1 - stats.cooldown);
}

export function calculateProjectileSpeed(baseSpeed: number, stats: CombatStats): number {
  return Math.max(0, baseSpeed * (1 + (stats.speed ?? 0)));
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
