# Phase 0 execution note: repository and feasibility audit

Step: Phase 0 — repository audit and scope freeze

Objective: establish the smallest buildable MVP boundary and identify assumptions that must not block the first implementation pass.

Dependencies: `.dev/AUTONOMY_CONFIG.json`, `.dev/PROJECT_MANAGEMENT.md`, adjacent product/architecture specifications.

Scope: planning documents only; no implementation exists yet.

Risks: the mapping set is much larger than MVP; terminal-output capture is not a stable published VS Code capability; real telemetry sources may be unavailable in a host or remote workspace.

Acceptance: the MVP manifest and telemetry decision record exist; the next step is unambiguous; no DLC or full-mapping work is required for the first pass.

Checks: `node --version` → `v22.20.0`; `npm --version` → `11.6.1`; VS Code extension-host environment detected; repository status inspected.

Result: pass for Phase 1 entry. Synthetic telemetry is the release baseline. Real adapters remain experimental until individually validated.

Follow-up: create the TypeScript/package scaffold and secure webview shell.
