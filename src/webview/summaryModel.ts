import type { RunSummary } from '../game/types';
import { formatElapsedTime } from './time';

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
  readonly treasureRewards: readonly string[];
  readonly revival: string;
  readonly finale: string;
  readonly damage: readonly SummaryDamageRow[];
  readonly announcement: string;
}

function escalatingFinaleRevivalBonus(chargesUsed: number): number {
  let bonus = 0;
  for (let index = 1; index <= Math.max(0, Math.floor(chargesUsed)); index += 1) bonus += Math.min(index, 4) * 100;
  return bonus;
}

export function buildSummaryViewModel(summary: RunSummary, guildGold: number): SummaryViewModel {
  const outcome = summary.outcome === 'victory' ? 'Victory' : 'Defeat';
  const damage = Object.entries(summary.damageByWeapon).map(([weapon, amount]) => ({ weapon, amount }));
  const overflowGold = summary.goldBreakdown.overflow;
  const eliteDropGold = summary.goldBreakdown.eliteDrops ?? 0;
  const lightSourceGold = summary.goldBreakdown.lightSources ?? 0;
  const stageCompletionGold = summary.goldBreakdown.stageCompletion ?? 0;
  const levelUpGold = summary.goldBreakdown.levelUp ?? 0;
  const detailedGoldBreakdown = summary.gold > 0 ? `Light sources +${lightSourceGold} · Elite drops +${eliteDropGold} · Boss chest +${summary.goldBreakdown.bossChest} · Overflow +${overflowGold} · Run total ${summary.gold}` : 'No gold earned this run.';
  const stageBasis = summary.stageRewardBasis;
  const unusedRevivalGold = stageBasis ? stageBasis.unusedRevivalCharges * 100 : 0;
  const finaleRevivalBonus = stageBasis ? (stageBasis.finaleRevivalBonus ?? escalatingFinaleRevivalBonus(stageBasis.finaleRevivalCharges)) : 0;
  const stageBasisCopy = stageBasis ? `Stage basis ${stageBasis.baseGold} base + ${unusedRevivalGold} unused-revival gold (${stageBasis.unusedRevivalCharges}) + ${finaleRevivalBonus} finale-revival bonus (${stageBasis.finaleRevivalCharges} used); end-state reward, Greed excluded` : undefined;
  const ledgerSources = summary.tokenLedger ? Object.entries(summary.tokenLedger).filter(([, ledger]) => ledger.events > 0).map(([source]) => source) : [];
  const tokenSource = ledgerSources.length > 0 ? ledgerSources.join(' + ') : summary.tokenSource;
  const finale = summary.stageFinaleStarted
    ? `${summary.completionReason === 'final-threat' ? 'Final threat contact' : summary.completionReason === 'revival-choice' ? 'Revival choice' : 'Stage timer'} · ${formatElapsedTime(summary.stageFinaleDurationSeconds ?? 0)} end sequence · ${summary.finaleThreatsSpawned ?? 0} threat${summary.finaleThreatsSpawned === 1 ? '' : 's'}`
    : 'Final threat sequence not reached';
  return {
    outcome,
    hero: `${summary.heroName} · Level ${summary.level}`,
    duration: formatElapsedTime(summary.elapsedSeconds),
    tokens: String(summary.tokens),
    tokenSource: `${tokenSource} / ${summary.tokenAccuracy}`,
    gold: String(summary.gold),
    guildWallet: String(guildGold),
    enemies: `${summary.enemiesSpawned} / ${summary.enemiesDefeated}`,
    goldBreakdown: summary.gold > 0 ? `${detailedGoldBreakdown} · Stage +${stageCompletionGold}${stageBasisCopy ? ` (${stageBasisCopy})` : ''} · Level-up +${levelUpGold}` : detailedGoldBreakdown,
    upgrades: summary.upgrades.length > 0 ? summary.upgrades : ['No upgrades selected'],
    treasureRewards: summary.treasureRewards && summary.treasureRewards.length > 0 ? summary.treasureRewards : ['No treasure rewards'],
    revival: `${summary.revivalsUsed ?? 0} used · ${summary.revivalsRemaining ?? 0} remaining${summary.stageFinaleStarted ? ' · finale reached' : ''}`,
    finale,
    damage,
    announcement: `${outcome}. ${summary.heroName}, level ${summary.level}. ${summary.tokens} tokens, ${summary.gold} gold, ${summary.enemiesSpawned} enemies spawned and ${summary.enemiesDefeated} defeated.`
  };
}
