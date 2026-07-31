import type { RunSummary } from '../game/types';

export interface SummaryDamageRow {
  readonly weapon: string;
  readonly amount: number;
}

export interface SummaryViewModel {
  readonly outcome: string;
  readonly hero: string;
  readonly duration: string;
  readonly tokens: string;
  readonly tokenSource: string;
  readonly gold: string;
  readonly guildWallet: string;
  readonly enemies: string;
  readonly goldBreakdown: string;
  readonly upgrades: readonly string[];
  readonly damage: readonly SummaryDamageRow[];
  readonly announcement: string;
}

export function buildSummaryViewModel(summary: RunSummary, guildGold: number): SummaryViewModel {
  const outcome = summary.outcome === 'victory' ? 'Victory' : 'Defeat';
  const damage = Object.entries(summary.damageByWeapon).map(([weapon, amount]) => ({ weapon, amount }));
  return {
    outcome,
    hero: `${summary.heroName} · Level ${summary.level}`,
    duration: `${Math.floor(summary.elapsedSeconds)}s`,
    tokens: String(summary.tokens),
    tokenSource: `${summary.tokenSource} / ${summary.tokenAccuracy}`,
    gold: String(summary.gold),
    guildWallet: String(guildGold),
    enemies: `${summary.enemiesSpawned} / ${summary.enemiesDefeated}`,
    goldBreakdown: summary.gold > 0 ? `Enemy defeats +${summary.goldBreakdown.enemyKills} · Boss chest +${summary.goldBreakdown.bossChest} · Run total ${summary.gold}` : 'No gold earned this run.',
    upgrades: summary.upgrades.length > 0 ? summary.upgrades : ['No upgrades selected'],
    damage,
    announcement: `${outcome}. ${summary.heroName}, level ${summary.level}. ${summary.tokens} tokens, ${summary.gold} gold, ${summary.enemiesSpawned} enemies spawned and ${summary.enemiesDefeated} defeated.`
  };
}
