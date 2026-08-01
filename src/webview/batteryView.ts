export function formatCompactTokens(value: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  if (safe >= 1000) return `${Math.floor(safe / 1000)}K`;
  return String(safe);
}

export function formatBatteryTooltip(current: number, maximum: number): string {
  return `Tokens Stored: ${formatCompactTokens(current)}/${formatCompactTokens(maximum)}`;
}

export function batteryFillPercent(current: number, maximum: number): number {
  if (!Number.isFinite(maximum) || maximum <= 0) return 0;
  return Math.max(0, Math.min(100, (Math.max(0, current) / maximum) * 100));
}
