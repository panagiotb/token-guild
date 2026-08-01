# Visual effects and feedback backlog

Status: future presentation research. The current renderer is Canvas 2D/DOM, not Phaser.

## Feedback goals

Prioritize clarity at narrow sidebar scale:

- hit flash and compact damage feedback;
- enemy death burst and pickup trail;
- gem/gold/chest collection pulse;
- level-up freeze and card entrance;
- weapon upgrade/evolution reveal;
- boss spawn, damage, death, and chest sequence;
- battery charging, overflow, depletion, and re-ignition states;
- victory/defeat transition and summary reveal.

## Implementation constraints

- Effects must be driven by deterministic gameplay events, not infer outcomes from rendered pixels.
- Use pooled/bounded effect objects and dispose them with the view.
- Keep important enemies, pickups, HP, and upgrade choices legible under dense effects.
- Honor reduced motion by disabling flashes/shakes/particle bursts or replacing them with static emphasis.
- Do not introduce Phaser solely for effects; a renderer migration requires its own decision and regression plan.
- Prefer original procedural Canvas/CSS effects for the next pass. Online or purchased assets require provenance and packaging review.

## Asset research candidates

- Kenney and OpenGameArt may be searched for compatible CC0 assets when a concrete need exists; verify each asset's individual license rather than relying on site-level assumptions.
- Purchased Unity icon/GUI/monster packs remain candidates under [ui-assets.md](../decisions/ui-assets.md).

Presentation work follows mechanical P0–P2 foundations so feedback is attached to stable events and weapon identities.
