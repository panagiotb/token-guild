# Stages, enemies, and bosses: planning map

> Planning status (2026-08-01): retained reference, not a shipped contract. Verify wave timings and enemy rules before use; token rate, code complexity, errors, and terminal exits do not drive production encounters.

## 1. Overview & Dungeon Raid Mechanics

In **Token Guild**, stages represent coding floors (dungeon raids). Enemy mobs spawn dynamically based on active LLM task complexity, context length, and stage runtime.

---

## 2. Exhaustive Stage Roster (1:1 Reskin Matrix)

### Core Normal Stages
| Stage | VS Original | Environment Reskin | Unique Hazard / Features | Unlocks |
| :--- | :--- | :--- | :--- | :--- |
| **Floor 1: Mad Forest** | Mad Forest | **Enchanted Forest of Code** | Bat Swarms (Token Output Spikes) | Unlocked by Default |
| **Floor 2: Inlaid Library** | Inlaid Library | **Archive of Legacy Systems** | Bookcase Bottlenecks | Reach Lvl 20 on Floor 1 |
| **Floor 3: Dairy Plant** | Dairy Plant | **Compiler Manufactory** | Minecart Traps (Linter Errors) | Reach Lvl 40 on Floor 2 |
| **Floor 4: Gallo Tower** | Gallo Tower | **Monolith Architecture Tower** | Vertical Horde Spawns | Reach Lvl 60 on Floor 3 |
| **Floor 5: Cappella Magna** | Cappella Magna | **Cathedral of Refactoring** | Drowning Water Hazards | Defeat Monolith Boss |

### Challenge & Bonus Stages
| Stage | VS Original | Environment Reskin | Unique Hazard / Features | Unlocks |
| :--- | :--- | :--- | :--- | :--- |
| **Bonus 1: Il Molise** | Il Molise | **Plantation of Stale Packages** | Stationary enemy plants; gold farming run | Unlock 1 Hyper Mode |
| **Challenge 1: Green Acres** | Green Acres | **Randomized Multi-Repo Field** | Random mob waves from all stages; +50% Luck | Unlock 2 Hyper Modes |
| **Challenge 2: Bone Zone** | The Bone Zone | **Graveyard of Deprecated Code** | Pure skeleton mobs; Drowners & Sketamari boss | Unlock 3 Hyper Modes |
| **Bonus 2: Moongolow** | Moongolow | **Lunar Telemetry Lake** | 15-minute stage; all 16 passives drop on map | Unlock 4 Hyper Modes |
| **Challenge 3: Boss Rash** | Boss Rash | **Compiler Benchmark Arena** | Sequential boss wave challenge | Unlock all 5 Core Stages |
| **Bonus 3: White Out** | White Out | **Frozen Exception Void** | Blizzard hazards & ice golems | Collect 20 Ice Ore drops |
| **Bonus 4: Space 54** | Space 54 | **Cybernetic Terminal Room** | Neon laser grid & high token speed | Unlock 5 Space Relics |
| **Secret: Room 1665** | Room 1665 | **Crypt of the Darkasso** | 16-tier hallway challenge for Darkanas | Enter passcode `forbiddenbox` |

---

## 3. Enemy Mob & Boss Matrix (1:1 Reskin)

| Enemy Mob | VS Original | Base HP | Base Speed | XP Drop | Token Guild Reskin Name | IDE Code Metaphor |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Bat** | Bat | 5 | 120 | 1 XP | **Bug Bat** | Minor syntax flaw or typo |
| **Skeleton** | Skeleton | 15 | 80 | 2 XP | **Syntax Spectre** | Missing semicolon or bracket |
| **Zombie** | Zombie | 30 | 50 | 3 XP | **Deprecated Zombie** | Stale dependency or legacy code |
| **Ghost** | Ghost | 10 | 90 | 2 XP | **Unused Variable Phantom** | Dead code or ghost reference |
| **Mud Man** | Mud Man | 100 | 40 | 10 XP | **Memory Leak Golem** | Unbound memory buffer leak |
| **Werewolf** | Werewolf | 150 | 110 | 15 XP | **Infinite Loop Fiend** | Unbound while loop condition |
| **Giant Boss** | Giant Mantis | 1,000 | 70 | Chest | **Compiler Hydra** | Failed build process (Exit 1+) |
| **Sketamari** | Sketamari | 10,000 | 30 | Chest | **Code Debt Ball** | Rollup of accumulated legacy debt |
| **Atlantians** | Atlantians | 25,000 | 150 | Chest | **Guardian Sentinel** | Protector of Ring/Metaglio items |
| **30:00 Reaper** | Red Death | 655,350 | 300 | Instant Death | **Timeout Reaper** | Request timeout (30-minute limit) |

---

## 4. Stage Wave Spawning Timeline (30-Minute Raid Structure)

```
[00:00 - 05:00] Wave 1: Bug Bats & Syntax Spectres (Low density, training wave)
[05:00 - 10:00] Wave 2: Deprecated Zombies & Ghost Phantoms (Medium density)
[10:00 - 15:00] Wave 3: Memory Leak Golems & Miniboss Spawn (First Chest Drop)
[15:00 - 20:00] Wave 4: Infinite Loop Fiends (High-velocity horde wave)
[20:00 - 25:00] Wave 5: Mixed Swarm + Compiler Hydra Boss Event
[25:00 - 29:59] Wave 6: Enraged Elite Swarm (Maximum mob density)
[30:00]         Final Event: Timeout Reaper Spawns (Instant death wipe unless invulnerable)
```

---

## 5. Boss Fight & IDE Process Exit Binding

When an agent finishes executing a background command or task:

* **Exit Code 0 (Success):** Floor Boss is instantly defeated, drops a 3-Card or 5-Card Treasure Chest, opens a victory portal to the Guild Hall, and awards completion Gold.
* **Exit Code 1+ (Error):** Boss releases a Nova Hazard shockwave, applying $20\text{ damage}$ to the player hero and spawning 10 elite Memory Leak Golems.
