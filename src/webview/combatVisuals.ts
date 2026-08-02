export interface SlashVisualGeometry {
  x: number;
  y: number;
  angle: number;
  radius: number;
  startAngle: number;
  endAngle: number;
}

/** Derive a bounded, hero-centered visual for a slash projectile. The
 * simulation remains authoritative for collision; this helper only translates
 * its anchored direction/area into a readable map-space arc. */
export function slashVisualGeometry(
  projectile: { x: number; y: number; vx: number; vy: number; area: number },
  hero: { x: number; y: number }
): SlashVisualGeometry | undefined {
  if (![projectile.x, projectile.y, projectile.vx, projectile.vy, projectile.area, hero.x, hero.y].every(Number.isFinite)) return undefined;
  const directionLength = Math.hypot(projectile.vx, projectile.vy);
  if (directionLength < 1e-6 || projectile.area <= 0) return undefined;
  const angle = Math.atan2(projectile.vy, projectile.vx);
  const radius = Math.max(8, Math.min(28, projectile.area * 1.15));
  const halfArc = Math.PI * 0.46;
  return { x: hero.x, y: hero.y, angle, radius, startAngle: angle - halfArc, endAngle: angle + halfArc };
}
