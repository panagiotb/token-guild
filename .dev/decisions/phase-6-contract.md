# Phase 6 summary, hero progression, and reward contract

Status: approved for implementation as the MVP first pass.

This record freezes the data ownership and reward semantics required by the Phase 6 milestone. It intentionally keeps the existing one-stage, synthetic-only MVP scope.

## D1 — hero level meaning

`PersistedProgress.heroRecords[heroId].highestLevel` is the highest run level reached by that hero. The Guild selector renders it as `Hero - Level N` and exposes `Best run level N` as accessible text. Every new run still starts at `RunState.level = 1`; the record is informational progression, not a persistent starting-level bonus.

Owner: extension-host persistence, updated by the idempotent run-reward operation.

Defaults and migration: every shipped hero receives `{ highestLevel: 1 }`; legacy schema 1 progress is migrated without changing wallet, settings, upgrades, or aggregate counters. Invalid hero records fall back to level 1 while valid unrelated fields are preserved. Future/unknown schemas are safely reduced to validated known fields and default hero records.

Validation: hero IDs are bounded non-empty strings; `highestLevel` is an integer from 1 through 999. A run reward may update a record only with a valid hero ID and integer level in that range, using `max(existing, runLevel)`.

Privacy/export: the hero ID/name and run level may appear in the on-screen summary and local PNG. No workspace, prompt, model output, or raw telemetry is stored.

## D2 — gold ledger ownership

`RunState.gold` is run-local currency. Ordinary enemy defeats credit one gold immediately, and the boss defeat credits 100 gold exactly once. The `gold-chest` map marker is a claim/feedback marker with value `0`; collecting it never credits a second reward. The completion telemetry event uses the same one-time boss reward helper and cannot add another 100 gold.

`RunSummary.gold` is the run-earned total. `RunSummary.goldBreakdown` records `enemyKills` and `bossChest` sources. The persisted Guild wallet is updated only by the host's idempotent `RECORD_RUN_REWARD` operation, keyed by run ID. The summary displays run gold and Guild wallet separately.

## D3 — privacy-safe summary contract

`RunSummary` contains only: outcome, hero ID/name, run level, elapsed seconds, token total plus `synthetic|otlp|proxy|buffer` source and `exact|estimated` accuracy, run gold and its source breakdown, enemies spawned/defeated, damage by weapon, and selected weapon/passive upgrade IDs. Empty damage/upgrades are valid and render explicit empty states.

Field owners:

- simulation owns combat, counts, rewards, loadout, and the immutable summary snapshot;
- the webview owns presentation and local PNG rendering;
- the extension host owns persisted wallet/progression and duplicate-run protection.

All dynamic UI text is inserted as text content. The local export uses only this approved aggregate contract.

## Verification target

Focused tests cover schema migration/recovery, reward idempotency, summary empty states and export fields, level-one run starts, selector labels, ordinary/boss gold accounting, and completion-event no-double-counting before the integrated release gate.
