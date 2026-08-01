# Telemetry feasibility decision

Status: synthetic source implemented; opt-in loopback OTLP/HTTP JSON source implemented and reviewed (2026-08-01).

## Current decision

The `0.1.0` playable webview uses a deterministic exact synthetic fixture. It is the required token-free QA path and must remain available after real telemetry is introduced.

`src/telemetry/tokenBus.ts` remains the tested normalization/aggregation boundary. `src/telemetry/otlpServer.ts` is now the single production-source adapter: it binds lazily to loopback, accepts bounded OTLP/HTTP JSON traces at `/v1/traces`, deduplicates span IDs, and sends validated events from the extension host to the webview through versioned IPC.

`tokenGuild.telemetry.otlpEnabled` is opt-in and defaults to false. `tokenGuild.telemetry.otlpPort` defaults to 4318. Synthetic mode remains explicit and defaults to true for token-free QA; disabling it stops synthetic emission rather than silently falling back to another source.

## Candidate source classification

| Source | Status | Promotion requirement |
| --- | --- | --- |
| Synthetic fixture | Implemented | Remain deterministic, explicit, local, and token-free. |
| OTLP loopback receiver | Implemented first exact source | Explicit opt-in; JSON producer fixtures; loopback-only binding; payload/body limits; port-conflict, remote-host, malformed-input, duplicate, and teardown tests; no raw-span retention. Binary protobuf, gzip, metrics, logs, and remote collection remain explicit unsupported inputs. |
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

P4 review evidence: the OTLP receiver has no raw-body logging or persistence, uses a 1 MiB body/512-span limit and bounded dedupe memory, rejects non-loopback clients and unsupported encodings, and closes on provider disposal or configuration disable. The webview normalizes host timestamps before the shared TokenBus/battery boundary so clock-skewed producer timestamps cannot stall a run. Thinking/error/completion/Berserk gameplay hooks are not part of the normalized path.
