export function renderWebviewHtml(
  template: string,
  cspSource: string,
  assetUri: (path: string) => string,
  nonce: string
): string {
  if (!/^[A-Za-z0-9_-]{16,}$/.test(nonce)) {
    throw new Error('Webview nonce must be a non-empty cryptographic token');
  }

  const csp = `default-src 'none'; img-src ${cspSource}; style-src ${cspSource}; script-src ${cspSource} 'nonce-${nonce}';`;
  const withCsp = template.replace(
    /<head>/i,
    `<head><meta http-equiv="Content-Security-Policy" content="${csp}">`
  );
  const withAssets = withCsp.replace(/(?:src|href)="\.\/([^"#?]+)"/g, (_match, path: string) => {
    const attribute = _match.startsWith('src=') ? 'src' : 'href';
    return `${attribute}="${assetUri(path)}"`;
  });
  return withAssets.replace(/<script(?![^>]*nonce=)/g, `<script nonce="${nonce}"`);
}
