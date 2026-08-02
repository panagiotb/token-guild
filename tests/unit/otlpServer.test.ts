import { afterEach, describe, expect, it } from 'vitest';
import * as http from 'node:http';
import { extractOtelLogEvents, extractOtelLogEventsBinary, extractOtlpEvents, extractOtlpEventsBinary, isLoopbackAddress, OtlpTelemetryServer } from '../../src/telemetry/otlpServer';
import type { TokenStreamEvent } from '../../src/shared/types';
import codexFixture from '../fixtures/codex-response-completed.json';

const span = (spanId = 'span-1') => ({
  traceId: 'trace-1', spanId, name: 'llm.call', startTimeUnixNano: '1000000000000', endTimeUnixNano: '3000000000000',
  attributes: [
    { key: 'gen_ai.request.model', value: { stringValue: 'fixture-model' } },
    { key: 'gen_ai.usage.input_tokens', value: { intValue: '10' } },
    { key: 'gen_ai.usage.output_tokens', value: { intValue: '25' } },
    { key: 'gen_ai.usage.cache_read.input_tokens', value: { intValue: '4' } },
    { key: 'gen_ai.usage.cache_creation.input_tokens', value: { intValue: '2' } }
  ]
});

const payload = (spanId = 'span-1') => ({ resourceSpans: [{ scopeSpans: [{ spans: [span(spanId)] }] }] });
const codexLogPayload = (eventId = 'event-1') => ({ resourceLogs: [{ scopeLogs: [{ logRecords: [{ eventId, timeUnixNano: '4000000000000', body: { stringValue: 'response.completed' }, attributes: [
  { key: 'event.name', value: { stringValue: 'codex.sse_event' } },
  { key: 'event.kind', value: { stringValue: 'response.completed' } },
  { key: 'gen_ai.usage.input_tokens', value: { intValue: '7' } },
  { key: 'gen_ai.usage.output_tokens', value: { intValue: '13' } },
  { key: 'gen_ai.usage.reasoning_tokens', value: { intValue: '5' } },
  { key: 'duration_ms', value: { intValue: '500' } }
] }] }] }] });

const reasoningOnlyLogPayload = () => ({ resourceLogs: [{ scopeLogs: [{ logRecords: [{ eventId: 'reasoning-only', timeUnixNano: '1000000000', attributes: [
  { key: 'event.name', value: { stringValue: 'codex.sse_event' } },
  { key: 'event.kind', value: { stringValue: 'response.completed' } },
  { key: 'gen_ai.usage.input_tokens', value: { intValue: '2' } },
  { key: 'gen_ai.usage.reasoning_tokens', value: { intValue: '8' } }
] }] }] }] });

function request(url: string, body: string | Uint8Array, headers: Record<string, string> = { 'content-type': 'application/json' }): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const req = http.request({ hostname: target.hostname, port: Number(target.port), path: target.pathname, method: 'POST', headers }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

function varint(value: number | bigint): Uint8Array {
  let remaining = BigInt(value);
  const bytes: number[] = [];
  do {
    const next = Number(remaining & 0x7fn);
    remaining >>= 7n;
    bytes.push(next | (remaining > 0n ? 0x80 : 0));
  } while (remaining > 0n);
  return Uint8Array.from(bytes);
}

function concat(...parts: readonly Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}

function field(fieldNumber: number, wire: number, value: Uint8Array): Uint8Array {
  return concat(varint((BigInt(fieldNumber) << 3n) | BigInt(wire)), wire === 2 ? concat(varint(value.length), value) : value);
}

function stringField(fieldNumber: number, value: string): Uint8Array { return field(fieldNumber, 2, new TextEncoder().encode(value)); }
function messageField(fieldNumber: number, value: Uint8Array): Uint8Array { return field(fieldNumber, 2, value); }
function bytesField(fieldNumber: number, value: Uint8Array): Uint8Array { return field(fieldNumber, 2, value); }
function varintField(fieldNumber: number, value: number | bigint): Uint8Array { return field(fieldNumber, 0, varint(value)); }
function fixed64Field(fieldNumber: number, value: bigint): Uint8Array {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, value, true);
  return field(fieldNumber, 1, bytes);
}
function attr(key: string, value: number | string): Uint8Array {
  const any = typeof value === 'string' ? stringField(1, value) : varintField(3, value);
  return concat(stringField(1, key), messageField(2, any));
}
function binaryTracePayload(): Uint8Array {
  const spanBytes = concat(bytesField(1, Uint8Array.from([1, 2])), bytesField(2, Uint8Array.from([3, 4])), stringField(6, 'llm.call'), fixed64Field(8, 1_000_000_000_000n), fixed64Field(9, 3_000_000_000_000n), ...[
    attr('gen_ai.usage.input_tokens', 10), attr('gen_ai.usage.output_tokens', 25), attr('gen_ai.usage.cache_read.input_tokens', 4), attr('gen_ai.usage.cache_creation.input_tokens', 2)
  ].map((entry) => messageField(11, entry)));
  const scopeSpans = messageField(2, spanBytes);
  const resourceSpans = messageField(2, scopeSpans);
  return messageField(1, resourceSpans);
}
function binaryLogPayload(): Uint8Array {
  const record = concat(fixed64Field(1, 4_000_000_000_000n), stringField(12, 'codex.sse_event'), ...[
    attr('event.kind', 'response.completed'), attr('gen_ai.usage.input_tokens', 7), attr('gen_ai.usage.output_tokens', 13), attr('duration_ms', 500)
  ].map((entry) => messageField(6, entry)));
  const scopeLogs = messageField(2, record);
  const resourceLogs = messageField(2, scopeLogs);
  return messageField(1, resourceLogs);
}

describe('OTLP telemetry adapter', () => {
  const servers: OtlpTelemetryServer[] = [];
  afterEach(async () => { await Promise.all(servers.splice(0).map((server) => server.stop())); });

  it('extracts exact token usage from OTLP JSON without retaining model/content', () => {
    const events = extractOtlpEvents(payload());
    expect(events).toHaveLength(1);
    expect(events[0]?.event).toMatchObject({ source: 'otlp', accuracy: 'exact', count: 35, inputTokens: 10, outputTokens: 25, cacheTokens: 6, confidence: 1, runId: 'span-1' } satisfies Partial<TokenStreamEvent>);
    expect(JSON.stringify(events[0])).not.toContain('fixture-model');
  });

  it('extracts exact token usage from OTLP protobuf traces', () => {
    const events = extractOtlpEventsBinary(binaryTracePayload());
    expect(events).toHaveLength(1);
    expect(events[0]?.event).toMatchObject({ source: 'otlp', count: 35, inputTokens: 10, outputTokens: 25, cacheTokens: 6, runId: '0304' } satisfies Partial<TokenStreamEvent>);
  });

  it('extracts Codex response.completed usage from the OTel log envelope', () => {
    const events = extractOtelLogEvents(codexFixture);
    expect(events).toHaveLength(1);
    expect(events[0]?.event).toMatchObject({ source: 'otlp', count: 20, inputTokens: 7, outputTokens: 13, reasoningTokens: 5, tokensPerSecond: 40, runId: 'fixture-completion-001' });
    expect(JSON.stringify(events[0])).not.toContain('response.completed');
  });

  it('extracts Codex response.completed usage from OTel protobuf logs', () => {
    const events = extractOtelLogEventsBinary(binaryLogPayload());
    expect(events).toHaveLength(1);
    expect(events[0]?.event).toMatchObject({ source: 'otlp', count: 20, inputTokens: 7, outputTokens: 13, tokensPerSecond: 40 });
  });

  it('retains reasoning detail without double-counting generated output', () => {
    const events = extractOtelLogEvents(reasoningOnlyLogPayload());
    expect(events[0]?.event).toMatchObject({ count: 10, inputTokens: 2, outputTokens: 8, reasoningTokens: 8 });
  });

  it('accepts a fixture once and suppresses duplicate span IDs', async () => {
    const received: TokenStreamEvent[] = [];
    const server = new OtlpTelemetryServer({ port: 0, onEvent: (event) => received.push(event) });
    servers.push(server);
    await server.start();
    const endpoint = server.address!;
    expect((await request(endpoint, JSON.stringify(payload()))).status).toBe(200);
    expect((await request(endpoint, JSON.stringify(payload()))).body).toContain('"accepted":0');
    expect(received).toHaveLength(1);
  });

  it('accepts binary traces on the OTLP endpoint and deduplicates them', async () => {
    const received: TokenStreamEvent[] = [];
    const server = new OtlpTelemetryServer({ port: 0, onEvent: (event) => received.push(event) });
    servers.push(server);
    await server.start();
    const headers = { 'content-type': 'application/x-protobuf' };
    expect((await request(server.address!, binaryTracePayload(), headers)).status).toBe(200);
    expect((await request(server.address!, binaryTracePayload(), headers)).body).toContain('"accepted":0');
    expect(received).toHaveLength(1);
  });

  it('accepts Codex logs on /v1/logs and suppresses duplicate event IDs', async () => {
    const received: TokenStreamEvent[] = [];
    const server = new OtlpTelemetryServer({ port: 0, onEvent: (event) => received.push(event) });
    servers.push(server);
    await server.start();
    expect((await request(server.logsAddress!, JSON.stringify(codexLogPayload()))).status).toBe(200);
    expect((await request(server.logsAddress!, JSON.stringify(codexLogPayload()))).body).toContain('"accepted":0');
    expect(received).toHaveLength(1);
  });

  it('rejects malformed, unsupported, and oversized requests without callbacks', async () => {
    const received: TokenStreamEvent[] = [];
    expect(() => extractOtlpEventsBinary(binaryTracePayload(), 0)).toThrow('Invalid protobuf span limit');
    const server = new OtlpTelemetryServer({ port: 0, maxBodyBytes: 1024, onEvent: (event) => received.push(event) });
    servers.push(server);
    await server.start();
    const endpoint = server.address!;
    expect((await request(endpoint, '{')).status).toBe(400);
    expect((await request(endpoint, Uint8Array.from([0xff]), { 'content-type': 'application/x-protobuf' })).status).toBe(400);
    expect((await request(endpoint, 'x'.repeat(1100))).status).toBe(413);
    expect(received).toHaveLength(0);
  });

  it('rejects wrong paths and compressed payloads', async () => {
    const server = new OtlpTelemetryServer({ port: 0, onEvent: () => undefined });
    servers.push(server);
    await server.start();
    const endpoint = new URL(server.address!);
    expect((await request(`http://127.0.0.1:${endpoint.port}/v1/metrics`, '{}')).status).toBe(404);
    expect((await request(server.address!, JSON.stringify(payload()), { 'content-type': 'application/json', 'content-encoding': 'gzip' })).status).toBe(415);
  });

  it('enforces loopback policy and clears listener state on idempotent teardown', async () => {
    expect(isLoopbackAddress('127.0.0.1')).toBe(true);
    expect(isLoopbackAddress('::1')).toBe(true);
    expect(isLoopbackAddress('::ffff:127.0.0.1')).toBe(true);
    expect(isLoopbackAddress('10.0.0.4')).toBe(false);
    const server = new OtlpTelemetryServer({ port: 0, onEvent: () => undefined });
    servers.push(server);
    await server.start();
    expect(server.listening).toBe(true);
    await server.stop();
    await server.stop();
    expect(server.listening).toBe(false);
  });

  it('reports a port conflict without leaving the second server listening', async () => {
    const first = new OtlpTelemetryServer({ port: 0, onEvent: () => undefined });
    servers.push(first);
    await first.start();
    const address = new URL(first.address!);
    const second = new OtlpTelemetryServer({ port: Number(address.port), onEvent: () => undefined });
    servers.push(second);
    await expect(second.start()).rejects.toBeTruthy();
    expect(second.listening).toBe(false);
  });
});
