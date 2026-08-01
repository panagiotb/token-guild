import type { RunSummary } from '../game/types';
import { buildSummaryViewModel } from './summaryModel';

export type ShareCardSummary = RunSummary;

function formatId(value: string): string {
  const levelMatch = value.match(/^(.+):level-(\d+)$/);
  const label = (levelMatch?.[1] ?? value).split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  return levelMatch ? `${label} · Level ${levelMatch[2]}` : label;
}

function filenamePart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'run';
}

export function buildShareCardText(summary: ShareCardSummary, guildGold = 0): string {
  const outcome = summary.outcome.charAt(0).toUpperCase() + summary.outcome.slice(1);
  const treasureCount = summary.treasureRewards?.length ?? 0;
  return `${outcome} · ${summary.heroName} · Level ${summary.level} · ${summary.tokens} tokens (${summary.tokenSource}/${summary.tokenAccuracy}) · ${summary.gold} gold · ${summary.enemiesSpawned}/${summary.enemiesDefeated} enemies · ${Math.floor(summary.elapsedSeconds)}s · ${treasureCount} treasure · Guild wallet ${guildGold}`;
}

export function shareCardFilename(summary: ShareCardSummary): string {
  const treasureCount = summary.treasureRewards?.length ?? 0;
  return `token-guild-${filenamePart(summary.heroName)}-lvl-${summary.level}-${summary.outcome}-${Math.floor(summary.elapsedSeconds)}s-${summary.tokens}tokens-${summary.gold}gold-${treasureCount}treasure.png`;
}

function panel(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, fill = '#1e1a22'): void {
  context.fillStyle = fill;
  context.fillRect(x, y, width, height);
  context.strokeStyle = '#713646';
  context.lineWidth = 2;
  context.strokeRect(x, y, width, height);
}

function metric(context: CanvasRenderingContext2D, x: number, y: number, width: number, label: string, value: string, detail: string): void {
  panel(context, x, y, width, 96, '#201c23');
  context.fillStyle = '#ad9fae'; context.font = '20px system-ui'; context.fillText(label, x + 18, y + 30);
  context.fillStyle = '#f4f0ff'; context.font = 'bold 30px system-ui'; context.fillText(value, x + 18, y + 66);
  context.fillStyle = '#ad9fae'; context.font = '16px system-ui'; context.fillText(detail, x + 18, y + 87);
}

export function downloadShareCard(summary: ShareCardSummary, guildGold: number): void {
  const view = buildSummaryViewModel(summary, guildGold);
  const card = document.createElement('canvas'); card.width = 1200; card.height = 960;
  const context = card.getContext('2d'); if (!context) throw new Error('Share-card canvas unavailable');
  context.fillStyle = '#111116'; context.fillRect(0, 0, card.width, card.height);
  context.fillStyle = '#d5a83a'; context.font = 'bold 46px system-ui'; context.fillText('Token Guild', 56, 70);
  context.fillStyle = '#ad9fae'; context.font = '20px system-ui'; context.fillText('Code Dungeon · Local run summary', 58, 102);
  context.fillStyle = summary.outcome === 'victory' ? '#b8f0c9' : '#f3bac5'; context.font = 'bold 34px system-ui'; context.fillText(view.outcome, 930, 72);
  context.fillStyle = '#f4f0ff'; context.font = 'bold 28px system-ui'; context.fillText(view.hero, 58, 154);

  metric(context, 56, 188, 206, 'Duration', view.duration, 'elapsed');
  metric(context, 278, 188, 206, 'Tokens', view.tokens, view.tokenSource);
  metric(context, 500, 188, 206, 'Run gold', view.gold, 'earned this run');
  metric(context, 722, 188, 206, 'Guild wallet', view.guildWallet, 'after save');
  metric(context, 944, 188, 200, 'Enemies', view.enemies, 'spawned / defeated');

  panel(context, 56, 312, 1088, 112);
  context.fillStyle = '#e5a8b3'; context.font = 'bold 22px system-ui'; context.fillText('Rewards', 76, 347);
  context.fillStyle = '#f4f0ff'; context.font = '21px system-ui'; context.fillText(view.goldBreakdown, 76, 385);
  context.fillStyle = '#ad9fae'; context.font = '17px system-ui'; context.fillText(`${summary.tokenSource} / ${summary.tokenAccuracy} token accuracy`, 76, 410);

  panel(context, 56, 448, 532, 390);
  context.fillStyle = '#e5a8b3'; context.font = 'bold 22px system-ui'; context.fillText('Build & treasure', 76, 484);
  context.fillStyle = '#ad9fae'; context.font = 'bold 16px system-ui'; context.fillText('Upgrades', 78, 516);
  const upgrades = view.upgrades.slice(0, 6);
  context.fillStyle = '#f4f0ff'; context.font = '19px system-ui';
  upgrades.forEach((upgrade, index) => context.fillText(`· ${formatId(upgrade)}`, 78, 542 + index * 25));
  if (view.upgrades.length > upgrades.length) context.fillText(`· +${view.upgrades.length - upgrades.length} more`, 78, 542 + upgrades.length * 25);
  const treasureY = 575 + upgrades.length * 25 + (view.upgrades.length > upgrades.length ? 25 : 0);
  context.fillStyle = '#ad9fae'; context.font = 'bold 16px system-ui'; context.fillText('Treasure', 78, treasureY);
  context.fillStyle = '#f4f0ff'; context.font = '19px system-ui';
  const treasure = view.treasureRewards.slice(0, 3);
  treasure.forEach((reward, index) => context.fillText(`· ${formatId(reward)}`, 78, treasureY + 26 + index * 25));
  if (view.treasureRewards.length > treasure.length) context.fillText(`· +${view.treasureRewards.length - treasure.length} more`, 78, treasureY + 26 + treasure.length * 25);

  panel(context, 612, 448, 532, 390);
  context.fillStyle = '#e5a8b3'; context.font = 'bold 22px system-ui'; context.fillText('Damage by weapon', 632, 484);
  context.fillStyle = '#f4f0ff'; context.font = '19px system-ui';
  if (view.damage.length === 0) context.fillText('· No weapon damage recorded', 634, 522);
  view.damage.slice(0, 11).forEach((entry, index) => context.fillText(`· ${formatId(entry.weapon)} · ${Math.round(entry.amount)} damage`, 634, 522 + index * 25));

  context.fillStyle = '#756b78'; context.font = '16px system-ui'; context.fillText('Local export · no prompts, paths, or raw telemetry', 56, 886);
  const link = document.createElement('a'); link.download = shareCardFilename(summary); link.href = card.toDataURL('image/png'); link.click();
}
