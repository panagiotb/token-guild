import { describe, expect, it } from 'vitest';
import { BatteryEngine } from '../../src/shared/battery';

describe('token battery engine', () => {
  it('weights output, input, and cache tokens', () => {
    expect(BatteryEngine.calculateChargedTokens({ outputTokens: 100, inputTokens: 50, cacheTokens: 1000, isAgentActive: true })).toBe(115);
  });

  it('matches the capacity and upgrade cost curve', () => {
    expect([1, 2, 3, 4, 5].map(BatteryEngine.capacityForLevel)).toEqual([5000, 8150, 13284, 21653, 35295]);
    expect([2, 3, 4, 5].map(BatteryEngine.upgradeCost)).toEqual([1200, 3360, 9408, 26342]);
  });

  it('uses active drain and resets idle time', () => {
    const state = BatteryEngine.createState(1);
    const idle = BatteryEngine.processTick(60, state, false, 0);
    expect(idle.newState.idleTimeSeconds).toBe(60);
    expect(idle.drainedTokens).toBeCloseTo(40 * 60);
    const active = BatteryEngine.processTick(1, idle.newState, true, 0);
    expect(active.newState.idleTimeSeconds).toBe(0);
    expect(active.drainedTokens).toBe(20);
  });

  it('caps full-battery overflow without creating a gameplay currency', () => {
    const first = BatteryEngine.processTick(0.25, BatteryEngine.createState(1), true, 10000);
    expect(first.newState.currentCapacity).toBe(5000);
    expect(first.goldSpawned).toBe(0);
    const second = BatteryEngine.processTick(0.25, first.newState, true, 10000);
    expect(second.goldSpawned).toBe(0);
  });

  it('hard-locks at zero and only re-ignites at fifteen percent', () => {
    const depleted = BatteryEngine.processTick(1, BatteryEngine.createState(1, 1), false, 0);
    expect(depleted.newState.isLockedOut).toBe(true);
    const belowThreshold = BatteryEngine.processTick(1, depleted.newState, true, 700);
    expect(belowThreshold.newState.isLockedOut).toBe(true);
    const recharged = BatteryEngine.processTick(1, belowThreshold.newState, true, 100);
    expect(recharged.newState.currentCapacity).toBeGreaterThanOrEqual(750);
    expect(recharged.newState.isLockedOut).toBe(false);
  });
});
