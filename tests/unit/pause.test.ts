import { describe, expect, it } from 'vitest';
import { formatPauseTitle } from '../../src/webview/pause';

describe('pause overlay', () => {
  it('shows the synthetic token total without exposing the paused run', () => {
    expect(formatPauseTitle('synthetic', 24)).toBe('Paused · Synthetic tokens spent: 24');
  });

  it('sanitizes invalid or negative totals', () => {
    expect(formatPauseTitle('synthetic', -4)).toBe('Paused · Synthetic tokens spent: 0');
    expect(formatPauseTitle('synthetic', Number.NaN)).toBe('Paused · Synthetic tokens spent: 0');
  });
});
