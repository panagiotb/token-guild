import type { RegistryClass } from '../game/registry';

export function formatHeroOptionLabel(heroName: string): string {
  return heroName;
}

export function formatHeroTrait(passive: RegistryClass['passive'] | undefined): string {
  if (!passive) return 'Trait details unavailable';
  const value = passive.stat === 'amount' ? `+${passive.valuePerLevel} projectile` : passive.stat === 'magnet' ? `+${Math.round(passive.valuePerLevel * 100)}% pickup range` : `+${Math.round(passive.valuePerLevel * 100)}% ${passive.stat}`;
  return `${value} every ${passive.intervalLevels} level${passive.intervalLevels === 1 ? '' : 's'} (up to ${passive.stat === 'amount' ? passive.maxBonus : `${Math.round(passive.maxBonus * 100)}%`})`;
}

export function formatHeroOptionDescription(heroName: string, startingWeaponName?: string, trait?: string): string {
  const details = startingWeaponName && trait ? `; starts with ${startingWeaponName}; trait: ${trait}` : '';
  return `${heroName}${details}; new runs start at Level 1`;
}

export function formatHeroUnlockReason(hero: Pick<RegistryClass, 'id'> & { unlock?: { description: string } } | undefined, unlockedHeroes: readonly string[]): string {
  if (!hero) return 'Unlock condition unavailable';
  if (unlockedHeroes.includes(hero.id)) return 'Unlocked';
  return hero.unlock?.description ?? 'Unlock condition unavailable';
}
