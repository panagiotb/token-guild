import { describe, expect, it } from 'vitest';
import { buildShareCardText } from '../../src/webview/shareCard';
import { validateAudioSettings } from '../../src/webview/audio';

describe('MVP audio and share-card helpers', () => {
  it('validates persisted audio settings', () => {
    expect(validateAudioSettings({ muted: false, volume: 0.5 })).toEqual({ muted: false, volume: 0.5 });
    expect(() => validateAudioSettings({ muted: false, volume: 2 })).toThrow();
  });

  it('builds a local-only summary string from approved fields', () => {
    expect(buildShareCardText({ outcome: 'Victory', tokens: 12, gold: 8, enemiesDefeated: 4, elapsedSeconds: 9 })).toBe('Victory · 12 tokens · 8 gold · 4 enemies · 9s');
  });
});
