export interface CameraViewport {
  readonly width: number;
  readonly height: number;
}

export interface CameraPosition {
  readonly x: number;
  readonly y: number;
}

export function cameraForHero(hero: CameraPosition): CameraPosition {
  return { x: hero.x, y: hero.y };
}

export function projectWorld(point: CameraPosition, camera: CameraPosition, viewport: CameraViewport): CameraPosition {
  return {
    x: viewport.width / 2 + point.x - camera.x,
    y: viewport.height / 2 + point.y - camera.y
  };
}

export function repeatingTileOffset(cameraCoordinate: number, tileSize: number): number {
  if (!Number.isFinite(cameraCoordinate) || !Number.isFinite(tileSize) || tileSize <= 0) return 0;
  return ((-cameraCoordinate % tileSize) + tileSize) % tileSize;
}
