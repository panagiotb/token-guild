import type { PersistedProgress, TokenStreamEvent, WebviewToHostMessage } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function validateTokenStreamEvent(value: unknown): TokenStreamEvent {
  if (!isRecord(value) || !['synthetic', 'otlp', 'proxy', 'buffer'].includes(String(value.source)) || !['exact', 'estimated'].includes(String(value.accuracy))) {
    throw new Error('Invalid token stream source or accuracy');
  }
  if (!isFiniteNumber(value.timestampMs) || !isFiniteNumber(value.count) || !isFiniteNumber(value.tokensPerSecond) || !isFiniteNumber(value.confidence)) {
    throw new Error('Invalid token stream numeric field');
  }
  if (value.count < 0 || value.tokensPerSecond < 0 || value.confidence < 0 || value.confidence > 1) {
    throw new Error('Token stream values are out of range');
  }
  if (value.runId !== undefined && (typeof value.runId !== 'string' || value.runId.length > 128)) {
    throw new Error('Invalid token stream run ID');
  }
  return value as unknown as TokenStreamEvent;
}

export function validateProgress(value: unknown): PersistedProgress {
  if (!isRecord(value) || value.schemaVersion !== 1 || !isFiniteNumber(value.gold) || !isFiniteNumber(value.runCount) || !isFiniteNumber(value.totalTokens) || !Array.isArray(value.unlockedHeroes) || !Array.isArray(value.completedRunIds) || !isRecord(value.upgrades) || !isRecord(value.settings)) {
    throw new Error('Invalid persisted progress');
  }
  if (value.gold < 0 || value.runCount < 0 || value.totalTokens < 0 || value.unlockedHeroes.some((hero) => typeof hero !== 'string' || hero.length === 0 || hero.length > 64) || value.completedRunIds.some((runId) => typeof runId !== 'string' || runId.length === 0 || runId.length > 128)) {
    throw new Error('Persisted progress contains invalid values');
  }
  for (const rank of Object.values(value.upgrades)) {
    if (!isFiniteNumber(rank) || rank < 0 || !Number.isInteger(rank)) throw new Error('Invalid upgrade rank');
  }
  if (new Set(value.completedRunIds).size !== value.completedRunIds.length) throw new Error('Duplicate completed run ID');
  if (typeof value.settings.muted !== 'boolean' || !isFiniteNumber(value.settings.volume) || value.settings.volume < 0 || value.settings.volume > 1) throw new Error('Invalid audio settings');
  return value as unknown as PersistedProgress;
}

export function validateWebviewMessage(value: unknown): WebviewToHostMessage {
  if (!isRecord(value) || value.version !== 1 || typeof value.type !== 'string') throw new Error('Invalid webview message envelope');
  if (!['READY', 'SAVE_PROGRESS', 'RECORD_RUN_REWARD', 'START_RUN', 'RESET_PROGRESS'].includes(value.type)) throw new Error('Unknown webview message type');
  if (value.type === 'SAVE_PROGRESS') validateProgress(value.payload);
  if (value.type === 'START_RUN' && (!isRecord(value.payload) || typeof value.payload.heroId !== 'string' || value.payload.heroId.length > 64)) throw new Error('Invalid start-run payload');
  if (value.type === 'RECORD_RUN_REWARD') {
    const reward = value.payload;
    if (!isRecord(reward) || typeof reward.runId !== 'string' || !isFiniteNumber(reward.gold) || reward.gold < 0 || !isFiniteNumber(reward.tokens) || reward.tokens < 0) throw new Error('Invalid run reward payload');
  }
  return value as WebviewToHostMessage;
}
