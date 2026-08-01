# Token Guild development documentation

This directory separates shipped behavior, decisions, specifications, research, plans, and future work. Source code and passing tests take precedence if a document drifts.

## Start here

- [Current functionality manual](CURRENT_MANUAL.md) — verified behavior in the current build.
- [Project management](PROJECT_MANAGEMENT.md) — active status, unattended-work rules, quality gates, and milestone process.
- [Vampire Survivors parity backlog](VAMPIRE_SURVIVORS_PARITY_TODO.md) — source-verified gaps against the intended base-game experience.
- [Autonomy configuration](AUTONOMY_CONFIG.json) — machine-readable unattended-execution boundaries.

## Product decisions and specifications

- [Accepted divergences](decisions/accepted-divergences.md) — the only approved departures: token battery gameplay and Token Guild gold acquisition.
- [MVP renderer](decisions/mvp-renderer.md) — Canvas/DOM remains the first-pass renderer.
- [Telemetry feasibility](decisions/telemetry.md) — synthetic telemetry is the default; the loopback OTLP/HTTP JSON adapter is opt-in and tested.
- [UI assets](decisions/ui-assets.md) — inline icon/vector policy and third-party asset gate.
- [Token battery specification](specifications/token-battery.md) — implemented formulas, states, persistence, and known product decisions.

## Research and plans

- [Token Master integration research](research/token-master.md) — local audit notes that informed the implemented adapter; no Token Master code was copied.
- [Visual effects backlog](research/visual-effects.md) — renderer-neutral ideas that remain future work.
- [Execution plans](plans/) — one reviewed plan per completed or active parity milestone.
- [Vampire Survivors Mapping](Vampire%20Survivors%20Mapping/) — broad design-reference material intentionally excluded from cleanup and implementation checklists.

## Documentation rules

1. Never describe registry data, a prototype helper, or a future adapter as user-facing functionality.
2. Add current behavior to `CURRENT_MANUAL.md` only after its boundary is implemented and tested.
3. Track unfinished gameplay in `VAMPIRE_SURVIVORS_PARITY_TODO.md`; track the one active milestone in `PROJECT_MANAGEMENT.md`.
4. Keep completed execution history in Git rather than accumulating obsolete phase-plan files.
5. Record durable product or architecture choices in `decisions/`; keep exploratory material in `research/`.
