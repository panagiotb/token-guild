import { describe, expect, it } from 'vitest';
import { applyGameplayTelemetry } from '../../src/game/telemetryMapping';
import { createRun } from '../../src/game/simulation';

describe('gameplay telemetry mapping', () => {
  it('maps thinking, errors, and successful completion to game state', () => {
    const run = createRun('wizard');
    applyGameplayTelemetry(run, { type: 'thinking', durationMs: 3000 });
    expect(run.powerChargeReady).toBe(true);
    applyGameplayTelemetry(run, { type: 'error' });
    expect(run.hazardsTriggered).toBe(1);
    applyGameplayTelemetry(run, { type: 'complete', exitCode: 0 });
    expect(run.phase).toBe('summary');
    expect(run.outcome).toBe('victory');
    expect(run.gold).toBe(100);
    expect(run.summary?.goldBreakdown).toEqual({ enemyKills: 0, bossChest: 100, overflow: 0 });
    expect(run.summary?.heroName).toBe('Wizard');
  });

  it('rejects invalid thinking durations', () => {
    expect(() => applyGameplayTelemetry(createRun('warrior'), { type: 'thinking', durationMs: -1 })).toThrow();
  });
});
