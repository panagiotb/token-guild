# Retained development plans

Every Token Guild execution plan is retained here as a permanent project record. Completion, abandonment, or supersession changes a plan's status; it does not justify deleting the plan.

## Status conventions

- **Proposed:** ordered work awaiting explicit implementation authorization.
- **Active:** the currently authorized milestone.
- **Completed:** implementation and its stated acceptance gates finished at the time recorded.
- **Superseded:** preserved for history, with a link to its successor.
- **Reference:** research or mapping material that informs plans but does not claim implementation.

When a plan changes materially, add a dated addendum or a successor document. Do not silently broaden a completed milestone or rewrite its historical acceptance evidence.

## Index

| Plan | Status | Purpose |
| --- | --- | --- |
| [P0 rules and combat](p0-rules-and-combat.md) | Completed foundation | Deterministic combat and first data-driven content slice |
| [P1 stage loop](p1-stage-loop.md) | Completed foundation | Authored Code Dungeon timeline and outcome paths |
| [P2 pickups, treasure, evolution](p2-pickups-treasure-evolution.md) | Completed foundation | Pickup/chest/evolution engine paths |
| [P3 meta progression and unlocks](p3-meta-progression-unlocks.md) | Completed foundation | Persistent upgrade/unlock state and simulation actions |
| [P4 production telemetry](p4-production-telemetry.md) | Completed | Opt-in local OTLP JSON adapter and shared TokenBus boundary |
| [P5 presentation and game feel](p5-presentation-and-game-feel.md) | Completed foundation | Canvas/DOM feedback, accessibility, and summary export |
| [P6 next development](NEXT_DEVELOPMENT.md) | Proposed | Close production-path, authority, behavior, and interaction-test gaps |
| [Vampire Survivors mapping](Vampire%20Survivors%20Mapping/00_OVERVIEW_AND_ARCHITECTURE.md) | Reference | Retained mapping inventory; not a shipped contract |

“Completed foundation” means that the plan's scoped engine work and tests were completed; it does not imply full base-game parity or that every helper is exposed in the user interface.
