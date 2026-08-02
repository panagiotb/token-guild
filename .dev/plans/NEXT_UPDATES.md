# Next updates: execution queue after the P7 baseline

**Status:** Active handoff, audited 2026-08-02  
**Parent plan:** [P7 full-game roadmap](P7_FULL_GAME_ROADMAP.md)  
**Gap closure:** [P7 gap implementation plan](P7_GAP_IMPLEMENTATION_PLAN.md)  
**Remaining-gap audit:** [P7 remaining-gaps implementation plan](P7_REMAINING_GAPS_IMPLEMENTATION_PLAN.md)  
**Evidence:** `npm test` (243 tests) and `npm run test:synthetic` (112 tests) plus the gates listed below

**Latest parity slice (2026-08-03):** Fire Wand/Hellfire is now the next
registry-backed weapon family. Fire Wand has rarity 80, eight source-backed
damage/speed rows, random three-projectile fan behavior, Duration ignored, and
Power Gauntlets evolution. Hellfire has rarity 1, two random-target piercing
projectiles at a persisted 0.2-second sequence interval. Registry, simulation,
upgrade-copy, and chest-evolution regressions cover the slice; wall behavior and
the remaining weapon roster stay open.

**Current parity slice (2026-08-03):** Battle Axe/Scythe of Doom is now the
latest registry-backed family. Battle Axe carries eight authored damage,
Amount, and Pierce rows, rarity 100, Orb of Expansion evolution, and a
persisted 0.2-second fan sequence. Scythe of Doom carries the rarity-1 Death
Spiral row, nine projectiles at a 0.05-second sequence interval, and bounded
30-second lifetime. Generic pending-fan state is validated at both checkpoint
and snapshot boundaries; vertical arc/gravity and indefinite lifetime remain
explicit physics approximations.

**Latest parity slice (2026-08-03):** Celestial Cross/Heaven Blade now uses a
persisted generic boomerang strategy. Cross is rarity 80 with source-anchored
base/max stats and 0.1-second sequence cadence; Heaven Blade is rarity 1 with
the source damage/speed/cooldown/interval anchor. `clover` is the validated
evolution passive. Origin/return state is required at checkpoint/snapshot
boundaries; critical hits, Pool Limit, and wall/spin presentation remain open.

**Latest parity slice (2026-08-03):** Orbiting Grimoire/Unabridged Codex now uses
the persisted generic `orbit` strategy. King Bible owns eight source-anchored
rank rows, rarity 80, and Spellbinder evolution; Unholy Vespers is rarity 1
with source damage/Area/Speed/Amount/Duration/Cooldown/knockback anchors.
Orbit angle, radius, and angular speed follow the hero and are required at
checkpoint/snapshot boundaries; radius is capped at 180 world units and a
30-Pierce safety envelope bounds the entity budget. Shared hitbox-delay reset,
page-fall presentation, and exact Pool Limit behavior remain open.

**Latest parity slice (2026-08-03):** Alchemist Fire/Philosopher's Potion now
uses the persisted generic `pool` strategy. Santa Water owns rarity 100, eight
source-anchored damage/Area/Duration rows, Attractorb evolution, a 0.3-second
additional-projectile cadence, Pool Limit 20, and a 0.5-second per-target
Hitbox Delay. The evolved row uses Pool Limit 30 and source damage/Area/
Duration/Amount/Cooldown anchors. Stationary zones, bounded cooldown ledgers,
oldest-zone eviction, and host/snapshot validation are covered; bottle-fall,
zone-growth, and full modifier interactions remain open.

**Previous parity slice (2026-08-02):** Knife/Throwing Daggers now owns the
source-backed 0.1-second projectile interval in the weapon registry, including
the authored 0.08/0.06/0.04-second rank reductions. Amount shots are released
as a bounded, facing-preserving sequence instead of a simultaneous volley; the
Thousand Blades evolution retains its authored 0.05-second stream. Registry and
simulation regressions cover queue state, release timing, rank cadence, and
facing. This closes only the base Knife cadence sub-gap;
remaining weapon-specific behavior, stat balance, chest probabilities, live
telemetry compatibility, and manual visual evidence remain open.

**Latest economy slice (2026-08-02):** chest rewards now choose from one
deterministically seeded, source-rarity-weighted pool of eligible owned
weapons/passives instead of always taking the first alphabetical entry. Replay,
cross-type, and weighted-distribution tests cover same-seed reward/gold
identity, Banish/max-rank filtering, and the retained first-roster rarity
values. Exact Code Dungeon tier chances and broader stage-specific chest
balance remain open.

**Latest RG-03 stat slice (2026-08-02):** Guild Agility now follows the
source-backed 5% per rank (10% maximum) movement bonus, Guild Duration uses the
source-backed 15% per rank value, and Token Magnetism follows the level-specific
Attractorb multipliers. The Magnet PowerUp now compounds its 1.25× rank bonus.
Code Dungeon's late Infinite Loop Fiend speed was reduced to preserve a
measurable escape margin for a fully agile hero after the authored minute curve.
Rank projection and movement/magnet tests cover the change; the wider stat
formula/balance audit remains open.

**Latest RG-03 max-health/magnet correction (2026-08-02):** Base Magnet now
matches the source-backed 30-unit value. Guild Vitality compounds its 1.1×
per-rank Max Health multiplier, and Heart of Vitality compounds its 1.2×
per-level multiplier; rank-one/max-rank and combined multiplier regressions
cover the derived values. This closes the identified stacking mismatch while
the remaining exposed stat formulas and first-stage balance stay open.

**Latest RG-10 PowerUp-cost slice (2026-08-02):** Meta purchases now use the
source global fee/base-cost formula rather than the retired per-upgrade
exponential multiplier. The host and shop share total-rank context, refunds
reconstruct exact persisted spend, and battery purchases remain separate.
Focused validation covers first/second and cross-upgrade purchases, max-rank,
insufficient-gold, refund, and battery-isolation paths.

This is the short, dependency-ordered queue for unattended development. It does not replace the retained historical plans or the full P7 roadmap. A later step must not be started while an earlier step has a failing focused test or an unresolved ownership decision.

### Next unattended slice

RG-01 is now closed at the production-provider boundary with its supported
test-host limitation recorded in `decisions/extension-host-recovery.md`:
activation can open the view, but the unattended VS Code harness cannot inject
webview DOM events or force a user-session reconnect. Continue RG-02's
remaining exposed weapon family and RG-03's source-backed stat/balance audit;
do not begin deferred content families or asset adoption until the RG-01–RG-06
first-stage acceptance gate passes.

The host-owned pause boundary is now implemented as the next recovery
foundation: `pause` and `resume` are sequenced `RUN_ACTION` intents, the
authoritative `RunState.paused` flag is included in snapshots/checkpoints, and
legacy checkpoints migrate to `paused: false`. While paused, fixed-step
simulation, movement, battery drain, and host synthetic generation stop; a
reloaded webview remains paused until the host accepts `resume`. The token-free
webview keeps its local harness seam, while production rendering remains
snapshot-driven.

The next single code slice after this family is RG-04 chest-quality parity:
verify the exact Code Dungeon per-chest tier probabilities against an
authoritative or directly observed source. If the reference does not publish
stage values, retain the bounded 1/3/5 implementation and add a dated
evidence/limitation record ([decision record](../decisions/chest-tier-probabilities.md)) instead of inventing a probability. Then continue
the first-stage weapon/stat audit; RG-06 manual visual evidence remains a
required gate.

**Latest gate (2026-08-03):** 243 unit tests pass across 26 files and the
synthetic subset passes 112 tests across 4 files. Typecheck, lint, build, e2e
activation smoke, package, production audit, and `git diff --check` are green.

## Current baseline

Implemented and regression-tested:

- deterministic simulation-owned movement through validated `InputSnapshot` values;
- open scrolling Code Dungeon camera with repeating background and map focus/selection suppression;
- token-free production webview interaction coverage for purchases, pause/resume, telemetry toggle, level-up actions, summary, return, and PNG export;
- live telemetry status UI now reports adapter health, accepted event count, last accepted event time, and loopback endpoint without retaining event content; the adapter normalizes numeric input/output/cache/reasoning detail and deduplicates completion identities;
- host registration and mirroring of telemetry, movement steps, and level-up actions, with detached sequenced `RUN_SNAPSHOT` messages and active-session replay after `READY`;
- deterministic 10 ms simulation stepping with an accumulated remainder and cadence-equivalence regression coverage;
- simulation resource budgets and fixed cadence are centralized in `src/game/policies.ts`, with the webview snapshot boundary consuming the same limits;
- collected chest rewards now receive a transient, accessible in-map presentation banner backed by a bounded 1.5-second simulation pause; ownership remains simulation/host-controlled and the pause survives host checkpoints;
- host-derived run rewards with duplicate run-ID protection; production webview rendering now waits for host snapshots while the local simulation is retained only for the token-free harness;
- `/v1/logs` and `/v1/traces` loopback fixture adapters with bounded parsing and no content retention;
- host-owned synthetic income and direct OTLP dispatch for production runs; forged production `RUN_TELEMETRY` messages are rejected while the token-free harness keeps its local fixture seam;
- OTLP/HTTP JSON and protobuf fixture paths now share bounded scalar-only decoding for `/v1/traces` and `/v1/logs`; gzip/unsupported encodings remain rejected and live producer compatibility remains the explicit telemetry gap;
- destructible light-source entities and collection-owned drops as the first base-game gold source; XP gems and battery overflow do not award gold;
- boss-safe screen clear, per-chest identity/results, retained 1/3/5 chest tiers, 60-500 base chest gold, stage-completion/revival reward accounting, maxed-inventory Coin Bag level-up fallback, revival-charge consumption, exact registry-backed upgrade descriptions and registry-derived new-weapon choice discovery, `mm:ss` timing, custom battery/enemy tooltips, movement-balance tests, and a bounded one-minute final-threat completion window;
- sequenced host intents with duplicate/future rejection and snapshot-provided next-sequence recovery;
- host-action error IPC that unlocks a pending level-up control and announces a bounded failure instead of leaving the production webview locked;
- sequenced host intents reject malformed/duplicate/future messages, return the expected next sequence for recovery, and snapshots restore that sequence after reload; reset invalidates in-flight sessions;
- pickup magnet attraction and a Greed-scaled Coin Bag fallback when all inventory entries are maxed;
- Luck-driven fourth level-up choices, source-backed owned-item preference, and unique weighted cards;
- every spendable meta upgrade now has rank-one/max-rank projection coverage, and an OTLP event regression proves telemetry cannot change combat stats;
- both external asset roots indexed without copying or packaging their files.
- authored enemy movement now supports deterministic `chase` and bounded `wavy` families; syntax spectres use the wavy family while unspecified/legacy enemies default to chase.
- regular enemies, bosses, and light sources now use a camera-relative perimeter spawn ring outside the logical 320x200 viewport; non-boss persistence culling remains explicit and world-relative.
- persistent bosses relocate to the same active perimeter when the hero travels beyond the world persistence radius, preserving visible end-state threats without adding map walls.
- Curse now shortens authored wave spawn intervals in addition to scaling alive density and enemy speed.
- Curse is damage-isolated: matched cursed and uncursed production spawns retain equal contact damage while Curse still affects health, speed, wave density, and cadence.
- The enemy simulation/IPC envelope is now 192 entries, covering the authored 54-enemy overlap at the current +200% maximum Curse stack without truncating valid first-stage density.
- Armor mitigation now preserves the base-game minimum of one damage for ordinary enemy contact.
- Host action intent sequences commit only after the domain action succeeds; a rejected action can be retried with the same sequence without duplicating rewards.
- death now pauses in a host-owned revival phase when a charge remains; the player can revive for 50% HP plus 2 seconds of invulnerability or end the run, with pre-finale defeat and finale victory/reward accounting covered by simulation, IPC, snapshot, and production-webview tests.
- detached host checkpoints can be restored with bounded simulation data and sequencing metadata; a long-run replay test proves the restored session converges to the uninterrupted reference state.
- detached checkpoint restoration now rejects corrupted timing, economy, hero/stat inventory, battery, telemetry, ledger, entity identity, and pending-state values before they can enter the authoritative host session; legacy entity allocators are repaired above retained IDs to prevent collisions after restore.
- detached checkpoint restoration now also proves hero base-stat provenance against the canonical class registry and rejects extreme finite combat-stat values before state can reach simulation loops.
- the webview render boundary now rejects unknown heroes, duplicate entities, out-of-range hero/battery stats, and duplicate/corrupt pickup identities before replacing its current snapshot.
- first-roster evolution results now carry explicit authored attack patterns and damage/cooldown values; the registry rejects no longer silently relying on the generic targeted fallback, and a table-driven passive audit covers every registered rank-one stat.
- Bone now has a source-backed weapon-specific slice: random launch, enemy reflection, camera-relative edge reflection, and retention through Duration; its focused simulation test prevents regression to generic targeted behavior.
- Bouncing Arrow now follows the retained Runetracer-like contract for its current reskin: random launch, screen-envelope reflection, infinite pierce, and a bounded 0.5-second hitbox delay, with focused multi-enemy, re-hit, checkpoint, and snapshot regressions preventing fallback to targeted or ordinary one-hit behavior.
- No Future now applies the first source-backed evolved behavior slice: an Area-scaled explosion on each camera-edge bounce and when contact damage lands, with focused regressions; bounded host-owned visual explosion effects are rendered from snapshots, expire in simulation time, respect reduced motion, and are checkpoint/snapshot validated.
- Garlic-like Aegis Barrier and Sanctuary auras now retain a bounded per-target hit cooldown equal to the effective weapon cooldown, including when a target leaves and re-enters the radius; malformed checkpoint and snapshot ledgers are rejected and deterministic re-hit coverage prevents aura damage from becoming frame/cooldown-independent.
- Whip-derived Broadsword and Excalibur now use a bounded hero-anchored forward slash and declare registry-owned `ignoreSpeed`/`ignoreDuration` behavior; malformed flags, forward-only hits, anchored lifetime, and deterministic stat-buff regressions are covered.
- Magic Wand/Arcane Bolt and Knife/Throwing Daggers-derived attacks now declare registry-owned `ignoreDuration` behavior; Arcane Bolt and Archmage Staff also release Amount shots as a bounded 0.1-second nearest-target sequence that reacquires its target per release. Deterministic wizard/rogue regressions prove the lifetime and target-sequence contracts, while malformed flags/queue state fail registry, host, or snapshot validation.
- source-specific light-source and elite drops now live in `src/game/data/drops.json`, are validated with the content registry, and are resolved through one deterministic ownership path; elite chance gating and weighted reward selection use independent deterministic rolls, while duplicate-kind, illegal pickup, zero/high Luck, no-drop, and Greed collection tests cover the balance boundary.
- a full light-source cap now replaces the deterministic bounded source while placing the replacement on the closest authored perimeter ring, keeping new objectives reachable without changing the cap or ownership model.
- stage selection is now data-owned: Code Dungeon exposes its duration, open topology, and modifiers, the selected stage ID travels through `START_RUN`, and the host/snapshot/checkpoint boundaries reject unknown or locked stages.
- class/passive registry entries now reject stat capabilities outside the canonical implementation set, and upgrade-effect copy no longer exposes corrupted arrow glyphs.
- Pandora's Box now resolves registry-owned +4% Omni at rank 1, +3% Omni per rank through rank 8, and +100% Curse at rank 9; simulation and upgrade copy share the same cumulative effect resolver.
- Weapon aim is now registry-owned for the first directional slice: Broadsword and the Knife family use normalized hero facing, while targeted weapons track the nearest eligible enemy. Arcane Bolt/Archmage Staff and the Thousand Blades evolution now have bounded weapon-specific Amount sequences with release-time aim; stage contact radius/protection cadence are also validated data rather than hidden constants.
- Remaining base-game families now have a retained child-plan index in `P7_CONTENT_FAMILY_PLANS.md`; no content expansion starts until the first-stage and host-authority gates pass.
- Stage drop tables now own chest quality rules: a base tier plus independent five-item/three-item checks multiplied by total Luck, resolved from the highest tier down and retained by chest identity. Code Dungeon's provisional 1%/2% checks are explicit data until per-chest source values are verified.
- hero selection now derives starting-weapon and trait cadence/cap explanations from the class registry while retaining the no-highest-level-label rule.
- Hero unlock conditions are now authored and validated in `classes.json`; StateManager applies those conditions instead of a hand-maintained unlock list, and the selector displays the same registry description.
- provider disposal now invalidates the webview lifecycle generation before teardown; a production `GuildViewProvider` recovery test verifies disposal/recreation, bounded checkpoint replay, paused level-up overlay restoration, and retry sequencing.
- Code Dungeonβ€™s current wave roster, per-minute enemy scaling, camera-relative spawn/persistence radii, and finale timing/clear/invulnerability policy are validated stage data consumed by the simulation; unsafe stage contracts are rejected.
- Code Dungeonβ€™s light-source and elite drops are now selected through a validated stage `dropTableId`; legacy flat drop JSON remains parseable, while new stages must declare an explicit table.
- Known meta-upgrade ranks are normalized to authored caps at the StateManager load/migration boundary; bounded unknown future keys remain round-trippable.
- Progress persistence now writes independently versioned wallet, collection, unlock, settings, battery, upgrade, and run-history domains behind a ready/write marker, while retaining a legacy aggregate mirror for lossless interrupted-write and schema migration recovery.
- Level-up discovery and restored level-up envelopes now share one registry-derived eligibility boundary; evolved outputs, maxed entries, duplicate cards, and stale/corrupt card targets are rejected before mutation.
- Amount now follows the additive projectile-count contract: authored weapon counts are preserved and hero/passive Amount bonuses add projectiles instead of multiplying them; helper and simulation regressions cover levelled weapons.
- The source-backed character/PowerUp/item Amount bonus upper limit is now a shared policy of 10 (internal baseline-inclusive stat maximum 11): derived stats normalize to an integer cap, and host checkpoint/webview snapshot boundaries reject forged values above it. Broader stat caps remain queued for the RG-03 audit.
- Weapon cooldown now uses the verified 10% total-cooldown floor through the shared simulation policy; the former provisional 15% floor is covered by a boundary regression. Broader stat formulas and balance remain queued for RG-03.
- Source-backed upper caps are now enforced for Might (+900%), Area (+900%), Projectile Speed (+400%), and Duration (+400%) in derived state and detached boundaries. Luck, Growth, Greed, Move Speed, Recovery, and Armor remain uncapped or separately governed by the remaining RG-03 work.
- Recovery now has one shared projection for both first-stage effects: the fixed-step regeneration tick and additive collected-healing pickups. A focused collection regression keeps pickup healing separate from regeneration cadence; revival and level-up heal-card semantics remain queued for source verification.
- No Future retaliatory explosions now apply the source-backed additive Armor bonus through registry-owned data, capped at +500%; edge-bounce explosions remain unmodified. Legacy content defaults the field safely and shared-math/registry/simulation regressions cover the distinction and cap.
- Excalibur, No Future, and Sanctuary now carry explicit evolved level rows instead of inheriting generic fallback area/speed/duration/pierce/knockback values; registry, level-stat, and attack regressions cover the authored rows.
- The XP pickup tiers, 400-gem condensation, source-backed level curve, and level-20/40 temporary Growth thresholds are implemented in the shared math/simulation boundary with exact boundary tests. Future balance work must preserve those source-backed transitions.
- Final level-up selection and Skip actions now resume through the stage-owned 0.5-second contact-protection window. The behavior is covered at the simulation boundary (damage is suppressed immediately after resume and returns after expiry); exact base-game tuning remains a parity-review item.
- Level-up Banish now persists canonical weapon/passive identity alongside legacy card IDs, rejects fallback heal/coin cards, and blocks the banished item from future cards and treasure-chest upgrades/evolution. Focused simulation and host checkpoint regressions pass; broader first-stage parity remains open.
- Live telemetry compatibility is conditionally documented: the inspected Codex config has no OTLP exporter, so no live producer claim is made. A prompt-redacted user-level loopback smoke snippet is retained in `decisions/telemetry.md`; do not edit global config automatically.
- The late-chest evolution regression now covers every currently authored first-stage recipe through one table-driven eligibility path; broader non-DLC evolution families remain deferred.
- Light-source spawn chance is now validated drop-table data (10% base, 50% Luck cap) rather than a hidden simulation constant; legacy tables preserve the same defaults and the exact stage balance remains queued.
- Skip now follows the verified base-game action contract: one charge grants direct XP equal to 20% of the next-level requirement, preserving queued level-ups without granting tokens. Reroll and Banish remain XP-neutral; focused simulation, host, and production interaction coverage passes.
- Reroll and Skip now share the actionable weapon/passive predicate with the simulation and host UI; when all slots are maxed, fallback heal/coin cards remain but those controls are hidden/rejected instead of consuming a charge.
- Banish-aware card pooling now resolves eligibility before fallback selection, so a run with open slots but every remaining item banished receives Coin Bag/Floor Chicken choices instead of generic healing; the full-current-roster regression is host-independent and deterministic.

## NEXT_DEVELOPMENT implementation audit

The former P6 steps have been checked against the production path, not only against source declarations:

| NEXT_DEVELOPMENT step | Current result | Evidence and remaining work |
| --- | --- | --- |
| Interaction boundary | Partial, first slice shipped | Token-free production-webview tests cover start, focus/WASD, pause, telemetry toggle, level-up actions, summary, return, PNG export, resize redraw, and canvas selection/drag suppression. Narrow/wide visual review remains RG-06 work; the supported host cannot provide an unattended DOM click/reconnect route, as recorded in `decisions/extension-host-recovery.md`. |
| Host authority | Partial, bounded snapshot slice shipped | Host validates and sequences telemetry, movement, and actions; persistent rewards are host-derived, and production rendering waits for host state. Provider disposal/recreation recovery now includes a long-running checkpoint comparison and resume-without-drift regression; the supported test-host limitation is recorded in `decisions/extension-host-recovery.md`; final production-DOM interaction remains RG-06 work. |
| Meta and level-up UI | Partial | Purchases, refund, Reroll, Skip, Banish, concrete upgrade copy, action-error recovery, and registry-driven access to every registered PowerUp are wired and tested. Complete visual/manual coverage and broader parity remain open. |
| Pickups and chests | Partial | Collection ownership, per-chest identity, stage-keyed Code Dungeon light-source/elite drops, tactical effects, chest ranges/tiers, and duplicate protection are implemented. Balance tables for additional stages and full presentation remain open. |
| Stats | Partial | Movement, Duration, Luck, Greed, Curse, and Revival have tested slices; Armor's minimum-one contact rule is enforced. Full formulas, caps, and balance for every exposed stat remain open. |
| Final QA and documentation | Partial | 230 automated tests plus typecheck, lint, build, e2e, package, production audit, and diff checks pass. A recorded narrow/wide production playthrough and semantic asset review remain open. |

This table is the acceptance boundary for unattended execution: do not report P6/P7 complete while any row is still marked Partial. The actionable closure sequence is retained in [P7_GAP_IMPLEMENTATION_PLAN.md](P7_GAP_IMPLEMENTATION_PLAN.md).

## Ordered next updates

### 0. Architecture checkpoint before content expansion

Keep the pure simulation, host-owned economy, typed IPC, fixed-step cadence, and renderer/input module boundaries intact while the game grows. Before adding a new weapon, enemy, pickup, or screen, add its registry contract, snapshot validation, ownership decision, deterministic domain test, and token-free interaction coverage where applicable. Do not move reward authority back into the webview to simplify UI work. The remaining architecture work is production-DOM replay evidence; the supported test-host reconnect/DOM limitation is recorded in `decisions/extension-host-recovery.md`. The production path already waits for host snapshots; the local simulation is limited to the explicit token-free harness and must not be reintroduced as a release path.

### 1. Canonical host snapshots and recovery

**Status:** Bounded snapshot and lifecycle slice implemented. The host now publishes a detached snapshot after run start, telemetry, movement, and level-up actions; the webview accepts only newer snapshots for the active run and can restore an active session after a fresh `READY`. Concurrent checkpoint restores are coalesced, provider disposal invalidates the lifecycle generation before teardown, and stale disposed webviews are rejected by generation. Both host checkpoints and webview render snapshots now fail closed for malformed inventory, ledgers, entity identity, stat/battery ranges, and pending state; legacy entity allocators are repaired above retained IDs. Progress persistence is now split into versioned domains with an aggregate compatibility mirror and interrupted-write marker. Production `GuildViewProvider` recovery tests verify disposal/recreation sequencing, paused level-up restoration, and long-running checkpoint comparison/resume without drift. The supported test-host reconnect/DOM limitation is recorded in `decisions/extension-host-recovery.md`; full production-DOM replay remains RG-06 work.

The bounded `RUN_SNAPSHOT` path is implemented. Production webview movement, telemetry, and level-up rendering now wait for host-owned state; the local simulation is retained only behind the explicit token-free test seam. Every run intent carries a monotonic sequence; duplicate and future intents are ignored by the host, and snapshots restore the next sequence after reload. Host action failures return a typed `RUN_ERROR` so controls cannot remain locked. The production provider now has long-running disposal/recreation replay evidence; the supported test-host reconnect/DOM limitation is documented and full production-DOM replay remains RG-06 work. Keep the result snapshot and reward transition host-owned.

Required tests:

- same seed/input/telemetry sequence gives identical host and webview results;
- delayed, duplicated, malformed, and out-of-order messages do not grant rewards;
- webview reload/disconnect/reconnect resumes from a bounded host snapshot;
- completion, duplicate completion, reset, and malicious client summary remain safe;
- snapshot size and retained entity counts remain bounded.

Do not weaken the host-owned reward path to make a client mismatch pass.

### 1A. Close telemetry source authority before further economy work

**Status:** First authority slice implemented and covered by host-run,
validation, and production-provider tests. The host generates synthetic
income during accepted run steps, dispatches accepted OTLP events directly to
the active host session, binds the event to that session, enforces per-event
and cumulative limits, and rejects arbitrary production `RUN_TELEMETRY`
messages. Synthetic and OTLP ledgers remain additive; the token-free harness
retains its local fixture seam. The remaining authority evidence is the true
Extension Development Host/live producer smoke remains open; both documented
JSON and identity-encoded protobuf inputs are now covered, with producer
configuration compatibility still belonging to item 6.

### 2. Finish Code Dungeon camera and world policies

Keep the locked open-world decision: the camera follows the hero and viewport edges are not walls. Named world policies now cover viewport projection, projectile culling, pickup condensation, ricochet bounds, camera-relative perimeter spawning, non-boss enemy persistence culling, and persistent-boss relocation. Spawn waves and destructible light sources around the current camera perimeter, cull/relocate by explicit persistence policy, and test far positive/negative travel plus canvas resize without teleporting the hero.

### 3. Prove the first-stage gameplay loop at base-game cadence

Expand the parity matrix before each rule change. The first slice now covers weighted level-up choices, authored chase/wavy movement families, camera-relative perimeter spawning/relocation, Curse cadence/density/speed scaling, Armor minimum-one contact damage, elite/boss knockback resistance, repeated invulnerable finale threats, and the source-backed XP curve/Growth thresholds. Implement the remaining first-loop rules in this order: invulnerability tuning, weapon/passive caps, evolution eligibility, stage reward accounting, and full death/revival presentation. Keep the battery as the only gameplay divergence and keep DLC out.

Every new rule needs success, boundary, duplicate/ownership, and failure-path tests before content expansion.

The contact slice is now implemented and tested: ordinary contact still respects Armor's minimum-one rule and protection window, while weapon hits apply a deterministic 120 ms reverse-movement knockback reaction with resistance. Final level-up selection and Skip actions resume through the stage-owned 0.5-second contact-protection window; the simulation regression proves immediate contact is suppressed and damage resumes after expiry. XP gem tier boundaries (blue through 2 XP, green through 9 XP, red above 9), the 400-gem condensation cap, and the source-backed level curve/Growth thresholds are now explicit and tested. Weapon/passive caps and late-chest evolution eligibility are now guarded by registry normalization, max-level checks, required-passive checks, and deterministic tests. Level-up card generation now resolves the source-backed owned-item parity/Luck chance through `getOwnedItemChoiceChance` before selecting from the shared unique pool. Directional aim is now registry-owned for Broadsword and the Knife family; those attacks use the hero's last movement direction, while targeted weapons continue to track the nearest enemy. Arcane Bolt/Archmage Staff and Thousand Blades now use bounded authored projectile sequences with release-time target/facing resolution. The Runetracer-like Bouncing Arrow now launches randomly, preserves infinite pierce, reflects at the camera-relative envelope, and uses a bounded 0.5-second per-target hitbox delay; the first-roster evolution results declare explicit targeted, ricochet, or aura behavior with authored damage/cooldown values exercised in simulation tests. No Future now emits bounded host-owned visual explosion effects that expire in simulation time and survive snapshot/checkpoint validation. Stage reward accounting and explicit death/revival presentation are now implemented: a lethal contact pauses in a revival phase, the player chooses Revive or End run, finale rewards remain deterministic, summaries expose revival usage/remaining charges and the stage-reward basis, and the map keeps a persistent final-threat status. The first-stage wave/scaling/spawn/finale contract now lives in validated stage data and is consumed by the simulation with invalid-contract tests. The first-stage light-source and elite-drop tables now live in validated content data, use explicit weighted/minimum-level/Luck fields, and have source-owned Greed/duplicate tests; stage-specific balance and full unused/used-revival presentation remain open. The collection boundary now centralizes authored Floor Chicken, Vacuum, Orologion, Rosary, gold, chest, and XP effects and rejects duplicate pickup IDs. The finale now exposes its deadline, completion reason, duration, threat count, map countdown, summary field, and export filename segment. The character panel now exposes all 15 combat stats with stable labels, finite formatting, and custom hover/focus explanations backed by `src/webview/statPresentation.ts`. The next bounded implementation slice remains the first-stage combat/parity completion boundary; preserve the open-world camera and host ownership.

### 3A. Finish first-roster weapon-specific parity

**Status:** First Whip-family slash slice and bounded hero-centered arc presentation implemented; remaining weapon-specific rules and sprite fidelity stay open. The registry has six base weapons and five evolutions, but generic pattern support still stands in for some weapon-specific rules. Do not add new content until the remaining first-stage contract is closed.

The current reference describes Whip as a frontal horizontal slash that originates at the character and ignores Speed and Duration ([Whip reference](https://vampire-survivors.fandom.com/wiki/Whip)). Token Guild's Broadsword/Excalibur now use a bounded, hero-anchored forward slash hitbox and a tested crimson arc renderer while preserving authored Amount, Area, knockback, and host snapshot ownership. The remaining work is source-backed roster behavior, sprite fidelity, and broader first-stage QA.

Implementation sequence:

1. Create a dated parity row for each currently exposed base/evolved weapon, separating verified behavior, direct observation, approximation, and deferred behavior. Re-check the retained mapping and an authoritative/current source before coding.
2. For one weapon at a time, encode only the smallest authored contract needed by the current MVP: aim, target selection, projectile lifetime, collision/pierce, reflection/return/orbit/floor/aura behavior, knockback, evolution trigger, and presentation event ownership.
3. Keep every rule in a named simulation strategy or registry field. Never infer weapon behavior from the label, renderer, telemetry rate, or an unbounded conditional branch.
4. Add success, boundary, duplicate-hit, teardown/expiry, checkpoint migration, snapshot rejection, deterministic replay, and concrete upgrade-copy tests before moving to the next weapon.
5. Run focused tests, then typecheck/lint/full tests/build/package/e2e; update the manual only for behavior visible through the production host snapshot path.

Exit gate: every currently selectable weapon/evolution has a source-backed or explicitly marked approximation, an observable tested effect, bounded state, exact card copy, and replay-safe host/snapshot coverage. Remaining base-game weapons stay deferred in `P7_CONTENT_FAMILY_PLANS.md`.

### 4. Restore the base-game gold/drop model

The first economy slice is now implemented: light sources are bounded destructible entities, projectile/aura damage can destroy them once, and Luck-scaled deterministic coin/tactical drops remain uncollected until the hero reaches them. Chest gold uses the researched 60-500 base range; stage-owned chest rules now perform independent highest-tier-first five/three-item checks multiplied by total Luck, with retained 1/3/5 results and identity protection. Finale victory records the 500-gold stage reward, unused-revival gold, and exact escalating finale-revival bonus without applying Greed; pickup/chest/level-up gold remains Greed-scaled at its owned award boundary. Collection effects and post-timer sequencing now have explicit host-owned behavior and presentation; victory summaries/export disclose the exact stage-reward basis. The accelerated first-stage checkpoint regression also exposed and fixed a mixed-pickup envelope bug: XP remains capped/condensed at 400 while host/snapshot validation accepts the larger 512-item mixed pickup budget. Continue with per-stage source balance, exact per-chest chance verification, the broader death/revival presentation matrix, and long-run replay evidence. Keep old wallet balances grandfathered; never reset or estimate them.

### 5. Complete exposed stat behavior

Finish Luck, Curse, Greed, Revival, Duration, Amount, Area, Speed, and Growth against the verified matrix, or hide a stat until its behavior is complete. The Guild shop now consumes the canonical `META_UPGRADES` registry instead of a second visibility allowlist, so every registered capability is reachable. Shared math helpers now own amount, projectile area, aura radius, and projectile lifetime projections without changing current MVP balance. Source-backed Amount/cooldown/Might/Area/Projectile Speed/Duration caps are enforced, and the registry audit covers every exposed passive at rank one and maximum rank, including max-health, magnet, Omni, and revival-charge effects. A table-driven meta audit now covers every spendable upgrade at rank one and maximum rank and proves telemetry cannot mutate combat stats. Add table-driven tests for remaining rank changes, caps, enemy scaling, movement headroom, and reward effects. Do not bind any stat to telemetry throughput.

### 6. Make telemetry production-ready

Run a documented local Codex OTel fixture/smoke test with prompt logging
disabled. The current official contract documents `otlp-http`/`otlp-grpc`,
OTLP/HTTP `binary` or `json`, and `codex.sse_event` completion token counts.
The bounded JSON and protobuf decoders are now implemented and tested. Record whether the supported Codex surface emits usable
`/v1/logs` completion usage, batching/flush latency, and exact/estimated ledger
mapping. If no supported stream is available, document that limitation and
retain the safe synthetic toggle; never scrape UI, files, databases, or
credentials.

### 7. Expand QA and release documentation

Attempt a true Extension Development Host webview interaction route only if a supported harness exposes DOM events and reconnect control. If it does not, retain the limitation record in `decisions/extension-host-recovery.md` and do not add private Electron/DOM automation. Independently record narrow, medium, and wide sidebar playthroughs covering movement/focus, resize, pause, lockout/recharge, synthetic off/on, live-plus-synthetic, pickups, chests, upgrades, victory/defeat, reset/reload, duplicate completion, and export. Update the current manual only from observed production behavior.

### 8. Review assets after gameplay acceptance

Use `.dev/assets/asset-index.json` and `.dev/assets/ASSET_INDEX.md` to inspect every unique visual group from the two user-provided roots. Generate local contact sheets, replace filename-derived descriptions with human semantic descriptions, reconcile every row, and record license/provenance evidence. Do not copy, package, or integrate an asset without explicit user approval and redistribution evidence.

## Per-step unattended protocol

1. Read this queue, P7, the current manual, the parity matrix, ADR-001, and the dirty-worktree status.
2. Mark one sub-slice in progress and verify the relevant source/date before coding.
3. Add focused success, boundary, invalid-input, duplicate, teardown, migration, privacy, and accessibility tests.
4. Implement the smallest production path; keep persistent ownership in the host.
5. Run focused tests, then `npm run typecheck`, `npm run lint`, the full test suite, build, integration/e2e, package, audit, and `git diff --check`.
6. Update the manual and this queue with evidence, limitations, and the exact next action.
7. Stop and add a dated addendum before any new divergence, secret, public listener, destructive migration, third-party asset integration, DLC, or unsupported telemetry scraping.

## Release gate

```text
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run package
npm audit --omit=dev --audit-level=high
git diff --check
```

`npm audit --omit=dev --audit-level=high` is currently clean. A full audit still reports eight development-chain advisories (Mocha/Vitest/Vite transitive packages); resolve those in a reviewed dependency-only slice before release, and do not use `npm audit fix --force` without rerunning the complete suite because it proposes a breaking Vitest upgrade.

P7 is not complete until the host snapshot/recovery work, first-stage parity, gold/drop parity, stat coverage, telemetry evidence, manual matrix, and semantic asset review are either completed or explicitly documented as platform limitations/user decisions.

## Latest implementation evidence — 2026-08-02

The counter-row audit is implemented: clock, Code Dungeon title, token count,
and the icon-only battery now share the `.map-toolbar` grid. Battery state is
exposed through the existing custom tooltip (including stored/max values), not
a native `title`; the lockout message is kept below the row. `uiLayout` and
production webview interaction tests cover the structural contract and retired
markup. The full 237-test suite, typecheck, lint, build, e2e activation smoke,
production dependency audit, and diff check pass. Responsive visual review
remains RG-06 and is intentionally not claimed by token-free DOM tests.
The unified manual was rebuilt in the same slice after its character-corruption
and stale command audit; it now reflects only verified behavior and named
limitations.

The RG-04 drop audit now has a table-driven registry guard for Luck ownership:
common Gold Coin/Coin Bag entries are unscaled and all current rare/tactical
light-source entries are explicitly scaled. Stage-specific economy balance is
still open.

The next RG-04 boundary is also covered: a full light-source cap removes Luck
from the attempt probability, so identical seeded zero- and high-Luck runs
replace the same source at the same perimeter position. This is a deterministic
ownership safeguard; exact stage probabilities and chest chances remain queued.
The focused simulation suite passes, and the fresh full-suite gate should be
recorded as the next handoff baseline. That gate is now **237 passing tests**
across 26 files; typecheck, lint, build, e2e activation smoke, package,
production audit, and `git diff --check` are green.

### Host-owned pause/resume addendum (2026-08-02)

The prior pause control was only a webview-local visibility flag. The run
domain now owns `paused`, `tick` exits before changing time, movement, battery,
or combat state, and the host suppresses synthetic generation while paused.
Production pause/resume travels as a sequenced `RUN_ACTION`; snapshots carry
the canonical flag and detached checkpoints preserve it. Legacy checkpoints
without the field migrate to `false`. Focused simulation, host, validation,
snapshot, and token-free webview coverage pass, followed by the 237-test full
suite and the release gates above. Manual visual/reconnect evidence remains
RG-06/platform-limited work.
