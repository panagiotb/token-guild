# Telemetry feasibility decision record

Date: 2026-07-31

## Decision

Synthetic telemetry is the MVP release source. Real sources are optional and must not block the playable run loop.

## Source classification

| Source | MVP status | Reason |
| --- | --- | --- |
| Synthetic fixture driver | Release | Deterministic, host-independent, and required for automated QA. |
| OTLP loopback receiver | Experimental | Requires host/tool emission fixtures and explicit opt-in. Bind loopback only; never retain raw spans. |
| API stream proxy | Experimental | Requires explicit user configuration and secret-redaction/backpressure tests. No credential logging. |
| Document diff estimator | Experimental | Heuristic only; must expose `estimated` provenance and pass false-positive testing. |
| Terminal output watcher | Rejected for MVP | No stable published VS Code API may be assumed for arbitrary terminal output. Revisit only with a supported companion integration. |

## Constraints

- The game consumes normalized events containing source, accuracy, timestamp, count, confidence, and optional run ID.
- Exact and estimated counts remain distinct in state, UI, and summaries.
- No raw workspace text, terminal output, trace body, prompt, model response, or authorization header is stored or logged.
- All listeners and servers start lazily, bind to loopback, enforce limits, and dispose on extension deactivation.

## Evidence still required before enabling a real source

- Versioned fixtures for valid, malformed, partial, duplicated, delayed, and disconnected input.
- Host/source smoke result and remote-workspace behavior.
- User setting and consent path.
- Focused tests for deduplication, bounded queues, teardown, and secret redaction.
