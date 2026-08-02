# Stage modifiers and modes: later-phase planning map

> Planning status (2026-08-01): retained later-phase reference. Hyper, Hurry, Inverse, Endless, and Limit Break are outside the current MVP.

## 1. Overview

In **Token Guild**, stage modifiers provide custom run parameters that alter hero movement, timer progression, enemy health scaling, and endgame leveling loops.

---

## 2. Stage Modifiers Matrix (1:1 Reskin)

| Mode Name | VS Original | Movement Speed | Gold Gain Multiplier | Enemy Stats Scaling | Game Loop Modification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Normal Raid** | Normal Mode | $1.0\times$ | $1.0\times$ | $1.0\times$ Base | Standard 30-minute raid loop. |
| **Hyper Mode** | Hyper Mode | $+50\%$ ($1.5\times$) | $+50\%$ ($1.5\times$) | $+10\%$ Enemy Speed | Fast-paced hero movement & projectile velocity. |
| **Hurry Mode** | Hurry Mode | $1.0\times$ | $+25\%$ ($1.25\times$) | $1.0\times$ Base | Timer runs at $2\times$ real speed (30-min run completes in 15 real minutes). |
| **Inverse Mode** | Inverse Mode | $+20\%$ | $+200\%$ ($3.0\times$) | $+200\%$ Enemy HP | Upside-down canvas rendering; enemy health tripled; merchant shop prices scaled. |
| **Endless Mode** | Endless Mode | $1.0\times$ | $+100\%$ ($2.0\times$) | $+100\%$ HP per cycle | Resets stage wave timer to 00:00 at 30:00 without Red Death spawn. Enemy HP doubles every 30 minutes. |
| **Limit Break** | Limit Break | $1.0\times$ | N/A | $1.0\times$ Base | Disables gold/chicken choices when all inventory items reach max level. Replaces choices with continuous direct weapon stat upgrades (+Might, +Area, +Speed, +Amount). |

---

## 3. Limit Break Stat Upgrade Pool

When **Limit Break** is active and all equipped weapons and passives have reached maximum level, level-up cards offer direct stat increments for equipped weapons:

```typescript
export interface LimitBreakUpgrade {
  weaponId: string;
  statType: 'MIGHT' | 'AREA' | 'SPEED' | 'DURATION' | 'AMOUNT';
  value: number; // e.g. +0.05 Might (+5%)
}
```

* **Might Upgrade:** $+5\%$ weapon damage (no upper cap).
* **Area Upgrade:** $+5\%$ attack area (max $+100\%$).
* **Speed Upgrade:** $+10\%$ projectile speed.
* **Duration Upgrade:** $+10\%$ effect duration.
* **Amount Upgrade:** $+1$ projectile (available every 10 Limit Break levels).
