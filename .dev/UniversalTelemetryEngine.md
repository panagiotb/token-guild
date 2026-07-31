# Specification: Universal Multi-Layer Token Telemetry Engine

**Project:** `Token Guild`

---

## 1. Problem Statement & Motivation

AI coding tools, IDE forks, and extension architectures vary drastically in how they execute LLM requests:

* **GitHub Copilot**: Emits OpenTelemetry OTLP trace spans via local HTTP POST.
* **Codex / OpenAI API Extensions**: Use direct HTTPS REST / SSE streams (`data: {"choices": ...}`) without standard OTLP telemetry.
* **Cursor / Windsurf / IDE Forks**: Use internal IPC protocols and background agent workers writing directly into buffer diffs.
* **CLI-based Agents (Codex CLI, Aider, Claude Code, Ollama)**: Stream responses directly into VS Code integrated terminal buffers (`Pty` / `Terminal`).
* **Third-Party Extensions (Cline, Roo Code, Continue)**: Insert text into documents via VS Code `TextEditorEdit` APIs.

Relying on a single telemetry source (such as Copilot OTLP) causes token tracking to fail on Codex, Cursor, CLI agents, and other tools. **Token Guild** solves this by introducing a **Universal Multi-Layer Token Ingestion Engine**.

---

## 2. Multi-Layer Telemetry Architecture

```
+-----------------------------------------------------------------------------------+
|                        UNIVERSAL TOKEN TELEMETRY ENGINE                           |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ Layer 1: OTLP Server ]    --> Copilot / OTLP Spans (Port 4318)               |
|  [ Layer 2: API Stream Proxy] --> Codex / OpenAI / Anthropic SSE Streams         |
|  [ Layer 3: Buffer Diff Stream]--> Real-time Document Edits (Cursor, Extensions)  |
|  [ Layer 4: Terminal Monitor ]--> CLI Agents (Codex CLI, Aider, Claude Code)     |
|                                                                                   |
+-----------------------------------------------------------------------------------+
                                          |
                                   (Deduplication)
                                          v
+-----------------------------------------------------------------------------------+
|                             UNIFIED TOKEN BUS                                     |
|  - Normalizes token speed (t/s)                                                   |
|  - Tracks Agent State (IDLE | THINKING | STREAMING)                              |
|  - Dispatches `TOKEN_STREAM` IPC events to Phaser 3 Webview                       |
+-----------------------------------------------------------------------------------+
```

---

## 3. Detailed Layer Specifications

### Layer 1: OTLP Trace Collector (`src/extension/telemetry/otlpServer.ts`)
* **Target Tools:** GitHub Copilot, OTLP-instrumented extensions.
* **Mechanism:** HTTP server on `http://127.0.0.1:4318/v1/traces`.
* **Payload Metric Extractors:** `gen_ai.usage.output_tokens`, `gen_ai.usage.input_tokens`, `gen_ai.response.model`.

### Layer 2: Local API Stream Proxy (`src/extension/telemetry/apiProxy.ts`)
* **Target Tools:** OpenAI Codex, Custom API endpoints, Local Ollama / LM Studio.
* **Mechanism:** Lightweight pass-through proxy or stream interceptor listening on optional local port (e.g. `11435`).
* **Chunk Parser:** Reads Server-Sent Event (SSE) chunks (`data: {"choices": [{"delta": {"content": "..."}}]}`) and increments token counts instantly per chunk.

### Layer 3: Document Buffer & Diff Monitor (`src/extension/telemetry/bufferWatcher.ts`)
* **Target Tools:** Cursor, Windsurf, Cline, Roo Code, Continue, inline completion providers.
* **Mechanism:** Listens to `vscode.workspace.onDidChangeTextDocument`.
* **Delta Computation:**
  $$\text{Inserted Chars} = \sum_{\text{change} \in \text{contentChanges}} \text{change.text.length}$$
  $$\text{Estimated Tokens} = \left\lceil \frac{\text{Inserted Chars}}{3.7} \right\rceil$$
* Filters out manual user typing (typing speed $< 15$ char/s) while catching rapid LLM insertion bursts ($\ge 30$ char/s or multi-line inserts).

### Layer 4: Integrated Terminal Monitor (`src/extension/telemetry/terminalWatcher.ts`)
* **Target Tools:** Codex CLI, Aider, Claude Code, Ollama CLI, Terminal-based agents.
* **Mechanism:** Listens to `vscode.window.onDidWriteTerminalData` (or `terminal.onDidWriteData`).
* **Stream Analysis:** Strips ANSI escape sequences and measures character output rates in real-time to compute token velocity.

---

## 4. Deduplication & State Machine (`src/extension/telemetry/tokenBus.ts`)

To prevent double-counting when an AI tool simultaneously triggers document diffs and terminal outputs:

1. **Priority Source Selection:** OTLP / API Proxy events take precedence over heuristic Buffer Diff estimation for the same timestamp window.
2. **Time-Sliding Windowing:** Token metrics are aggregated into $250\text{ms}$ ticks before firing `TOKEN_STREAM` events to the Webview.
3. **Agent State Classifier:**
   * `IDLE`: No token activity for $> 5\text{s}$.
   * `THINKING`: Agent execution active / file modified, but no output tokens for $\ge 3\text{s}$.
   * `STREAMING`: Active token throughput $\ge 1\text{ t/s}$.
   * `BERSERK`: Active token throughput $\ge 40\text{ t/s}$.

---

## 5. Benefits for Token Guild

* **100% Compatibility:** Works seamlessly regardless of whether the developer uses GitHub Copilot, OpenAI Codex, Cursor, Windsurf, Claude Code, Aider, or local Ollama models.
* **Zero Configuration Required:** Automatically activates heuristic fallback (Buffer Diff & Terminal Monitor) if OTLP telemetry is disabled or unsupported.
