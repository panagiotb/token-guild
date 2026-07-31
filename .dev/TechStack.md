# Tech Stack & Tooling Architecture Specification

**Project:** `Token Guild` (VS Code / Cursor / Windsurf Extension)

**Target:** Optimized for automated generation via LLMs / AI IDE Assistants

---

## 1. Stack Overview & Selection Rationale

The tech stack is selected specifically to maximize **LLM code-generation accuracy** (high training data saturation) while maintaining a strict **<10 MB bundle size** and **low runtime CPU footprint** in the IDE sidebar.

| Component | Selected Technology | Version / Spec | Purpose & LLM Rationale |
| --- | --- | --- | --- |
| **Language** | **TypeScript** | `v5.x` | Shared end-to-end typing between Extension Host and Webview IPC. LLMs generate strictly typed code with high reliability. |
| **Extension Host** | **VS Code Extension API** | `^1.85.0` | Native extension APIs for webview panel orchestration, globalState persistence, and user notifications. |
| **Telemetry Engine** | **Universal Multi-Layer Engine** | Custom Multi-Source | 4-layer ingestion: Layer 1 OTLP (`:4318`), Layer 2 API Proxy, Layer 3 Buffer Diff (`onDidChangeTextDocument`), Layer 4 Terminal Monitor (`onDidWriteTerminalData`). Compatible with Copilot, Codex, Cursor, Windsurf, Claude Code, Aider, and Ollama. |
| **Host Bundler** | **esbuild** | `^0.20.0` | Ultra-fast Node.js bundler for the Extension Host backend. Zero-config compilation to single `.js` artifact. |
| **Webview Engine** | **Phaser 3** | `^3.80.0` | Gold standard HTML5 2D game framework. Built-in Arcade Physics engine eliminates manual collision/movement code generation. |
| **Webview Bundler** | **Vite** | `^5.x` | Dev server and asset bundler for Webview UI. Supports HMR during development and tree-shaken static production builds. |
| **State Storage** | **VS Code `globalState`** | Native API | Key-value store for hero progression, unlocked classes, daily token history, and gold hoard. Requires no external DB. |
| **Stealth UI** | **Vanilla HTML5 DOM / CSS** | Standard | Zero-dependency text DOM layer overlaying the Canvas for instant hotkey camouflage toggling using VS Code theme tokens (`var(--vscode-...)`). |

---

## 2. System Architecture & Inter-Process Communication (IPC)

The application split follows a strict Host/Client paradigm over the VS Code Webview IPC channel (`vscode.postMessage` / `window.addEventListener('message')`).

```
+-------------------------------------------------------------------------+
|                        EXTENSION HOST (Node.js)                         |
|  +-------------------------------------------------------------------+  |
|  | Universal Token Bus & Deduplicator                                |  |
|  |  - Layer 1: OTLP Server (http://127.0.0.1:4318/v1/traces)        |  |
|  |  - Layer 2: API Stream Proxy (Codex / SSE stream reader)         |  |
|  |  - Layer 3: Buffer Diff Streamer (onDidChangeTextDocument)       |  |
|  |  - Layer 4: Terminal Monitor (onDidWriteTerminalData)            |  |
|  +-------------------------------------------------------------------+  |
|  - State & Progress Manager (globalState)                               |
+-------------------------------------------------------------------------+
                                    |
                    IPC Channel (Typed Messages)
                                    v
+-------------------------------------------------------------------------+
|                           WEBVIEW PANEL (Browser)                       |
|  +-------------------------------------------------------------------+  |
|  | Phaser 3 Arcade Engine (Canvas Layer)                            |  |
|  |  - Player, Mob Group, Projectile Group, Drop Group               |  |
|  +-------------------------------------------------------------------+  |
|  | HTML/CSS DOM (Overlay Layer)                                      |  |
|  |  - Upgrade Card Overlay, Boss Key Telemetry Screen               |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

### IPC Message Schemas (`src/shared/types.ts`)

```typescript
export type HostToWebviewEvent =
  | { type: 'TOKEN_STREAM'; payload: { count: number; tokensPerSec: number; source: 'OTLP' | 'PROXY' | 'BUFFER' | 'TERMINAL'; model?: string; cachedRead?: number } }
  | { type: 'AGENT_STATUS'; payload: { state: 'IDLE' | 'THINKING' | 'RUNNING' } }
  | { type: 'TASK_COMPLETE'; payload: { exitCode: number } }
  | { type: 'TOGGLE_STEALTH'; payload: { forceState?: boolean } }
  | { type: 'LOAD_STATE'; payload: { heroClass: string; gold: number; stats: Record<string, number> } };

export type WebviewToHostEvent =
  | { type: 'GAME_READY' }
  | { type: 'SAVE_PROGRESS'; payload: { gold: number; unlockedClasses: string[]; stats: Record<string, number> } }
  | { type: 'SHARE_CARD_GENERATE'; payload: { base64Png: string } }
  | { type: 'RESET_DATA' };
```

---

## 3. Target Project File Structure

LLMs working on this codebase must adhere to the following file layout:

```text
token-guild/
├── .dev/
│   ├── README.md                 # Product specification & mechanics
│   ├── TechStack.md              # Architecture & toolings spec (this file)
│   ├── UniversalTelemetryEngine.md# Multi-layer token counting specification
│   └── TokenMasterReference.md   # Reference & learnings from Token Master app
├── .vscode/
│   └── launch.json               # Extension debug configuration
├── src/
│   ├── extension/                # Host context (Node.js / VS Code API)
│   │   ├── extension.ts          # Entry point & Webview Provider registration
│   │   ├── telemetry/            # Universal Telemetry Engine
│   │   │   ├── tokenBus.ts       # Unified bus, state machine & deduplicator
│   │   │   ├── otlpServer.ts     # Layer 1: OTLP HTTP trace server (:4318)
│   │   │   ├── apiProxy.ts       # Layer 2: OpenAI/Codex SSE stream proxy
│   │   │   ├── bufferWatcher.ts  # Layer 3: Text document diff monitor
│   │   │   └── terminalWatcher.ts# Layer 4: Integrated terminal data listener
│   │   └── stateManager.ts       # ExtensionContext.globalState wrapper
│   ├── webview/                  # Webview app (Phaser 3 + UI)
│   │   ├── index.html            # Webview DOM shell
│   │   ├── main.ts               # Phaser bootstrap & IPC receiver
│   │   ├── config.ts             # Phaser configuration
│   │   ├── scenes/
│   │   │   ├── GuildScene.ts     # Meta-shop & Class selection
│   │   │   ├── DungeonScene.ts   # Auto-battler loop
│   │   │   └── StealthScene.ts   # ASCII telemetry view (Boss Key)
│   │   ├── entities/
│   │   │   ├── Hero.ts           # Player sprite + class passives
│   │   │   ├── EnemyGroup.ts     # Pooled arcade physics mobs
│   │   │   └── WeaponGroup.ts    # Auto-firing projectiles/auras
│   │   └── data/
│   │       ├── classes.json      # 1:1 VS character stats
│   │       ├── weapons.json      # 1:1 VS weapon evolutions & balance
│   │       └── pricing.json      # LLM model pricing & cost tables
│   └── shared/
│       └── types.ts              # IPC interfaces & game contracts
├── public/                       # Assets (Sprite sheets, SFX)
│   ├── sprites/                  # 16-bit PNG sprite sheets
│   └── audio/                    # 8-bit WAV/MP3 sound effects
├── package.json                  # Extension manifest & scripts
├── vite.config.ts                # Webview bundler config
└── esbuild.js                    # Extension host build script
```

---

## 4. Architectural Specs & References

* **Universal Telemetry Spec**: [.dev/UniversalTelemetryEngine.md](file:///d:/Evdaimon%20Games/Apps/Token%20Guild/.dev/UniversalTelemetryEngine.md)
* **Token Master Prior App**: [.dev/TokenMasterReference.md](file:///d:/Evdaimon%20Games/Apps/Token%20Guild/.dev/TokenMasterReference.md)