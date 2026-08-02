/**
 * Coalesces concurrent restore requests. A replacement webview may send
 * READY while the first webview is still restoring checkpoints; all callers
 * must await the same load before publishing active-run snapshots.
 */
export class RestoreGate {
  private restored = false;
  private pending: Promise<void> | undefined;

  public ensure(loader: () => Promise<void>): Promise<void> {
    if (this.restored) return Promise.resolve();
    if (this.pending) return this.pending;
    this.pending = loader()
      .then(() => {
        this.restored = true;
      })
      .finally(() => {
        this.pending = undefined;
      });
    return this.pending;
  }

  public reset(): void {
    this.restored = false;
    this.pending = undefined;
  }
}
