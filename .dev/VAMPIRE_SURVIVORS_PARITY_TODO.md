# Vampire Survivors parity comparison and backlog

Reviewed against the production code and tests on 2026-08-01. This is a base-game comparison, not a DLC plan. The retained [mapping collection](plans/Vampire%20Survivors%20Mapping/00_OVERVIEW_AND_ARCHITECTURE.md) supplies candidate terminology and research leads; it is not proof that a mechanic is implemented or source-verified.

## Accepted divergences

Only these departures are currently approved:

1. **Token battery gameplay:** normalized token telemetry charges an upgradable battery; active/idle drain and recharge lockout gate the run.
2. **Token Guild gold acquisition:** collected XP gems also grant the approved gold value, and collectible battery-overflow coins can grant gold.

Telemetry must not otherwise control movement, damage, attack speed, XP, enemies, character passives, chests, bosses, victory, defeat, or the authored stage clock without a new decision record.

## Current implementation comparison

| System | Verified current state | Base-game direction | Assessment |
| --- | --- | --- | --- |
| Core combat | Deterministic movement, auto-attacks, projectiles/areas, damage, knockback, contact damage, invulnerability | Preserve and deepen weapon-specific survivor combat | Working foundation |
| Stage | One 30-minute authored Code Dungeon with waves, elites, final threat, victory/defeat | Authentic cadence and encounter handling | Working first slice |
| Heroes | Six mapped heroes with starting weapons/stats and simple unlock records | Verified per-character traits, identity, and larger base roster | Partial |
| Weapons/passives | Six weapon patterns/level tables, passive pool, bounded slots, five evolution recipes | Verified tables, complete behavior, broader base pool | Partial |
| XP and gold | Collected XP gems grant XP plus approved Token Guild gold; overflow condenses | Retain approved divergence while matching collection ownership | Working divergence |
| Tactical pickups | Healing/magnet/freeze/screen-clear/gold effects exist in the simulation | Authored light-source/drop path and target-consistent rules | Not production-reachable |
| Chests | Boss/elite chest collection can grant one deterministic item/evolution and gold | Independent multi-chest ownership, reward multiplicity/luck | First chest only |
| Meta progression | Persistent upgrade/unlock foundations; Guild Might and battery are exposed | Full supported PowerUp shop/refund and verified unlock flow | Partially exposed |
| Level-up actions | Reroll/Skip/Banish methods and charge tests exist | Visible, usable, accessible action controls | Not production-reachable |
| Stats | Core Might/Armor/Move/Cooldown/etc. paths exist | Every exposed stat must affect its intended mechanic | Duration/Luck/Greed/Curse/Revival incomplete |
| Telemetry | Synthetic 100 tokens/second by default; opt-in bounded localhost OTLP JSON adapter | Keep orthogonal to gameplay outside battery/gold decision | Working divergence |
| Presentation | Canvas silhouettes, feedback/audio, pause, summary, local PNG export | More readable production art/UI after mechanics are solid | MVP foundation |
| Persistence/security | Validation, migration, duplicate run IDs, CSP, local resource roots | Host-authoritative economy and progression | Trust boundary incomplete |
| QA | 73 unit tests plus build/package and activation smoke | Browser-level webview interactions and recorded manual matrix | Interaction gap |

## Ordered backlog

### Next: P6 production-path completeness

The detailed proposed plan is [NEXT_DEVELOPMENT.md](plans/NEXT_DEVELOPMENT.md). It deliberately finishes current foundations before content expansion:

1. add deterministic webview interaction tests;
2. move persistent economy/progression mutations to narrow host-owned commands;
3. expose the PowerUp/refund and Reroll/Skip/Banish flows;
4. add production tactical-pickup drops and independent per-chest ownership;
5. complete or hide every registered but inert stat;
6. pass automated and recorded narrow/wide manual QA.

### Then: first-slice parity review

- verify the six hero traits, six weapon tables, passives, evolution recipes, wave timings, enemy stats, XP curve, and chest rules against current authoritative base-game sources;
- correct any simplified rule that is not one of the two accepted divergences;
- improve end-stage sequencing and reward presentation;
- replace remaining development-oriented labels/silhouettes only with original or provenance-approved assets.

### Later base-game work

- additional base stages and roster;
- broader weapon/passive/evolution pool;
- relic progression and collection/discovery views;
- Arcanas/Darkanas and advanced unions;
- Hyper, Hurry, Inverse, Endless, Limit Break, Golden Eggs, merchant, bestiary, and secrets;
- secret characters and secret weapons.

### Explicitly outside MVP

- all DLC;
- marketplace publication automation and external asset purchases/imports;
- Cursor/Windsurf certification, web extensions, and localization;
- performance targets beyond bounded-resource stability.

## Historical milestone record

The original execution plans are retained permanently:

- [P0 rules and combat](plans/p0-rules-and-combat.md)
- [P1 stage loop](plans/p1-stage-loop.md)
- [P2 pickups, treasure, and evolution](plans/p2-pickups-treasure-evolution.md)
- [P3 meta progression and unlocks](plans/p3-meta-progression-unlocks.md)
- [P4 production telemetry](plans/p4-production-telemetry.md)
- [P5 presentation and game feel](plans/p5-presentation-and-game-feel.md)

Their completion means the scoped foundation and recorded tests passed at that time. It does not mean full base-game parity or that every engine helper is reachable from the shipped UI.
