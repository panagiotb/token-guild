import { applyTokenInput, finishRun, grantBossReward } from './simulation';
import type { RunState } from './types';

export type GameplayTelemetryEvent =
  | { type: 'tokens'; count: number; tokensPerSecond: number }
  | { type: 'thinking'; durationMs: number }
  | { type: 'error' }
  | { type: 'complete'; exitCode: 0 };

export function applyGameplayTelemetry(state: RunState, event: GameplayTelemetryEvent): RunState {
  if (state.phase !== 'dungeon') return state;
  if (event.type === 'tokens') return applyTokenInput(state, event);
  if (event.type === 'thinking') {
    if (!Number.isFinite(event.durationMs) || event.durationMs < 0) throw new Error('Thinking duration must be non-negative');
    state.powerChargeReady = event.durationMs >= 3000;
  } else if (event.type === 'error') {
    state.hazardsTriggered += 1;
    state.hero.stats.hp -= Math.max(1, 10 - state.hero.stats.armor);
    if (state.hero.stats.hp <= 0) finishRun(state, 'defeat');
  } else {
    state.bossSpawned = true;
    state.enemies = state.enemies.filter((enemy) => !enemy.isBoss);
    grantBossReward(state);
    finishRun(state, 'victory');
  }
  return state;
}
