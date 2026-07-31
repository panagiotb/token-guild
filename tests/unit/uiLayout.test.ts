import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { formatHeroOptionDescription, formatHeroOptionLabel } from '../../src/webview/heroProgress';

describe('responsive MVP layout', () => {
  it('formats authoritative best-level hero labels without changing starting level semantics', () => {
    expect(formatHeroOptionLabel('Wizard', 4)).toBe('Wizard - Level 4');
    expect(formatHeroOptionDescription('Wizard', 4)).toContain('new runs start at Level 1');
    expect(formatHeroOptionLabel('Wizard', 0)).toBe('Wizard - Level 1');
  });

  it('does not lock the sidebar to a fixed 300px width', () => {
    const css = readFileSync(new URL('../../src/webview/style.css', import.meta.url), 'utf8');
    expect(css).toContain('max-width: 320px');
    expect(css).not.toMatch(/width\s*:\s*300px/);
    expect(css).toContain('.icon-button');
    expect(css).toContain('.upgrade-options');
    expect(css).toContain('.character-panel');
    expect(css).toContain('.token-info');
    expect(css).toContain('.map-frame');
    expect(css).toContain('.map-hud');
    expect(css).toContain('.enemy-counter');
    const main = readFileSync(new URL('../../src/webview/main.ts', import.meta.url), 'utf8');
    expect(main).toContain('Synthetic tokens');
    expect(main).toContain('Choose upgrade below to continue:');
    expect(main).toContain('id="clock-counter"');
    expect(main).toContain('id="token-hud"');
    expect(main).toContain('id="enemy-spawned"');
    expect(main).toContain('id="enemy-defeated"');
    expect(main).toContain('id="enemy-active"');
    expect(main).not.toContain('run-meta-copy');
    expect(main).not.toContain(' · XP ${Math.floor(run.xp)}');
    expect(main).toContain('summary-upgrades');
    expect(main).toContain('summary-token-source');
    expect(main).toContain('gold-breakdown-dialog');
    expect(main).toContain('heroRecords');
  });
});
