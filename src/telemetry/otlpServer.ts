import * as http from 'node:http';
import type { TokenStreamEvent } from '../shared/types';
import { decodeOtelLogRecords, decodeOtlpTraceSpans } from './otlpProtobuf';

export const DEFAULT_OTLP_PORT = 4318;
export const DEFAULT_OTLP_PATH = '/v1/traces';
export const DEFAULT_OTEL_LOG_PATH = '/v1/logs';
export const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
export const DEFAULT_MAX_SPANS = 512;
export const DEFAULT_MAX_SEEN_SPANS = 4096;

interface OtlpAttribute {
  readonly key?: unknown;
  readonly value?: unknown;
}

interface ParsedOtlpEvent {
  readonly key: string;
  readonly event: TokenStreamEvent;
}

export interface OtlpTelemetryServerOptions {
  readonly port?: number;
  readonly maxBodyBytes?: number;
  readonly maxSpans?: number;
  readonly maxSeenSpans?: number;
  readonly onEvent: (event: TokenStreamEvent) => void;
}

export class OtlpPayloadError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'OtlpPayloadError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function attributeValue(attribute: OtlpAttribute): unknown {
  if (!isRecord(attribute.value)) return attribute.value;
  const value = attribute.value;
  if ('intValue' in value) return value.intValue;
  if ('doubleValue' in value) return value.doubleValue;
  if ('stringValue' in value) return value.stringValue;
  if ('boolValue' in value) return value.boolValue;
  return undefined;
}

function attributes(span: Record<string, unknown>): Map<string, unknown> {
  const result = new Map<string, unknown>();
  if (!Array.isArray(span.attributes)) return result;
  for (const raw of span.attributes) {
    if (!isRecord(raw) || typeof raw.key !== 'string' || raw.key.length === 0 || raw.key.length > 256) continue;
    result.set(raw.key, attributeValue(raw as OtlpAttribute));
  }
  return result;
}

function timestampMs(span: Record<string, unknown>): number {
  const end = finiteNumber(span.endTimeUnixNano);
  const start = finiteNumber(span.startTimeUnixNano);
  const selected = end ?? start;
  if (selected === undefined || selected < 0) return Date.now();
  const milliseconds = selected / 1_000_000;
  return Number.isSafeInteger(milliseconds) || Number.isFinite(milliseconds) ? milliseconds : Date.now();
}

function recordTimestampMs(record: Record<string, unknown>): number {
  const value = finiteNumber(record.timeUnixNano) ?? finiteNumber(record.observedTimeUnixNano);
  if (value === undefined || value < 0) return Date.now();
  const milliseconds = value / 1_000_000;
  return Number.isFinite(milliseconds) ? milliseconds : Date.now();
}

function durationSeconds(span: Record<string, unknown>): number {
  const start = finiteNumber(span.startTimeUnixNano);
  const end = finiteNumber(span.endTimeUnixNano);
  if (start === undefined || end === undefined || end <= start) return 0;
  return Math.min(86_400, (end - start) / 1_000_000_000);
}

function numericAttribute(values: Map<string, unknown>, ...keys: readonly string[]): number {
  for (const key of keys) {
    const value = finiteNumber(values.get(key));
    if (value !== undefined && value >= 0 && value <= Number.MAX_SAFE_INTEGER) return Math.floor(value);
  }
  return 0;
}

function spanKey(span: Record<string, unknown>, fallback: string): string {
  const spanId = typeof span.spanId === 'string' ? span.spanId.trim() : '';
  if (spanId.length > 0 && spanId.length <= 128) return spanId;
  const traceId = typeof span.traceId === 'string' ? span.traceId.trim() : '';
  const name = typeof span.name === 'string' ? span.name.slice(0, 128) : '';
  const start = typeof span.startTimeUnixNano === 'string' || typeof span.startTimeUnixNano === 'number' ? String(span.startTimeUnixNano) : '';
  return `${traceId}|${name}|${start}|${fallback}`;
}

function parseSpan(span: unknown, fallback: string): ParsedOtlpEvent | undefined {
  if (!isRecord(span)) return undefined;
  const values = attributes(span);
  const inputTokens = numericAttribute(values, 'gen_ai.usage.input_tokens', 'gen_ai.usage.prompt_tokens');
  const reportedOutputTokens = numericAttribute(values, 'gen_ai.usage.output_tokens', 'gen_ai.usage.completion_tokens');
  const reasoningTokens = numericAttribute(values, 'gen_ai.usage.reasoning_tokens', 'gen_ai.usage.output_tokens.reasoning', 'reasoning_tokens', 'output_tokens.reasoning');
  // GenAI usage reports reasoning as a detail of total output. If a producer
  // sends only the detail, retain it as the generated total rather than
  // silently dropping a billable completion.
  const outputTokens = reportedOutputTokens > 0 ? reportedOutputTokens : reasoningTokens;
  const cacheRead = numericAttribute(values, 'gen_ai.usage.cache_read.input_tokens');
  const cacheWrite = numericAttribute(values, 'gen_ai.usage.cache_creation.input_tokens');
  const cacheTokens = cacheRead + cacheWrite;
  const count = inputTokens + outputTokens;
  if (count <= 0) return undefined;
  const seconds = durationSeconds(span);
  const rate = seconds > 0 ? count / seconds : count;
  const key = spanKey(span, fallback);
  return {
    key,
    event: {
      source: 'otlp',
      accuracy: 'exact',
      timestampMs: timestampMs(span),
      count,
      tokensPerSecond: Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, rate)),
      confidence: 1,
      inputTokens,
      outputTokens,
      ...(reasoningTokens > 0 ? { reasoningTokens } : {}),
      cacheTokens,
      isAgentActive: true,
      runId: key
    }
  };
}

export function extractOtlpEvents(payload: unknown, maxSpans = DEFAULT_MAX_SPANS): readonly ParsedOtlpEvent[] {
  if (!isRecord(payload) || !Array.isArray(payload.resourceSpans)) throw new OtlpPayloadError('OTLP payload must contain resourceSpans');
  if (!Number.isInteger(maxSpans) || maxSpans < 1) throw new OtlpPayloadError('Invalid OTLP span limit');
  const events: ParsedOtlpEvent[] = [];
  let seenSpans = 0;
  for (const resourceSpan of payload.resourceSpans) {
    if (!isRecord(resourceSpan) || !Array.isArray(resourceSpan.scopeSpans)) continue;
    for (const scopeSpan of resourceSpan.scopeSpans) {
      if (!isRecord(scopeSpan) || !Array.isArray(scopeSpan.spans)) continue;
      for (const span of scopeSpan.spans) {
        seenSpans += 1;
        if (seenSpans > maxSpans) throw new OtlpPayloadError('OTLP payload contains too many spans');
        const parsed = parseSpan(span, `${seenSpans}`);
        if (parsed) events.push(parsed);
      }
    }
  }
  return events;
}

/** Decode the OTLP/HTTP protobuf trace envelope and reuse the JSON
 * normalization path. Only scalar usage attributes and timing/identity
 * fields are retained by the decoder. */
export function extractOtlpEventsBinary(payload: Uint8Array, maxSpans = DEFAULT_MAX_SPANS): readonly ParsedOtlpEvent[] {
  const spans = decodeOtlpTraceSpans(payload, maxSpans);
  return extractOtlpEvents({ resourceSpans: [{ scopeSpans: [{ spans }] }] }, maxSpans);
}

/**
 * Parses the JSON representation of the documented Codex OTel log envelope.
 * Only numeric usage attributes from response.completed events are retained;
 * bodies, prompts, model names, tool arguments, and result text are ignored.
 */
export function extractOtelLogEvents(payload: unknown, maxRecords = DEFAULT_MAX_SPANS): readonly ParsedOtlpEvent[] {
  if (!isRecord(payload) || !Array.isArray(payload.resourceLogs)) throw new OtlpPayloadError('OTel log payload must contain resourceLogs');
  if (!Number.isInteger(maxRecords) || maxRecords < 1) throw new OtlpPayloadError('Invalid OTel log record limit');
  const events: ParsedOtlpEvent[] = [];
  let seenRecords = 0;
  for (const resourceLog of payload.resourceLogs) {
    if (!isRecord(resourceLog) || !Array.isArray(resourceLog.scopeLogs)) continue;
    for (const scopeLog of resourceLog.scopeLogs) {
      if (!isRecord(scopeLog) || !Array.isArray(scopeLog.logRecords)) continue;
      for (const rawRecord of scopeLog.logRecords) {
        seenRecords += 1;
        if (seenRecords > maxRecords) throw new OtlpPayloadError('OTel payload contains too many log records');
        if (!isRecord(rawRecord)) continue;
        const values = attributes(rawRecord);
        const eventName = [values.get('event.name'), values.get('event_name'), values.get('codex.event'), values.get('codex.event.name'), values.get('name')].find((value): value is string => typeof value === 'string');
        const eventKind = [values.get('event.kind'), values.get('codex.sse_event.kind'), values.get('codex.sse_event.event')].find((value): value is string => typeof value === 'string');
        if (eventName && eventName !== 'codex.sse_event' && !eventName.includes('sse_event')) continue;
        if (eventKind && eventKind !== 'response.completed') continue;
        const inputTokens = numericAttribute(values, 'gen_ai.usage.input_tokens', 'gen_ai.usage.prompt_tokens', 'usage.input_tokens', 'input_tokens');
        const reportedOutputTokens = numericAttribute(values, 'gen_ai.usage.output_tokens', 'gen_ai.usage.completion_tokens', 'usage.output_tokens', 'output_tokens');
        const reasoningTokens = numericAttribute(values, 'gen_ai.usage.reasoning_tokens', 'gen_ai.usage.output_tokens.reasoning', 'usage.reasoning_tokens', 'reasoning_tokens', 'output_tokens.reasoning');
        const outputTokens = reportedOutputTokens > 0 ? reportedOutputTokens : reasoningTokens;
        const cacheTokens = numericAttribute(values, 'gen_ai.usage.cache_read.input_tokens', 'gen_ai.usage.cache_creation.input_tokens', 'usage.cache_tokens', 'cache_tokens');
        const count = inputTokens + outputTokens;
        if (count <= 0) continue;
        const durationMs = numericAttribute(values, 'duration_ms', 'codex.sse_event.duration_ms');
        const duration = durationMs > 0 ? durationMs / 1000 : 0;
        const spanId = typeof rawRecord.spanId === 'string' ? rawRecord.spanId.trim() : '';
        const eventId = typeof rawRecord.eventId === 'string' ? rawRecord.eventId.trim() : '';
        const traceId = typeof rawRecord.traceId === 'string' ? rawRecord.traceId.trim() : '';
        const key = (eventId || spanId || `${traceId}|${recordTimestampMs(rawRecord)}|${seenRecords}`).slice(0, 256);
        events.push({ key, event: { source: 'otlp', accuracy: 'exact', timestampMs: recordTimestampMs(rawRecord), count, tokensPerSecond: duration > 0 ? count / duration : count, confidence: 1, inputTokens, outputTokens, ...(reasoningTokens > 0 ? { reasoningTokens } : {}), cacheTokens, isAgentActive: true, runId: key } });
      }
    }
  }
  return events;
}

/** Decode the OTLP/HTTP protobuf log envelope and reuse the privacy-tested
 * JSON log normalization path. */
export function extractOtelLogEventsBinary(payload: Uint8Array, maxRecords = DEFAULT_MAX_SPANS): readonly ParsedOtlpEvent[] {
  const records = decodeOtelLogRecords(payload, maxRecords);
  return extractOtelLogEvents({ resourceLogs: [{ scopeLogs: [{ logRecords: records }] }] }, maxRecords);
}

export function isLoopbackAddress(address: string | undefined): boolean {
  if (!address) return false;
  const normalized = address.startsWith('::ffff:') ? address.slice('::ffff:'.length) : address;
  return normalized === '127.0.0.1' || normalized === '::1';
}

function jsonContentType(value: string | undefined): boolean {
  return value?.split(';', 1)[0]?.trim().toLowerCase() === 'application/json';
}

function binaryContentType(value: string | undefined): boolean {
  const contentType = value?.split(';', 1)[0]?.trim().toLowerCase();
  return contentType === 'application/x-protobuf' || contentType === 'application/protobuf';
}

export class OtlpTelemetryServer {
  private readonly port: number;
  private readonly maxBodyBytes: number;
  private readonly maxSpans: number;
  private readonly seenKeys = new Set<string>();
  private readonly seenQueue: string[] = [];
  private server: http.Server | undefined;
  private stopping: Promise<void> | undefined;

  public constructor(private readonly options: OtlpTelemetryServerOptions) {
    this.port = options.port ?? DEFAULT_OTLP_PORT;
    this.maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
    this.maxSpans = options.maxSpans ?? DEFAULT_MAX_SPANS;
    const maxSeenSpans = options.maxSeenSpans ?? DEFAULT_MAX_SEEN_SPANS;
    if (!Number.isInteger(this.port) || this.port < 0 || this.port > 65_535) throw new Error('OTLP port must be between 0 and 65535');
    if (!Number.isInteger(this.maxBodyBytes) || this.maxBodyBytes < 1024) throw new Error('OTLP body limit is too small');
    if (!Number.isInteger(this.maxSpans) || this.maxSpans < 1) throw new Error('OTLP span limit must be positive');
    if (!Number.isInteger(maxSeenSpans) || maxSeenSpans < 1) throw new Error('OTLP dedupe limit must be positive');
    this.maxSeen = maxSeenSpans;
  }

  private readonly maxSeen: number;

  public get listening(): boolean { return this.server?.listening === true; }

  public get address(): string | undefined {
    const address = this.server?.address();
    if (!address || typeof address === 'string') return address ?? undefined;
    return `http://127.0.0.1:${address.port}${DEFAULT_OTLP_PATH}`;
  }

  public get logsAddress(): string | undefined {
    const address = this.server?.address();
    if (!address || typeof address === 'string') return address ? undefined : undefined;
    return `http://127.0.0.1:${address.port}${DEFAULT_OTEL_LOG_PATH}`;
  }

  public async start(): Promise<void> {
    if (this.server?.listening) return;
    this.seenKeys.clear();
    this.seenQueue.length = 0;
    const server = http.createServer((request, response) => { void this.handle(request, response); });
    this.server = server;
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error): void => { server.off('listening', onListening); reject(error); };
      const onListening = (): void => { server.off('error', onError); resolve(); };
      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(this.port, '127.0.0.1');
    }).catch((error) => {
      this.server = undefined;
      server.close();
      throw error;
    });
  }

  public async stop(): Promise<void> {
    if (this.stopping) return this.stopping;
    const server = this.server;
    this.server = undefined;
    this.seenKeys.clear();
    this.seenQueue.length = 0;
    if (!server) return;
    this.stopping = new Promise<void>((resolve) => {
      server.close(() => resolve());
    }).finally(() => { this.stopping = undefined; });
    return this.stopping;
  }

  private remember(key: string): boolean {
    if (this.seenKeys.has(key)) return false;
    this.seenKeys.add(key);
    this.seenQueue.push(key);
    while (this.seenQueue.length > this.maxSeen) {
      const oldest = this.seenQueue.shift();
      if (oldest) this.seenKeys.delete(oldest);
    }
    return true;
  }

  private async handle(request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
    response.setHeader('Cache-Control', 'no-store');
    if (!isLoopbackAddress(request.socket.remoteAddress)) {
      response.writeHead(403, { 'Content-Type': 'application/json' }); response.end('{"error":"Loopback only"}'); request.resume(); return;
    }
    if (request.method !== 'POST' || (request.url !== DEFAULT_OTLP_PATH && request.url !== DEFAULT_OTEL_LOG_PATH)) {
      response.writeHead(404, { 'Content-Type': 'application/json' }); response.end('{"error":"Not found"}'); request.resume(); return;
    }
    const isJson = jsonContentType(request.headers['content-type']);
    const isBinary = binaryContentType(request.headers['content-type']);
    if ((!isJson && !isBinary) || (request.headers['content-encoding'] && request.headers['content-encoding'] !== 'identity')) {
      response.writeHead(415, { 'Content-Type': 'application/json' }); response.end('{"error":"OTLP JSON or protobuf without content encoding required"}'); request.resume(); return;
    }
    const length = finiteNumber(request.headers['content-length']);
    if (length !== undefined && length > this.maxBodyBytes) {
      response.writeHead(413, { 'Content-Type': 'application/json' }); response.end('{"error":"Payload too large"}'); request.resume(); return;
    }
    let total = 0;
    const chunks: Buffer[] = [];
    let rejected = false;
    request.setTimeout(5_000, () => { rejected = true; request.destroy(); });
    request.on('data', (chunk: Buffer | string) => {
      if (rejected) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.length;
      if (total > this.maxBodyBytes) { rejected = true; response.writeHead(413, { 'Content-Type': 'application/json' }); response.end('{"error":"Payload too large"}'); request.resume(); return; }
      chunks.push(buffer);
    });
    request.on('error', () => { rejected = true; });
    await new Promise<void>((resolve) => {
      let settled = false;
      const settle = (): void => { if (settled) return; settled = true; resolve(); };
      request.on('end', settle);
      request.on('close', settle);
      request.on('error', settle);
    });
    if (rejected || response.writableEnded) return;
    const body = Buffer.concat(chunks);
    let payload: unknown;
    if (isJson) {
      try { payload = JSON.parse(body.toString('utf8')) as unknown; }
      catch { response.writeHead(400, { 'Content-Type': 'application/json' }); response.end('{"error":"Invalid JSON"}'); return; }
    } else payload = body;
    let parsed: readonly ParsedOtlpEvent[];
    try {
      if (request.url === DEFAULT_OTEL_LOG_PATH) parsed = isBinary ? extractOtelLogEventsBinary(payload as Uint8Array, this.maxSpans) : extractOtelLogEvents(payload, this.maxSpans);
      else parsed = isBinary ? extractOtlpEventsBinary(payload as Uint8Array, this.maxSpans) : extractOtlpEvents(payload, this.maxSpans);
    } catch { response.writeHead(400, { 'Content-Type': 'application/json' }); response.end(`{"error":"Invalid OTLP ${isBinary ? 'protobuf' : 'JSON'} payload"}`); return; }
    let accepted = 0;
    for (const item of parsed) {
      if (!this.remember(item.key)) continue;
      accepted += 1;
      this.options.onEvent(item.event);
    }
    response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ accepted }));
  }
}
