# P7 gap implementation plan

> The concise post-baseline gap inventory and dependency order is retained in
> [P7 remaining-gaps implementation plan](P7_REMAINING_GAPS_IMPLEMENTATION_PLAN.md).
> Keep both documents: this file contains the detailed G-01β€“G-10 execution
> contracts; the linked plan is the reviewable audit/handoff.

**Status:** Active gap-closure plan, audited 2026-08-02  
**Parent:** [P7 full-game roadmap](P7_FULL_GAME_ROADMAP.md)  
**Queue:** [Next updates](NEXT_UPDATES.md)

## Purpose

This document turns the gaps found while checking the P7 implementation against its code, tests, parity matrix, and current manual into executable work. It does not claim that an existing test, registry entry, or UI label is parity by itself. A gap closes only when the production path, its ownership boundary, focused tests, and the relevant manual/parity evidence agree.

The open-world camera is not a gap: it is an accepted product decision. Code Dungeon remains an open scrolling stage with camera-following and no viewport-edge walls. A later stage may declare a different topology through data. The token battery is the only approved gameplay divergence; synthetic income is additive test/premium-source functionality, not a second gameplay rule. DLC, third-party asset adoption, billing, and online multiplayer remain out of scope.

## Evidence baseline

The current baseline has 234 unit tests, typecheck, lint, build, integration/e2e activation smoke, VSIX packaging, production dependency audit, and `git diff --check` passing on 2026-08-02. The production webview waits for a host snapshot and the host owns persistent rewards. The local simulation is retained only behind the explicit token-free interaction harness.

These results prove the shipped slices; they do not prove the open gaps below. Do not raise the P7 status to complete while any required gap remains `Open`, `Partial`, or `Conditional`.

## Audit addendum β€” 2026-08-02

The implementation review found no new gameplay divergence that should be hidden as a bug. The remaining work is intentionally retained in the register below and must be closed through the production path, not by changing labels or adding test-only state:

| Audit finding | Planned implementation boundary | Exit evidence |
| --- | --- | --- |
| Extension-host recovery is covered by a deterministic driver, but the supported harness cannot expose a real Extension Development Host disconnect/reconnect route. | G-01: exercise the supported host/webview route; if the platform cannot expose it, record the limitation and keep the bounded host-driver evidence. | Reconnect resumes the host snapshot, stale/duplicate intents are rejected, and completion cannot pay twice; any unsupported route is documented rather than privately simulated. |
| Host state is canonical, but production telemetry still needs a proven live producer. | G-01A: move live/synthetic dispatch into host-owned adapters, bind sources/runs, and enforce bounded counts and identities; keep the direct seam only for token-free QA. | First authority and JSON/protobuf wire slices now block forged production webview value, generate synthetic income in the host, and dispatch accepted OTLP events directly; live producer smoke remains G-06 work. |
| The map decision is settled: Code Dungeon is an open scrolling stage with a hero-following camera; viewport borders are not world walls. | G-02/G-03: retain camera/topology as stage-owned data and finish narrow/medium/wide visual checks, including click/drag selection suppression. | Far travel remains deterministic with no blank origin-relative deletion or accidental canvas outline. |
| First-stage combat and economy still contain approximations even though the architecture is data-owned. | G-03/G-05: verify the remaining cadence, damage, pickup, chest, revival, and result rules against dated sources or explicitly marked observations before expanding content. | Seeded checkpoints, ledger totals, and observed end states reconcile without invisible rewards. |
| Exposed stats have presentation and initial effects, but not every formula/cap is source-backed. | G-04: finish shared formulas/caps and measure movement headroom, scaling, and reward effects together; hide any capability without an owned effect. | Every visible stat has one registry owner, custom copy, boundary tests, and an observable effect. |
| Codex telemetry fixtures prove the parser, not live producer compatibility. | G-06: run the opt-in, prompt-free local smoke; document either the supported stream or the platform limitation. | Synthetic income remains additive and independently toggleable; no content or secret data is retained. |
| Progress is host-owned; wallet, collection, unlock, settings, battery, upgrade, and run-history domains now have versioned storage with a compatibility mirror and interrupted-write marker. Broader unlock/purchase semantics remain partial. | G-07: retain the domain layout, add future schema migrations only losslessly, and make broader unlock/result mutations idempotent before adding content. | Reload/reset/corruption/interrupted-run tests preserve valid value and cannot resurrect a completed run. |
| Remaining base-game systems and external asset packs are not implementation gaps for the MVP yet, but they need retained work plans. | G-08/G-09: implement one child content family at a time after first-stage acceptance; inspect every asset group and license before any adoption. | Each family/asset group has a retained plan, evidence, and explicit scope decision; DLC stays excluded. |
| Automated gates pass, but manual visual/accessibility evidence is not yet recorded. | G-10: run the production matrix and reconcile the manual, parity matrix, project-management status, and package contents. | Every release row is observed or marked with a platform limitation, with matching test counts and no unapproved files. |

The addendum is a planning record, not a completion claim. Work remains dependency-ordered G-01, G-01A, and G-02 through G-10; a later gap cannot be marked complete merely because its code path exists without its acceptance evidence.

The baseline statement above is a historical checkpoint. The current release
gate supersedes it with **237 passing tests** across 26 files; typecheck, lint,
build, e2e activation smoke, package, production audit, and `git diff --check`
are green after the host-owned pause/resume slice.

The current gate is now **243 passing unit tests** across 26 files and **112
synthetic tests** across 4 files after the RG-02 King Bible/Unholy Vespers
family slice. The previous counts remain historical evidence.

## Gap register and implementation work

### G-01 - Prove disconnect/reconnect recovery at the production boundary

**Boundary addendum (2026-08-02):** Production reward recording is now
terminal-only: an active dungeon, level-up, or revival session is rejected
before any wallet mutation; a completed summary can be persisted once and a
replayed request remains idempotent. The provider recovery test covers the
partial rejection, successful terminal path, and duplicate replay.

**Evidence:** `src/extension/hostRun.ts`, `src/extension/extension.ts`, `src/extension/restoreGate.ts`, `src/extension/webviewLifecycle.ts`, and `src/webview/snapshot.ts` cover bounded checkpoints, JSON round trips, reset cleanup, long-run replay, coalesced concurrent restore, stale-view rejection, and fail-closed validation of checkpoint timing, economy, hero/stat inventory, battery, telemetry, ledgers, entity identities, pending-state values, and render-snapshot envelopes. Legacy checkpoints with stale entity allocators are repaired above the highest retained identity before validation, preventing restored pickups from colliding with newly generated entities. Provider disposal now explicitly invalidates its lifecycle generation before resources are cleared. `tests/unit/hostRun.test.ts`, `tests/unit/restoreGate.test.ts`, `tests/unit/webviewLifecycle.test.ts`, `tests/unit/extensionRecovery.test.ts`, `tests/unit/snapshot.test.ts`, and `tests/unit/webviewInteraction.test.ts` cover those boundaries, including production `GuildViewProvider` disposal/recreation, long-running checkpoint comparison/resume without drift, paused level-up overlay restore/action sequencing, retry sequencing, shape/corruption rejection, duplicate render-entity rejection, and bounded snapshot recovery. The supported integration host limitation is recorded in [Extension Development Host recovery evidence](../decisions/extension-host-recovery.md); no private DOM automation is used.

**Implementation sequence:**

1. **Implemented:** generation-guarded webview attachments reject stale disposed messages while preserving active host sessions.
2. **Implemented:** `RestoreGate` coalesces delayed/duplicate `READY` restoration and allows safe retry after storage failure; host snapshots and intent sequencing remain canonical.
3. **Implemented:** the provider-route recovery driver models disposal, delayed `READY`, stale messages, and a new `GuildViewProvider` instance with no local run state.
4. **Implemented:** the restored checkpoint is the accepted canonical state, the next intent sequence is restored, and replaying a lost intent is rejected/idempotent without a second reward.
5. **Implemented:** accelerated replay and checkpoint tests assert bounded simulation/pickup/snapshot/checkpoint envelopes against `src/game/policies.ts` limits.
6. **Platform-limited and documented:** the supported Extension Development Host route opens the view but cannot interact with webview DOM events or force a user-session reconnect; `.dev/decisions/extension-host-recovery.md` records the limitation and retains the provider-driver evidence.
7. Remove obsolete production compatibility assumptions around a client summary only after these tests pass.

**Exit criteria:** a fresh provider/webview attachment resumes from the canonical host snapshot after disposal; stale, duplicate, malformed, and malicious summaries cannot alter rewards; long-run replay converges to the uninterrupted reference; checkpoint and snapshot caps are asserted; any unsupported real-host DOM/reconnect route is explicitly recorded rather than simulated privately.

**Required tests:** reconnect timing, stale sequence rejection, duplicate completion, reset during reconnect, checkpoint corruption, bounded snapshot size, and host/webview convergence.

**Addendum (2026-08-02):** Detached checkpoint validation now also needs to
prove base-stat provenance against the canonical class registry and reject
extreme but finite combat-stat values before restore. This closes the remaining
resource-safety edge for Amount and related stat-driven loops without changing
normal progression. The production `RECORD_RUN_REWARD` boundary now also
requires the host session to be in its terminal `summary` phase; an active
dungeon, level-up, or revival session cannot be cashed out by a webview. The
provider recovery test exercises this rejection before continuing the normal
reconnect flow. The supported test host's inability to inject webview DOM
events or force a user-session reconnect is recorded as a platform-evidence
limitation in `.dev/decisions/extension-host-recovery.md`.

**Addendum (2026-08-02):** The production provider recovery suite now also
captures a checkpoint while a run is paused at level-up, restores it through
`READY` and `RUN_SNAPSHOT`, accepts one host-owned upgrade, and rejects the
same action sequence after the overlay closes. Pickup identities in the
fixture advance the allocator before collection, so pending-card and
collected-pickup ledgers are validated exactly as they are in a live run. This
closes the paused-overlay recovery case; real-host DOM/reconnect replay is
platform-limited and explicitly documented rather than left as an untracked
implementation gap.

**Addendum (2026-08-02):** The general pause control is now host-owned rather
than webview-only. `RunState.paused` is a validated domain field; production
`pause`/`resume` actions use the same monotonic intent sequence as movement and
level-up actions, and detached snapshots/checkpoints preserve the state.
Paused fixed steps do not advance time, movement, battery, combat, or synthetic
income. Legacy checkpoints migrate the missing field to `false`. Simulation,
host, validation, snapshot, and token-free interaction regressions pass. This
closes the pause authority/recovery sub-gap while real-host DOM interaction and
reconnect timing remain the documented platform limitation.

### G-01A - Close the production telemetry authority boundary

**Implementation status:** First authority and wire-format slices implemented. Host `RUN_STEP` generates synthetic income when enabled, the OTLP adapter dispatches accepted JSON/protobuf events directly into the foreground host session, production `RUN_TELEMETRY` is rejected, and bounded event/cumulative limits are enforced. The supported Extension Development Host DOM/reconnect route is platform-limited and documented; remaining live-producer smoke is tracked in G-06.

**Historical gap evidence before this slice:** the extension host derived the
persisted run reward from its `HostRunSession`, but production
`src/webview/main.ts` forwarded synthetic and live-normalized events as
`RUN_TELEMETRY` messages. The host validated their shape and sequence without
independently proving an authorized producer or enforcing a per-event token
ceiling. This was a trust-boundary gap, not a UI bug. The first authority
slice now rejects that production message, generates synthetic income in the
host, and dispatches accepted OTLP events directly; the explicit token-free
harness retains its local simulation seam for deterministic DOM tests only.

**Implementation sequence:**

1. Define the ingress contract in `ADR-001-RUN-AUTHORITY.md`: host-owned live
   OTLP events are dispatched directly to active sessions; host-owned synthetic
   events are generated from the configured test source; the production
   webview may request/toggle sources and render snapshots but cannot submit
   arbitrary token counts.
2. Replace the production `RUN_TELEMETRY` trust path with a host adapter
   dispatch. Keep the message type only for the token-free harness, or reject
   it in production with a bounded `RUN_ERROR`.
3. Bind every accepted event to an active run and configured source, enforce
   finite non-negative numeric fields, per-event and per-run bounds, monotonic
   producer identity/timestamps where available, and deduplication before
   calling `applyTokenInput`.
4. Ensure disabling synthetic income affects only the host synthetic producer;
   live OTLP events remain additive and independent. Battery lockout and reward
   recording must use the canonical host state, never a webview summary.
5. Add malicious-client, forged-source, oversized-count, duplicate,
   out-of-order, toggle, simultaneous-live-plus-synthetic, reload, and reward
   idempotence tests at the validation, host-session, and production-message
   boundaries.

**Exit criteria:** no production webview message can mint token/battery value
or alter the persisted run total; live and synthetic events remain separately
provenanced and additive; the token-free harness still runs without tokens or
secrets; `RECORD_RUN_REWARD` remains idempotent under retries.

**Required tests:** hostile `RUN_TELEMETRY` payloads, source/config mismatch,
per-event and cumulative limits, duplicate identity, clock skew, synthetic
toggle, live-plus-synthetic charging, webview reload, and duplicate completion.

### G-02 - Finish the interaction and focus acceptance boundary

**Evidence:** token-free DOM tests cover start, keyboard movement, pause, telemetry toggle, level-up actions, summary, return, export, resize redraw, and canvas selection/drag suppression. Narrow/medium/wide visual review remains open; the supported Extension Development Host click/reconnect limitation is recorded in `../decisions/extension-host-recovery.md`.

**Implementation sequence:**

1. **Implemented:** the map focus contract remains in one input adapter; pointer, selection, and drag events are suppressed while the canvas receives focus, and WASD resumes after blur/refocus.
2. **Implemented:** a resize listener redraws the current world without mutating simulation coordinates; the token-free interaction boundary exercises the resize path.
3. Add recorded narrow, medium, and wide sidebar checks for camera centering, HUD wrapping, controls, tooltip placement, and pause/revival/summary overlays.
4. Exercise every visible action through the same event boundary used in production; no test-only direct state mutation may stand in for a click where a production route exists.
5. Record manual screenshots/checkpoints for supported VS Code themes, zoom levels, high contrast, reduced motion, keyboard-only operation, and screen-reader labels.

**Exit criteria:** the interaction matrix is recorded with observed results, not inferred from source; every production control has a reachable success, disabled, error, and retry state.

### G-03 - Promote the parity matrix from partial slices to a first-stage contract

**Addendum (2026-08-02):** The level-up audit found that Banish persisted only
the current card ID. Because the same item can be represented as a new-item or
owned-item card, and because chest evolution/upgrade selection did not consult
the banish ledger, a banished item could return or be upgraded later in the
same run. The next implementation slice owns a canonical item-ban identity,
keeps legacy card IDs readable, blocks fallback heal/coin Banish, and applies
the rule to card generation, Reroll/Skip availability, chest upgrades, and
evolution. Focused tests must prove all those boundaries before treating this
slice as complete.

The boundary is now implemented and covered: canonical item-ban keys are
written alongside legacy card IDs, future card generation and Reroll/Skip
availability consult the shared predicate, chest evolution/upgrade selection
skips banned items, and Banish rejects fallback heal/coin cards. The focused
simulation regression and complete 228-test suite pass; the remaining G-03
work is the broader first-stage roster and its source-backed balance.

**Addendum (2026-08-02):** Fallback selection now runs after banish-aware
eligibility filtering. If every remaining weapon/passive is banned while
inventory slots are still available, the level-up overlay offers Coin Bag and
Floor Chicken rather than generic healing cards. A full-current-roster
regression covers canonical `item:<id>` keys and confirms that no banned item
can return through the fallback path.

**Addendum (2026-08-02):** Evolved projectile explosion triggers are now
registry-owned. No Future declares bounce/contact triggers and its radius
multiplier in `weapons.json`; simulation no longer infers this behavior from
the weapon ID, and registry tests reject triggerless or unsafe definitions.
This keeps the remaining weapon-family work data-driven and replay-safe.

**Addendum (2026-08-02):** The Runetracer-like Bouncing Arrow now has focused random-launch, infinite-pierce, camera-edge-reflection, and bounded 0.5-second hitbox-delay/re-hit coverage. Its No Future evolution now applies explicit Area-scaled explosions on edge bounce and hero contact, and emits bounded host-owned visual effects with simulation-time expiry, reduced-motion handling, checkpoint validation, and snapshot rejection tests. Bone retains its random-launch, enemy-reflection, camera-edge-reflection, and duration-retention slice. The Whip-derived Broadsword/Excalibur pair now declares registry-owned Speed/Duration ignore flags with deterministic stat-buff coverage and malformed-flag rejection. Magic Wand/Arcane Bolt and Knife/Throwing Daggers-derived attacks now declare Duration-ignore flags with deterministic lifetime coverage; Arcane Bolt and Archmage Staff implement a bounded 0.1-second nearest-target Amount sequence, while Throwing Daggers now also uses bounded 0.1/0.08/0.06/0.04-second facing sequences at its authored rank breaks. Thousand Blades declares six faced-direction shots at a bounded 0.05-second interval and resolves facing at release; malformed sequence state is rejected at host/snapshot boundaries. Garlic-like Aegis Barrier and Sanctuary now retain a bounded per-target hit cooldown equal to the effective weapon cooldown across radius exits, with malformed aura ledgers rejected at host/snapshot boundaries. Equivalent source-backed treatment for the remaining weapon roster remains open.

**Addendum (2026-08-02):** No Future's registry-owned retaliatory explosion now
applies the source-backed additive Armor bonus (`+10%` explosion damage per
Armor point, capped at `+500%`) only when the hero is hit; ordinary edge-bounce
explosions remain unmodified. Registry parsing defaults the new field to a
neutral value for legacy content while rejecting unsafe values, and shared math
plus simulation regressions cover normal, capped, armored, and unarmored
retaliation damage.

**Addendum (2026-08-02):** Evolved first-roster weapons no longer rely on the
generic legacy level-row fallback. Excalibur, No Future, and Sanctuary now
declare explicit authored rows for area, speed, duration, pierce, knockback,
damage, and cooldown; registry, level-stat, and attack regressions verify those
rows are what the simulation fires.

**Evidence:** `.dev/parity/BASE_GAME_MECHANICS_MATRIX.md` has cited rows and deterministic tests, but every row is intentionally `Partial`. Current implementation covers an authored subset of enemy families, waves, attacks, drops, stats, and end-state rules. An accelerated seeded checkpoint regression now exercises 0/1/5/10/15/20/25/30-minute boundaries, verifies deterministic replay, and checks the centralized enemy/projectile/pickup envelopes; mixed pickup snapshots use a 512-item envelope while the XP-gem contract remains 400. Code Dungeonβ€™s complete current roster/schedule contract is now validated in `src/game/registry.ts` and `src/game/data/stages.json`, including stage-owned scaling, spawn/persistence radii, and finale timing/clear/invulnerability policy. Level-up discovery and restored card envelopes use a shared registry-derived eligibility boundary, including max-rank and evolution-output rejection. Bone now has an explicit random-launch, enemy-reflection, camera-edge-reflection, and duration-retention test slice backed by the retained Bone reference; the remaining weapon roster still needs the same treatment.

**Implementation sequence:**

1. For each first-stage row, re-check the source/date and record the exact formula, cadence, ownership, and known uncertainty before changing code.
2. Separate rules that are verified, directly observed, approximated, and deferred; never label an approximation as canonical parity.
3. **Implemented first contract slice:** stage-owned data now declares the complete current Code Dungeon roster/schedule plus enemy family, interval, minimum/maximum active counts, per-minute scaling, spawn perimeter, persistence, contact radius/invulnerability, and finale transition; registry validation rejects unsafe radii, scaling, combat, and timing. Weapon aim is also data-owned: directional weapons use the hero's last normalized movement direction while targeted weapons use nearest-enemy aim, with backwards-compatible target defaults. Arcane Bolt/Archmage Staff now add the first source-backed targeted Amount sequence with explicit interval and queue validation.
4. Implement the missing first-loop combat rules in dependency order: contact cadence/invulnerability, damage/armor/knockback, movement headroom, weapon/passive caps, evolution eligibility, and finale presentation. The XP curve/pickup-tier slice is now implemented through `getXpRequiredForLevel`, `getThresholdGrowthBonus`, and collection-owned gem logic; preserve its boundary tests while closing the remaining rules.
5. **Implemented regression slice:** use deterministic accelerated timelines for 0/1/5/10/15/20/25/30-minute checkpoints plus bounded resource assertions and replay equality. Add a real-time smoke checkpoint when the manual matrix is available.

**Exit criteria:** one seeded first-stage run can be replayed to death or completion with no invisible rule, impossible reward, blank map, speed trap, or untestable approximation; the matrix rows have a source, implementation path, tests, and honest status.

**Addendum (2026-08-02):** The first Whip-family slash contract and a bounded
hero-centered crimson arc renderer are implemented. The cited reference describes
a frontal hero-originating horizontal attack that ignores Speed and Duration;
Broadsword/Excalibur use bounded static hero-anchored hitboxes with deterministic
facing/Amount/Area/knockback and anchored-lifetime regressions, while
`slashVisualGeometry` has finite/bounds tests. Sprite fidelity and the remaining
weapon-specific rules stay in the retained 3A queue before another weapon family.

**Addendum (2026-08-02, newly audited gap now closed):** The cited [Level
up](https://vampire-survivors.fandom.com/wiki/Level_up) and [Growth](https://vampire-survivors.fandom.com/wiki/Growth)
references now drive a named pure resolver: 5 XP at level 1, `10L - 5` through
level 20, `13L - 6` through level 40, and `16L - 8` thereafter, with +600 and
+2400 threshold additions. `recalculateStats` applies +100% Growth exactly at
levels 20 and 40 and removes it at 21 and 41. Boundary and threshold tests are
green; future work must add checkpoint/replay assertions if the XP envelope is
extended beyond the current first-stage contract. Do not tune enemy waves or
token rate to mask formula changes.

**Addendum (2026-08-02, newly audited gap now closed):** The cited [Luck](https://vampire-survivors.fandom.com/wiki/Luck)
owned-item formula is now a named `getOwnedItemChoiceChance` resolver. It
uses `1 + 0.3x - 1 / totalLuck`, where `x` is 1 on odd levels and 2 on even
levels, clamps to a safe probability, and is applied through two checks before
the remaining unique cards are filled from the shared pool. Boundary,
guaranteed-preference, max-rank, and fourth-option regressions are green.

### G-04 - Complete stat and capability ownership

**Evidence:** Duration, Luck, Greed, Curse, Revival, Recovery, movement, Area, Growth, and the source-backed XP level curve have tested slices. The Guild shop now consumes the canonical `META_UPGRADES` registry, so all registered capabilities are reachable; level-up cards now derive exact weapon/passive effects from the validated content registry and share a registry-derived eligibility boundary for max-rank/evolution-output rejection; shared domain helpers now own amount, projectile-area, aura-radius, projectile-lifetime, cooldown, and collected-healing projections; the character panel now presents all 15 exposed combat stats with custom accessible tooltips from `src/webview/statPresentation.ts`; Amount, Might, Area, Projectile Speed, and Duration now have source-backed derived caps, with detached boundary validation sharing the same policy; StateManager clamps known over-cap meta ranks at both legacy migration and current-schema load while retaining bounded unknown future keys; registry loading now rejects class/passive stat capabilities that have no implementation path; Pandora's Box now resolves its authored +4%/+3% Omni progression and rank-9 +100% Curse effect from per-level registry data; several base-game formulas/balance effects remain incomplete.

**Addendum (2026-08-02):** The Amount projection now treats the combat stat as additional projectiles rather than a multiplier. A weapon's authored projectile count remains intact and each Amount point above the base value contributes one additional projectile; the shared helper and an end-to-end fire regression cover mixed authored counts and rank-one bonuses.

**Addendum (2026-08-02):** The source-backed 10-point Amount bonus upper limit
is now an authoritative shared policy. The domain stores a baseline-inclusive
value, so `maxAmountStat: 11` represents baseline 1 plus the allowed 10-point
bonus. Derived simulation stats normalize to that integer ceiling, and detached
host checkpoints plus webview snapshots reject values above it rather than
accepting them under the broader finite-stat safety ceiling. Focused
simulation, checkpoint, and snapshot tests cover the boundary; other stat caps
remain open.

**Addendum (2026-08-02):** The shared cooldown projection now applies the
source-backed 10% total-cooldown floor through
`SIMULATION_POLICIES.minCooldownMultiplier`, replacing the former provisional
15% floor. A deterministic math regression covers the boundary; wider stat
caps and combined movement/economy balance remain open.

**Addendum (2026-08-02):** Source-backed upper caps are now shared policy
values for Might (+900%), Area (+900%), Projectile Speed (+400%), and Duration
(+400%), matching the documented 1000%/500% total-stat ceilings. Derived
simulation stats clamp to those values and host/webview boundaries reject
over-cap Might; focused derivation and snapshot/checkpoint assertions cover the
limits. Uncapped stats remain intentionally outside this slice.

The current cap policy is intentionally narrow: it does not invent caps for
Luck, Growth, Greed, Move Speed, Recovery, or Armor, whose cited references
describe no upper limit. Those effects remain bounded by the detached finite
safety ceiling until their complete first-stage formulas and balance are
verified.

**Addendum (2026-08-02):** The registry passive audit now exercises every
exposed passive at rank one and at its authored maximum, including max-health,
magnet, Omni, and revival-charge projections. This strengthens the G-04 exit
evidence without claiming that the remaining uncapped formulas or balance are
complete.

**Addendum (2026-08-02):** Recovery now owns both of its observed first-stage
effects through explicit boundaries: the fixed simulation step regenerates HP
per second, while collected Floor Chicken equivalents project their authored
healing through `calculatePickupHealing` as `base healing × (1 + Recovery)`.
The collection test keeps the two cadences separate and verifies that healing
remains capped at maximum HP; revival and level-up heal-card semantics remain
deferred until their source rules are independently verified.

**Addendum (2026-08-02):** The meta registry now matches the cited PowerUp
values for Guild Agility (+5% per rank, +10% maximum) and Guild Duration (+15%
per rank, +30% maximum). Token Magnetism now uses the source-specific
Attractorb multipliers by level, and the Magnet PowerUp compounds its 1.25×
rank multiplier. The late Infinite Loop Fiend speed was reduced to preserve
measurable escape headroom after the stage minute curve. Rank projection and
movement/magnet regressions cover the change; broader stat formulas and balance
remain open.

**Addendum (2026-08-02):** PowerUp purchases now follow the source global
fee/base-cost formula rather than the legacy per-upgrade exponential
multiplier. StateManager and the shop share total-rank context, while refunds
reconstruct exact spend from persisted ranks and leave the battery track
isolated. Validation covers first/second and cross-upgrade fees, max-rank and
insufficient-gold boundaries, refund, and migration isolation; broader manual
shop QA remains RG-06.

**Addendum (2026-08-02):** Armor remains uncapped as a player stat, but its
retaliatory-damage multiplier now has the source-backed +500% ceiling. The
shared policy/math boundary, No Future registry field, host-safe legacy default,
and capped simulation test keep this separate from Armor's minimum-one contact
damage rule.

**Addendum (2026-08-02):** The cited [Curse](https://vampire-survivors.fandom.com/wiki/Curse)
behavior is now damage-isolated. Curse scales enemy health and speed plus
wave density/cadence; it does not multiply enemy contact damage. The stage's
authored per-minute damage curve remains independent, and matched production
spawns now have a regression proving that boundary.

**Addendum (2026-08-02):** The current first-stage weapon registry is now
closed against generic stat fallback: all six selectable base weapons and five
evolved outputs carry explicit authored level rows and validated attack
patterns. A table-driven registry regression covers row cardinality and
targeted aim ownership; the wider non-DLC weapon family remains deferred to
the retained child plans.

**Implementation sequence:**

1. **Implemented for the meta shop and level-up capability discovery:** the canonical `META_UPGRADES` registry is now the only shop capability source; level-up cards derive exact next-level weapon/passive effects from the content registry and new-weapon discovery excludes only authored evolution outputs; UI/helper/simulation tests assert every registered shop entry is reachable and descriptions do not fall back to generic text.
2. **Implemented formula ownership slice:** amount, projectile area, aura radius, and projectile lifetime now use shared pure helpers in `src/game/math.ts`, with boundary tests. This preserves current MVP balance while preventing renderer, chest, or telemetry code from inventing alternate stat projections.
3. **Implemented presentation slice:** render every exposed combat stat in the character panel with a stable key, finite value formatting, and a custom tooltip explaining its gameplay effect; retain HP/max HP in the bars rather than duplicating them in the chip list.
4. **Implemented persistence-normalization slice:** known meta-upgrade ranks are clamped to authored caps at the host migration/load boundary; unknown future keys remain bounded and round-trippable.
5. **Implemented capability-validation slice:** class traits and in-run passives accept only the canonical stat capability set, with invalid stat names rejected before content can reach the shop or simulation; upgrade effect copy also normalizes legacy corrupted glyphs to readable ASCII text.
6. **Implemented changing-effect passive slice:** per-level registry effects now drive Pandora's Box in both simulation and exact upgrade descriptions; rank-one, rank-eight, and rank-nine behavior is tested, including the final Curse transition.
7. Make level-up, character, and chest pools consume the same registry; hide or reject a capability whose behavior contract is incomplete.
8. Add rank-zero, rank-one, max-rank, over-cap migration, invalid-card, and duplicate-card tests for every registered stat.
9. Measure movement, enemy speed, cooldown, area, duration, Luck, Greed, Curse, Growth, Armor, and Revival together in accelerated runs so a buff cannot create an unavoidable speed trap.

**Exit criteria:** every exposed stat has a visible, custom description and an observable tested effect; no telemetry throughput changes a gameplay stat; caps and migrations are deterministic.

### G-05 - Finish first-stage gold, drop, chest, and result accounting

**Addendum (2026-08-02):** Gold awards now apply Greed as an additive
modifier to the 100% base multiplier, preserving negative character/content
modifiers as reduced positive rewards while clamping malformed values at zero.
A collection regression covers a -50% Greed pickup.

**Addendum (2026-08-02):** Elite-drop resolution now uses two deterministic
random draws: one for the authored 38% drop gate and a separate one for the
weighted reward table. The prior implementation reused the gate draw and
biased successful drops toward early entries. A seed-specific regression proves
that a successful gate can still select the final gold-sack bucket.

**Addendum (2026-08-02):** Identified stage chests and the legacy un-identified
boss chest now use separate ownership flags. Opening a stage chest cannot consume
the later boss reward, and duplicate calls to either identity remain idempotent;
the regression is covered in the simulation chest ledger tests. Exact chest
chances and full result presentation remain open.

**Evidence:** `src/game/data/drops.json` now contains validated stage-keyed tables, and light-source/elite ownership is resolved through the selected stage's `dropTableId`; elite gold is explicitly recorded under the `eliteDrops` ledger source. XP gems and battery overflow no longer create gold. A bounded host-persisted pickup identity ledger now prevents a duplicate gold, XP, tactical, or chest pickup from applying again across ticks; legacy checkpoints migrate the ledger to empty and oversized/corrupt ledgers fail closed. Per-stage balance beyond the current Code Dungeon table, complete pickup tables, used/unused revival presentation, and full end-state presentation remain open.

**Implementation sequence:**

1. Verify the first-stage light-source and elite tables against the cited source or an explicitly documented observation; keep common/rare Luck behavior source-backed.
2. **Implemented first data slice:** every currently supported floor pickup is in the validated Code Dungeon table with collection-owned effects, value rules, level gates, duplicate identity, and closest-ring replacement when the bounded light-source cap is full; future stages must declare their own `dropTableId` instead of inheriting this balance.
3. **Implemented first chest-quality/presentation contract:** each validated stage drop table now owns a base tier plus independent five-item/three-item checks. Resolution follows the researched highest-to-lowest order and multiplies each check by total Luck (`1 + bonus`); chest identity still retains the resolved tier and reward so replay cannot pay twice. A collected chest now owns a bounded 1.5-second simulation pause for the reward presentation; movement, combat, battery drain, stage time, and premature boss completion cannot continue beneath the banner, and the field survives host checkpoints. Exact per-chest source chances and additional-stage tables remain open.
4. **Implemented reward-pool ownership slice:** each chest reward now selects from one shared eligible owned weapon/passive pool using seeded RNG and source rarity weights, excluding maxed or banished items and rejecting rank-zero passives. Same-seed reward/gold identity, cross-type selection, and weighted distribution are regression-tested. Exact Code Dungeon tier probabilities and additional-stage tables remain follow-up work.
5. **Implemented ledger foundation:** reconcile gold from light sources, elites (under `eliteDrops`), chests, level-up fallback, stage completion, and unused/used revivals through one host-owned ledger; `goldBreakdownTotal` and the finish-time invariant now prevent a source bucket from drifting out of the run total. Victory summaries and exports now disclose the exact stage-reward basis (500 base gold, unused-revival gold, and the escalating finale-revival bonus); stage completion/revival rewards bypass Greed, while pickup/chest/level-up awards apply it once at their owned boundary. Complete the remaining death/revival/export coverage before closing G-05.
6. Add death, revival, victory, reset, duplicate completion, and export-summary tests that compare ledger totals with the wallet mutation.

**Exit criteria:** every gold unit is collectible or end-state-owned, awarded once, applies Greed exactly where the authored source permits, and is visible in the summary/export; ordinary XP and token events never award gold.

### G-06 - Establish supported Codex telemetry feasibility

**Evidence:** the loopback adapter and synthetic toggle are implemented and privacy-tested. `/v1/traces` and `/v1/logs` JSON and protobuf fixtures cover numeric input/output/cache/reasoning normalization, duplicate identity, limits, loopback policy, teardown, binary wire decoding, and malformed requests. Host-run and provider-recovery tests cover additive synthetic plus OTLP dispatch and prove a forged production webview message cannot mutate the session. The current official Codex configuration reference documents opt-in OTel log export through `otlp-http` or `otlp-grpc`, with OTLP/HTTP protocol values `binary` or `json`; representative `codex.sse_event` records carry token counts on `response.completed`. A local `codex doctor`/user-config inspection on 2026-08-02 found no configured OTLP exporter or telemetry destination, so live producer compatibility cannot be proven without explicit user configuration; the extension did not alter global config. The adapter now supports both documented wire encodings but still has not proven a live Codex producer. Sources: [Codex advanced configuration](https://learn.chatgpt.com/docs/config-file/config-advanced#observability-and-telemetry) and [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).

**Implementation sequence:**

1. **Implemented fixture boundary:** retain a local, prompt-logging-disabled fixture/smoke procedure for the documented Codex OTel log envelope; record numeric event fields, reasoning detail, duplicate identity, and clock behavior without retaining content.
2. **Implemented wire-format slice:** accept `application/json`, `application/x-protobuf`, and `application/protobuf` with identity encoding; use a bounded dependency-free decoder for only the token-bearing scalar fields, and reject malformed/unsupported encodings with explicit HTTP errors.
3. Run the producer smoke only through an explicit opt-in loopback configuration; retain no prompts, responses, raw bodies, headers, credentials, or private files. Confirm that the endpoint receives `codex.sse_event` completion usage and measure batching/flush behavior.
4. **Implemented normalization slice:** normalize input, cached-input, total output, and optional reasoning-output detail with exact/estimated provenance and event-identity deduplication. Reasoning detail is diagnostic and cannot increase total output twice.
5. If the supported Codex surface cannot be configured to emit a compatible local stream, record the limitation, keep synthetic income as the safe additive fallback, and do not scrape UI text, conversation files, SQLite, terminal output, or credentials.
6. Test disable/teardown, port conflict, remote-client rejection, malformed/oversized/duplicate/clock-skewed events, binary-vs-JSON negotiation, producer flush/restart, and simultaneous live+synthetic charging.

**Exit criteria:** either a documented live smoke proves the supported path, or the limitation is explicit in the telemetry decision and manual; synthetic income remains independently toggleable and cannot disable or duplicate live events.

**Conditional evidence (2026-08-02):** the platform limitation is now
documented in the telemetry decision and current manual, with an explicit
user-level loopback configuration snippet that keeps prompt logging disabled.
No global Codex configuration was changed. The live smoke remains a user-opt-in
follow-up; fixture, authority, privacy, teardown, and additive synthetic/live
tests are the automated acceptance evidence.

### G-07 - Complete character, stage, and persistence progression

**Evidence:** character selection no longer advertises highest attained level. Hero options explain their starting weapon and class trait; unlock conditions are authored in the validated class registry and applied by StateManager; a data-owned stage selector presents duration, topology, modifiers, and unlock state; `START_RUN` carries the selected stage and the host validates both registration and unlock state; snapshots/checkpoints reject unknown stage IDs. StateManager now persists versioned wallet, collection, unlock, settings, battery, upgrade, and run-history domains behind an interrupted-write marker while retaining a legacy aggregate mirror; focused tests cover domain round-trip, corruption fallback, reset, and detached checkpoints. Broader unlock/purchase paths and future schema migrations remain partial.

**Implementation sequence:**

1. **Implemented first slice:** define the visible character record presentation from the validated class registry: starting weapon, exact trait cadence/cap, unlock reason, and no best-level label. Portrait fidelity, purchase price, and broader character records remain open.
2. **Implemented first slice:** add stage selection with data-owned duration, topology, modifiers, unlock state, and a host-validated `START_RUN` contract; preserve the selected stage through local simulation, host sessions, snapshots, and checkpoints.
3. **Implemented first unlock slice:** move hero unlock conditions into the validated class registry and apply them through StateManager; the selector uses the same descriptions. Replace remaining hand-maintained PowerUp/stage allowlists with registry conditions, then make purchases, refunds, and result announcements host-owned and idempotent.
4. **Implemented first persistence-domain slice:** separate wallet, run history, collection, unlocks, settings, battery, upgrades, and active-session persistence behind a versioned layout marker; retain the aggregate mirror for lossless fallback and cover schema migration, corruption recovery, extension reload, interrupted-run, and reset tests. Future schema migrations and broader unlock/purchase semantics remain open.

**Exit criteria:** locked content explains its real unlock path, selected content cannot be bypassed, all persistent mutations are host-owned, and legacy saves retain valid value.

### G-08 - Retain child plans for the remaining non-DLC base game

**Evidence:** Step 8 systems (remaining weapons/passives/evolutions, characters, stages, collection/bestiary, merchant, Arcanas, modes, Eggs, secrets, and co-op feasibility) are not implemented. The retained [P7 content family child-plan index](P7_CONTENT_FAMILY_PLANS.md) now gives each family a dependency, source starting points, registry/ownership work, tests, and exit gate; implementation remains deferred until G-01 through G-07 pass.

**Implementation sequence:**

1. Do not expand content until G-01 through G-07 and the first-stage gate are accepted.
2. **Implemented planning slice:** retain one section per family in `P7_CONTENT_FAMILY_PLANS.md` with sources, registry schema, ownership, UI state, unlock/migration rules, tests, and release gates.
3. Implement one vertical family at a time; each family must include data validation, deterministic domain behavior, host IPC, production UI, save/replay coverage, and manual evidence before the next family begins.
4. Record unsupported VS Code platform capabilities as explicit decisions; do not silently replace them with undocumented APIs.

**Exit criteria:** every remaining base-game system is implemented through a retained child plan or carries an evidence-backed platform limitation/user decision. DLC and online multiplayer remain excluded.

### G-09 - Complete the external asset semantic and license review

**Evidence:** `.dev/assets/asset-index.json` and `ASSET_INDEX.md` mechanically index all observed PNGs, but descriptions are filename-derived and `variant-reviewed` is not human visual review. No assets are integrated, which is correct.

**Implementation sequence:**

1. Read the pack documentation, Asset Store license/provenance, invoice information supplied by the user, and Unity `.meta` slicing data.
2. Generate a local, ignored contact-sheet workspace grouped by unique hash/variant/theme; inspect every unique group one by one.
3. Replace filename-derived descriptions with semantic descriptions, role candidates, style/legibility notes, duplicate/variant links, and reviewed/unusable reasons.
4. Reconcile row counts to both source roots and record a shortlist/rejection list in `ASSET_REVIEW.md`.
5. Pause for explicit user approval and redistribution evidence before copying or packaging any raster, PSD, font, prefab, or Unity metadata.

**Exit criteria:** every PNG has one reconciled row and every unique visual group has a human description and license status; no third-party asset is adopted automatically.

### G-10 - Release-candidate manual and documentation gate

**Evidence:** automated gates pass, but the recorded narrow/medium/wide playthrough matrix, current manual observations, and semantic asset review are not complete.

**Implementation sequence:**

1. Run the manual matrix from P7 Step 12 using token-free synthetic mode and separate live-telemetry smoke where supported.
2. Record observed behavior, screenshots/checkpoints, environment, zoom/theme, pass/fail, defect link, and retest date; do not convert source assumptions into manual evidence.
3. Reconcile `CURRENT_MANUAL.md`, `PROJECT_MANAGEMENT.md`, `VAMPIRE_SURVIVORS_PARITY_TODO.md`, the parity matrix, ADR-001, telemetry decision, and this plan after each accepted slice.
4. Run the full release gate: `npm ci`, lint, typecheck, unit tests, build, e2e, package, production audit, and `git diff --check`.

**Exit criteria:** every manual row is observed or marked with an explicit platform limitation, all docs agree on test counts/status, and the packaged VSIX contains no unapproved asset or secret.

## Dependency order for unattended execution

Execute only one active slice at a time:

1. G-01 host recovery and bounded replay.
2. G-01A production telemetry authority and source binding.
3. G-02 interaction/resize boundary.
4. G-03 first-stage parity contract and missing combat rules.
5. G-04 canonical stats/capabilities.
6. G-05 gold/drop/chest/result reconciliation.
7. G-06 telemetry feasibility and privacy evidence.
8. G-07 character/stage/persistence progression.
9. G-08 retained child plans and then content families.
10. G-09 asset semantic/license review.
11. G-10 final manual and release gate.

At each step: mark the exact slice in progress, check the source/date, add success/boundary/invalid/duplicate/teardown/migration tests, implement the smallest complete production path, run focused tests followed by the full release gate, update evidence, and leave the next action. Stop for a dated addendum before a new divergence, destructive migration, secret, public listener, unsupported telemetry scraping, third-party asset integration, DLC, or external publication.

## Completion checklist

- [x] G-01 host reconnect/replay acceptance is proven at the production-provider boundary; real Extension Development Host DOM/reconnect replay is platform-limited and documented.
- [ ] G-01A production telemetry cannot be forged by the webview and source provenance is enforced.
- [ ] G-02 production interaction, resize, focus, accessibility, and manual evidence are recorded.
- [ ] G-03 first-stage parity rows are source-backed and behaviorally verified.
- [ ] G-04 every exposed stat/capability has an owned, tested effect and cap.
- [ ] G-05 all first-stage gold/drop/chest/result paths reconcile exactly.
- [ ] G-06 live telemetry is proven or its supported-platform limitation is documented honestly.
- [ ] G-07 character/stage progression and persistence are host-owned and migrated safely.
- [ ] G-08 remaining base-game families have retained child plans and no DLC scope.
- [ ] G-09 both asset packs are semantically reviewed and license status is explicit, with no unapproved adoption.
- [ ] G-10 manual, docs, package, and release gates are complete.

P7 remains active until every checked item has current evidence. Passing automation alone is not sufficient.

### RG-02 Axe family checkpoint — 2026-08-03

`battle_axe` and `scythe_of_doom` are now a registry-owned first-stage family.
The shared queued fan strategy persists launch angle and authored Amount, with
host checkpoint and webview snapshot rejection for incomplete/mismatched fan
state. Focused and full gates pass at 242 unit / 111 synthetic tests. Vertical
arc physics and indefinite evolved lifetime remain explicit partials; the next
content slice must use the same source → registry → simulation → boundary test
sequence.

### RG-02 Cross family checkpoint — 2026-08-03

`celestial_cross` and `heaven_blade` now use the registry-owned boomerang
pattern, with Clover as the validated evolution passive. Projectile origin and
return phase are persisted and validated at host/snapshot boundaries. Focused
and full gates pass at 243 unit / 112 synthetic tests; critical hits, Pool
Limit, wall/spin presentation, and exact intermediate rows remain partial.

### RG-02 King Bible family checkpoint — 2026-08-03

`orbiting_grimoire` → `unabridged_codex` now uses the registry-owned `orbit`
strategy. The source-backed King Bible progression, Spellbinder evolution, and
Unholy Vespers combat anchors are covered by registry, simulation, upgrade-copy,
and chest eligibility tests. Every orbit projectile persists angle, radius, and
angular speed, follows the hero, and is rejected at host/snapshot boundaries
when incomplete or mismatched. The 180-unit radius cap and 30-Pierce safety
envelope bound resource use. Focused and full gates remain green at 243 unit /
112 synthetic tests; hitbox-delay reset, page-fall presentation, and exact Pool
Limit behavior remain partial.
