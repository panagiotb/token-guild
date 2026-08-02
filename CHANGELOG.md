# Changelog

## 0.1.0

- Completed the first reviewed P0-P5 MVP slice: data-driven combat and 30-minute stage waves, tiered collection-owned pickups and treasure/evolutions, bounded meta progression/unlocks, opt-in loopback OTLP/HTTP JSON telemetry, and original vector presentation feedback.
- Added bounded OTLP receiver hardening (loopback-only binding, 1 MiB/512-span limits, duplicate suppression, explicit JSON-only errors, lifecycle teardown), host-to-webview telemetry IPC, and a 1200×960 truthful build/treasure PNG export with descriptive filenames.
- Fixed the Guild sidebar contribution to use the webview provider (instead of the default tree-view provider).
- Refined the sidebar UI with compact icon controls, responsive action buttons, and smaller level-up choice cards.
- Added a character status panel, visible run upgrade chips, enemy spawn/defeat counters, synthetic-token explanation, Guild Might explanation, and restrained crimson accents.
- Reworked the dungeon HUD with a centered stage title, compact clock/token map counters, and tooltip-backed enemy icons while keeping XP in the character bar only.
- Added a structured run summary with hero level, token provenance, gold ledger breakdown, enemy counts, upgrades, damage rows, and local export; hero selectors now show each hero's best reached run level.
- Corrected boss-gold ownership so the yellow chest marker cannot double-credit rewards, migrated progress to schema 2, and serialized host reward messages for safe persistence.
- Gold now follows visible pickup collection, upgrade cards keep stable DOM listeners between ticks, exports mirror the on-screen summary with run-specific filenames, and the responsive map HUD uses outside counters with instant enemy tooltips.
- Level-up choices now appear over the map, the dungeon title shares one row with clock/tokens, and gem collection—not elapsed time—awards XP and ordinary gold.
- Initial MVP: Guild and Code Dungeon run loop.
- Added the MVP token battery: weighted output/input/cache charging, active/idle drain, overflow gold-coin pickups, 15% lockout re-ignition, persistent capacity upgrades, battery fill/charging UI, and schema-3 progress migration.
- Six playable heroes, deterministic synthetic telemetry, level-up cards, boss victory/defeat, persistent Guild gold, pause/resume controls, synthesized SFX, and local summary-card export.
- Real telemetry remains opt-in and JSON-only for this first pass; DLC and exhaustive mapping content are not included.
