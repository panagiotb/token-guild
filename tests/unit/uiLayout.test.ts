import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { formatHeroOptionDescription, formatHeroOptionLabel } from '../../src/webview/heroProgress';
import { batteryFillPercent, formatBatteryTooltip } from '../../src/webview/batteryView';

describe('responsive MVP layout', () => {
  it('formats battery storage compactly for the accessible tooltip', () => {
    expect(formatBatteryTooltip(24000, 100000)).toBe('Tokens Stored: 24K/100K');
    expect(batteryFillPercent(250, 1000)).toBe(25);
  });

  it('formats authoritative best-level hero labels without changing starting level semantics', () => {
    expect(formatHeroOptionLabel('Wizard', 4)).toBe('Wizard - Level 4');
    expect(formatHeroOptionDescription('Wizard', 4)).toContain('new runs start at Level 1');
    expect(formatHeroOptionLabel('Wizard', 0)).toBe('Wizard - Level 1');
  });

  it('does not lock the sidebar to a fixed 300px width', () => {
    const css = readFileSync(new URL('../../src/webview/style.css', import.meta.url), 'utf8');
    expect(css).toContain('max-width: 520px');
    expect(css).not.toMatch(/width\s*:\s*300px/);
    expect(css).toContain('.icon-button');
    expect(css).toContain('.upgrade-options');
    expect(css).toContain('.character-panel');
    expect(css).toContain('.token-info');
    expect(css).toContain('.map-frame');
    expect(css).toContain('.map-toolbar');
    expect(css).toContain('.map-shell');
    expect(css).toContain('.enemy-counter');
    expect(css).toContain('data-tooltip');
    expect(css).toContain('.export-action');
    expect(css).toContain('transition: none');
    const main = readFileSync(new URL('../../src/webview/main.ts', import.meta.url), 'utf8');
    expect(main).toContain('Synthetic tokens');
    expect(main).toContain('Choose upgrade below to continue:');
    expect(main).toContain('id="clock-counter"');
    expect(main).toContain('id="token-hud"');
    expect(main).toContain('id="battery-widget"');
    expect(main).toContain('battery-lightning');
    expect(main).toContain('Tokens Stored:');
    expect(main).toContain('id="battery-lockout"');
    expect(main).toContain('batteryFillPercent');
    expect(main).toContain('count: 25');
    expect(main).toContain('tokensPerSecond: 100');
    expect(main).toContain('class="battery-strip"');
    expect(main).toContain('id="enemy-spawned"');
    expect(main).toContain('id="enemy-defeated"');
    expect(main).toContain('id="enemy-active"');
    expect(main).toContain('id="pause-toggle"');
    expect(main).toContain('id="pause-screen"');
    expect(main).toContain('id="guild-content"');
    expect(main).toContain('formatPauseTitle');
    expect(main).toContain('if (paused) { renderPauseScreen(); return; }');
    expect(main).toContain('class="map-toolbar"');
    expect(main).toContain('class="map-toolbar" aria-label="Dungeon counters"><span');
    expect(main).toContain('<h2 id="run-title">Code Dungeon</h2><button');
    expect(main).toContain('class="cards map-upgrade-overlay hidden"');
    expect(main).toContain('renderUpgradeCards');
    expect(main).toContain('downloadShareCard(run.summary, progress.gold)');
    expect(main).toContain('counter.dataset.tooltip');
    expect(main).not.toMatch(/id="enemy-(?:spawned|defeated|active)" title=/);
    expect(main).not.toContain('run-meta-copy');
    expect(main).not.toContain(' · XP ${Math.floor(run.xp)}');
    expect(main).toContain('summary-upgrades');
    expect(main).toContain('summary-token-source');
    expect(main).toContain('gold-breakdown-dialog');
    expect(main).toContain('heroRecords');
    expect(main).toContain('Collected gem pickups grant 1 XP and 1 gold');
    expect(main).toContain('id="game-announce"');
    expect(main).toContain('function drawHero');
    expect(main).toContain('function drawEnemy');
    expect(main).toContain('activeFeedbackCues');
    expect(css).toContain('prefers-reduced-motion');
    expect(css).toContain('aspect-ratio: 8 / 5');
  });
});
