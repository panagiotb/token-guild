export type FeedbackKind = 'pickup' | 'defeat' | 'level-up' | 'finale' | 'lockout' | 'victory' | 'defeat-run';

export interface FeedbackCue {
  readonly kind: FeedbackKind;
  readonly x: number;
  readonly y: number;
  readonly startedAtMs: number;
  readonly durationMs: number;
  readonly message: string;
}

export function addFeedbackCue(cues: readonly FeedbackCue[], cue: FeedbackCue, maxCues = 24): FeedbackCue[] {
  if (!Number.isInteger(maxCues) || maxCues < 1) throw new Error('Feedback cue limit must be positive');
  return [...cues, cue].slice(-maxCues);
}

export function activeFeedbackCues(cues: readonly FeedbackCue[], nowMs: number): FeedbackCue[] {
  if (!Number.isFinite(nowMs)) throw new Error('Feedback time must be finite');
  return cues.filter((cue) => nowMs - cue.startedAtMs >= 0 && nowMs - cue.startedAtMs <= cue.durationMs);
}
