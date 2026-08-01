# Token Guild current functionality manual

Verified against `src/`, `package.json`, and the 73-test suite on 2026-08-01. This document describes shipped behavior only; the parity backlog remains the source of truth for later work.

## Product boundary

Token Guild is a desktop VS Code extension (`>=1.85.0`) with one activity-bar Guild webview. The first playable slice is a Canvas/DOM survivor-style run with a Guild Hall, Code Dungeon, persistent progression, pause/resume, and a local PNG summary export. It has no DLC, secrets, marketplace assets, or performance target.

The only approved departures from the base *Vampire Survivors* model are:

- token telemetry charges the persistent Token Guild battery and gates play;
- collected gems and approved battery overflow use the Token Guild gold ledger.

Telemetry is otherwise orthogonal to XP, combat, enemy spawning, upgrades, victory, and defeat.

## Token-free QA and interactive smoke test

```powershell
npm ci
npm run test:synthetic
npm test
npm run typecheck
npm run lint
npm run build
npm run package
```

`npm run test:synthetic` exercises the deterministic simulation, TokenBus, telemetry mapping, and accelerated run scenario. `npm test` runs the full unit suite. `npm run test:e2e` opens an Extension Development Host and verifies activation; it does not automate webview clicks. For a manual run, press `F5`, open Token Guild, choose an unlocked hero, select **Start dungeon run**, and move with arrow keys or `WASD`.

## Guild Hall and persistence

New profiles start with Warrior and Code Dungeon. Hero records show the highest level reached, but each run starts at Level 1. Other heroes unlock deterministically through completed-run, wallet, or level conditions shown beside locked selector options. The Guild Hall contains:

- bounded Guild Might ranks as the only visible base PowerUp purchase;
- a separate non-refundable Token Guild battery upgrade;
- wallet gold, run count, lifetime token total, hero records, unlocked stages, relic IDs, completed run IDs, and mute/volume settings;
- the `Token Guild: Reset Progress` command with confirmation.

The state layer defines additional base-stat/action PowerUps and a full-refund operation, but the production webview does not expose them. They are foundations for the next milestone, not current user-facing functionality.

Run rewards are saved once per run ID. Duplicate reward messages do not duplicate wallet gold, run count, tokens, unlocks, or relics. Legacy progress is migrated into the current schema with safe defaults and validated before use.

## Dungeon HUD and controls

The run toolbar keeps elapsed time on the left, **Code Dungeon** centered, and token count beside the battery icon on the right. Hover/focus feedback is custom CSS for enemy counters; native enemy tooltips are not used. The battery icon exposes stored/max tokens, level, and charging/lockout state.

The character panel shows hero/class, level, HP and XP bars, all equipped weapons, passive ranks, Might/Armor/Move/Cooldown attributes, and run upgrades. The map also shows spawned, defeated, and active enemy counters plus the collected run-gold ledger.

The header controls are icon buttons:

- sound toggles synthesized event tones and persists mute state;
- pause/resume stops the run interval and hides everything below the Token Guild header. Pause displays only a heading with tokens spent; resume restores the run.

Level-up cards appear inside the map and pause the simulation until one eligible card is chosen. Cards are keyboard-focusable and the first card receives focus when the overlay opens. The summary screen focuses the export action and returns focus to hero selection when returning to the Guild.

## Run rules

### Movement and combat

Movement is sampled every 250 ms while the battery is not locked out. Weapons auto-fire according to data-driven level tables and patterns (targeted, fan, ricochet, aura, or bone). Projectiles, area effects, pierce, knockback, contact damage, invulnerability, recovery, weapon amount, and cooldown calculations are bounded by the simulation. Token rate never changes combat damage, movement, XP, or enemy behavior.

### Code Dungeon stage

Production Code Dungeon lasts 30 minutes. Authored wave entries select enemy families, intervals, minimum/maximum density, and event windows. The runtime includes regular enemies, elite/miniboss events, a final timeout threat, off-screen placement, scaling, and bounded enemy/projectile/pickup collections. Tests use an explicit accelerated clock scale; production data is not shortened for QA.

Victory requires the final threat to be defeated and all required map rewards to be collected. Defeat occurs when the hero reaches zero HP. Runs finish with a summary containing outcome, duration, level, tokens, gold breakdown, enemy totals, damage by weapon, selected upgrades, and treasure rewards.

### XP, pickups, and treasure

Enemies drop tiered XP gems. Gems remain on the map until collection; collecting an XP gem grants its value in XP and the currently approved matching gold value. Excess XP pickups condense into a bounded high-value orb without losing XP. Healing, magnet, freeze, screen-clear, and gold pickup effects exist in the simulation and tests, but the production stage does not yet spawn them; they are not currently obtainable in normal play.

Boss/elite chest drops remain pending on the map. The first collected chest awards the approved gold reward and one deterministic eligible item upgrade or evolution. Reward ownership is currently global to the run, so later chests do not produce independent new results. Duplicate collection cannot pay twice. The shipped weapon data includes the first five evolution recipes; the summary and PNG export disclose chest results.

### Level-up actions

The eligible pool supports existing/new weapon upgrades, existing/new passives, healing, and max-level exclusion. Bounded Reroll, Skip, and Banish methods and charge rules exist in the simulation and unit tests, but no production level-up controls call them yet.

## Token telemetry and battery

### Synthetic source

Synthetic mode is enabled by default for deterministic, token-free QA. The webview emits 25 exact output tokens every 250 ms (100 tokens/second) while a run is active. It can be disabled with `tokenGuild.telemetry.syntheticEnabled`; disabling it stops emission rather than silently substituting another source.

### Opt-in OTLP source

`tokenGuild.telemetry.otlpEnabled` enables the extension-host loopback receiver. It listens lazily on `127.0.0.1`, default port `4318` (configurable with `tokenGuild.telemetry.otlpPort`), at `POST /v1/traces`. This first adapter accepts bounded JSON-encoded OTLP trace payloads containing `resourceSpans → scopeSpans → spans` and GenAI input/output/cache usage attributes. Binary protobuf, gzip, metrics/logs, and remote clients are explicit unsupported inputs.

Only exact numeric usage, span timing, a bounded span ID, and normalized provenance are forwarded to the webview. The extension does not store or log prompts, responses, workspace text, resource attributes, authorization headers, credentials, or raw request bodies. Duplicate span IDs are suppressed in bounded memory. The listener stops when disabled, when the provider is disposed, or when VS Code deactivates.

Both sources cross the same validated TokenBus and battery boundary. Host timestamps are normalized at the webview boundary so producer clock skew cannot stall a run. No thinking/error/completion/Berserk event changes gameplay.

Charged tokens use the implemented battery formula:

`output + 0.10 × input + 0.01 × cache`

Active drain is 20 charged tokens/second; idle drain increases exponentially. At zero capacity, movement, combat, stage time, and spawning pause. Incoming telemetry may recharge the battery; play resumes at 15% capacity. At full capacity, positive overflow creates a collectible value-bearing gold coin. Battery levels, capacities, and upgrade costs are defined in [token-battery.md](specifications/token-battery.md).

## Presentation and export

The map uses original vector/canvas silhouettes for hero, enemies, pickups, projectiles, and chests; no third-party art is packaged. Bounded defeat/pickup/level-up/finale/lockout/victory/defeat cues provide visual rings, live announcements, and small AudioManager tones. `prefers-reduced-motion` disables animated overlays/effects; mute disables tones without hiding state.

The PNG export is generated locally from a separate 1200×960 canvas. It includes duration, tokens/source, run gold, Guild wallet, enemy totals, gold breakdown, selected upgrades, treasure, and damage by weapon. The filename includes hero, level, outcome, duration, token count, gold, and treasure count. No upload occurs.

## Privacy, validation, and known limits

Progress and IPC messages are runtime shape-validated. The webview uses a nonce-based CSP and local resource roots. The current host still accepts complete progress snapshots and client-calculated run reward totals from the webview; moving those economy mutations behind narrow host-authoritative commands is a documented next-step security/integrity requirement. No secrets are required for the default QA path.

Duration, Luck, Greed, Curse, and Revival are present in registry/progression state but do not yet have complete gameplay behavior, so they are not production-exposed purchases. The MVP intentionally does not include DLC, additional stages, Arcanas/Darkanas, Endless/Inverse/Hurry/Hyper/Limit Break, Golden Eggs, merchant systems, bestiary, secret characters, external assets, or browser automation dependencies. Current gaps remain in [VAMPIRE_SURVIVORS_PARITY_TODO.md](VAMPIRE_SURVIVORS_PARITY_TODO.md), with the ordered next pass in [NEXT_DEVELOPMENT.md](plans/NEXT_DEVELOPMENT.md).
