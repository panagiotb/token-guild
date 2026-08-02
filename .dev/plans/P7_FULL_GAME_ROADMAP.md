# P7 roadmap: from vertical slice to a full base-game loop

**Status:** Active baseline implementation, audited 2026-08-02. This plan remains incomplete; each status below names shipped slices and open acceptance work.

## Mission

Grow Token Guild slowly from a functioning vertical slice into a complete, game-like experience. Match the mechanics and pacing of the non-DLC base game wherever the VS Code/sidebar format permits. The only approved gameplay divergence is the token battery, which limits available play time according to collected agent tokens.

The first objective is one correct, enjoyable, end-to-end stage. Broader content, advanced modes, presentation polish, and asset adoption come only after that loop is mechanically complete and regression-tested.

## Locked product decisions

1. **Map:** Code Dungeon is an open scrolling stage. World coordinates may grow in any direction; the camera follows the hero and renders a repeating background. Do not add walls at the current viewport edge. Later stages may explicitly declare open, corridor, or bounded/collision topology.
2. **Canvas focus:** clicking the map must preserve movement input without drawing a browser/VS Code focus outline or selection border. Keyboard access and focus recovery must remain tested.
3. **Parity:** copy base-game rules, cadence, ownership, and formulas before inventing Token Guild alternatives. Reskin names and visuals; do not copy copyrighted art, audio, text, or code.
4. **Divergence:** telemetry affects the battery and play availability only. It does not grant XP, gold, damage, movement, drops, Luck, enemy changes, or stage progress.
5. **Gold:** retire the current XP-gem gold and battery-overflow gold behavior. Future gold follows the base-game acquisition loop. Existing saved wallet balances are grandfathered because their historical source cannot be reconstructed safely.
6. **Synthetic telemetry:** synthetic income remains an additive test source. A bottom-of-view control toggles it without disabling real telemetry. Record it as a possible future premium entitlement, but do not implement billing, licensing, or feature gating in P7.
7. **Character selection:** remove highest-run-level labels and descriptions. Selection should explain the starting weapon, character trait, unlock state, and any real purchase cost instead.
8. **Assets:** do not integrate either external asset pack until the gameplay loop is complete and the user approves a separately documented license/style decision. The catalog and semantic review are still completed during this roadmap, after gameplay.
9. **Scope:** base-game mechanics are the long-term target; DLC remains excluded. Work in reviewable milestones rather than attempting all content in one change.

## Audit findings that must be carried forward

- P6 interaction, authority, pickup/chest, stat, and final-QA acceptance is incomplete; see the audit table in `NEXT_DEVELOPMENT.md` and the executable [P7 gap implementation plan](P7_GAP_IMPLEMENTATION_PLAN.md).
- Hero movement now enters the deterministic simulation through a validated `InputSnapshot`; `src/webview/main.ts` samples keys but does not own world-coordinate mutation.
- The renderer now uses a hero-following camera and repeating background, so arbitrary positive/negative world coordinates remain visible.
- `MAP_LIMIT` has been replaced by named `worldPolicies` for projectile cleanup, enemy persistence, ricochet boundaries, and pickup-condensation placement.
- `src/webview/main.ts` owns DOM creation, rendering, input, telemetry generation, the game loop, progress optimism, and IPC. This is too coupled for full-game work.
- The host registers a run ID and hero, mirrors accepted intents, derives the final run economy, and publishes detached sequenced snapshots; production rendering now waits for host state, while the local simulation is limited to the explicit token-free harness. Long-run provider replay parity is covered; the supported test-host limitation for true disconnect timing and DOM replay is recorded in `decisions/extension-host-recovery.md`. The first G-01A source-authority slice now generates synthetic income and dispatches accepted OTLP events in the host; production `RUN_TELEMETRY` is rejected. Live producer compatibility remains G-06 work.
- The OTLP adapter accepts bounded JSON or protobuf traces at `/v1/traces` and OTel log records at `/v1/logs`, with `gen_ai.usage.*` scalar attributes. Current Codex documentation instead describes opt-in OTel log export, including `codex.sse_event` completion records with token counts. The adapter is still a fixture path, not yet proven Codex capture.
- `tokenSource` remains a latest-source display label, while `tokenLedger` now preserves additive synthetic/live provenance for summaries and reconciliation.
- Code Dungeon now enters an authored finale without requiring the timeout threat to be killed; after a one-minute final-threat window the stage resolves with its completion reward. The first-stage light-source table and one-second spawn-attempt cadence are deterministic and source-backed, while the map and result summary expose the final-threat deadline, completion reason, duration, and threat count.
- The former gold divergence is removed: ordinary XP gems and battery overflow do not award gold; destructible light-source drops are the first base-game replacement slice.

The host reward boundary was tightened during the reconnect audit: a run can be
recorded only after the canonical host session reaches its terminal summary;
partial dungeon, level-up, and revival sessions cannot be cashed out by a
webview. Production-provider reconnect/replay is covered; the supported test-host
limitation is recorded in `decisions/extension-host-recovery.md`, while full DOM
replay evidence remains RG-06 work.

The next parity slices also keep combat/economy rules data-owned: elite drop
chance and weighted reward selection use separate deterministic rolls, Greed
applies as a bounded `1 + Greed` multiplier at pickup/chest/level-up boundaries
(including negative authored modifiers), and evolved weapon explosion triggers
are declared and validated in the weapon registry rather than inferred from an
ID. Recovery now also has one shared projection for its fixed-step regeneration
and collected healing pickups. These changes are tested but do not close the
broader first-stage parity rows; revival and level-up healing semantics still
require separate source verification.

The current light-source slice follows the documented destructible-source direction in the [Light source reference](https://vampire-survivors.fandom.com/wiki/Light_source) (checked 2026-08-02). The stage finale now also follows the documented repeated-threat direction in [The Reaper](https://vampire-survivors.fandom.com/wiki/The_Reaper) (checked 2026-08-02). The authored first-stage weights, minimum-level gates, Luck rule, one-second spawn attempts, ten-source cap, collection-owned tactical effects, elite drop chance/table, dedicated `eliteDrops` gold ledger source, and post-timer result fields are explicit and tested in validated content data; per-stage balance, source evidence, and complete long-run presentation remain MVP work until stage-specific behavior is verified; the implementation must not present those approximations as canonical base-game parity.

## Target architecture

```text
VS Code extension host
  |-- validated configuration and telemetry adapters
  |-- canonical persistence/economy and active run session
  `-- typed IPC intents and canonical snapshots
             |
Pure game domain
  |-- fixed-step simulation + input snapshot
  |-- stage/content/stat/drop registries
  |-- deterministic RNG and reward ownership
  `-- camera-neutral world state
             |
Webview
  |-- input adapter
  |-- interpolated canvas renderer + camera projection
  |-- DOM menus/HUD/dialogs
  `-- no direct persistent reward authority
```

Keep domain behavior independent of DOM, wall-clock time, VS Code APIs, network input, and raster assets. Prefer small modules with one owner over a new framework rewrite.

## Unattended execution protocol

For every numbered step:

1. Re-read this plan, current manual, dirty-worktree status, related implementation, and tests.
2. Record the exact sub-slice as in progress. Do not begin a later dependency while it is red.
3. Verify any base-game fact against a current source and add the source/date to the parity matrix before coding.
4. Write focused success, boundary, invalid-input, duplicate, teardown, and migration tests relevant to the slice.
5. Implement the smallest complete production path.
6. Run focused tests, then typecheck/lint, then the affected regression suite.
7. Review reward ownership, deterministic replay, IPC validation, bounded resources, privacy, focus, and save migration.
8. Update `CURRENT_MANUAL.md` only for behavior proven through the production path.
9. Leave a buildable checkpoint and an exact next action. Preserve all plans.

Stop and add a dated plan addendum before a new gameplay divergence, destructive save migration, secret/credential requirement, public listener, unsupported Codex scraping path, third-party asset integration, DLC, or external publication.

## Step 0 -- close P6 blockers and freeze a trustworthy baseline

**Implementation status:** Partial baseline closed. Arcane Cleanser, chest ownership/results, revival consumption, obsolete `SAVE_PROGRESS`, movement/camera foundation, additive telemetry fixture route, destructible light-source entities, and XP/battery gold divergence fixes are implemented and tested. Token-free production-webview full-flow coverage and host-derived run results are present; host snapshots/disconnect replay, full stat parity, true VS Code webview clicks, and the recorded manual matrix remain open dependencies.

### Work

- fix Arcane Cleanser so non-boss enemies are removed while bosses remain in state, counters, and victory checks;
- store chest resolution by chest ID, not only in a global history tail;
- separate consumed revivals from derived stat bonuses so stat recalculation cannot restore spent lives;
- either complete Luck/Curse behavior for currently offered passives or hide those passives until their parity step;
- remove `SAVE_PROGRESS` from the webview protocol and validation after confirming no production sender remains;
- add production-DOM tests for level-up choice, Reroll, Skip, Banish, dialogs, summary, return, export trigger, and duplicate re-render behavior;
- remove any remaining whole-progress production sender and transfer host-derived run ownership explicitly to Step 2; do not add new economy/content on the client-trusted reward path;
- upgrade the test-only Vitest/Mocha dependency chains through reviewed compatible releases and rerun the full harness; `npm ci` on 2026-08-02 reported eight development advisories while the production dependency audit remained clean;
- complete and record the narrow/wide manual P6 matrix.

### Acceptance

- every P6 audit row is either accepted or explicitly transferred to a named later step with no false completion claim;
- the host-authority blocker is named as a Step 2 dependency and cannot be bypassed by new reward work;
- bosses survive screen clear and duplicate chests never pay or report another chest's reward;
- focused tests plus the full milestone gate pass.

## Step 1 -- establish a verified base-game parity contract

**Implementation status:** Seeded at `.dev/parity/BASE_GAME_MECHANICS_MATRIX.md` with cited sources and explicit partial/deferred rows. Expand and promote rows only with a source/date and behavior test.

Create `.dev/parity/BASE_GAME_MECHANICS_MATRIX.md`. It is the implementation contract, not a loose wishlist. Every row contains: base-game mechanic, current source URL/title, verification date, expected rule/formula/cadence, Token Guild reskin, current implementation path, tests, status, and any approved deviation.

Inventory at least these non-DLC systems:

- input, camera, world topology, collision, pause, clock, stage completion, Reaper/end-state behavior;
- hero base stats, level growth, damage, armor, recovery, cooldown, area, speed, duration, amount, move speed, magnet, luck, growth, greed, curse, revival, and caps;
- enemy spawn perimeter, wave cadence, quantity cap, despawn/relocation, movement types, contact damage, knockback resistance, elites, bosses, and scaling;
- level XP curve, weighted upgrade choices, inventory limits, newly acquired items, maxed-item fallback, Reroll, Skip, Banish, and Seal where applicable;
- weapons, passive items, weapon-specific behavior, evolutions, unions, gifts, chest eligibility, and evolution timing;
- XP gems, light sources, floor pickups, vacuums, freeze, screen clear, healing, clovers, chests, and collection ownership;
- gold sources, Greed, stage reward, unused-revival reward, shops, PowerUps, refunds, character purchases, and result accounting;
- character, stage, relic, collection, achievement/unlock, secret, merchant, bestiary, map, and save progression;
- Hyper, Hurry, Inverse, Endless, Limit Break, Arcanas, Golden Eggs, local co-op, and other base-game systems, scheduled only after the first loop is complete.

The retained Vampire Survivors mapping is a research lead, not proof. Correct it when verified behavior disagrees. Useful current starting references include the [stage overview](https://vampire-survivors.fandom.com/wiki/Stages), [enemy behavior](https://vampire-survivors.fandom.com/wiki/Enemies), [Luck effects](https://vampire-survivors.fandom.com/wiki/Luck), and [gold acquisition](https://vampire-survivors.fandom.com/wiki/Gold_Coin_%28currency%29).

### Acceptance

- no implementation row says "parity" without a source and behavioral test target;
- all base-game systems are inventoried, including explicitly deferred systems;
- the only approved mechanics deviation is the battery/play-time constraint.

## Step 2 -- separate the game domain from the webview

**Implementation status:** In progress. Hero motion is now simulation-owned through `InputSnapshot`; camera projection is isolated and tested. The domain advances in deterministic 10 ms steps with an accumulated remainder, and a cadence regression proves regular and irregular input delivery produce identical state. Simulation budgets and the webview snapshot caps share the centralized `src/game/policies.ts` contract. The host mirrors each run with validated, monotonic input/action intents, host-generated synthetic telemetry, and direct OTLP adapter events; production webview telemetry intents are rejected. It rejects duplicate/future sequences, bounds adapter values, derives the persisted result, and publishes detached sequenced `RUN_SNAPSHOT` messages carrying the next accepted intent sequence. Rejected malformed/duplicate intents return bounded errors with the expected next sequence, and reset invalidates all in-flight sessions. Production webview rendering now waits for newer host snapshots from the first run intent, shows an explicit host-sync state before the first snapshot, and restores active sessions after `READY`; bounded host checkpoints are persisted separately from wallet progress, restored on the next `READY`, and validated fail-closed for corrupted timing, economy, hero/stat inventory, battery, telemetry, ledger, entity identity, and pending-state values. Legacy entity allocators are repaired above retained IDs before a restored run resumes. Progress is also persisted through independently versioned domain records with an interrupted-write marker and a legacy aggregate fallback. Provider disposal now invalidates its lifecycle generation before teardown, and production `GuildViewProvider` recovery tests now prove long-running checkpoint comparison, paused level-up restoration, and resume without replay drift. The supported VS Code test host cannot inject webview DOM events or force a user-session reconnect; that limitation is recorded in `decisions/extension-host-recovery.md`, while full production-DOM interaction remains RG-06 work.

### Work

- move hero motion into the pure simulation using a normalized `InputSnapshot` supplied to the fixed-step tick;
- introduce explicit simulation time and a render snapshot; do not read DOM keys or wall-clock time in domain code;
- split the monolithic webview into input, run controller, camera/renderer, HUD/menu views, telemetry UI, and IPC store modules;
- replace the 250 ms movement/render coupling with a fixed-step accumulator and `requestAnimationFrame` rendering/interpolation while keeping deterministic tests independent of frame rate;
- replace the generic `MAP_LIMIT` with named policies: viewport dimensions, projectile lifetime/culling radius, pickup condensation placement, and weapon-specific ricochet bounds;
- write an architecture decision record for authoritative run ownership. Default to a host-owned run session and compact snapshots; if IPC volume makes that unsafe, prototype deterministic host replay validation before choosing the fallback;
- keep resource caps configurable in the content/stage contract rather than scattered constants.

### Acceptance

- the same recorded input sequence produces the same run state at 30, 60, and irregular render rates;
- domain tests run with no DOM, timers, VS Code, telemetry server, or canvas;
- input remains responsive across overlay, blur, pause, battery lockout, and resume;
- the host, not the webview, owns every persistent-value mutation.

## Step 3 -- implement the open scrolling Code Dungeon camera

**Implementation status:** First slice implemented: hero-following projection, repeating grid, arbitrary coordinates, camera-relative perimeter spawning outside the logical viewport, stage-owned world persistence culling, persistent-boss relocation, deterministic authored `chase`/`wavy` movement families, resize redraw, and canvas selection/drag suppression. Code Dungeon’s current wave roster, per-minute enemy scaling, spawn radii, persistence radius, and finale clear/timing/invulnerability policy are now validated stage data consumed by the simulation. The stage finale retains an invulnerable threat, adds one at each data-owned interval, and resolves the stage after its data-owned grace window. Accelerated seeded checkpoint coverage now exercises the full authored timeline while asserting replay and centralized resource envelopes. Narrow/wide manual QA and complete authored wave/event parity remain open.

### Decision

Use a hero-following camera and repeating open stage, not viewport-edge walls. The existing border is a viewport, not a world boundary. Stage topology becomes data-driven so a later Library-like corridor or truly bounded stage can introduce collision deliberately.

### Work

- add camera world coordinates, initially centered on the hero;
- project entities with `screen = world - camera + viewportCenter`;
- offset the repeating grid/tile background by camera position so movement is visually legible and no blank territory appears;
- spawn waves and light sources around the current viewport perimeter, not the original world origin; **first slice implemented** with a logical-viewport safety ring and camera-relative coordinates;
- cull or relocate entities using distance from camera/hero and authored persistence rules;
- make projectile cleanup, aura placement, ricochet, pickups, feedback cues, and condensed XP camera-relative where appropriate;
- resize the canvas without changing world speed, collision, aspect behavior, or simulation state;
- prevent pointer selection and suppress the canvas focus outline while retaining movement focus, accessible instructions, and visible focus on actual controls.

### Tests

- projection at positive, negative, and very large world coordinates;
- background continuity across tile boundaries;
- hero remains centered while enemies/projectiles/pickups move relative to the camera;
- resize does not teleport or change movement distance;
- map click shows no outline/selection border and WASD still works;
- no absolute-origin bounds silently delete visible entities.

## Step 4 -- make real agent telemetry a proven additive source

**Implementation status:** First slice implemented: documented JSON and protobuf OTel/OTLP fixture parsers at `/v1/traces` and `/v1/logs`, duplicate/limit/loopback tests, bounded scalar-only protobuf decoding, numeric input/output/cache/reasoning normalization, additive host-generated synthetic income, direct host dispatch for accepted OTLP events, production webview-forgery rejection, per-run source ledger, and bounded source-health UI showing adapter state, accepted events, last event time, endpoint, and safe startup errors. The local Codex installation was inspected without changing user configuration and has no OTLP exporter configured, so live producer compatibility cannot yet be proven. Official Codex configuration documents OTLP/HTTP `binary` or `json` protocols and `codex.sse_event` completion token counts; live exporter compatibility remains open.

The live-producer requirement is now explicitly conditional: the current
environment's missing exporter is recorded as a platform/configuration
limitation, and `.dev/decisions/telemetry.md` retains a user-level, prompt-
redacted loopback smoke snippet. The extension must not edit global Codex
configuration; synthetic income remains the complete token-free fallback.

### Current contract problem

Codex telemetry is opt-in and disabled by default. Current Codex documentation describes OTel log export with events such as `codex.sse_event`, where completion events carry token counts, and the configuration reference allows OTLP/HTTP `binary` or `json`. The adapter now accepts both documented wire encodings, but this does not validate that a live Codex client is configured to target this extension. See [Codex observability and telemetry](https://learn.chatgpt.com/docs/config-file/config-advanced#observability-and-telemetry) and the [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).

### Work

1. Build deterministic JSON fixtures from the documented Codex OTel log envelope with prompt logging disabled. Do not capture real prompt/output text to make fixtures.
2. Add a bounded loopback `/v1/logs` JSON adapter for the verified event envelope. Keep the existing generic trace adapter only if it has an identified producer and separate label/tests.
3. **Implemented wire-format slice:** accept JSON or identity-encoded protobuf on both telemetry paths, decode only bounded scalar fields, and reject gzip/unsupported encodings clearly; retain the live-producer configuration smoke as the remaining work.
4. Keep production event dispatch in host-owned adapters. The webview may toggle synthetic income and render source health, but it must not submit arbitrary token counts through `RUN_TELEMETRY`; the production path rejects that message while the explicit token-free harness retains its local fixture seam.
5. Validate whether the Codex IDE/CLI in the supported environment emits usable completion usage promptly enough for battery charging. Record batching/flush behavior and latency.
6. If the supported Codex surface does not emit a documented local stream, stop and record the limitation. Do not scrape UI text, conversation files, SQLite stores, logs, credentials, or private APIs.
7. Normalize exact input, cached-input, output, and reasoning-output counts according to the documented event; keep estimated sources visibly distinct.
8. Maintain a per-source run ledger (`synthetic`, `codex-otel`, future adapters) instead of overwriting one source string. Sum charged tokens once and deduplicate at the producer/event identity boundary.
9. Add a bottom-of-view "Synthetic income" toggle. It sends a narrow host intent that updates the extension configuration and returns canonical telemetry status. It must work during a run without restarting real capture.
10. Synthetic and real events are additive. Turning synthetic off stops only synthetic generation; turning it on adds 100 test tokens/second on top of live telemetry.
11. Display source health, last accepted event time, exact/estimated state, endpoint/setup guidance, and safe error state without exposing content.
12. Document the optional user-level Codex configuration snippet. Never silently edit global Codex configuration.

### Acceptance

- fixture, live loopback smoke, malformed input, oversized input, duplicate, clock skew, port conflict, disable/teardown, and two-source aggregation tests pass;
- synthetic toggling cannot disable or duplicate live income;
- a forged production webview event cannot mint battery/token value or change the persisted run reward;
- no prompts, responses, tool arguments/results, raw bodies, authorization headers, or secrets are retained;
- token provenance in HUD/summary/export reconciles exactly to the source ledger.

## Step 5 -- restore base-game gold acquisition

**Implementation status:** First economy slice implemented: XP gems and battery overflow no longer create gold; light sources spawn as bounded entities on one-second attempts, use the selected stage’s validated weighted/minimum-level table with Luck applied only to rare entries, accept projectile/aura damage, and produce a deterministic drop that is ledgered on collection. Elite gold drops are collection-owned and recorded in a dedicated `eliteDrops` bucket. Chests retain identity-specific 60-500 base gold and now resolve stage-owned, highest-tier-first five/three-item checks multiplied by total Luck, falling back to the authored base tier; the resolved 1/3/5 tier is retained by chest identity. Finale victory records the 500-gold stage reward plus revival bonuses without Greed scaling, fully maxed inventories receive a Greed-scaled Coin Bag level-up fallback, and collected chest rewards receive a transient in-map presentation banner. A domain-level ledger total and finish-time invariant now prevent source totals from drifting from run gold. Additional stages and exact per-chest source chances remain open.

### Work

- remove gold awards from ordinary XP-gem collection;
- remove gold creation from battery overflow; at full charge, surplus tokens are capped/ignored for gameplay economy while still countable in telemetry totals if desired;
- add destructible light sources that spawn just outside the viewport according to the verified stage/Luck rule; **first slice implemented** with a 10-source cap, 10 HP sources, world-relative spawn radius, projectile/aura damage, and collection-owned deterministic drops;
- implement verified gold coin, coin bag, rich coin bag, floor chicken, vacuum, freeze, and screen-clear drop tables and collection effects; **first collection-ownership slice implemented** with a bounded host-persisted pickup identity ledger that rejects duplicate rewards across ticks and legacy checkpoint migration;
- make treasure chests grant their verified random gold range and eligible item rewards, with 1/3/5 reward tiers governed by stage-owned, per-chest Luck checks; **first contract implemented** with independent five/three-item checks, total-Luck multiplication, base-tier fallback, retained identity-specific results, and a bounded 1.5-second simulation-owned presentation pause that survives host checkpoints. Verify exact source chances and add additional-stage tables before closing;
- implement maxed-inventory level-up choices for coin bag/floor chicken where applicable; **MVP slice implemented** with Coin Bag and healing fallback cards plus a separate `levelUp` gold ledger bucket;
- grant the verified stage-completion and revival gold at the correct end-state; **MVP slice implemented** with 500 base stage gold, unused-revival accounting, and exact escalating finale-revival bonus disclosure; the broader death/revival presentation matrix remains open;
- apply Greed only to the correct gold values and stage/mode multipliers;
- update Guild prices/unlocks only after the new earning cadence is measured in deterministic full-run tests;
- migrate schemas without deleting or estimating existing wallet value. Label it grandfathered only in migration notes, not the UI.

### Acceptance

- killing or collecting an ordinary XP gem never grants gold;
- token/battery activity never grants gold;
- every gold source is collectible or end-state-owned, pays once, and appears in a reconciled ledger;
- zero-Luck, high-Luck, Greed, duplicate chest, missed pickup, completion, death, and migration tests pass.

## Step 6 -- complete the first-stage gameplay loop at base-game pace

**Implementation status:** The first combat-contract slice now enforces Armor's minimum-one ordinary hit, preserves the existing contact-protection window, and adds a deterministic 120 ms reverse-movement knockback reaction with elite/boss resistance. Lethal contact now pauses in an explicit revival phase when a charge remains; Revive consumes one charge for 50% HP plus 2 seconds of invulnerability, while End run resolves defeat before the finale or victory with stage reward accounting during the finale. Weapon aim is now data-owned for the first directional weapons: Broadsword and the Knife family (including Throwing Daggers and Thousand Blades) launch along the hero's last normalized movement direction, while targeted weapons track the nearest eligible enemy. The first five evolution results now declare explicit authored attack patterns and damage/cooldown values, with registry and simulation coverage. The Runetracer-like Bouncing Arrow now launches randomly, has infinite pierce, reflects from the camera-relative screen envelope, applies a bounded 0.5-second hitbox delay, and its No Future evolution applies area-scaled explosions on edge bounce and hero contact; bounded host-owned visual effects render those explosions from snapshots and expire in simulation time. Bone retains its duration-bound random launch/reflection slice. The character panel now presents all 15 exposed combat stats with custom accessible explanations, and Pandora's Box now has registry-owned rank-specific Omni/Curse behavior. The map countdown and summary/export finale fields now make the post-timer sequence explicit. Exact player contact cadence, the complete weapon-specific attack/knockback roster, and long-run/reconnect presentation QA remain open.

**Addendum (2026-08-02):** The Whip-derived Broadsword/Excalibur pair now carries explicit registry-owned `ignoreSpeed` and `ignoreDuration` flags. Magic Wand/Arcane Bolt and Knife/Throwing Daggers-derived attacks carry `ignoreDuration`. Garlic-like Aegis Barrier and Sanctuary auras now retain bounded per-target hit cooldowns equal to their effective weapon cooldown across radius exits. Simulation tests prove the relevant projectile speed/lifetime and aura re-hit values remain stable under the authored stat rules; malformed flags/ledgers fail registry or host/snapshot validation. Remaining weapon-specific rules stay in the retained 3A queue.

**Addendum (2026-08-02):** The Knife/Throwing Daggers base family now also
declares its source-backed 0.1-second projectile interval, with authored
0.08/0.06/0.04-second reductions at the relevant rank breaks. Authored Amount
shots are queued and released in a bounded facing-preserving stream rather than
appearing simultaneously; registry and simulation tests cover the timing,
rank cadence, and queue boundary. Thousand Blades retains its separate
0.05-second interval.
This is one first-stage cadence closure, not full weapon-roster parity.

**Addendum (2026-08-02):** Amount now uses the additive projectile-count contract: authored weapon counts remain intact and each Amount point above the baseline adds one projectile. Detached host checkpoints and webview snapshots also prove canonical class base-stat provenance and reject extreme finite combat values before restore/render. Focused math, fire, checkpoint, and snapshot tests cover the boundary; full source-backed stat caps and balance remain open.

**Addendum (2026-08-02):** The first source-backed RG-03 stat boundary slice is
now shared across simulation and detached state: Amount uses its 10-point bonus
cap (baseline-inclusive internal maximum 11), total Cooldown floors at 10%, and
Might/Area/Projectile Speed/Duration clamp at their documented +900%/+900%/
+400%/+400% bonus ceilings. Boundary derivation and host/webview rejection tests
pass; Luck, Growth, Greed, Curse, Armor, Revival, movement, and balance remain
open.

**Addendum (2026-08-02):** The RG-03 movement/stat slice corrects two registry
values against the cited PowerUp rules: Guild Agility is +5% per rank (+10%
maximum) and Guild Duration is +15% per rank (+30% maximum). Token Magnetism
now follows the source-specific Attractorb multipliers by level, and the Magnet
PowerUp compounds its 1.25× rank multiplier. The late Infinite Loop Fiend speed
is bounded so the fully agile hero retains escape headroom after stage scaling.
Focused rank, movement, and magnet regressions pass; the wider stat audit
remains active.

## Implementation addendum - 2026-08-02 (host-owned pause/resume)

The implementation review found that pause was still only a webview-local
visibility flag. That left the authoritative run advancing after a production
webview reload and made a paused state impossible to recover from a checkpoint.
The run domain now owns a validated `paused` flag. Production `pause` and
`resume` travel through sequenced `RUN_ACTION` intents; `tick` exits before
advancing time, movement, battery drain, or combat while paused, and the host
does not generate synthetic income for a paused session. Detached snapshots
and checkpoints carry the flag, while legacy checkpoints migrate to
`paused: false`. The token-free harness retains its local seam for QA, but the
production renderer remains snapshot-driven and restores the canonical paused
state before accepting resume.

Focused simulation, host, validation, snapshot, and webview interaction tests
pass. The release gate now reports **237 passing tests** across 26 files, with
typecheck, lint, build, Extension Development Host activation smoke, package,
production dependency audit, and `git diff --check` green. Manual visual and
true-host reconnect evidence remains RG-06/platform-limited; P7 remains active.

**Addendum (2026-08-02):** The RG-04 chest-pool regression raises the current
gate to **238 passing tests**. Eligible owned weapon/passive rewards are now
selected by seeded uniform RNG instead of lexical-first order. Exact source
rarity weighting and chest probabilities remain open, so P7 remains active.

**Addendum (2026-08-02):** First-roster weapon parity now prioritizes the Whip-family slash contract. The cited reference describes a frontal hero-originating horizontal attack that ignores Speed and Duration; Broadsword and Excalibur now use a bounded hero-anchored forward slash with explicit directional/duration regressions and a tested hero-centered crimson arc renderer. Sprite fidelity and the source-backed behavior of the rest of the roster remain open; the former moving-fan placeholder is retired.

**Addendum (2026-08-02):** The XP gem tiers, 400-gem condensation, and
source-backed [Level up curve](https://vampire-survivors.fandom.com/wiki/Level_up)
are implemented in `progression.json` and shared math. The documented +100%
Growth threshold behavior at levels 20/40, with reversion at 21/41, is derived
from the same level state and covered by boundary tests. First-stage parity still
requires the remaining weapon, cadence, and presentation evidence.

**Addendum (2026-08-02):** The source-backed [Luck](https://vampire-survivors.fandom.com/wiki/Luck)
owned-item level-up chance is now resolved by `getOwnedItemChoiceChance` and
applied through two deterministic checks before the remaining unique cards are
filled from the shared pool. Odd levels use the 30% parity term and even levels
use 60% at base Luck, with total Luck increasing the chance and a safe 100% cap.
The previous hard-coded owned-card weight is retired; remaining weighted-pool
and chest-choice parity remains `Partial`.

**Addendum (2026-08-02):** RG-03 proof coverage now includes a table-driven
projection audit for every spendable meta upgrade at rank one and maximum rank,
including multiplicative max-health/movement/magnet effects. An accepted OTLP
event is also shown not to mutate the combat-stat vector. This closes the
coverage slice while provisional stat balance and source-specific formulas
remain `Partial`.

**Addendum (2026-08-02):** The post-baseline audit is retained in
[P7_REMAINING_GAPS_IMPLEMENTATION_PLAN.md](P7_REMAINING_GAPS_IMPLEMENTATION_PLAN.md).
It separates the unresolved host replay, first-stage weapon/stat/economy,
telemetry-producer, manual-QA, asset-review, and deferred-content gaps from
the implemented slices, assigns each an owner and exit evidence, and preserves
the dependency order for unattended execution.

**Addendum (2026-08-02):** The production `GuildViewProvider` recovery boundary
now has a long-running disposal/recreation regression. It drives 120 fixed-step
intents through the provider message path, resolves level-up pauses through host
actions, compares the detached checkpoint with the restored snapshot, resumes the
next intent, and rejects the duplicate retry. This closes provider-driver replay
drift; the supported test-host limitation is recorded in
`decisions/extension-host-recovery.md`, while production-DOM replay remains
RG-06 work.

**Addendum (2026-08-02):** The source-backed [Magic Wand](https://vampire-survivors.fandom.com/wiki/Magic_Wand)
and [Holy Wand](https://vampire-survivors.fandom.com/wiki/Holy_Wand) sequence
contract is now data-owned: Arcane Bolt and Archmage Staff declare a 0.1-second
projectile interval, and Archmage Staff's authored level row declares four
projectiles; Amount fires the first targeted missile immediately and queues
additional missiles, reacquiring the nearest eligible target at each release.
Queue state is bounded and validated at host-checkpoint and webview snapshot
boundaries, with target-reacquisition and malformed-state regressions.
Remaining fan/weapon cadence and full roster parity remain Partial.

**Addendum (2026-08-02):** The cited [Knife](https://vampire-survivors.fandom.com/wiki/Knife)
and [Thousand Edge](https://vampire-survivors.fandom.com/wiki/Thousand_Edge)
contract now replaces the generic fan spread for the Knife family. Throwing
Daggers launch only along the hero's last facing, while Thousand Blades declares
six projectiles and a bounded 0.05-second sequence interval; each queued release
resolves the current facing. Registry, simulation, and deterministic release-aim
tests cover the change. The authored Token Guild damage scale remains an
explicit approximation until the complete first-stage roster is reconciled.

**Addendum (2026-08-02):** The cited [NO FUTURE](https://vampire-survivors.fandom.com/wiki/NO_FUTURE)
contract is now explicit in the weapon registry: retaliatory explosions gain
10% damage per Armor point up to a +500% cap, while ordinary edge-bounce
explosions retain their base damage. Legacy explosion records default the new
multiplier to zero, and registry, shared-math, simulation, and replay-safe
behavior tests cover the boundary.

**Addendum (2026-08-02):** Excalibur, No Future, and Sanctuary now declare
explicit evolved level rows rather than inheriting generic legacy stats. Their
authored area/speed/duration/pierce/knockback values are resolved through the
same registry path as base weapons and verified by registry, level-stat, and
attack tests.

**Addendum (2026-08-02):** The cited [Curse](https://vampire-survivors.fandom.com/wiki/Curse)
contract is now isolated at the enemy-spawn boundary: Curse scales newly
spawned enemy health and speed plus wave quantity/cadence, while the authored
stage minute curve remains the only enemy-damage progression. A production
simulation regression proves equal contact damage for matched cursed and
uncursed spawns, so a passive cannot silently amplify damage outside its
documented effect.

Implement and verify the first stage before adding a second:

- authentic spawn/despawn/relocation cadence and density, including Curse quantity, cadence, and speed effects; the current slice covers camera-relative perimeter placement, persistent-boss relocation, and authored approach families, not the complete enemy roster;
- correct contact damage, invulnerability frames, armor (minimum-one ordinary hit), knockback, boss resistance, enemy movement families, and screen-edge spawning;
- stage timer, pause semantics, level-up pause, chest pause/presentation (**first 1.5-second simulation-owned slice implemented**), and 30-minute completion sequence;
- completion at the time limit followed by the correct Reaper/end-run behavior and reward, rather than requiring the Reaper to be killed for ordinary completion;
- weapon-specific attacks instead of relying only on generic targeted/fan/ricochet/aura/bone approximations; **first directional aim slice implemented** for Broadsword/Throwing Daggers and their evolutions, with the Knife family now using facing-only launch and a bounded Thousand Blades sequence, the Runetracer-like Bouncing Arrow now having random launch, infinite pierce, camera-edge reflection, a bounded 0.5-second hitbox-delay ledger, and No Future edge-bounce/retaliation explosions, and Bone having a duration-bound random launch/reflection slice; the remaining weapon roster is still open;
- complete first-roster character traits, passive stats, weighted choices, inventory limits, evolution timing, and results accounting;
- bounded but parity-appropriate enemy/projectile/pickup counts; the current 192-entry enemy envelope covers the maximum authored Code Dungeon overlap at +200% Curse without truncation, and no arbitrary cap may materially change the authored wave.
- explicit death/revival presentation and deterministic pre-finale/finale outcomes; revival choices must remain host-owned and idempotent across reconnects.

Use deterministic accelerated tests for the complete 30-minute timeline, plus real-time manual checkpoints at 0, 1, 5, 10, 15, 20, 25, and 30 minutes.

### Acceptance

- a token-free fixture can replay a complete seed to death/completion deterministically;
- live play has no unavoidable speed trap, blank map, lost input, premature reward, impossible chest, or false victory;
- every visible stat and upgrade has a verified effect and description;
- source ledger, XP, gold, inventory, kills, damage, and final rewards reconcile.

## Step 7 -- rebuild Guild, character, and stage progression around parity

**Implementation status:** The first character/stage presentation slice is implemented: hero options explain starting weapon and trait cadence/cap without highest-level labels; hero unlock conditions are authored and validated in the class registry and applied by StateManager; Code Dungeon is represented by validated duration/topology/modifier metadata; the Guild Hall presents unlocked/locked stage options; the selected stage ID is validated at the host `START_RUN` boundary and retained through snapshots/checkpoints; StateManager now separates progression domains behind a versioned layout marker while retaining a legacy aggregate fallback; and class/passive stat capabilities are rejected at registry load when they are not implemented. Portrait fidelity, additional stage data, complete unlock/purchase rules, future schema migrations, and migration coverage beyond the first slice remain open.

### Work

- remove highest-level text from hero options and tooltips; retain legacy persisted records only until a safe schema cleanup no longer needs them;
- show character portrait placeholder, starting weapon, exact trait, base-stat differences, unlock condition, and purchase price when applicable;
- add a real stage-selection step with stage duration/modifiers/unlock information before starting a run;
- replace bespoke unlock rules with verified base-game-equivalent achievement/challenge rules, reskinned for Token Guild;
- complete PowerUps, escalating/refund cost rules, collection discovery, relic unlocks, and results unlock announcements;
- separate wallet, collection, unlock, settings, battery, and run-history persistence domains with migrations;
- ensure reset, corruption recovery, extension reload, interrupted run, and duplicate intent behavior remain safe.

### Acceptance

- no selection UI advertises an irrelevant best run level;
- locked content explains the real unlock path and cannot be selected early;
- purchases/unlocks are host-owned and idempotent;
- legacy saves migrate without loss of valid wallet/unlocks/settings.

## Step 8 -- expand remaining non-DLC base-game mechanics in dependency order

Do not parallelize content ahead of foundations. Add one vertical content family at a time with registry validation, behavior tests, UI, unlock, and result accounting:

1. remaining base weapons, passives, evolutions, unions, and gifts;
2. remaining base characters and their unique traits;
3. additional normal, bonus, challenge, special, and hidden stages with declared topology;
4. relic/map/collection/bestiary/achievement and merchant systems;
5. Arcanas and base advanced progression;
6. Hyper, Hurry, Inverse, Endless, and Limit Break;
7. Golden Eggs and late economy;
8. base-game secrets and secret characters;
9. local co-op feasibility in a VS Code webview, implemented only through supported input APIs and with an explicit UX decision.

Each item needs its own retained child plan. DLC, licensed crossover content, online multiplayer, and marketplace/payment work remain excluded.

## Step 9 -- make the product read and feel like a complete game

After the first loop is mechanically accepted:

- establish a consistent pixel/fantasy visual language, spacing scale, panel hierarchy, icon sizes, typography, and color tokens;
- add title/landing, Guild, character select, stage select, PowerUp, collection, settings, pause/map, run HUD, level-up, chest, results, and unlock presentation states;
- keep the map dominant and move diagnostics behind concise icons/tooltips or an optional debug view;
- add original/provenance-approved animation, hit flash, damage numbers where useful, pickup trails, chest sequence, death/completion sequence, and layered audio;
- preserve narrow/wide sidebar behavior, zoom, high contrast, reduced motion, keyboard-only operation, and screen-reader labels;
- remove development/demo language from production paths while keeping a clearly labeled test telemetry control.

No presentation task may change combat timing or reward ownership without a corresponding domain test.

## Step 10 -- index and review the external asset libraries

This step is deliberately after gameplay-loop acceptance and before any asset adoption decision.

### Source roots observed on 2026-08-02

| Alias | Root | Observed inventory |
| --- | --- | --- |
| `fantasy-rpg-gui` | `E:\GameDev\TestAssets\TestAssets\Assets\Artsystack - Fantasy RPG GUI` | 9,266 files: 4,436 PNG, 4,658 Unity `.meta`, 120 prefabs, 41 PSDs, fonts/scripts/docs. 4,397 PNGs are under `Resources\Sprites`; 39 are preview screens. |
| `pixel-rpg-monsters` | `E:\GameDev\TestAssets\TestAssets\Assets\Layer Lab\2D Pixel-RPGMonstersIcon` | 811 files: 385 PNG, 425 Unity `.meta`, one scene. The set contains 8 themes x 12 monsters in default/min size and shadow/no-shadow variants, plus a background. |

### Deliverables

- `.dev/assets/ASSET_REVIEW.md`: human-readable pack summary, license/provenance findings, visual-language assessment, and recommendation;
- `.dev/assets/asset-index.json`: one record per PNG with pack alias, relative path, file name, dimensions, alpha, sprite-sheet/slice metadata, theme/category, size/shadow variant, semantic description of what the image depicts, possible Token Guild role, duplicate/variant group, review status, and license reference;
- `.dev/assets/ASSET_INDEX.md`: browsable grouped index generated from the JSON;
- an ignored local contact-sheet workspace used for visual inspection, never committed unless the user separately approves redistributing those images.

### Method

1. Read the pack documentation, license files, invoice/Asset Store provenance available to the user, and Unity `.meta` slicing data. Do not infer redistribution rights from file presence.
2. Inventory PNGs only; ignore `.meta` as visuals but attach their import/sprite metadata.
3. Hash exact duplicates and group size/shadow variants without dropping any file row.
4. Generate bounded contact sheets by pack/category. Inspect every unique visual group; descriptions must be semantic ("silver crossed swords in circular frame"), not filename restatements ("sword_03").
5. Reconcile final row counts to the filesystem and mark every row `reviewed`, `variant-reviewed`, or `unusable` with a reason.
6. Map candidates to actual game roles only after mechanics/UI slots exist. Flag style, legibility, animation, palette, licensing, and resolution conflicts.
7. Do not copy images into `resources/`, modify the renderer, or commit third-party raster/PSD/font files during indexing.

### Acceptance

- every observed PNG has exactly one indexed row and every unique visual group has a human-meaningful description;
- pack counts, duplicate groups, and contact sheets reconcile automatically;
- license/provenance uncertainty is explicit;
- the user receives a shortlist and rejection list, but no adoption occurs automatically.

## Step 11 -- asset adoption decision and original-art fallback

Pause for user review of the asset index. If the user approves specific assets and their license permits extension redistribution:

- import only a minimal named shortlist;
- preserve original files and attribution/license material as required;
- build an asset manifest mapping stable game IDs to files and fallbacks;
- test packaged VSIX inclusion, scaling, alpha, theme contrast, and missing-asset behavior.

If approval or license proof is absent, continue with original code-drawn/vector/pixel assets. Do not block gameplay completion on the packs.

## Step 12 -- release-candidate QA and documentation

### Automated gate

```text
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run package
git diff --check
```

Add a true VS Code webview interaction route when technically possible; keep jsdom for fast deterministic coverage. Tests require no live tokens, public network, secrets, or LLM.

### Recorded manual matrix

- narrow, medium, and wide sidebar; supported zoom levels and theme/high-contrast variants;
- keyboard movement, diagonal normalization, blur/refocus, canvas click without border, pause, battery lockout/recharge, and resize during play;
- camera travel far in all directions with no blank territory or origin-relative deletion;
- synthetic off, synthetic on, live only, additive live+synthetic, malformed telemetry, endpoint conflict, and agent idle/complete;
- every first-loop character/weapon/passive/evolution/pickup/chest/action/stat;
- purchases/refund, character/stage unlock, save/reload/migration/reset, duplicate completion, death, timer completion, and export;
- no ordinary gem or battery event grants gold.

Update the current manual, parity matrix, project-management status, and a dated handoff with exact test results, limitations, remaining mechanics, asset-catalog status, and next child plan.

## Implementation addendum — 2026-08-02 (level-up resume protection)

The level-up source describes a brief invulnerability moment after the final
choice closes and play resumes ([Level up reference](https://vampire-survivors.fandom.com/wiki/Level_up), checked 2026-08-02). The first-stage implementation now applies the existing, validated stage `combat.contactInvulnerabilitySeconds` value (0.5 seconds in Code Dungeon) when `chooseUpgrade` or `skipLevelUp` returns to the dungeon. This keeps the timing data-owned and bounded instead of adding an unexplained global constant. A simulation regression proves contact damage is suppressed immediately after resume and returns after the window expires. Exact base-game duration tuning remains a parity-review item; no new gameplay divergence is approved by this approximation.

## Implementation addendum — 2026-08-02 (Skip experience)

The active parity audit corrected an earlier MVP assumption: the base-game
Skip action grants experience rather than simply discarding the level-up
([Skip reference](https://vampire-survivors.fandom.com/wiki/Skip), checked
2026-08-02; [Level up reference](https://vampire-survivors.fandom.com/wiki/Level_up)).
Token Guild now awards a direct 20% of the XP required for the next level when
Skip is accepted. The award enters the same deterministic progression loop,
so a queued level-up cannot be lost or duplicated, but it does not apply
telemetry or grant tokens. The production button copy and manual describe the
rule; exact source-version balance remains a parity item.

The same level-up source contract disables Reroll and Skip once no eligible
weapon/passive upgrade remains and the fallback heal/coin choices are active.
Token Guild now derives that predicate from the content registry in simulation,
host action validation, and rendering, so charges cannot be consumed by an
inapplicable action. This follows the [Level up reference](https://vampire-survivors.fandom.com/wiki/Level_up), checked 2026-08-02.

The next level-up parity slice addresses Banish item identity. The source
keeps a banished item out of later level-up choices and treasure-chest upgrades
for the rest of the run ([Banish reference](https://vampire-survivors.fandom.com/wiki/Banish), checked 2026-08-02). The implementation plan records a canonical item-ban key with legacy card-ID migration, fallback-card rejection, and shared checks for card generation, Reroll/Skip availability, chest upgrades, and evolution.

## Implementation addendum - 2026-08-02 (RG-04 chest rarity weights)

The retained [Weapons reference](https://vampire-survivors.fandom.com/wiki/Weapons)
and [Level up reference](https://vampire-survivors.fandom.com/wiki/Level_up)
identify item rarity as the weight for eligible weapon/passive pools, including
treasure chests. The Code Dungeon registry now carries those source-backed
weights for the current first-roster reskins: Whip/Magic Wand/Knife 100,
Runetracer 80, Garlic 70, Bone 1; passive mappings are also data-owned (for
example Hollow Heart/Pummarola 90, Empty Tome/Duplicator 50,
Crown/Stone Mask 80, and Skull/Tiragisu/Torrona 40). Evolved outputs retain
rarity 1 and are not ordinary upgrade candidates.

Chest reward resolution now performs one seeded weighted draw across eligible
owned weapons and passives after max-rank and Banish filtering. The same
host-owned RNG and identity ledger are used for every tier reward, so replay,
duplicate protection, and checkpoint semantics remain deterministic. Registry,
cross-type, and weighted-distribution regressions pass. Exact per-chest Code
Dungeon probabilities, additional-stage tables, and manual chest-result QA
remain open; this does not close RG-04 or P7.

The release gate after this slice is **239 passing unit tests** across 26 files
and **109 synthetic tests** across 4 files. Typecheck, lint, build, e2e
activation smoke, package, production audit, and `git diff --check` are green;
manual visual/reconnect evidence and exact stage-specific chest chances remain
open.

## Definition of P7 success

P7 is complete only when:

- P6 blockers are actually closed;
- Code Dungeon has a scrolling camera and coherent open world;
- the first 30-minute loop follows verified base-game mechanics except battery gating;
- gold follows the base-game acquisition model;
- real Codex telemetry has either a proven supported path or an honestly documented external limitation, with additive synthetic toggle working independently;
- production telemetry ingress is host-owned and bounded; a webview cannot forge token/battery value or alter a persisted run reward;
- character selection no longer shows highest level;
- persistent rewards are host-owned;
- the full automated and manual matrix passes;
- both asset packs are fully indexed and semantically reviewed, with no unapproved assets integrated;
- all remaining base-game mechanics listed in Step 8 are implemented through retained, dependency-ordered child plans, or carry an explicit evidence-backed platform limitation/user decision; DLC remains out of scope.

## Implementation addendum — 2026-08-02 (counter-row and battery presentation audit)

The source/layout audit found that the battery was still rendered in a separate
absolute strip even though the product contract requires the clock, dungeon
name, token count, and battery to share one stable row. The production webview
now renders those four controls in one responsive grid row. The battery is
icon-only, remains keyboard-focusable, removes the native `title` tooltip, and
uses the existing immediate custom tooltip with stored/max token values. The
lockout message remains a separate status line so it cannot shift the counters.

The token-free DOM regression asserts the row membership, icon-only markup,
custom tooltip path, and absence of the retired battery copy. Focused UI tests,
the 228-test suite, typecheck, lint, build, Extension Development Host
activation smoke, production dependency audit, and `git diff --check` are the
required evidence for this slice. A narrow/wide visual pass is still RG-06
manual evidence; this addendum does not claim that unsupported browser/DOM
automation exists.

The current manual was also rebuilt from the verified production surface during
this audit. The previous broad `t`/`r` character corruption and stale command
names were removed; the clean manual now records the host boundary, current
HUD, combat/pickup/economy rules, telemetry modes, QA commands, and explicit
limitations without promoting roadmap intent to shipped behavior.

The first-stage drop audit also added a registry regression for the cited
light-source Luck rule: Gold Coin and Coin Bag weights remain unscaled, while
current rare/tactical entries are explicitly Luck-scaled. This protects the
authored economy boundary without changing the current Code Dungeon table.

The fresh full-suite run after that regression is **229 passing tests**. Any
earlier 228-test references in historical addenda are superseded by this gate.

## Implementation addendum — 2026-08-02 (light-source cap Luck boundary)

The first-stage light-source contract now has a direct simulation regression for
the documented at-cap rule: when the maximum number of sources is already on
the map, a high-Luck run and a zero-Luck run use the same attempt probability,
replacement identity, and perimeter position. Luck still affects attempts and
rare-drop weights while capacity remains available. This keeps the source cap
from becoming an accidental Luck exploit and preserves deterministic replay.
The focused simulation suite passes; the fresh full-suite count is recorded
after the release gate below. The release gate now reports **230 passing
tests** across 26 files; typecheck, lint, build, Extension Development Host
activation smoke, package, production dependency audit, and `git diff --check`
also pass. The supported host limitation and RG-06 manual evidence remain
open.

## Implementation addendum - 2026-08-02 (max-health and base-magnet stat parity)

The RG-03 audit found two source-backed stacking mismatches. Base Magnet now
uses the documented 30-unit value. Guild Vitality applies a compounded 1.1x
Max Health multiplier per rank, and Heart of Vitality applies a compounded 1.2x
multiplier per level, after class base health. Rank-one/max-rank and combined
simulation regressions cover the derived values and keep telemetry stat-neutral.
This closes the identified stacking boundary; broader stat formulas, first-stage
balance, and manual visual evidence remain open under RG-03/RG-06.
The post-correction release gate is 238 passing tests across 26 files, with
synthetic tests, typecheck, lint, build, e2e activation smoke, package, audit,
and `git diff --check` green.

## Implementation addendum - 2026-08-02 (PowerUp purchase-cost parity)

The retained PowerUp foundation no longer uses the legacy per-upgrade
exponential cost multiplier. Purchases now apply the source global
initial-price/rank-step plus post-first-purchase fee formula, with one
total-rank context shared by StateManager and the shop. Refunds reconstruct
exact spend from persisted ranks, and the battery purchase remains a separate
non-refundable track. Source cost behavior is covered for first/second and
cross-upgrade purchases, max-rank/insufficient-gold boundaries, refund, and
migration isolation; visual/manual shop evidence remains RG-06.

## Implementation addendum - 2026-08-03 (RG-02 Fire Wand family)

The next RG-02 content slice is now complete. The retained [Fire Wand
reference](https://vampire-survivors.fandom.com/wiki/Fire_Wand) describes an
8-level, rarity-80 weapon that fires three random fireballs, ignores Duration,
and evolves with Spinach; the [overview stats](https://vampire-survivors.fandom.com/wiki/Weapons/Overview_Stats)
records the 20 -> 90 damage, 0.75 -> 1.35 speed, 3-second cooldown, and
0.02-second interval. Token Guild now owns those rows in `fire_wand`, using the
existing bounded random fan strategy. `hellfire` is a rarity-1 level-1 output
with 100 damage, two random projectiles, a 0.2-second sequence interval,
Duration ignored, and pierce 99. Evolution remains host/simulation-owned and
requires the maxed base plus Power Gauntlets.

This is a deliberate first-stage approximation: Fire Wand's wall blocking and
Hellfire's exact meteor/wall presentation are not yet represented, while the
cadence, pass-through, level rows, rarity, card copy, chest gate, and replay
state are covered. Do not expand to another weapon family until the focused and
full gates below are green and this addendum is retained in the handoff docs.

The fresh gate after this slice is **240 unit tests** across 26 files and **110
synthetic tests** across 4 files. Typecheck, lint, build, e2e activation smoke
(2 passing), VSIX package, production dependency audit (0 high vulnerabilities),
and `git diff --check` are green. Fire Wand wall blocking, Hellfire wall
presentation, the wider weapon roster, and manual visual evidence remain open.

The chest-quality research reached a documented limitation rather than a new
balance decision: the [Luck reference](https://vampire-survivors.fandom.com/wiki/Luck)
describes chest-specific tier chances but does not publish Code Dungeon values.
See [the retained decision](../decisions/chest-tier-probabilities.md). Keep the
bounded stage table and continue only when an authoritative or directly
observed value is available.

## Implementation addendum — 2026-08-03 (RG-02 Axe family)

The next RG-02 vertical family is now complete. The retained [Axe
reference](https://vampire-survivors.fandom.com/wiki/Axe) defines eight ranks,
rarity 100, Duration ignored, 0.2-second additional-Amount cadence, and the
Orb of Expansion evolution. Token Guild owns the data as `battle_axe`, with
source-backed damage/Amount/Pierce rows, and `scythe_of_doom` models the
rarity-1 Death Spiral output (damage 60, Area 1.2, Speed 0.8, Amount 9,
0.05-second interval, Pierce 1000).

The shared queued fan strategy stores launch angle and authored Amount in the
weapon state. Host checkpoint and webview snapshot validation require that
state for a pending fan queue and reject it on non-fan weapons, so pause,
reload, and replay cannot reroll an in-flight arc. No weapon-ID simulation
branch was added. Vertical arc/gravity, the source Area multiplier, and the
evolved weapon's indefinite lifetime remain explicit bounded presentation/
physics gaps (the domain uses a 30-second lifetime cap).

The fresh gate is **242 unit tests** across 26 files and **111 synthetic tests**
across four files. Typecheck, lint, build, e2e activation smoke (2 passing),
VSIX package, production dependency audit (0 high vulnerabilities), and
`git diff --check` are green. The next code slice remains one source-verified
weapon family at a time; the first-stage acceptance gate and RG-06 manual
evidence still precede deferred content and asset adoption.

## Implementation addendum — 2026-08-03 (RG-02 Cross family)

The next RG-02 family is now complete. The retained [Cross
reference](https://vampire-survivors.fandom.com/wiki/Cross), [Heaven Sword
reference](https://vampire-survivors.fandom.com/wiki/Heaven_Sword), and
[overview](https://vampire-survivors.fandom.com/wiki/Weapons/Overview_Stats)
anchor Cross at rarity 80, damage 5, Area 1, Speed 1, Amount 1, Cooldown 2,
and 0.1-second interval; Heaven Sword is rarity 1 with damage 77, Area 1.2,
Speed 2, Amount 1, Cooldown 3.3, and 0.5-second interval. Token Guild owns
these as `celestial_cross` → `heaven_blade`, evolved with the new validated
`clover` passive.

The generic `boomerang` strategy persists each projectile's launch origin and
return phase, turns after a hit or bounded travel, and removes the projectile
after it reaches the hero. Host checkpoint and webview snapshot validation
reject incomplete or mismatched boomerang fields. Intermediate Cross rows,
finite Pierce/lifetime, critical hits, Pool Limit, and wall/spin presentation
remain explicit first-pass gaps; no Cross-specific simulation branch was added.

The fresh gate is **243 unit tests** across 26 files and **112 synthetic tests**
across four files. Typecheck, lint, build, e2e activation smoke (2 passing),
VSIX package, production audit, and `git diff --check` are green.

## Implementation addendum — 2026-08-03 (RG-02 King Bible family)

The next RG-02 vertical family is now complete. The retained [King Bible
reference](https://vampire-survivors.fandom.com/wiki/King_Bible), [Unholy Vespers
reference](https://vampire-survivors.fandom.com/wiki/Unholy_Vespers), and
[overview](https://vampire-survivors.fandom.com/wiki/Weapons/Overview_Stats)
anchor the base rarity, eight rank progression, Spellbinder evolution, and
Unholy Vespers damage/Area/Speed/Amount/Duration/Cooldown/knockback values.
Token Guild owns this as `orbiting_grimoire` → `unabridged_codex`.

The generic `orbit` strategy persists each projectile's angle, radius, and
angular speed, follows the hero in world coordinates, and validates those
fields at host checkpoint and webview snapshot boundaries. Radius is bounded
to 180 world units and the registry applies a 30-Pierce safety envelope. Shared
hitbox-delay reset, page-fall presentation, and exact Pool Limit behavior are
explicit remaining parity gaps; no weapon-ID simulation branch was added.

The fresh gate remains **243 unit tests** across 26 files and **112 synthetic
tests** across four files. Typecheck, lint, build, e2e activation smoke,
package, production audit, and `git diff --check` are green.
