# Token Guild project management

This is the living execution contract. [CURRENT_MANUAL.md](CURRENT_MANUAL.md) describes verified behavior; [VAMPIRE_SURVIVORS_PARITY_TODO.md](VAMPIRE_SURVIVORS_PARITY_TODO.md) is the ordered gap list; [plans/NEXT_UPDATES.md](plans/NEXT_UPDATES.md) is the current unattended handoff; [plans/P7_GAP_IMPLEMENTATION_PLAN.md](plans/P7_GAP_IMPLEMENTATION_PLAN.md) turns the audited P7 gaps into executable slices; [plans/P7_CONTENT_FAMILY_PLANS.md](plans/P7_CONTENT_FAMILY_PLANS.md) retains the deferred base-game family child plans; [plans/](plans/) records milestone research and acceptance evidence.

## Current status

- **Release:** `0.1.0` deterministic Canvas/DOM vertical slice.
- **Current gate:** 243 unit tests across 26 files and 112 synthetic tests across 4 files, with typecheck, lint, build, e2e activation smoke, VSIX packaging, production audit, and `git diff --check` green. The longer quality bullet below is retained as a historical checkpoint.
- **Completed plan foundations:** P0 rules/combat, P1 Code Dungeon stage loop, P2 pickups/treasure/evolution, P3 meta progression/unlocks, P4 production telemetry, P5 presentation/game feel. "Completed" here records each plan's scoped work; it does not mean every foundation is exposed in production or that base-game parity is complete.
- **Renderer:** original Canvas/vector silhouettes with DOM controls; no external art packaged.
- **Telemetry:** synthetic fixture by default; opt-in loopback OTLP/HTTP JSON/protobuf adapter on localhost with bounded traces/logs input, scalar-only numeric input/output/cache/reasoning normalization, dedupe, and teardown. The first G-01A authority slice now generates synthetic events and dispatches accepted OTLP events in the extension host; production webviews cannot forge `RUN_TELEMETRY` value. Official Codex configuration supports OTLP/HTTP `binary` or `json` and documents `codex.sse_event` completion usage; live producer compatibility remains G-06 work.
- **Quality evidence:** 234 unit tests, strict typecheck, lint, build, VSIX package, e2e activation smoke, production dependency audit, and `git diff --check` pass on 2026-08-02. A token-free jsdom webview harness covers core controls, dialogs, level-up actions, summary/export, telemetry toggle/status, focus, host-only rendering before snapshot arrival, snapshot adoption, host-action error recovery, collected-chest presentation, revival choice presentation, persistent finale status/countdown, and host-owned end-state accounting; host-run tests verify detached sequencing, duplicate/future intent rejection, deterministic replay, fixed-step cadence, bounded simulation budgets, detached checkpoint restore/replay parity, corrupted checkpoint numeric-state rejection, malformed inventory/entity/ledger shape rejection, malformed projectile and aura hitbox cooldown rejection, malformed weapon stat-ownership flag rejection, host-owned revival/end-run/pause-resume actions, selected-stage propagation, unknown-stage rejection, registry-bound level-up checkpoint validation, host-owned synthetic/OTLP additive dispatch, bounded telemetry counts, forged webview rejection, and the bounded IPC budget while host smoke opens the contributed webview but does not automate the full VS Code DOM. StateManager tests cover bounded checkpoint storage, wallet isolation, reset cleanup, versioned domain round-trip, interrupted-write fallback, registry-authored hero unlock application, legacy known-rank clamping, and current-schema capability normalization. Lifecycle tests cover concurrent checkpoint restore coalescing, stale disposed-webview rejection, and provider-disposal invalidation. The provider recovery tests instantiate the production `GuildViewProvider` path across disposal/recreation, paused level-up overlay restoration, and verify checkpoint replay, retry sequencing, and host-owned telemetry authority. Simulation tests also cover validated stage perimeter/scaling/combat/finale contracts, light-source/elite drop tables, independent elite-drop chance and reward rolls, explicit elite gold-source ledger ownership, zero/high Luck gates, positive/negative Greed ownership, Recovery regeneration and collected-healing projection, Curse scaling and spawn cadence, destructible light-source drops/collection, authored weighted light-source drop gates, one-second light-source attempt cadence and cap replacement, collection-owned tactical effects and duplicate pickup IDs, Armor's minimum-one contact damage, timed 120 ms knockback, XP gem tier boundaries and 400-gem condensation, over-cap inventory normalization, registry-derived base-weapon choice coverage, directional/facing weapon aim, Whip-family hero-anchored slash, Arcane Bolt/Archmage Staff Amount sequencing and target reacquisition, Thousand Blades facing sequence/release aim, stale/invalid level-up card rejection, late-chest evolution eligibility, explicit evolved-weapon patterns/stats, Bone reflection/retention, Bouncing Arrow infinite-pierce/edge reflection/hitbox-delay, No Future edge-bounce/retaliation explosion, exact registry-backed level-up descriptions, every registered passive stat at rank one and max-rank, every spendable meta stat at rank one and maximum rank, Pandora's Box rank boundaries, stage-owned chest tier checks with total-Luck multiplication, gold ledger total reconciliation, pickup magnet attraction, chest tiers/gold ranges, chest presentation pause, stage completion/revival-choice reasons and finale timing, maxed-inventory Coin Bag fallback, Luck-driven fourth choices, elite/boss knockback resistance, authored wavy enemy movement, camera-relative off-screen spawning and boss relocation, weighted-level-up choices, Area-scaled projectiles, aura per-target cooldowns, and final-threat completion timing. Webview snapshot tests additionally reject unknown heroes, duplicate entities, invalid stat/battery ranges, malformed projectile cooldowns, and duplicate pickup identities; webview stat-presentation tests cover the complete 15-stat character panel contract, while stage-selection tests cover duration/topology/modifier formatting and host-validated stage propagation.
- **Dependency audit:** production dependencies are clean at `npm audit --omit=dev --audit-level=high`; the full audit reports eight development-chain advisories and is tracked as a reviewed dependency-only follow-up in [NEXT_UPDATES.md](plans/NEXT_UPDATES.md).
- **Latest gate refresh:** the source-backed XP curve/Growth thresholds, additive Amount projection and shared 10-point Amount bonus cap (internal maximum 11), source-backed 10% cooldown floor and Might/Area/Speed/Duration caps, canonical checkpoint stat provenance, rank-one/max-rank passive projection audit, terminal-only host reward recording, independent elite-drop chance/reward rolls, positive/negative Greed multiplier handling, Recovery regeneration and collected-healing projection, Curse health/speed/density/cadence scaling with contact-damage isolation, the 192-entry first-stage enemy envelope derived from the maximum authored Curse density, No Future retaliatory Armor-scaled explosion damage with its +500% cap, hero-centered Whip-family slash presentation, the bounded 0.1-second Arcane Bolt/Archmage Staff targeted Amount sequence, the bounded 0.05-second Thousand Blades facing sequence, per-rank Throwing Daggers cadence reductions, Fire Wand/Hellfire authored fan and random-target sequence behavior, Whip/Magic Wand/Knife-derived stat-ownership slices, Garlic-like per-target aura cooldown, data-owned light-source spawn chance, unmodified stage-completion reward, explicit Greed-excluded stage-reward summary copy, source-backed owned-item level-up weighting, deterministic source-rarity-weighted chest reward selection, table-driven coverage for all six authored first-stage evolutions, the stage-owned 0.5-second post-level-up contact-protection transition, canonical Banish item identity with chest/fallback/UI boundaries, host-owned pause/resume with checkpoint migration, plus long-running production-provider checkpoint replay, raise the verified suite to 240 tests; typecheck, lint, build, package, e2e activation smoke, production audit, and `git diff --check` remain green.
- **Skip action parity:** implemented and verified in the P7 plans: Skip grants direct XP equal to 20% of the next-level requirement, preserves queued level-ups, consumes exactly one charge, and never grants tokens; Reroll and Banish remain XP-neutral.
- **Banish item ownership:** implemented and verified in RG-02/G-03: canonical weapon/passive identity is persisted alongside legacy card IDs, fallback-card Banish is rejected, banished items cannot return or be upgraded by chests/evolution, and eligibility is resolved before Coin Bag/Floor Chicken fallback selection; checkpoint round-trip and full-roster fallback coverage pass.
- **NO FUTURE presentation:** edge/contact explosions are simulation-owned, bounded visual effects with reduced-motion handling, simulation-time expiry, legacy checkpoint migration, and host/webview snapshot validation; this closes the previously planned visual-feedback sub-slice while broader first-stage weapon parity remains open.
- **Host recovery evidence:** rejected run actions preserve their intent sequence, so the same action can be retried without duplicating rewards. Mixed long-run pickup snapshots use a dedicated 512-item envelope; the 400-item cap remains specific to XP-gem condensation.
- **Accepted divergence:** token battery gameplay only. XP-gem and battery-overflow gold have been removed; historical wallet balances remain grandfathered while full base-game gold parity is implemented.
- **Next work:** execute the dependency-ordered [remaining-gaps implementation plan](plans/P7_REMAINING_GAPS_IMPLEMENTATION_PLAN.md) through the [P7 gap implementation plan](plans/P7_GAP_IMPLEMENTATION_PLAN.md) and [next-updates queue](plans/NEXT_UPDATES.md) under the full [P7 roadmap](plans/P7_FULL_GAME_ROADMAP.md), beginning with the remaining exposed weapon/stat/economy parity slices and then first-stage interaction/mechanics acceptance; RG-01 provider recovery is closed with its supported test-host limitation recorded.

## Scope boundary

Development remains staged and base-game-first:

- preserve one proven stage until its full loop is accepted, then expand non-DLC base-game mechanics through retained child plans;
- keep deterministic synthetic telemetry for QA and require explicit opt-in for real telemetry;
- exclude DLC, marketplace publishing, unapproved asset integration, and performance targets; base-game secrets and advanced modes are late roadmap work, not first-loop work;
- do not add a gameplay divergence without a decision record and parity-backlog update.

## Unattended execution rules

1. **Working solution first.** Implement the smallest complete user flow for the active milestone. Put optional polish, generalization, compatibility, and extra content in the backlog.
2. **Plan every step.** Before changing code, write or update a plan with objective, dependencies, allowed scope, risks, acceptance, and commands. Review the plan before implementation.
3. **One step in progress.** Do not start a dependent step until the current step passes its focused and regression gates.
4. **Tests travel with behavior.** Cover success, boundary, invalid input, failure, persistence/teardown, and duplicate-event paths relevant to each change.
5. **Exercise real boundaries.** Pure tests cover rules; integration tests cover IPC/persistence; host/browser or a recorded manual check covers user interaction. A clean build alone is not proof.
6. **Do not weaken a gate.** Diagnose the smallest failing case, apply one focused fix, rerun the focused test, then rerun the affected regression suite.
7. **Replan on discovery.** If code disproves an assumption or exposes a dependency, update the plan and backlog before proceeding; never silently expand scope.
8. **Keep checkpoints reviewable.** Leave the workspace buildable after every passing step; avoid unrelated refactors, generated artifacts, or speculative abstractions.
9. **Preserve product decisions.** Battery gating is the only approved mechanics divergence. Gold and all other mechanics target the verified base-game reference unless a new decision record is added.
10. **Respect authority.** Local implementation, tests, builds, approved online research, and documentation are autonomous. Stop before external publication/messages, credentials, destructive operations, network exposure, licensing decisions, or material scope changes.
11. **Report honestly.** A helper, registry record, mock, or unit test is not shipped functionality until wired through the production path. Record limitations explicitly.
12. **Leave a handoff.** End every unattended run with completed work, commands/results, remaining risks, and the exact next step.
13. **Retain every plan.** Plans are permanent project records. Never delete completed, abandoned, or superseded plans; mark their status and create a dated successor or addendum when direction changes.

## Standard step cycle

1. Inspect repository status, current manual, active backlog item, implementation, and related tests.
2. Add or update the active plan on disk; include research and source links when facts may change. Preserve the previous plan text or status when superseding it.
3. Implement one foundation slice and its tests.
4. Run focused tests, then the relevant regression gate.
5. Review the diff for scope, security/privacy, reward ownership, migration safety, asset provenance, and generated files.
6. Update the manual only for verified user-facing behavior and record milestone evidence.
7. Leave the next step unambiguous or mark the goal complete only when no required work remains.

## Quality gates

### Per-step gate

- focused tests pass;
- typecheck and lint pass;
- no new untested trust, reward, collision, persistence, or IPC branch;
- documentation distinguishes implemented behavior from future intent;
- `git diff --check` passes and no accidental generated/third-party files are included.

### Milestone gate

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

Tests must run without public-network dependency, live tokens, secrets, or an external LLM. A user-facing change also requires a narrow/wide-sidebar manual playthrough or an equivalent host/browser check; current repository smoke is activation-only, so record that limitation rather than claiming click coverage.

### Latest unattended slice — 2026-08-02

The map-counter presentation contract is now explicit and regression-tested:
clock, dungeon title, token count, and icon-only battery are one responsive row;
battery details use the custom tooltip path and the lockout notice remains a
separate status line. The source-level UI checks and production interaction
tests pass. Manual narrow/wide visual and accessibility evidence remains open
under RG-06 because the supported Extension Development Host cannot inject
webview DOM events or force reconnect timing.

The unified manual was rebuilt during this audit because the prior working copy
contained broad character corruption and stale test command names. Its current
behavior sections now match the verified source/test surface; deferred and
manual-only work remains explicitly linked to the P7 plans.

The current drop-table regression also locks the researched Luck boundary:
common Gold Coin/Coin Bag weights are not Luck-scaled; rare and tactical
light-source entries opt into scaling through validated data.

The fresh full-suite run after this regression is **229 passing tests**; older
228-test references in historical evidence are retained only as historical
checkpoints.

### Latest RG-04 boundary slice — 2026-08-02

When the authored ten-source light-source cap is full, Luck no longer increases
the next spawn attempt. A deterministic simulation regression compares seeded
zero- and high-Luck runs and proves identical replacement identity and
perimeter placement. This protects the researched ownership boundary without
changing provisional stage balance. Exact chest probabilities, per-stage
economy, and manual result-presentation evidence remain open. The release gate
now reports **237 passing tests** across 26 files, with typecheck, lint, build,
e2e activation smoke, package, production audit, and `git diff --check` green.

### Latest host-owned pause slice - 2026-08-02

The pause control is now a domain and host state transition rather than a
webview-only visibility flag. A sequenced `RUN_ACTION` carries `pause` or
`resume`; `RunState.paused` is validated in snapshots/checkpoints, legacy
checkpoints migrate to `false`, and paused ticks do not advance time, movement,
battery, combat, or synthetic income. Focused simulation/host/validation/
snapshot/webview tests and the 237-test full gate pass. Manual visual and true
Extension Development Host reconnect evidence remains RG-06/platform-limited.

### Latest RG-02 weapon cadence slice - 2026-08-02

Throwing Daggers now declares the retained Knife source's 0.1-second projectile
interval, with authored 0.08/0.06/0.04-second rank reductions. Authored Amount
shots release through the same bounded host/simulation sequence used by other
interval weapons, preserving the hero's facing at each release; the 0.05-second
Thousand Blades evolution stream is unchanged. The
registry, upgrade-copy, and simulation regressions pass. Broader weapon-family
parity remains open under the P7 gap plans.

### Latest RG-04 chest reward-pool slice - 2026-08-02

Chest rewards now select from one shared eligible owned weapon/passive pool
through the seeded simulation RNG and registry rarity weights, so identical
seeds replay the same reward while maxed/banished items are excluded before
each draw. The current first-roster weights are source-backed in the JSON
registry; exact Code Dungeon chest probabilities, additional-stage balance,
and manual result-presentation evidence remain open. The current full gate is
**238 passing tests** across 26 files.

### Latest RG-03 movement/stat slice - 2026-08-02

The source-backed stat values are now explicit: Guild Agility is +5% per rank
(+10% maximum), Guild Duration is +15% per rank (+30% maximum), and Token
Magnetism follows the level-specific Attractorb multipliers. The Magnet PowerUp
compounds its 1.25× rank bonus. The late Infinite Loop Fiend speed is bounded
so the fully agile hero retains escape headroom after stage scaling. Rank
projection and movement/magnet regressions pass; broader stat formulas and
balance remain open.

### Latest RG-03 max-health/magnet correction - 2026-08-02

Base Magnet now uses the source-backed 30-unit value. Guild Vitality compounds
Max Health by 1.1× per rank and Heart of Vitality compounds the current total
by 1.2× per level. Focused simulation regressions prove rank-one/max-rank and
combined values, including 100 → 133.1 Guild Vitality health and 100 → 248.832
max-rank Heart health. The fresh full suite remains 238 tests across 26 files;
synthetic tests (108 across 4 files), typecheck, lint, build, e2e activation
smoke, VSIX packaging, production audit, and `git diff --check` are green.

### Latest RG-10 PowerUp-cost slice - 2026-08-02

Meta purchase and refund paths now use the source global fee/base-cost rule:
the initial price plus the already-bought rank step and the bounded global fee
after the first purchase. StateManager and the Guild shop share total-rank
context, refunds reconstruct exact spend from persisted ranks, and the battery
track remains non-refundable and isolated. Validation covers first/second and
cross-upgrade purchases, max-rank rejection, insufficient gold, refund, and
battery isolation; broader manual shop QA remains RG-06.

## Non-negotiable engineering constraints

- Keep deterministic gameplay independent of DOM, VS Code, wall-clock timers, and network sources.
- Runtime-validate telemetry, persistence, content registries, and every IPC boundary.
- Preserve single-owner rewards and idempotent host persistence.
- Keep exact and estimated telemetry distinct; never claim heuristic counts are exact.
- Do not retain prompts, model output, raw workspace/terminal/trace content, credentials, or authorization headers.
- Bind listeners to loopback, opt in explicitly, bound payload/queue/memory/work, handle conflicts, and dispose on deactivation.
- Honor CSP, keyboard access, focus, VS Code theme tokens, and reduced motion.
- Keep entity, effect, and queue counts bounded. No performance target is required beyond bounded-resource stability.
Manual visual and true
Extension Development Host reconnect evidence remains RG-06/platform-limited.

The current release-gate count supersedes the earlier 234-test checkpoint:
**237 tests** pass across 26 files, with typecheck, lint, build, e2e activation
smoke, package, production audit, and `git diff --check` green.

### Latest RG-04 chest rarity-weight slice - 2026-08-02

Chest rewards now use one seeded weighted pool across eligible owned weapons and
passives after max-rank and Banish filtering. Registry rarity values are
data-owned and mapped from the retained Vampire Survivors references (current
base weapon values include 100/80/70/1 for Whip/Magic Wand/Knife, Runetracer,
Garlic, and Bone; passive values are recorded in `passives.json`). Focused
registry/simulation coverage proves source weights are loaded, cross-type
selection is possible, low-rarity items remain possible, and same seeds replay
the same reward. Exact Code Dungeon per-chest tier probabilities and manual
chest-result evidence remain open; P7 remains active.

The focused and full unit suites, synthetic suite, typecheck, lint, build, e2e
activation smoke, VSIX package, production dependency audit, and
`git diff --check` must be rerun and recorded after this slice before any next
RG-04 or RG-02 change.

**Gate result (2026-08-02):** 239 unit tests pass across 26 files and 109
synthetic tests pass across 4 files. Typecheck, lint, build, e2e activation
smoke (2 passing), package, `npm audit --omit=dev --audit-level=high` (0 high
vulnerabilities), and `git diff --check` are green. Exact Code Dungeon chest
tier probabilities and manual visual chest-result evidence remain open.

### Latest unattended slice - 2026-08-03

RG-02 now includes the Fire Wand -> Hellfire family. The implementation is
registry/data-owned, uses the existing bounded fan and random-target sequence
strategies, and adds tests for authored rows, source rarity, Duration ownership,
Hellfire cadence/pierce, upgrade copy, and the late-chest evolution gate. Source
references are retained in the parity matrix and weapon mapping. Fire Wand wall
blocking, exact Hellfire wall behavior, remaining weapon families, and manual
visual evidence remain open. The next code slice is RG-04 exact chest-tier
probability verification or a dated limitation record if the source does not
publish Code Dungeon-specific values. The retained [chest-tier decision](decisions/chest-tier-probabilities.md)
records that the source describes chest-specific chances but publishes no Code
Dungeon values, so the bounded provisional table remains unchanged.

### Latest unattended slice — 2026-08-03 (Axe family)

The RG-02 weapon expansion now includes `battle_axe` → `scythe_of_doom`.
Registry-owned Axe rows, rarity, evolution, and Death Spiral cadence are
covered by deterministic registry/simulation/chest/upgrade-copy tests. Queued
fan state persists its launch angle and authored Amount; host checkpoints and
webview snapshots reject incomplete or mismatched fan queues, protecting pause,
reload, and replay behavior without an ID-specific simulation branch. The
source's vertical arc/gravity and Death Spiral's indefinite lifetime remain
explicit approximations (bounded to a 30-second domain lifetime).

The current gate is **242 unit tests** across 26 files and **111 synthetic
tests** across 4 files. Typecheck, lint, build, e2e activation smoke (2
passing), VSIX package, `npm audit --omit=dev --audit-level=high` (0 high
vulnerabilities), and `git diff --check` are green. The next step remains
source verification for the next weapon family or the retained chest-tier
limitation; do not start deferred assets/content before the first-stage gate.

### Latest unattended slice — 2026-08-03 (Cross family)

RG-02 now includes `celestial_cross` → `heaven_blade`, evolved with the new
validated Clover Luck passive. Cross/Heaven Sword source anchors are captured
in the registry and retained mapping; the generic boomerang projectile stores
origin and return phase, turns after hit/bounded travel, and exits at the hero.
Host checkpoint and webview snapshot validation reject incomplete state or
boomerang fields on other patterns. Intermediate rows, finite Pierce/lifetime,
critical hits, Pool Limit, and wall/spin presentation remain explicit partials.

The current gate is **243 unit tests** across 26 files and **112 synthetic
tests** across 4 files. Typecheck, lint, build, e2e activation smoke (2
passing), VSIX package, production audit, and `git diff --check` are green.

### Latest unattended slice — 2026-08-03 (King Bible family)

RG-02 now includes `orbiting_grimoire` → `unabridged_codex`. The retained King
Bible and Unholy Vespers references are recorded in the weapon mapping and
parity matrix; registry rows cover the eight-level base progression, rarity,
Spellbinder evolution, and evolved combat anchors. The generic orbit strategy
persists angle, radius, and angular speed, follows the moving hero, and is
validated at host checkpoint and webview snapshot boundaries. Radius is capped
at 180 world units and a 30-Pierce safety envelope bounds resource use. Shared
hitbox-delay reset, page-fall presentation, and exact Pool Limit behavior remain
open parity work. The current gate is **243 unit tests** across 26 files and
**112 synthetic tests** across 4 files; all release gates are green.

### Latest unattended slice — 2026-08-03 (Santa Water family)

RG-02 now includes `alchemist_fire` → `philosophers_potion`. The retained Santa
Water/La Borra sources are recorded in the weapon mapping and parity matrix;
registry rows cover the eight-level base progression, rarity, Attractorb
evolution, 0.3-second release interval, Pool Limits 20/30, and 0.5-second
Hitbox Delay. The generic pool strategy stores stationary world zones, applies
bounded per-target cooldown ledgers, and evicts the oldest same-weapon zone at
the limit. Host checkpoint and webview snapshot validation cover the new state.
Bottle-fall, zone-growth, and full modifier interactions remain open parity
work. The current gate is **243 unit tests** across 26 files and **112 synthetic
tests** across 4 files; all release gates are green.
