export interface ShareCardSummary { outcome: string; tokens: number; gold: number; enemiesDefeated: number; elapsedSeconds: number }

export function buildShareCardText(summary: ShareCardSummary): string {
  return `${summary.outcome} · ${summary.tokens} tokens · ${summary.gold} gold · ${summary.enemiesDefeated} enemies · ${Math.floor(summary.elapsedSeconds)}s`;
}

export function downloadShareCard(summary: ShareCardSummary): void {
  const card = document.createElement('canvas'); card.width = 960; card.height = 540;
  const context = card.getContext('2d'); if (!context) throw new Error('Share-card canvas unavailable');
  context.fillStyle = '#171221'; context.fillRect(0, 0, card.width, card.height);
  context.fillStyle = '#d5a83a'; context.font = 'bold 52px system-ui'; context.fillText('Token Guild', 60, 100);
  context.fillStyle = '#f4f0ff'; context.font = '28px system-ui'; context.fillText(buildShareCardText(summary), 60, 180);
  const link = document.createElement('a'); link.download = 'token-guild-run.png'; link.href = card.toDataURL('image/png'); link.click();
}
