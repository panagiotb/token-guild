import { describe, expect, it } from 'vitest';
import { cameraForHero, projectWorld, repeatingTileOffset } from '../../src/webview/camera';

describe('open-world camera projection', () => {
  it('keeps the hero centered at any world coordinate', () => {
    const camera = cameraForHero({ x: 12345, y: -9876 });
    expect(projectWorld({ x: 12345, y: -9876 }, camera, { width: 320, height: 200 })).toEqual({ x: 160, y: 100 });
    expect(projectWorld({ x: 12355, y: -9866 }, camera, { width: 320, height: 200 })).toEqual({ x: 170, y: 110 });
  });

  it('wraps repeating background tiles without negative seams', () => {
    expect(repeatingTileOffset(0, 24)).toBe(0);
    expect(repeatingTileOffset(25, 24)).toBe(23);
    expect(repeatingTileOffset(-25, 24)).toBe(1);
  });
});
