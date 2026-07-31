# Changelog

## 0.1.0

- Fixed the Guild sidebar contribution to use the webview provider (instead of the default tree-view provider).
- Refined the sidebar UI with compact icon controls, responsive action buttons, and smaller level-up choice cards.
- Added a character status panel, visible run upgrade chips, enemy spawn/defeat counters, synthetic-token explanation, Guild Might explanation, and restrained crimson accents.
- Reworked the dungeon HUD with a centered stage title, compact clock/token map counters, and tooltip-backed enemy icons while keeping XP in the character bar only.
- Added a structured run summary with hero level, token provenance, gold ledger breakdown, enemy counts, upgrades, damage rows, and local export; hero selectors now show each hero's best reached run level.
- Corrected boss-gold ownership so the yellow chest marker cannot double-credit rewards, migrated progress to schema 2, and serialized host reward messages for safe persistence.
- Gold now follows visible pickup collection, upgrade cards keep stable DOM listeners between ticks, exports mirror the on-screen summary with run-specific filenames, and the responsive map HUD uses outside counters with instant enemy tooltips.
- Initial MVP: Guild and Code Dungeon run loop.
- Six playable heroes, deterministic synthetic telemetry, level-up cards, boss victory/defeat, persistent Guild gold, stealth view, synthesized SFX, and local summary-card export.
- Real telemetry adapters remain experimental and opt-in; DLC and exhaustive mapping content are not included.
