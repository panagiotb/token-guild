# Stat formulas: planning reference with rejected telemetry bindings

> Planning status (2026-08-01): retained formula reference, not an implementation contract. Current TypeScript behavior is authoritative; telemetry may power the battery/gold divergence only and must remain orthogonal to combat stats.

## 1. Overview & Mathematical Integrity

This document preserves candidate formulas and early telemetry-binding proposals. It does not describe current implementation or verified exact parity. Streaming telemetry must not enter combat/stat equations under the accepted product decisions.

---

## 2. Combat Stat Formulas & Hard Caps

### 1. **Effective Weapon Damage Formula**
$$\text{Damage}_{\text{final}} = \text{BaseDamage} \times (1 + \text{Might}_{\text{passive}} + \text{Might}_{\text{hero}} + \text{Might}_{\text{powerup}}) \times \text{BerserkMultiplier} \times \text{CritMultiplier}$$

* **Hard Cap:** No upper cap on Might.
* **Berserk Multiplier:** $1.5\times$ if LLM streaming speed $\ge 40\text{ tokens/sec}$, else $1.0\times$.
* **Crit Multiplier:** $2.0\times$ when Luck triggers a critical hit ($\text{Probability} = \text{Luck} \times 0.1$).

---

### 2. **Weapon Firing Cooldown Formula & Hard Cap**
$$\text{Cooldown}_{\text{final}} = \text{BaseCooldown} \times \max\left(0.15, 1.0 - (\text{Cooldown}_{\text{passive}} + \text{Cooldown}_{\text{hero}} + \text{Cooldown}_{\text{powerup}})\right)$$

* **Hard Cap:** $-85\%$ maximum cooldown reduction (minimum weapon cooldown is bounded to $15\%$ of base value).

---

### 3. **Attack Area (Hitbox) Formula**
$$\text{Area}_{\text{final}} = \text{BaseArea} \times (1 + \text{Area}_{\text{passive}} + \text{Area}_{\text{hero}} + \text{Area}_{\text{powerup}})$$

* **Hard Cap:** No upper cap (max area bounded by screen resolution of $300\text{px}$ width).

---

### 4. **Projectile Speed Formula**
$$\text{Speed}_{\text{final}} = \text{BaseSpeed} \times (1 + \text{Speed}_{\text{passive}} + \text{Speed}_{\text{hero}} + \text{Speed}_{\text{powerup}})$$

* **Hard Cap:** No upper cap.

---

### 5. **Spell Effect Duration Formula**
$$\text{Duration}_{\text{final}} = \text{BaseDuration} \times (1 + \text{Duration}_{\text{passive}} + \text{Duration}_{\text{hero}} + \text{Duration}_{\text{powerup}})$$

* **Hard Cap:** No upper cap.

---

## 3. Experience & Level-up Scaling Formulas

### 1. **XP Required per Level**

$$\text{XP}_{\text{needed}}(\text{Level}) = \begin{cases} 
5 \times \text{Level}^2 & \text{if Level} \le 20 \\
5 \times \text{Level}^2 + 60 \times (\text{Level} - 20) & \text{if } 20 < \text{Level} \le 40 \\
5 \times \text{Level}^2 + 100 \times (\text{Level} - 40) & \text{if Level} > 40 
\end{cases}$$

### 2. **Token to XP Ingestion Mapping**
$$\text{XP}_{\text{awarded}} = \text{Tokens}_{\text{streamed}} \times (1 + \text{Growth}_{\text{passive}} + \text{Growth}_{\text{powerup}})$$

Every 1 token outputted by an LLM agent yields baseline $1\text{ XP}$.

---

## 4. Enemy Mob Health & Speed Scaling

Enemy mob health scales dynamically with stage runtime and active Curse levels:

$$\text{HP}_{\text{mob}} = \text{BaseHP} \times \left(1.0 + 0.1 \times \left\lfloor\frac{\text{Time}_{\text{seconds}}}{60}\right\rfloor\right) \times (1.0 + \text{Curse})$$

$$\text{Speed}_{\text{mob}} = \text{BaseSpeed} \times (1.0 + 0.05 \times \text{Curse})$$

$$\text{Damage}_{\text{mob}} = \text{BaseDamage} \times (1.0 + 0.05 \times \text{Curse})$$

> Historical proposal note (2026-08-02): this damage formula is retained for
> traceability, but it is not an approved parity rule. The verified [Curse](https://vampire-survivors.fandom.com/wiki/Curse)
> contract changes enemy health, speed, spawn frequency, and quantity; it does
> not directly increase enemy damage. The production implementation therefore
> applies only the stage-authored minute damage curve. See the active parity
> matrix for the current rule.

---

## 5. Historical TypeScript sketch (not a production path)

```typescript
export interface CombatStats {
  might: number;     // e.g. 0.20 for +20%
  cooldown: number;  // e.g. 0.15 for -15%
  area: number;      // e.g. 0.30 for +30%
  speed: number;     // e.g. 0.10 for +10%
  duration: number;  // e.g. 0.40 for +40%
  luck: number;      // e.g. 0.10 for +10%
  growth: number;    // e.g. 0.08 for +8%
  curse: number;     // e.g. 0.10 for +10%
}

export function calculateEffectiveDamage(
  baseDamage: number,
  stats: CombatStats,
  tokensPerSec: number
): { damage: number; isCrit: boolean } {
  const isBerserk = tokensPerSec >= 40;
  const berserkMultiplier = isBerserk ? 1.5 : 1.0;
  
  const critChance = Math.min(0.5, stats.luck * 0.1);
  const isCrit = Math.random() < critChance;
  const critMultiplier = isCrit ? 2.0 : 1.0;

  const totalMight = 1.0 + stats.might;
  const damage = baseDamage * totalMight * berserkMultiplier * critMultiplier;
  
  return { damage: Math.round(damage), isCrit };
}

export function calculateEffectiveCooldown(baseCooldown: number, stats: CombatStats): number {
  const maxCooldownReduction = 0.85; // Hard cap -85%
  const effectiveReduction = Math.min(maxCooldownReduction, stats.cooldown);
  return baseCooldown * (1.0 - effectiveReduction);
}

export function getXpRequiredForLevel(level: number): number {
  if (level <= 20) {
    return 5 * level * level;
  } else if (level <= 40) {
    return 5 * level * level + 60 * (level - 20);
  } else {
    return 5 * level * level + 100 * (level - 40);
  }
}
```
