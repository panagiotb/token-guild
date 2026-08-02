import type { CombatStats } from '../game/types';

export interface CharacterStatRow {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly description: string;
}

function safeNumber(value: number | undefined, fallback = 0): number {
  return value !== undefined && Number.isFinite(value) ? value : fallback;
}

function percent(value: number | undefined): string {
  return `${Math.round(safeNumber(value) * 100)}%`;
}

function integer(value: number | undefined): string {
  return String(Math.round(safeNumber(value)));
}

/**
 * Builds the complete, user-facing combat-stat contract for the character
 * panel. Keeping labels and explanations here prevents the webview from
 * inventing a partial or generic stat list as new upgrades are added.
 */
export function characterStatRows(stats: CombatStats): readonly CharacterStatRow[] {
  return [
    { key: 'might', label: 'Might', value: percent(stats.might), description: 'Weapon damage bonus.' },
    { key: 'armor', label: 'Armor', value: integer(stats.armor), description: 'Flat contact reduction; boosts retaliatory damage up to +500%.' },
    { key: 'moveSpeed', label: 'Move', value: integer(stats.moveSpeed), description: 'Hero movement speed in world units per second.' },
    { key: 'area', label: 'Area', value: percent(stats.area), description: 'Projectile and aura area bonus.' },
    { key: 'speed', label: 'Projectile speed', value: percent(stats.speed), description: 'Projectile travel-speed bonus.' },
    { key: 'cooldown', label: 'Cooldown', value: percent(stats.cooldown), description: 'Reduction applied to weapon cooldowns.' },
    { key: 'amount', label: 'Amount', value: integer(stats.amount), description: 'Projectiles created by each weapon attack.' },
    { key: 'magnet', label: 'Magnet', value: integer(stats.magnet), description: 'Pickup collection radius in world units.' },
    { key: 'growth', label: 'Growth', value: percent(stats.growth), description: 'Bonus experience gained from collected gems.' },
    { key: 'duration', label: 'Duration', value: percent(stats.duration), description: 'Projectile and effect lifetime bonus.' },
    { key: 'luck', label: 'Luck', value: percent(stats.luck), description: 'Improves favorable level-up, drop, and chest rolls.' },
    { key: 'greed', label: 'Greed', value: percent(stats.greed), description: 'Bonus gold from collectible gold rewards.' },
    { key: 'curse', label: 'Curse', value: percent(stats.curse), description: 'Increases enemy spawn pressure, health, and speed; it does not directly increase enemy damage.' },
    { key: 'recovery', label: 'Recovery', value: integer(stats.recovery), description: 'Health restored each second and bonus healing from pickups.' },
    { key: 'revival', label: 'Revival', value: integer(stats.revival), description: 'Extra revival charges available after defeat.' }
  ];
}
