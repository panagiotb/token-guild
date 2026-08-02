# P7 remaining-gaps implementation plan

**Status:** Active audit plan, created 2026-08-02  
**Parent:** [P7 full-game roadmap](P7_FULL_GAME_ROADMAP.md)  
**Executable detail:** [P7 gap implementation plan](P7_GAP_IMPLEMENTATION_PLAN.md)  
**Scope:** MVP first-stage loop and its production boundaries; DLC, marketplace/payment work, online multiplayer, and unapproved third-party assets remain out of scope.

This document is the short, reviewable answer to β€what is still missing?β€ after the 234-test baseline. It does not replace historical plans. A row is not considered closed because a helper, registry entry, or unit test exists: the rule must be reachable through the production host/webview path, owned by the correct boundary, and documented with observed limitations.

**Latest RG-02 slice (2026-08-03):** Alchemist Fire/La Borra now declares a
persisted generic floor-pool strategy with source-anchored damage, Area,
Duration, cadence, rarity, pool limits, Hitbox Delay, and Attractorb evolution.
Zones are stationary world projectiles; the first targets the nearest eligible
enemy, later drops distribute around the hero, and host/webview validation
fail closed for cooldown ledgers on non-pool/ricochet patterns. Exact bottle
fall, zone growth, and full modifier interactions remain partial. The previous
Orbiting Grimoire/Unholy Vespers slice
declares a persisted generic orbit state with source-anchored damage, area,
speed, duration, cadence, rarity, and Spellbinder evolution. Angle, radius,
and angular speed follow the hero in world coordinates and survive
pause/checkpoint restore; both host and webview validation fail closed for
missing or mismatched orbit fields. The 180-unit radius cap and 30-Pierce
safety envelope are explicit first-pass limits; shared hitbox-delay reset,
page-fall presentation, and exact Pool Limit remain partial. The previous
Celestial Cross/Heaven Blade slice declares
a persisted generic boomerang state with source-anchored damage, speed,
cadence, rarity, and Clover evolution. Origin and return phase survive
pause/checkpoint restore and are required by both host and webview validation.
Cross critical hits, wall presentation, and exact intermediate rows remain
partial. Battle Axe/Scythe of Doom previously declared a
persisted generic fan-volley strategy with source-backed Axe level rows,
rarities, Pierce, evolution, and Death Spiral cadence. The queue captures its
launch angle and authored Amount so pause/checkpoint restore cannot reroll the
arc. The remaining Axe vertical-arc/gravity and indefinite-lifetime details,
plus the broader non-DLC roster, remain partial. The previous Knife slice
still declares the
source-backed 0.1-second projectile interval (with authored 0.08/0.06/0.04-second
rank reductions) and releases authored Amount as a bounded facing sequence. The
focused simulation regression proves that queued shots do not spawn
simultaneously and remain aligned to the hero's facing;
the Thousand Blades 0.05-second interval remains unchanged. This narrows the
Knife-family gap but does not close the broader RG-02 weapon row.

**Latest RG-04 slice (2026-08-02):** chest rewards now select from the shared
eligible owned weapon/passive pool through the seeded simulation RNG and each
registry item's source rarity weight, preserving deterministic replay and
Banish/max-rank exclusions. The first-roster values are recorded in the data
registry and backed by the retained weapon/passive references; exact Code
Dungeon tier probabilities, additional-stage balance, and full presentation
remain open.

**Latest RG-03 slice (2026-08-02):** the meta registry now matches the cited
PowerUp values for Guild Agility (+5% per rank, +10% maximum) and Guild Duration
(+15% per rank, +30% maximum). Token Magnetism now uses the source-specific
Attractorb multipliers by level, and the Magnet PowerUp compounds its 1.25×
rank multiplier. The late Code Dungeon Infinite Loop Fiend speed was bounded to
preserve escape headroom after the authored minute scaling curve; rank
projection and movement/magnet regressions cover the boundary. Other stat
formulas, caps, and balance remain open.

## Guardrails for unattended work

The current handoff supersedes historical count references below: the latest
full release gate is **243 passing unit tests** across 26 files and **112
synthetic tests** across 4 files, with typecheck,
lint, build, e2e activation smoke, package, production audit, and
`git diff --check` green.

1. Work on one row at a time in the dependency order below.
2. Before coding, record the source/date and the intended ownership boundary (simulation, host, webview, persistence, or manual QA).
3. Add success, boundary, invalid-input, duplicate/ownership, teardown/expiry, migration, and deterministic-replay coverage appropriate to the row.
4. Keep the working MVP path small. Do not add new characters, stages, modes, DLC, or assets while a prerequisite row is open.
5. Run focused tests, then the complete gate; update this plan, the parity matrix, the manual, and project-management evidence together.
6. Stop and add a dated decision record before introducing a new gameplay divergence, public listener, secret, destructive migration, unsupported telemetry scraping, license-dependent asset, or external publication.

## Gap inventory and implementation contracts

| ID | Gap found in the audit | Current evidence | Implementation contract | Exit evidence |
| --- | --- | --- | --- | --- |
| RG-01 | True Extension Development Host disconnect/reconnect timing and production-DOM replay are not exposed by the supported unattended harness. | Detached checkpoint restore, sequence recovery, lifecycle-generation rejection, production-provider short/long-running disposal/recreation recovery, paused level-up overlay restoration, and terminal-only reward recording now pass; the integration host can activate/open the view but cannot inject webview DOM events or force a user-session reconnect. | Preserve host-owned state and idempotent run IDs; keep the production-provider replay boundary automated. Do not add private Electron/DOM automation or reintroduce client reward authority. | Platform limitation is recorded in [Extension Development Host recovery evidence](../decisions/extension-host-recovery.md), deterministic provider replay and e2e activation remain green, and no duplicate reward path exists. |
| RG-02 | First-stage weapon behavior is still partly represented by generic patterns. | The current eleven base weapons and ten evolved outputs now have explicit registry patterns, authored level rows, and focused behavior slices: Broadsword/Excalibur slash, Knife/Throwing Daggers facing launch, Arcane Bolt/Archmage Staff targeted Amount sequencing, Thousand Blades facing sequence, Battle Axe/Scythe of Doom persisted fan volley, Celestial Cross/Heaven Blade persisted boomerang, Orbiting Grimoire/Unabridged Codex persisted orbit, Alchemist Fire/Philosopher's Potion persisted floor pools, Fire Wand/Hellfire random fan/targeted sequence, Arcane Bolt/Throwing Daggers Duration ownership, Aegis/Sanctuary aura cooldowns, Bouncing Arrow, No Future (including Armor-scaled retaliation), and Bone. The broader non-DLC roster is still `Partial`. | For each currently selectable base/evolved weapon, retain a parity row with source/date, aim, target selection, cadence, lifetime, collision/pierce/reflection/orbit/pool/aura rules, evolution trigger, and presentation ownership. Implement one family per slice through registry-owned strategy data; never infer behavior from labels or telemetry. | Every currently selectable weapon/evolution has an observable effect, concrete card copy, explicit level rows, bounded state, replay-safe checkpoint/snapshot coverage, and either a source-backed rule or an explicit approximation; broader families remain deferred under RG-08. |
| RG-03 | First-stage stat formulas/caps and balance are incomplete. | Duration, Luck, Greed, Curse, Revival, Amount, Area, Growth, Armor, and movement have tested slices; Recovery now has separate per-second regeneration and collected-healing projections; the source-backed 10-point Amount bonus cap is now enforced (internal current-stat maximum 11) across derived simulation state, detached checkpoints, and webview snapshots, while several other caps and balance values remain provisional. | Trace every exposed stat from registry to simulation effect and UI copy. Add table-driven rank/cap tests, combined-stat movement headroom tests, and invalid/over-cap normalization. Hide a capability rather than advertise a registry-only effect. | Each visible stat changes the intended outcome at rank one and max rank, respects a documented cap, survives reload, and cannot be changed by telemetry throughput. |
| RG-04 | Gold/drop/chest parity is incomplete beyond the first owned path. | Code Dungeon drop table, collection ownership, duplicate prevention, independent elite-drop chance/weighted selection, positive and negative Greed multipliers, 60β€“500 chest gold, 1/3/5 tier checks, stage reward, revival accounting, separate identified-chest versus legacy boss-chest ownership, and rarity-weighted owned weapon/passive chest rewards are implemented. Exact chest chances, additional-stage balance, and full result presentation remain open. | Verify source-specific light-source/elite/chest values before changing data. Keep all pickup and chest ownership in simulation/host, apply Greed exactly at pickup/chest boundaries, keep stage completion outside Greed, use registry rarity weights only after ownership/max-rank/Banish filtering, and reconcile every ledger source. | Token-free runs show no gold before collection, every ID pays once, multiple chests remain independent, positive/negative Greed effects remain bounded, elite success and reward rolls are independent, weighted chest draws are deterministic and cross weapon/passive types, the boss chest remains claimable after stage chests, and summary/export totals equal the host wallet mutation. |
| RG-05 | Live Codex telemetry producer compatibility is unproven. | Local JSON/protobuf loopback fixtures, bounded normalization, dedupe, synthetic toggle, and forged-webview rejection pass; no configured live producer was found. | Run only an explicit opt-in localhost producer smoke with prompt logging disabled. Record whether `codex.sse_event` completion usage arrives, batching/flush behavior, and exact/estimated mapping. If unsupported, document the limitation and retain additive synthetic income; never scrape UI/files/databases/credentials. | Either a documented live smoke passes, or the limitation is explicit in telemetry decision/manual and synthetic remains independently toggleable. |
| RG-06 | Manual visual/accessibility evidence is incomplete. | Token-free DOM tests cover core controls and snapshots; narrow/medium/wide, themes, zoom, high contrast, reduced motion, screen reader labels, and a real Extension Development Host click route are not fully recorded. | Execute the production interaction matrix at supported widths/zoom/theme combinations: movement/focus, resize, canvas selection suppression, pause/revival/summary overlays, tooltip placement, battery lockout/recharge, synthetic/live modes, purchases, pickups, chests, victory/defeat, reset/reload, and export. | Every row has observed pass/fail evidence, environment and retest date; source assumptions are not counted as manual evidence. |
| RG-07 | External icon packs are mechanically indexed but not semantically/licensing reviewed. | `.dev/assets/asset-index.json` and `ASSET_INDEX.md` enumerate PNGs; descriptions are filename-derived and no assets are integrated. | Read supplied license/provenance material and Unity metadata, generate ignored contact sheets, inspect every unique visual group, replace descriptions with semantic descriptions/roles/variant links, and record shortlist/rejections. Do not copy/package assets before explicit approval and redistribution evidence. | Filesystem counts reconcile, every unique group is human-reviewed, license uncertainty is explicit, and no unapproved raster/PSD/font/prefab enters the product. |
| RG-08 | Remaining base-game systems are planned but not implemented. | `P7_CONTENT_FAMILY_PLANS.md` retains child plans for weapons, characters, stages, collection, merchant, Arcanas, modes, Eggs, secrets, and co-op feasibility. | Do not start a family until RG-01β€“RG-06 and the first-stage acceptance gate pass. Then execute one vertical family at a time with registry validation, host IPC, UI, unlock/migration rules, deterministic tests, and manual evidence. | Each family has a retained child-plan result or an evidence-backed platform limitation/user decision. DLC remains excluded. |

The audit also retains two dated child gaps outside the original eight-row
baseline: RG-09 (post-level-up protection, implemented) and RG-10 (PowerUp
purchase-cost parity, implemented). Their contracts and evidence are recorded
below rather than deleting or rewriting the original gap register.

### RG-03 implementation evidence (2026-08-02)

The first stat-cap slice is now complete. `SIMULATION_POLICIES.maxAmountStat`
is the single boundary for the character/PowerUp/item Amount stat, derived
simulation state normalizes it to an integer in the safe gameplay range, and
both detached checkpoint restore and webview snapshot adoption fail closed for
baseline-inclusive values above 11. The cap follows the documented [Amount reference](https://vampire-survivors.fandom.com/wiki/Amount), whose 10-point bonus limit maps to this domain's baseline-inclusive value; it does not cap an authored weapon's own projectile count. Focused simulation, host, and snapshot
tests plus the 228-test full suite cover the boundary. The passive registry
audit now exercises every exposed passive at both rank one and its authored
maximum, including max-health, magnet, Omni, and revival-charge projections.
Recovery now uses a shared additive projection for fixed-step regeneration and
collected healing pickups, with malformed-stat fallback and maximum-HP
collection coverage.
Curse is now source-isolated at enemy creation: it scales health and speed plus
wave density/cadence, while the authored stage minute curve remains the only
enemy-damage progression; matched cursed/uncursed production spawns cover the
damage boundary. The shared enemy/snapshot/checkpoint envelope is now 192
entries, covering the 162 valid active enemies at the current maximum Curse
stack without retaining the former arbitrary 60-entry truncation.
The shared cooldown
projection also honors the cited 10% total-cooldown floor through
`SIMULATION_POLICIES.minCooldownMultiplier`, with a deterministic boundary
regression. Source-backed derived caps now also cover Might (+900%), Area
(+900%), Projectile Speed (+400%), and Duration (+400%), with host/webview
over-cap assertions. Luck, Greed, Curse, Growth, Revival, movement, and broader
balance still require the remaining source-backed formula/balance work in RG-03.

The new table-driven meta audit exercises every spendable registry upgrade at
rank one and its authored maximum, including multiplicative max-health,
movement, and magnet effects, and proves an accepted telemetry event leaves the
combat-stat vector unchanged. This closes the meta-coverage proof slice without
claiming that provisional balance values are canonical.

### RG-03 max-health and base-magnet correction (2026-08-02)

The source-backed Max Health and Magnet boundaries are now corrected. Class
base Magnet is 30; Guild Vitality compounds a 1.1x Max Health multiplier per
rank, and Heart of Vitality compounds a 1.2x multiplier per level. Focused
simulation coverage proves rank-one/max-rank and combined multipliers,
including 100 -> 133.1 Guild Vitality health and 100 -> 248.832 max-rank Heart
health, while telemetry remains stat-neutral. The wider RG-03 formula/balance
audit remains active.

The post-correction release gate is **238 passing tests** across 26 files;
synthetic tests report **108 passing tests** across 4 files, with typecheck,
lint, build, e2e activation smoke, VSIX packaging, production audit, and
`git diff --check` green.

### RG-10 PowerUp purchase-cost parity (2026-08-02)

The cited [PowerUps cost rule](https://vampire-survivors.fandom.com/wiki/PowerUps)
charges the
initial price plus `initialPrice * (1 + alreadyBoughtInThisPowerUp)` and a
global fee `floor(20 * 1.1^totalBoughtAfterPurchase)` for every purchase after
the first. The cost/refund API calculates this from one authoritative
global-rank projection, preserves exact refund totals without storing a second
wallet, and keeps the battery track isolated. StateManager and the shop pass
the same total-rank context; validation covers first/second purchase,
cross-upgrade ordering, max rank, refund, migration, insufficient gold, and
cost display context.

The purchase path now applies that global fee/base-cost rule through
`metaUpgradeCost(id, rank, totalBoughtAfterPurchase)`. StateManager and the
Guild shop derive the same total-rank context, while `metaUpgradeRefund`
reconstructs the exact spend from the persisted rank vector; unknown ranks and
the non-refundable battery track remain isolated. Validation coverage proves
first/second purchases, cross-upgrade fees, insufficient gold, max-rank
rejection, full refund, and battery isolation. Source-accurate price parity is
implemented for the current registered PowerUps; broader shop/manual visual QA
remains RG-06.

### RG-09 — level-up resume protection

**Gap contract:** A final level-up choice must restore dungeon play with the
same bounded, data-owned contact-protection rule used by the stage. The
transition must not advance the paused clock, shorten an existing protection
window, or grant protection during rerolls/banishes that leave the overlay
open. Cover card choice, Skip, multiple queued level-ups, checkpoint/snapshot
replay, and expiry before moving to another parity slice.

### RG-09 implementation evidence (2026-08-02)

The final `chooseUpgrade` and `skipLevelUp` transitions now call one
simulation-owned resume helper. It restores `dungeon` phase and applies the
stage's validated `contactInvulnerabilitySeconds` through a max operation, so
an existing contact-protection window cannot be shortened. Code Dungeon's
authored value is 0.5 seconds. The existing level-up simulation test now
checks immediate contact suppression and damage after expiry; the paused
simulation clock still advances only after the choice closes. This is an
explicit, bounded first-stage approximation of the source's “brief” window,
not a claim that the exact base-game duration has been independently measured.

### RG-02 coverage addendum (2026-08-02)

The existing late-chest evolution regression is now table-driven across every
currently authored recipe: Broadsword→Excalibur, Arcane Bolt→Archmage Staff,
Throwing Daggers→Thousand Blades, Bouncing Arrow→No Future, and Aegis
Barrier→Sanctuary. Each case proves the 10-minute gate, maxed base weapon,
required passive, level-one evolved result, and identity-preserving reward
history. This closes the current-roster coverage gap without expanding the
weapon family scope; broader non-DLC evolutions remain RG-08 work.

### RG-04 architecture addendum (2026-08-02)

The existing Code Dungeon light-source spawn behavior is now fully data-owned:
validated drop tables declare the base attempt chance (`0.10`) and maximum
Luck-scaled chance (`0.50`), with a fail-closed ordering/range check. The
simulation consumes those fields instead of hidden constants; legacy tables
retain the same defaults. Focused registry and light-source cadence tests
cover the values and invalid ordering. This is an ownership/maintainability
closure, not a new gold or telemetry rule; exact per-stage base-game balance
remains part of the broader RG-04 audit.

### RG-02/RG-03 level-up action addendum (2026-08-02)

The previous implementation consumed Skip charges without progressing XP. The
verified base-game contract awards 20% of the next-level requirement. The
implementation contract is now: apply that direct XP amount through the same
bounded level-progression loop, preserve queued pending levels, consume one
charge exactly once, never award tokens, and retain deterministic host replay.
Reroll and Banish remain XP-neutral. Focused simulation, host-action, and
production-interaction tests must prove the normal, queued-level, zero-charge,
retry, and no-token paths before this action slice is considered complete.

The action slice is now implemented and verified. `advanceExperience` is the
single progression path for gem XP and direct Skip XP; the simulation tests
cover a normal Skip and two queued level-ups, the host test covers the
host-owned action and zero-token invariant, the validation test covers charge
consumption, and the production interaction test asserts the updated button
copy. The full 228-test suite and release gates pass on 2026-08-02.

The same eligibility boundary now hides and rejects Reroll/Skip when every
weapon and passive is maxed and fallback heal/coin cards are offered. The
predicate is shared by `upgradeEligibility.ts`, simulation actions, host IPC,
and production rendering; the maxed-inventory simulation regression proves
both actions fail closed without consuming charges or granting XP/tokens.

### RG-02/G-03 Banish ownership addendum (2026-08-02)

The audit found a remaining item-identity gap: Banish currently records only
the rendered card ID. A weapon/passive can therefore be banished in one card
form and later return under another form, and a late chest can still upgrade
it. The source contract keeps a banished item out of future level-up choices
and chest upgrades for the rest of the run ([Banish reference](https://vampire-survivors.fandom.com/wiki/Banish), checked
2026-08-02). The next slice must introduce one canonical item-ban key with
legacy card-ID compatibility, apply it to level-up eligibility, Reroll/Skip
availability, evolution and chest upgrades, and reject Banish on fallback
heal/coin cards. Coverage must prove future-card exclusion, chest/evolution
exclusion, charge consumption exactly once, checkpoint/snapshot preservation,
and no reward/XP/token mutation from the action.

The slice is now implemented: `upgradeEligibility.ts` owns canonical
`item:<id>` keys while accepting legacy card IDs, simulation card generation
and Reroll/Skip availability share the banish predicate, chest evolution and
ordinary chest upgrades skip banished items, and fallback heal/coin cards are
rejected by the action boundary. A focused regression covers future-card
exclusion, chest/evolution exclusion, legacy-card restore behavior, exact
charge handling, and fallback rejection. The complete 228-test suite passes;
the supported test-host limitation is recorded in
`../decisions/extension-host-recovery.md`; manual production-DOM evidence remains
open under RG-06.

### RG-05 implementation addendum (2026-08-02)

**Status: Conditional**

The live-producer decision is now explicitly conditional rather than silently
open: the checked user-level Codex config contains no OTLP exporter, so this
machine cannot prove live emission without user opt-in. `.dev/decisions/telemetry.md`
now retains a prompt-redacted loopback JSON smoke snippet and the exact
recording procedure. The extension does not edit global config, scrape private
state, or require credentials; the bounded JSON/protobuf fixture path and
additive synthetic source remain the verified fallback. RG-05 stays
Conditional until a user-configured smoke is observed or the platform changes.

### RG-01 recovery addendum (2026-08-02)

The production `GuildViewProvider` recovery suite now checkpoints while the
host is paused in a level-up overlay, restores the pending cards through the
real `READY`/`RUN_SNAPSHOT` path, accepts exactly one host-owned upgrade, and
rejects a duplicate action sequence after the overlay closes. The fixture uses
allocator-valid pickup identities, so the checkpoint exercises the same entity
ledger and pending-card validation used by a real run. This closes the paused
overlay case at the production-provider boundary; the supported unattended
harness limitation is recorded in `.dev/decisions/extension-host-recovery.md`
rather than treated as missing implementation evidence.

### RG-02/G-03 fallback-card addendum (2026-08-02)

The banish audit exposed a second-order eligibility gap: fallback selection
was decided before filtering banished item identities. A run with open slots
but every remaining weapon/passive banished could therefore receive generic
healing instead of the base-game Coin Bag/Floor Chicken choices. Card-pool
construction now resolves the shared eligibility predicate first and only
then selects the fallback; a regression covers canonical banish keys across
the full current roster and confirms no item card leaks back into the overlay.

## Dependency-ordered execution

### Phase A β€” authority and replay

1. Close RG-01 at the production-provider boundary and retain the documented
   supported test-host limitation.
2. Re-run the hostile checkpoint/snapshot suite and confirm reward idempotency after reconnect.

### Phase B β€” first-stage mechanics

3. Close RG-02 one exposed weapon family at a time; update the parity matrix before each change.
4. Close RG-03 with source-backed formulas/caps and combined-stat headroom tests.
5. Close RG-04 with verified first-stage economy tables and complete result reconciliation.

### Phase C β€” supported telemetry and presentation

6. Close RG-05 through an opt-in live smoke or an explicit platform limitation.
7. Close RG-06 through recorded production interaction evidence and accessible visual checks.

### Phase D β€” deferred content and assets

8. After the first-stage gate, execute RG-08 child plans one family at a time.
9. Execute RG-07 asset review after gameplay-loop acceptance; asset adoption requires separate user approval.

## Per-slice commands

```text
npm test -- --run <focused test file>
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm run package
npm audit --omit=dev --audit-level=high
git diff --check
```

The baseline is 228 unit tests. Update the count only from a fresh full-suite result; never estimate it from a focused run. A clean automated gate does not close RG-06 or RG-07 without the required manual/source evidence.

## Handoff format

At the end of each unattended slice, record:

- the gap ID and exact behavior changed;
- source/date or explicit approximation decision;
- production ownership boundary;
- focused and full gate results;
- migration/replay/duplicate and manual evidence;
- known limitations;
- the single next gap ID.

P7 remains active until the first-stage loop, host authority, telemetry decision, manual evidence, and asset review are either completed or explicitly documented as platform limitations/user decisions.

### RG-04 light-source Luck ownership addendum (2026-08-02)

The researched [Light source reference](https://vampire-survivors.fandom.com/wiki/Light_source)
states that Luck increases non-gold pickup weights while Gold Coin and Coin
Bag remain unscaled. The validated Code Dungeon table already carries those
ownership flags, including Floor Chicken and tactical drops. A new registry
regression proves both common gold entries remain `luckScaled: false` and every
current non-gold/rare entry remains explicitly Luck-scaled. This is a data
ownership safeguard, not a new balance claim; stage-specific probabilities
remain RG-04 work.

The fresh full-suite run after this addendum is **229 passing tests**. Earlier
228-test references in prior addenda are historical checkpoints, not the
current baseline.

### RG-04 light-source cap boundary addendum (2026-08-02)

The source-backed Luck rule includes a capacity boundary: once the authored
light-source cap is full, Luck must not increase the next spawn attempt. A
simulation regression now compares identical seeded zero- and high-Luck runs at
the cap and proves identical replacement ownership and placement. This closes
the cap/Luck ownership slice without claiming that Code Dungeon's provisional
stage balance or chest probabilities are canonical. The next RG-04 action is
still per-stage balance/source verification and final result-presentation QA.
The release gate after this slice reports **230 passing tests** across 26 files,
with typecheck, lint, build, e2e activation smoke, package, production audit,
and `git diff --check` green.

### RG-04 chest rarity-weight addendum (2026-08-02)

The [Weapons reference](https://vampire-survivors.fandom.com/wiki/Weapons)
and [Level up reference](https://vampire-survivors.fandom.com/wiki/Level_up)
state that item rarity is the weight used for eligible weapon/passive pools,
including treasure chests. The current six base reskins now carry the retained
source values (Whip/Magic Wand/Knife 100, Runetracer 80, Garlic 70, Bone 1),
and the authored passive reskins carry their corresponding first-roster
values in `src/game/data/passives.json` (Hollow Heart/Pummarola 90, Empty
Tome/Duplicator 50, Crown/Stone Mask 80, Skull/Tiragisu/Torrona 40, with the
remaining standard entries at 100). Evolved outputs retain rarity 1 even
though they are not ordinary upgrade candidates.

`openTreasureChest` now builds one deterministic weighted pool across eligible
owned weapons and passives after max-rank and Banish filtering. Each tier draw
consumes the host-owned seeded RNG; no UI ordering or Luck multiplier is
invented for the reward draw. Registry coverage, same-seed replay, weighted
distribution, and cross-type selection regressions pass. This closes the
reward-pool contract slice but not the exact per-chest Code Dungeon checks,
additional-stage balance, or manual result-presentation evidence.

The post-implementation release gate is **239 passing tests** across 26 files;
the synthetic subset is **109 passing tests** across 4 files. Typecheck, lint,
build, Extension Development Host activation smoke (2 passing), VSIX package,
production dependency audit (0 high vulnerabilities), and `git diff --check`
also pass. P7 remains active because exact stage-specific chest probabilities
and RG-06 manual evidence are not established.

### Host-owned pause/resume addendum (2026-08-02)

The remaining-gap audit found that the pause button hid the webview content
but did not own authoritative run state. That sub-gap is now implemented:
`RunState.paused` is validated and persisted, sequenced host actions carry
`pause`/`resume`, paused fixed steps do not advance time, movement, battery,
combat, or synthetic generation, and legacy checkpoints migrate to an explicit
unpaused value. Focused simulation, host, validation, snapshot, and webview
interaction regressions pass; the fresh full suite is **237 passing tests**
across 26 files and all release gates remain green. Real-host DOM/reconnect QA
is still RG-01/RG-06 platform-limited work.

### RG-02 Fire Wand family addendum (2026-08-03)

The next smallest vertical family is now implemented from the retained
[Fire Wand reference](https://vampire-survivors.fandom.com/wiki/Fire_Wand) and
[weapon overview](https://vampire-survivors.fandom.com/wiki/Weapons/Overview_Stats).
`fire_wand` is registry-owned with rarity 80, eight explicit rows, random fan
launch, three near-simultaneous fireballs, source speed/damage progression,
Duration ignored, and a Power Gauntlets (Spinach) evolution. `hellfire` is
rarity 1, level 1, 100 damage, two random-target projectiles at a 0.2-second
sequence interval, Duration ignored, and pierce 99.

The simulation reuses the bounded fan and targeted-sequence strategies rather
than adding an ID-specific branch. Registry tests validate every Fire Wand row
and evolution link; simulation tests validate random fan count, speed/duration
ownership, Hellfire cadence/pierce, and the shared 10-minute/max-rank/passive
chest gate. This closes one family slice only; walls, source pool limits,
additional fire interactions, and the broader weapon roster remain Partial.

The fresh gate after this slice is **240 passing unit tests** across 26 files
and **110 synthetic tests** across 4 files. Typecheck, lint, build, e2e
activation smoke, package, production audit, and `git diff --check` are green;
manual visual/reconnect evidence remains RG-01/RG-06 work.

### RG-04 chest-tier probability evidence addendum (2026-08-03)

The retained [Luck reference](https://vampire-survivors.fandom.com/wiki/Luck)
confirms that chest tier chances are unique to each chest and checked from
five-item to three-item before the chest's base tier, with total Luck applied.
It does not publish Code Dungeon-specific values. The [decision record](../decisions/chest-tier-probabilities.md)
therefore retains the validated 1%/2% provisional table and explicitly blocks
stage-value invention. The next RG-04 action is direct observation or an
authoritative table; no code change is justified by this research alone.

### RG-02 Axe family addendum (2026-08-03)

The Axe source ([Axe](https://vampire-survivors.fandom.com/wiki/Axe), checked
2026-08-03) and evolved output ([Death Spiral](https://vampire-survivors.fandom.com/wiki/Death_Spiral),
checked 2026-08-03) are now represented as `battle_axe` and
`scythe_of_doom`. Registry rows cover the eight authored Axe ranks, rarity 100,
the Orb of Expansion evolution, and the Death Spiral rarity-1 level-one row.
The simulation's generic queued fan strategy persists launch angle and Amount
in `WeaponState`; host checkpoints and webview snapshots fail closed unless a
pending fan queue carries both values and a bounded authored total. This keeps
pause, restore, and replay deterministic without adding an ID-specific branch.

Focused registry/simulation/host/snapshot/upgrade-copy/chest tests pass. The
source's vertical arc/gravity and Area multiplier are not yet modelled, and the
indefinite Death Spiral lifetime is represented by a bounded 30-second domain
window. These are explicit RG-02 presentation/physics gaps. The fresh release
gate is **242 unit tests** across 26 files and **111 synthetic tests** across
four files; typecheck, lint, build, e2e activation smoke, package, audit, and
`git diff --check` are green. The next weapon slice must retain the same
registry/strategy/validation/test/doc sequence.

### RG-02 Cross family addendum (2026-08-03)

Cross/Heaven Sword is now implemented as `celestial_cross` → `heaven_blade`.
The retained sources anchor rarity, base/max damage, Area, Speed, Amount,
Cooldown, and projectile intervals; Clover is now a validated Luck passive and
the evolution gate is table-driven with the other eight recipes. A generic
`boomerang` projectile state stores origin and return phase, turns after a hit
or bounded travel, and exits after reaching the hero. Host checkpoint and
webview snapshot validation fail closed for incomplete state or cross-pattern
fields on other weapons.

The intermediate Cross rows and finite Pierce/lifetime are bounded first-pass
values because the retained source overview does not publish every rank or a
finite lifetime. Critical-hit/Luck behavior, exact Pool Limit, wall behavior,
and visual spin remain open parity work. The fresh gate is **243 unit tests**
across 26 files and **112 synthetic tests** across four files; all typecheck,
lint, build, e2e, package, audit, and diff gates are green.

### RG-02 King Bible family addendum (2026-08-03)

`orbiting_grimoire` → `unabridged_codex` is now the latest source-backed
weapon family. The retained King Bible and Unholy Vespers references anchor
the rarity, rank-one/max-level progression, Spellbinder requirement, and
evolved damage/Area/Speed/Amount/Duration/Cooldown/knockback values. A generic
`orbit` strategy persists angle, radius, and angular speed, re-centers each
projectile on the moving hero, and validates the state at host checkpoint and
webview snapshot boundaries. Radius is capped at 180 world units and a 30-
Pierce safety envelope bounds the entity budget. Shared hitbox-delay reset,
page-fall presentation, and exact Pool Limit behavior remain explicit parity
gaps. The fresh gate remains **243 unit tests** across 26 files and **112
synthetic tests** across four files; all release gates are green.

### RG-02 Santa Water family addendum (2026-08-03)

`alchemist_fire` → `philosophers_potion` is now the latest source-backed
weapon family. Registry rows encode the eight Santa Water ranks, rarity 100,
the 0.3-second additional-Amount interval, Attractorb evolution, Pool Limits
20/30, and the source 0.5-second Hitbox Delay. The generic `pool` strategy
persists stationary world zones, targets the nearest eligible enemy for the
first drop, distributes later drops around the hero, and evicts the oldest
same-weapon zone at the authored limit. A bounded cooldown ledger is validated
at host checkpoint and webview snapshot boundaries. Bottle-fall, zone-growth,
and complete modifier interactions remain explicit first-pass gaps. The fresh
gate remains **243 unit tests** across 26 files and **112 synthetic tests**
across four files; all release gates are green.
