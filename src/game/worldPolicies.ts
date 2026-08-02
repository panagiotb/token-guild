/** The current logical canvas is 320x200. A circle outside its half-diagonal
 * is outside every viewport corner, so regular entities cannot pop into view
 * at spawn. Registry-owned stage policies may override the radii without
 * changing the simulation's coordinate ownership; these constants are safe
 * defaults for generic helpers and legacy callers. */
export const WORLD_POLICIES = {
  viewportWidth: 320,
  viewportHeight: 200,
  perimeterPadding: 24,
  enemySpawnInnerRadius: 215,
  enemySpawnOuterRadius: 265,
  bossSpawnRadius: 235,
  lightSourceInnerRadius: 230,
  lightSourceOuterRadius: 290,
  pickupCondensationOffset: 160,
  projectileCullRadius: 560,
  enemyCullRadius: 720,
  ricochetHalfExtent: 160
} as const;

export function perimeterSpawnPoint(
  origin: { x: number; y: number },
  angleFraction: number,
  radiusFraction: number,
  innerRadius: number,
  outerRadius: number
): { x: number; y: number } {
  const safeAngle = Number.isFinite(angleFraction) ? Math.max(0, Math.min(1, angleFraction)) : 0;
  const safeRadius = Number.isFinite(radiusFraction) ? Math.max(0, Math.min(1, radiusFraction)) : 0;
  const radius = Math.max(0, innerRadius) + safeRadius * Math.max(0, outerRadius - innerRadius);
  const angle = safeAngle * Math.PI * 2;
  return { x: origin.x + Math.cos(angle) * radius, y: origin.y + Math.sin(angle) * radius };
}

export function isOutsideViewport(
  point: { x: number; y: number },
  camera: { x: number; y: number },
  viewport: { width: number; height: number } = { width: WORLD_POLICIES.viewportWidth, height: WORLD_POLICIES.viewportHeight }
): boolean {
  const halfWidth = Math.max(0, viewport.width / 2);
  const halfHeight = Math.max(0, viewport.height / 2);
  return Math.abs(point.x - camera.x) > halfWidth || Math.abs(point.y - camera.y) > halfHeight;
}

export function shouldDespawnEnemy(enemy: { x: number; y: number; isBoss: boolean }, hero: { x: number; y: number }, persistenceRadius: number = WORLD_POLICIES.enemyCullRadius): boolean {
  return !enemy.isBoss && Math.hypot(enemy.x - hero.x, enemy.y - hero.y) > persistenceRadius;
}

/** Bosses are persistent, but they must return to the active perimeter when
 * the hero travels far away; keeping the object at its old world coordinate
 * would make a required threat permanently invisible in an open stage. */
export function shouldRelocateBoss(enemy: { x: number; y: number; isBoss: boolean }, hero: { x: number; y: number }, persistenceRadius: number = WORLD_POLICIES.enemyCullRadius): boolean {
  return enemy.isBoss && Math.hypot(enemy.x - hero.x, enemy.y - hero.y) > persistenceRadius;
}

export function isWithinProjectileCullRadius(projectile: { x: number; y: number }, hero: { x: number; y: number }): boolean {
  return Math.hypot(projectile.x - hero.x, projectile.y - hero.y) <= WORLD_POLICIES.projectileCullRadius;
}

export function ricochetBounds(hero: { x: number; y: number }): { minX: number; maxX: number; minY: number; maxY: number } {
  const extent = WORLD_POLICIES.ricochetHalfExtent;
  return { minX: hero.x - extent, maxX: hero.x + extent, minY: hero.y - extent, maxY: hero.y + extent };
}
