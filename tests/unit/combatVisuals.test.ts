import { describe, expect, it } from 'vitest';
import { slashVisualGeometry } from '../../src/webview/combatVisuals';

describe('combat visual geometry', () => {
  it('centers a slash on the hero and preserves its facing arc', () => {
    const geometry = slashVisualGeometry({ x: 3.25, y: 0, vx: 1, vy: 0, area: 5 }, { x: 0, y: 0 });
    expect(geometry).toMatchObject({ x: 0, y: 0, angle: 0, radius: 8 });
    expect(geometry?.startAngle).toBeLessThan(0);
    expect(geometry?.endAngle).toBeGreaterThan(0);
  });

  it('bounds oversized slash arcs and rejects malformed geometry', () => {
    expect(slashVisualGeometry({ x: 0, y: 0, vx: 0, vy: 1, area: 1000 }, { x: 0, y: 0 })?.radius).toBe(28);
    expect(slashVisualGeometry({ x: 0, y: 0, vx: 0, vy: 0, area: 5 }, { x: 0, y: 0 })).toBeUndefined();
    expect(slashVisualGeometry({ x: Number.NaN, y: 0, vx: 0, vy: 1, area: 5 }, { x: 0, y: 0 })).toBeUndefined();
  });
});
