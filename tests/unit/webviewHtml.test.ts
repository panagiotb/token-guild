import { describe, expect, it } from 'vitest';
import { renderWebviewHtml } from '../../src/extension/webviewHtml';

describe('renderWebviewHtml', () => {
  it('injects CSP, nonce, and rewritten local assets', () => {
    const html = renderWebviewHtml(
      '<html><head></head><body><script type="module" src="./assets/main.js"></script></body></html>',
      'webview-csp',
      (path) => `vscode-resource:${path}`,
      '0123456789abcdef'
    );

    expect(html).toContain("default-src 'none'");
    expect(html).toContain("nonce-0123456789abcdef");
    expect(html).toContain('src="vscode-resource:assets/main.js"');
    expect(html).toContain('<script nonce="0123456789abcdef"');
  });

  it('rejects weak nonces', () => {
    expect(() => renderWebviewHtml('<head></head>', 'source', () => 'asset', 'weak')).toThrow();
  });
});
