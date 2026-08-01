# Token Master integration research

Status: research only; no Token Master code or adapter is integrated into Token Guild.

The adjacent project at `D:\Evdaimon Games\Apps\Token Master\token-master` may provide evidence for a first real telemetry source. Its design reportedly includes a loopback OTLP HTTP receiver, GenAI token-attribute extraction, model matching, `globalState` aggregation, and VS Code theme-aware webview patterns.

## Candidate reusable ideas

- Listen on `127.0.0.1` for explicitly configured OTLP traces.
- Extract output, input, and cache-token attributes into Token Guild's normalized event shape.
- Keep raw spans out of persistence and logs.
- Reuse lifecycle lessons for port conflicts, configuration, teardown, and VS Code host behavior.
- Reuse design patterns only after verifying the current adjacent source, license/ownership, dependencies, and tests.

## Required re-audit before integration

1. Inspect the actual current Token Master repository; these notes are not proof of current behavior.
2. Confirm supported producers and exact OTLP attribute variants with fixtures.
3. Threat-model loopback requests, request/body limits, malformed protobuf/JSON, duplicate spans, and denial-of-service behavior.
4. Define explicit consent/configuration; do not silently alter another extension's settings.
5. Verify local, remote, reconnect, port-conflict, deactivation, and uninstall behavior.
6. Decide whether code can be shared under the projects' licenses; unattended execution may not make that licensing decision.

The implementation gate is [telemetry.md](../decisions/telemetry.md), and the user-facing gap is P4 in the [parity backlog](../VAMPIRE_SURVIVORS_PARITY_TODO.md).
