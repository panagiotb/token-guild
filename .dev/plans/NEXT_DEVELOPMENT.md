# P6 proposed plan: production-path completeness

**Status:** Active and implementation-audited on 2026-08-02. Useful P6 slices are present, but none of the six steps meets every stated acceptance condition. Remaining work is carried into [P7 full-game roadmap](P7_FULL_GAME_ROADMAP.md) and its executable [P7 gap implementation plan](P7_GAP_IMPLEMENTATION_PLAN.md); this plan remains active until its P6 blockers are closed.

**Current handoff (2026-08-03):** 240 unit tests and 110 synthetic tests pass.
RG-04 chest rewards are seeded and source-rarity-weighted across eligible
owned weapons/passives; exact Code Dungeon chest probabilities and manual
visual/reconnect evidence remain planned gaps under P7.

## Implementation audit -- 2026-08-02

| Step | Result | Verified implementation | Remaining blocker |
| --- | --- | --- | --- |
| 1. Interaction boundary | Partial | Token-free jsdom loads the production webview and exercises purchase, run start, focus, WASD prevention, battery tooltip, pause, explanatory dialogs, synthetic-income intent, level-up actions, summary, return-to-Guild, PNG export, resize redraw, and canvas selection/drag suppression. Helper/source tests cover clock, camera projection, and upgrade copy. | Narrow/wide visual review remains open under RG-06; the supported test-host limitation for a webview click/reconnect route is recorded in `decisions/extension-host-recovery.md`. |
| 2. Host authority | Partial | Upgrade/battery purchase, refund, settings, telemetry toggle, run registration, input-step, telemetry, level-up actions, detached sequenced `RUN_SNAPSHOT` messages, host-sync-before-snapshot behavior, active-session replay after `READY`, and long-running production-provider disposal/recreation replay are validated. `SAVE_PROGRESS` is removed, and the host mirrors a deterministic session and derives the persisted reward; duplicate completion remains idempotent. | The local simulation is now limited to the explicit token-free harness. The supported test-host limitation is recorded in ADR-001 and `decisions/extension-host-recovery.md`; full production-DOM interaction remains RG-06 work. |
| 3. Meta and level-up UI | Partial | Supported shop entries now consume the canonical `META_UPGRADES` registry; exact costs/ranks/effects, refund, Reroll, Skip, per-card Banish controls, concrete card descriptions, and action-error recovery are wired; the token-free production-DOM harness exercises the actions. | Narrow/wide visual QA and broader base-game parity remain open. |
| 4. Pickups and chests | Partial | Elite tactical drops, destructible light-source entities/drops, collection ownership, per-chest IDs/results, duplicate payout protection, boss-safe Arcane Cleanser handling, and deterministic extra Luck reward exist. Stage drop tables now own base chest tier plus independent Luck-multiplied five/three-item checks. | Exact per-chest source chances, additional-stage tables, and full end-state presentation remain open in P7 Step 5. |
| 5. Stats | Partial | Duration affects projectile lifetime; Greed, Curse (health/speed/wave density/cadence), Luck (chest/source rolls), Revival, movement upgrades, and additive token provenance have focused behavior tests. Curse does not directly change enemy contact damage; the authored stage minute curve owns damage progression. Revival charges are now separate from derived stats and cannot be restored by recalculation. | Full base-game stat formulas and balance remain open; several partially implemented stats remain available through in-run passives. |
| 6. Final QA | Pending | Unit, typecheck, lint, and builds pass; a VSIX has been produced during development. | No recorded narrow/wide full-flow playthrough exists, and the full VS Code DOM matrix is not automated. |

## Outcome

Finish the incomplete production paths already represented in the engine before adding more characters, stages, weapons, modes, secrets, assets, or DLC. At the end of P6, every feature shown to the player or listed as available in the manual must be reachable in normal play, behaviorally meaningful, host-authoritative where value persists, and covered at the interaction boundary.

## Review evidence at milestone start

The current foundations are useful, but several P0-P5 completion statements were broader than user-accessible behavior:

1. `src/game/meta.ts` and `StateManager` define bounded PowerUps and refunds, while `src/webview/main.ts` renders and purchases only Guild Might and the separate battery upgrade.
2. `rerollLevelUp`, `skipLevelUp`, and `banishLevelUpCard` are implemented and unit-tested, but the level-up overlay renders only ordinary upgrade cards.
3. tactical pickup effects are implemented in the collection loop, but normal enemy deaths spawn XP gems or chests; no authored production source emits healing, magnet, freeze, screen-clear, or gold pickups.
4. Duration, Luck, Greed, Curse, and Revival are registered and copied into hero stats, but their complete expected gameplay effects are absent. For example, projectile lifetime uses the weapon's base duration directly, and defeat does not consume Revival.
5. `bossRewardClaimed` is run-global, so only the first collected chest can produce a fresh item/gold result.
6. the webview can submit complete progress and run reward totals. Runtime shape validation exists, but persistent economy/unlock mutation is not fully owned by the extension host.
7. `npm run test:e2e` verifies extension activation and opening the view, not webview clicks, focus, overlays, dialogs, purchase flows, or export behavior.
8. Arcane Cleanser removes every enemy. Before it can spawn normally, final threats need an explicit immunity/handling rule so the pickup cannot accidentally complete the stage.
9. WASD input has regressed in the webview. Keyboard ownership must be centralized, focus-safe, and covered by a source-level/UI interaction test so a future re-render or dialog cannot silently break movement.
10. Level-up copy falls back to the generic "Improve your run" text instead of describing each card's actual effect.
11. The run clock is rendered as seconds only; the HUD must use a stable `mm:ss` formatter.
12. Battery details use the browser `title` attribute. Battery status must use the same immediate custom tooltip pattern as enemy counters.
13. Enemy counter icons are too small and need a modest accessible size increase without changing map density.
14. Historical balance issue (resolved 2026-08-02): the content-registry pass
raised enemy speed without preserving movement headroom. Guild Agility now uses
the source-backed 5% per rank (10% maximum), and the authored Infinite Loop
Fiend speed is bounded so the latest non-boss wave remains below the fully agile
hero after the minute scaling curve.

## Implementation addendum -- 2026-08-02

The following P6 blockers were closed during the P7 baseline pass and must not be reintroduced:

- movement now enters the deterministic simulation as a normalized `InputSnapshot`; the webview no longer mutates hero world coordinates;
- the camera follows the hero and the Code Dungeon grid repeats at arbitrary positive/negative coordinates;
- the canvas suppresses focus/selection outlines while retaining keyboard focus recovery;
- Arcane Cleanser removes non-boss enemies while preserving bosses and end-state accounting;
- chest results are stored by chest identity, so duplicate collection cannot report another chest's reward;
- chest gold now uses a deterministic 60-500 base range; stage-owned chest checks resolve a retained 1/3/5 tier by identity using descending five/three-item chances multiplied by total Luck; finale completion records stage gold/revival bonuses;
- revival charges are consumed in `RunState.revivalsRemaining`, not by mutating derived stats;
- ordinary XP gems and battery overflow no longer create gold; destructible light-source entities/drops are the first replacement source;
- `SAVE_PROGRESS` and its validation/handler path are removed; telemetry now supports a bounded `/v1/logs` Codex OTel JSON fixture route and additive synthetic toggle;
- the opt-in telemetry adapter now reports bounded disabled/waiting/receiving/error health, accepted event count, last event time, endpoint, and safe startup errors without forwarding content;
- the Code Dungeon finale retains invulnerable timeout threats for a one-minute end-state window and resolves the stage reward without requiring the threat to be killed;
- a parity matrix and host-authority ADR are retained under `.dev/parity/` and `.dev/architecture/`.
- production host-action failures now return a bounded `RUN_ERROR` so a rejected level-up intent cannot leave controls disabled.
- light-source and elite authored drops now emit healing, magnet, freeze, screen-clear, and gold variants; their exact base-game weights and maxed-inventory fallbacks remain a P7 parity item.
- first-roster weapon-specific parity now includes registry-owned Speed/Duration-ignore flags for Whip/Magic Wand/Knife-derived attacks, facing-only Knife launches, bounded 0.1-second Arcane Bolt and per-rank 0.1/0.08/0.06/0.04-second Throwing Daggers streams plus the 0.05-second Thousand Blades Amount sequence, and bounded per-target cooldown ledgers for Garlic-like Aegis Barrier/Sanctuary auras; the remaining weapon formulas and full source-backed roster stay in the retained P7 3A queue.

This does not complete P6. Full stat parity and the recorded narrow/wide manual matrix remain open; production-DOM coverage for level-up/actions/summary/export is now covered by the token-free harness.

## Scope

### Included

- a deterministic browser/webview interaction harness that runs without tokens, secrets, public network access, or an LLM;
- authoritative extension-host commands for purchases, refunds, settings, and final run rewards;
- Guild Hall UI for every supported, behaviorally complete base PowerUp plus full refund;
- Reroll, Skip, and Banish controls within the level-up overlay, including remaining charges and keyboard/focus behavior;
- authored production sources and collection rules for the tactical pickup set;
- per-chest identity, collection ownership, and reward resolution;
- complete gameplay behavior and focused tests for every exposed meta stat, or temporary removal/hiding of a stat until it is complete;
- documentation and recorded narrow/wide-sidebar QA aligned with actual behavior.

### Excluded

- DLC;
- additional stages, full roster expansion, Arcanas/Darkanas, secrets, advanced modes, Golden Eggs, merchant/bestiary systems, or localization;
- third-party art purchases/imports;
- performance targets beyond existing bounded-resource stability;
- new telemetry-to-combat or telemetry-to-stage bindings.

## Ordered implementation steps

### Step 1 -- establish the interaction test boundary

Add the smallest reliable harness that can load the production webview bundle and exercise DOM behavior with a mocked VS Code API. Cover the existing start-run, level-up selection, pause/resume, dialog, resize, summary, and PNG-export triggers before changing those flows.

**Current status:** keyboard ownership and HUD regressions are fixed. A token-free jsdom harness now exercises production purchase, start/focus, WASD, battery-tooltip, pause, dialogs, level-up actions, summary, return, synthetic toggle, and PNG export. True VS Code webview coverage for resize and narrow/wide visual review remains open.

First-pass reliability additions required by the current review:

- centralize keyboard listeners and ignore editable/dialog targets while preserving WASD/arrow movement;
- use `mm:ss` for the live clock and summary-facing duration labels;
- replace battery `title` text with the existing custom tooltip mechanism and enlarge enemy counter icons;
- make every current upgrade card describe its concrete effect (including current level/target where useful).

Acceptance:

- tests fail on a disconnected click handler or duplicate re-render that replaces an active control;
- keyboard focus and narrow/wide layout states can be asserted;
- the harness is deterministic and included in the standard test command or an explicitly documented gate.

### Step 2 -- make persistent mutations host-authoritative

Replace whole-progress saves and client-supplied reward totals with narrow intent messages. The host calculates costs, validates the current stored record, applies purchases/refunds/settings, derives or validates run rewards from an owned run result, persists once, and returns the canonical progress snapshot.

**Current status:** purchase, battery, refund, and settings intents are host-owned. `RECORD_RUN_REWARD` accepts only a run ID; the host mirrors validated telemetry/input/actions and derives the persisted totals. Production-provider snapshot/reconnect recovery and replay-parity checks are covered; the supported test-host limitation is recorded, and full production-DOM interaction remains RG-06 work.

Acceptance:

- a webview cannot grant itself gold, tokens, unlocks, ranks, relics, or completed run IDs;
- replayed run IDs and duplicate commands are idempotent;
- invalid, stale, unaffordable, maximum-rank, and corrupted-state cases are tested;
- legacy progress migration and reset remain intact.

### Step 3 -- finish the existing meta and level-up UI

**Current status:** working first UI slice. The shop renders concrete effects, costs, ranks, and refunds; level-up controls expose Reroll, Skip, and per-card Banish charges. Canonical capability selection and complete interaction coverage remain open.

Render supported PowerUps from the canonical registry rather than hand-coding Guild Might. Add clear cost/rank/effect state and a confirmed full refund. Add Reroll, Skip, and Banish controls to the in-map level-up overlay, render remaining charges, and keep focus stable after each action.

Acceptance:

- every visible purchase has an implemented effect and host-owned transaction;
- refund returns exactly the refundable spend and never refunds the battery track;
- action controls appear only with charges, consume exactly once; Reroll/Banish do not grant XP or tokens, while Skip grants only its source-backed XP award and never tokens;
- interaction and state-manager tests cover success and failure paths.

### Step 4 -- complete pickups and chest ownership

**Current status:** partial first slice. Elite tactical drops, destructible light-source entities/drops, per-chest IDs/results, duplicate payout protection, retained chest 60-500 gold and 1/3/5 tiers, stage-completion reward accounting, deterministic Luck resolution, and boss-safe Arcane Cleanser handling are present. The Code Dungeon table is now stage-selected and validated, including an authored base tier and independent highest-tier-first chest checks multiplied by total Luck; exact per-chest source chances, additional-stage tables, maxed-inventory coin fallbacks, and full end-state presentation remain open.

Add explicit, bounded production spawn/drop tables for healing, magnet, freeze, screen clear, and gold variants. Give every chest a stable ID and independent claimed state. Define final-threat behavior under screen clear before enabling that pickup in production. Add Luck-based chest/drop behavior only after single-chest ownership is correct.

Acceptance:

- no reward is credited before map collection;
- every pickup/chest has exactly one owner and duplicate collection cannot pay twice;
- multiple chests in one run can each resolve independently;
- deterministic tests cover drop, non-drop, collection, duplicate, boss immunity, and collection ordering.

### Step 5 -- close stat behavior gaps

**Current status:** partial. Duration, Luck, Greed, Curse, and Revival have first behavior slices and tests, and Revival consumption is separated from derived stat recalculation. They do not yet meet full base-game behavior. Curse now scales enemy health/speed and wave density/cadence without changing contact damage; Guild Agility and Duration use source-backed meta rank values, and opening/late-wave enemy speeds retain escape headroom for base and maximum-agility heroes.

Trace every exposed passive and meta stat from registry to a visible simulation effect. Implement and test Duration, Luck, Greed, Curse, and Revival consistently with the verified base-game target, or hide each incomplete stat from purchase/reward pools until its behavior is ready.

Acceptance:

- table-driven tests prove that each exposed rank changes the intended outcome and respects caps;
- movement-balance tests preserve early-run escape headroom and prove that the full movement upgrade remains meaningful throughout authored non-boss waves;
- no registry-only stat is advertised as functional;
- formulas are documented against verified sources and do not depend on telemetry throughput.

### Step 6 -- regression, manual QA, and documentation

Run focused tests after each step and the complete milestone gate at the end. Perform a recorded token-free playthrough at narrow and wide sidebar widths, including purchases/refund, every level-up action, tactical pickups, multiple chests, battery lockout/recharge, pause/resume, victory/defeat, reset, reload, and PNG export.

Final gate:

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

Update `CURRENT_MANUAL.md` only for production-reachable behavior proven by this gate. Record any remaining manual-only coverage honestly.

## Stop and replan conditions

Stop the milestone and write a dated addendum before proceeding if it requires a new gameplay divergence, external/network exposure, secrets, asset licensing, a persistence reset without migration, or content expansion outside this scope. Preserve this plan even if it is superseded.

## Follow-up implementation audit -- 2026-08-02

The retained P6 work has been reconciled against the active P7 queue. The host-owned run boundary, fixed-step cadence, open scrolling camera, token-free production interaction harness, additive telemetry health, pickup/chest ownership, retired XP/battery gold paths, source-backed XP curve/Growth thresholds, final-threat window, and centralized simulation budgets are implemented and covered by the current 228-test suite. The first authored enemy movement-family slice is now also present: registry entries accept only `chase` or `wavy`, legacy/missing values default safely to `chase`, syntax spectres use a deterministic bounded weave, and snapshot validation rejects unknown movement families. Spawn placement now uses a validated camera-relative stage perimeter policy outside the logical viewport, with explicit non-boss persistence culling and boss relocation when persistent threats fall outside the stage-owned world radius. Code Dungeonβ€™s complete current wave roster, per-minute health/damage/speed scaling, and finale clear/timing/invulnerability policy are now data-owned and registry-validated. Known meta-upgrade ranks are clamped to authored caps at the host load/migration boundary while bounded unknown future keys remain safe to round-trip. Curse now affects authored spawn cadence as well as speed and density, ordinary contact damage respects Armor's minimum-one rule, enemies now retain a deterministic 120 ms knockback reaction after weapon hits, XP gem values map to explicit blue/green/red tiers with 400-gem condensation, over-cap hydrated inventory is normalized, rejected host actions preserve their sequence for retry, and lethal contact now pauses for an explicit, host-owned revival/end-run choice with deterministic stage reward accounting. Run summaries now reconcile revival usage/remaining charges and finale reach, the map keeps a persistent final-threat countdown, completion reason, and end-sequence duration. Source-specific light-source and elite drop tables now live in validated content data and resolve through deterministic, collection-owned paths with explicit Luck/Greed boundaries; elite chance gating and weighted reward selection use independent deterministic rolls, elite gold is now tagged to a dedicated `eliteDrops` ledger source rather than falling into the legacy enemy-kill bucket, and stage-completion/revival rewards bypass Greed as a separate end-state reward. Evolved first-roster weapons now have explicit authored attack patterns and stats, including the first hero-anchored Whip-family slash contract, the first 0.1-second Arcane Bolt/Archmage Staff targeted Amount sequence, and the facing-only Knife/Thousand Blades sequence; level-up descriptions now derive exact next-level weapon/passive effects from the same validated content registry, new-weapon level-up discovery is registry-driven and excludes only authored evolution outputs, and gold summaries now use one domain-level total across every ledger source; a table-driven test audits every registered passive at rank one. The character panel now renders all 15 exposed combat stats from a shared presentation contract with custom hover/focus explanations. Stage selection now carries validated duration/topology/modifier metadata through the `START_RUN` host contract, snapshots, and checkpoints. Detached host checkpoints now restore bounded state and intent sequencing, concurrent READY restores are coalesced, provider disposal invalidates the webview lifecycle generation before teardown, and stale disposed webviews cannot submit or receive canonical run state; a production provider recovery driver verifies disposal/recreation, paused level-up overlay restoration, and retry sequencing; the supported test-host limitation is recorded in `decisions/extension-host-recovery.md` and persisted production-DOM interaction remains RG-06 work.

The telemetry adapter now preserves optional numeric reasoning-token detail and explicitly treats it as diagnostic so a completion cannot be charged twice. OTel `/v1/logs` fixtures cover reasoning-only records, event identity, and bounded normalization; this still does not prove that a supported Codex IDE/CLI emits the envelope live.

This does not close the milestone. The source-backed character/PowerUp/item
Amount bonus cap is now implemented at 10 (internal baseline-inclusive maximum
11) across derived simulation state and detached state boundaries, but the complete
enemy spawn/perimeter and movement roster, full stat and weapon parity,
source-specific balance verification, production Codex telemetry evidence, the
narrow/wide manual matrix, and semantic asset review remain open in
`P7_FULL_GAME_ROADMAP.md` and `NEXT_UPDATES.md`. The next implementation slice
is source-specific balance checks and the remaining production interaction evidence;
it must remain source-backed and tested before any additional content or asset
adoption.

The subsequent pause/resume webview regression raises the verified full-suite
count to **237 tests**; the earlier 236/235/234/228 counts in this retained audit are
historical checkpoints.

### Knife cadence addendum - 2026-08-02

Throwing Daggers now uses registry-owned per-rank projectile intervals of
0.1/0.08/0.06/0.04 seconds at the retained Knife rank breaks. The queue is
bounded, preserves facing at release, and is covered by registry, simulation,
and upgrade-copy tests. This closes the base Knife cadence sub-gap only; the
remaining first-stage weapon families and balance audit remain queued.

### Host-owned pause/resume addendum - 2026-08-02

The pause control is now an authoritative run transition. Sequenced host
`RUN_ACTION` intents carry `pause` and `resume`; the validated `RunState.paused`
flag is retained in snapshots/checkpoints and legacy checkpoints migrate to
`false`. Paused fixed steps stop time, movement, battery, combat, and synthetic
income. Focused and full gates now pass at 237 tests; the remaining production
DOM/reconnect and manual visual evidence stays in the active P7 queue.
