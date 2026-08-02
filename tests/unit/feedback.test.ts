import { describe, expect, it } from 'vitest';
import { activeFeedbackCues, addFeedbackCue, type FeedbackCue } from '../../src/webview/feedback';

const cue = (startedAtMs: number, message = 'cue'): FeedbackCue => ({ kind: 'pickup', x: 0, y: 0, startedAtMs, durationMs: 500, message });

describe('bounded presentation feedback', () => {
  it('caps cues and expires them deterministically', () => {
    let cues: FeedbackCue[] = [];
    for (let index = 0; index < 4; index += 1) cues = addFeedbackCue(cues, cue(index * 100, String(index)), 2);
    expect(cues.map((entry) => entry.message)).toEqual(['2', '3']);
    expect(activeFeedbackCues(cues, 350)).toHaveLength(2);
    expect(activeFeedbackCues(cues, 1000)).toHaveLength(0);
  });

  it('rejects an invalid cue limit or time', () => {
    expect(() => addFeedbackCue([], cue(0), 0)).toThrow();
    expect(() => activeFeedbackCues([], Number.NaN)).toThrow();
  });
});
