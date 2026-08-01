# Vampire Survivors mapping status and pending work

> Status reviewed 2026-08-01: this is a retained reference inventory. The earlier claim of “100% comprehensive coverage” was not supported by implementation or source-verification evidence and has been withdrawn.

## What this collection establishes

The mapping files provide a broad vocabulary for characters, weapons, passives, PowerUps, pickups, enemies, stages, modes, secrets, and DLC. They are useful inputs to future research and milestone planning. They do not establish that:

- every listed item is accurate to the current base game;
- every numeric table is verified or balanced;
- any listed mechanic is present in the production path;
- DLC, secret, or advanced-mode content belongs in the MVP;
- the JSON examples match the current TypeScript registries;
- direct IDE-event-to-combat bindings are approved.

## Review classification

| Reference area | Current disposition |
| --- | --- |
| First-stage characters, weapons, passives, pickups, enemies, and evolutions | Reconcile with source and tests as part of the next base-game slice |
| Meta PowerUps, unlocks, Reroll, Skip, and Banish | Engine/state foundations exist; production UI and behavioral completion remain |
| Additional base stages and roster | Retained for a later milestone after the first slice is complete |
| Arcanas, Darkanas, advanced unions, relic systems, modes, and secrets | Later base-game work; not part of the next MVP pass |
| DLC expansions | Reference-only; explicitly outside MVP scope |
| Telemetry-triggered combat or stage events | Rejected under the current accepted-divergence decision |
| JSON examples | Aspirational examples only; do not copy directly into production |

## Immediate unresolved work

The code review found that the next milestone should close existing production-path gaps before adding content:

1. add a real webview interaction test boundary;
2. make the extension host authoritative for economy/progression mutations;
3. expose the supported PowerUp/refund and Reroll/Skip/Banish flows;
4. add authored production spawns for tactical pickups and light-source equivalents;
5. replace run-global chest claiming with per-chest reward ownership;
6. make every exposed stat behavioral or temporarily hide it;
7. re-run automated and recorded manual QA before declaring those systems shipped.

See [NEXT_DEVELOPMENT.md](../NEXT_DEVELOPMENT.md) for the ordered implementation plan and [VAMPIRE_SURVIVORS_PARITY_TODO.md](../../VAMPIRE_SURVIVORS_PARITY_TODO.md) for the broader base-game backlog.

## Retention rule

These files remain in the repository even when superseded. Future reviews should add a dated correction or successor plan rather than deleting planning history. Incorrect claims may be corrected in place when they describe current status, while the Git history preserves their original wording.
