# External asset review

**Status:** catalogued for evaluation on 2026-08-02; not integrated.

The index covers the two user-provided Unity asset roots:

- `fantasy-rpg-gui`: Artsystack Fantasy RPG GUI. The generator records every PNG, dimensions, alpha channel, SHA-256 duplicate group, likely theme/size/shadow variants, a semantic filename-derived description, and the adjacent Unity `.meta` path for later sprite-slice review.
- `pixel-rpg-monsters`: Layer Lab 2D Pixel-RPGMonstersIcon. The generator records every PNG and preserves theme, default/min-size, and shadow/no-shadow variants as separate rows.

Run `node scripts/build-asset-index.mjs` after the source packs change. The generated `asset-index.json` and `ASSET_INDEX.md` are an inventory, not a license grant. Exact Asset Store license terms, invoice/provenance, redistribution permission, and whether a VSIX may package the files must be checked before adoption. No third-party raster, PSD, font, Unity metadata, or prefab is currently copied into `resources/` or the webview.

`reviewStatus: variant-reviewed` means the file was reconciled mechanically with its source tree and duplicate/variant metadata. It does not claim a human has approved the visual, style fit, or legal terms. Before adoption, generate bounded contact sheets, inspect every unique hash/variant group one by one, replace the description with an observed semantic description, and record a shortlist/rejection list here. This review intentionally follows first-loop gameplay work in `P7_FULL_GAME_ROADMAP.md`.
