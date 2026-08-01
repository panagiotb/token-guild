# Vampire Survivors to Token Guild 1:1 Mapping System

## 1. Executive Summary & Mapping Philosophy

**Token Guild** is an IDE extension for VS Code, Cursor, and Windsurf that transforms normalized LLM telemetry into a retro fantasy auto-battler rogue-lite. The MVP uses a deterministic Canvas/DOM renderer and a battery-gated token economy.

To guarantee proven gameplay depth and balanced progression, **Token Guild** implements a strict **1:1 mathematical and mechanical reskin** of *Vampire Survivors*. Every hero, weapon, passive accessory, pickup drop, power-up, damage formula, and stage event from *Vampire Survivors* is mapped to a corresponding retro fantasy RPG concept and bound directly to IDE code events (token streaming, prompt generation speed, agent thinking delays, syntax/linter errors, and terminal process exit codes).

---

## 2. Core Architecture & Layer Mapping

```
+-----------------------------------------------------------------------------------+
|                        Vampire Survivors Core Engine                              |
|  - Frame Ticks    - Mob Spawning Engine    - Player Input    - XP Drop Collection |
+-----------------------------------------------------------------------------------+
                                          |
                                    (1:1 Reskin)
                                          v
+-----------------------------------------------------------------------------------+
|                           Token Guild Engine Matrix                               |
|                                                                                   |
|  +-----------------------------------+     +-----------------------------------+  |
|  |     IDE Host Telemetry Engine     |     |     Canvas/DOM Webview            |  |
|  | - Token Output Stream             | --> | - Player Auto-Combat & XP Level   |  |
|  | - Tokens/Second Rate (t/s)        | --> | - Movement & Berserk Mode (1.5x)  |  |
|  | - Agent Thinking Time (>=3s)      | --> | - Power Charge AOE Ultimate       |  |
|  | - Linter / Syntax Error Triggers  | --> | - Hazard / Counter-strike Damage  |  |
|  | - Terminal Exit Code (0 / 1+)     | --> | - Floor Boss Victory & Chest Drop |  |
|  +-----------------------------------+     +-----------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 3. High-Level Entity Mapping Matrix

| Vampire Survivors Category | VS Game Element | Token Guild Reskin | IDE Telemetry / Token Binding |
| :--- | :--- | :--- | :--- |
| **Characters** | Antonio, Imelda, Gennaro, Pasqualina, Poe, Mortaccio, etc. | Warrior, Wizard, Rogue, Ranger, Paladin, Necromancer, etc. | Character passives scale with streamed tokens & hero level progression. |
| **Base Weapons** | Whip, Magic Wand, Knife, Axe, Cross, King Bible, Garlic, Fire Wand, etc. | Broadsword, Arcane Bolt, Throwing Daggers, Battle Axe, Bouncing Arrow, Orbiting Grimoire, Aegis Barrier, Dragon Breath | Weapon attack rates & projectile spawns scale with streaming output tokens. |
| **Evolved Weapons** | Bloody Tear, Holy Wand, Thousand Edge, Death Spiral, Heaven Sword, Unholy Vespers, Soul Eater, Hellfire | Excalibur, Archmage Staff, Thousand Blades, Scythe of Doom, Celestial Blade, Unabridged Codex, Sanctuary, Cataclysm Orb | Evolved via Level 8 Base Weapon + Passive Accessory + Floor Chest drop. |
| **Passive Items** | Spinach, Armor, Hollow Heart, Pummarola, Empty Tome, Candelabrador, Duplicator, etc. | Power Gauntlets, Iron Armor, Heart of Vitality, Phoenix Amulet, Haste Amulet, Orb of Expansion, Ring of Duplication | Enhance hero stats directly; purchased or leveled during run. |
| **PowerUps** | Might, Armor, Cooldown, Area, Speed, Growth, Greed, Curse, Revival | Guild Might, Guild Armor, Guild Haste, Guild Expansion, Guild Swiftness, Token Magnetism, Gold Hoard, Chaos Curse, Ankh Revival | Permanent meta-upgrades bought in the Guild Hall using accumulated Gold. |
| **Drops & Gems** | Blue Gem, Green Gem, Red Gem, Condensed Red Gem, Vacuum, Rosary, Orologion, Floor Chicken | Token Shard (1 XP), Token Crystal (5 XP), Token Orb (25 XP), Token Bank (Condensed XP), Mana Magnet, Arcane Cleanser, Chrono Stasis, Roast Feast | Spawned by enemy kills driven by LLM token generation stream. |
| **Enemies & Bosses** | Skeletons, Bats, Zombies, Golems, Giant Bosses, 30:00 Red Reaper | Syntax Spectres, Bug Bats, Memory Leak Golems, Compiler Hydras, Terminal Exit Boss, Timeout Reaper | Mobs spawn based on code complexity; bosses spawn at key agent task milestones. |

---

## 4. Directory Structure of Mapping Specs

The mapping documentation is organized into modular files:

* [`00_OVERVIEW_AND_ARCHITECTURE.md`](file:///d:/Evdaimon%20Games/Apps/Token%20Guild/.dev/Vampire%20Survivors%20Mapping/00_OVERVIEW_AND_ARCHITECTURE.md): System overview, architecture, and core philosophy.
* [`01_CHARACTERS_AND_PASSIVES_MAPPING.md`](file:///d:/Evdaimon%20Games/Apps/Token%20Guild/.dev/Vampire%20Survivors%20Mapping/01_CHARACTERS_AND_PASSIVES_MAPPING.md): 1:1 character stats, passives, starting weapons, and unlock conditions.
* [`02_WEAPONS_AND_EVOLUTIONS_MAPPING.md`](file:///d:/Evdaimon%20Games/Apps/Token%20Guild/.dev/Vampire%20Survivors%20Mapping/02_WEAPONS_AND_EVOLUTIONS_MAPPING.md): 1:1 base weapons, evolution recipes, unions, and attack specs.
* [`03_PASSIVES_AND_POWERUPS_MAPPING.md`](file:///d:/Evdaimon%20Games/Apps/Token%20Guild/.dev/Vampire%20Survivors%20Mapping/03_PASSIVES_AND_POWERUPS_MAPPING.md): Passive accessories & Guild Hall meta-shop powerups.
* [`04_PICKUPS_DROPS_AND_TELEMETRY_MAPPING.md`](file:///d:/Evdaimon%20Games/Apps/Token%20Guild/.dev/Vampire%20Survivors%20Mapping/04_PICKUPS_DROPS_AND_TELEMETRY_MAPPING.md): XP gems, floor items, chests, and direct IDE telemetry event bindings.
* [`05_STAT_FORMULAS_AND_TELEMETRY_MATH.md`](file:///d:/Evdaimon%20Games/Apps/Token%20Guild/.dev/Vampire%20Survivors%20Mapping/05_STAT_FORMULAS_AND_TELEMETRY_MATH.md): Mathematical formulas for combat balance and token integration.
* [`06_STAGES_ENEMIES_AND_BOSSES_MAPPING.md`](file:///d:/Evdaimon%20Games/Apps/Token%20Guild/.dev/Vampire%20Survivors%20Mapping/06_STAGES_ENEMIES_AND_BOSSES_MAPPING.md): Stage timelines, mob waves, boss events, and code error hazards.
* [`07_ARCANAS_AND_DARKANAS_MAPPING.md`](file:///d:/Evdaimon%20Games/Apps/Token%20Guild/.dev/Vampire%20Survivors%20Mapping/07_ARCANAS_AND_DARKANAS_MAPPING.md): 22 Base Arcanas (0-XXI) and 12 Darkanas.
* [`08_RELICS_AND_META_UNLOCKS_MAPPING.md`](file:///d:/Evdaimon%20Games/Apps/Token%20Guild/.dev/Vampire%20Survivors%20Mapping/08_RELICS_AND_META_UNLOCKS_MAPPING.md): 15+ Core Relics and unlock passcodes.
* [`09_STAGE_MODIFIERS_AND_MODES_MAPPING.md`](file:///d:/Evdaimon%20Games/Apps/Token%20Guild/.dev/Vampire%20Survivors%20Mapping/09_STAGE_MODIFIERS_AND_MODES_MAPPING.md): Hyper Mode, Hurry Mode, Inverse Mode, Endless Mode, and Limit Break.
* [`10_SECRET_WEAPONS_AND_UNIONS_MAPPING.md`](file:///d:/Evdaimon%20Games/Apps/Token%20Guild/.dev/Vampire%20Survivors%20Mapping/10_SECRET_WEAPONS_AND_UNIONS_MAPPING.md): Rings, Metaglios, Infinite Corridor, Crimson Shroud, Sole Solution.
* [`11_SECRET_CHARACTERS_MAPPING.md`](file:///d:/Evdaimon%20Games/Apps/Token%20Guild/.dev/Vampire%20Survivors%20Mapping/11_SECRET_CHARACTERS_MAPPING.md): Leda, Minnah, Peppino, Gains Boros, Gyorunton, Red Death, MissingN□.
* [`12_DLC_EXPANSIONS_MAPPING.md`](file:///d:/Evdaimon%20Games/Apps/Token%20Guild/.dev/Vampire%20Survivors%20Mapping/12_DLC_EXPANSIONS_MAPPING.md): All 5 DLC expansions (Moonspell, Foscari, Among Us, Contra, Castlevania).
* [`13_AUDIO_AND_PERSISTENCE_SCHEMA_MAPPING.md`](file:///d:/Evdaimon%20Games/Apps/Token%20Guild/.dev/Vampire%20Survivors%20Mapping/13_AUDIO_AND_PERSISTENCE_SCHEMA_MAPPING.md): Retro 8-bit sound triggers and `globalState` schema.
* [`14_JSON_DATA_REGISTRY.md`](file:///d:/Evdaimon%20Games/Apps/Token%20Guild/.dev/Vampire%20Survivors%20Mapping/14_JSON_DATA_REGISTRY.md): Machine-readable JSON specifications for direct engine integration.
