import { validateTokenStreamEvent } from '../shared/validation';
import type { Accuracy, TelemetrySource, TokenStreamEvent } from '../shared/types';

export type AgentStatus = 'idle' | 'thinking' | 'streaming' | 'berserk';
export type TokenEventSink = (event: TokenStreamEvent) => void;

interface PendingEvent extends TokenStreamEvent { key: string }

export class TokenBus {
  private readonly pending: PendingEvent[] = [];
  private readonly seen = new Set<string>();
  private lastEvent?: TokenStreamEvent;

  public constructor(private readonly sink: TokenEventSink, private readonly windowMs = 250) {
    if (!Number.isInteger(windowMs) || windowMs < 1) throw new Error('Token bus window must be a positive integer');
  }

  public ingest(raw: unknown): void {
    const event = validateTokenStreamEvent(raw);
    const key = `${event.source}|${event.runId ?? ''}|${event.timestampMs}|${event.count}|${event.tokensPerSecond}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
    this.pending.push({ ...event, key });
    this.lastEvent = event;
  }

  public flush(nowMs: number): number {
    if (!Number.isFinite(nowMs)) throw new Error('Flush time must be finite');
    const ready = this.pending.filter((event) => event.timestampMs <= nowMs);
    if (ready.length === 0) return 0;
    const remaining = this.pending.filter((event) => event.timestampMs > nowMs);
    this.pending.length = 0;
    this.pending.push(...remaining);
    const groups = new Map<string, PendingEvent[]>();
    for (const event of ready) {
      const bucket = Math.floor(event.timestampMs / this.windowMs);
      const groupKey = `${event.source}|${event.accuracy}|${event.runId ?? ''}|${bucket}`;
      const group = groups.get(groupKey) ?? [];
      group.push(event);
      groups.set(groupKey, group);
    }
    for (const group of groups.values()) {
      const first = group[0];
      if (!first) continue;
      const count = group.reduce((total, event) => total + event.count, 0);
      const weightedRate = group.reduce((total, event) => total + event.tokensPerSecond * event.count, 0) / (count || 1);
      const aggregate: TokenStreamEvent = { source: first.source as TelemetrySource, accuracy: group.every((event) => event.accuracy === 'exact') ? 'exact' : 'estimated' as Accuracy, timestampMs: Math.max(...group.map((event) => event.timestampMs)), count, tokensPerSecond: weightedRate, confidence: Math.min(...group.map((event) => event.confidence)), ...(first.runId === undefined ? {} : { runId: first.runId }) };
      this.sink(aggregate);
    }
    return groups.size;
  }

  public statusAt(nowMs: number): AgentStatus {
    if (!this.lastEvent || nowMs - this.lastEvent.timestampMs > 5000) return 'idle';
    if (this.lastEvent.tokensPerSecond >= 40) return 'berserk';
    if (this.lastEvent.tokensPerSecond >= 1) return 'streaming';
    if (nowMs - this.lastEvent.timestampMs >= 3000) return 'thinking';
    return 'idle';
  }

  public getPendingCount(): number { return this.pending.length; }
}
