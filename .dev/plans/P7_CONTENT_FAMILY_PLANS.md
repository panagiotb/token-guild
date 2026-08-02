# P7 retained base-game content family plans

**Status:** Retained child-plan index, created 2026-08-02  
**Parent:** [P7 full-game roadmap](P7_FULL_GAME_ROADMAP.md)  
**Gate:** Do not implement these families until G-01 through G-07 and the first-stage acceptance gate are complete. DLC, marketplace/payment, licensed crossover content, online multiplayer, and unapproved external art remain excluded.

This document is intentionally a set of retained child plans rather than a promise that the families are already shipped. Each family is a vertical slice: source review, registry schema, host ownership, deterministic domain behavior, snapshot/IPC contract, production UI, persistence/unlock migration, replay/duplicate coverage, and manual evidence before the next family begins.

## Shared child-plan contract

Every family must leave these artifacts before it is marked complete:

1. A dated source table in `.dev/parity/` distinguishing verified, observed, approximated, and deferred rules.
2. Validated content data with stable IDs, explicit caps, unlock requirements, ownership, and migration version.
3. Pure simulation behavior independent of DOM, VS Code, telemetry, wall-clock timing, and network state.
4. Host-owned persistent rewards/unlocks and bounded snapshots; client messages are narrow intents only.
5. Focused success, boundary, invalid-content, duplicate/replay, reconnect, reset/migration, accessibility, and export tests.
6. A token-free production-webview interaction route plus a recorded narrow/medium/wide manual checkpoint.
7. Updated manual, parity matrix, `NEXT_UPDATES.md`, and the relevant P7 gap register row.

## 1. Weapons, passives, evolutions, unions, and gifts

**Dependency:** G-03/G-04 first-stage combat and capability ownership.  
**Source starting points:** [Weapons](https://vampire-survivors.fandom.com/wiki/Weapons), [Evolution](https://vampire-survivors.fandom.com/wiki/Evolution), and the retained `Vampire Survivors Mapping/02_WEAPONS_AND_EVOLUTIONS_MAPPING.md` (planning reference only).

- Expand the registry from the current first roster one vertical weapon at a time. Each weapon declares pattern, aim, level rows, amount/area/speed/duration/pierce/knockback, target selection, projectile lifetime, evolution/union recipe, and whether it can appear in a chest or level-up pool.
- Implement behavior through named attack strategies, not a growing conditional shortcut. Add deterministic target/facing/random selection, boomerang/return, orbit, floor-pool, beam, screen-clear, and union rules only when each has an authored contract.
- Model passives with cumulative or changing per-rank effects, cap enforcement, evolution eligibility, and custom upgrade copy from the same resolver used by simulation.
- Add inventory-slot replacement/union semantics, chest multi-evolution ordering, invalid recipe rejection, and duplicate reward idempotence.

**Exit gate:** every exposed weapon/passive row changes observable combat and has a source-backed card, result, summary, replay, and migration test.

## 2. Characters and class traits

**Dependency:** G-04 capability ownership and G-07 character persistence.  
**Source starting points:** retained `Vampire Survivors Mapping/01_CHARACTERS_AND_PASSIVES_MAPPING.md` and the current class registry.

- Add characters only with starting weapon, base stats, trait cadence/effect, unlock condition, price, portrait role, and supported input/UI copy.
- Keep class trait progression separate from level-record history; never expose an irrelevant highest-level label as a gameplay mechanic.
- Validate locked selection at the host `START_RUN` boundary and migrate legacy records without granting an unlock.
- Test every trait boundary, max/cap behavior, locked/disabled/selected states, reset, reconnect, and summary/export identity.

**Exit gate:** each selectable character has a real tested trait and cannot be bypassed through a forged client message or stale save.

## 3. Additional stages and encounter schedules

**Dependency:** open-world camera, stage-owned combat/drop/finale policies, and first-stage acceptance.  
**Source starting points:** retained `Vampire Survivors Mapping/06_STAGES_ENEMIES_AND_BOSSES_MAPPING.md` and [Stages](https://vampire-survivors.fandom.com/wiki/Stages).

- Add one stage per vertical slice with topology (`open`, `corridor`, or `bounded`), duration, unlock, waves, enemy scaling, contact policy, spawn/persistence radii, drop-table ID, and finale contract.
- Keep camera/world policies explicit; bounded stages must declare walls/collision rather than inheriting Code Dungeon's open topology.
- Add stage-specific enemy rosters, light-source/chest tables, finale threats, rewards, and manual checkpoints. Unknown or locked stages must fail closed at host and snapshot boundaries.

**Exit gate:** a seeded run can start, replay, pause, reconnect, finish, and export each stage without borrowing hidden Code Dungeon balance.

## 4. Collection, bestiary, relics, maps, and achievements

**Dependency:** host persistence and stable content IDs.  
**Source starting points:** retained mapping files `07_COLLECTION_AND_BESTIARY_MAPPING.md`, `08_RELICS_AND_MAPS_MAPPING.md`, and [Collection](https://vampire-survivors.fandom.com/wiki/Collection).

- Define discovery records, enemy/weapon/passive metadata, map/relic ownership, achievement criteria, and reward/unlock effects as host-owned registries.
- Record discoveries only from canonical run events; do not infer unlocks from client labels or telemetry throughput.
- Add bounded collection views, locked explanations, export-safe summaries, schema migrations, reset semantics, and duplicate achievement idempotence.

**Exit gate:** every displayed discovery has an authoritative event and migration-safe persistent record.

## 5. Merchant and economy systems

**Dependency:** G-05 gold ledger and G-07 wallet/progression separation.  
**Source starting points:** retained `Vampire Survivors Mapping/03_PASSIVES_AND_POWERUPS_MAPPING.md`, `13_AUDIO_AND_PERSISTENCE_SCHEMA_MAPPING.md`, and [Gold](https://vampire-survivors.fandom.com/wiki/Gold).

- Keep wallet, run ledger, prices, refunds, merchant inventory, and purchases host-owned and transaction-idempotent.
- Add only verified base-game purchase/cost curves; preserve grandfathered wallet values and never silently convert old balances.
- Test unaffordable, max-rank, stale, duplicate, reset, corrupt-save, and reconnect paths, including export distinction between run gold and Guild wallet.

**Exit gate:** no UI purchase can mutate persistent value without a validated host intent and an auditable ledger entry.

## 6. Arcanas and advanced progression

**Dependency:** complete stat/capability contract and first-stage balance.  
**Source starting points:** retained `Vampire Survivors Mapping/08_ARCANAS_MAPPING.md` and [Arcanas](https://vampire-survivors.fandom.com/wiki/Arcanas).

- Add one Arcana at a time with explicit trigger, stat/effect formula, stage eligibility, selection timing, reroll/banish behavior, and persistence rules.
- Separate permanent PowerUps from run-scoped Arcana effects. No Arcana may bind to telemetry or bypass battery gating.
- Test trigger boundaries, stacking/order, pause/reconnect, invalid selection, summary/export, and save migration.

**Exit gate:** every Arcana changes a tested run outcome and its copy explains the exact effect.

## 7. Modes: Hyper, Hurry, Inverse, Endless, and Limit Break

**Dependency:** stage policy registry, scaling, camera, reward, and end-state contracts.  
**Source starting points:** retained `Vampire Survivors Mapping/09_STAGE_MODIFIERS_AND_MODES_MAPPING.md` and [Stages](https://vampire-survivors.fandom.com/wiki/Stages).

- Represent each mode as a validated modifier set with explicit timer, enemy scaling, topology, reward, pause, finale, and unlock behavior.
- Ensure modes compose deterministically and do not mutate the base stage registry. Endless must define bounded persistence/resource policy for the VS Code host.
- Test mode selection/lockout, scaling at boundaries, reward ownership, reconnect, summary/export, and unsupported-platform decisions.

**Exit gate:** mode rules are data-owned, replay-identical, and cannot be activated through an unknown modifier string.

## 8. Golden Eggs and late economy

**Dependency:** merchant/wallet persistence and verified gold balance.  
**Source starting points:** retained `Vampire Survivors Mapping/07_COLLECTION_AND_BESTIARY_MAPPING.md` and [Golden Egg](https://vampire-survivors.fandom.com/wiki/Golden_Egg).

- Add persistent per-character bonuses only after migration and refund policy are explicit. Store bounded integer ranks/values with a versioned schema.
- Apply bonuses through the same stat resolver as classes/passives/meta upgrades; show their source and cap in the character panel.
- Test purchase cost, caps, reset, corrupt save, replay, and cross-character isolation.

**Exit gate:** late economy cannot create unbounded values or silently alter existing wallet/progression records.

## 9. Secrets, secret characters, and local co-op feasibility

**Dependency:** all prior progression/persistence and a supported-platform decision.  
**Source starting points:** retained `Vampire Survivors Mapping/10_SECRET_WEAPONS_AND_UNIONS_MAPPING.md`, `11_SECRET_CHARACTERS_MAPPING.md`, and `15_SECRET_UNLOCKS_MAPPING.md`.

- Implement secrets only with deterministic, documented unlock inputs; do not read terminal history, private files, credentials, or unsupported VS Code APIs.
- Evaluate local co-op as a separate feasibility spike. Define input ownership, simultaneous movement, camera policy, UI layout, battery semantics, save/replay format, and accessibility before implementation.
- If the supported webview cannot provide safe local co-op input/focus behavior, retain an evidence-backed limitation instead of substituting browser or private APIs.

**Exit gate:** each secret has a reproducible unlock and every unsupported co-op capability is recorded as a decision; no DLC or online multiplayer is introduced.

## Execution order and handoff

Implement sections 1–3 before collection/merchant systems, then 4–5, then 6–8, and finally 9. At the end of each family, append evidence to the parity matrix and update the P7 gap plan. Never delete this child plan; supersede a family with a dated addendum if its scope changes.
