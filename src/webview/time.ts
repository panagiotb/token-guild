/** Formats gameplay time without losing the stable zero-padded HUD shape. */
export function formatElapsedTime(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

/** Formats numeric HUD values without exposing floating-point noise. */
export function formatDisplayNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '0';
  const precision = Number.isFinite(decimals) ? Math.min(20, Math.max(0, Math.floor(decimals))) : 0;
  const factor = 10 ** precision;
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
  return precision === 0
    ? String(Object.is(rounded, -0) ? 0 : rounded)
    : rounded.toFixed(precision).replace(/\.?(0+)$/, '').replace(/\.$/, '');
}
