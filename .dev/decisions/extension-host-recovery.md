# Extension Development Host recovery evidence

**Status:** platform-limited with production-provider coverage
**Checked:** 2026-08-02

## Finding

The supported `@vscode/test-electron` integration harness can activate Token
Guild, inspect contributed views/settings, and open the Guild view. It does not
expose a supported API for injecting webview DOM events, observing the private
webview message channel, or forcing a real view disconnect/reconnect while
retaining a user-visible Extension Development Host session.

The repository therefore does not claim a real Extension Development Host
long-run DOM replay. The production boundary is still exercised directly by
`tests/unit/extensionRecovery.test.ts`: it creates the real
`GuildViewProvider`, persists detached host checkpoints, restores through
`READY`/`RUN_SNAPSHOT`, covers long-running replay without drift, restores a
paused level-up overlay, rejects stale actions, and proves terminal reward
idempotency. `npm run test:e2e` separately verifies activation and view
registration in the downloaded VS Code test host.

## Unattended decision

Keep host-owned checkpoints, intent sequencing, lifecycle invalidation, and
provider recovery as the automated acceptance boundary. Do not add private
Electron/DOM automation, inspect VS Code internals, or weaken the webview
authority model solely to manufacture a click trace. A future supported VS
Code test API may promote this record to full manual/host evidence; until then
the limitation is explicit in ADR-001 and the P7 remaining-gaps plan.

## Reproduction commands

```text
npm test -- --run tests/unit/extensionRecovery.test.ts
npm run test:e2e
```

Both commands must remain green before changing the host recovery boundary.
