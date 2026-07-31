# MVP implementation and release qualification evidence

## Phase 2–4 result

- Frozen MVP content is implemented through validated JSON registries and the deterministic simulation.
- The Guild → Dungeon → level-up → boss → summary → Guild path is covered by `tests/unit/mvpScenario.test.ts` and rendered by the webview.
- Synthetic telemetry travels through the normalized `TokenBus`; exact/estimated provenance is visible in the run HUD.
- Persistent gold, Might upgrades, audio settings, and run IDs are validated through `StateManager`.
- Stealth, keyboard movement, reduced-motion CSS, accessible DOM status, synthesized audio, and local summary export are implemented.

## Release checks

- `npm run lint` → pass.
- `npm run typecheck` → pass.
- `npm test` → 9 files, 22 tests passed; `npm run test:synthetic` covers the token-free core path.
- `npm run test:integration` → Extension Development Host smoke test passed on VS Code 1.131.0, including opening the contributed webview.
- `npm run package` → `token-guild-0.1.0.vsix`, 43.11 KB; below the 10 MB package budget.
- UI review pass → compact icon controls, responsive guild actions, and three-column level-up cards; no third-party art embedded yet.
- UI telemetry pass → restrained crimson accents, visible run upgrade chips, spawned/defeated/active enemy counts, `Lvl` labels, and explanatory Might/token dialogs.
- `@vscode/vsce` package contents were audited; only original SVG/text assets and production bundles are included.
- The VSIX installed successfully into an isolated VS Code 1.131.0 profile as `evdaimon-games.token-guild-0.1.0`.

Post-install review fix: the contributed Guild view now declares `type: "webview"`, matching the registered `WebviewViewProvider`; the integration smoke test opens this view to prevent regression.

Final audit notes: production dependencies have no high/critical advisories (`npm audit --omit=dev --audit-level=high`). Experimental telemetry adapters and manual Cursor/Windsurf fork smoke tests remain explicitly deferred because the MVP uses synthetic telemetry and only VS Code is available for automated host validation. Temporary VS Code download/profile directories are ignored and retained for reproducibility.
