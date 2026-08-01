# Token Guild project management

This is the living execution plan. Current behavior is documented in [CURRENT_MANUAL.md](CURRENT_MANUAL.md); gameplay gaps and order are in [VAMPIRE_SURVIVORS_PARITY_TODO.md](VAMPIRE_SURVIVORS_PARITY_TODO.md).

## Current status

- **Release:** `0.1.0` deterministic vertical slice.
- **Lifecycle:** working foundation; not yet an authentic survivor-game implementation.
- **Renderer:** Canvas 2D map with DOM UI.
- **Telemetry:** synthetic fixture only in the playable UI.
- **Quality evidence:** on 2026-08-01, 47 unit tests, lint, typecheck, build, two Extension Development Host smoke tests, and VSIX packaging all passed; the package is 65.12 KB.
- **Accepted gameplay divergences:** token battery and Token Guild gold acquisition only.
- **Open release check:** manual narrow/wide-sidebar click-through because host smoke tests cannot drive the webview DOM.
- **Next implementation milestone:** P0 mechanically honest first stage from the parity backlog.

## Scope

The next pass remains MVP-only:

- establish correct base mechanics before adding broad content;
- keep one stage and the current six-character slice until foundations pass;
- keep synthetic telemetry for deterministic QA while building one real source later;
- exclude DLC, secret content, advanced modes, marketplace publication, and performance targets;
- use original/placeholders until specific licensed assets pass provenance review.

The mapping folder is a reference library, not a completion checklist. A mapping document never satisfies implementation acceptance.

## Unattended execution rules

1. **Working solution first.** Implement the smallest complete user flow for the active milestone. Put optional polish, generalization, compatibility, and extra content in the backlog.
2. **One step in progress.** Before changing code, record a step note below with objective, dependencies, allowed scope, risks, acceptance, and commands. Do not start a dependent step until the current one passes.
3. **Tests travel with behavior.** Add deterministic tests with the foundation. Cover success, boundary, invalid input, failure, persistence/teardown, and duplicate-event paths relevant to the change.
4. **Exercise the real boundary.** Pure tests are required for rules; integration tests are required for IPC/persistence; browser/host or a recorded manual check is required for user interaction. A clean build alone does not prove behavior.
5. **Do not weaken a gate.** Diagnose the smallest failing case, apply one focused fix, rerun the focused test, then rerun the affected regression suite.
6. **Replan on discovery.** If code disproves an assumption or exposes a dependency, update the step and backlog before proceeding. Never silently expand scope.
7. **Keep checkpoints reviewable.** Leave the workspace buildable after every passing step. Avoid unrelated refactors, generated artifacts, or speculative abstractions.
8. **Preserve product decisions.** Battery and gold divergences remain; all other mechanics target the approved base-game reference unless a new decision record is added.
9. **Respect authority.** Local implementation, tests, builds, approved online research/downloads, and documentation are autonomous. Stop before external publication/messages, credentials, destructive operations, network exposure, licensing decisions, or material scope changes.
10. **Report honestly.** A helper, registry record, mock, or unit test is not shipped functionality until wired through the production path. Record limitations explicitly.
11. **Leave a handoff.** End every unattended run with completed work, commands/results, remaining failures/risks, and the exact next step.

## Standard step cycle

1. Inspect repository status, current manual, active backlog item, implementation, and related tests.
2. Add or update the active step note.
3. Implement one foundation slice and its tests.
4. Run focused tests, then the relevant regression gate.
5. Review the diff for scope, security/privacy, reward ownership, migration safety, asset provenance, and generated files.
6. Update the manual only for verified user-facing behavior and mark backlog items only when their acceptance gate passes.
7. Leave the next step unambiguous.

## Step note template

```text
Step: <milestone.step> — <short name>
Status: planned | in progress | passed | blocked
Objective: <one observable outcome>
Dependencies: <passed steps/decisions or none>
Scope: <files and systems allowed to change>
Risks: <gameplay, persistence, security, privacy, licensing>
Acceptance: <specific behavior and required evidence>
Checks: <focused commands>; <regression commands>; <manual/host boundary>
Result: <commands, counts, artifact details, and known limitations>
Follow-up: <exact next step or smallest required decision>
```

Keep only the active and immediately previous step here. Git history retains completed execution notes.

## Active milestone plan

### P0.1 — lock the first-stage rules reference

Status: planned

Objective: produce a small, internally consistent data contract for the first six characters, their starting weapons, XP curve, initial passives, and the Code Dungeon stage slice before replacing the generic combat runtime.

Dependencies: documentation audit; [accepted divergences](decisions/accepted-divergences.md).

Scope: local mapping research, a new versioned gameplay contract/fixtures, registry schemas, and tests. No renderer or broad content work.

Risks: the existing mapping documents contain contradictions and unverified claims; copying protected code/assets is not permitted; changing XP/combat without migration is safe because run state is not persisted.

Acceptance:

- Every included number and behavior has one locked source and an explicit Token Guild name.
- Battery and gold exceptions are visibly marked and do not alter other mechanics.
- The contract distinguishes a weapon's eight real level effects rather than one base value plus a label.
- Character passive boundaries, XP thresholds, inventory limits, enemy/drop data, and stage events have deterministic fixtures.
- Registry validation rejects duplicate IDs, broken references, impossible levels, and unsupported mechanics.

Checks: focused registry/fixture tests; `npm run typecheck`; `npm test`; source and license review.

Result: not started.

Follow-up: P0.2 data-driven weapon/projectile runtime.

## Quality gates

### Per-step gate

- Focused unit tests pass.
- Typecheck and lint pass for code changes.
- No new untested branch at a trust, reward, collision, or persistence boundary.
- Docs distinguish implemented behavior from future intent.
- `git diff --check` passes and the diff contains no accidental generated or third-party files.

### Milestone gate

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:e2e`
- `npm run package`
- packaged-content and dependency audit
- recorded interactive playthrough for user-facing changes
- update `CURRENT_MANUAL.md`, parity backlog, and changelog from verified behavior

Tests must run without public network access, live tokens, secrets, or an external LLM.

## Non-negotiable engineering constraints

- Keep deterministic gameplay independent of DOM, VS Code, wall-clock timers, and network sources.
- Runtime-validate telemetry, persistence, content registries, and every IPC boundary.
- Preserve single-owner rewards and idempotent host persistence.
- Keep exact and estimated telemetry distinct. Never claim heuristic counts are exact.
- Do not retain prompts, model output, raw workspace/terminal/trace content, credentials, or authorization headers.
- Bind any future listener to loopback, opt in explicitly, bound its payload/queue, handle conflicts, and dispose it on deactivation.
- Honor CSP, keyboard access, focus, VS Code theme tokens, and reduced motion.
- Keep entity and queue counts bounded; formal performance targets are not required.
