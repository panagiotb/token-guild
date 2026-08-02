# P1 implementation plan - authentic Code Dungeon stage loop

Status: implemented and reviewed; acceptance gate passed.
Date: 2026-08-01

## Research and cross-check

Inputs:

- `.dev/plans/Vampire Survivors Mapping/06_STAGES_ENEMIES_AND_BOSSES_MAPPING.md`
- `.dev/plans/Vampire Survivors Mapping/14_JSON_DATA_REGISTRY.md`
- `.dev/VAMPIRE_SURVIVORS_PARITY_TODO.md`
- current `src/game/data/stages.json` and `src/game/simulation.ts`
- Vampire Survivors references: [Enemies](https://vampire-survivors.fandom.com/wiki/Enemies), [Stages](https://vampire-survivors.fandom.com/wiki/Stages), and [The Reaper](https://vampire-survivors.fandom.com/wiki/The_Reaper)

Locked P1 decisions:

1. Code Dungeon uses the mapped 30-minute production clock (1,800 stage seconds). The existing 30-second schedule is retired from production. Tests use an explicit clock-scale option, so accelerated fixtures do not change production rules.
2. Waves are authored data, not random once-per-second enemy selection. Each wave defines its active interval, enemy family, spawn interval, minimum alive target, and maximum active contribution. A dedicated miniboss event is authored as a one-shot wave.
3. Enemies spawn outside the playable viewport, pursue the hero, scale from stage minutes, and use data-defined health, speed, damage, XP, elite, and boss flags. The active pool is hard-bounded; missed spawn attempts do not create hidden rewards.
4. The final threat is a stage event at 1,800 seconds. Reaching it starts the finale; victory requires the final threat to be defeated and the stage to have no pending final reward. Earlier minibosses cannot end a run. A final-threat defeat path remains possible through contact damage.
5. Existing Token Guild gold ownership remains unchanged: an ordinary collected XP gem grants its XP value and the same gold value; only map collection credits it. Battery processing remains before the stage loop and is not a spawn source.

## Scope

- Add validated enemy and stage-wave registries.
- Replace random spawns with a deterministic authored timeline and scaling.
- Add one-shot miniboss and final-threat events, production duration, accelerated test clock, and explicit finale state.
- Preserve bounded enemies/projectiles/pickups and all P0 combat/battery/gold contracts.
- Add focused tests for every wave, scaling, spawn caps, final victory/defeat, and production versus accelerated clocks.

P2 chest rewards, pickup tiers/effects, and evolutions remain separate.

## Design

### Registry

`enemies.json` is the source of truth for the first Code Dungeon families. A validated `RegistryEnemy` includes `maxHp`, `speed`, `damage`, `xp`, `isElite`, and `isBoss`. Stage waves gain stable IDs, an end time, `minimumAlive`, and `maximumAlive`.

### Run state

- `stageId`, `stageClockScale`, `waveSpawnCounts`, and `stageFinaleStarted` are explicit state.
- `elapsedSeconds` is the authored stage clock; battery drain still uses the real tick delta.
- `bossSpawned` denotes the final threat only. Earlier minibosses are ordinary authored events.

### Scheduler

At each tick, every active wave advances its deterministic due count. The scheduler fills a wave's minimum alive target and then respects its maximum contribution and the global enemy cap. For accelerated fixtures, multiple due events may be processed in one tick but never beyond the global cap. One-shot event waves have a one-event interval and a one-second active window.

### Finale

At the stage duration, the scheduler spawns `timeout_reaper` once and marks the finale. Defeat still uses normal contact rules. If the final threat is killed, the run completes with victory after all final pickups are collected; otherwise normal defeat remains possible.

## Implementation sequence

1. Extend types, registry validation, enemy data, and stage wave data.
2. Add stage options to `createRun` and initialize scheduler state.
3. Replace `addEnemy` and the random spawn branch with authored waves and scaling.
4. Add final-threat/defeat/victory sequencing and update minimal HUD labels.
5. Add deterministic table-driven and stress tests, then run typecheck, lint, tests, build, and diff checks.

## Acceptance gate

- Production Code Dungeon duration is 1,800 stage seconds; only an explicit test option accelerates it.
- Tests observe every authored wave family, the miniboss event, final threat, scaling, off-screen placement, and global/per-wave caps.
- Seeded accelerated fixtures cover victory after final-threat defeat and defeat from final-threat contact.
- No reward is credited merely because a spawn is attempted; collection ownership and battery behavior remain green.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `git diff --check` pass.

## Review before implementation

Implementation review evidence (2026-08-01): `npm run typecheck`, `npm run lint`, `npm test -- --runInBand` (55 tests), `npm run build`, and `git diff --check` pass. Tests cover the production versus accelerated clock, all authored wave families, one-shot miniboss, off-screen placement, scaling, global cap, final-threat victory, and final-threat defeat. The final event clears the regular horde before spawning `timeout_reaper`; the final threat intentionally has no automatic chest, while earlier boss chests retain collection ownership for P2. Remaining limitations are pickup tiers/effects, chest item outcomes/evolutions, meta unlocks, real telemetry, and presentation assets.
