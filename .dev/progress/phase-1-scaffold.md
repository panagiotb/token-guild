# Phase 1 execution note: extension foundation

Step: Phase 1 — extension scaffold and secure webview shell

Objective: produce a clean-build desktop VS Code extension with a sidebar webview, CSP asset loading, runtime message validation, and versioned state persistence.

Dependencies: Phase 0 audit, `.dev/mvp-content.md`, `.dev/decisions/telemetry-feasibility.md`.

Scope: `package.json`, TypeScript/Vite/esbuild configuration, `src/extension`, `src/shared`, initial `src/webview`, tests, VS Code launch/tasks, and packaging metadata.

Risks: VS Code integration tests need a clean Electron environment; inherited `ELECTRON_RUN_AS_NODE` must be removed from the test runner process.

Acceptance: lint, typecheck, unit tests, production build, VSIX packaging, and Extension Development Host smoke test pass.

Checks:

- `npm run typecheck` → pass.
- `npm run lint` → pass.
- `npm test` → 3 files, 8 tests passed.
- `npm run build` → host and webview bundles pass.
- `npm run test:integration` → 1 Extension Development Host test passed on VS Code 1.131.0.
- `npm run package` → `token-guild-0.1.0.vsix`, 25.04 KB before later gameplay additions.

Result: pass. Runtime and packaging warnings were addressed with repository metadata and a proprietary `LICENSE`. The initial renderer decision is recorded in `.dev/decisions/mvp-renderer.md`.

Follow-up: integrate the full MVP content registry, persistence-driven Guild screen, and tested simulation/UI boundary.
