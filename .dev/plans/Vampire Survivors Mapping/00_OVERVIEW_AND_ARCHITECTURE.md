# Vampire Survivors mapping: overview and architecture

> Status reviewed 2026-08-01: retained planning reference, not a shipped-feature list or implementation contract. Current source code, tests, accepted decisions, and the current manual take precedence.

## Purpose

This collection records candidate mappings from the base *Vampire Survivors* structure into Token Guild terminology. It is useful for naming, content planning, and parity research. The collection was created before the current implementation and contains aspirational, unverified, advanced, secret, and DLC material. A table in these files does not mean its content is implemented, balanced, licensed, or approved for the MVP.

Before using an entry, a development plan must:

1. verify the relevant behavior against current authoritative sources;
2. compare it with the current implementation and tests;
3. classify it as base-game MVP, later base-game work, or DLC/reference-only;
4. reconcile it with the accepted Token Guild divergences;
5. define a small production path and acceptance tests.

## Current product boundary

Token Guild is currently a desktop VS Code extension using a deterministic Canvas/DOM survivor-style simulation. The shipped slice contains one authored stage, six mapped heroes and starting weapons, a bounded stage loop, persistent progression foundations, token battery gameplay, synthetic telemetry, an opt-in localhost OTLP JSON adapter, and a locally generated run-summary PNG.

The only approved departures from the base-game model are:

- token telemetry charges and drains the persistent battery, which gates active play;
- collected XP gems and approved battery overflow also feed Token Guild's gold economy.

Telemetry must otherwise remain orthogonal to combat, movement, XP values, enemy spawning, weapon behavior, character passives, boss outcomes, and stage progression. Older suggestions in this collection that bind thinking time, error events, terminal exits, token rate, or code complexity directly to those systems are rejected unless a future decision record explicitly approves a new divergence.

The MVP targets VS Code. Cursor and Windsurf compatibility may be investigated later; it is not currently a certified product claim.

## Authority and data flow

```text
synthetic fixture or opt-in loopback OTLP JSON
                    |
                    v
       validated host telemetry event
                    |
                    v
           TokenBus and battery
                    |
          charge / drain / lockout
                    |
                    v
 deterministic game simulation <-> Canvas/DOM presentation
                    |
                    v
       validated persistent progress
```

Combat and stage behavior must remain deterministic from simulation state and explicit player actions. The host should become authoritative for persistent currency, rewards, unlocks, and purchases; the webview must not be trusted to submit arbitrary final economy state.

## Collection index and scope

| File | Intended use | Current scope |
| --- | --- | --- |
| [Characters and passives](01_CHARACTERS_AND_PASSIVES_MAPPING.md) | Candidate hero identities, stats, and traits | First six are partial foundations; full roster later |
| [Weapons and evolutions](02_WEAPONS_AND_EVOLUTIONS_MAPPING.md) | Candidate weapon tables and recipes | First six weapons/five recipes are partial foundations |
| [Passives and PowerUps](03_PASSIVES_AND_POWERUPS_MAPPING.md) | Candidate in-run and meta stats | Foundations exist; production UI/behavior is incomplete |
| [Pickups, drops, and telemetry](04_PICKUPS_DROPS_AND_TELEMETRY_MAPPING.md) | Candidate pickup/drop inventory | Use pickup ideas only; reject direct combat telemetry hooks |
| [Stat formulas](05_STAT_FORMULAS_AND_TELEMETRY_MATH.md) | Candidate formulas requiring verification | Reference only; current implementation is authoritative |
| [Stages, enemies, and bosses](06_STAGES_ENEMIES_AND_BOSSES_MAPPING.md) | Candidate waves and encounters | One partial base-game-style stage is implemented |
| [Arcanas and Darkanas](07_ARCANAS_AND_DARKANAS_MAPPING.md) | Advanced build systems | Later, outside current MVP |
| [Relics and meta unlocks](08_RELICS_AND_META_UNLOCKS_MAPPING.md) | Candidate progression gates | Minimal foundations only; broader system later |
| [Stage modifiers and modes](09_STAGE_MODIFIERS_AND_MODES_MAPPING.md) | Hyper/Hurry/Inverse/Endless/Limit Break | Later, outside current MVP |
| [Secret weapons and unions](10_SECRET_WEAPONS_AND_UNIONS_MAPPING.md) | Advanced/secret builds | Later, outside current MVP |
| [Secret characters](11_SECRET_CHARACTERS_MAPPING.md) | Secret roster ideas | Later, outside current MVP |
| [DLC expansions](12_DLC_EXPANSIONS_MAPPING.md) | Historical/reference inventory | DLC; explicitly out of scope |
| [Audio and persistence](13_AUDIO_AND_PERSISTENCE_SCHEMA_MAPPING.md) | Candidate presentation/schema ideas | Verify case by case; current schema is authoritative |
| [JSON registry](14_JSON_DATA_REGISTRY.md) | Aspirational data examples | Not production-ready; canonical data is `src/game/data/` |
| [Mapping status](PendingItems.md) | Review status and unresolved mapping work | Active reference status |

## Implementation status summary

The P0-P5 plans established useful engine foundations, but their completion labels should not be read as complete base-game parity. The 2026-08-01 implementation review found these important production gaps:

- the webview exposes Guild Might and battery purchasing, but not the wider PowerUp shop or refund flow supported by the state layer;
- Reroll, Skip, and Banish exist in simulation methods/tests but have no normal level-up UI;
- tactical pickup effects exist in runtime/tests, but normal enemy/stage production does not spawn them;
- Duration, Luck, Greed, Curse, and Revival are represented in progression/stat data but do not yet have complete gameplay effects;
- chest reward ownership is run-global, so only the first chest can grant a new result;
- the host accepts reward/progress values supplied by the webview instead of owning the entire economy transition;
- the Extension Development Host smoke test opens the view but does not exercise webview DOM interactions.

The ordered response to those gaps is in [the next development plan](../NEXT_DEVELOPMENT.md). Verified user-facing behavior is documented in [the current manual](../../CURRENT_MANUAL.md).
