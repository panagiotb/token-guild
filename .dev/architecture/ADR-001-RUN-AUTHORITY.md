# ADR-001: authoritative run ownership

**Status:** accepted for P7 implementation, sequenced host snapshots active; real Extension Development Host DOM replay is platform-limited
**Date:** 2026-08-02

## Decision

The extension host owns persistent economy and the active run session. The webview owns presentation, input capture, and a render view only. A future run session will receive validated input snapshots and telemetry intents, advance the deterministic simulation in the host, and return compact render/result snapshots.

The host now creates a matching deterministic session on `START_RUN`, receives validated monotonic input-step and level-up-action intents, generates synthetic telemetry from accepted host steps, dispatches accepted OTLP adapter events directly into the active session, rejects production `RUN_TELEMETRY` payloads, rejects duplicate/future intent sequences, derives the persisted result from its own `RunState`, and publishes detached, monotonically sequenced `RUN_SNAPSHOT` messages carrying the next accepted intent sequence. The webview consumes newer snapshots, shows a host-sync state before the first snapshot, and can restore an active session after `READY`; its reward message contains only the run ID and client summary values are ignored. Reward recording is terminal-only: the host rejects a partial dungeon, level-up, or revival session before applying any wallet mutation. Provider disposal invalidates the lifecycle generation before teardown, and production `GuildViewProvider` recovery tests now prove long-running disposal/recreation checkpoint replay, paused level-up restoration, and retry sequencing. Detached checkpoint restoration also validates timing, economy, hero stats, battery, telemetry, and entity values before a session is admitted. A local simulation is now limited to the explicit token-free interaction harness; production rendering does not create or advance a client prediction. The supported VS Code test host can open the view but cannot inject webview DOM events or force a user-session disconnect/reconnect; this limitation is recorded in [Extension Development Host recovery evidence](../decisions/extension-host-recovery.md), while the provider boundary remains fully automated.

## Constraints

- Persistent values (wallet, unlocks, PowerUps, battery level, settings, run completion) mutate only through validated host intents.
- A run ID is single-use; duplicate completion cannot pay twice.
- Host sessions validate the selected hero against the persisted unlock set and reject unknown/expired run IDs.
- Every run intent carries a positive monotonic sequence; retries are idempotent and future/out-of-order messages cannot advance the simulation.
- Simulation state is deterministic from seed, content version, telemetry ledger, and input snapshots; DOM, wall-clock time, and VS Code APIs are not domain dependencies.
- If host simulation IPC volume is too high, prototype deterministic replay validation before choosing a weaker fallback. Never silently return to unrestricted client reward writes.

## Migration checklist

1. **Complete:** production rendering now uses host-issued snapshots as its sole run state; the local simulation is limited to the token-free harness.
2. **Platform-limited:** production-provider disposal/recreation, long-running checkpoint replay, paused level-up restoration, and bounded snapshot recovery are covered. The supported test host cannot inject webview DOM events or force a user-session disconnect/reconnect; retain the limitation record rather than adding private automation.
3. Remove remaining compatibility assumptions around a local client summary after production replay QA is proven.
4. Add/retain replay, duplicate, reload, and malicious-summary tests around the host session before release-candidate status.

## Boundary evidence addendum — 2026-08-02

The production provider now rejects `RECORD_RUN_REWARD` while a host session is
still in `dungeon`, `level-up`, or `revival`; only a terminal `summary` can be
persisted. The reconnect regression exercises this rejection before continuing
with checkpoint restoration. This closes the partial-run cash-out path. The
supported test-host limitation is recorded in [Extension Development Host recovery evidence](../decisions/extension-host-recovery.md);
full production-DOM replay remains RG-06 work. See that decision for the
reproducible integration-harness boundary and the commands that remain green.
