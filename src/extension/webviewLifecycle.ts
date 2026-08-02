/**
 * Tracks which webview attachment is currently authoritative. VS Code can
 * dispose a hidden webview and create its replacement while messages from the
 * old instance are still queued. A monotonically increasing generation keeps
 * those messages from mutating or receiving state after reconnect.
 */
export interface WebviewAttachment {
  readonly generation: number;
}

export class WebviewLifecycle {
  private nextGeneration = 0;
  private currentGeneration: number | undefined;

  public attach(): WebviewAttachment {
    const attachment = { generation: ++this.nextGeneration };
    this.currentGeneration = attachment.generation;
    return attachment;
  }

  public isCurrent(attachment: WebviewAttachment): boolean {
    return this.currentGeneration === attachment.generation;
  }

  public detach(attachment: WebviewAttachment): void {
    if (!this.isCurrent(attachment)) return;
    this.currentGeneration = undefined;
    // Invalidate any closures that retained the detached generation even if
    // another webview has not attached yet.
    this.nextGeneration += 1;
  }

  /** Invalidate every attachment when the provider itself is disposed. */
  public invalidate(): void {
    if (this.currentGeneration === undefined) return;
    this.currentGeneration = undefined;
    this.nextGeneration += 1;
  }
}
