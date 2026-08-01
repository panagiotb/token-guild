import { PROGRESS_SCHEMA_VERSION } from './types';
import type { PersistedProgress, TokenStreamEvent, WebviewToHostMessage } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isSafeKey(value: string, maxLength: number): boolean {
  return value.length > 0 && value.length <= maxLength && value !== '__proto__' && value !== 'constructor' && value !== 'prototype';
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
  for (const field of ['outputTokens', 'inputTokens', 'cacheTokens'] as const) {
    if (value[field] !== undefined && (!isFiniteNumber(value[field]) || value[field] < 0)) throw new Error('Token telemetry fields are out of range');
  }
  if (value.isAgentActive !== undefined && typeof value.isAgentActive !== 'boolean') throw new Error('Invalid agent activity flag');
  if (value.runId !== undefined && (typeof value.runId !== 'string' || value.runId.length > 128)) {
    throw new Error('Invalid token stream run ID');
  }
  return value as unknown as TokenStreamEvent;
}

export function validateProgress(value: unknown): PersistedProgress {
  if (!isRecord(value) || value.schemaVersion !== PROGRESS_SCHEMA_VERSION || !isFiniteNumber(value.gold) || !isFiniteNumber(value.runCount) || !isFiniteNumber(value.totalTokens) || !isFiniteNumber(value.batteryLevel) || !Array.isArray(value.unlockedHeroes) || !Array.isArray(value.unlockedStages) || !Array.isArray(value.relics) || !Array.isArray(value.completedRunIds) || !isRecord(value.upgrades) || !isRecord(value.heroRecords) || !isRecord(value.settings)) {
    throw new Error('Invalid persisted progress');
  }
  if (value.gold < 0 || value.runCount < 0 || value.totalTokens < 0 || !Number.isInteger(value.batteryLevel) || value.batteryLevel < 1 || value.batteryLevel > 5 || value.unlockedHeroes.some((hero) => typeof hero !== 'string' || !isSafeKey(hero, 64)) || value.unlockedStages.some((stage) => typeof stage !== 'string' || !isSafeKey(stage, 64)) || value.relics.some((relic) => typeof relic !== 'string' || !isSafeKey(relic, 64)) || value.completedRunIds.some((runId) => typeof runId !== 'string' || runId.length === 0 || runId.length > 128)) {
    throw new Error('Persisted progress contains invalid values');
  }
  for (const [upgradeId, rank] of Object.entries(value.upgrades)) {
    if (!isSafeKey(upgradeId, 64) || !isFiniteNumber(rank) || rank < 0 || !Number.isInteger(rank)) throw new Error('Invalid upgrade rank');
  }
  for (const [heroId, record] of Object.entries(value.heroRecords)) {
    if (!isSafeKey(heroId, 64) || !isRecord(record) || !isFiniteNumber(record.highestLevel) || !Number.isInteger(record.highestLevel) || record.highestLevel < 1 || record.highestLevel > 999) {
      throw new Error('Invalid hero progression record');
    }
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
    if (!isRecord(reward) || typeof reward.runId !== 'string' || reward.runId.length === 0 || reward.runId.length > 128 || !isFiniteNumber(reward.gold) || reward.gold < 0 || !isFiniteNumber(reward.tokens) || reward.tokens < 0) throw new Error('Invalid run reward payload');
    const hasHeroProgress = reward.heroId !== undefined || reward.level !== undefined;
    if (hasHeroProgress && (typeof reward.heroId !== 'string' || reward.heroId.length === 0 || reward.heroId.length > 64 || !isFiniteNumber(reward.level) || !Number.isInteger(reward.level) || reward.level < 1 || reward.level > 999)) throw new Error('Invalid hero progression reward');
  }
  return value as WebviewToHostMessage;
}
