# P3 implementation plan - bounded meta progression and unlocks

Status: implemented and reviewed; acceptance gate passed.
Date: 2026-08-01

> Retrospective review (2026-08-01): PowerUp/refund and Reroll/Skip/Banish foundations passed their scoped state/simulation tests, but the production webview exposes only Guild Might and does not expose those level-up actions or refunds. Several registered stats are behaviorally incomplete. Production completion moved to [P6](NEXT_DEVELOPMENT.md).

## Research and cross-check

Inputs:

- `.dev/plans/Vampire Survivors Mapping/03_PASSIVES_AND_POWERUPS_MAPPING.md`
- `.dev/plans/Vampire Survivors Mapping/08_RELICS_AND_META_UNLOCKS_MAPPING.md`
- `.dev/plans/Vampire Survivors Mapping/09_STAGE_MODIFIERS_AND_MODES_MAPPING.md`
- `.dev/VAMPIRE_SURVIVORS_PARITY_TODO.md`
- current `src/extension/stateManager.ts`, `src/shared/validation.ts`, `src/webview/main.ts`, and tests
- Vampire Survivors references: [Passive items](https://vampire-survivors.fandom.com/wiki/Passive_items), [Level up](https://vampire-survivors.fandom.com/wiki/Level_up), and [Stages](https://vampire-survivors.fandom.com/wiki/Stages)

Locked P3 decisions:

1. Meta PowerUps are bounded, costed, idempotent, and fully refundable. Guild Might migrates from its legacy unlimited 100-gold click to the mapped rank cap/cost table; the Token Guild battery remains a separate non-refundable track.
2. A fresh profile starts with Warrior and Code Dungeon. Existing profiles retain already unlocked heroes/stages/relics during migration. New unlocks are deterministic and visible: Wizard at a level-5 Warrior run, Rogue at 100 wallet gold, Ranger after three completed runs, Paladin after a level-10 run, and Necromancer after five completed runs. The first relics are recorded for the first clear, level-10 clear, and third completed run; no unimplemented UI is claimed as available.
3. Reroll, Skip, and Banish are available only when their bounded Guild ranks are purchased. They consume per-run charges, persist no run state, and are deterministic under the run seed. Banish removes a card ID from the current pool; Skip consumes one pending level without inventing XP; Reroll replaces the current cards.
4. Meta stat ranks are applied at run creation through one shared definition table. Unknown legacy upgrade keys are preserved but have no gameplay effect until explicitly registered.

## Scope

- Add bounded PowerUp definitions, costs, stat application, purchase, and full refund APIs.
- Add safe persisted unlock/relic/stage fields and migration without erasing legacy wallet/progress.
- Add deterministic hero/relic unlock conditions and visible locked-hero reasons.
- Add per-run Reroll/Skip/Banish actions gated by meta ranks.
- Preserve the battery track, run reward idempotency, P0-P2 combat/stage/pickup behavior, and DLC exclusion.

P4 production telemetry and P5 asset/presentation automation remain separate.

## Design

### Persistence

`PersistedProgress` remains schema version 3 for compatibility; missing P3 arrays are filled by migration and validated thereafter. New profiles use `unlockedHeroes: ['warrior']`, `unlockedStages: ['code-dungeon']`, and empty `relics`. Legacy profiles keep their existing unlocked arrays.

### Meta shop

`src/game/meta.ts` is the single source for rank caps, base costs, cost multipliers, and combat-stat effects. `StateManager.purchaseUpgrade` validates the ID, rank, cost, and cap before saving. `refundUpgrades` refunds the exact sum of paid ranks and clears only registered PowerUps; battery level and unrelated progress remain unchanged.

### Unlocks

Run reward persistence remains idempotent. On the first application of a run ID, hero records, wallet, unlock arrays, and relic conditions are updated atomically before save. Duplicate run IDs return the already persisted state unchanged.

### Level-up actions

Run state initializes action charges from meta ranks. Every action checks phase and remaining charges, then records a stable history entry. No action can mutate cards after the run resumes or grant a token/XP shortcut.

## Implementation sequence

1. Add meta definitions and persisted fields/migration/validation.
2. Apply meta stats in `createRun` and add StateManager purchase/refund/unlock operations.
3. Add simulation reroll/skip/banish actions and card-pool exclusions.
4. Update Guild UI for rank/cost/cap and locked-hero reasons.
5. Add migration, economy, unlock, action-gating, and idempotency tests.
6. Run typecheck, lint, tests, build, and diff checks; review fresh/migrated/refund/corrupt scenarios.

## Acceptance gate

- Fresh, legacy, corrupt, purchase, cap, refund, unlock, duplicate-reward, and restart scenarios are deterministic and preserve unrelated fields.
- Meta ranks change only their mapped combat/stat field; battery remains independent.
- Reroll, Skip, and Banish are impossible without charges and bounded with charges.
- The Guild UI displays the next cost/rank and explains locked heroes without exposing unavailable systems.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `git diff --check` pass.

## Review before implementation

Implementation review evidence (2026-08-01): `npm run typecheck`, `npm run lint`, `npm test -- --runInBand` (65 tests), `npm run build`, and `git diff --check` pass. Tests cover P3-array migration, fresh-profile gating, cost rounding, purchase caps, full refund with unknown-key preservation and battery isolation, deterministic hero/relic unlocks, duplicate run rewards, mapped meta stat effects, and gated per-run Reroll/Skip/Banish actions. The Guild UI now reports the bounded Guild Might rank/cost and locked-hero reason. The mapping lists many relics/modes and an aspirational full shop; P3 intentionally does not add Arcanas, Endless/Inverse/Limit Break, DLC, or a merchant.
