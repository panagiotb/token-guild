export interface IBatteryState {
  readonly level: number;
  readonly currentCapacity: number;
  readonly maxCapacity: number;
  readonly isLockedOut: boolean;
  readonly idleTimeSeconds: number;
  readonly sessionOverflowTotal: number;
}

export interface ITokenTelemetryBatch {
  readonly outputTokens: number;
  readonly inputTokens: number;
  readonly cacheTokens: number;
  readonly isAgentActive: boolean;
}

export interface BatteryTickResult {
  readonly newState: IBatteryState;
  readonly chargedTokens: number;
  readonly drainedTokens: number;
  readonly goldSpawned: number;
  readonly isCharging: boolean;
}

/** Deterministic token battery/economy rules. It deliberately has no UI or host dependencies. */
export class BatteryEngine {
  public static readonly MAX_LEVEL = 5;
  public static readonly BASE_CAPACITY = 5000;
  public static readonly BASE_DRAIN = 20;
  public static readonly LOCKOUT_THRESHOLD = 0.15;

  public static calculateChargedTokens(batch: ITokenTelemetryBatch): number {
    return Math.max(0, finite(batch.outputTokens) + finite(batch.inputTokens) * 0.1 + finite(batch.cacheTokens) * 0.01);
  }

  public static capacityForLevel(level: number): number {
    const safeLevel = clampInteger(level, 1, BatteryEngine.MAX_LEVEL);
    return Math.floor(BatteryEngine.BASE_CAPACITY * Math.pow(1.63, safeLevel - 1) + 1e-9);
  }

  public static upgradeCost(level: number): number {
    if (level <= 1) return 0;
    const safeLevel = clampInteger(level, 2, BatteryEngine.MAX_LEVEL);
    return Math.floor(1200 * Math.pow(2.8, safeLevel - 2) + 1e-9);
  }

  public static createState(level = 1, currentCapacity = BatteryEngine.capacityForLevel(level)): IBatteryState {
    const safeLevel = clampInteger(level, 1, BatteryEngine.MAX_LEVEL);
    const maxCapacity = BatteryEngine.capacityForLevel(safeLevel);
    const current = clamp(finite(currentCapacity), 0, maxCapacity);
    return { level: safeLevel, currentCapacity: current, maxCapacity, isLockedOut: current <= 0, idleTimeSeconds: 0, sessionOverflowTotal: 0 };
  }

  public static processTick(deltaSeconds: number, state: IBatteryState, isAgentActive: boolean, incomingChargedTokens: number, floorMultiplier = 1): BatteryTickResult {
    const delta = Math.max(0, finite(deltaSeconds));
    const incoming = Math.max(0, finite(incomingChargedTokens));
    const active = Boolean(isAgentActive);
    const idleTimeSeconds = active ? 0 : state.idleTimeSeconds + delta;
    const drainMultiplier = active ? 1 : Math.pow(2, idleTimeSeconds / 60);
    const requestedDrain = this.BASE_DRAIN * drainMultiplier * delta;
    // A depleted run is hard-frozen, but incoming telemetry can still recharge it.
    const drainedTokens = state.isLockedOut ? 0 : Math.min(Math.max(0, state.currentCapacity), requestedDrain);
    const beforeOverflow = Math.max(0, state.currentCapacity - drainedTokens) + incoming;
    const overflow = Math.max(0, beforeOverflow - state.maxCapacity);
    const currentCapacity = Math.min(state.maxCapacity, beforeOverflow);
    const sessionOverflowTotal = state.sessionOverflowTotal + overflow;
    // Overflow is retained for telemetry/diagnostics only. It is never a
    // gameplay currency source; gold must come from authored pickups or the
    // stage result, matching the base-game economy contract.
    void floorMultiplier;
    const goldSpawned = 0;
    const isLockedOut = currentCapacity <= 0 || (state.isLockedOut && currentCapacity < state.maxCapacity * this.LOCKOUT_THRESHOLD);
    return {
      newState: { level: state.level, currentCapacity, maxCapacity: state.maxCapacity, isLockedOut, idleTimeSeconds, sessionOverflowTotal },
      chargedTokens: incoming,
      drainedTokens,
      goldSpawned,
      isCharging: incoming > 0
    };
  }
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Number.isInteger(value) ? value : minimum));
}
