import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('responsive MVP layout', () => {
  it('does not lock the sidebar to a fixed 300px width', () => {
    const css = readFileSync(new URL('../../src/webview/style.css', import.meta.url), 'utf8');
    expect(css).toContain('max-width: 320px');
    expect(css).not.toMatch(/width\s*:\s*300px/);
    expect(css).toContain('.icon-button');
    expect(css).toContain('.upgrade-options');
    expect(css).toContain('.character-panel');
    expect(css).toContain('.token-info');
    const main = readFileSync(new URL('../../src/webview/main.ts', import.meta.url), 'utf8');
    expect(main).toContain('Synthetic tokens');
    expect(main).toContain('Choose upgrade below to continue:');
  });
});
