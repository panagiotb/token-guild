# Telemetry feasibility decision

Status: synthetic source implemented; real sources not implemented.

## Current decision

The `0.1.0` playable webview uses a deterministic exact synthetic fixture. It is the required token-free QA path and must remain available after real telemetry is introduced.

`src/telemetry/tokenBus.ts` is a tested normalization/aggregation foundation, not a production adapter. The extension host currently registers no OTLP server, API proxy, document watcher, or terminal watcher and sends no token events to the webview.

The `tokenGuild.telemetry.otlpEnabled` manifest setting is therefore non-functional and should be removed/hidden or implemented in the future telemetry milestone.

## Candidate source classification

| Source | Status | Promotion requirement |
| --- | --- | --- |
| Synthetic fixture | Implemented | Remain deterministic, explicit, local, and token-free. |
| OTLP loopback receiver | Candidate first exact source | Explicit opt-in; proven producer fixtures; loopback-only binding; payload/body limits; port-conflict, remote-host, malformed-input, and teardown tests; no raw-span retention. |
| Explicit API stream proxy | Deferred | User-configured routing, secret redaction, bounded streaming/backpressure, supported-provider fixtures, and clear consent. |
| Document-diff estimate | Deferred estimated source | Measured false-positive/negative behavior, manual-typing exclusion, `estimated` labeling, and no raw text retention. |
| Arbitrary terminal output | Rejected for now | No stable published API/integration has been approved. Do not depend on proposed APIs or scrape terminal content. |

## Required normalized contract

Events retain source, exact/estimated accuracy, timestamp, output count, rate, confidence, optional input/cache counts, agent-active state, and optional run correlation. Exact and estimated counts never merge without provenance.

## Privacy and lifecycle gate

Before any real source is enabled:

- no prompt, response, source text, terminal output, authorization header, credential, or raw trace body is persisted or logged;
- observation is opt-in and the UI explains what is collected;
- malformed, duplicate, delayed, oversized, disconnected, and clock-skewed fixtures pass;
- listeners bind to loopback, start lazily, bound memory/work, handle conflicts, and stop on deactivation;
- behavior is tested in the supported local/remote host topology.
