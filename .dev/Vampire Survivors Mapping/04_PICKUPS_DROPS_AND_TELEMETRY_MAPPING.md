# Pickups, Drops & IDE Telemetry Event Triggers 1:1 Mapping Matrix

## 1. Overview & Telemetry Integration Architecture

In **Token Guild**, the game engine bridges real-time IDE events and LLM telemetry directly into *Vampire Survivors* item drops, experience gems, level-up chests, and tactical combat triggers.

```
+-----------------------------------------------------------------------------------+
|                        EXTENSION HOST TELEMETRY BUS                               |
|  - Token Output Stream   - Tokens/Sec Speed   - Thinking Pause   - Linter Error   |
+-----------------------------------------------------------------------------------+
                                          |
                                 IPC Message Bridge
                                          v
+-----------------------------------------------------------------------------------+
|                           WEBVIEW PHASER 3 ENGINE                                 |
|                                                                                   |
|  [Token Stream]   --> Spawns Token Shards/Crystals; directly awards hero XP.     |
|  [t/s >= 40]      --> Triggers Berserk Frenzy Mode (1.5x speed & attack rate).   |
|  [Pause >= 3s]    --> Charges Mana Wave Ultimate Strike.                          |
|  [Linter Error]   --> Drops Traps & apply hazard damage to player.               |
|  [Process Exit 0] --> Kills Floor Boss & drops 3-Card / 5-Card Treasure Chest.   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Experience Gems & Condensed XP Banking (1:1 Reskin)

| Gem Type | VS Original | Token Guild Reskin | Base XP Value | Visual Appearance | Spawn Trigger |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Small Shard** | Blue Gem | **Token Shard** | $1 - 2\text{ XP}$ | Glowing Cyan Pixel Gem | Defeating standard mob (Syntax Spectre / Bug Bat). |
| **Medium Crystal**| Green Gem | **Token Crystal** | $3 - 9\text{ XP}$ | Bright Green Pixel Gem | Defeating elite mob or streaming 50+ token batch. |
| **Large Orb** | Red Gem | **Token Orb** | $10 - 50\text{ XP}$ | Crimson Radiant Orb | Defeating miniboss or completing agent tool execution. |
| **Condensed Gem**| Condensed Red Gem | **Token Core** | Accumulated Total | Pulsing Purple Mega-Orb | Automatically spawned when on-screen gem count exceeds 400. Holds 100% of banked XP without data loss. |

### Condensed XP Banking Mechanics:
If the number of active gems on the Phaser 3 canvas exceeds $400$ entities, the oldest gems merge into a single **Token Core** located at the edge of the viewport. Collecting the Token Core instantly awards all accumulated XP and triggers multiple sequential Level Up cards.

---

## 3. Floor Pickups & Light Source Drops (1:1 Reskin)

Light sources (torches, lamp posts, IDE code icons) drop tactical pickups when destroyed:

| Pickup Item | VS Original | Token Guild Reskin | Effect | IDE Telemetry Synergy |
| :--- | :--- | :--- | :--- | :--- |
| **Floor Roast** | Floor Chicken | **Mana Roast** | Restores $+30\text{ HP}$ | Drops when agent fixes a linter error. |
| **Gold Coin** | Gold Coin | **Token Gold Coin** | $+1\text{ Gold}$ | Awarded every 50 tokens streamed. |
| **Coin Bag** | Coin Bag | **Gold Sack** | $+10\text{ Gold}$ | Drops from elite mobs. |
| **Rich Coin Bag** | Rich Coin Bag | **Hoard Chest** | $+100\text{ Gold}$ | Drops from floor bosses. |
| **Rosary** | Rosary | **Arcane Cleanser** | Destroys all on-screen enemies | Triggers when user runs clean git commit. |
| **Orologion** | Orologion | **Chrono Stasis** | Freezes all enemies for 10 seconds | Triggers when user pauses prompt stream. |
| **Vacuum** | Vacuum (Magnet) | **Mana Magnet** | Pulls all XP gems on map directly to player | Triggers when agent completes multi-file refactor. |
| **Little Clover** | Little Clover | **Clover of Fate** | $+10\%\text{ Luck}$ for current run | Increases chest jackpot probability. |
| **Nduja Fritta** | Nduja Fritta | **Infernal Flame** | Fires continuous flamethrower cone for 10s | Spawns during high-speed token generation bursts. |

---

## 4. Treasure Chests & Evolution Mechanics

Chests are dropped by Floor Bosses (spawned when background tasks execute or terminal commands complete):

```typescript
export interface TreasureChestDrop {
  type: '1-CARD' | '3-CARD' | '5-CARD_JACKPOT';
  goldAwarded: number;
  evolvedWeapons: string[];
  passiveUpgrades: string[];
}
```

* **1-Card Chest:** Awards 1 weapon/passive upgrade + $100 - 300\text{ Gold}$.
* **3-Card Chest (Triple Drop):** Triggered when Luck stat $\ge 120\%$. Awards 3 items + $500\text{ Gold}$. Plays victory fanfare animation.
* **5-Card Jackpot (Pentafecta Drop):** Triggered when Luck stat $\ge 150\%$. Awards 5 items + $1,500\text{ Gold}$. Plays full pixel celebration animation.

---

## 5. Direct IDE Telemetry Event Matrix

| IDE Event | Detector Mechanism | Telemetry Payload | Token Guild Game Action |
| :--- | :--- | :--- | :--- |
| **Output Token Stream** | Layer 1 OTLP / Layer 3 Buffer Diff | `{ count: N, tps: Rate }` | Adds $+N\text{ XP}$ to hero; spawns $N/5$ Token Shards on map. |
| **Streaming Speed Burst** | `tps >= 40 tokens/sec` | `{ rate: tps }` | **Berserk Mode:** Hero movement speed & attack rate scaled by $1.5\times$. |
| **Agent Thinking Delay** | No tokens output for $\ge 3\text{s}$ | `{ durationMs: ms }` | **Power Charge:** Charges radius AOE pulse; releases full-screen shockwave when stream resumes. |
| **Linter / Syntax Error** | Non-zero exit or `onDidChangeDiagnostics` | `{ errorCount: N }` | **Trap Hazard:** Spawns spikes under hero, applying $10\text{ damage}$ per error. |
| **Process Exit 0** | Integrated Terminal `onDidWriteTerminalData` | `{ exitCode: 0 }` | **Boss Defeat:** Instantly slays Floor Boss, opens portal, and drops Treasure Chest. |
