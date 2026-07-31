# Audio SFX & Persistence Schema 1:1 Mapping Specification

## 1. Overview

This document details retro 8-bit sound triggers mapped to streaming IDE telemetry events and the TypeScript schema extensions for VS Code `globalState` persistence.

---

## 2. Audio SFX Event Matrix (`public/audio/`)

| Audio Asset File | Trigger Event | IDE Telemetry Source | Description |
| :--- | :--- | :--- | :--- |
| `sfx_token_gem.wav` | Gem XP Collection | `TOKEN_STREAM` ($N$ tokens) | Soft retro chime when gem is absorbed by hero. |
| `sfx_berserk.wav` | Berserk Mode Trigger | `t/s >= 40 tokens/sec` | Fast synth power-up sound effect. |
| `sfx_power_charge.wav`| Mana Charge AOE | Agent Thinking Delay ($\ge 3\text{s}$) | Low rising hum that releases energy pulse. |
| `sfx_linter_error.wav`| Linter Error Hit | Linter Diagnostic / Terminal Exit $1+$ | Metallic trap drop sound + hazard damage sound. |
| `sfx_level_up.wav` | Level-Up Card Modal | XP bar fills | Classic 8-bit fanfare chime. |
| `sfx_chest_open.wav` | Boss Chest Opening | Boss defeat (Process Exit 0) | Retro treasure chest opening music loop. |
| `sfx_boss_defeat.wav` | Boss Victory Portal | Background task completes | Victory jingle + portal spawn sound. |

---

## 3. Extended `globalState` Persistence Schema (`src/shared/types.ts`)

```typescript
export interface TokenGuildGlobalState {
  // Hero Meta Progression
  goldHoard: number;
  unlockedClasses: string[];
  unlockedRelics: string[];
  unlockedArcanas: string[];
  goldenEggs: Record<string, number>; // characterId -> eggCount

  // Guild Shop Purchased Powerups (Rank levels 0 to Max)
  powerups: {
    might: number;
    armor: number;
    maxHealth: number;
    recovery: number;
    cooldown: number;
    area: number;
    speed: number;
    duration: number;
    amount: number;
    moveSpeed: number;
    magnet: number;
    luck: number;
    growth: number;
    greed: number;
    curse: number;
    revival: number;
    reroll: number;
    skip: number;
    banish: number;
  };

  // Lifetime Telemetry Analytics
  analytics: {
    totalTokensStreamed: number;
    totalPromptsExecuted: number;
    totalBossesDefeated: number;
    totalRunsCompleted: number;
  };
}
```
