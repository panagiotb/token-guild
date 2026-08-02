import { PROGRESS_SCHEMA_VERSION } from './types';
import type { PersistedProgress, TokenStreamEvent, WebviewToHostMessage } from './types';

/** Per-event limits keep a malformed or forged producer from inflating a run
 * before the host can apply its battery/economy rules. These are deliberately
 * generous for a single completion, but finite and shared by every ingress. */
export const MAX_TOKEN_EVENT_COUNT = 1_000_000;
export const MAX_TOKEN_EVENT_RATE = 1_000_000;

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
  if (value.count < 0 || value.count > MAX_TOKEN_EVENT_COUNT || value.tokensPerSecond < 0 || value.tokensPerSecond > MAX_TOKEN_EVENT_RATE || value.confidence < 0 || value.confidence > 1) {
    throw new Error('Token stream values are out of range');
  }
  for (const field of ['outputTokens', 'reasoningTokens', 'inputTokens', 'cacheTokens'] as const) {
    if (value[field] !== undefined && (!isFiniteNumber(value[field]) || value[field] < 0 || value[field] > MAX_TOKEN_EVENT_COUNT)) throw new Error('Token telemetry fields are out of range');
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
  if (!['READY', 'PURCHASE_UPGRADE', 'PURCHASE_BATTERY', 'REFUND_UPGRADES', 'UPDATE_SETTINGS', 'UPDATE_TELEMETRY_SETTINGS', 'RECORD_RUN_REWARD', 'START_RUN', 'RUN_STEP', 'RUN_TELEMETRY', 'RUN_ACTION', 'RESET_PROGRESS'].includes(value.type)) throw new Error('Unknown webview message type');
  if (value.type === 'PURCHASE_UPGRADE' && (!isRecord(value.payload) || typeof value.payload.upgradeId !== 'string' || !isSafeKey(value.payload.upgradeId, 64))) throw new Error('Invalid upgrade purchase payload');
  if (value.type === 'UPDATE_SETTINGS' && (!isRecord(value.payload) || typeof value.payload.muted !== 'boolean' || !isFiniteNumber(value.payload.volume) || value.payload.volume < 0 || value.payload.volume > 1)) throw new Error('Invalid settings payload');
  if (value.type === 'UPDATE_TELEMETRY_SETTINGS' && (!isRecord(value.payload) || typeof value.payload.syntheticEnabled !== 'boolean')) throw new Error('Invalid telemetry settings payload');
  if (value.type === 'START_RUN' && (!isRecord(value.payload) || typeof value.payload.heroId !== 'string' || !isSafeKey(value.payload.heroId, 64) || typeof value.payload.stageId !== 'string' || !isSafeKey(value.payload.stageId, 64) || typeof value.payload.runId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value.payload.runId))) throw new Error('Invalid start-run payload');
  if (value.type === 'RECORD_RUN_REWARD' && (!isRecord(value.payload) || typeof value.payload.runId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value.payload.runId))) throw new Error('Invalid run reward payload');
  if (value.type === 'RUN_STEP') {
    const step = value.payload;
    const input = isRecord(step) ? step.input : undefined;
    if (!isRecord(step) || typeof step.runId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(step.runId) || typeof step.intentSequence !== 'number' || !Number.isSafeInteger(step.intentSequence) || step.intentSequence < 1 || !isFiniteNumber(step.deltaSeconds) || step.deltaSeconds <= 0 || step.deltaSeconds > 0.25 || !isRecord(input) || ['up', 'down', 'left', 'right'].some((key) => typeof input[key] !== 'boolean')) throw new Error('Invalid run step payload');
  }
  if (value.type === 'RUN_TELEMETRY') {
    const telemetry = value.payload;
    if (!isRecord(telemetry) || typeof telemetry.runId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(telemetry.runId) || typeof telemetry.intentSequence !== 'number' || !Number.isSafeInteger(telemetry.intentSequence) || telemetry.intentSequence < 1) throw new Error('Invalid run telemetry payload');
    validateTokenStreamEvent(telemetry.event);
  }
  if (value.type === 'RUN_ACTION') {
    const action = value.payload;
    const cardId = isRecord(action) ? action.cardId : undefined;
    const actionType = isRecord(action) && typeof action.action === 'string' ? action.action : undefined;
    const validCardId = cardId === undefined || (typeof cardId === 'string' && isSafeKey(cardId, 128));
    if (!isRecord(action) || typeof action.runId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(action.runId) || typeof action.intentSequence !== 'number' || !Number.isSafeInteger(action.intentSequence) || action.intentSequence < 1 || !['upgrade', 'reroll', 'skip', 'banish', 'revive', 'quit', 'pause', 'resume'].includes(actionType ?? '') || !validCardId) throw new Error('Invalid run action payload');
  }
  if (value.type === 'RECORD_RUN_REWARD') {
    const reward = value.payload;
    if (!isRecord(reward) || typeof reward.runId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(reward.runId)) throw new Error('Invalid run reward payload');
  }
  return value as WebviewToHostMessage;
}
