# Token Guild 0.1.0 current functionality manual

Verified against `src/`, `package.json`, and the 47-test suite on 2026-08-01. This manual describes implemented behavior, not intended future behavior.

## 1. Product boundary

Token Guild is a desktop VS Code extension contributing one activity-bar container and one `Guild` webview. The webview contains the Guild Hall, a single playable Code Dungeon, and a run-summary screen.

The current release is a deterministic vertical slice:

- Vanilla DOM controls and a Canvas 2D map; Phaser is not installed.
- Desktop VS Code `>=1.85.0`; automated host smoke testing currently uses VS Code 1.131.0.
- Synthetic telemetry only in the playable UI. No LLM, API key, prompt, network listener, or real token source is required.
- One 30-second stage schedule, six selectable heroes, one equipped weapon, three fixed level-up choices, one boss, local progression, and local PNG export.

## 2. Opening and testing the extension

For an interactive development run:

1. Run `npm ci`.
2. Run the extension with `F5` in VS Code.
3. Open the Token Guild icon in the activity bar.
4. Select a hero and choose **Start dungeon run**.
5. Move with arrow keys or `WASD`; combat is automatic.

The token-free automated commands are:

| Command | Purpose |
| --- | --- |
| `npm run test:synthetic` | Deterministic simulation, token-bus, telemetry-mapping, and end-to-end game-scenario unit tests. |
| `npm test` | All unit tests. Current evidence: 11 files and 47 tests pass. |
| `npm run typecheck` | Strict TypeScript validation. |
| `npm run lint` | ESLint validation. |
| `npm run build` | Bundles the extension host and webview. |
| `npm run test:e2e` | Builds and opens the contributed webview in an Extension Development Host. It does not click or inspect the webview DOM. |
| `npm run package` | Builds `token-guild-0.1.0.vsix`. Current package size: 65.12 KB. |

## 3. Guild Hall

All six heroes are unlocked by default. The selector shows each hero's highest level reached in a previous run; every new run still starts at Level 1.

| Hero | HP | Armor | Move | Starting weapon | Current starting distinction |
| --- | ---: | ---: | ---: | --- | --- |
| Warrior | 100 | 1 | 40 | Broadsword | Standard melee-themed loadout. |
| Wizard | 100 | 0 | 40 | Arcane Bolt | Starts with +10% Growth, so collected gems grant 1.1 XP. |
| Rogue | 120 | 0 | 42 | Throwing Daggers | Starts with Amount 2; the current engine multiplies direct-hit damage by Amount. |
| Ranger | 100 | 0 | 40 | Bouncing Arrow | Stores +10% projectile Speed, but the current direct-hit weapon model does not use it. |
| Paladin | 110 | 2 | 35 | Aegis Barrier | Starts with a 40-unit pickup radius instead of 32. |
| Necromancer | 100 | 0 | 40 | Bone Throw | No additional runtime bonus in the current build. |

The Guild Hall provides two persistent purchases:

- **Guild Might:** costs 100 gold per rank and adds +5% weapon damage to future runs. The current implementation has no rank cap or refund.
- **Token battery:** increases persistent battery level and starts future runs with the corresponding full capacity. Costs are listed in section 7.

The status line shows Guild gold, recorded runs, lifetime synthetic output tokens, and Guild Might rank. Progress can be cleared with the `Token Guild: Reset Progress` command after confirmation.

## 4. Dungeon HUD and controls

The dungeon toolbar places elapsed time on the left, **Code Dungeon** in the center, and the synthetic token count beside the battery icon on the right. The battery icon exposes stored/max tokens, level, and charging state through its accessible label and hover text.

Below the map, the character panel shows:

- hero name, weapon-themed class label, and `Lvl N`;
- HP and XP bars with numeric values;
- equipped weapon and its level;
- the class passive's stat name;
- Might, Armor, Move, and Cooldown attributes;
- weapon/passive upgrades selected during the run.

The lower HUD shows spawned, defeated, and active enemy counts with instant CSS tooltips, plus collected run gold and a clickable ledger explanation.

The header has two icon controls:

- **Sound:** toggles the synthesized event tones and persists the mute setting.
- **Pause/resume:** stops the webview interval, hides everything below the Token Guild header, and shows only a heading with the current synthetic token total. User pause and battery depletion are separate states.

## 5. Current run rules

### Movement and combat

- Keyboard movement updates the hero every 250 ms while the run is active and the battery is not locked.
- Enemies move directly toward the hero and deal continuous contact damage reduced by Armor.
- The equipped weapon automatically damages the closest enemy when its cooldown expires.
- Current attacks are immediate numeric hits. There are no runtime projectiles, directional patterns, aura hitboxes, knockback, critical hits, weapon-specific animations, or collision shapes.
- Weapon base damage and cooldown differ by weapon. Amount currently multiplies the hit's damage instead of creating multiple projectiles.
- Guild Might and Power Gauntlets increase damage. Cooldown math has an 85% reduction cap.

### Enemies and stage

- One regular enemy is attempted each elapsed second until the boss appears, with at most 60 non-boss enemies active.
- Regular spawns randomly choose Syntax Spectre, Bug Bat, or Memory Golem. The wave entries in `stages.json` are validated data but are not used by the simulation scheduler.
- Memory Golems are marked elite internally but have no separate drop table or encounter behavior.
- The Terminal Exit Boss spawns at 30 elapsed seconds. Normal spawning then stops.
- Killing the boss leaves a 100-gold chest at its death position. Victory occurs after the boss is gone and no boss chest remains on the map.
- The run ends in defeat when HP reaches zero.

### XP, levels, and upgrades

- Ordinary enemies drop one cyan `xp-shard`. It remains pending until it is within the hero's pickup radius.
- Collecting a shard grants its XP value and one gold under the currently approved Token Guild gold rule.
- XP required for a level is `5 × level²` through Level 20, then adds linear terms above Levels 20 and 40.
- Level-up pauses simulation and displays three choices inside the map:
  - **Upgrade weapon:** raises the weapon's displayed level by one, capped at 8. Weapon level does not yet change its damage, cooldown, amount, or pattern.
  - **Power Gauntlets:** adds +10% Might, capped at rank 5.
  - **Restore 25% health:** heals up to 25% of maximum HP.
- The three options are fixed rather than randomly drawn. There are no inventory slots, reroll/skip/banish actions, new weapon acquisition, chest upgrades, or evolutions.

## 6. Gold and progression

Gold is credited only when its map pickup is collected:

| Source | Current reward |
| --- | ---: |
| Enemy gem | +1 XP and +1 gold |
| Boss chest | +100 gold |
| Battery overflow coin | Formula-derived value |

Run gold is separate from the Guild wallet during play. On either victory or defeat, the webview records the run once using a generated run ID; the extension host rejects duplicate rewards. A recorded run updates Guild gold, lifetime tokens, run count, and the selected hero's highest reached level.

The current gold model is an explicitly accepted divergence from *Vampire Survivors*. Overflow gold also belongs to the accepted token-battery divergence.

## 7. Synthetic telemetry and token battery

The interactive fixture emits 25 exact synthetic output tokens every 250 ms: 100 tokens per second. Events pass through the normalized `TokenBus`, which validates, deduplicates, and aggregates 250 ms windows. The current extension host does not create a token source or forward real telemetry into the webview.

Charged tokens use:

`output + 0.10 × input + 0.01 × cache`

The active drain is 20 charged tokens per second. During idle time it becomes `20 × 2^(idleSeconds / 60)`. A depleted run freezes movement, combat, stage time, and spawning; incoming telemetry can recharge it, and it resumes only at 15% capacity.

| Battery level | Capacity | Upgrade cost |
| ---: | ---: | ---: |
| 1 | 5,000 | Free |
| 2 | 8,150 | 1,200 gold |
| 3 | 13,284 | 3,360 gold |
| 4 | 21,653 | 9,408 gold |
| 5 | 35,295 | 26,342 gold |

At full capacity, excess charged tokens enter a session-decaying overflow formula. A positive result creates one value-bearing gold coin at the hero; the coin is deliberately skipped for its creation tick and credits gold only when collected later. With the current 25-token synthetic batches, normal overflow per tick is too small to produce a positive coin value, although larger telemetry batches and deterministic tests exercise the system.

The default fixture always reports active work and charges faster than the active drain. Consequently, battery depletion/idle behavior is implemented and tested but is not naturally reachable during the default interactive demo.

## 8. Telemetry-related helpers that are not connected

The code contains tested foundations for future telemetry, but they are not current user-facing integrations:

- `TokenBus` supports `synthetic`, `otlp`, `proxy`, and `buffer` provenance plus exact/estimated accuracy.
- Gameplay helper events can mark a power charge after a thinking delay, apply error damage, or finish a run on a successful completion event.
- A `t/s >= 40` math path can multiply damage and attack cadence by 1.5.

The playable webview only emits synthetic token events. It does not send thinking, error, completion, OTLP, proxy, or buffer events. Its combat tick currently receives a fixed 12 t/s value, so the 40 t/s combat modifier is not activated by the displayed 100 t/s fixture. These helpers must not be presented as shipped gameplay.

## 9. Summary and local export

The result screen reports:

- victory or defeat;
- hero and reached level;
- elapsed time;
- token count with source and accuracy;
- run gold, Guild wallet, and gold-source breakdown;
- enemies spawned/defeated;
- selected upgrades;
- damage by weapon, including explicit empty states.

**Export summary PNG** renders a separate 1200×820 local canvas containing the same approved aggregate fields and downloads a run-specific filename containing hero, level, outcome, duration, and token count. No upload occurs.

## 10. Persistence, privacy, and security

Progress schema 3 stores only:

- Guild gold;
- unlocked hero IDs;
- Guild upgrade ranks;
- highest reached level per hero;
- run count and lifetime token total;
- battery level;
- completed run IDs for idempotency;
- mute and volume settings.

The host validates and repairs legacy/corrupt state. Webview messages are discriminated and runtime-validated. The webview uses a nonce-based Content Security Policy and local resource roots.

Token Guild does not currently store prompts, model responses, workspace contents, file paths, raw traces, terminal output, API credentials, or raw telemetry payloads.

## 11. Known first-pass limitations

The largest gaps are gameplay depth, not packaging:

- Weapon levels are cosmetic state after Level 1; weapon-specific mechanics and projectiles are absent.
- Only one weapon and one selectable passive exist at runtime.
- Character level passives, most registered passives, and all registered evolutions are inactive.
- Stage waves, enemy scaling, elite behavior, floor pickups, multi-value gems, condensed gems, and chest item rewards are absent.
- The 30-second stage is a smoke-test schedule, not an authentic survivor run.
- All heroes start unlocked; there is no collection, unlock, bestiary, relic, Arcana, mode, or stage-selection progression.
- Real telemetry is not implemented, despite an experimental OTLP setting being declared in `package.json`.
- Automated host tests open the webview but do not verify layout or clicking; a manual narrow-sidebar playthrough remains required.

The ordered correction plan is [VAMPIRE_SURVIVORS_PARITY_TODO.md](VAMPIRE_SURVIVORS_PARITY_TODO.md).
