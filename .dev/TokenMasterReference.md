# Reference Summary: Token Master (`Token Master`)

This document summarizes the pre-existing **Token Master** extension codebase located at `D:\Evdaimon Games\Apps\Token Master` and highlights reusable architectural patterns, telemetry logic, and assets for **Token Guild**.

---

## 1. Overview & Location

* **Project Path:** [`D:\Evdaimon Games\Apps\Token Master\token-master`](file:///d:/Evdaimon%20Games/Apps/Token%20Master/token-master)
* **Publisher:** `evdaimon-games`
* **Purpose:** Real-time OpenTelemetry tracking, cost estimation, and model usage analytics for GitHub Copilot / LLM prompts inside VS Code.
* **Key Files & Direct Links:**
  * Manifest & Config: [package.json](file:///d:/Evdaimon%20Games/Apps/Token%20Master/token-master/package.json)
  * Extension Entry Point: [src/extension.ts](file:///d:/Evdaimon%20Games/Apps/Token%20Master/token-master/src/extension.ts)
  * OpenTelemetry (OTLP) Server: [src/telemetryServer.ts](file:///d:/Evdaimon%20Games/Apps/Token%20Master/token-master/src/telemetryServer.ts)
  * Webview Sidebar Provider: [src/webviewProvider.ts](file:///d:/Evdaimon%20Games/Apps/Token%20Master/token-master/src/webviewProvider.ts)
  * State & Pricing Storage Engine: [src/storage.ts](file:///d:/Evdaimon%20Games/Apps/Token%20Master/token-master/src/storage.ts)
  * Shared Interfaces: [src/types.ts](file:///d:/Evdaimon%20Games/Apps/Token%20Master/token-master/src/types.ts)
  * Root Media & Icons: [TokenMaster.png](file:///d:/Evdaimon%20Games/Apps/Token%20Master/TokenMaster.png), [media/icon.png](file:///d:/Evdaimon%20Games/Apps/Token%20Master/token-master/media/icon.png)

---

## 2. Core Architectural Patterns & Reusable Assets

### A. Real-Time OpenTelemetry (OTLP) Server ([src/telemetryServer.ts](file:///d:/Evdaimon%20Games/Apps/Token%20Master/token-master/src/telemetryServer.ts))
Instead of relying solely on heuristic file watchers, Token Master spins up a lightweight HTTP server on `http://127.0.0.1:4318/v1/traces` to capture actual LLM trace spans emitted by VS Code / Copilot extensions.

* **Span Attribute Extractions:**
  * Model: `gen_ai.response.model` / `gen_ai.request.model`
  * Input Tokens: `gen_ai.usage.input_tokens`
  * Cached Read Tokens: `gen_ai.usage.cache_read.input_tokens`
  * Cache Write Tokens: `gen_ai.usage.cache_creation.input_tokens`
  * Output Tokens: `gen_ai.usage.output_tokens`
* **Auto-Configuration:** `verifyCopilotTelemetry()` automatically prompts the user to configure `github.copilot.chat.otel` to send traces to `localhost:4318`.

### B. Fuzzy Model Matching & Pricing Table ([src/storage.ts](file:///d:/Evdaimon%20Games/Apps/Token%20Master/token-master/src/storage.ts))
Token Master features a robust matching algorithm (`getMatchScore`, `findPricingRateForModel`) that maps messy OTLP model string identifiers (e.g. `gpt-4.5-preview-2026`) to canonical pricing rates (GPT-4.1, Claude Sonnet/Opus, Gemini 3 Flash/Pro, etc.).

### C. State Persistence (`globalState`)
* Stores aggregated daily token usage indexed by date string (`YYYY-MM-DD`).
* Supports query ranges for Session, Last Prompt, 1 Day, 7 Days, 30 Days, and All Time.

### D. UI Styling & Theme Adaptation ([src/webviewProvider.ts](file:///d:/Evdaimon%20Games/Apps/Token%20Master/token-master/src/webviewProvider.ts))
* Pure Vanilla HTML/CSS embedded in the Webview Provider.
* Uses native VS Code CSS tokens (`var(--vscode-font-family)`, `var(--vscode-panel-background)`, `var(--vscode-editorWidget-border)`) for seamless UI integration.

---

## 3. Key Takeaways for Token Guild Integration

1. **Dual Telemetry Engine:** `Token Guild` will combine `Token Master`'s OTLP trace server ([telemetryServer.ts](file:///d:/Evdaimon%20Games/Apps/Token%20Master/token-master/src/telemetryServer.ts)) as the primary precise token emitter with `FileSystemWatcher` as a secondary fallback.
2. **Real Token Speed & Volume:** Output token metrics captured from OTLP directly stream into Phaser 3's XP system and hero speed scalar.
3. **Shared Visual Assets:** Visual artwork and SVG icons from `Token Master` can serve as source materials for branding and retro UI elements.
