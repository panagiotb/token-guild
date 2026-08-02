# UI asset decision

## Current pass

The packaged MVP uses original inline SVGs, CSS panels, Canvas primitives, and synthesized tones. No purchased Unity asset-pack content is embedded.

This keeps the current VSIX small and provenance-clear while game mechanics and silhouettes are still changing.

## Candidate packs owned by the project

- Fantasy RPG GUI: panel frames, tabs, and primary actions.
- Skill and Ability Icons: weapon/passive/level-up cards.
- Resource, Commodity and Tool Icons: gold, tokens, health, and progression.
- Technology and Skill Icons: settings and telemetry states if stylistically compatible.
- 2D Pixel RPG Monsters: enemies, bosses, and bestiary/summary portraits.
- Pixel Hero Maker: hero portraits after the roster and silhouettes stabilize.
- Food/Drink/Fruit and broad utility sets: only when a specific pickup/UI need exists.

## Import gate

Before packaging any purchased asset:

1. Verify the buyer's invoice and applicable redistribution/license terms for this extension.
2. Record source pack, original filename, imported filename, modification, and license in a provenance manifest.
3. Import only the selected runtime files, not the full Unity archive or editor metadata.
4. Optimize for the webview and add packaging/content assertions.
5. Confirm visual consistency, readability at sidebar scale, and replacement safety.

No unattended agent may make the licensing decision or assume Unity-store ownership grants unrestricted redistribution.
