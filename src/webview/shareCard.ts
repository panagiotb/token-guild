import type { RunSummary } from '../game/types';

export type ShareCardSummary = Pick<RunSummary, 'outcome' | 'heroName' | 'level' | 'tokens' | 'tokenSource' | 'tokenAccuracy' | 'gold' | 'enemiesSpawned' | 'enemiesDefeated' | 'elapsedSeconds'>;

export function buildShareCardText(summary: ShareCardSummary): string {
  const outcome = summary.outcome.charAt(0).toUpperCase() + summary.outcome.slice(1);
  return `${outcome} · ${summary.heroName} · Level ${summary.level} · ${summary.tokens} tokens (${summary.tokenSource}/${summary.tokenAccuracy}) · ${summary.gold} gold · ${summary.enemiesSpawned}/${summary.enemiesDefeated} enemies · ${Math.floor(summary.elapsedSeconds)}s`;
}

export function downloadShareCard(summary: ShareCardSummary): void {
  const card = document.createElement('canvas'); card.width = 960; card.height = 540;
  const context = card.getContext('2d'); if (!context) throw new Error('Share-card canvas unavailable');
  context.fillStyle = '#171221'; context.fillRect(0, 0, card.width, card.height);
  context.fillStyle = '#d5a83a'; context.font = 'bold 52px system-ui'; context.fillText('Token Guild', 60, 100);
  context.fillStyle = '#f4f0ff'; context.font = '28px system-ui';
  const lines = [buildShareCardText(summary), 'Local summary · no prompts, paths, or raw telemetry'];
  lines.forEach((line, index) => context.fillText(line, 60, 180 + index * 48));
  const link = document.createElement('a'); link.download = 'token-guild-run.png'; link.href = card.toDataURL('image/png'); link.click();
}
