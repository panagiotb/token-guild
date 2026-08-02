# Base-game mechanics matrix

**Status:** living implementation contract, seeded 2026-08-02. “Verified” means the rule has a cited source and a deterministic test target; “Partial” means the current MVP has an explicit, tested slice but is not yet base-game complete. DLC is excluded. The only approved Token Guild divergence is the token battery/play-time constraint.

The current stat-contract slice also makes Amount additive: a weapon keeps its
authored projectile count and each Amount point above the baseline adds one
projectile. Detached host/webview boundaries also prove canonical class
base-stat provenance and reject extreme finite combat values before restore.
The character/PowerUp/item Amount bonus is normalized to the source-backed cap
of 10 before weapon projection. Because the domain stores a baseline-inclusive
value of 1, its internal stat maximum is 11; the shared policy is enforced by
simulation, checkpoint, and snapshot boundaries. These are covered by shared
math, simulation, checkpoint, and snapshot regressions; broader base-game stat
caps remain `Partial` until source-backed balance work is complete.

Every spendable `META_UPGRADES` entry now has rank-one and maximum-rank
projection coverage, including multiplicative max-health, movement, and magnet
effects. A production-shaped OTLP input is also covered as stat-neutral; this
guards the approved telemetry/battery divergence from becoming a combat
modifier.

The RG-03 stat correction now follows the cited [PowerUps](https://vampire-survivors.fandom.com/wiki/PowerUps),
[Max Health](https://vampire-survivors.fandom.com/wiki/Max_Health),
[Move Speed](https://vampire-survivors.fandom.com/wiki/Move_Speed), and
[Magnet](https://vampire-survivors.fandom.com/wiki/Magnet) rules:
Guild Agility contributes +5% movement speed per rank (+10% at rank 2), while
Guild Duration contributes +15% effect duration per rank (+30% at rank 2).
The authored base Magnet is 30. Guild Vitality multiplies Max Health by 1.1 per
rank, and Heart of Vitality multiplies the current total by 1.2 per level;
these effects are applied multiplicatively after class base health.
Token Magnetism follows the level-specific multiplicative Attractorb sequence
(1.5×, 1.995×, 2.49375×, 2.9925×, 3.980025×), and the Magnet PowerUp compounds
its 1.25× rank multiplier.
The late Code Dungeon Infinite Loop Fiend speed is bounded to preserve escape
headroom after the stage minute curve; broader stat formulas and balance remain
`Partial`.

The Whip-family first-roster slice is now a hero-anchored forward slash for
Broadsword and Excalibur. Its facing vector is retained for collision direction,
the hitbox remains anchored for the authored lifetime, and Speed/Duration are
ignored as required by the cited Whip contract. This is intentionally a bounded
simulation approximation; sprite/animation fidelity and the remaining weapon
families stay `Partial`.

The Knife-family slice now uses a facing-only rapid stream rather than the
former generic fan spread. Throwing Daggers preserve the hero's last facing and
queue Amount shots at the source-backed 0.1-second interval, reducing to 0.08,
0.06, and 0.04 seconds at the authored rank breaks. The Thousand Edge
evolution declares six projectiles and a bounded 0.05-second release interval;
queued releases resolve the current facing at release time.
This follows the cited [Knife](https://vampire-survivors.fandom.com/wiki/Knife)
and [Thousand Edge](https://vampire-survivors.fandom.com/wiki/Thousand_Edge)
behavior while retaining Token Guild's authored damage scale.

Evolved projectile triggers are registry-owned as well: No Future declares its
bounce/contact explosion flags and area multiplier in `weapons.json`, so the
simulation no longer relies on a weapon-ID special case. Registry validation
rejects triggerless or unsafe explosion definitions.

| Area | Reference/source (checked) | Base-game rule to verify | Token Guild path | Tests/evidence | Status |
| --- | --- | --- | --- | --- | --- |
| Input | [Stages](https://vampire-survivors.fandom.com/wiki/Stages) | Movement continues while attacks are automatic; pause stops simulation. | `InputSnapshot` enters `tick`; keyboard adapter owns DOM keys; host-owned `RunState.paused` is changed only by sequenced `RUN_ACTION` pause/resume intents and preserved in snapshots/checkpoints. | `simulation.test.ts`, `hostRun.test.ts`, `validation.test.ts`, `snapshot.test.ts`, `keyboard.ts`, `pause.test.ts` | Partial |
| Camera/topology | [Stages](https://vampire-survivors.fandom.com/wiki/Stages) | Stage space is larger than the viewport; stage-specific topology must be data-driven. | Hero-following camera and repeating Code Dungeon grid; no viewport walls. | `camera.test.ts`; manual far-travel checkpoint | Partial |
| Stage timer/end | [Stages](https://vampire-survivors.fandom.com/wiki/Stages), [The Reaper](https://vampire-survivors.fandom.com/wiki/The_Reaper), checked 2026-08-02 | A timed stage enters its end-state threat sequence; the Reaper is not ordinary farmable content and another appears each minute after the limit. Completion pays the documented stage reward and revival bonus. | Code Dungeon spawns invulnerable timeout threats at the limit and each later minute; the map presents the remaining final-threat deadline, contact resolves early, or a bounded one-minute final-threat window resolves, paying `stageCompletion`; summary/export records finale reach, reason, duration, and threat count. | final-threat/repeated-threat/stage-reward/timer-window, snapshot, summary, share-card, and webview presentation tests | Partial |
| Hero stats | [Luck](https://vampire-survivors.fandom.com/wiki/Luck), [Cooldown](https://vampire-survivors.fandom.com/wiki/Cooldown), [Might](https://vampire-survivors.fandom.com/wiki/Might), [Area](https://vampire-survivors.fandom.com/wiki/Area), [Speed](https://vampire-survivors.fandom.com/wiki/Speed), [Duration](https://vampire-survivors.fandom.com/wiki/Duration), [Recovery](https://vampire-survivors.fandom.com/wiki/Recovery), [Torrona's Box](https://vampire-survivors.fandom.com/wiki/Torrona%27s_Box), checked 2026-08-02 | Base stats, growth and caps are class/content data; Luck affects authored random outcomes. Total Cooldown has a 10% lower bound. Total Might/Area are capped at 1000% and total Projectile Speed/Duration at 500% (represented as bonus caps of +900%/+400% in this domain). Recovery regenerates HP per second and increases collected healing additively. The Torrona's Box equivalent grants +4% Omni at rank 1, +3% per rank through rank 8, then +100% Curse at rank 9; Omni is Might, projectile Speed, Duration, and Area. | `classes.json`, `passives.json` per-level `levelEffects`, `passiveEffectsAtRank`, `recalculateStats`, `calculatePickupHealing`, passive/meta registries, and shared stat/cooldown policies. | registry passive-effect validation, rank-one/eight/nine simulation tests, exact upgrade-copy tests, Recovery regeneration/collection tests, cooldown-floor and stat-cap math regressions | Partial |
| Revival | [Revival](https://vampire-survivors.fandom.com/wiki/Revival), [Stages](https://vampire-survivors.fandom.com/wiki/Stages), checked 2026-08-02 | A death can consume a revival charge for 50% HP and a brief invulnerability window; unused/used charges affect end-stage rewards and a player-facing choice must not silently spend a charge. | Lethal contact enters `revival`; `reviveRun` consumes one charge for 50% HP plus 2 seconds of invulnerability, while `declineRevival` resolves defeat before the finale or victory during the finale. `RunState.revivalsRemaining` remains separate from derived `stats.revival`. | simulation pre-finale/finale choice tests, host action test, snapshot phase test, production overlay test | Partial |
| Enemy cadence | [Enemies](https://vampire-survivors.fandom.com/wiki/Enemies), [Curse](https://vampire-survivors.fandom.com/wiki/Curse), checked 2026-08-02 | Waves specify minimums/intervals; Curse shortens spawn intervals and increases quantity, health, and speed, but does not directly increase enemy damage; enemies spawn just outside the screen, can despawn far away, ordinary enemies approach the hero, some authored families use a wavy approach, and persistent bosses return to the active screen. | Validated `stages.json`/`enemies.json` data now owns the current Code Dungeon roster, wave windows/intervals/densities, per-minute health/damage/speed scaling, spawn radii, persistence radius, and finale transition; `scheduleWaves` and `simulation.ts` consume the contract, while `worldPolicies.ts` retains safe generic defaults for other callers. Curse is applied to health/speed and wave cadence/density; the stage's authored minute curve remains the only enemy-damage scaling. The 192-entry simulation/IPC envelope is derived from the 54-enemy maximum overlap at the current +200% maximum Curse stack (162 valid active enemies plus bounded headroom), so the authored waves are not truncated at the former 60-entry ceiling. | simulation wave/cap/cadence, Curse damage-isolation and high-density envelope, perimeter/viewport, movement-family, relocation, registry-contract, snapshot, and replay tests | Partial |
| XP gems | [Experience Gem](https://vampire-survivors.fandom.com/wiki/Experience_Gem), [Growth](https://vampire-survivors.fandom.com/wiki/Growth), [Level up](https://vampire-survivors.fandom.com/wiki/Level_up), checked 2026-08-02 | Enemy XP is collected from gems; blue gems hold up to 2 XP, green up to 9, red contains larger/coalesced values, and more than 400 gems condense into one red gem. Growth modifies collected XP; ordinary gem pickup does not create gold. The authored level requirement is 5 XP at level 1, `10L - 5` through 20, `13L - 6` through 40, and `16L - 8` thereafter, with +600/+2400 threshold additions and temporary +100% Growth at levels 20/40 that reverts at 21/41. | `pickupKindForXp`, `grantXp`, explicit `maxXpPickups: 400` condensation, `getXpRequiredForLevel`, `getThresholdGrowthBonus`, and `recalculateStats`; gold removed from gem collection. | simulation tier-boundary, Growth, collection, condensation, exact level-curve boundary (1/2/3/19/20/21/39/40/41), and threshold-growth reversion tests | Partial |
| Floor pickups | [Light source](https://vampire-survivors.fandom.com/wiki/Light_source), [Gold Coin](https://vampire-survivors.fandom.com/wiki/Gold_Coin_%28currency%29), checked 2026-08-02 | Destructible light sources spawn outside the visible play area, then drop one collectible. The researched first-stage table weights Gold Coin 50, Coin Bag 10, Floor Chicken 12, Orologion/Freeze 2, Vacuum 2, Rosary/Screen Clear 1, and Rich Coin Bag 1 with minimum levels; Luck changes rare weights but not the two common gold entries. Gold is collected from authored floor/light-source, elite-drop, and chest outcomes, not telemetry. Tactical effects resolve at collection and a pickup identity cannot pay twice. | `RegistryStage.dropTableId` selects a validated table in `src/game/data/drops.json`; `RunState.lightSources` (10 HP, bounded cap), projectile/aura damage, deterministic weighted/minimum-level resolution, Luck applied to rare entries, collection-owned `applyCollectedPickupEffect`/`goldSource` ledger, and bounded `collectedPickupIds` identity ownership across ticks. Elite drops use separate deterministic chance and weighted reward rolls from the selected bounded table and remain a separate `eliteDrops` gold source. Floor Chicken heals, Vacuum consumes current gems, Orologion freezes for 10 seconds, and Rosary removes regular enemies while preserving bosses/final threats. | registry table/reference validation, simulation weighted-table/gate/independent-roll, elite no-drop, explicit elite ledger ownership, Greed ownership, light-source, tactical-effect, duplicate-ID across ticks, legacy ledger migration, and snapshot/checkpoint bound tests | Partial |
| Treasure | [Gold Coin](https://vampire-survivors.fandom.com/wiki/Gold_Coin_%28currency%29), [Pickups](https://vampire-survivors.fandom.com/wiki/Pickups), [Luck](https://vampire-survivors.fandom.com/wiki/Luck), [Weapons](https://vampire-survivors.fandom.com/wiki/Weapons), [Level up](https://vampire-survivors.fandom.com/wiki/Level_up), checked 2026-08-02 | Chest identity is single-claim; chest gold is 60-500 before Greed; each stage owns a base tier and independent checks for level-3 (5-item) then level-2 (3-item) treasure, with total Luck multiplying each check before fallback to the base tier. Eligible owned weapon/passive rewards use deterministic seeded weighted selection from source rarity values, with Banish/max-rank filtering before each roll. Exact per-chest chances remain to be verified. | `RegistryDropTable.chest`, Code Dungeon `drops.json`, `RegistryWeapon/RegistryPassive.rarityWeight`, `resolveChestTier`, `claimedChestIds`, `chestRewards`, `chestGoldRewards`, `chestRewardTiers`, `openTreasureChest`, and the in-map reward banner. | registry validation, deterministic tier/weighted-pool coverage, seeded replay, Luck multiplier boundary, duplicate/independent, range, and webview presentation tests | Partial |
| Gold/Greed | [Gold Coin](https://vampire-survivors.fandom.com/wiki/Gold_Coin_%28currency%29), [Greed](https://vampire-survivors.fandom.com/wiki/Greed), [Stages](https://vampire-survivors.fandom.com/wiki/Stages), checked 2026-08-02 | Greed modifies pickup and chest gold as an additive modifier to the 100% base multiplier, including negative character modifiers; the 500-gold stage-completion reward and revival bonus are end-state rewards and are not Greed-scaled. Battery overflow and XP are not gold; maxed level-ups can fall back to coins. | `awardGold` applies bounded `1 + Greed` at authored pickup/chest/level-up boundaries; stage completion calls the same ledger with Greed disabled; elite drops are tagged `eliteDrops`; battery overflow is diagnostic. | battery, source, elite-ledger, positive/negative Greed, chest, unmodified stage-reward, and Coin Bag tests | Partial |
| Knockback/resistance | [Enemies](https://vampire-survivors.fandom.com/wiki/Enemies), [Knockback](https://vampire-survivors.fandom.com/wiki/Knockback), checked 2026-08-02 | Weapon knockback is reduced by authored enemy resistance and briefly reverses enemy movement; elite/boss behavior must not be identical to normal enemies. | Normal 0%, elite 40%, boss 90% resistance in content spawn and hit resolution; a resisted hit retains the established displacement and adds a deterministic 120 ms reverse-movement window. | simulation resistance and timed-knockback tests | Partial |
| Contact damage/armor | [Armor stat](https://vampire-survivors.fandom.com/wiki/Armor_%28stat%29), [Enemies](https://vampire-survivors.fandom.com/wiki/Enemies), checked 2026-08-02 | Armor reduces incoming contact damage by one per point, but ordinary damage cannot fall below one; contact damage is applied on proximity. The exact internal player damage cadence is not documented by the reference, so the current 8-unit radius and 0.5-second protection window remain an explicit Token Guild stage contract pending stronger evidence. | `RegistryStage.combat` owns contact radius/invulnerability values; `Math.max(1, enemy.damage - armor)` handles ordinary contact and a separate final-threat rule bypasses ordinary damage. | registry combat-policy validation, armor minimum-one, contact-radius, and contact-invulnerability tests | Partial |
| Level-up weighting | [Luck](https://vampire-survivors.fandom.com/wiki/Luck), [Stages](https://vampire-survivors.fandom.com/wiki/Stages), checked 2026-08-02 | Choices are unique, respect inventory limits/maxed entries, Luck can expose a fourth option, and owned-item checks use `1 + 0.3x - 1 / totalLuck` (x=1 on odd levels, x=2 on even levels); the check is performed twice. | `getOwnedItemChoiceChance` resolves the parity/Luck chance; two deterministic checks prefer eligible owned weapon/passive cards, then remaining slots fill from the shared pool. | math boundary, weighted-choice, owned-item preference, max-rank exclusion, and fourth-option simulation tests | Partial |
| Telemetry | [Codex observability](https://learn.chatgpt.com/docs/config-file/config-advanced#observability-and-telemetry), [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference), checked 2026-08-02 | Optional OTel is additive, batched, and prompt text is redacted by default; official OTLP/HTTP supports `binary` or `json`, and `codex.sse_event` completion records carry token counts. | Loopback `/v1/traces` and `/v1/logs` JSON/protobuf fixture adapters plus synthetic toggle; bounded dependency-free protobuf decoding; numeric input/output/cache/reasoning normalization; host reports bounded health, accepted count, last event time, endpoint, and safe startup errors; accepted synthetic/OTLP events are host-dispatched and production webview telemetry intents are rejected; no scraping. Live producer compatibility remains unproven. | `otlpServer.test.ts`, `otlpProtobuf.ts`, `tokenBus.test.ts`, `webviewInteraction.test.ts`, `hostRun.test.ts`, `extensionRecovery.test.ts`, planned G-06 producer smoke | Partial |
| Upgrade choices | [Stages](https://vampire-survivors.fandom.com/wiki/Stages), [Level up](https://vampire-survivors.fandom.com/wiki/Level_up), [Skip](https://vampire-survivors.fandom.com/wiki/Skip), checked 2026-08-02 | Level-up pauses play; choices, reroll, skip, banish, inventory and effects are authored. Skip consumes a charge and grants 20% of the XP required for the next level. After the final choice closes the level-up screen, the character receives a brief protection window before normal contact damage resumes. | `chooseUpgrade`/`skipLevelUp`, action helpers, registry-backed exact weapon/passive descriptions, and custom card presentation. Skip applies a direct 20% next-level XP award through the simulation progression boundary; final selection reuses the stage-owned 0.5-second contact-protection window as the first-stage approximation, keeping both rules bounded and replay-safe. | simulation/webview interaction/helper tests, including Skip XP, queued-level handling, immediate post-selection contact protection, and expiry | Partial |

The [Banish reference](https://vampire-survivors.fandom.com/wiki/Banish), checked
2026-08-02, keeps a banished item out of later level-up choices and treasure
chest upgrades for the rest of the run. The implementation now persists one
canonical item identity alongside legacy card IDs, rejects Banish on fallback
heal/coin cards, and applies the same predicate to card generation,
Reroll/Skip availability, chest upgrades, and evolution. Focused simulation
and host checkpoint regressions pass; broader weapon/passive parity remains
Partial.
| Weapons/passives | [Evolution](https://vampire-survivors.fandom.com/wiki/Evolution), [Whip](https://vampire-survivors.fandom.com/wiki/Whip), [Garlic](https://vampire-survivors.fandom.com/wiki/Garlic), [Soul Eater](https://vampire-survivors.fandom.com/wiki/Soul_Eater), [Magic Wand](https://vampire-survivors.fandom.com/wiki/Magic_Wand), [Holy Wand](https://vampire-survivors.fandom.com/wiki/Holy_Wand), [Knife](https://vampire-survivors.fandom.com/wiki/Knife), [Thousand Edge](https://vampire-survivors.fandom.com/wiki/Thousand_Edge), [Runetracer](https://vampire-survivors.fandom.com/wiki/Runetracer), [Bone](https://vampire-survivors.fandom.com/wiki/Bone), [Stages](https://vampire-survivors.fandom.com/wiki/Stages), checked 2026-08-02 | Each weapon/passive has its own behavior, authored maximum rank, and evolution requirements; a late chest can evolve a maxed weapon when its required passive is present. Directional weapons preserve facing while targeted weapons acquire the nearest eligible enemy. Whip-derived attacks use a frontal hero-originating slash and ignore Projectile Speed and Duration; Magic Wand and Knife-derived attacks ignore Duration. The Magic Wand analogue releases its first targeted projectile immediately, then queues additional Amount projectiles at a 0.1-second interval and reacquires the nearest eligible target at each release; Holy Wand is the cited evolved reference for that sequence. Knife/Throwing Daggers now use facing-only launch and queue Amount shots at a 0.1-second interval, while the Thousand Edge evolution queues six faced-direction projectiles at a 0.05-second interval, resolving the current facing at each release. Garlic-like auras damage an enemy once, then use their weapon cooldown as a per-target hit delay even if that enemy leaves the area. The Runetracer analogue (Bouncing Arrow) launches in random directions, uses infinite pierce and screen-envelope reflection, and applies a finite hitbox delay; its No Future evolution adds Area-scaled explosions on bounce and retaliatory contact, with +10% retaliatory explosion damage per Armor point, capped at +500%. Bone throws a random-direction projectile that bounces from enemies and the screen envelope until Duration expires. | Registry max levels, inventory normalization, max-level card exclusion, shared registry-derived card eligibility, checkpoint card validation, 10-minute chest evolution gate, required-passive checks, data-owned `aim`, pattern, projectile interval, and Speed/Duration-ignore fields, explicit first-roster evolution attack patterns and authored evolved level rows, hero-anchored slash/facing attacks plus bounded arc presentation, bounded aura per-target hit cooldown ledgers, targeted Amount sequence queue/reacquisition, facing sequence queue/release aim, Bouncing Arrow random-pierce/edge-reflection/hitbox delay, No Future Armor-scaled retaliation, and Bone's duration-bound enemy/edge reflection. | registry flag/interval validation, aim validation, eligibility, checkpoint card validation, directional/targeted/slash/random-launch projectile tests, Arcane Bolt Amount sequence and target-reacquisition regression, Throwing Daggers interval/facing stream, Thousand Edge facing sequence/release-aim regression, Broadsword/Excalibur slash and Speed/Duration-ignore regressions, `slashVisualGeometry` bounds tests, Arcane Bolt/Throwing Dagger Duration-ignore regression, malformed sequence state at host/snapshot boundaries, aura re-hit timing, malformed aura ledger checkpoint/snapshot rejection, Bouncing Arrow infinite-pierce/re-hit timing, Bone reflection/retention, evolved-pattern/stat, over-cap normalization, level-up cap, and evolution tests | Partial |
| Persistent projectile hitbox delay | [Runetracer](https://vampire-survivors.fandom.com/wiki/Runetracer), [Weapons](https://vampire-survivors.fandom.com/wiki/Weapons), checked 2026-08-02 | The same enemy cannot be damaged by one persistent projectile again until its authored Hitbox Delay; the current Runetracer analogue uses a bounded 0.5-second delay. | Ricochet projectiles retain a bounded per-target cooldown ledger; ordinary pierce and Bone's separate reflection/hit identity rules remain distinct. Legacy checkpoints may omit the optional ledger and restore with an empty map. | simulation re-hit timing, host checkpoint malformed/oversized cooldown rejection, webview snapshot malformed cooldown rejection | Partial |
| Evolved ricochet explosion | [NO FUTURE](https://vampire-survivors.fandom.com/wiki/NO_FUTURE), checked 2026-08-02 | The evolved Runetracer explodes when it bounces and in retaliation; the current MVP slice applies one Area-scaled explosion at each camera-envelope edge bounce and when contact damage lands. | `no_future` keeps the ricochet movement/hitbox-delay contract and applies an authored-radius area damage pass on edge bounce or hero contact; the explosion is ledgered under the same weapon and emits a bounded host-owned visual effect with simulation-time expiry. | simulation edge-bounce/retaliation, visual-effect expiry/cap, host checkpoint, and webview snapshot validation regressions | Partial |
| Persistence | [Stages](https://vampire-survivors.fandom.com/wiki/Stages) | Unlocks, wallet, settings and collections survive reload and migrate safely. | Host `StateManager`; independently versioned wallet, collection, unlock, settings, battery, upgrade, and run-history domains use a ready/write marker; legacy aggregate records remain as a lossless fallback; active checkpoints stay detached. | validation/state tests, domain round-trip, interrupted-write fallback, reset, checkpoint-isolation tests | Partial |
| Character/stage selection | [Stages](https://vampire-survivors.fandom.com/wiki/Stages) | Selection communicates starting weapon/trait/unlock and stage duration/topology/modifiers; irrelevant highest-level labels are not gameplay. | Hero selector explains starting weapon and trait cadence/cap without highest-level labels; hero unlock conditions are authored/validated in class data and applied by StateManager; Code Dungeon stage selector is data-owned and host-validated with duration/topology/modifier metadata. | UI layout/interaction, hero unlock registry/state tests, stage registry, validation, host session, snapshot/checkpoint tests | Partial |
| Advanced base systems | [Stages](https://vampire-survivors.fandom.com/wiki/Stages) | Modes, Arcanas, Limit Break, Eggs, secrets, merchant, collection, bestiary and co-op need individual child plans. | Not yet implemented. | Add per-system tests before coding. | Deferred |

## Source and evidence rules

### Current first-stage weapon contract (2026-08-02)

The eleven currently selectable base weapons and ten evolved outputs each have
an explicit registry pattern and authored level-row cardinality. Registry
loading rejects missing/invalid attack metadata, and the table-driven registry
test covers row counts plus targeted aim ownership. Broader non-DLC weapon
families remain intentionally `Partial` under RG-08.

The late-chest evolution regression is also table-driven across all ten
currently authored recipes (Broadsword→Excalibur, Arcane Bolt→Archmage Staff,
Throwing Daggers→Thousand Blades, Bouncing Arrow→No Future, Aegis
Barrier→Sanctuary, Celestial Cross→Heaven Blade, and Orbiting Grimoire→
Unabridged Codex, and Alchemist Fire → Philosopher's Potion), proving the
shared 10-minute/max-rank/required-passive
eligibility boundary and identity-preserving reward history. This expands
coverage only; it does not claim broader base-game roster parity.

The light-source attempt chance is now part of each validated drop table:
Code Dungeon declares a 10% base chance and a 50% maximum after Luck scaling,
while the simulation retains the one-second attempt cadence and cap behavior.
Legacy tables use the same bounded defaults; exact stage-specific balance
remains `Partial` until independently verified.

The level-up action boundary also follows the source contract: Reroll and Skip
are unavailable when no eligible weapon/passive upgrade remains and the pool
has fallen back to healing/coin choices. The predicate is shared by simulation,
host action validation, and production rendering, preventing a charge-bearing
UI control from submitting an action that cannot produce an item choice.

- Re-check a source and date the row before implementing a disputed mechanic. Community references are research leads; record an official or directly observed rule when available.
- Every “Partial” row needs a focused success, boundary, duplicate/ownership, invalid-input, and teardown test before it can become “Verified”.
- Do not add a new divergence without a dated addendum to `P7_FULL_GAME_ROADMAP.md` and project-management approval.

### RG-04 cap/Luck evidence — 2026-08-02

The light-source row's capacity boundary is now executable: with the ten-source
cap full, Luck is removed from the next spawn-attempt probability, while the
replacement remains deterministic and perimeter-positioned. The simulation
regression compares identical seeded zero- and high-Luck runs. This closes the
ownership boundary only; stage-specific drop balance and chest probabilities
remain `Partial`.

The 2026-08-02 release gate after this regression reports **237 passing tests**
across 26 files; typecheck, lint, build, e2e activation smoke, package,
production audit, and `git diff --check` pass. Manual visual/accessibility and
stage-balance evidence are not implied by the automated gate.

### Host-owned pause boundary - 2026-08-02

The pause row is now owned by the run domain and extension host: sequenced
`pause`/`resume` actions update `RunState.paused`, snapshots/checkpoints retain
the value, and paused fixed steps do not advance gameplay or synthetic income.
Legacy checkpoints migrate to an explicit unpaused value. Simulation, host,
validation, snapshot, and webview interaction tests cover the boundary; real
host DOM/reconnect and manual visual evidence remain partial.

### Treasure reward-pool slice - 2026-08-02

`openTreasureChest` now resolves each reward from the shared eligible owned
weapon/passive pool using the seeded simulation RNG and each registry item's
source rarity weight. Current first-roster data is mapped from the retained
references: Whip/Magic Wand/Knife 100, Runetracer 80, Garlic 70, Bone 1;
passive values are authored in `passives.json` from the corresponding source
entries (including Hollow Heart/Pummarola 90, Empty Tome/Duplicator 50,
Crown/Stone Mask 80, Skull/Tiragisu/Torrona 40). This removes lexical-first
bias while preserving Banish, max-rank, identity, and replay boundaries.
The [Weapons reference](https://vampire-survivors.fandom.com/wiki/Weapons)
and [Level up reference](https://vampire-survivors.fandom.com/wiki/Level_up)
document rarity-weighted pools; Code Dungeon's exact per-chest probabilities,
additional-stage tables, and manual chest-result QA remain `Partial`. The
focused and full automated gates remain green.

### RG-03 max-health and base-magnet correction - 2026-08-02

The source-backed [Max Health](https://vampire-survivors.fandom.com/wiki/Max_Health)
contract is now reflected in derived state: base Magnet is 30, Guild Vitality
multiplies Max Health by 1.1 per rank, and Heart of Vitality multiplies the
current total by 1.2 per level. Rank-one/max-rank and combined multiplier
regressions cover 100 → 133.1 PowerUp health and 100 → 248.832 max-rank passive
health. The source-backed [Magnet](https://vampire-survivors.fandom.com/wiki/Magnet)
and Attractorb sequences remain multiplicative. Broader class/item stat parity
remains `Partial`.

### RG-10 PowerUp purchase-cost correction - 2026-08-02

The [PowerUps](https://vampire-survivors.fandom.com/wiki/PowerUps) price rule
is now host-owned and shared with the Guild shop: first purchase at the initial
price, later purchases use the same PowerUp's bought-rank base step plus
`floor(20 × 1.1^totalBoughtAfterPurchase)`. Refunds reconstruct the exact
persisted spend, and the battery purchase remains outside the PowerUp ledger.
Validation covers first/second and cross-upgrade fees, max-rank and
insufficient-gold boundaries, refund, and battery isolation. Manual shop
evidence remains `Partial` under RG-06.

### RG-02 Fire Wand/Hellfire family addendum - 2026-08-03

The source-backed [Fire Wand](https://vampire-survivors.fandom.com/wiki/Fire_Wand)
contract is now data-owned: rarity 80, eight authored levels (20 -> 90 damage,
three random fireballs, 0.75 -> 1.35 speed, 3-second cooldown), Duration is
ignored, and Spinach is the evolution requirement. The `fire_wand` registry
entry uses the bounded fan strategy to preserve the near-simultaneous fireball
arc. The `hellfire` evolution is rarity 1, level 1, 100 damage, two random
projectiles, 0.2-second sequence interval, Duration ignored, and pierce 99 for
pass-through behavior. Registry, card-copy, simulation cadence, and late-chest
evolution tests cover the family. Hellfire's random-target sequence is an
explicit first-stage approximation of the source's random meteors; wall
collision and sprite fidelity remain open under RG-02/RG-06.

### RG-02 Axe/Death Spiral family addendum — 2026-08-03

The retained [Axe](https://vampire-survivors.fandom.com/wiki/Axe) and
[Death Spiral](https://vampire-survivors.fandom.com/wiki/Death_Spiral) sources
were checked on 2026-08-03. `battle_axe` is rarity 100 with eight explicit
rows, Duration ignored, facing launch, and a 0.2-second interval between
Amount projectiles; `orb_of_expansion` evolves it into rarity-1
`scythe_of_doom`, whose level-one row is damage 60, Area 1.2, Speed 0.8,
Amount 9, 0.05-second interval, Pierce 1000, and bounded 30-second lifetime.

The shared fan strategy stores the release angle and authored Amount in
`WeaponState`, so a queued volley remains stable across pause, checkpoint,
snapshot adoption, and deterministic replay. Host and webview boundary tests
reject missing angle/total, invalid totals, and fan fields attached to a
non-fan weapon. This is a data/strategy ownership closure, not full physics
parity: vertical arc/gravity, Axe's exact Area multiplier, and Death Spiral's
indefinite lifetime remain `Partial`.

The current gate is **242 unit tests** across 26 files and **111 synthetic
tests** across 4 files; typecheck, lint, build, e2e activation smoke, package,
audit, and `git diff --check` are green.

### RG-02 Cross/Heaven Sword family addendum — 2026-08-03

The retained [Cross](https://vampire-survivors.fandom.com/wiki/Cross),
[Heaven Sword](https://vampire-survivors.fandom.com/wiki/Heaven_Sword), and
[weapon overview](https://vampire-survivors.fandom.com/wiki/Weapons/Overview_Stats)
sources anchor Cross at rarity 80, damage 5, Area 1, Speed 1, Amount 1,
Cooldown 2, and 0.1-second interval, with a nearest-target boomerang effect;
Heaven Sword is rarity 1 with damage 77, Area 1.2, Speed 2, Amount 1,
Cooldown 3.3, and 0.5-second interval. `celestial_cross` and `heaven_blade`
now own those registry contracts and evolve through `clover`.

The new generic `boomerang` strategy stores origin and return phase on each
projectile, reverses after a hit or bounded outbound travel, and removes the
projectile after it reaches the hero. Host checkpoint and webview snapshot
tests reject incomplete boomerang state or boomerang fields on other patterns.
Intermediate Cross level rows, finite Pierce/lifetime, critical hits, and wall
presentation are explicit `Partial` approximations; the source does not
publish all of those values in the retained overview.

The fresh gate after this family is **243 unit tests** across 26 files and
**112 synthetic tests** across 4 files; typecheck, lint, build, e2e activation
smoke, package, audit, and `git diff --check` are green.

### RG-02 King Bible/Unholy Vespers family addendum — 2026-08-03

The retained [King Bible](https://vampire-survivors.fandom.com/wiki/King_Bible),
[Unholy Vespers](https://vampire-survivors.fandom.com/wiki/Unholy_Vespers), and
[weapon overview](https://vampire-survivors.fandom.com/wiki/Weapons/Overview_Stats)
sources anchor the base weapon at rarity 80, damage 10, Amount 1, Cooldown 3,
and Duration 3, with authored rank increases to Area, Speed, Damage, Duration,
and Amount. Unholy Vespers is rarity 1 with damage 30, Area 1.75, Speed 1.5,
Amount 4, Duration 3, Cooldown 3, and knockback 4; Spellbinder is the required
passive.

Token Guild owns this as `orbiting_grimoire` → `unabridged_codex`. The generic
`orbit` strategy persists angle, radius, and angular speed, follows the hero in
world coordinates, and survives pause/checkpoint/snapshot validation. Radius is
bounded to 180 world units and the registry uses a 30-Pierce safety envelope so
an orbit cannot consume an unbounded entity budget. Shared hitbox-delay reset,
page-fall presentation, and exact Pool Limit behavior remain `Partial`.

The current gate remains **243 unit tests** across 26 files and **112 synthetic
tests** across 4 files; typecheck, lint, build, e2e activation smoke, package,
audit, and `git diff --check` are green.

### RG-02 Santa Water/La Borra family addendum — 2026-08-03

The retained [Santa Water](https://vampire-survivors.fandom.com/wiki/Santa_Water),
[La Borra](https://vampire-survivors.fandom.com/wiki/La_Borra), and
[weapon overview](https://vampire-survivors.fandom.com/wiki/Weapons/Overview_Stats)
sources anchor Santa Water at rarity 100, damage 10, Area 1, Duration 2,
Amount 1, Cooldown 4.5, interval 0.3, Pool Limit 20, and Hitbox Delay 0.5;
La Borra is anchored at damage 40, Area 2, Duration 4, Amount 4, Cooldown 4,
Pool Limit 30, and the same delay, requiring Attractorb.

Token Guild owns this family as `alchemist_fire` → `philosophers_potion`. The
generic `pool` strategy drops stationary world zones, targets the nearest enemy
for the first zone, distributes later zones around the hero, and stores a
bounded per-target hitbox ledger. Registry pool limits evict the oldest same-
weapon zone before an over-limit spawn; host and webview validation accept that
ledger only for pool/ricochet patterns. Exact bottle-fall, zone-growth, and
full modifier interactions remain `Partial`.

The fresh gate after this family is **243 unit tests** across 26 files and
**112 synthetic tests** across 4 files; typecheck, lint, build, e2e activation
smoke, package, audit, and `git diff --check` are green.
