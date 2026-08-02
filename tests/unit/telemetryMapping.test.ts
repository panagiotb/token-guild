import { describe, expect, it } from 'vitest';
import { applyGameplayTelemetry } from '../../src/game/telemetryMapping';
import { applyTokenInput, createRun } from '../../src/game/simulation';

describe('gameplay telemetry mapping', () => {
  it('maps token counts only and leaves combat progression untouched', () => {
    const run = createRun('wizard');
    applyGameplayTelemetry(run, { type: 'tokens', count: 3, tokensPerSecond: 10, outputTokens: 3 });
    expect(run.totalTokens).toBe(3);
    expect(run.phase).toBe('dungeon');
    expect(run.gold).toBe(0);
    applyTokenInput(run, { source: 'otlp', accuracy: 'exact', count: 4, tokensPerSecond: 20, outputTokens: 4 });
    expect(run.totalTokens).toBe(7);
    expect(run.tokenSource).toBe('otlp');
    expect(run.tokenAccuracy).toBe('exact');
  });
});
