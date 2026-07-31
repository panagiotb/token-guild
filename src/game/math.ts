import type { CombatStats } from './types';

export function getXpRequiredForLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1) throw new Error('Level must be a positive integer');
  if (level <= 20) return 5 * level * level;
  if (level <= 40) return 5 * level * level + 60 * (level - 20);
  return 5 * level * level + 100 * (level - 40);
}

export function calculateDamage(baseDamage: number, stats: CombatStats, tokensPerSecond: number): number {
  if (!Number.isFinite(baseDamage) || baseDamage < 0) throw new Error('Base damage must be non-negative');
  const berserkMultiplier = tokensPerSecond >= 40 ? 1.5 : 1;
  return Math.round(baseDamage * (1 + stats.might) * berserkMultiplier);
}

export function calculateCooldown(baseCooldown: number, stats: CombatStats): number {
  return baseCooldown * Math.max(0.15, 1 - stats.cooldown);
}

export function calculateBerserkSpeed(baseSpeed: number, tokensPerSecond: number): number {
  return baseSpeed * (tokensPerSecond >= 40 ? 1.5 : 1);
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
