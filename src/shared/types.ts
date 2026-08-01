export const PROTOCOL_VERSION = 1 as const;
export const PROGRESS_SCHEMA_VERSION = 3 as const;

export type Accuracy = 'exact' | 'estimated';
export type TelemetrySource = 'synthetic' | 'otlp' | 'proxy' | 'buffer';

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

export type HostToWebviewMessage =
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'TOKEN_STREAM'; readonly payload: TokenStreamEvent }
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'LOAD_PROGRESS'; readonly payload: PersistedProgress }
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'TELEMETRY_STATUS'; readonly payload: { readonly syntheticEnabled: boolean; readonly otlpEnabled: boolean; readonly endpoint?: string } }
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'RUN_SUMMARY'; readonly payload: { readonly gold: number; readonly tokens: number } };

export type WebviewToHostMessage =
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'READY' }
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'SAVE_PROGRESS'; readonly payload: PersistedProgress }
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'RECORD_RUN_REWARD'; readonly payload: { readonly runId: string; readonly gold: number; readonly tokens: number; readonly heroId?: string; readonly level?: number } }
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'START_RUN'; readonly payload: { readonly heroId: string } }
  | { readonly version: typeof PROTOCOL_VERSION; readonly type: 'RESET_PROGRESS' };
