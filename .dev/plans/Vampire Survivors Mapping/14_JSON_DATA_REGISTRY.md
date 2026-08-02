# Aspirational JSON registry examples

> Planning status (2026-08-01): aspirational examples only, not production-ready JSON. Canonical current registries live in `src/game/data/`; verify names, types, formulas, balance, and scope before porting any entry.

## 1. Overview

This document preserves early JSON examples for planning and terminology. They are incomplete, unverified, and incompatible with parts of the current TypeScript model. Do not integrate them directly; use the typed registries under `src/game/data/` as the canonical implementation boundary.

---

## 2. Characters registry example

```json
[
  {
    "id": "warrior",
    "name": "Warrior",
    "vsEquivalent": "Antonio Belpaese",
    "startingWeaponId": "broadsword",
    "baseStats": { "hp": 100, "armor": 1, "moveSpeed": 1.0, "might": 1.0, "area": 1.0, "speed": 1.0, "duration": 1.0, "cooldown": 1.0, "amount": 1, "revival": 0, "magnet": 1.0, "luck": 1.0, "growth": 1.0, "greed": 1.0, "curse": 1.0 },
    "passiveGrowth": { "stat": "might", "valuePerLevel": 0.10, "intervalLevels": 10, "maxBonus": 0.50 }
  },
  {
    "id": "wizard",
    "name": "Wizard",
    "vsEquivalent": "Imelda Belpaese",
    "startingWeaponId": "arcane_bolt",
    "baseStats": { "hp": 100, "armor": 0, "moveSpeed": 1.0, "might": 1.0, "area": 1.0, "speed": 1.0, "duration": 1.0, "cooldown": 1.0, "amount": 1, "revival": 0, "magnet": 1.0, "luck": 1.0, "growth": 1.10, "greed": 1.0, "curse": 1.0 },
    "passiveGrowth": { "stat": "growth", "valuePerLevel": 0.10, "intervalLevels": 5, "maxBonus": 0.30 }
  },
  {
    "id": "rogue",
    "name": "Rogue",
    "vsEquivalent": "Gennaro Belpaese",
    "startingWeaponId": "throwing_daggers",
    "baseStats": { "hp": 120, "armor": 0, "moveSpeed": 1.0, "might": 1.0, "area": 1.0, "speed": 1.0, "duration": 1.0, "cooldown": 1.0, "amount": 2, "revival": 0, "magnet": 1.0, "luck": 1.0, "growth": 1.0, "greed": 1.0, "curse": 1.0 },
    "passiveGrowth": { "stat": "amount", "valuePerLevel": 0, "intervalLevels": 0 }
  },
  {
    "id": "ranger",
    "name": "Ranger",
    "vsEquivalent": "Pasqualina Belpaese",
    "startingWeaponId": "bouncing_arrow",
    "baseStats": { "hp": 100, "armor": 0, "moveSpeed": 1.0, "might": 1.0, "area": 1.0, "speed": 1.10, "duration": 1.0, "cooldown": 1.0, "amount": 1, "revival": 0, "magnet": 1.0, "luck": 1.0, "growth": 1.0, "greed": 1.0, "curse": 1.0 },
    "passiveGrowth": { "stat": "speed", "valuePerLevel": 0.10, "intervalLevels": 5, "maxBonus": 0.30 }
  },
  {
    "id": "paladin",
    "name": "Paladin",
    "vsEquivalent": "Poe Ratcho",
    "startingWeaponId": "aegis_barrier",
    "baseStats": { "hp": 70, "armor": 0, "moveSpeed": 1.0, "might": 1.0, "area": 1.0, "speed": 1.0, "duration": 1.0, "cooldown": 1.0, "amount": 1, "revival": 0, "magnet": 1.25, "luck": 1.0, "growth": 1.0, "greed": 1.0, "curse": 1.0 },
    "passiveGrowth": { "stat": "magnet", "valuePerLevel": 0, "intervalLevels": 0 }
  },
  {
    "id": "pyromancer",
    "name": "Pyromancer",
    "vsEquivalent": "Arca Ladonna",
    "startingWeaponId": "dragon_breath",
    "baseStats": { "hp": 100, "armor": 0, "moveSpeed": 1.0, "might": 1.10, "area": 1.0, "speed": 1.0, "duration": 1.0, "cooldown": 1.0, "amount": 1, "revival": 0, "magnet": 1.0, "luck": 1.0, "growth": 1.0, "greed": 1.0, "curse": 1.0 },
    "passiveGrowth": { "stat": "cooldown", "valuePerLevel": -0.05, "intervalLevels": 10, "maxBonus": -0.15 }
  },
  {
    "id": "necromancer",
    "name": "Necromancer",
    "vsEquivalent": "Mortaccio",
    "startingWeaponId": "bone_throw",
    "baseStats": { "hp": 100, "armor": 0, "moveSpeed": 1.0, "might": 1.0, "area": 1.0, "speed": 1.0, "duration": 1.0, "cooldown": 1.0, "amount": 1, "revival": 0, "magnet": 1.0, "luck": 1.0, "growth": 1.0, "greed": 1.0, "curse": 1.0 },
    "passiveGrowth": { "stat": "amount", "valuePerLevel": 1, "intervalLevels": 20, "maxBonus": 3 }
  },
  {
    "id": "supreme_archon",
    "name": "Supreme Archon",
    "vsEquivalent": "Queen Sigma",
    "startingWeaponId": "victory_sword",
    "baseStats": { "hp": 333, "armor": 3, "moveSpeed": 1.0, "might": 1.50, "area": 1.0, "speed": 1.0, "duration": 1.0, "cooldown": 0.75, "amount": 1, "revival": 1, "magnet": 1.0, "luck": 1.50, "growth": 1.0, "greed": 1.0, "curse": 1.0 },
    "passiveGrowth": { "stat": "might", "valuePerLevel": 0.01, "intervalLevels": 1 }
  }
]
```

---

## 3. Weapons registry example

```json
[
  {
    "id": "broadsword",
    "name": "Broadsword",
    "vsEquivalent": "Whip",
    "maxLevel": 8,
    "evolution": { "resultWeaponId": "excalibur", "requiredPassiveId": "heart_of_vitality" },
    "baseStats": { "damage": 20, "cooldown": 1.35, "area": 1.0, "amount": 1 }
  },
  {
    "id": "arcane_bolt",
    "name": "Arcane Bolt",
    "vsEquivalent": "Magic Wand",
    "maxLevel": 8,
    "evolution": { "resultWeaponId": "archmage_staff", "requiredPassiveId": "haste_amulet" },
    "baseStats": { "damage": 10, "cooldown": 1.00, "area": 1.0, "amount": 1 }
  },
  {
    "id": "throwing_daggers",
    "name": "Throwing Daggers",
    "vsEquivalent": "Knife",
    "maxLevel": 8,
    "evolution": { "resultWeaponId": "thousand_blades", "requiredPassiveId": "iron_bracer" },
    "baseStats": { "damage": 6.5, "cooldown": 1.00, "area": 1.0, "amount": 1 }
  },
  {
    "id": "battle_axe",
    "name": "Battle Axe",
    "vsEquivalent": "Axe",
    "maxLevel": 8,
    "evolution": { "resultWeaponId": "scythe_of_doom", "requiredPassiveId": "orb_of_expansion" },
    "baseStats": { "damage": 20, "cooldown": 1.25, "area": 1.0, "amount": 1 }
  },
  {
    "id": "celestial_cross",
    "name": "Celestial Cross",
    "vsEquivalent": "Cross",
    "maxLevel": 8,
    "evolution": { "resultWeaponId": "heaven_blade", "requiredPassiveId": "clover_of_fortune" },
    "baseStats": { "damage": 10, "cooldown": 2.00, "area": 1.0, "amount": 1 }
  },
  {
    "id": "orbiting_grimoire",
    "name": "Orbiting Grimoire",
    "vsEquivalent": "King Bible",
    "maxLevel": 8,
    "evolution": { "resultWeaponId": "unabridged_codex", "requiredPassiveId": "spellbinder_scroll" },
    "baseStats": { "damage": 10, "cooldown": 3.00, "area": 1.0, "amount": 1 }
  },
  {
    "id": "dragon_breath",
    "name": "Dragon Breath",
    "vsEquivalent": "Fire Wand",
    "maxLevel": 8,
    "evolution": { "resultWeaponId": "cataclysm_orb", "requiredPassiveId": "power_gauntlets" },
    "baseStats": { "damage": 20, "cooldown": 1.20, "area": 1.0, "amount": 3 }
  },
  {
    "id": "aegis_barrier",
    "name": "Aegis Barrier",
    "vsEquivalent": "Garlic",
    "maxLevel": 8,
    "evolution": { "resultWeaponId": "sanctuary", "requiredPassiveId": "phoenix_amulet" },
    "baseStats": { "damage": 5, "cooldown": 1.00, "area": 1.0, "amount": 1 }
  },
  {
    "id": "alchemist_fire",
    "name": "Alchemist Fire",
    "vsEquivalent": "Santa Water",
    "maxLevel": 8,
    "evolution": { "resultWeaponId": "philosophers_potion", "requiredPassiveId": "token_magnetism" },
    "baseStats": { "damage": 10, "cooldown": 4.00, "area": 1.0, "amount": 1 }
  },
  {
    "id": "bouncing_arrow",
    "name": "Bouncing Arrow",
    "vsEquivalent": "Runetracer",
    "maxLevel": 8,
    "evolution": { "resultWeaponId": "no_future", "requiredPassiveId": "iron_armor" },
    "baseStats": { "damage": 10, "cooldown": 3.00, "area": 1.0, "amount": 1 }
  },
  {
    "id": "chain_lightning",
    "name": "Chain Lightning",
    "vsEquivalent": "Lightning Ring",
    "maxLevel": 8,
    "evolution": { "resultWeaponId": "thunderfall_orb", "requiredPassiveId": "ring_of_duplication" },
    "baseStats": { "damage": 15, "cooldown": 4.50, "area": 1.0, "amount": 2 }
  },
  {
    "id": "victory_sword",
    "name": "Victory Sword",
    "vsEquivalent": "Victory Sword",
    "maxLevel": 12,
    "evolution": { "resultWeaponId": "sole_solution", "requiredPassiveId": "pandoras_box" },
    "baseStats": { "damage": 25, "cooldown": 0.75, "area": 1.0, "amount": 1 }
  }
]
```

---

## 4. Passives registry example

```json
[
  { "id": "power_gauntlets", "name": "Power Gauntlets", "vsEquivalent": "Spinach", "maxLevel": 5, "statBonus": { "stat": "might", "valuePerLevel": 0.10 } },
  { "id": "iron_armor", "name": "Iron Armor", "vsEquivalent": "Armor", "maxLevel": 5, "statBonus": { "stat": "armor", "valuePerLevel": 1 } },
  { "id": "heart_of_vitality", "name": "Heart of Vitality", "vsEquivalent": "Hollow Heart", "maxLevel": 5, "statBonus": { "stat": "maxHealth", "valuePerLevel": 0.20 } },
  { "id": "phoenix_amulet", "name": "Phoenix Amulet", "vsEquivalent": "Pummarola", "maxLevel": 5, "statBonus": { "stat": "recovery", "valuePerLevel": 0.20 } },
  { "id": "haste_amulet", "name": "Haste Amulet", "vsEquivalent": "Empty Tome", "maxLevel": 5, "statBonus": { "stat": "cooldown", "valuePerLevel": 0.08 } },
  { "id": "orb_of_expansion", "name": "Orb of Expansion", "vsEquivalent": "Candelabrador", "maxLevel": 5, "statBonus": { "stat": "area", "valuePerLevel": 0.10 } },
  { "id": "iron_bracer", "name": "Iron Bracer", "vsEquivalent": "Bracer", "maxLevel": 5, "statBonus": { "stat": "speed", "valuePerLevel": 0.10 } },
  { "id": "spellbinder_scroll", "name": "Spellbinder Scroll", "vsEquivalent": "Spellbinder", "maxLevel": 5, "statBonus": { "stat": "duration", "valuePerLevel": 0.10 } },
  { "id": "ring_of_duplication", "name": "Ring of Duplication", "vsEquivalent": "Duplicator", "maxLevel": 2, "statBonus": { "stat": "amount", "valuePerLevel": 1 } },
  { "id": "wings_of_hermes", "name": "Wings of Hermes", "vsEquivalent": "Wings", "maxLevel": 5, "statBonus": { "stat": "moveSpeed", "valuePerLevel": 0.10 } },
  { "id": "token_magnetism", "name": "Token Magnetism", "vsEquivalent": "Attractorb", "maxLevel": 5, "statBonus": { "stat": "magnet", "valuePerLevel": 0.33 } },
  { "id": "clover_of_fortune", "name": "Clover of Fortune", "vsEquivalent": "Clover", "maxLevel": 5, "statBonus": { "stat": "luck", "valuePerLevel": 0.10 } },
  { "id": "crown_of_wisdom", "name": "Crown of Wisdom", "vsEquivalent": "Crown", "maxLevel": 5, "statBonus": { "stat": "growth", "valuePerLevel": 0.08 } },
  { "id": "stone_mask", "name": "Stone Mask", "vsEquivalent": "Stone Mask", "maxLevel": 5, "statBonus": { "stat": "greed", "valuePerLevel": 0.10 } },
  { "id": "skull_of_doom", "name": "Skull of Doom", "vsEquivalent": "Skull O'Maniac", "maxLevel": 5, "statBonus": { "stat": "curse", "valuePerLevel": 0.10 } },
  { "id": "tiragisu_ankh", "name": "Tiragisú Ankh", "vsEquivalent": "Tiragisú", "maxLevel": 2, "statBonus": { "stat": "revival", "valuePerLevel": 1 } },
  { "id": "pandoras_box", "name": "Pandora's Box", "vsEquivalent": "Torrona's Box", "maxLevel": 9, "statBonus": { "stat": "allStats", "valuePerLevel": 0.04 } }
]
```

---

## 5. Guild PowerUps registry example

```json
[
  { "id": "might", "name": "Guild Might", "maxRank": 5, "statIncrease": 0.05, "baseGoldCost": 200, "multiplier": 1.10 },
  { "id": "armor", "name": "Guild Armor", "maxRank": 3, "statIncrease": 1.00, "baseGoldCost": 600, "multiplier": 1.15 },
  { "id": "maxHealth", "name": "Guild Vitality", "maxRank": 3, "statIncrease": 0.10, "baseGoldCost": 200, "multiplier": 1.10 },
  { "id": "recovery", "name": "Guild Recovery", "maxRank": 5, "statIncrease": 0.10, "baseGoldCost": 200, "multiplier": 1.10 },
  { "id": "cooldown", "name": "Guild Haste", "maxRank": 2, "statIncrease": 0.025, "baseGoldCost": 900, "multiplier": 1.20 },
  { "id": "area", "name": "Guild Expansion", "maxRank": 2, "statIncrease": 0.05, "baseGoldCost": 300, "multiplier": 1.10 },
  { "id": "speed", "name": "Guild Swiftness", "maxRank": 2, "statIncrease": 0.10, "baseGoldCost": 300, "multiplier": 1.10 },
  { "id": "amount", "name": "Guild Duplication", "maxRank": 1, "statIncrease": 1.00, "baseGoldCost": 5000, "multiplier": 1.50 },
  { "id": "revival", "name": "Ankh Revival", "maxRank": 1, "statIncrease": 1.00, "baseGoldCost": 10000, "multiplier": 2.00 }
]
```

---

## 6. Relics registry example

```json
[
  { "id": "milky_way_map", "name": "Milky Way Map", "vsEquivalent": "Milky Way Map", "featureUnlocked": "WORKSPACE_MINIMAP" },
  { "id": "grim_grimoire", "name": "Grim Grimoire", "vsEquivalent": "Grim Grimoire", "featureUnlocked": "EVOLUTION_CODEX" },
  { "id": "ars_gouda", "name": "Ars Gouda", "vsEquivalent": "Ars Gouda", "featureUnlocked": "LINTER_BESTIARY" },
  { "id": "sorceress_tears", "name": "Sorceress' Tears", "vsEquivalent": "Sorceress' Tears", "featureUnlocked": "HURRY_MODE" },
  { "id": "glass_vizard", "name": "Glass Vizard", "vsEquivalent": "Glass Vizard", "featureUnlocked": "IN_RUN_MERCHANT" },
  { "id": "mindbender", "name": "Mindbender", "vsEquivalent": "Mindbender", "featureUnlocked": "WEAPON_SLOT_LIMITER" },
  { "id": "randomazzo", "name": "Randomazzo", "vsEquivalent": "Randomazzo", "featureUnlocked": "ARCANA_SYSTEM" },
  { "id": "yellow_sign", "name": "Yellow Sign", "vsEquivalent": "Yellow Sign", "featureUnlocked": "HIDDEN_RELICS" },
  { "id": "great_gospel", "name": "Great Gospel", "vsEquivalent": "Great Gospel", "featureUnlocked": "LIMIT_BREAK" },
  { "id": "darkasso", "name": "Darkasso", "vsEquivalent": "Darkasso", "featureUnlocked": "DARKANA_MODE" }
]
```

---

## 7. Arcanas registry example

```json
[
  { "id": "0", "name": "Sarabande of Restoration", "vsEquivalent": "Sarabande of Healing", "type": "BASE", "effect": "Doubles healing and releases holy damage ring on HP recovery." },
  { "id": "I", "name": "Twin Code Buffer", "vsEquivalent": "Gemini", "type": "BASE", "effect": "Duplicates designated weapons with phantom secondary projectiles." },
  { "id": "IV", "name": "Phoenix Awakening", "vsEquivalent": "Awake", "type": "BASE", "effect": "Grants +3 Revivals; consuming revival boosts HP, Armor, Might, Speed." },
  { "id": "VIII", "name": "Code Gravity", "vsEquivalent": "Mad Groove", "type": "BASE", "effect": "Pulls all XP gems, chests, and floor drops directly to player every 2 minutes." },
  { "id": "XV", "name": "Token Gold Rush", "vsEquivalent": "Disco of Gold", "type": "BASE", "effect": "Gold coin pickup triggers Gold Rush continuous healing and score multipliers." },
  { "id": "XXI", "name": "Stellar Orbit", "vsEquivalent": "Blood Astronomia", "type": "BASE", "effect": "Magnet, Area, and Speed create damaging gravitational orbits around hero." },
  { "id": "DARK_XXI", "name": "Void Eruption", "vsEquivalent": "Wandering the Jet Black", "type": "DARKANA", "effect": "Drains HP to release dark void explosions scaling with total HP recovered." }
]
```
