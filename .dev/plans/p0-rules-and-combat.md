# P0 implementation plan — mechanically honest first stage

Status: implemented and reviewed; acceptance gate passed.
Date: 2026-08-01

## Research and cross-check

Inputs reviewed:

- `.dev/plans/Vampire Survivors Mapping/01_CHARACTERS_AND_PASSIVES_MAPPING.md`
- `.dev/plans/Vampire Survivors Mapping/02_WEAPONS_AND_EVOLUTIONS_MAPPING.md`
- `.dev/plans/Vampire Survivors Mapping/03_PASSIVES_AND_POWERUPS_MAPPING.md`
- `.dev/plans/Vampire Survivors Mapping/05_STAT_FORMULAS_AND_TELEMETRY_MATH.md`
- `.dev/plans/Vampire Survivors Mapping/14_JSON_DATA_REGISTRY.md`
- current `src/game/data/*.json`, `src/game/simulation.ts`, and unit tests
- Vampire Survivors references: [Level up](https://vampire-survivors.fandom.com/wiki/Level_up), [Growth](https://vampire-survivors.fandom.com/wiki/Growth), [Weapons](https://vampire-survivors.fandom.com/wiki/Weapons), and [Evolution](https://vampire-survivors.fandom.com/wiki/Evolution)

Cross-check decisions:

1. The local mapping’s current quadratic helper (`5 × level²`) is retained only as historical code evidence. The first-stage contract uses the survivor-style threshold curve: Level 1 → 2 requires 5 XP; the threshold grows by level and has the documented discontinuities at Levels 20 and 40. The exact table is stored in `src/game/data/progression.json` and tested at every boundary, rather than hidden in a formula copied from an unverified mapping.
2. Character class names remain Token Guild originals. The six currently shipped classes are Warrior, Wizard, Rogue, Ranger, Paladin, and Necromancer. Paladin uses the mapping’s 70 HP / +25% magnet identity; the previous 110 HP / armor values were an implementation drift and are removed.
3. Token telemetry remains battery input only. It does not grant XP, trigger Berserk damage, change movement speed, or dispatch undocumented class synergies. Those are not among the two accepted divergences.
4. The first pass implements real weapon behavior for the six currently selectable starting weapons and permits additional base-weapon acquisition from that same tested pool. Evolution recipes are represented as data but are implemented in P2, not silently faked in P0.
5. Damage, cooldown, amount, speed, area, duration, pierce, and knockback are weapon/character stats. All new values are finite, bounded, and deterministic under the run seed.

## Objective

Replace the generic nearest-target damage shortcut with a deterministic, data-driven combat foundation that supports real weapon levels, projectiles/areas, six correct starting identities, working class passive thresholds, multiple weapons/passives, and queued level-up decisions.

## Allowed scope

- `src/game/data/classes.json`, `weapons.json`, `passives.json`, and new `progression.json`.
- `src/game/registry.ts`, `src/game/types.ts`, `src/game/math.ts`, `src/game/simulation.ts`, and a small content adapter.
- focused simulation/registry/math tests and necessary updates to existing deterministic tests.
- minimal webview rendering updates required to expose the new run state; no asset purchase or broad UI redesign.

P1 stage scheduling, P2 chest/evolution/pickup expansion, P3 meta progression, P4 real telemetry, and P5 art/interaction automation remain separate.

## Design

### Content contracts

- `WeaponDefinition.levels[1..8]` is the only source for level-specific damage, cooldown, amount, area, speed, duration, pierce, and knockback.
- `WeaponDefinition.pattern` is one of `targeted`, `fan`, `ricochet`, `aura`, or `bone`; it selects a deterministic runtime strategy.
- `PassiveDefinition` provides stat, per-level value, and max level. The P0 pool includes the existing four passives plus the paired passives needed by the first six weapon recipes.
- `ClassDefinition.baseStats` defines actual starting values; `passive` defines level-triggered increments. No UI label is rendered for an inactive stat.
- `progression.json` stores the verified XP thresholds and boundary fixtures.

### Run state

- Add six weapon slots and six passive slots as explicit constants.
- Add `projectiles`, `pendingLevelUps`, and hero contact-invulnerability state.
- Keep map pickups authoritative; projectile creation/damage never awards XP or gold directly.
- Preserve battery processing before all gameplay and preserve overflow coin collection ownership.

### Combat

- Each weapon fires when its cooldown reaches zero. Targeted weapons aim at the nearest eligible enemy; fan weapons use deterministic angular offsets; ricochet weapons reflect within the bounded map; aura weapons damage/knock back enemies in radius; bone uses a targeted projectile.
- Projectiles carry weapon ID, damage, velocity, area, remaining pierce, duration, knockback, and an already-hit set. They are bounded and removed on expiry, exhausted pierce, or out-of-bounds termination.
- A hit is applied at most once per projectile/enemy pair. Knockback moves the enemy away from the hero/projectile origin with a bounded impulse.
- Hero contact damage has a deterministic invulnerability window; armor reduces each hit, never below zero.
- Tokens never enter `calculateDamage` or movement calculations.

### Level-up pool

- XP collection can queue multiple level-ups. The simulation pauses on the first pending choice and resumes only after a valid card.
- Cards are sampled deterministically from eligible new weapons, existing weapon upgrades, new passives, existing passive upgrades, and heal fallback. No duplicate card IDs appear in one choice.
- A new weapon/passive consumes a slot; maxed items are excluded. If fewer than three normal choices exist, valid heal or eligible upgrade fallback cards fill the set.
- `chooseUpgrade` rejects stale/unknown cards and leaves the run paused on error.

## Implementation sequence

1. Add content schemas, six level tables, stats, progression thresholds, and registry validation.
2. Extend run types and createRun with content-derived stats and bounded inventories.
3. Implement stat recalculation/class passive thresholds and the queued level-up pool.
4. Implement projectile/area runtime, collision/invulnerability/knockback, and multi-weapon firing.
5. Update UI model/rendering only enough to show new weapons, passives, projectiles, and level labels.
6. Add table-driven tests, regression tests, and deterministic seeded scenario fixtures.

## Acceptance gate

- A seeded run can equip and use at least two mechanically different weapons and two passives.
- Every included Level 1–8 weapon row changes runtime behavior; max-level upgrades are rejected.
- Warrior, Wizard, Rogue, Ranger, Paladin, and Necromancer starting stats and passive thresholds are tested, including level 20/40 boundaries.
- XP thresholds, Growth, queued multi-level-ups, random-but-seeded card selection, slot limits, max-level exclusion, and invalid cards are tested.
- Projectile movement, target selection, area hits, pierce, duration, knockback, contact invulnerability, and bounded entity cleanup are tested.
- Battery, gold pickup, persistence, summary, and token-free tests remain green.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `git diff --check` pass.

## Review before implementation

The plan is intentionally narrower than the full mapping: it establishes one reliable foundation before stages, chests, evolutions, meta progression, telemetry adapters, and presentation are changed. The two approved divergences remain isolated. No mapping-only registry entry is treated as implemented behavior.

Implementation review evidence (2026-08-01): `npm run typecheck`, `npm run lint`, `npm test -- --runInBand` (51 tests), `npm run build`, and the seeded MVP scenario all pass. The runtime now exercises projectile, fan, ricochet, aura, and bone patterns, six weapon slots, six passive slots, queued level-ups, collection-owned XP/gold, and contact invulnerability. `renderWorld` exposes projectiles and `renderCharacter` exposes the complete weapon list. Token inputs are compared in math/runtime tests and remain battery-only. Remaining P0 limitations are intentional: stage timing, pickup tiers/effects, chest item rewards/evolutions, meta unlocks, production telemetry, and presentation assets are P1–P5 work.
