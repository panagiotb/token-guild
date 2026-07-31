# Phase 6 next-milestone plan: summary, hero preview, and reward visibility

Status: **implementation in progress; Step 6.0 contract freeze recorded in [phase-6-contract.md](../decisions/phase-6-contract.md)**.

This plan follows the execution rules and step-note format in [PROJECT_MANAGEMENT.md](../PROJECT_MANAGEMENT.md). It is the next scoped milestone after the `0.1.0` MVP release gate. It does not expand the stage, add DLC, add real telemetry, import third-party art, or redesign the map renderer.

## User objectives

1. Make the run summary visually useful instead of presenting one plain text line.
2. Show a meaningful level beside each hero in the start-of-run selector (for example, `Wizard - Level 4`).
3. Make gold visible and trustworthy: show gold collected during the run and in the final result, and clarify the yellow/gold pickup indicator.
4. Review the current game against the intended survivor-like experience and define the next implementation step before writing code.

## Evidence snapshot

- The MVP source is implemented on `agent/token-guild-mvp-ui`; this milestone adds the structured summary, schema-2 hero records, source-broken-down gold ledger, serialized host IPC handling, and focused tests without changing the map renderer or MVP scope.
- Current checks pass: `npm run lint`, `npm run typecheck`, `npm test` (36 tests), `npm run build`, `npm run test:e2e` (two Extension Development Host tests), and `npm run package` (58.25 KB). The E2E harness opens the webview but does not click through its DOM.
- The summary now has outcome, hero/level, duration, tokens/source/accuracy, run gold, Guild wallet, spawned/defeated counts, gold breakdown, upgrades, damage rows, empty states, and local PNG export fields.
- The run header now has pause/resume control; pause hides all content below the Token Guild header and shows only the synthetic-token total while the simulation loop is stopped.
- `RunSummary` owns the privacy-safe aggregate contract; `PersistedProgress.heroRecords` owns highest reached hero levels; the host's idempotent reward operation owns Guild wallet updates.
- Selector options render `Hero - Level N` with accessible text stating that N is the best run level and new runs start at Level 1.
- Ordinary enemy gems and boss gold remain pending map pickups until collection. Each gem awards +1 XP and +1 gold; the boss chest awards +100 exactly once when the hero reaches it. Synthetic token input no longer grants XP; run gold and Guild wallet remain separate until host persistence.
- PM `Current status` now reflects active MVP implementation and Phase 6 refinement rather than the old documentation-only state.

## Research and product alignment

The reference pattern is a survivor-like run HUD, not a copy of another game's screen. In *Vampire Survivors*, level-up pauses the run and presents a small set of weapon/passive choices; passive items modify player stats; weapons have levels and can evolve after their conditions are met. See [Level up](https://vampire-survivors.fandom.com/wiki/Level_up), [Player stats](https://vampire-survivors.fandom.com/wiki/Player_stats), [Passive items](https://vampire-survivors.fandom.com/wiki/Passive_items), and [Weapons](https://vampire-survivors.fandom.com/wiki/Weapons).

Token Guild should preserve the MVP subset: one stage, one primary weapon, three deterministic upgrade cards, synthetic telemetry, a boss, persistent Guild gold/Might, and a local summary export. The milestone should improve legibility and trust in those systems rather than add full inventory/evolution parity.

## Decisions to freeze before implementation

### D1. Meaning of a hero level in the selector

Recommended MVP interpretation: persist each hero's **highest reached run level**, display it as `Wizard - Level 4` with a small `best` tooltip/accessible description, and keep new runs starting at Level 1. This gives the requested information without silently turning the selector into a persistent starting-level advantage or breaking the survivor-like reset-per-run loop.

If the intended meaning is instead a persistent starting level, that is a separate progression rule requiring balance, migration, and reward decisions. The implementation must not infer that behavior from a label alone.

### D2. Gold ledger invariant

Choose one owner for each reward before rendering it:

- ordinary enemy gold is credited exactly once at the defined collection/reward event;
- the boss chest is either a pending pickup or an immediate reward, never both;
- run gold is separate from the persisted Guild wallet until the run reward is committed;
- the idempotent host reward path remains the authority across summary reopen/reload.

The summary must distinguish `run gold earned` from `Guild gold after save` so a user can reconcile the number.

### D3. Summary data contract

Extend the run summary only with approved, privacy-safe fields needed by the UI/export: hero ID/name, run level, elapsed time, token total plus source/accuracy, gold earned, enemy spawned/defeated counts, damage by weapon, and selected run upgrades. Do not add prompts, workspace paths, model output, or raw telemetry payloads.

## Planned execution steps

### Step 6.0 - freeze evidence and data decisions

Step: `6.0` - summary/hero/reward contract freeze  
Objective: approve the authoritative fields and invariants needed by all three user-visible changes.  
Dependencies: current MVP release gate; this plan.  
Scope: `.dev/progress/phase-6-next-milestone.md`, `src/game/types.ts`, `src/shared/types.ts`, `src/extension/stateManager.ts` only if the chosen hero-level schema requires migration.  
Risks: inventing persistent character progression or changing reward semantics without a migration and balance rule.  
Acceptance: D1-D3 are recorded as explicit decisions; every new field has an owner, default, validation rule, persistence behavior, and export/privacy classification.  
Checks: `npm run typecheck`; focused schema/state tests; review the diff before any UI implementation.  
Result: pass. Contract decisions are recorded in [phase-6-contract.md](../decisions/phase-6-contract.md); schema-2 types/validation, legacy/future recovery helpers, reward payload validation, and simulation summary fields are implemented. `npm run typecheck`, `npm run test:synthetic`, and `npm test` pass (36 tests).
Follow-up: Step 6.1 structured summary UI/export is in progress.

### Step 6.1 - redesign the run summary

Step: `6.1` - structured result screen  
Objective: turn the plain summary line into a readable, keyboard-accessible result panel.  
Dependencies: Step 6.0 summary data contract.  
Scope: `src/webview/main.ts`, `src/webview/style.css`, `src/webview/shareCard.ts`, shared/game summary types, and summary tests.  
Risks: visual density in a narrow sidebar; accidental exposure of raw telemetry; export fields drifting from the on-screen contract.  
Acceptance:

- Outcome is prominent and visually distinct for victory/defeat.
- Hero name, level, duration, tokens with source/accuracy, gold earned, and enemy spawned/defeated counts have labeled stat blocks.
- Damage-by-weapon and selected upgrades/loadout render as compact rows/chips with an empty-state message.
- A clearly separated reward block shows run gold earned and, after host persistence, the Guild wallet total.
- Export remains local and contains only the approved summary fields; empty damage/upgrades and defeat states render correctly.
- Keyboard focus order, contrast, reduced motion, and narrow-sidebar layout remain valid.

Checks: focused summary/share-card tests; `npm run lint`; `npm run typecheck`; `npm test`; Extension Development Host run through victory and defeat paths where practical.  
Result: pass. Structured victory/defeat summary markup, labeled stats, gold/wallet separation, loadout/damage empty states, keyboard-reachable actions, and privacy-safe local export are implemented. `npm run typecheck`, `npm run lint`, and `npm test` pass (36 tests); the Extension Development Host smoke still covers open/activation rather than DOM click-through.
Follow-up: Step 6.2 authoritative hero level labels and migration QA.

### Step 6.2 - add hero level preview at run start

Step: `6.2` - authoritative hero level labels  
Objective: show each hero's recorded highest reached level in the selector without changing the new-run starting level unless D1 explicitly changes.  
Dependencies: Step 6.0 D1; persistence migration/recovery rules.  
Scope: `src/shared/types.ts`, `src/shared/validation.ts`, `src/extension/stateManager.ts`, `src/webview/main.ts`, `src/webview/style.css`, migration/state tests.  
Risks: corrupt or future progress; confusing best level with starting level; stale labels after a run.  
Acceptance:

- Every hero has a validated default record (`highestLevel: 1` unless migrated data says otherwise).
- Selector labels visibly include the level, for example `Wizard - Level 4`, and accessible text explains whether it is best reached or starting level.
- Completing or failing a run updates the intended record exactly once according to the chosen policy.
- Existing progress migrates safely; corrupt/future data falls back without losing unrelated wallet/settings data.
- A new run's actual `RunState.level` matches the declared D1 behavior.

Checks: migration/default/corruption tests; selector rendering test; deterministic run progression test; `npm test`; E2E activation/open test.  
Result: pass. Schema-2 `heroRecords` migration/recovery, idempotent hero-level reward update, selector formatting helper, and level-one run-start semantics are implemented and tested.
Follow-up: Step 6.3 gold ledger and runtime feedback review.

### Step 6.3 - make gold visible and correct

Step: `6.3` - reward ledger and feedback  
Objective: show gold inflow during the run and reconcile it in the summary while making pending gold pickups visible.
Dependencies: Step 6.0 D2; Step 6.1 summary model.  
Scope: `src/game/types.ts`, `src/game/simulation.ts`, `src/game/telemetryMapping.ts`, `src/webview/main.ts`, `src/webview/style.css`, tests, and share-card fields if approved.  
Risks: boss reward double counting; confusing gold pickup visuals with XP dots; host/webview duplicate reward messages.  
Acceptance:

- Run HUD shows current run gold and a labeled gold icon/tooltip; pending coins/chests are visibly distinct from XP drops.
- Gold pickup/reward feedback distinguishes gold from XP and names the source (`enemy`, `boss chest`, or other approved source).
- Ordinary kills, boss chest collection, defeat, victory, summary reopen, and duplicate `RECORD_RUN_REWARD` paths each have a deterministic ledger assertion.
- The final summary shows run gold earned and persisted Guild wallet total separately.
- Existing Guild Might purchase behavior remains correct after reward reconciliation.

Checks: table-driven ledger tests; boss-chest no-double-count regression; reward idempotency tests; focused UI/source-label test; full `npm test`; E2E smoke run.  
Result: pass. Run-local gold is now source-broken down in the HUD and summary; enemy gems and the boss chest remain pending until collection, each collection credits once, completion telemetry keeps its separate one-time guard, and host rewards remain idempotent. Focused ledger tests and the full 36-test suite pass.
Follow-up: Step 6.4 integrated runtime/release gate.

### Step 6.4 - milestone runtime review and release gate

Step: `6.4` - integrated playthrough and handoff  
Objective: verify the actual user path and decide whether the next milestone is ready for packaging/review.  
Dependencies: Steps 6.1-6.3 all pass.  
Scope: built webview, Extension Development Host, VSIX, this plan, and progress evidence.  
Risks: unit tests passing while the narrow sidebar, modal focus, summary navigation, or persisted wallet behavior fails in the real host.  
Acceptance:

- Clean profile: install/open Guild, select a labeled hero, start a run, reach a level-up, choose an upgrade, observe gold/enemy counters, finish victory and defeat paths, open both explanations, and return to Guild.
- Summary survives the narrow sidebar and keyboard-only navigation; export remains local and privacy-safe.
- Hero level, gold, upgrades, and Guild wallet agree across summary, return, reload, and reset behavior.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`, and `npm run package` pass.
- Evidence is recorded in `.dev/progress/phase-6-next-milestone.md` and the PM checkboxes are updated only for verified criteria.

Checks: full regression suite, isolated VS Code install/smoke, `vsce ls --tree`, package-size check, and source/diff review against the referenced image.
Result: pass for the automated release gate. Lint, typecheck, 36 unit tests, build, E2E (2/2 host tests), and package (58.25 KB) all pass. Deterministic simulation/state/UI-model tests cover victory, defeat, empty summary states, migration, level labels, stable upgrade rendering, pause overlay formatting, gem-owned XP/gold collection, boss no-double-counting, duplicate rewards, and reset. The repository's Extension Development Host harness does not expose webview DOM automation, so the remaining limitation is a documented manual click-through/screenshot review rather than an unverified code path.
Follow-up: package is ready for review; keep the manual narrow-sidebar playthrough as the next human smoke check.

## QA matrix

| Area | Required cases | Evidence |
| --- | --- | --- |
| Summary | victory, defeat, empty damage, multiple upgrades, zero gold, export | focused UI/share-card tests plus host smoke |
| Hero level | default, migrated, corrupt, future schema, failed run, completed run, selector refresh | state/migration/selector tests |
| Gold | ordinary kill, boss chest, uncollected chest, defeat, victory, duplicate host reward, reset | ledger and persistence tests |
| Runtime | narrow sidebar, keyboard focus, modal open/close, hidden/reopened view, reload | Extension Development Host/manual evidence |
| Privacy | only approved aggregate summary fields in DOM/export | source review and export assertions |

## Explicitly deferred

- Full *Vampire Survivors* inventory/evolution/character-unlock parity.
- Real telemetry adapters and token-source changes.
- Map redesign or map-color changes.
- Purchased third-party art integration; current inline icons remain the approved MVP assets.
- Performance benchmarking beyond existing bounded-resource/stability checks.

## Handoff

Phase 6 implementation is complete for the automated gate. The next review action is a manual narrow-sidebar playthrough using the token-free README smoke test, including a level-up, upgrade selection, victory/defeat summary, both explanation dialogs, return-to-Guild, reload, and reset verification.
