# Vampire Survivors parity comparison and TODO

This backlog compares the source-verified `0.1.0` behavior in [CURRENT_MANUAL.md](CURRENT_MANUAL.md) with the intended *base-game Vampire Survivors* experience represented by the local mapping documents. It does not include DLC. Mapping documents are design references, not proof that code exists, and their numbers must be verified before implementation.

## Product rule: accepted divergences

Only these departures are currently approved:

1. **Token battery gameplay:** LLM token telemetry charges an upgradable battery, active/idle drain gates the run, depletion locks play until 15% recharge, and full-battery overflow can create collectible gold.
2. **Gold acquisition:** ordinary collected gems grant both XP and gold, the boss chest grants its defined gold on collection, and battery overflow coins grant gold on collection.

Everything else should move toward the base-game mechanical baseline unless a new decision record explicitly approves another divergence. In particular, token throughput should not silently replace XP, enemy, weapon, character, chest, or stage rules. It may power the accepted battery system.

## Current comparison

| System | Current Token Guild | Base-game target | Status |
| --- | --- | --- | --- |
| Core loop | Move, auto-hit nearest enemy, collect gems, level, kill boss, summary | Movement-driven survival with weapon-specific automatic attacks, escalating waves, pickups, builds, chests, and end-stage threat | Partial foundation |
| Run duration | 30-second boss smoke run | Authentic stage clock and wave cadence, normally a full-length base stage | Placeholder |
| Characters | Six selectable names/loadouts; only starting stats apply | Correct base stats, starting weapons, per-level traits, unlock state, and character identity | Mostly missing |
| Weapons | One direct-hit weapon; Level 2–8 changes label only | Weapon-specific patterns/projectiles/aura, complete level table, multiple equipped weapons | Missing |
| Passives | Power Gauntlets only | Level-up passive pool, stat effects, slot limits, evolution requirements | Missing |
| Level-up | Three fixed cards: weapon label level, Might, heal | Random eligible weapon/passive choices with correct exclusions and fallback items; reroll/skip/banish when unlocked | Placeholder |
| XP | One gem type; custom quadratic threshold | Verified base-game gem values, Growth, threshold curve, multi-level resolution, and condensed-gem handling | Mostly missing |
| Enemies | Three colored circles chosen randomly; one boss; fixed HP/speed | Stage-authored enemy families, waves, scaling, elites/minibosses, collision behavior, and final threat | Missing |
| Damage model | Immediate nearest-target hit; continuous contact damage | Projectile/area collision, weapon cadence, invulnerability windows, knockback, pierce, duration, crit/luck where applicable | Missing |
| Pickups | XP/gold gem, boss gold chest, overflow coin | XP gem tiers, floor/light-source pickups, magnets, healing, freezes, screen clears, and chest outcomes | Mostly missing |
| Chests/evolutions | Boss chest awards only 100 gold; evolution registry unused | Chest item upgrades, multi-reward outcomes, max-weapon + passive evolution rules | Missing; gold payout remains approved |
| Meta progression | Unlimited 100-gold Guild Might and five battery levels | Bounded PowerUp shop, costs/ranks, refund, character/stage/item unlock progression | Mostly missing; battery stays |
| Content progression | All six heroes unlocked; one stage | Base character/stage unlock flow and collection support | Missing |
| Modes/relics | None | Core relic-unlocked systems and base modes after the core game is stable | Deferred |
| Audio/visual feedback | Synth tones and abstract Canvas shapes | Readable sprites, attack/effect feedback, pickup/chest/level/boss presentation, music/SFX event coverage | Placeholder |
| Pause and UI | Header pause, map-overlay choices, character/HUD panels | Survivor-readable inventory, pause information, stage HUD, accessibility | Partial |
| Gold | Gems +1, boss +100, battery overflow coin | Intentionally Token Guild-specific | Accepted divergence |
| Token battery | Weighted telemetry, capacity upgrades, drain, overflow, lockout | No VS equivalent | Accepted divergence |

## Ordered implementation backlog

The order is deliberate. Do not add broad content before the underlying weapon, item, collision, and progression systems are proven.

### P0 — mechanically honest first stage

- [ ] Freeze a verified base-game rules reference for the first six mapped characters, their starting weapons, the first stage, XP thresholds, and the initial enemy/drop tables. Resolve discrepancies in the existing mapping documents before coding.
- [ ] Replace the generic direct-hit attack with a data-driven weapon runtime supporting at least target selection, projectile or area entities, damage, cooldown, amount, speed, area, duration, pierce, knockback, and weapon-specific behavior.
- [ ] Make every weapon Level 1–8 upgrade change real mechanics according to its locked table; reject or hide upgrades at max level.
- [ ] Implement correct contact-damage cadence/invulnerability and knockback so overlapping enemies do not apply arbitrary 250 ms damage without a defined rule.
- [ ] Apply each selected character's correct starting stats and level-triggered passive. Remove labels for stats that do nothing.
- [ ] Replace the custom XP threshold with the locked base-game curve, support multiple queued level-ups, and apply Growth consistently.
- [ ] Build a randomized eligible level-up pool with weapon/passive acquisition, real inventory slots, existing-item upgrades, max-level exclusion, and a tested fallback when no normal choice remains.
- [ ] Keep token telemetry orthogonal to these rules: it charges the battery and may produce approved overflow gold, but does not grant XP or alter combat unless a new divergence is approved.

Acceptance gate:

- One hero can complete a seeded run using at least two mechanically different weapons and two working passives.
- Level choices are deterministic under a seed but not fixed in normal play.
- Golden tests cover each level of every included weapon/passive and every character passive boundary.
- Collision, cooldown, damage, XP, queued-level, max-slot, and invalid-upgrade tests pass without browser, network, or telemetry dependencies.
- Existing battery/gold ownership tests continue to pass.

### P1 — authentic Code Dungeon stage loop

- [ ] Replace random once-per-second spawning with a stage timeline that selects the intended enemy family, interval, density, elite/miniboss events, and final threat by elapsed time.
- [ ] Move stage duration from the 30-second smoke schedule to the approved full-run cadence. Keep an accelerated deterministic fixture for tests; do not shorten production rules to make QA convenient.
- [ ] Implement enemy health/speed/damage scaling and per-kind movement/contact behavior from locked data.
- [ ] Implement spawn placement, off-screen handling, despawn/recycling, and bounded-entity degradation without changing reward totals.
- [ ] Add the correct end-of-stage sequence instead of declaring victory solely because one boss chest disappeared.

Acceptance gate:

- A seeded accelerated test traverses every wave, elite/miniboss event, boss/final event, victory, and defeat path.
- A production-clock manual run matches the authored timeline.
- Stress tests prove bounded enemies/projectiles/pickups and complete teardown.

### P2 — pickups, treasure, builds, and evolution

- [ ] Add the verified XP gem tiers and condensed-gem banking without XP loss.
- [ ] Add core floor/light-source pickups: healing, magnet, freeze, screen clear, and gold variants as appropriate.
- [ ] Make chests grant eligible item upgrades and visually disclose the result; retain the approved Token Guild gold payout alongside the item result.
- [ ] Implement max-level weapon + required passive + eligible chest evolution checks.
- [ ] Implement and test the first complete evolution recipe set for the shipped weapons; registry entries must not exist without runtime support.
- [ ] Add chest reward multiplicity/luck only after the one-item chest and evolution path are solid.

Acceptance gate:

- Every map reward has exactly one owner and cannot auto-credit before collection.
- Table-driven tests cover ordinary chest, no-eligible-item fallback, evolution success/failure, duplicate collection, condensed XP, and each pickup effect.
- Summary and PNG export accurately report the completed build and rewards.

### P3 — base meta progression and unlocks

- [ ] Replace unlimited Guild Might with the approved bounded PowerUp rank/cost rules while preserving already earned progress through an explicit migration.
- [ ] Add the essential base PowerUp shop stats and a safe full-refund flow.
- [ ] Define and implement character and stage unlock conditions; stop unlocking every hero by default for new profiles.
- [ ] Add collection/evolution discovery and the minimum relic-gated systems needed by the chosen base progression path.
- [ ] Add Reroll, Skip, and Banish only with their unlocks, persistence, and level-up-pool tests.
- [ ] Keep the battery upgrade as an additional Token Guild meta track, not a replacement for base PowerUps.

Acceptance gate:

- Fresh, migrated, corrupt, refund, unlock, duplicate-reward, reset, and restart scenarios are deterministic and preserve unrelated state.
- Every purchase/unlock has a visible reason, bounded value, and idempotent persistence path.

### P4 — production token source for the accepted battery system

This is required for Token Guild to function as intended, although it is not a *Vampire Survivors* parity item.

- [ ] Remove or hide the unimplemented OTLP setting until a real adapter exists.
- [ ] Implement one stable, opt-in exact adapter first, preferably the proven loopback OTLP route after re-auditing Token Master.
- [ ] Keep synthetic mode as an explicit demo/test source, not a silent substitute for production telemetry.
- [ ] Move event production to the extension host and send validated token events to the webview through IPC.
- [ ] Test malformed/oversized payloads, deduplication, activity/idle transitions, port conflict, teardown, remote-host behavior, consent, and secret/raw-content non-retention.
- [ ] Ensure the battery can deplete and recharge under realistic telemetry; ensure default batching can actually exercise positive overflow coin values when expected.
- [ ] Remove disconnected thinking/error/completion/Berserk gameplay hooks unless separately approved as divergences.

Acceptance gate:

- Exact real-token fixtures and synthetic fixtures traverse the same normalized battery boundary.
- Disabling the adapter closes all listeners and stops observation.
- No prompt, response, workspace content, credential, authorization header, or raw trace body is persisted or logged.

### P5 — presentation and game-feel pass

- [ ] Replace debug circles/squares with original or properly licensed readable hero, enemy, projectile, gem, chest, and effect assets.
- [ ] Add hit, death, pickup, level-up, chest, evolution, boss, lockout, and victory/defeat feedback without obscuring gameplay.
- [ ] Add event-complete SFX and music controls; keep reduced-motion and mute behavior.
- [ ] Add an inventory/build display and pause information comparable in clarity to the target experience.
- [ ] Complete keyboard, screen-reader, focus, contrast, responsive-width, hidden-view, reload, and long-run manual matrices.
- [ ] Add browser-level webview interaction tests so upgrade clicks, dialogs, pause, export, resize, and screen transitions are no longer manual-only regressions.

Acceptance gate:

- The packaged VSIX passes automated checks and a recorded narrow/wide-sidebar playthrough.
- Visual effects remain legible under high entity density and reduced motion.
- Asset provenance is documented for every packaged file.

## Explicitly later, not part of the next working pass

- Additional base stages and the full base roster beyond the first proven content slice.
- Arcanas/Darkanas, advanced unions, secret characters, Golden Eggs, Endless/Inverse/Hurry/Hyper/Limit Break, bestiary, merchant, and secrets.
- All DLC content.
- Cursor/Windsurf certification, web extensions, localization, marketplace publishing automation, and performance targets beyond bounded-resource stability.

These are not rejected. They follow the first authentic, fully tested base-game slice.
