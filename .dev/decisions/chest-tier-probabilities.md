# Decision record: Code Dungeon chest-tier probabilities

**Date:** 2026-08-03  
**Status:** Retained limitation; no new divergence approved

## Finding

The retained [Luck reference](https://vampire-survivors.fandom.com/wiki/Luck)
states that every Treasure Chest owns a base tier and three chest-specific
success chances for level 3 (five-item), level 2 (three-item), and level 1
treasure. The game checks from the highest tier downward and multiplies each
chance by total Luck. The [Pickups reference](https://vampire-survivors.fandom.com/wiki/Pickups)
confirms that a chest grants an upgrade to 1, 3, or 5 owned weapons/passives.
Neither reference publishes Code Dungeon-specific values for those three
chances.

## Decision

Keep the validated Code Dungeon table as a bounded provisional contract:

```json
{ "baseTier": 1, "fiveItemChance": 0.01, "threeItemChance": 0.02 }
```

Do not present these values as canonical base-game balance, do not copy values
from another stage or special mode, and do not change them without an
authoritative source or a directly observed run recording. The simulation
continues to apply total Luck, cap each probability at 1, check five then
three items, and fall back to the stage base tier. Reward ownership, rarity
weights, Banish/max-rank filtering, and deterministic replay are already
verified independently.

## Exit evidence

- Source/date and the missing stage-specific evidence are retained here.
- Registry validation rejects invalid tier/chance values.
- Simulation tests cover tier ordering, Luck multiplication, cap behavior,
  independent seeded draws, duplicate chest ownership, and reward selection.
- The next RG-04 action is direct observation or an authoritative Code Dungeon
  table; until then this remains `Partial` and is not a reason to invent a new
  gameplay rule.
