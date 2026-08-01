import { afterEach, describe, expect, it } from 'vitest';
import * as http from 'node:http';
import { extractOtlpEvents, isLoopbackAddress, OtlpTelemetryServer } from '../../src/telemetry/otlpServer';
import type { TokenStreamEvent } from '../../src/shared/types';

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

function request(url: string, body: string, headers: Record<string, string> = { 'content-type': 'application/json' }): Promise<{ status: number; body: string }> {
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

describe('OTLP telemetry adapter', () => {
  const servers: OtlpTelemetryServer[] = [];
  afterEach(async () => { await Promise.all(servers.splice(0).map((server) => server.stop())); });

  it('extracts exact token usage from OTLP JSON without retaining model/content', () => {
    const events = extractOtlpEvents(payload());
    expect(events).toHaveLength(1);
    expect(events[0]?.event).toMatchObject({ source: 'otlp', accuracy: 'exact', count: 35, inputTokens: 10, outputTokens: 25, cacheTokens: 6, confidence: 1, runId: 'span-1' } satisfies Partial<TokenStreamEvent>);
    expect(JSON.stringify(events[0])).not.toContain('fixture-model');
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

  it('rejects malformed, unsupported, and oversized requests without callbacks', async () => {
    const received: TokenStreamEvent[] = [];
    const server = new OtlpTelemetryServer({ port: 0, maxBodyBytes: 1024, onEvent: (event) => received.push(event) });
    servers.push(server);
    await server.start();
    const endpoint = server.address!;
    expect((await request(endpoint, '{')).status).toBe(400);
    expect((await request(endpoint, JSON.stringify(payload()), { 'content-type': 'application/x-protobuf' })).status).toBe(415);
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
