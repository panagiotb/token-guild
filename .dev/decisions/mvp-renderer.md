# MVP renderer decision

The first pass uses a small Canvas 2D renderer and DOM controls instead of adding Phaser before the deterministic game loop is proven. The simulation is already isolated from rendering and can be migrated to Phaser after MVP feedback. This keeps the first VSIX small and avoids making a framework dependency a blocker for gameplay QA.

The renderer still honors the webview CSP, VS Code theme tokens, keyboard focus, and reduced-motion behavior. This is an MVP implementation decision, not a change to the product's future rendering options.
