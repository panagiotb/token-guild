# Token Master integration research

Status: audited locally; ideas informed the implemented adapter. No Token Master code is copied into Token Guild.

The adjacent project at `D:\Evdaimon Games\Apps\Token Master\token-master` contains a loopback OTLP HTTP receiver and GenAI token-attribute extraction. Its practical producer shape is `POST /v1/traces` with `resourceSpans -> scopeSpans -> spans` and attributes such as `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`, and cache-token variants.

The audit also found safety gaps that Token Guild deliberately corrected: the adjacent server starts unconditionally, logs request activity, has no request-size bound, and has no duplicate-span protection. Token Guild's `src/telemetry/otlpServer.ts` is opt-in, loopback-only, JSON-only for this first pass, bounded to 1 MiB/512 spans, deduplicated, validated, and disposed with the webview provider.

Deferred sources remain explicit: API proxies, document-diff estimates, arbitrary terminal scraping, OTLP protobuf/gzip, metrics/logs, and remote collection. Any future source requires a new plan, producer fixtures, privacy review, and the telemetry decision gate.

The implementation record is [telemetry.md](../decisions/telemetry.md), and the current user-facing behavior is [CURRENT_MANUAL.md](../CURRENT_MANUAL.md).
