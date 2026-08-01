# Token Guild development documentation

This directory separates shipped behavior from decisions, specifications, research, and future work. Source code and passing tests take precedence if a document drifts.

## Start here

- [Current functionality manual](CURRENT_MANUAL.md) — what version `0.1.0` actually does today, including limitations and token-free testing.
- [Project management](PROJECT_MANAGEMENT.md) — active status, unattended-work rules, quality gates, and the next implementation milestone.
- [Vampire Survivors parity backlog](VAMPIRE_SURVIVORS_PARITY_TODO.md) — source-verified gaps between the current build and the intended base-game experience.
- [Autonomy configuration](AUTONOMY_CONFIG.json) — machine-readable unattended-execution boundaries.

## Product decisions and specifications

- [Accepted divergences](decisions/accepted-divergences.md) — the only approved departures from the base *Vampire Survivors* gameplay model: token battery gameplay and Token Guild gold acquisition.
- [MVP renderer](decisions/mvp-renderer.md) — Canvas/DOM remains the first-pass renderer.
- [Telemetry feasibility](decisions/telemetry.md) — synthetic telemetry is current; real adapters remain opt-in future work.
- [UI assets](decisions/ui-assets.md) — current inline-icon policy and third-party asset gate.
- [Token battery specification](specifications/token-battery.md) — implemented formulas, states, persistence, and known product decision.

## Research, not implementation

- [Token Master integration research](research/token-master.md) — candidate OTLP patterns that have not been integrated into Token Guild.
- [Visual effects backlog](research/visual-effects.md) — renderer-neutral VFX goals for a later gameplay pass.
- [Vampire Survivors Mapping](Vampire%20Survivors%20Mapping/) — broad design-reference material. It is intentionally not an implementation checklist and was excluded from this cleanup.

## Documentation rules

1. Never describe registry data, a prototype helper, or a future adapter as user-facing functionality.
2. Add current behavior to `CURRENT_MANUAL.md` only after its real boundary is implemented and tested.
3. Track unfinished gameplay in `VAMPIRE_SURVIVORS_PARITY_TODO.md`; track the one active milestone in `PROJECT_MANAGEMENT.md`.
4. Keep completed execution history in Git rather than accumulating phase-plan files.
5. Record a durable product or architecture choice in `decisions/`; keep exploratory material in `research/`.
