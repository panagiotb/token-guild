import { describe, expect, it } from 'vitest';
import { formatDisplayNumber, formatElapsedTime } from '../../src/webview/time';
import { isEditableKeyboardTarget, isMovementKey, normalizeKeyboardKey } from '../../src/webview/keyboard';
import { createRun } from '../../src/game/simulation';
import { describeUpgrade } from '../../src/webview/upgradeCopy';

describe('webview interaction helpers', () => {
  it('formats the run clock as mm:ss', () => {
    expect(formatElapsedTime(0)).toBe('00:00');
    expect(formatElapsedTime(65.9)).toBe('01:05');
    expect(formatElapsedTime(-1)).toBe('00:00');
  });

  it('rounds HUD numbers instead of leaking floating-point precision', () => {
    expect(formatDisplayNumber(110.00000000000001)).toBe('110');
    expect(formatDisplayNumber(12.3456, 2)).toBe('12.35');
  });

  it('normalizes movement keys and recognizes all supported directions', () => {
    expect(normalizeKeyboardKey('W')).toBe('w');
    expect(isMovementKey('W')).toBe(true);
    expect(isMovementKey('ArrowLeft')).toBe(true);
    expect(isMovementKey('Enter')).toBe(false);
  });

  it('keeps form controls from stealing gameplay movement ownership', () => {
    expect(isEditableKeyboardTarget(null)).toBe(false);
    const buttonTarget = { closest: () => ({}) } as unknown as EventTarget;
    const mapTarget = { closest: () => null } as unknown as EventTarget;
    expect(isEditableKeyboardTarget(buttonTarget)).toBe(true);
    expect(isEditableKeyboardTarget(mapTarget)).toBe(false);
  });

  it('describes each current upgrade with its concrete effect', () => {
    const run = createRun('warrior', 7);
    expect(describeUpgrade({ id: 'heal', label: 'Restore 25% health', kind: 'heal', target: 'heal' }, run)).toContain('maximum health');
    expect(describeUpgrade({ id: 'weapon:arcane_bolt', label: 'Arcane Bolt', kind: 'new-weapon', target: 'arcane_bolt' }, run)).toContain('Deals 10 damage every 1s with 1 projectile');
    expect(describeUpgrade({ id: 'weapon:fire_wand', label: 'Fire Wand', kind: 'new-weapon', target: 'fire_wand' }, run)).toContain('Deals 20 damage every 3s with 3 projectiles at 0.02s intervals (fan).');
    expect(describeUpgrade({ id: 'weapon:alchemist_fire', label: 'Alchemist Fire', kind: 'new-weapon', target: 'alchemist_fire' }, run)).toContain('Deals 10 damage every 4.5s with 1 projectile, 99 pierce (pool).');
    run.weapons[0] = { id: 'throwing_daggers', level: 2, cooldownRemaining: 0 };
    expect(describeUpgrade({ id: 'weapon-upgrade:throwing_daggers', label: 'Upgrade Throwing Daggers', kind: 'weapon', target: 'throwing_daggers' }, run)).toContain('0.1s intervals');
    expect(describeUpgrade({ id: 'passive:iron_armor', label: 'Iron Armor', kind: 'new-passive', target: 'iron_armor' }, run)).toContain('armor');
  });

  it('describes the exact registry delta for an equipped weapon upgrade', () => {
    const run = createRun('warrior', 8);
    expect(describeUpgrade({ id: 'weapon-upgrade:broadsword', label: 'Upgrade Broadsword', kind: 'weapon', target: 'broadsword' }, run)).toContain('Level 2: damage 20 to 25, area 1.1.');
  });

  it('describes composite passive effects instead of falling back to a generic label', () => {
    const run = createRun('warrior', 9);
    expect(describeUpgrade({ id: 'passive:pandoras_box', label: "Pandora's Box", kind: 'new-passive', target: 'pandoras_box' }, run)).toContain('+4% all stats');
    run.passives.pandoras_box = 8;
    expect(describeUpgrade({ id: 'passive-upgrade:pandoras_box', label: "Upgrade Pandora's Box", kind: 'passive', target: 'pandoras_box' }, run)).toContain('+25% all stats');
    expect(describeUpgrade({ id: 'passive-upgrade:pandoras_box', label: "Upgrade Pandora's Box", kind: 'passive', target: 'pandoras_box' }, run)).toContain('+100% curse');
  });
});
