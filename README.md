# Product Specification: Token Guild

**Token Guild** is an IDE extension for VS Code, Cursor, and Windsurf that turns LLM wait times into a retro fantasy auto-battler rogue-lite. It uses a 1:1 reskin of proven *Vampire Survivors* balance mathematics, translating streaming LLM tokens directly into character experience, movement, and combat actions.

---

## 1. Architecture Overview

The extension operates across two isolated layers:

```
+-------------------------------------------------------------------+
|                        IDE Host (Extension)                       |
|  - FileSystemWatcher    - Terminal Listener    - Token Telemetry  |
+-------------------------------------------------------------------+
                                  | (IPC Messages)
                                  v
+-------------------------------------------------------------------+
|                        Webview Panel (UI)                         |
|  - HTML5 Canvas (Phaser.js / PixiJS)                              |
|  - Guild Engine (Meta-Shop)   - Dungeon Engine (Auto-Battler)     |
+-------------------------------------------------------------------+

```

* **Extension Host:** Listens for background agent activity via workspace file system edits, terminal output, or API stream hooks. It computes real-time token metrics and passes state updates to the Webview via `postMessage`.
* **Webview Panel:** A 300px-wide side-panel rendering a 16-bit pixel-art arcade RPG.

---

## 2. Token Mechanics & Event Mapping

The game uses LLM execution metrics to drive all real-time gameplay loops:

| Metric / Event | Trigger Condition | Game Engine Impact |
| --- | --- | --- |
| **Output Tokens** | Every token streamed from agent | $+1\text{ XP}$ towards level up ($XP_{\text{needed}} = 5 \times \text{Level}^2$). |
| **Streaming Speed** | High Tokens/Second ($\ge 40\text{ t/s}$) | **Berserk Mode:** Hero movement and attack speed scaled by $1.5\times$. |
| **Agent Thinking Phase** | No tokens outputted for $\ge 3\text{s}$ | **Power Charge:** Hero charges an area-of-effect ultimate strike. |
| **Syntax / Lint Error** | Linter error or non-zero terminal exit | **Trap Event:** Enemy counter-strike or hazard damage applied to hero. |
| **Process Exit 0** | Agent completes task successfully | **Boss Victory:** Floor Boss dies, drops rare chest, opens portal to Guild. |

---

## 3. Character Classes (1:1 Balance Mapping)

Characters use starting statistics and scaling formulas directly mirrored from *Vampire Survivors*:

| RPG Class | VS Equivalent | Starting Weapon | Class Passive Stat |
| --- | --- | --- | --- |
| **Warrior** | Antonio | **Broadsword** (Horizontal Arc) | $+10\%$ Damage per 10 levels |
| **Wizard** | Imelda | **Arcane Bolt** (Auto-Target projectile) | $+5\%$ XP gain per 5 levels |
| **Rogue** | Gennaro | **Throwing Daggers** (Directional stream) | $+1$ Extra Projectile to all weapons |
| **Ranger** | Pasqualina | **Bouncing Arrow** (Wall ricochet) | $+10\%$ Projectile Speed |
| **Paladin** | Poe | **Aegis Barrier** (Radius damage aura) | $+2$ Armor, $+20\%$ Pickup Radius |
| **Necromancer** | Mortaccio | **Bone Throw** (Bouncing projectile) | $+1$ Extra Projectile every 20 levels |

---

## 4. Weapons, Passives & Evolution Recipes

### Base Weapon Reskin Matrix

* **Aegis Barrier** *(VS: Garlic)*: Close-range aura dealing periodic holy damage and minor knockback.
* **Orbiting Grimoire** *(VS: King Bible)*: Magical books orbiting the hero continuously.
* **Alchemist Fire** *(VS: Santa Water)*: Hurls potions that leave burning damage pools on the floor.
* **Chain Lightning** *(VS: Lightning Ring)*: Strikes random enemy clusters within the viewport.
* **Dragon Breath** *(VS: Fire Wand)*: High-damage fireballs aimed at random targets.

### Passive Accessories Matrix

* **Power Gauntlets** *(VS: Spinach)*: $+10\%$ Base Damage per level.
* **Haste Amulet** *(VS: Empty Tome)*: $-8\%$ Cooldown per level.
* **Ring of Duplication** *(VS: Duplicator)*: $+1$ Projectile count to all active weapons.
* **Orb of Expansion** *(VS: Candelabrador)*: $+10\%$ Attack Area per level.

### Evolution Recipes

When a Base Weapon reaches Level 8 and its matching Passive is held, opening a Floor Chest transforms the item:

* **Broadsword** (Lvl 8) + **Power Gauntlets** $\rightarrow$ **Excalibur** (Heals HP on hit).
* **Aegis Barrier** (Lvl 8) + **Haste Amulet** $\rightarrow$ **Sanctuary** (Permanent knockback field).
* **Orbiting Grimoire** (Lvl 8) + **Ring of Duplication** $\rightarrow$ **Unabridged Codex** (Orbiters never expire).

---

## 5. Game Loop & UI States

```
[Agent Idle] ---> Guild View (Spend Gold on Permanent Stats, Select Class)
      |
[Agent Runs] ---> Dungeon Raid (Token Streaming = XP & Auto-Combat)
      |
      +---> [Level Up] ---> Pause & Draw 3 Upgrade Cards
      |
[Agent Finishes] -> Boss Fight ---> Clear Floor ---> Return to Guild

```

### Stealth Mode ("Boss Key")

Pressing `Ctrl + Shift + H` (or clicking the panel header) instantly swaps the Webview DOM:

* **Default View:** Pixel-art canvas with animated sprites and health bars.
* **Telemetry View:** Black background rendering ASCII system logs, simulated CPU usage graphs, and fake file-watcher thread activity (`[INFO] Context Buffer: 4,120 bytes OK`).

---

## 6. MVP Development Roadmap

1. **Phase 1 (Core Extension):** VS Code extension wrapper, `FileSystemWatcher` token estimator, and Webview IPC bridge.
2. **Phase 2 (Engine Integration):** Import Phaser.js canvas template; implement player movement, mob spawning math, and collision detection.
3. **Phase 3 (Reskin & Content):** Load 16-bit fantasy sprite sheet; implement 6 base classes and 8 weapon/passive JSON tables.
4. **Phase 4 (Stealth & Polish):** Add Boss Key state toggle, audio effects, and 1-click Twitter/LinkedIn share card generator.