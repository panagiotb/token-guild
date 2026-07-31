# Token Guild MVP content manifest (`0.1.0`)

This is the frozen first-pass content set. The larger mapping directory is reference material only; items not listed here are deferred.

## Run structure

- One stage: **Code Dungeon**.
- One deterministic five-minute demo run, accelerated by synthetic token fixtures during tests.
- Guild screen → class selection → dungeon combat → level-up choice → elite encounter → boss → run summary → Guild.
- Victory awards gold; defeat preserves no unearned rewards.

## Heroes and starting weapons

| ID | Hero | Starting weapon | Passive |
| --- | --- | --- | --- |
| `warrior` | Warrior | `broadsword` | +10% Might every 10 levels, capped at +50% |
| `wizard` | Wizard | `arcane_bolt` | +10% Growth every 5 levels, capped at +30% |
| `rogue` | Rogue | `throwing_daggers` | Starts with +1 projectile |
| `ranger` | Ranger | `bouncing_arrow` | +10% projectile speed every 5 levels, capped at +30% |
| `paladin` | Paladin | `aegis_barrier` | +25% pickup radius |
| `necromancer` | Necromancer | `bone_throw` | +1 projectile every 20 levels, capped at +3 |

## Weapons and passives

Weapons: `broadsword`, `arcane_bolt`, `throwing_daggers`, `bouncing_arrow`, `aegis_barrier`, `bone_throw`.

Passives: `power_gauntlets` (Might), `haste_amulet` (cooldown), `orb_of_expansion` (area), `token_magnetism` (pickup radius).

Evolutions: `broadsword` + `power_gauntlets` → `excalibur`; `arcane_bolt` + `haste_amulet` → `archmage_staff`; `aegis_barrier` + `orb_of_expansion` → `sanctuary`.

## Enemies, pickups, and progression

- Enemies: `syntax_specter`, `bug_bat`, `memory_golem`.
- Boss: `terminal_exit_boss`.
- Pickups: blue XP shard, green XP crystal, red XP orb, gold chest.
- Level-up presents three deterministic upgrade cards.
- Core formula source: [05_STAT_FORMULAS_AND_TELEMETRY_MATH.md](Vampire%20Survivors%20Mapping/05_STAT_FORMULAS_AND_TELEMETRY_MATH.md), adapted where needed for deterministic testability.

## Assets and licensing

The first pass uses generated DOM/CSS shapes and original text labels. No third-party sprites, fonts, audio, names, or copyrighted files are packaged. Licensed/polished assets require a later review and are not an MVP dependency.
