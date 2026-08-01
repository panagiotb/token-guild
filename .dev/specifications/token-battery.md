# Token battery and overflow specification

Status: implemented first pass. This is an accepted Token Guild divergence from *Vampire Survivors*.

## Purpose

The battery ties run time to active AI-assisted work while allowing a limited stored reserve. It is independent from user pause and from ordinary survivor progression.

## Charged-token weighting

`charged = output + 0.10 × input + 0.01 × cache`

Inputs must be finite and non-negative. Missing input/cache values are zero; the legacy `count` field remains the output fallback.

## Capacity and upgrade cost

Implemented formulas:

- `capacity(level) = floor(5000 × 1.63^(level - 1))`
- `upgradeCost(level) = floor(1200 × 2.8^(level - 2))` for Levels 2–5

| Level | Capacity | Cost to reach level |
| ---: | ---: | ---: |
| 1 | 5,000 | 0 |
| 2 | 8,150 | 1,200 |
| 3 | 13,284 | 3,360 |
| 4 | 21,653 | 9,408 |
| 5 | 35,295 | 26,342 |

The earlier proposal also contained hand-written rounded capacities (`8,500`, `14,000`, `22,000`, `35,000`) and costs (`1,200`, `3,500`, `8,500`, `20,000`) that contradict its formulas. Code and tests currently follow the formulas above. Changing to the rounded table is a future balance decision requiring updated tests and migration/economy review.

Battery level is persistent. Current capacity, idle time, lockout, and session overflow are run-scoped. A new run starts full at the purchased level.

## Drain and activity

- Active drain: `20 charged tokens/second`.
- Active telemetry resets consecutive idle time to zero.
- Idle drain: `20 × 2^(idleSeconds / 60)` charged tokens/second.
- Processing occurs before movement, stage time, spawning, and combat on each deterministic tick.
- A locked battery does not continue draining, but incoming telemetry may recharge it.

## Depletion and re-ignition

At zero capacity the battery enters lockout. While locked:

- movement, stage time, spawning, enemy movement, combat, and pickup collection do not advance;
- telemetry can continue charging the battery;
- the run resumes only at `15% × maxCapacity`.

User pause is a separate UI state. Pause cannot clear battery lockout.

## Overflow gold

When post-drain incoming charge exceeds maximum capacity:

`gold = floor((batchOverflow / (40 × (1 + sessionOverflowTotal / 10000))) × floorMultiplier)`

Rules:

- session overflow includes the current batch before conversion;
- capacity clamps at maximum;
- a positive result spawns one value-bearing `gold-coin` pickup at the hero;
- the fresh coin is skipped for its creation tick so it exists as a map pickup before collection;
- gold credits only when the hero collects the coin and is recorded in the `overflow` ledger bucket;
- no positive result means no coin; fractional conversion is not banked between batches;
- current Code Dungeon floor multiplier is 1.

Because the synthetic demo emits small 25-token batches and drains 5 tokens per tick, its usual 20-token overflow is below one gold after flooring. Larger batches exercise overflow in deterministic tests.

## Persistence and UI

- Progress schema 3 stores `batteryLevel` only.
- The Guild Hall purchase uses the next-level cost and deducts Guild gold once.
- The dungeon shows token count and a proportional battery icon; accessible text reports `Tokens Stored: current/max`, level, and charging/draining/locked status.
- Charging shows a lightning glyph; depletion shows a lockout message with the exact 15% token target.

## Required tests

- token weighting and invalid-number sanitation;
- exact capacity/cost curve and level clamping;
- active drain and idle exponential drain;
- overflow saturation and no direct wallet credit;
- coin creation and later collection ownership;
- zero lockout, frozen simulation, sub-threshold recharge, and 15% re-ignition;
- persistence default/migration/validation and purchase bounds;
- token aggregation and accessible battery formatting;
- pause/lockout independence.
