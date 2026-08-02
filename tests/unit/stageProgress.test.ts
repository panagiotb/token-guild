import { describe, expect, it } from 'vitest';
import { formatStageOptionDescription, stageDefinitions, stageUnlockReason } from '../../src/webview/stageProgress';

describe('stage selection contract', () => {
  it('exposes data-owned duration, topology, and modifiers', () => {
    const stage = stageDefinitions().find((entry) => entry.id === 'code-dungeon');
    expect(stage).toMatchObject({ id: 'code-dungeon', durationSeconds: 1800, topology: 'open', modifiers: [] });
    expect(formatStageOptionDescription(stage!)).toBe('30 minutes · Open scrolling map · No modifiers');
  });

  it('explains locked and unlocked states without inventing progress', () => {
    expect(stageUnlockReason('code-dungeon', ['code-dungeon'])).toBe('Unlocked');
    expect(stageUnlockReason('library', ['code-dungeon'])).toContain('required challenge');
  });
});
