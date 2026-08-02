import type { TelemetrySource } from '../shared/types';

function labelForSource(source: TelemetrySource): string {
  return `${source.charAt(0).toUpperCase()}${source.slice(1)}`;
}

export function formatPauseTitle(source: TelemetrySource, tokens: number): string {
  const safeTokens = Number.isFinite(tokens) ? Math.max(0, Math.floor(tokens)) : 0;
  return `Paused · ${labelForSource(source)} tokens spent: ${safeTokens}`;
}
