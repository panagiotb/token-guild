# P6 proposed plan: production-path completeness

**Status:** Proposed on 2026-08-01 after implementation and documentation review. This document orders the next work; it does not mark implementation as started.

## Outcome

Finish the incomplete production paths already represented in the engine before adding more characters, stages, weapons, modes, secrets, assets, or DLC. At the end of P6, every feature shown to the player or listed as available in the manual must be reachable in normal play, behaviorally meaningful, host-authoritative where value persists, and covered at the interaction boundary.

## Review evidence

The current foundations are useful, but several P0-P5 completion statements were broader than user-accessible behavior:

1. `src/game/meta.ts` and `StateManager` define bounded PowerUps and refunds, while `src/webview/main.ts` renders and purchases only Guild Might and the separate battery upgrade.
2. `rerollLevelUp`, `skipLevelUp`, and `banishLevelUpCard` are implemented and unit-tested, but the level-up overlay renders only ordinary upgrade cards.
3. tactical pickup effects are implemented in the collection loop, but normal enemy deaths spawn XP gems or chests; no authored production source emits healing, magnet, freeze, screen-clear, or gold pickups.
4. Duration, Luck, Greed, Curse, and Revival are registered and copied into hero stats, but their complete expected gameplay effects are absent. For example, projectile lifetime uses the weapon's base duration directly, and defeat does not consume Revival.
5. `bossRewardClaimed` is run-global, so only the first collected chest can produce a fresh item/gold result.
6. the webview can submit complete progress and run reward totals. Runtime shape validation exists, but persistent economy/unlock mutation is not fully owned by the extension host.
7. `npm run test:e2e` verifies extension activation and opening the view, not webview clicks, focus, overlays, dialogs, purchase flows, or export behavior.
8. Arcane Cleanser removes every enemy. Before it can spawn normally, final threats need an explicit immunity/handling rule so the pickup cannot accidentally complete the stage.

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

### Step 1 — establish the interaction test boundary

Add the smallest reliable harness that can load the production webview bundle and exercise DOM behavior with a mocked VS Code API. Cover the existing start-run, level-up selection, pause/resume, dialog, resize, summary, and PNG-export triggers before changing those flows.

Acceptance:

- tests fail on a disconnected click handler or duplicate re-render that replaces an active control;
- keyboard focus and narrow/wide layout states can be asserted;
- the harness is deterministic and included in the standard test command or an explicitly documented gate.

### Step 2 — make persistent mutations host-authoritative

Replace whole-progress saves and client-supplied reward totals with narrow intent messages. The host calculates costs, validates the current stored record, applies purchases/refunds/settings, derives or validates run rewards from an owned run result, persists once, and returns the canonical progress snapshot.

Acceptance:

- a webview cannot grant itself gold, tokens, unlocks, ranks, relics, or completed run IDs;
- replayed run IDs and duplicate commands are idempotent;
- invalid, stale, unaffordable, maximum-rank, and corrupted-state cases are tested;
- legacy progress migration and reset remain intact.

### Step 3 — finish the existing meta and level-up UI

Render supported PowerUps from the canonical registry rather than hand-coding Guild Might. Add clear cost/rank/effect state and a confirmed full refund. Add Reroll, Skip, and Banish controls to the in-map level-up overlay, render remaining charges, and keep focus stable after each action.

Acceptance:

- every visible purchase has an implemented effect and host-owned transaction;
- refund returns exactly the refundable spend and never refunds the battery track;
- action controls appear only with charges, consume exactly once, and cannot grant XP/tokens;
- interaction and state-manager tests cover success and failure paths.

### Step 4 — complete pickups and chest ownership

Add explicit, bounded production spawn/drop tables for healing, magnet, freeze, screen clear, and gold variants. Give every chest a stable ID and independent claimed state. Define final-threat behavior under screen clear before enabling that pickup in production. Add Luck-based chest/drop behavior only after single-chest ownership is correct.

Acceptance:

- no reward is credited before map collection;
- every pickup/chest has exactly one owner and duplicate collection cannot pay twice;
- multiple chests in one run can each resolve independently;
- deterministic tests cover drop, non-drop, collection, duplicate, boss immunity, and collection ordering.

### Step 5 — close stat behavior gaps

Trace every exposed passive and meta stat from registry to a visible simulation effect. Implement and test Duration, Luck, Greed, Curse, and Revival consistently with the verified base-game target, or hide each incomplete stat from purchase/reward pools until its behavior is ready.

Acceptance:

- table-driven tests prove that each exposed rank changes the intended outcome and respects caps;
- no registry-only stat is advertised as functional;
- formulas are documented against verified sources and do not depend on telemetry throughput.

### Step 6 — regression, manual QA, and documentation

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
