import { describe, expect, it } from 'vitest';
import { characterStatRows } from '../../src/webview/statPresentation';
import type { CombatStats } from '../../src/game/types';

const stats: CombatStats = {
  hp: 100,
  maxHp: 120,
  armor: 2,
  moveSpeed: 44,
  might: 0.15,
  area: 0.2,
  speed: 0.1,
  cooldown: 0.08,
  amount: 3,
  magnet: 48,
  growth: 0.12,
  duration: 0.25,
  luck: 0.1,
  greed: 0.2,
  curse: 0.05,
  recovery: 1,
  revival: 2
};

describe('character stat presentation', () => {
  it('exposes every gameplay stat with a concrete value and explanation', () => {
    const rows = characterStatRows(stats);
    expect(rows).toHaveLength(15);
    expect(rows.map((row) => row.key)).toEqual([
      'might', 'armor', 'moveSpeed', 'area', 'speed', 'cooldown', 'amount', 'magnet',
      'growth', 'duration', 'luck', 'greed', 'curse', 'recovery', 'revival'
    ]);
    expect(rows.find((row) => row.key === 'might')).toMatchObject({ value: '15%', description: 'Weapon damage bonus.' });
    expect(rows.find((row) => row.key === 'armor')?.description).toContain('retaliatory damage');
    expect(rows.find((row) => row.key === 'curse')?.description).toContain('does not directly increase enemy damage');
    expect(rows.find((row) => row.key === 'amount')?.value).toBe('3');
    expect(rows.find((row) => row.key === 'recovery')?.description).toContain('bonus healing from pickups');
    expect(rows.every((row) => row.description.length > 10)).toBe(true);
  });

  it('normalizes missing optional values without exposing NaN or Infinity', () => {
    const statsWithoutLuck = { ...stats };
    delete statsWithoutLuck.luck;
    const rows = characterStatRows({ ...statsWithoutLuck, duration: Number.NaN, recovery: Number.POSITIVE_INFINITY });
    expect(rows.find((row) => row.key === 'luck')?.value).toBe('0%');
    expect(rows.find((row) => row.key === 'duration')?.value).toBe('0%');
    expect(rows.find((row) => row.key === 'recovery')?.value).toBe('0');
    expect(rows.some((row) => /NaN|Infinity/.test(row.value))).toBe(false);
  });
});
