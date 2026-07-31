import { describe, expect, it } from 'vitest';
import { buildShareCardText } from '../../src/webview/shareCard';
import { buildSummaryViewModel } from '../../src/webview/summaryModel';
import { validateAudioSettings } from '../../src/webview/audio';

describe('MVP audio and share-card helpers', () => {
  it('validates persisted audio settings', () => {
    expect(validateAudioSettings({ muted: false, volume: 0.5 })).toEqual({ muted: false, volume: 0.5 });
    expect(() => validateAudioSettings({ muted: false, volume: 2 })).toThrow();
  });

  it('builds a local-only summary string from approved fields', () => {
    expect(buildShareCardText({ outcome: 'victory', heroName: 'Wizard', level: 4, tokens: 12, tokenSource: 'synthetic', tokenAccuracy: 'exact', gold: 8, enemiesSpawned: 6, enemiesDefeated: 4, elapsedSeconds: 9 })).toBe('Victory · Wizard · Level 4 · 12 tokens (synthetic/exact) · 8 gold · 6/4 enemies · 9s');
  });

  it('keeps defeat and empty damage/upgrade states explicit', () => {
    const view = buildSummaryViewModel({ outcome: 'defeat', heroId: 'rogue', heroName: 'Rogue', level: 1, elapsedSeconds: 2, tokens: 0, tokenSource: 'synthetic', tokenAccuracy: 'exact', gold: 0, goldBreakdown: { enemyKills: 0, bossChest: 0 }, enemiesSpawned: 0, enemiesDefeated: 0, damageByWeapon: {}, upgrades: [] }, 0);
    expect(view.outcome).toBe('Defeat');
    expect(view.goldBreakdown).toBe('No gold earned this run.');
    expect(view.upgrades).toEqual(['No upgrades selected']);
    expect(view.damage).toEqual([]);
  });
});
