# Accepted gameplay divergences

Status: approved for the current product direction on 2026-08-01.

Token Guild otherwise targets the mechanics and progression feel of the approved base *Vampire Survivors* reference. A departure requires an explicit update to this decision.

## 1. Token battery gameplay

LLM telemetry is normalized into charged tokens and stored in a persistent-level, run-scoped battery. Active/idle drain gates the simulation; depletion freezes the run until 15% recharge; full-battery overflow can create collectible gold coins.

This addition controls when the game can run. It does not approve tokens as a substitute for XP, combat stats, enemy scheduling, chest rules, character passives, or other survivor mechanics.

Authoritative rules: [token-battery.md](../specifications/token-battery.md).

## 2. Token Guild gold acquisition

The approved current ledger is:

- a collected ordinary enemy gem grants its XP value and the same amount of gold;
- a collected boss chest grants 100 gold in the current first-stage slice;
- a collected battery-overflow coin grants its formula-derived value;
- no map reward credits before collection;
- run gold enters the Guild wallet once through an idempotent host operation at the result screen.

This decision permits the source of gold to differ from *Vampire Survivors*. It does not waive chest item/evolution behavior, Greed/meta-shop design, pickup feedback, or reward ownership testing.

## Change rule

Any additional divergence must state the user-facing reason, affected systems, persistence/migration impact, balance impact, privacy impact, and tests required. Until recorded, the parity backlog remains authoritative.
