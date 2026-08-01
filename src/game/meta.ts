export interface MetaUpgradeDefinition {
  readonly id: string;
  readonly label: string;
  readonly maxRank: number;
  readonly baseCost: number;
  readonly costMultiplier: number;
  readonly stat?: keyof MetaStatBonuses;
  readonly valuePerRank: number;
}

export interface MetaStatBonuses {
  might: number;
  armor: number;
  maxHealth: number;
  recovery: number;
  cooldown: number;
  area: number;
  speed: number;
  duration: number;
  amount: number;
  moveSpeed: number;
  magnet: number;
  luck: number;
  growth: number;
  greed: number;
  curse: number;
  revival: number;
}

export const META_UPGRADES: readonly MetaUpgradeDefinition[] = [
  { id: 'might', label: 'Guild Might', maxRank: 5, baseCost: 200, costMultiplier: 1.1, stat: 'might', valuePerRank: 0.05 },
  { id: 'armor', label: 'Guild Armor', maxRank: 3, baseCost: 600, costMultiplier: 1.15, stat: 'armor', valuePerRank: 1 },
  { id: 'vitality', label: 'Guild Vitality', maxRank: 3, baseCost: 200, costMultiplier: 1.1, stat: 'maxHealth', valuePerRank: 0.1 },
  { id: 'recovery', label: 'Guild Recovery', maxRank: 5, baseCost: 200, costMultiplier: 1.1, stat: 'recovery', valuePerRank: 0.1 },
  { id: 'haste', label: 'Guild Haste', maxRank: 2, baseCost: 900, costMultiplier: 1.2, stat: 'cooldown', valuePerRank: 0.025 },
  { id: 'expansion', label: 'Guild Expansion', maxRank: 2, baseCost: 300, costMultiplier: 1.1, stat: 'area', valuePerRank: 0.05 },
  { id: 'swiftness', label: 'Guild Swiftness', maxRank: 2, baseCost: 300, costMultiplier: 1.1, stat: 'speed', valuePerRank: 0.1 },
  { id: 'duration', label: 'Guild Duration', maxRank: 2, baseCost: 300, costMultiplier: 1.1, stat: 'duration', valuePerRank: 0.1 },
  { id: 'duplication', label: 'Guild Duplication', maxRank: 1, baseCost: 5000, costMultiplier: 1.5, stat: 'amount', valuePerRank: 1 },
  { id: 'agility', label: 'Guild Agility', maxRank: 2, baseCost: 300, costMultiplier: 1.1, stat: 'moveSpeed', valuePerRank: 0.1 },
  { id: 'magnet', label: 'Token Magnetism', maxRank: 2, baseCost: 300, costMultiplier: 1.1, stat: 'magnet', valuePerRank: 0.25 },
  { id: 'fortune', label: 'Guild Fortune', maxRank: 3, baseCost: 600, costMultiplier: 1.15, stat: 'luck', valuePerRank: 0.1 },
  { id: 'growth', label: 'Token Growth', maxRank: 5, baseCost: 300, costMultiplier: 1.1, stat: 'growth', valuePerRank: 0.03 },
  { id: 'greed', label: 'Gold Hoard', maxRank: 5, baseCost: 200, costMultiplier: 1.1, stat: 'greed', valuePerRank: 0.1 },
  { id: 'curse', label: 'Chaos Curse', maxRank: 5, baseCost: 1666, costMultiplier: 1.25, stat: 'curse', valuePerRank: 0.1 },
  { id: 'revival', label: 'Ankh Revival', maxRank: 1, baseCost: 10000, costMultiplier: 2, stat: 'revival', valuePerRank: 1 },
  { id: 'reroll', label: 'Guild Reroll', maxRank: 5, baseCost: 1000, costMultiplier: 1.2, valuePerRank: 1 },
  { id: 'skip', label: 'Guild Skip', maxRank: 5, baseCost: 500, costMultiplier: 1.15, valuePerRank: 1 },
  { id: 'banish', label: 'Guild Banish', maxRank: 5, baseCost: 1000, costMultiplier: 1.2, valuePerRank: 1 }
];

export function metaUpgradeDefinition(id: string): MetaUpgradeDefinition | undefined {
  return META_UPGRADES.find((upgrade) => upgrade.id === id);
}

export function metaUpgradeCost(id: string, currentRank: number): number {
  const definition = metaUpgradeDefinition(id);
  if (!definition || !Number.isInteger(currentRank) || currentRank < 0 || currentRank >= definition.maxRank) return Number.POSITIVE_INFINITY;
  return Math.ceil(definition.baseCost * definition.costMultiplier ** currentRank - 1e-9);
}

export function metaStatBonuses(upgrades: Readonly<Record<string, number>>): MetaStatBonuses {
  const bonuses: MetaStatBonuses = { might: 0, armor: 0, maxHealth: 0, recovery: 0, cooldown: 0, area: 0, speed: 0, duration: 0, amount: 0, moveSpeed: 0, magnet: 0, luck: 0, growth: 0, greed: 0, curse: 0, revival: 0 };
  for (const definition of META_UPGRADES) {
    if (!definition.stat) continue;
    const rank = Math.max(0, Math.min(definition.maxRank, Math.floor(upgrades[definition.id] ?? 0)));
    bonuses[definition.stat] += rank * definition.valuePerRank;
  }
  return bonuses;
}

export function metaUpgradeRefund(upgrades: Readonly<Record<string, number>>): number {
  return META_UPGRADES.reduce((total, definition) => {
    const rank = Math.max(0, Math.min(definition.maxRank, Math.floor(upgrades[definition.id] ?? 0)));
    let spent = 0;
    for (let index = 0; index < rank; index += 1) spent += metaUpgradeCost(definition.id, index);
    return total + spent;
  }, 0);
}

export function metaActionCharges(upgrades: Readonly<Record<string, number>>): { rerolls: number; skips: number; banishes: number } {
  return { rerolls: Math.max(0, Math.floor(upgrades.reroll ?? 0)), skips: Math.max(0, Math.floor(upgrades.skip ?? 0)), banishes: Math.max(0, Math.floor(upgrades.banish ?? 0)) };
}
