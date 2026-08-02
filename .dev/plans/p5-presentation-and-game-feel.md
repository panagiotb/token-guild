# P5 implementation plan - presentation and game feel

Status: implemented and reviewed; acceptance gate passed.
Date: 2026-08-01

> Retrospective review (2026-08-01): presentation helpers and static/accessibility assertions passed, but the Extension Development Host smoke does not click or inspect the webview DOM. Browser-level interaction coverage remains a P6 prerequisite; this plan remains a completed presentation foundation.

## Research and cross-check

Inputs:

- `.dev/plans/Vampire Survivors Mapping/00_OVERVIEW_AND_ARCHITECTURE.md`
- `.dev/plans/Vampire Survivors Mapping/13_AUDIO_AND_PERSISTENCE_SCHEMA_MAPPING.md`
- `.dev/VAMPIRE_SURVIVORS_PARITY_TODO.md` P5 scope and acceptance gate
- current `src/webview/main.ts`, `src/webview/style.css`, `src/webview/audio.ts`, `src/webview/shareCard.ts`, and UI tests

The mapping calls for readable sprites, pickup/combat feedback, event audio, pause/build clarity, accessibility, responsive behavior, and browser-level interaction coverage. Its telemetry-triggered Berserk, error, and completion sound ideas are intentionally not carried forward because P4 removed those disconnected gameplay hooks.

Locked P5 decisions:

1. Use original canvas/vector primitives and the existing inline SVG icon set for this MVP. No purchased or third-party asset is packaged without a verifiable license/provenance record; an art pass can replace these primitives later without changing simulation contracts.
2. Improve legibility and feedback without changing combat rules: distinct hero/enemy/pickup/projectile silhouettes, subtle hit/defeat/pickup pulses, level-up overlay emphasis, boss/victory/defeat announcements, and small existing AudioManager tones.
3. Keep feedback bounded and accessible. Effects are capped, reduced-motion aware, never the sole way to discover state, and represented in the live region/counters. Keyboard focus moves to the first level-up card and returns to the relevant screen control after dialogs/summary.
4. Keep the map and panels fluid up to the existing width cap, preserve narrow-sidebar stacking, and ensure pause still hides all content below Token Guild.
5. Make the PNG export self-contained and truthful: no overlap between build/treasure rows, readable empty states, and a filename containing hero, level, outcome, duration, token count, gold, and treasure count.

## Scope

- Replace debug circles/squares in the map renderer with original readable silhouettes and tiered color/shape language.
- Add bounded visual/audio feedback and live announcements for pickups, defeats, level-up, stage finale, lockout, victory, and defeat.
- Add reduced-motion CSS and canvas behavior, focus management, explicit accessible labels, and responsive overflow protections.
- Rework share-card layout and filename; update pure export tests.
- Add deterministic UI helper tests for feedback limits, export content, and accessibility markers. Browser-level launch remains a supported smoke path because the repository has no headless browser dependency.

## Implementation sequence

1. Add pure bounded feedback state/helpers and renderer silhouettes.
2. Wire announcements, focus, audio, pause/level-up transitions, and reduced-motion behavior.
3. Correct responsive CSS and share-card layout/filename.
4. Extend tests and run typecheck, lint, all tests, build, package, and diff review; manually inspect the generated HTML/CSS/PNG code paths.

## Acceptance gate

- Map entities are distinguishable without external assets; effects remain bounded and do not change simulation outcomes.
- Pickup, defeat, level-up, finale, lockout, victory, and defeat states have both visual and textual/audio feedback, with mute and reduced-motion honored.
- Upgrade cards, dialogs, pause/resume, summary, export, narrow/wide layout, and reload-safe state remain keyboard- and screen-reader-friendly.
- PNG export contains truthful build, treasure, damage, token, gold, and enemy information with a descriptive filename and no clipping/overlap in the tested layout.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run package`, and `git diff --check` pass.

## Review after implementation

Implementation review evidence (2026-08-01): `npm run typecheck`, `npm run lint`, `npm test -- --runInBand` (13 files, 73 tests), `npm run build`, `npm run test:e2e` (2 host smoke tests), `npm run package`, and `git diff --check` pass. The map renderer now uses original vector silhouettes and a grid rather than debug circles/squares; bounded feedback cues, live announcements, focus management, reduced-motion rules, responsive safeguards, and truthful 1200×960 export layout/filename are covered by helper and source-contract tests. Host smoke remains activation/webview-registration coverage rather than DOM click automation; a manual narrow/wide-sidebar playthrough is still an explicitly documented limitation. DLC, external art, new stage systems, and performance targets remain out of scope.
