import { describe, expect, it } from 'vitest';
import { WebviewLifecycle } from '../../src/extension/webviewLifecycle';

describe('webview lifecycle generations', () => {
  it('invalidates a disposed attachment and accepts its replacement', () => {
    const lifecycle = new WebviewLifecycle();
    const first = lifecycle.attach();
    const replacement = lifecycle.attach();

    expect(lifecycle.isCurrent(first)).toBe(false);
    expect(lifecycle.isCurrent(replacement)).toBe(true);
    lifecycle.detach(first);
    expect(lifecycle.isCurrent(replacement)).toBe(true);
  });

  it('does not allow a stale dispose callback to detach a replacement', () => {
    const lifecycle = new WebviewLifecycle();
    const first = lifecycle.attach();
    const replacement = lifecycle.attach();
    lifecycle.detach(first);

    expect(lifecycle.isCurrent(replacement)).toBe(true);
    const next = lifecycle.attach();
    expect(next.generation).toBeGreaterThan(replacement.generation);
  });

  it('invalidates the current attachment on disposal', () => {
    const lifecycle = new WebviewLifecycle();
    const attachment = lifecycle.attach();
    lifecycle.detach(attachment);

    expect(lifecycle.isCurrent(attachment)).toBe(false);
  });

  it('invalidates stale callbacks when the provider is disposed', () => {
    const lifecycle = new WebviewLifecycle();
    const attachment = lifecycle.attach();
    lifecycle.invalidate();
    expect(lifecycle.isCurrent(attachment)).toBe(false);
    const replacement = lifecycle.attach();
    expect(replacement.generation).toBeGreaterThan(attachment.generation);
  });
});
