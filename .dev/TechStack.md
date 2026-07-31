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
| **Telemetry Engine** | **Dual OTLP + FileWatcher** | Native `http` + `FileSystemWatcher` | Primary: Local OTLP server (`http://127.0.0.1:4318/v1/traces`) receiving exact Copilot/LLM trace tokens ([Token Master Pattern](file:///d:/Evdaimon%20Games/Apps/Token%20Guild/.dev/TokenMasterReference.md)). Fallback: FileSystemWatcher / Terminal listener. |
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
|  - OTLP Traces Server (http://127.0.0.1:4318/v1/traces)                 |
|  - FileWatcher & Terminal Listener (Fallback Stream Estimator)          |
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
  | { type: 'TOKEN_STREAM'; payload: { count: number; tokensPerSec: number; model?: string; cachedRead?: number } }
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

## 3. Game Engine Configuration (Phaser 3 + Arcade Physics)

The Webview instantiates Phaser using minimal WebGL/Canvas constraints to enforce high FPS in a 300px sidebar:

```typescript
// src/webview/config.ts
import Phaser from 'phaser';

export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 300,
  height: 600,
  parent: 'game-container',
  pixelArt: true, // Crisp 16-bit rendering
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false // Set true during prompt debugging
    }
  },
  scene: [] // Populated by GuildScene, DungeonScene, StealthScene
};
```

---

## 4. Target Project File Structure

LLMs working on this codebase must adhere to the following file layout:

```text
token-guild/
├── .dev/
│   ├── README.md               # Product specification & mechanics
│   ├── TechStack.md            # Architecture & toolings spec (this file)
│   └── TokenMasterReference.md # Reference & learnings from Token Master app
├── .vscode/
│   └── launch.json             # Extension debug configuration
├── src/
│   ├── extension/              # Host context (Node.js / VS Code API)
│   │   ├── extension.ts        # Entry point & Webview Provider registration
│   │   ├── telemetryServer.ts  # OTLP HTTP trace listener (localhost:4318)
│   │   ├── tokenWatcher.ts     # File system & terminal fallback listeners
│   │   └── stateManager.ts     # ExtensionContext.globalState wrapper
│   ├── webview/                # Webview app (Phaser 3 + UI)
│   │   ├── index.html          # Webview DOM shell
│   │   ├── main.ts             # Phaser bootstrap & IPC receiver
│   │   ├── config.ts           # Phaser configuration
│   │   ├── scenes/
│   │   │   ├── GuildScene.ts   # Meta-shop & Class selection
│   │   │   ├── DungeonScene.ts # Auto-battler loop
│   │   │   └── StealthScene.ts # ASCII telemetry view (Boss Key)
│   │   ├── entities/
│   │   │   ├── Hero.ts         # Player sprite + class passives
│   │   │   ├── EnemyGroup.ts   # Pooled arcade physics mobs
│   │   │   └── WeaponGroup.ts  # Auto-firing projectiles/auras
│   │   └── data/
│   │       ├── classes.json    # 1:1 VS character stats
│   │       ├── weapons.json    # 1:1 VS weapon evolutions & balance
│   │       └── pricing.json    # LLM model pricing & cost tables
│   └── shared/
│       └── types.ts            # IPC interfaces & game contracts
├── public/                     # Assets (Sprite sheets, SFX)
│   ├── sprites/                # 16-bit PNG sprite sheets
│   └── audio/                  # 8-bit WAV/MP3 sound effects
├── package.json                # Extension manifest & scripts
├── vite.config.ts              # Webview bundler config
└── esbuild.js                  # Extension host build script
```

---

## 5. Prior App Reference: Token Master Integration

For complete telemetry setup, OTLP trace payload parsing, fuzzy model matching, and VS Code CSS themes, refer to:
* Reference Document: [.dev/TokenMasterReference.md](file:///d:/Evdaimon%20Games/Apps/Token%20Guild/.dev/TokenMasterReference.md)
* Previous Repository: [`D:\Evdaimon Games\Apps\Token Master\token-master`](file:///d:/Evdaimon%20Games/Apps/Token%20Master/token-master)
  * Trace Server: [telemetryServer.ts](file:///d:/Evdaimon%20Games/Apps/Token%20Master/token-master/src/telemetryServer.ts)
  * Storage & Pricing Engine: [storage.ts](file:///d:/Evdaimon%20Games/Apps/Token%20Master/token-master/src/storage.ts)

---

## 6. Development Dependencies & Manifest

Target `package.json` manifest required for LLM bootstrap:

```json
{
  "name": "token-guild",
  "displayName": "Token Guild",
  "version": "0.1.0",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": ["Other"],
  "main": "./dist/extension.js",
  "scripts": {
    "vscode:prepublish": "npm run build",
    "compile": "tsc -p ./ && node esbuild.js",
    "watch": "tsc -w -p ./",
    "build:webview": "vite build",
    "dev:webview": "vite",
    "build": "node esbuild.js && vite build"
  },
  "dependencies": {
    "phaser": "^3.80.0"
  },
  "devDependencies": {
    "@types/node": "^18.x",
    "@types/vscode": "^1.85.0",
    "esbuild": "^0.20.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

---

## 7. LLM Generation Directives & Constraints

When prompting an LLM to generate components for this repository, strictly enforce the following rules:

1. **Arcade Physics Only:** Never request custom trigonometric collision math. Force the LLM to use `this.physics.add.overlap()` and `this.physics.moveToObject()`.
2. **Object Pooling Required:** Mobs and projectiles must use `Phaser.Physics.Arcade.Group` with `get()` and `killAndHide()` to prevent garbage collection frame stutters inside the IDE panel.
3. **No External CSS Frameworks:** Webview overlay UI (Upgrade Draft Cards, Boss Key Telemetry) must use vanilla CSS within `index.html` to keep bundle sizes low.
4. **Single Source of Truth for Balance:** All damage, cooldown, speed, and scaling math must be imported directly from `src/webview/data/weapons.json` and `classes.json`. Do not hardcode balance numbers directly inside Scene code.
5. **Robust Telemetry Handling:** Rely on OTLP trace telemetry ([telemetryServer.ts](file:///d:/Evdaimon%20Games/Apps/Token%20Master/token-master/src/telemetryServer.ts)) when available, gracefully falling back to file modification events.