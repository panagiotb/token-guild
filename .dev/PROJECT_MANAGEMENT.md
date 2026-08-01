# Token Guild project management

This is the living execution contract. [CURRENT_MANUAL.md](CURRENT_MANUAL.md) describes verified behavior; [VAMPIRE_SURVIVORS_PARITY_TODO.md](VAMPIRE_SURVIVORS_PARITY_TODO.md) is the ordered gap list; [plans/](plans/) records milestone research and acceptance evidence.

## Current status

- **Release:** `0.1.0` deterministic Canvas/DOM vertical slice.
- **Completed:** P0 rules/combat, P1 Code Dungeon stage loop, P2 pickups/treasure/evolution, P3 meta progression/unlocks, P4 production telemetry, P5 presentation/game feel.
- **Renderer:** original Canvas/vector silhouettes with DOM controls; no external art packaged.
- **Telemetry:** synthetic fixture by default; opt-in loopback OTLP/HTTP JSON adapter on localhost with bounded input, dedupe, and teardown.
- **Quality evidence:** 73 unit tests, strict typecheck, lint, build, VSIX package, and `git diff --check` pass on 2026-08-01. Host smoke opens the contributed webview but does not automate DOM clicks.
- **Accepted divergences:** token battery gameplay and Token Guild gold acquisition only.
- **Next work:** none is implicitly active. Every future unattended run must choose one parity item and write a plan first.

## Scope boundary

The project remains MVP-only:

- preserve one proven stage and bounded first-pass content until a later decision expands it;
- keep deterministic synthetic telemetry for QA and require explicit opt-in for real telemetry;
- exclude DLC, secrets, advanced modes, marketplace publishing, external assets without provenance, and performance targets;
- do not add a gameplay divergence without a decision record and parity-backlog update.

## Unattended execution rules

1. **Working solution first.** Implement the smallest complete user flow for the active milestone. Put optional polish, generalization, compatibility, and extra content in the backlog.
2. **Plan every step.** Before changing code, write or update a plan with objective, dependencies, allowed scope, risks, acceptance, and commands. Review the plan before implementation.
3. **One step in progress.** Do not start a dependent step until the current step passes its focused and regression gates.
4. **Tests travel with behavior.** Cover success, boundary, invalid input, failure, persistence/teardown, and duplicate-event paths relevant to each change.
5. **Exercise real boundaries.** Pure tests cover rules; integration tests cover IPC/persistence; host/browser or a recorded manual check covers user interaction. A clean build alone is not proof.
6. **Do not weaken a gate.** Diagnose the smallest failing case, apply one focused fix, rerun the focused test, then rerun the affected regression suite.
7. **Replan on discovery.** If code disproves an assumption or exposes a dependency, update the plan and backlog before proceeding; never silently expand scope.
8. **Keep checkpoints reviewable.** Leave the workspace buildable after every passing step; avoid unrelated refactors, generated artifacts, or speculative abstractions.
9. **Preserve product decisions.** Battery and gold divergences remain; all other mechanics target the approved base-game reference unless a new decision record is added.
10. **Respect authority.** Local implementation, tests, builds, approved online research, and documentation are autonomous. Stop before external publication/messages, credentials, destructive operations, network exposure, licensing decisions, or material scope changes.
11. **Report honestly.** A helper, registry record, mock, or unit test is not shipped functionality until wired through the production path. Record limitations explicitly.
12. **Leave a handoff.** End every unattended run with completed work, commands/results, remaining risks, and the exact next step.

## Standard step cycle

1. Inspect repository status, current manual, active backlog item, implementation, and related tests.
2. Add or update the active plan on disk; include research and source links when facts may change.
3. Implement one foundation slice and its tests.
4. Run focused tests, then the relevant regression gate.
5. Review the diff for scope, security/privacy, reward ownership, migration safety, asset provenance, and generated files.
6. Update the manual only for verified user-facing behavior and record milestone evidence.
7. Leave the next step unambiguous or mark the goal complete only when no required work remains.

## Quality gates

### Per-step gate

- focused tests pass;
- typecheck and lint pass;
- no new untested trust, reward, collision, persistence, or IPC branch;
- documentation distinguishes implemented behavior from future intent;
- `git diff --check` passes and no accidental generated/third-party files are included.

### Milestone gate

```text
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run package
git diff --check
```

Tests must run without public-network dependency, live tokens, secrets, or an external LLM. A user-facing change also requires a narrow/wide-sidebar manual playthrough or an equivalent host/browser check; current repository smoke is activation-only, so record that limitation rather than claiming click coverage.

## Non-negotiable engineering constraints

- Keep deterministic gameplay independent of DOM, VS Code, wall-clock timers, and network sources.
- Runtime-validate telemetry, persistence, content registries, and every IPC boundary.
- Preserve single-owner rewards and idempotent host persistence.
- Keep exact and estimated telemetry distinct; never claim heuristic counts are exact.
- Do not retain prompts, model output, raw workspace/terminal/trace content, credentials, or authorization headers.
- Bind listeners to loopback, opt in explicitly, bound payload/queue/memory/work, handle conflicts, and dispose on deactivation.
- Honor CSP, keyboard access, focus, VS Code theme tokens, and reduced motion.
- Keep entity, effect, and queue counts bounded. No performance target is required beyond bounded-resource stability.
