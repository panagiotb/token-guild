# Token Guild

Token Guild is a desktop VS Code extension that turns approved LLM token activity into a small survivor-style fantasy game. Version `0.1.0` is a deterministic Canvas/DOM vertical slice with a synthetic 100-token/second fixture, an opt-in loopback OTLP/HTTP JSON source, token battery, one 30-minute Code Dungeon, persistent progression, and local run-summary export.

The default build needs no LLM, API key, token stream, or network access to play or test. Real telemetry is opt-in through `tokenGuild.telemetry.otlpEnabled`; it accepts only bounded JSON traces from localhost and never stores raw traces or credentials.

## Documentation

- [Development documentation index](.dev/README.md)
- [Current functionality manual](.dev/CURRENT_MANUAL.md)
- [Project management and unattended rules](.dev/PROJECT_MANAGEMENT.md)
- [Vampire Survivors parity backlog](.dev/VAMPIRE_SURVIVORS_PARITY_TODO.md)
- [Token battery specification](.dev/specifications/token-battery.md)

## Token-free smoke test

```powershell
npm ci
npm run test:synthetic
npm test
npm run typecheck
npm run lint
npm run build
```

For an interactive run, press `F5` in VS Code, open Token Guild from the activity bar, select a hero, and choose **Start dungeon run**. Move with arrow keys or `WASD`; combat is automatic.

`npm run test:e2e` verifies activation and opens the contributed Guild webview in an Extension Development Host. It does not automate webview clicks or visual layout, so user-facing changes still require a manual sidebar playthrough.
