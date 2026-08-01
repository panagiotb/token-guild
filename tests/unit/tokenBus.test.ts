import { describe, expect, it } from 'vitest';
import { TokenBus } from '../../src/telemetry/tokenBus';

const event = (timestampMs: number, count: number, tokensPerSecond = 10) => ({ source: 'synthetic', accuracy: 'exact', timestampMs, count, tokensPerSecond, confidence: 1, runId: 'run-1' });

describe('TokenBus', () => {
  it('aggregates a 250ms window and preserves provenance', () => {
    const output: unknown[] = [];
    const bus = new TokenBus((value) => output.push(value));
    bus.ingest(event(100, 2)); bus.ingest(event(200, 3));
    expect(bus.flush(249)).toBe(1);
    expect(output).toHaveLength(1);
    expect(output[0]).toMatchObject({ source: 'synthetic', accuracy: 'exact', count: 5, runId: 'run-1' });
  });

  it('drops exact duplicates but keeps independent events', () => {
    const output: unknown[] = [];
    const bus = new TokenBus((value) => output.push(value));
    bus.ingest(event(100, 2)); bus.ingest(event(100, 2)); bus.ingest(event(100, 3));
    expect(bus.flush(100)).toBe(1);
    expect(output[0]).toMatchObject({ count: 5 });
  });

  it('aggregates weighted telemetry fields and active state', () => {
    const output: unknown[] = [];
    const bus = new TokenBus((value) => output.push(value));
    bus.ingest({ ...event(100, 2), inputTokens: 10, cacheTokens: 100, isAgentActive: true });
    bus.ingest({ ...event(200, 3), inputTokens: 20, cacheTokens: 200, isAgentActive: false });
    bus.flush(249);
    expect(output[0]).toMatchObject({ count: 5, inputTokens: 30, cacheTokens: 300, isAgentActive: true });
  });

  it('classifies idle, streaming, berserk, and thinking states', () => {
    const bus = new TokenBus(() => undefined);
    bus.ingest(event(100, 1, 10)); expect(bus.statusAt(100)).toBe('streaming');
    bus.ingest(event(200, 1, 40)); expect(bus.statusAt(200)).toBe('berserk');
    bus.ingest(event(300, 0, 0)); expect(bus.statusAt(3400)).toBe('thinking');
    expect(bus.statusAt(5401)).toBe('idle');
  });
});
