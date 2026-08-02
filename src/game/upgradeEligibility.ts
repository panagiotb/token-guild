import { MVP_REGISTRY, passiveDefinition, weaponDefinition } from './content';
import { SIMULATION_POLICIES } from './policies';
import type { RunState, UpgradeCard } from './types';

/**
 * Base weapons are the registry entries that are not authored evolution
 * outputs. Keeping this derivation in one place prevents the level-up pool,
 * checkpoint validation, and future content tools from maintaining subtly
 * different allowlists.
 */
export function baseWeaponDefinitions() {
  const evolvedIds = new Set(MVP_REGISTRY.weapons.flatMap((weapon) => weapon.evolution ? [weapon.evolution.resultId] : []));
  return MVP_REGISTRY.weapons.filter((weapon) => !evolvedIds.has(weapon.id));
}

/** Stable identity for a banishable item. Card IDs are presentation details:
 * the same weapon/passive may appear as a discovery or owned-item upgrade. */
export function upgradeItemKey(itemId: string): string {
  return `item:${itemId}`;
}

export function isBanishableUpgradeCard(card: Pick<UpgradeCard, 'kind'>): boolean {
  return card.kind === 'weapon' || card.kind === 'new-weapon' || card.kind === 'passive' || card.kind === 'new-passive';
}

/** Read both canonical keys and pre-migration card IDs from restored runs. */
export function isUpgradeItemBanned(state: RunState, itemId: string): boolean {
  return state.bannedUpgradeIds.includes(upgradeItemKey(itemId))
    || state.bannedUpgradeIds.includes(`weapon:${itemId}`)
    || state.bannedUpgradeIds.includes(`weapon-upgrade:${itemId}`)
    || state.bannedUpgradeIds.includes(`passive:${itemId}`)
    || state.bannedUpgradeIds.includes(`passive-upgrade:${itemId}`);
}

export function isUpgradeCardBanned(state: RunState, card: Pick<UpgradeCard, 'id' | 'kind' | 'target'>): boolean {
  return state.bannedUpgradeIds.includes(card.id)
    || (isBanishableUpgradeCard(card) && isUpgradeItemBanned(state, card.target));
}

export function hasEligibleWeaponOrPassive(state: RunState): boolean {
  for (const weapon of state.weapons) {
    const definition = weaponDefinition(weapon.id);
    const card = { id: `weapon-upgrade:${weapon.id}`, kind: 'weapon' as const, target: weapon.id };
    if (definition && !isUpgradeCardBanned(state, card) && Number.isFinite(weapon.level) && Math.floor(weapon.level) < definition.maxLevel) return true;
  }
  for (const [id, rank] of Object.entries(state.passives)) {
    const definition = passiveDefinition(id);
    const card = { id: `passive-upgrade:${id}`, kind: 'passive' as const, target: id };
    if (definition && !isUpgradeCardBanned(state, card) && Number.isFinite(rank) && Math.floor(rank) < definition.maxLevel) return true;
  }
  if (state.weapons.length < SIMULATION_POLICIES.maxWeaponSlots && baseWeaponDefinitions().some((definition) => !isUpgradeItemBanned(state, definition.id) && !state.weapons.some((weapon) => weapon.id === definition.id))) return true;
  if (Object.keys(state.passives).length < SIMULATION_POLICIES.maxPassiveSlots && MVP_REGISTRY.passives.some((definition) => !isUpgradeItemBanned(state, definition.id) && !state.passives[definition.id])) return true;
  return false;
}

/** Return whether a card is still valid for the current canonical run state. */
export function isUpgradeCardEligible(state: RunState, card: UpgradeCard): boolean {
  if (!card || typeof card.id !== 'string' || typeof card.target !== 'string') return false;
  if (isUpgradeCardBanned(state, card)) return false;
  if (card.kind === 'weapon') {
    const weapon = state.weapons.find((candidate) => candidate.id === card.target);
    const definition = weaponDefinition(card.target);
    return weapon !== undefined && definition !== undefined && Number.isFinite(weapon.level) && Math.floor(weapon.level) < definition.maxLevel;
  }
  if (card.kind === 'new-weapon') {
    return state.weapons.length < SIMULATION_POLICIES.maxWeaponSlots
      && baseWeaponDefinitions().some((definition) => definition.id === card.target)
      && !state.weapons.some((weapon) => weapon.id === card.target);
  }
  if (card.kind === 'passive') {
    const definition = passiveDefinition(card.target);
    const rank = state.passives[card.target] ?? 0;
    return definition !== undefined && rank > 0 && Number.isFinite(rank) && Math.floor(rank) < definition.maxLevel;
  }
  if (card.kind === 'new-passive') {
    return Object.keys(state.passives).length < SIMULATION_POLICIES.maxPassiveSlots
      && passiveDefinition(card.target) !== undefined
      && (state.passives[card.target] ?? 0) <= 0;
  }
  if (card.kind === 'heal') return card.target === 'heal';
  if (card.kind === 'gold') return card.target === 'gold' && !hasEligibleWeaponOrPassive(state);
  return false;
}

/**
 * Validate a restored level-up envelope before it can reach the host action
 * path. Duplicate IDs and cards that no longer match the registry are
 * rejected, rather than allowing a stale/corrupt checkpoint to add content.
 */
export function validatePendingUpgradeCards(state: RunState): void {
  if (state.phase !== 'level-up') return;
  if (!Number.isSafeInteger(state.pendingLevelUps) || state.pendingLevelUps < 0 || state.pendingCards.length < 1 || state.pendingCards.length > 4) throw new Error('Invalid level-up card envelope');
  const ids = new Set<string>();
  for (const card of state.pendingCards) {
    if (ids.has(card.id) || !isUpgradeCardEligible(state, card)) throw new Error('Invalid level-up card');
    ids.add(card.id);
  }
}
