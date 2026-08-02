# Token Guild development documentation

This directory separates verified behavior, decisions, specifications, research, retained plans, and future work. Source code and passing tests take precedence if a document drifts.

## Start here

- [Current functionality manual](CURRENT_MANUAL.md) — verified behavior in the current build.
- [Project management](PROJECT_MANAGEMENT.md) — unattended-work rules, quality gates, and plan-retention policy.
- [Next development](plans/NEXT_DEVELOPMENT.md) — the ordered, currently proposed implementation milestone.
- [Vampire Survivors parity backlog](VAMPIRE_SURVIVORS_PARITY_TODO.md) — current comparison against the intended base-game experience.
- [Autonomy configuration](AUTONOMY_CONFIG.json) — machine-readable unattended-execution boundaries.

## Product decisions and specifications

- [Accepted divergences](decisions/accepted-divergences.md) — the only approved mechanics departure is token battery gameplay; synthetic income is an additive test source and the former gold divergence is retired.
- [MVP renderer](decisions/mvp-renderer.md) — Canvas/DOM remains the first-pass renderer.
- [Telemetry feasibility](decisions/telemetry.md) — synthetic telemetry is the default; the loopback OTLP/HTTP JSON adapter is opt-in and tested.
- [UI assets](decisions/ui-assets.md) — inline icon/vector policy and third-party asset gate.
- [Token battery specification](specifications/token-battery.md) — implemented formulas, states, persistence, and known product decisions.

## Research and retained plans

- [Token Master integration research](research/token-master.md) — local audit notes that informed the implemented adapter; no Token Master code was copied.
- [Visual effects backlog](research/visual-effects.md) — renderer-neutral ideas that remain future work.
- [Plan index](plans/README.md) — permanent index for active, completed, superseded, and reference plans.
- [Vampire Survivors mapping](plans/Vampire%20Survivors%20Mapping/00_OVERVIEW_AND_ARCHITECTURE.md) — retained reference inventory; it is not an implementation contract.

## Documentation rules

1. Never describe registry data, a prototype helper, or a future adapter as user-facing functionality.
2. Add current behavior to `CURRENT_MANUAL.md` only after its production path is implemented and tested.
3. Track unfinished gameplay in `VAMPIRE_SURVIVORS_PARITY_TODO.md`; track the ordered next milestone in `plans/NEXT_DEVELOPMENT.md`.
4. Retain every execution plan under `plans/`, including completed and superseded plans. Never delete a plan to make the current state look cleaner; add a dated status or a successor plan instead.
5. Record durable product or architecture choices in `decisions/`; keep exploratory material in `research/`.
6. Treat the mapping collection as reference material. Re-verify facts and reconcile them with accepted divergences before implementation.
