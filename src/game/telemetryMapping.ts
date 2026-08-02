import { applyTokenInput } from './simulation';
import type { RunState } from './types';

export type GameplayTelemetryEvent =
  | { type: 'tokens'; count: number; tokensPerSecond: number; outputTokens?: number; inputTokens?: number; cacheTokens?: number; isAgentActive?: boolean };

export function applyGameplayTelemetry(state: RunState, event: GameplayTelemetryEvent): RunState {
  if (state.phase !== 'dungeon') return state;
  return applyTokenInput(state, event);
}
