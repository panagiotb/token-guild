import type { RunState } from '../game/types';

export const PROTOCOL_VERSION = 1 as const;
export const PROGRESS_SCHEMA_VERSION = 3 as const;

export type Accuracy = 'exact' | 'estimated';
export type TelemetrySource = 'synthetic' | 'otlp' | 'proxy' | 'buffer';
export type TelemetryHealth = 'disabled' | 'waiting' | 'receiving' | 'error';

export interface HeroProgressRecord {
  readonly highestLevel: number;
}

export interface TokenStreamEvent {
  readonly source: TelemetrySource;
  readonly accuracy: Accuracy;
  readonly timestampMs: number;
  readonly count: number;
  readonly tokensPerSecond: number;
  readonly confidence: number;
  readonly outputTokens?: number;
  /** Optional reasoning-token detail reported by a completion producer. The
   * normalized output count remains the producer's total generated tokens so
   * reasoning is diagnostic and is never charged twice. */
  readonly reasoningTokens?: number;
  readonly inputTokens?: number;
  readonly cacheTokens?: number;
  readonly isAgentActive?: boolean;
  readonly runId?: string;
}

export interface PersistedProgress {
  readonly schemaVersion: typeof PROGRESS_SCHEMA_VERSION;
  readonly gold: number;
  readonly unlockedHeroes: readonly string[];
  readonly unlockedStages: readonly string[];
  readonly relics: readonly string[];
  readonly upgrades: Readonly<Record<string, number>>;
  readonly heroRecords: Readonly<Record<string, HeroProgressRecord>>;
  readonly runCount: number;
  readonly totalTokens: number;
  readonly batteryLevel: number;
  readonly completedRunIds: readonly string[];
  readonly settings: { readonly muted: boolean; readonly volume: number };
}

/**
 * A canonical, structured-clone-safe render snapshot owned by the extension
 * host. The simulation state is intentionally sent as data only; the webview
 * may render it, but persistent rewards are still derived from the host copy.
 */
export interface RunSnapshot {
  readonly runId: string;
  readonly sequence: number;
  /** Next client intent sequence accepted by the host for this run. */
  readonly nextIntentSequence: number;
  readonly state: RunState;
}

export type HostToWebviewMessage =
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'TOKEN_STREAM'; readonly payload: TokenStreamEvent }
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'LOAD_PROGRESS'; readonly payload: PersistedProgress }
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'TELEMETRY_STATUS'; readonly payload: { readonly syntheticEnabled: boolean; readonly otlpEnabled: boolean; readonly endpoint?: string; readonly health: TelemetryHealth; readonly acceptedEvents: number; readonly lastEventAt?: number; readonly error?: string } }
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'RUN_SUMMARY'; readonly payload: { readonly gold: number; readonly tokens: number } }
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'RUN_SNAPSHOT'; readonly payload: RunSnapshot }
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'RUN_ERROR'; readonly payload: { readonly runId: string; readonly message: string; readonly nextIntentSequence?: number } };

export type WebviewToHostMessage =
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'READY' }
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'PURCHASE_UPGRADE'; readonly payload: { readonly upgradeId: string } }
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'PURCHASE_BATTERY'; }
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'REFUND_UPGRADES' }
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'UPDATE_SETTINGS'; readonly payload: { readonly muted: boolean; readonly volume: number } }
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'UPDATE_TELEMETRY_SETTINGS'; readonly payload: { readonly syntheticEnabled: boolean } }
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'RECORD_RUN_REWARD'; readonly payload: { readonly runId: string } }
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'START_RUN'; readonly payload: { readonly heroId: string; readonly stageId: string; readonly runId: string } }
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'RUN_STEP'; readonly payload: { readonly runId: string; readonly intentSequence: number; readonly deltaSeconds: number; readonly input: { readonly up: boolean; readonly down: boolean; readonly left: boolean; readonly right: boolean } } }
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'RUN_TELEMETRY'; readonly payload: { readonly runId: string; readonly intentSequence: number; readonly event: TokenStreamEvent } }
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'RUN_ACTION'; readonly payload: { readonly runId: string; readonly intentSequence: number; readonly action: 'upgrade' | 'reroll' | 'skip' | 'banish' | 'revive' | 'quit' | 'pause' | 'resume'; readonly cardId?: string } }
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'RESET_PROGRESS' };
