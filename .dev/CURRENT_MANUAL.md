# Token Guild current functionality manual

Verified against `src/`, `package.json`, and the 243-test suite on 2026-08-03.
This manual describes behavior that is implemented and covered by the
production-shaped host/webview path. The parity matrix and P7 plans remain the
source of truth for work that is still partial or deferred.

## Product boundary

Token Guild is a VS Code desktop extension (`>=1.85.0`) with one activity-bar
Guild webview. The MVP is a Canvas/DOM survivor-style run with a Guild Hall,
Code Dungeon, persistent progression, pause/resume, and local PNG summary
export. DLC, secrets, marketplace assets, billing, and performance targets are
out of scope.

The only approved gameplay divergence is the Token Guild battery: telemetry
charges the battery and limits available play time. Telemetry does not grant
XP, gold, damage, movement, Luck, enemy changes, upgrades, or stage progress.
XP-gem and battery-overflow gold have been removed; historical wallet balances
are retained during migration.

## Token-free QA

All automated tests run without live tokens, secrets, public-network access, or
an external LLM:

```powershell
npm ci
npm run test:synthetic
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
npm run package
npm audit --omit=dev --audit-level=high
git diff --check
```

`test:e2e` starts an Extension Development Host and checks activation and view
registration. The supported host does not inject webview DOM clicks or force a
disconnect/reconnect, so those observations remain RG-06 manual evidence.

For a local run, press `F5`, open Guild, choose an unlocked hero and stage, and
select **Start dungeon run**. Move with arrow keys or `WASD`.

## Guild Hall and persistence

- New profiles start with Warrior and Code Dungeon.
- Hero selection explains each starting weapon and class trait; it does not
  display an irrelevant highest-run-level label. Locked heroes explain their
  registry-authored unlock condition.
- Stage selection is registry-owned. Code Dungeon is currently a 30-minute,
  open scrolling stage with no modifiers; the selected stage ID is validated by
  the host before a run starts.
- The Guild shop exposes bounded, registry-backed PowerUps with concrete
  effects, authored rank/cost limits, and refunds. PowerUp prices use the
  global base-price/rank-step fee rule; battery upgrades are a separate
  non-refundable purchase.
- Host-owned persistence stores wallet, collection, unlocks, settings, battery,
  meta upgrades, and run history in independently versioned domains. A legacy
  aggregate mirror supports migration and interrupted-write recovery.
- The `Token Guild: Reset Progress` command requires confirmation and clears
  active checkpoints and progress safely.

The host registers a run ID, validates monotonic input/action sequences, mirrors
the deterministic simulation, derives rewards, and publishes detached
`RUN_SNAPSHOT` messages. The webview cannot submit reward totals or mint token
value. Partial dungeon, level-up, and revival sessions cannot be cashed out.
Duplicate/future intents are rejected without consuming a retry sequence.
Pause/resume is a host-owned `RUN_ACTION`, so the host stops simulation time,
movement, battery drain, and synthetic generation and persists the paused flag
in checkpoints. A reloaded webview receives the same paused state and must send
a sequenced resume action. Provider disposal invalidates stale webviews; bounded
checkpoints restore active runs, including paused dungeon and level-up states,
through the real `READY` path.

## Dungeon HUD and controls

The run counter row contains, in one responsive grid: elapsed time in `mm:ss`,
the centered **Code Dungeon** title, token count, and an icon-only battery. The
battery is keyboard-focusable and uses the immediate custom tooltip shared by
enemy counters; it reports stored/max tokens, level, and charging/lockout state.
The lockout message is a separate status line below the row.

The map canvas is an open-world viewport. Clicking it suppresses selection,
dragging, and the focus outline while restoring keyboard movement focus. The
camera follows the hero and the grid repeats at positive and negative world
coordinates; the current viewport edge is not a wall.

The character panel shows hero/class, level, HP and XP bars, equipped weapons,
passive ranks, run upgrades, and 15 exposed combat stats: Might, Armor, Move,
Area, Projectile Speed, Cooldown, Amount, Magnet, Growth, Duration, Luck,
Greed, Curse, Recovery, and Revival. Each stat has an accessible custom
tooltip. Enemy counters show spawned, defeated, and active totals with the same
custom tooltip behavior.

Header controls are icon buttons:

- sound toggles synthesized event tones and persists mute state;
- pause/resume stops the run and hides everything below the Token Guild header;
  the paused view shows only a heading with tokens spent;
- token, gold, and battery controls open explanations without using native
  tooltips where custom stat feedback is required.

## Movement, combat, and level-up

The domain advances in deterministic 10 ms fixed steps with an accumulated
remainder. Keyboard input is normalized and diagonal movement is not faster.
Hero motion is simulation-owned; the webview only supplies validated input
snapshots. The current authored base speed is 40. Base Magnet is 30. Guild
Agility follows the
source-backed 5% per rank (10% maximum) additive movement bonus, and Code
Dungeon keeps authored non-boss enemies below the fully agile hero at the latest
wave; registry/meta bonuses and this escape headroom are regression-tested.
Max Health bonuses from Guild Vitality and Heart of Vitality multiply the
current total (1.1 and 1.2 per rank respectively). Token Magnetism uses the
authored level-specific multiplicative pickup-radius sequence, while the Magnet
PowerUp compounds its per-rank multiplier.

Weapons auto-fire from registry-owned level rows. The current roster contains
eleven base weapons and ten evolved outputs:

- Broadsword/Excalibur: hero-anchored facing slash; Speed and Duration ignored;
- Arcane Bolt/Archmage Staff: targeted projectiles with Amount releases every
  0.1 seconds and target reacquisition per release; Duration ignored;
- Throwing Daggers/Thousand Blades: facing launch, with base Amount shots
  released every 0.1 seconds (reduced at authored ranks to 0.08/0.06/0.04)
  and six 0.05-second evolved releases; Duration ignored;
- Bouncing Arrow/No Future: random ricochet, infinite pierce, camera-envelope
  reflection, bounded 0.5-second hitbox delay, and authored Area-scaled bounce/
  retaliation explosions for No Future;
- Aegis Barrier/Sanctuary: hero aura with per-target cooldowns;
- Bone Throw: random launch and enemy/edge reflection through Duration.
- Fire Wand/Hellfire: Fire Wand emits three random fan fireballs through eight
  authored ranks; Hellfire emits two random-target piercing projectiles at a
  persisted 0.2-second interval. Duration is ignored for both.
- Battle Axe/Scythe of Doom: Battle Axe releases a facing fan in a persisted
  0.2-second sequence with source-backed damage, Amount, and Pierce rows;
  Scythe of Doom releases nine random fan projectiles at a 0.05-second
  interval, with bounded 30-second lifetime and 1000 Pierce. Duration is
  ignored for both.
- Celestial Cross/Heaven Blade: nearest-target boomerang projectiles persist
  their launch origin and return phase across pause/checkpoint boundaries;
  Heaven Blade uses the source damage/speed/interval anchor and high knockback.
  Both ignore Duration; exact critical-hit behavior remains open.
- Orbiting Grimoire/Unabridged Codex: hero-following orbit projectiles persist
  angle, radius, and angular speed across pause/checkpoint boundaries. The
  authored Spellbinder evolution uses Duration-bound orbiters, a 180-unit
  radius cap, and a bounded 30-Pierce safety envelope; shared hitbox-delay and
  page-fall presentation remain open.
- Alchemist Fire/Philosopher's Potion: stationary floor pools use source-backed
  Amount/Area/Duration rows, a 0.3-second release interval, and bounded pool
  limits (20/30). Each zone retains a per-target 0.5-second hitbox delay;
  exact bottle-fall and zone-growth presentation remain open.

Armor reduces ordinary contact damage but never below one. Weapon knockback is
resistance-aware and has a bounded 120 ms reaction. A lethal hit opens a host-
owned revival choice; Revive consumes one charge for 50% HP and two seconds of
invulnerability, while End Run resolves the correct defeat/victory state.

Level-up pauses simulation inside the map. Cards use registry-derived concrete
copy, exclude maxed/invalid items, and support Reroll, Skip, and Banish when
charges and eligible item choices remain. Skip grants 20% of the next-level XP
requirement; Reroll and Banish are XP-neutral. Banish stores canonical item
identity, so an item cannot return under another card form or be upgraded by a
chest. When all items are maxed or banished, Coin Bag and Floor Chicken
fallbacks remain while Reroll/Skip are unavailable. Final selection/Skip
returns through the stage-owned 0.5-second contact-protection approximation.

## Code Dungeon stage

Code Dungeon lasts 30 production minutes. Validated stage data owns wave
windows, minimum/maximum densities, per-minute health/damage/speed scaling,
camera-relative spawn radii, persistence radius, and finale policy. Regular
enemies, elites/bosses, light sources, projectiles, and pickups are bounded.
Ordinary enemies chase the hero; authored wavy enemies retain approach speed
while weaving laterally. Curse affects enemy health/speed and wave cadence/
density; the authored stage minute curve owns enemy damage progression.

At the stage timer, the final threat sequence begins. An invulnerable threat is
visible for a bounded one-minute window and another threat may appear at each
authored minute interval. Contact or timeout resolves the stage according to
the finale policy. Victory summaries record outcome, duration, completion
reason, finale deadline, threat count, revival usage, damage by weapon,
selected upgrades, treasure rewards, and gold basis.

## XP, pickups, chests, and gold

- XP gems remain on the map until collection. Blue gems hold up to 2 XP, green
  gems up to 9, and red gems larger/coalesced values. At most 400 gameplay gems
  remain before condensation; transport snapshots allow a larger mixed pickup
  envelope for simultaneous tactical/chest drops.
- The authored XP curve is 5 XP at level 1, `10L - 5` through level 20,
  `13L - 6` through level 40, and `16L - 8` thereafter, with the authored
  level-20/40 threshold additions and temporary Growth bonuses.
- Destructible light sources attempt one spawn per simulated second, have a
  bounded cap, and resolve a validated Luck-aware drop table only when their
  resulting pickup is collected. Floor Chicken heals, Vacuum consumes current
  gems, Orologion freezes enemies, and Rosary clears regular enemies while
  preserving bosses/final threats.
- Elite drops use independent chance and weighted reward rolls and are recorded
  under a dedicated `eliteDrops` ledger source.
- Chests are identity-owned and single-claim. Code Dungeon resolves authored
  five-item then three-item checks using total Luck before falling back to a
  one-item tier; chest gold is retained per identity in the 60–500 base range.
  Chest presentation pauses simulation for 1.5 seconds. Each reward is selected
  deterministically from the shared eligible owned weapon/passive pool using
  the registry's source rarity weights (for example, Whip/Magic Wand/Knife
  reskins use 100, Runetracer 80, Garlic 70, and Bone 1). Banish and max-rank
  exclusions are applied before the weighted roll; exact Code Dungeon chest
  probabilities and broader stage tables remain open.
- Greed scales pickup/chest/level-up gold at its ownership boundary. Stage
  completion rewards (500 base gold, unused-revival rewards, and finale-revival
  bonuses) are not Greed-scaled. XP gems and token overflow never create gold.

## Telemetry and battery

Synthetic income is enabled by default for deterministic QA. The host emits 25
exact output tokens every 250 ms (100 tokens/second) while the run is active.
The bottom **Synthetic income** toggle changes only synthetic generation and
persists through the narrow `UPDATE_TELEMETRY_SETTINGS` host intent; it is
additive to real telemetry.

Optional OTLP/HTTP capture listens only on loopback when explicitly enabled.
`/v1/traces` and `/v1/logs` accept bounded JSON or protobuf numeric usage,
deduplicate event IDs, and dispatch accepted events directly to the host run.
Raw prompts, responses, workspace content, credentials, and authorization
headers are never stored or logged. The local Codex configuration currently
has no exporter, so live producer compatibility is conditional and unclaimed;
the synthetic path is the complete token-free fallback.

Charged tokens follow the shared battery formula (`output + 0.10 * input +
0.01 * cache`). Active drain is 20 charged tokens/second; lockout freezes
movement, combat, stage time, and spawning until incoming charge restores 15%
capacity. Battery levels/capacities/costs are defined in
`src/shared/battery.ts` and `.dev/specifications/token-battery.md`.

## Presentation and export

The renderer uses original code-drawn/vector silhouettes; external asset packs
are indexed but not integrated. Feedback rings, live announcements, audio cues,
reduced-motion handling, pickup/chest banners, finale status, and revival
presentation are bounded and snapshot-owned. The local PNG export includes
hero, level, outcome, duration, tokens/source, run gold, Guild wallet, enemy
totals, gold breakdown, selected upgrades, treasure, and damage by weapon. Its
filename includes identifying run summary fields; no upload occurs.

## Known limitations and next work

P7 remains active. The remaining tracked gaps are: full first-stage weapon and
enemy roster parity, source-backed balance for every exposed stat/economy value,
exact per-stage chest/drop balance, live Codex producer smoke, narrow/medium/
wide visual and accessibility evidence, semantic review/licensing of the two
asset packs, and deferred base-game systems such as additional stages,
characters, Arcanas, modes, Eggs, secrets, merchant, bestiary, and co-op.
Follow [P7_FULL_GAME_ROADMAP.md](plans/P7_FULL_GAME_ROADMAP.md),
[P7_REMAINING_GAPS_IMPLEMENTATION_PLAN.md](plans/P7_REMAINING_GAPS_IMPLEMENTATION_PLAN.md),
and [NEXT_UPDATES.md](plans/NEXT_UPDATES.md) for the dependency-ordered queue.

Code Dungeon's chest tier probabilities remain provisional. The source confirms
that each chest owns its own five-item/three-item checks but publishes no Code
Dungeon values; the retained table and limitation are recorded in
[chest-tier-probabilities.md](decisions/chest-tier-probabilities.md).

### Latest verified weapon slice (2026-08-03)

Fire Wand is available as an additional base weapon: it fires three random
fireballs from a bounded fan, progresses through eight authored levels, ignores
Duration, and can evolve after level 8 with Power Gauntlets into Hellfire.
Hellfire fires two random-target piercing projectiles in a host-persisted
0.2-second sequence. Both weapons use concrete registry rows, exact upgrade
copy, and deterministic simulation/chest tests. Fire Wand wall blocking,
Hellfire wall presentation, and the broader weapon roster remain roadmap work;
this manual does not claim those mechanics are shipped.
