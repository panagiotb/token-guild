# Vampire Survivors parity comparison and backlog

Reviewed against the production code and tests on 2026-08-02. This is a base-game comparison, not a DLC plan. The retained [mapping collection](plans/Vampire%20Survivors%20Mapping/00_OVERVIEW_AND_ARCHITECTURE.md) supplies candidate terminology and research leads; it is not proof that a mechanic is implemented or source-verified.

## Accepted divergence and retired decision

Only one departure is currently approved:

1. **Token battery gameplay:** normalized token telemetry charges an upgradable battery; active/idle drain and recharge lockout gate the run.

The former Token Guild gold divergence was withdrawn on 2026-08-02. XP-gem gold and battery-overflow gold have now been removed; destructible light sources are the first replacement slice, while full base-game drops and end-state rewards remain open. Existing wallet balances are preserved because historical sources cannot be reconstructed reliably.

Telemetry must not otherwise control movement, damage, attack speed, XP, gold, enemies, character passives, chests, bosses, victory, defeat, or the authored stage clock without a new decision record.

## Current implementation comparison

| System | Verified current state | Base-game direction | Assessment |
| --- | --- | --- | --- |
| Core combat | Deterministic movement, auto-attacks, projectiles/areas, damage, knockback, contact damage, invulnerability | Preserve and deepen weapon-specific survivor combat | Working foundation |
| Stage | Data-owned Code Dungeon selection with 30-minute duration, open topology, waves, elites, final threat, victory/defeat | Authentic cadence, topology, unlock, and encounter handling | Selection/host contract working; parity details partial |
| Heroes | Six mapped heroes with starting weapons/stats and simple unlock records | Verified per-character traits, identity, and larger base roster | Partial |
| Weapons/passives | Eleven weapon patterns/level tables, passive pool, bounded slots, ten evolution recipes | Verified tables, complete behavior, broader base pool | Partial |
| XP and gold | XP gems grant XP only; battery overflow is capped with no gold | Gold comes from verified light sources, collected elite drops, chests, eligible level/end rewards, and later base-game systems | First replacement slice; full parity open |
| Tactical pickups | Elite drops can produce healing, magnet, freeze, screen-clear, and gold; collection owns effects | Destructible light sources and elite drops use deterministic bounded effects; full verified drop weights remain open | First production slice |
| Chests | Each chest identity can grant its own deterministic item/evolution and 60-500 base gold; a stage-owned base tier plus independent 5-item/3-item checks are multiplied by total Luck in descending order; duplicates are idempotent | Verify exact per-chest chances, add additional-stage tables, and deepen chest presentation | Working contract; parity details open |
| Meta progression | Supported PowerUps/refund and battery are visible; host calculates purchase costs | Broader verified unlock flow and host-owned run rewards | Working foundation |
| Level-up actions | Reroll/Skip/Banish controls show charges and operate in the map overlay | Further accessibility and interaction coverage | Working foundation |
| Stats | Duration, Luck, Greed, Curse, and Revival now have simulation effects; Curse changes enemy speed/density and Luck affects source/chest rolls | Verify balance and source parity | Working foundation |
| Telemetry | Synthetic 100 tokens/second by default; opt-in bounded localhost `/v1/traces` and Codex-style `/v1/logs` JSON/protobuf adapters; scalar numeric input/output/cache/reasoning fields; per-source ledger; host-owned synthetic and OTLP dispatch | Prove supported Codex OTel log capture and live producer compatibility; keep all sources additive and orthogonal outside battery gating | Authority and binary/JSON slices implemented; live producer remains open |
| Presentation | Canvas silhouettes, feedback/audio, pause, summary, local PNG export | More readable production art/UI after mechanics are solid | MVP foundation |
| Persistence/security | Validation, migration, duplicate run IDs, CSP, local resource roots, host-registered run sessions, narrow purchase/settings intents, host-derived run rewards, bounded host-owned synthetic/OTLP ingress | Full progression authority, including live-producer authorization and bounded run telemetry across all persistence/result paths | Reward derivation and first telemetry authority slice are host-owned; live-producer evidence remains open |
| QA | 227 unit tests including token-free jsdom webview interactions for dialogs, level-up actions, summary/export, telemetry status, host-only rendering before snapshot arrival, host snapshot adoption, host-action error recovery, collected-chest presentation, chest simulation pause, revival overlay/action, persistent finale status/countdown, paused level-up overlay checkpoint restore/action sequencing, rejected-action retry recovery, deterministic host replay, fixed-step cadence, centralized simulation budgets, detached checkpoint restore/replay parity, corrupted checkpoint numeric-state rejection, malformed inventory/entity/ledger shape rejection, malformed projectile and aura hitbox cooldown rejection, bounded checkpoint storage/wallet isolation/reset cleanup, versioned progression-domain round-trip and interrupted-write fallback, sequenced duplicate/future-intent rejection, concurrent restore coalescing, stale webview lifecycle rejection, provider short/long-running provider disposal/recreation replay recovery, host-run budget, host-owned synthetic/OTLP dispatch, bounded/forged telemetry rejection, selected-stage propagation, unknown-stage rejection, registry-bound level-up checkpoint validation, validated stage perimeter/scaling/combat/finale contracts, validated light-source/elite drop tables, independent elite-drop chance/reward rolls, explicit elite gold-source ledger ownership, zero/high Luck and Greed ownership, Curse scaling and spawn cadence, authored weighted light-source gates, one-second light-source cadence/cap replacement, collection-owned tactical effects and duplicate pickup IDs, Armor minimum-one contact damage, timed 120 ms knockback, XP gem tier boundaries and 400-gem condensation, over-cap inventory normalization, registry-derived base-weapon choice coverage, directional/facing weapon aim, Whip-family hero-anchored slash, Whip-derived Speed/Duration ignore flags, Magic Wand/Arcane Bolt targeted Amount sequence, Thousand Blades facing sequence/release aim, Magic Wand/Knife-derived Duration-ignore flags, Garlic-like per-target aura cooldown, Bouncing Arrow infinite-pierce/edge-reflection/hitbox-delay, No Future edge-bounce/retaliation explosion, Bone reflection/retention, stale/invalid level-up card rejection, late-chest evolution eligibility, explicit evolved-weapon patterns/stats, exact registry-backed level-up descriptions, every registered passive stat at rank one, Pandora's Box rank boundaries, host-side legacy/current-schema meta-upgrade normalization, stage-owned chest tier checks with total-Luck multiplication, gold ledger total reconciliation, pickup attraction, chest-tier/gold, stage-reward/Greed boundary, pre-finale/finale revival choice, Coin Bag fallback, Luck-driven fourth choices, knockback-resistance, authored wavy enemy movement, camera-relative off-screen spawning and boss relocation, weighted-choice/owned-item Luck preference, Area behavior, and final-threat completion timing, plus explicit summary/export Greed-excluded stage basis, plus build/package and activation smoke | Full VS Code DOM interactions and recorded manual matrix | Interaction gap |

**Current gate note (2026-08-03):** 243 unit tests pass across 26 files and
112 synthetic tests pass across 4 files. Chest rewards now use registry-owned
source rarity weights after owned/max-rank/Banish filtering; exact stage
probabilities and manual visual evidence remain open.

## Ordered backlog

### Next: finish P6 blockers, then P7

The audited [P6 plan](plans/NEXT_DEVELOPMENT.md) still has authority, interaction, pickup/stat, and recorded-QA blockers. Its successor is the dependency-ordered [P7 full-game roadmap](plans/P7_FULL_GAME_ROADMAP.md), with the executable remaining-gap sequence retained in [P7_GAP_IMPLEMENTATION_PLAN.md](plans/P7_GAP_IMPLEMENTATION_PLAN.md). P7 also resolves camera/world behavior, telemetry capture, gold parity, character-selection cleanup, architecture, complete base-game mechanics, and deferred asset indexing.

1. add deterministic browser/webview interaction tests for start, movement, focus, overlays, pause, purchase, refund, and export;
2. make run reward recording host-authoritative instead of accepting client-calculated gold/tokens;
3. complete the recorded narrow/wide manual QA matrix and update the manual with any remaining limits.

### First-slice parity review

- verify the six hero traits, six weapon tables, passives, evolution recipes, wave timings, enemy stats, XP curve, and chest rules against current authoritative base-game sources;
- correct any simplified rule that is not the single accepted battery divergence;
- improve end-stage sequencing and reward presentation;
- replace remaining development-oriented labels/silhouettes only with original or provenance-approved assets.

### Later base-game work

- additional base stages and roster;
- broader weapon/passive/evolution pool;
- relic progression and collection/discovery views;
- Arcanas/Darkanas and advanced unions;
- Hyper, Hurry, Inverse, Endless, Limit Break, Golden Eggs, merchant, bestiary, and secrets;
- secret characters and secret weapons.

### Explicitly outside MVP

- all DLC;
- marketplace publication automation and external asset purchases/imports;
- Cursor/Windsurf certification, web extensions, and localization;
- performance targets beyond bounded-resource stability.

## Historical milestone record

The original execution plans are retained permanently:

- [P0 rules and combat](plans/p0-rules-and-combat.md)
- [P1 stage loop](plans/p1-stage-loop.md)
- [P2 pickups, treasure, and evolution](plans/p2-pickups-treasure-evolution.md)
- [P3 meta progression and unlocks](plans/p3-meta-progression-unlocks.md)
- [P4 production telemetry](plans/p4-production-telemetry.md)
- [P5 presentation and game feel](plans/p5-presentation-and-game-feel.md)

Their completion means the scoped foundation and recorded tests passed at that time. It does not mean full base-game parity or that every engine helper is reachable from the shipped UI.
