import { validateTokenStreamEvent } from '../shared/validation';
import type { Accuracy, TelemetrySource, TokenStreamEvent } from '../shared/types';

export type AgentStatus = 'idle' | 'streaming';
export type TokenEventSink = (event: TokenStreamEvent) => void;

interface PendingEvent extends TokenStreamEvent { key: string }

export class TokenBus {
  private readonly pending: PendingEvent[] = [];
  private readonly seen = new Set<string>();
  private readonly seenQueue: string[] = [];
  private lastEvent?: TokenStreamEvent;

  public constructor(private readonly sink: TokenEventSink, private readonly windowMs = 250, private readonly maxSeenEvents = 4096) {
    if (!Number.isInteger(windowMs) || windowMs < 1) throw new Error('Token bus window must be a positive integer');
    if (!Number.isInteger(maxSeenEvents) || maxSeenEvents < 1) throw new Error('Token bus dedupe limit must be a positive integer');
  }

  public ingest(raw: unknown): void {
    const event = validateTokenStreamEvent(raw);
    const key = `${event.source}|${event.runId ?? ''}|${event.timestampMs}|${event.count}|${event.outputTokens ?? ''}|${event.inputTokens ?? ''}|${event.cacheTokens ?? ''}|${event.tokensPerSecond}|${event.isAgentActive ?? ''}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
    this.seenQueue.push(key);
    while (this.seenQueue.length > this.maxSeenEvents) {
      const oldest = this.seenQueue.shift();
      if (oldest) this.seen.delete(oldest);
    }
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
      const inputTokens = group.reduce((total, event) => total + (event.inputTokens ?? 0), 0);
      const cacheTokens = group.reduce((total, event) => total + (event.cacheTokens ?? 0), 0);
      const outputTokens = group.reduce((total, event) => total + (event.outputTokens ?? event.count), 0);
      const aggregate: TokenStreamEvent = { source: first.source as TelemetrySource, accuracy: group.every((event) => event.accuracy === 'exact') ? 'exact' : 'estimated' as Accuracy, timestampMs: Math.max(...group.map((event) => event.timestampMs)), count, outputTokens, tokensPerSecond: weightedRate, confidence: Math.min(...group.map((event) => event.confidence)), inputTokens, cacheTokens, isAgentActive: group.some((event) => event.isAgentActive ?? event.tokensPerSecond > 0), ...(first.runId === undefined ? {} : { runId: first.runId }) };
      this.sink(aggregate);
    }
    return groups.size;
  }

  public statusAt(nowMs: number): AgentStatus {
    if (!this.lastEvent || nowMs - this.lastEvent.timestampMs > 5000) return 'idle';
    return this.lastEvent.tokensPerSecond > 0 ? 'streaming' : 'idle';
  }

  public getPendingCount(): number { return this.pending.length; }
}
