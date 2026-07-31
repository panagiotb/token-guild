# Token Guild Project Management Plan

This document is the execution plan for Token Guild. It defines scope, sequencing, acceptance criteria, and release gates. Product behavior belongs in [README.md](README.md), architecture choices in [TechStack.md](TechStack.md), telemetry details in [UniversalTelemetryEngine.md](UniversalTelemetryEngine.md), and game-data references in [Vampire Survivors Mapping/](Vampire%20Survivors%20Mapping/).

## Current status

- **Lifecycle:** active MVP implementation and Phase 6 refinement
- **Implementation:** MVP `0.1.0` vertical slice, UI, persistence, telemetry fixtures, and release tooling are implemented; Phase 6 summary/progression/reward refinements are in progress
- **Next milestone:** Phase 6 structured summary, hero best-level preview, and reward-ledger review
- **Release target:** MVP `0.1.0`
- **Autonomy defaults:** [.dev/AUTONOMY_CONFIG.json](AUTONOMY_CONFIG.json)

Checkboxes record verified repository state. A box may be checked only after its acceptance criteria have passed and the evidence is available in the same change, CI run, or linked issue. Do not mark future work complete because a specification exists.

## 1. Execution rules

1. Work in phase order. A later phase may be explored in a spike, but it cannot be declared complete before its dependencies and gate pass.
2. Keep changes small enough to review. Every implementation change must include tests or a written reason that automated testing is not practical.
3. Use shared, runtime-validated contracts at every trust boundary: telemetry input, persisted state, JSON content, and webview IPC.
4. Do not ship empty handlers, swallowed exceptions, embedded credentials, or undocumented network listeners.
5. Treat measured tokens and estimated tokens as different data. The UI must disclose the active source and whether its count is exact or estimated.
6. Preserve user control. Telemetry sources that inspect workspace changes, terminal output, or proxy traffic are opt-in and independently configurable.
7. Stop at a phase gate when a blocking assumption fails. Record the decision and revise the plan instead of building dependent features on an invalid premise.

### 1.1 Unattended execution rules

These rules apply whenever an agent is left running without interactive supervision.

1. **Working first pass:** Prefer the smallest complete implementation that makes the required user flow work. Defer optional polish, optimization, broad compatibility, and speculative integrations to the backlog; do not let them block the first working pass.
2. **Plan before acting:** Before each step, write a short execution note in the plan or the relevant decision/progress file containing the objective, dependencies, files likely to change, risks, test commands, and acceptance criteria. Keep exactly one step in progress.
3. **Test the foundation before moving:** Add or update tests with the implementation. Do not begin a dependent step until the current step's checks pass, the acceptance criteria are met, and the result is exercised through its real boundary where practical.
4. **Evidence is required:** For every completed step, record the commands run, the result, and any known limitation. A clean build alone is not evidence that behavior works; tests must cover success, invalid input, failure, and teardown paths relevant to the step.
5. **Replan explicitly:** If implementation reveals a missing dependency, incorrect assumption, API limitation, or scope change, pause the current step, update this plan and its acceptance criteria, and record why. Never silently rewrite the roadmap while work is in progress.
6. **Recover safely:** On failure, preserve the failing evidence, diagnose the smallest reproducible case, apply one focused fix, and rerun the focused test plus the relevant regression suite. Do not skip or weaken a test to make a gate pass.
7. **Use checkpoints:** After each passing gate, leave the workspace buildable and the change reviewable. Do not mix unrelated cleanup, broad refactors, or generated artifacts into a checkpoint.
8. **Respect scope and authority:** Routine implementation, local tests, and documentation updates are autonomous. Stop and report before destructive operations, external publication, credential use, licensing decisions, network exposure, or a choice that materially changes product scope.
9. **Stop honestly:** Mark a step blocked only when a dependency or external decision prevents safe progress. Include the exact blocker, attempted safe alternatives, current workspace state, and the smallest decision needed to continue. Never mark work complete because time, tokens, or a phase budget is nearly exhausted.
10. **Leave a handoff:** At the end of an unattended run, summarize completed work, failing checks, changed scope, remaining risks, and the next step. The repository and plan must make the next action unambiguous.

### 1.2 Standard step cycle

Every implementation step follows this cycle:

1. Inspect the current tree, status, relevant specifications, and existing tests.
2. Record the step note and define the smallest working acceptance target.
3. Implement the foundation and its tests together.
4. Run focused checks, then the applicable phase regression suite.
5. Review the diff for scope, security, cleanup, and accidental generated files.
6. Record evidence and update the checkbox only after the gate passes.
7. Update dependencies, risks, and the next step before starting anything else.

### 1.3 Step note template

Use this compact record for each autonomous step:

```text
Step: <phase.step> — <short name>
Objective: <one observable outcome>
Dependencies: <completed steps, decisions, or "none">
Scope: <files/components allowed to change>
Risks: <known failure or security/privacy concerns>
Acceptance: <specific behavior and test evidence required>
Checks: <focused commands> ; <regression commands>
Result: <pass, failed, or blocked, with concise evidence>
Follow-up: <next step or required decision>
```

## 2. Scope and product decisions

### MVP scope

The MVP is a desktop VS Code extension with:

- one sidebar webview view containing the Guild and Dungeon states;
- one playable stage and a complete start-to-finish run loop;
- the six hero classes named in the product specification;
- a frozen, explicitly selected subset of weapons, passives, evolutions, enemies, and pickups;
- synthetic/demo telemetry plus every real telemetry adapter that passes Phase 0 feasibility and privacy review;
- local progression stored through `ExtensionContext.globalState`;
- keyboard-accessible, theme-aware UI, reduced-motion support, audio controls, and a stealth view;
- an installable VSIX verified in the supported VS Code version range.

The mapping documents are a design reference, not the MVP backlog. Phase 0 must create a versioned content manifest that names the exact MVP items. Content not listed in that manifest is post-MVP.

### Explicitly out of MVP

- exhaustive base-game, secret-character, Arcana/Darkana, and DLC parity;
- web extension support (`vscode.dev` / browser extension host);
- automatic interception of third-party API traffic;
- claims of exact token counts from document or terminal heuristics;
- publishing to marketplaces other than the VS Code Marketplace;
- assets, names, text, audio, or data that the project does not have permission to distribute.

### Supported environment

- Desktop VS Code is the release reference host.
- Cursor, Windsurf, and other VS Code forks are best-effort compatibility targets until the VSIX passes a documented smoke-test matrix in each host.
- Remote workspaces must be tested explicitly because extension-host networking may run remotely while the webview runs locally.
- Proposed VS Code APIs must not be required by a Marketplace release. VS Code documents proposed APIs as unstable, Insiders-only, and unsuitable for published extensions: [Using Proposed API](https://code.visualstudio.com/api/advanced-topics/using-proposed-api).

## 3. Cross-cutting acceptance criteria

These criteria apply to every phase where relevant.

### Quality

- `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` exit successfully.
- Tests are deterministic and do not require public network access.
- Critical math, schema validation, deduplication, state migration, and IPC rejection paths have branch coverage.
- User-visible errors are actionable; diagnostic logs contain no prompts, source text, terminal content, secrets, or raw API payloads.

### Security and privacy

- Webview HTML uses a restrictive Content Security Policy with a per-render nonce, `localResourceRoots`, and `webview.asWebviewUri`; inline script execution is not allowed. See the official [Webview security guidance](https://code.visualstudio.com/api/extension-guides/webview#security).
- Every host-to-webview and webview-to-host message is validated before use.
- Local servers bind to loopback only, use configurable ports, handle port conflicts, enforce request/body limits, and stop on extension deactivation.
- Collection is disabled until the user enables a source. Settings explain what is observed, how accuracy is classified, and what is retained.
- Raw workspace, terminal, trace, or model-response content is not persisted.

### Performance and accessibility

- The webview pauses or reduces work when hidden and disposes timers, listeners, audio nodes, physics objects, and servers on teardown.
- All non-canvas controls are keyboard reachable and labeled. The UI honors VS Code theme tokens, `vscode-reduce-motion`, and `vscode-using-screen-reader`.
- Formal performance benchmarking is not required for the MVP. Basic stability still is: bounded queues/entity counts, clean teardown, no runaway timers/listeners, and no unrecovered fatal errors.

## Phase 0: Feasibility, scope freeze, and risk retirement

### Objective

Validate the assumptions that determine architecture and product scope before implementation expands.

### 0.1 Telemetry capability spikes

- [x] Defer OTLP, document-diff, and host-specific feasibility spikes to the experimental backlog; synthetic telemetry is the only MVP release source.
- [x] Record loopback, payload, malformed-input, and remote-workspace risks in the telemetry decision record; no real listener ships in MVP.
- [x] Record document-diff false-positive testing as a prerequisite for any future estimated adapter.
- [x] Determine that arbitrary terminal-output capture is not an MVP dependency; do not depend on a proposed API.
- [x] Define the opt-in API proxy use case. It may observe only traffic explicitly configured by the user and must never collect or log authorization headers.
- [x] Define normalized event provenance: `source`, `accuracy` (`exact` or `estimated`), timestamp, count, confidence, and optional run correlation ID.

**Deliverable:** `.dev/decisions/telemetry-feasibility.md` with evidence, supported-host/source matrix, privacy decisions, and a go/no-go result for each adapter.

### 0.2 MVP content and licensing freeze

- [x] Create `.dev/mvp-content.md` listing the exact heroes, weapons, passives, evolutions, enemies, bosses, pickups, stage rules, and progression features in `0.1.0`.
- [x] Reconcile formulas and names that differ between the product specification and the mapping documents for the frozen MVP manifest.
- [x] Record provenance and redistribution rights for every shipped visual, font, audio, name, and data asset; MVP assets are original or generated.
- [x] Replace “1:1 reskin” as a release requirement with independently reviewed game rules and original presentation for MVP.

**Deliverable:** approved content manifest and asset/license ledger with no unresolved release blockers.

### 0.3 Architecture decisions

- [x] Record decisions for the sidebar contribution, host/webview build outputs, schema validation, telemetry source lifecycle, persistence versioning, renderer choice, and test layers.
- [x] Record the Canvas MVP renderer decision and verify the resulting packaged VSIX fits the `<10 MB` budget.
- [x] Define the minimum supported VS Code engine and Node runtime from the APIs actually used: desktop VS Code `>=1.85.0`, validated on 1.131.0, Node 22 for development/CI.

### Phase 0 gate

- [x] Every telemetry adapter is classified as release, experimental, or rejected.
- [x] MVP content and licensing are frozen.
- [x] The proof VSIX meets the size budget, or the budget/engine choice is revised with a recorded decision.
- [x] No unresolved assumption blocks Phase 1.

## Phase 1: Extension foundation and secure vertical shell

### Objective

Create a buildable, testable extension that opens a secure webview and exchanges validated messages.

### 1.1 Project scaffold and tooling

- [x] Create `package.json` with extension metadata and scripts: `build`, `watch`, `typecheck`, `lint`, `test`, `test:integration`, `test:e2e`, and `package`.
- [x] Configure strict TypeScript for shared, extension-host, and webview code.
- [x] Bundle the extension host with esbuild and the webview with Vite; emit production source maps only when the packaging policy permits them.
- [x] Configure ESLint, Vitest, coverage, and VS Code integration testing.
- [x] Add `.vscode/launch.json` and tasks for Extension Development Host debugging.

**Acceptance:** a clean checkout can install dependencies, build, test, launch the Extension Development Host, and produce a VSIX using repository scripts.

### 1.2 Webview view and lifecycle

- [x] Register a sidebar view through `WebviewViewProvider` with activation and visibility behavior documented.
- [x] Generate CSP-compliant HTML and local asset URIs in the extension host.
- [x] Restore lightweight webview UI state and rehydrate authoritative progression from the host.
- [x] Dispose all subscriptions and handle view resolve, hide, revive, and extension deactivation paths.

### 1.3 Typed IPC contracts

- [x] Define discriminated message unions and runtime schemas in `src/shared/`.
- [x] Add protocol versioning, request IDs where responses are required, structured error messages, and exhaustive handlers.
- [x] Reject unknown message types, invalid payloads, oversized payloads, and incompatible protocol versions.

### 1.4 Versioned persistence

- [x] Define a minimal persisted schema with `schemaVersion`, settings, unlocked heroes, gold, upgrades, and aggregate run statistics.
- [x] Implement defaults, validation, atomic updates, migrations, and recovery from corrupt or future-version state.
- [x] Require confirmation for reset and make reset behavior testable.

### Phase 1 gate

- [x] Static checks, unit tests, production build, and VS Code integration smoke test pass.
- [x] CSP and invalid-IPC tests pass.
- [x] State default, round-trip, migration, corruption, and reset tests pass.
- [x] Packaged contents contain no source secrets, fixtures, coverage output, or unnecessary development files.

## Phase 2: Deterministic game vertical slice

### Objective

Prove one complete, fun, testable run using synthetic events before connecting real telemetry.

### 2.1 Data and deterministic simulation core

- [x] Define runtime schemas for content registries and reject duplicate IDs, broken references, invalid ranges, and unsupported schema versions.
- [x] Keep combat math, XP progression, RNG, timers, and run state independent from Phaser and wall-clock time.
- [x] Support a seeded RNG and fake clock for deterministic tests and replayable fixtures.
- [x] Implement pause/resume semantics so level-up UI and hidden webviews cannot advance the simulation accidentally.

### 2.2 Playable dungeon loop

- [x] Implement hero movement, enemy pooling/spawning, targeting, weapons, collision/damage, death, XP drops, magnet pickup, leveling, and upgrade choice.
- [x] Implement one stage schedule, elite/boss encounter, victory, defeat, and end-of-run summary.
- [x] Cap entity counts and define degradation behavior under load.

### 2.3 Guild loop

- [x] Implement hero selection, persistent gold, a small permanent-upgrade shop, starting a run, and returning after victory/defeat.
- [x] Ensure failed or interrupted saves cannot duplicate or lose awarded currency.

### 2.4 Synthetic telemetry driver

- [x] Feed normalized token, status, error, and completion fixtures through the same public interface real adapters will use.
- [x] Implement and test token-to-XP, throughput modifier, thinking/charge, failure/hazard, and completion/boss mappings from the approved formulas.
- [x] Show source and accuracy in the UI.

### Phase 2 gate

- [x] A deterministic automated scenario completes Guild → Dungeon → level-up → boss → summary → Guild.
- [x] Math, collisions, item selection, boss outcomes, rewards, and persistence are covered by repeatable tests.
- [x] A five-minute stress fixture stays within the entity cap and leaves no active game resources after teardown.

## Phase 3: Production telemetry adapters

### Objective

Implement only the adapters approved by Phase 0 behind one normalized, deduplicated event bus. For `0.1.0`, the synthetic adapter is the only release source; the remaining sources stay experimental until their feasibility evidence is complete.

### 3.1 Token bus and run state

- [x] Implement source registration, 250 ms aggregation, monotonic counters, throughput windows, idle/thinking/streaming transitions, and clock-skew handling.
- [x] Deduplicate only when correlation evidence exists. Do not silently discard independent events merely because timestamps overlap.
- [x] Surface source health, dropped/malformed event counts, active accuracy class, and recoverable errors without recording raw content.

### 3.2 Experimental adapter backlog (not required for MVP)

- [x] Defer OTLP extraction and the opt-in stream proxy until a future release source is approved; no real adapter is required for MVP.

### 3.3 Experimental estimated-adapter backlog (not required for MVP)

- [x] Defer document-diff estimation until its measured false-positive rate meets a future release threshold.
- [x] Reject terminal estimation for MVP because no stable, distributable integration is approved.
- [x] Label estimates in UI and persisted aggregates; never merge them into an exact count without provenance.

### 3.4 User controls and diagnostics

- [x] Add the synthetic source setting and clear disabled/degraded states.
- [x] Defer per-source consent, port configuration, diagnostics, and lifecycle recovery until an experimental real source is promoted to release.

### Phase 3 gate

- [x] Unit and integration fixtures cover the release source, malformed input, lifecycle, deduplication, and state transition paths. Experimental sources remain gated by their backlog evidence.
- [x] Privacy review confirms no raw content or credentials are persisted or logged.
- [x] Supported-host/source matrix is updated from actual smoke tests and the feasibility decision record.
- [x] Synthetic mode remains available when no real adapter is enabled.

## Phase 4: MVP content, presentation, and usability

### Objective

Expand the vertical slice to the frozen MVP manifest and complete the user experience.

### 4.1 Content implementation

- [x] Implement all and only the heroes, weapons, passives, evolutions, enemies, pickups, and progression included in `.dev/mvp-content.md`.
- [x] Validate every registry at build time and runtime.
- [x] Add table-driven tests for every included character passive, item level, evolution recipe, wave, drop, and unlock condition.

### 4.2 Stealth view and commands

- [x] Register a user-rebindable VS Code command and keybinding for stealth mode; use a suitable `when` clause.
- [x] Switch views without resetting or advancing run state unexpectedly.
- [x] Keep displayed diagnostic data synthetic or privacy-safe and label the mode clearly in settings/help.

### 4.3 Audio, settings, and accessibility

- [x] Add licensed/original event audio, volume and mute controls, persistence, and safe audio-context resume behavior.
- [x] Add keyboard alternatives for game/UI actions, accessible DOM summaries for canvas-only state, theme support, reduced motion, and focus management.
- [x] Test the narrowest supported sidebar width and resize behavior rather than hard-coding a 300 px viewport.

### 4.4 Run summary and image export

- [x] Report tokens by provenance/accuracy, stage time, rewards, damage by item, and outcome.
- [x] Export a PNG locally without uploading data. Exclude workspace names, prompts, paths, model output, and other sensitive fields by default.

### Phase 4 gate

- [x] Content manifest coverage is complete and table-driven tests pass.
- [x] Keyboard-only, screen-reader summary, reduced-motion, theme, resize, audio, and stealth-mode checks pass.
- [x] Exported images contain only approved fields and work with an empty/estimated/exact telemetry history.

## Phase 5: Release qualification and packaging

### Objective

Prove the extension is safe, performant, installable, and supportable as `0.1.0`.

### 5.1 Automated release suite

- [x] Run unit tests, host/webview integration tests, and Extension Development Host E2E tests on the supported VS Code version range.
- [x] Test install, activation, view open/close/reload, settings, run completion, persistence across restart, migration, reset, and uninstall/reinstall expectations.
- [x] Add CI with dependency caching, locked installs, test reports, artifact retention, and a packaging job.

### 5.2 Reliability and resilience

- [x] Run sustained telemetry and high-entity stress fixtures; verify bounded queues, entity pools, and clean teardown.
- [x] Verify startup/activation behavior, hidden-view behavior, malformed input resistance, and port-conflict recovery paths applicable to the MVP.
- [x] Verify the packaged VSIX is `<10 MB`, or approve a recorded budget change before release.

### 5.3 Release assets and compatibility

- [x] Add `LICENSE`, `CHANGELOG.md`, privacy disclosure, settings documentation, troubleshooting, support links, and Marketplace metadata.
- [x] Audit `@vscode/vsce ls` output and third-party production licenses.
- [x] Package through the pinned local `@vscode/vsce` dependency via `npm run package`.
- [x] Install the resulting VSIX into a clean VS Code profile and record best-effort smoke results for each named fork.

### Final release gate

- [x] CI-equivalent locked-install jobs pass locally (`npm ci`, lint, typecheck, unit tests, Extension Development Host smoke test, and package).
- [x] No critical/high production security or privacy issue remains open; development-tool advisories are recorded as non-runtime follow-up.
- [x] No unlicensed or provenance-unknown asset is packaged; the VSIX audit contains only original SVG/text assets and project bundles.
- [x] Reliability, compatibility, and package-size evidence is recorded. Formal performance benchmarking is explicitly out of scope for `0.1.0`.
- [x] The VSIX installs, activates, completes the MVP run loop, persists state, and deactivates cleanly in the isolated VS Code profile smoke test.
- [x] Version `0.1.0` release notes accurately distinguish supported, experimental, estimated, and unavailable capabilities.

## Phase 6 refinement checkpoint

The scoped follow-up plan and decision record live in [phase-6-next-milestone.md](progress/phase-6-next-milestone.md) and [phase-6-contract.md](decisions/phase-6-contract.md). This work remains MVP-only and does not add DLC, real telemetry, third-party art, or map redesign.

- [x] Freeze the privacy-safe summary contract, hero best-level semantics, schema-2 migration, and single-owner gold ledger.
- [x] Implement structured victory/defeat summary, local export, loadout/damage empty states, and Guild-wallet reconciliation.
- [x] Show authoritative `Hero - Level N` best-run labels while keeping new runs at Level 1.
- [x] Add labeled run-gold HUD feedback and prevent boss-marker double counting; serialize host reward IPC.
- [x] Pass locked install, lint, typecheck, unit suite, build, host smoke, package, package audit, and production-only dependency audit.
- [ ] Complete the manual narrow-sidebar playthrough/screenshot review; the current automated host harness cannot drive webview DOM controls.

## Post-MVP backlog

Prioritize these only after `0.1.0` evidence and user feedback:

- additional original stages, characters, weapons, passives, evolutions, relics, Arcanas/Darkanas, modes, and secrets;
- additional stable telemetry integrations and host-specific companion adapters;
- broader fork compatibility, remote-workspace hardening, and web-extension feasibility;
- richer meta-progression, advanced unlocks, share-card layouts, localization, and expanded accessibility;
- Marketplace publishing automation and signed release provenance.

Each post-MVP item requires its own scoped issue, acceptance criteria, asset/license review, and regression tests. Mapping coverage alone does not make an item release-ready.
