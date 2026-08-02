import { describe, expect, it } from 'vitest';
import { RestoreGate } from '../../src/extension/restoreGate';

describe('checkpoint restore gate', () => {
  it('coalesces concurrent READY restores into one load', async () => {
    const gate = new RestoreGate();
    let loads = 0;
    let release!: () => void;
    const load = new Promise<void>((resolve) => {
      release = resolve;
    });
    const loader = async (): Promise<void> => {
      loads += 1;
      await load;
    };

    const first = gate.ensure(loader);
    const second = gate.ensure(loader);
    expect(loads).toBe(1);
    release();
    await Promise.all([first, second]);
    expect(loads).toBe(1);
    await gate.ensure(loader);
    expect(loads).toBe(1);
  });

  it('allows a failed restore to be retried', async () => {
    const gate = new RestoreGate();
    let attempts = 0;
    await expect(gate.ensure(async () => {
      attempts += 1;
      throw new Error('temporary storage failure');
    })).rejects.toThrow('temporary storage failure');

    await gate.ensure(async () => {
      attempts += 1;
    });
    expect(attempts).toBe(2);
  });
});
