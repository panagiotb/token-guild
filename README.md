# Token Guild

**Token Guild** is an IDE extension for VS Code, Cursor, Windsurf, and AI IDE forks that turns LLM wait times into a retro fantasy auto-battler rogue-lite.

---

## Documentation

* 📖 [Product Specification & Game Design](file:///d:/Evdaimon%20Games/Apps/Token%20Guild/.dev/README.md)
* 🛠️ [Tech Stack & Architecture Specification](file:///d:/Evdaimon%20Games/Apps/Token%20Guild/.dev/TechStack.md)
* ⚡ [Universal Multi-Layer Token Telemetry Engine Spec](file:///d:/Evdaimon%20Games/Apps/Token%20Guild/.dev/UniversalTelemetryEngine.md)
* 🔍 [Token Master Prior Extension Reference](file:///d:/Evdaimon%20Games/Apps/Token%20Guild/.dev/TokenMasterReference.md)

## Token-free smoke test

The MVP is testable without an LLM, API key, or token stream. Run `npm ci`, then `npm run test:synthetic` for the deterministic simulation and synthetic telemetry tests (or `npm run test` for the full suite). To try it interactively, run the extension with `F5`, open the Token Guild activity-bar view, choose a hero, and select **Start dungeon run**. The run injects a labeled `synthetic / exact` fixture every 250 ms; no external telemetry is read. `npm run test:e2e` also verifies that the contributed Guild view is registered as a webview and can be opened in the Extension Development Host.
