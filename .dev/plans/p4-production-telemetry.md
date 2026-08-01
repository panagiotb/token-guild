# P4 implementation plan - production token source

Status: implemented and reviewed; acceptance gate passed.
Date: 2026-08-01

## Research and cross-check

Inputs:

- `.dev/Vampire Survivors Mapping/` telemetry and progression notes
- `.dev/VAMPIRE_SURVIVORS_PARITY_TODO.md` P4 scope and acceptance gate
- `.dev/decisions/telemetry.md`
- current `src/telemetry/tokenBus.ts`, `src/shared/validation.ts`, `src/shared/types.ts`, `src/webview/main.ts`, and `src/extension/extension.ts`
- adjacent Token Master `src/telemetryServer.ts` and `src/extension.ts` (local audit only)
- OpenTelemetry references: [OTLP specification](https://opentelemetry.io/docs/specs/otlp/) and [GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/)

The adjacent Token Master implementation confirms the practical producer shape (`POST /v1/traces`, `resourceSpans → scopeSpans → spans`, GenAI usage attributes), but it is not reused as code. Its unconditional listener, unbounded request body, raw request logging, and lack of duplicate protection are explicitly rejected here.

Locked P4 decisions:

1. Synthetic telemetry remains the default, deterministic, token-free QA source. It is controlled by `tokenGuild.telemetry.syntheticEnabled`; it is never silently substituted for a disabled real source.
2. The first real source is an opt-in OTLP/HTTP JSON trace receiver on `127.0.0.1`, default port `4318`, path `/v1/traces`. This pass accepts JSON-encoded OTLP trace payloads only. Binary protobuf and gzip are rejected with an explicit response rather than heuristically parsed.
3. Only span IDs, timestamps, model label, and numeric GenAI token attributes are retained long enough to form a normalized `TokenStreamEvent`. Prompt/response content, resource attributes, headers, authorization values, and raw bodies are never persisted or logged.
4. The receiver enforces a 1 MiB body limit, rejects non-loopback clients, malformed payloads, invalid counts, unsupported methods/paths/content encodings, and duplicate span IDs. Dedupe memory is bounded by a small FIFO/LRU window and is cleared on shutdown.
5. The extension host owns the listener and sends validated `TOKEN_STREAM` events through the existing versioned IPC envelope. The webview applies real and synthetic events through the same `TokenBus`/battery boundary.
6. Disconnected thinking, error, completion, and Berserk gameplay paths are removed. Token throughput remains orthogonal to XP, combat, victory, and defeat.

## Scope

- Add a pure OTLP JSON parser and loopback server with bounded input, dedupe, teardown, and normalized exact events.
- Start/stop the server lazily from the extension host when the setting changes; expose telemetry mode to the webview.
- Validate host-delivered events before gameplay mutation; preserve run correlation where a span supplies an ID.
- Bound TokenBus dedupe memory and keep status limited to `idle`, `streaming`, and `thinking`-free behavior (`idle`/`streaming`).
- Remove legacy gameplay mutation hooks for thinking, error, completion, and Berserk.
- Add fixture-driven unit tests for extraction, exact/invalid attributes, duplicates, body limits, loopback policy, port conflict, teardown, IPC mode, and synthetic/real parity.
- Update the telemetry decision and parity milestone evidence.

## Implementation sequence

1. Add normalized OTLP parser/server and unit tests independent of VS Code.
2. Add host lifecycle/configuration wiring and `TELEMETRY_STATUS` IPC.
3. Add webview handling for host events and make synthetic emission honor configuration.
4. Remove disconnected gameplay hooks and update tests.
5. Run typecheck, lint, all tests, build, package smoke, and diff review; inspect that no raw body/secret logging exists.

## Acceptance gate

- A valid local OTLP JSON fixture produces one exact battery event with input/cache/output counts and model-independent provenance.
- The same fixture resent with the same span ID produces no second event; bounded dedupe does not grow without limit.
- Malformed, oversized, non-POST, wrong-path, wrong-content-type, compressed, and non-loopback requests fail without callbacks.
- Port conflicts are reported without crashing activation; disabling the setting closes the listener; disposal is idempotent.
- Synthetic and OTLP events cross the same validated `TokenBus` and battery path; neither awards XP or changes combat.
- No prompt, response, workspace text, credential, authorization header, or raw trace body is written to state or logs.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run package`, and `git diff --check` pass.

## Review after implementation

Implementation review evidence (2026-08-01): `npm run typecheck`, `npm run lint`, `npm test -- --runInBand` (13 files, 73 tests), and `npm run build` pass. Fixture tests cover exact GenAI input/output/cache extraction, duplicate span suppression, bounded/oversized input, malformed JSON, wrong path/content type/encoding, loopback policy, port conflict, and idempotent teardown. The host starts the listener only when opted in, stops it on disable/disposal, and sends validated events through the existing IPC envelope. Unsupported OTLP capability (protobuf, gzip, metrics/logs, or remote collection) remains an explicit error, not an undocumented fallback.
