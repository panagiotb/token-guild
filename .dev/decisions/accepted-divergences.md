# Accepted gameplay divergences

Status: approved for the current product direction on 2026-08-02.

Token Guild otherwise targets the mechanics and progression feel of the approved base *Vampire Survivors* reference. A departure requires an explicit update to this decision.

## 1. Token battery gameplay

LLM telemetry is normalized into charged tokens and stored in a persistent-level, run-scoped battery. Active/idle drain gates the simulation; depletion freezes the run until 15% recharge. Battery capacity and play availability are the only approved gameplay divergence in this roadmap.

This addition controls when the game can run. It does not approve tokens as a substitute for XP, combat stats, enemy scheduling, chest rules, character passives, or other survivor mechanics.

Authoritative rules: [token-battery.md](../specifications/token-battery.md).

## 2. Synthetic telemetry test source

Synthetic income is retained as an additive, user-toggleable test source. It may generate 100 test tokens per second on top of real telemetry and is a future premium entitlement candidate, but P7 does not implement licensing or billing. Synthetic income does not create XP, gold, damage, movement, drops, Luck, enemy changes, or stage progress.

## Retired divergence: gold

The former XP-gem and battery-overflow gold paths were withdrawn on 2026-08-02. Ordinary gems grant XP only, and battery overflow is capped/diagnostic only. Gold now comes from authored light-source pickups, chests, and verified stage/end rewards, with collection or end-state ownership and host-side wallet recording.

Existing wallet balances are grandfathered because their historical source cannot be reconstructed safely; no migration resets or estimates them.

## Change rule

Any additional divergence must state the user-facing reason, affected systems, persistence/migration impact, balance impact, privacy impact, and tests required. Until recorded, the parity backlog remains authoritative.
