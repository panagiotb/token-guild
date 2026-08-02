# P2 implementation plan - pickups, treasure, builds, and evolution

Status: implemented and reviewed; acceptance gate passed.
Date: 2026-08-01

> Decision update (2026-08-02): the matching-gold-on-XP-gem rule referenced below is now legacy behavior scheduled for removal. Base-game gold acquisition and save-safe migration are defined in the [P7 roadmap](P7_FULL_GAME_ROADMAP.md). Historical acceptance text is retained as the record of this milestone.

> Retrospective review (2026-08-01): the pickup effects and one-item chest path passed their scoped simulation tests, but tactical pickups have no authored production spawn source and chest ownership remains global to the run. Treat this as a completed engine foundation; production completion moved to [P6](NEXT_DEVELOPMENT.md).

## Research and cross-check

Inputs:

- `.dev/plans/Vampire Survivors Mapping/02_WEAPONS_AND_EVOLUTIONS_MAPPING.md`
- `.dev/plans/Vampire Survivors Mapping/03_PASSIVES_AND_POWERUPS_MAPPING.md`
- `.dev/plans/Vampire Survivors Mapping/04_PICKUPS_DROPS_AND_TELEMETRY_MAPPING.md`
- `.dev/VAMPIRE_SURVIVORS_PARITY_TODO.md`
- Vampire Survivors references: [Experience Gem](https://vampire-survivors.fandom.com/wiki/Experience_Gem), [Weapons](https://vampire-survivors.fandom.com/wiki/Weapons), [Evolution](https://vampire-survivors.fandom.com/wiki/Evolution), and [Passive items](https://vampire-survivors.fandom.com/wiki/Passive_items)

Locked P2 decisions:

1. Ordinary enemies drop one XP gem tier based on enemy XP value: small shard (1-2), medium crystal (3-9), or large orb (10+). A `token-core` condenses excess ground gems without losing their total value. Collection, not spawning, owns XP and the approved matching gold reward.
2. The first floor-pickup slice includes Mana Roast (+30 HP), Mana Magnet (collect all XP gems), Chrono Stasis (freeze enemies for 10 seconds), Arcane Cleanser (destroy enemies and drop their eligible gems), gold sacks, and the existing boss chest. These are explicit map pickups; telemetry never creates XP.
3. A collected boss chest awards its approved 100 gold exactly once and resolves one deterministic item reward. It prefers one eligible evolution, otherwise upgrades an eligible weapon/passive, otherwise records a no-item fallback. No chest credits before collection.
4. An evolution requires a max-level base weapon, at least level 1 of its paired passive, and a chest collected at or after 600 stage seconds. The base weapon is replaced by the evolved weapon at level 1 and its cooldown resets. The first complete recipes cover Broadsword, Arcane Bolt, Throwing Daggers, Bouncing Arrow, and Aegis Barrier; Bone Throw has no recipe yet.
5. Luck affects only chest reward multiplicity in a later slice. P2 implements one-item chests first; no unimplemented 3-card or 5-card claims are surfaced.

## Scope

- Add pickup tiers/effects and a bounded condensed-gem bank.
- Add collection-owned chest item resolution and reward history.
- Add the first complete evolution recipe set and runtime replacement.
- Keep all P0/P1 combat, stage, battery, and gold ownership tests green.
- Update summary/build model so treasure rewards and evolutions are visible.

P3 meta progression/unlocks and P4 telemetry adapters remain separate.

## Design

### Data and state

- Extend pickup kinds with `token-core`, tactical floor effects, and gold bag variants.
- Add optional enemy freeze state and `treasureHistory` to the run.
- Add optional `treasureRewards` to summaries for backwards-compatible fixtures.

### Pickup lifecycle

Enemy death creates exactly one map pickup with the mapped XP value. A condensation pass merges the oldest XP pickups once the active count exceeds 400 and places one token core at the map edge. Collection resolves XP/gold/effect exactly once and removes the pickup. Tactical effects never directly add XP or gold except their named effect.

### Chest lifecycle

Boss/elite deaths create a chest pickup. On collection, the chest awards 100 gold, then calls the deterministic eligible-reward resolver. Evolution candidates are sorted by weapon ID; normal upgrade candidates are sorted by weapon ID then passive ID. The resolver records the result in `treasureHistory`, so summary/export can disclose it.

### Evolution

Use the data evolution reference and `MAX_LEVEL`. Replace the base weapon in-place, preserve the slot, reset cooldown, and record `evolution:base:evolved`. A chest before the stage threshold can still award a normal item upgrade but cannot evolve.

## Implementation sequence

1. Extend types, weapon recipe data, and summary model.
2. Implement tiered drops, condensation, tactical effects, and collection helpers.
3. Implement chest resolver, duplicate ownership guard, and evolution replacement.
4. Add UI/summary build disclosure and focused tests.
5. Run typecheck, lint, tests, build, and diff checks; review all reward ownership paths.

## Acceptance gate

- Table-driven tests cover each gem tier, condensed XP total, every tactical pickup effect, gold variants, duplicate collection, and map ownership.
- Evolution tests cover missing weapon, missing passive, non-max weapon, early chest, successful replacement, cooldown reset, and no-eligible fallback.
- A seeded run can acquire a second weapon/passive, collect a chest reward, and show it in the summary.
- No ordinary pickup, chest, or tactical effect auto-credits before collection.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `git diff --check` pass.

## Review before implementation

Implementation review evidence (2026-08-01): `npm run typecheck`, `npm run lint`, `npm test -- --runInBand` (61 tests), `npm run build`, and `git diff --check` pass. Tests cover XP tiers, lossless 400-gem condensation, collection ownership, tactical effects, duplicate chests, no-item fallback, early/late evolution requirements, replacement/cooldown reset, and summary treasure disclosure. The webview renders pickup tiers/effects and the summary/share-card surfaces treasure rewards. The one-item chest intentionally uses a run-wide duplicate guard; multi-chest multiplicity and Luck are deferred.
