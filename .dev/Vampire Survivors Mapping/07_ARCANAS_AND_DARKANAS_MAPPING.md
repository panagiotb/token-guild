# Arcanas & Darkanas System 1:1 Mapping Specification

## 1. Overview & Core Gameplay Mechanics

In **Token Guild**, the **Arcana Card System** (reskinned from *Vampire Survivors*' Randomazzo) provides run-modifying tactical cards chosen at milestone stages:
* **Card Choice Triggers:** Milestone selections occur at Run Start (00:00), 10,000 stream tokens, and 25,000 stream tokens (or 11:00 and 21:00 run timers).
* **Card Hand Limit:** Players can active up to 3 Arcana cards simultaneously per raid.
* **Darkana System:** Unlocked via the **Darkasso** relic (Room 1665 challenge), offering high-risk / high-reward inverted card mechanics.

---

## 2. All 22 Base Arcanas (1:1 Reskin Matrix)

| Card # | Original VS Arcana | Token Guild Card Reskin | Card Effect Mechanics | IDE Telemetry / Token Binding |
| :--- | :--- | :--- | :--- | :--- |
| **0** | **Sarabande of Healing** | **Sarabande of Restoration** | Healing is doubled. Recovering HP releases a holy light ring dealing damage equal to HP recovered. | Triggers damage pulses when agent cleans lint errors (which heals HP). |
| **I** | **Gemini** | **Twin Code Buffer** | Duplicates designated weapons (Arcane Bolt, Throwing Daggers, etc.) with phantom secondary versions. | Spawns twin projectiles whenever LLM streams token bursts ($t/s \ge 40$). |
| **II** | **Twilight Requiem** | **Terminal Requiem** | Projectiles explode in a radius when their lifetime expires. | Exploding radius scales with current workspace buffer length. |
| **III** | **Tragic Princess** | **Haste Cascade** | Moving decreases cooldown for Broadsword, Dragon Breath, Alchemist Fire. | Reduces cooldown while user is actively typing in the editor. |
| **IV** | **Awake** | **Phoenix Awakening** | Grants $+3$ Revivals. Consuming a Revival grants $+10\%$ Max HP, $+1\text{ Armor}$, $+10\%$ Might/Area/Speed. | Triggers automatically on agent non-zero exit error recovery. |
| **V** | **Chaos in the Dark Night** | **Velocity Chaos** | Projectile speed continuously fluctuates between $-50\%$ and $+200\%$ every 10 seconds. | Speed peaks during active LLM token streaming bursts. |
| **VI** | **Healing Slash** | **Critical Vampirism** | Critical hits with slash weapons (Broadsword, Scythe) heal $+1\text{ HP}$. | Critical strike heals scale with Luck stat. |
| **VII** | **Iron Blue Will** | **Bouncing Steel** | Daggers, Axes, and Broadswords gain $+3$ bounces and pierce all targets. | Bounces increase when modifying multiple files in a single prompt. |
| **VIII** | **Mad Groove** | **Code Gravity** | Every 2 minutes, pulls all on-stage XP gems, chests, and floor drops directly to player. | Pulls all drops automatically upon agent task completion. |
| **IX** | **Divine Bloodline** | **Armor of Valor** | Armor increases damage. Retaliates with holy damage when damaged. Defeating enemies permanently increases Max HP. | HP increases as more compiler errors are resolved. |
| **X** | **Beginning** | **Primer Mastery** | Starting weapon gains $+1\text{ Amount}$. Main character passives boosted by $+20\%$. | Adds $+1$ projectile to hero starting weapon. |
| **XI** | **Waltz of Pearls** | **Ricochet Harmony** | Wand and Cross projectiles bounce off screen edges up to 3 times. | Ricochets increase while active editor window is focused. |
| **XII** | **Out of Bounds** | **Stasis Explosion** | Freezing enemies triggers explosions. Chrono Ray freezes trigger health orb drops. | Triggers when agent thinking pause exceeds 3 seconds. |
| **XIII** | **Wicked Season** | **Cyclical Fortune** | Alternates doubling Growth, Luck, Greed, and Curse every 10 seconds. Gains $+1\%$ to all stats every 2 levels. | Expands XP per token rate during Growth phase. |
| **XIV** | **Jail of Crystal** | **Absolute Zero** | Magic bolts have a chance to freeze enemies in place. | Freezes enemy mob hordes during code linting passes. |
| **XV** | **Disco of Gold** | **Token Gold Rush** | Collecting Gold Coins triggers Gold Rush: continuous healing while collecting coins, extra multiplier. | Awards bonus Gold for every 100 output tokens generated. |
| **XVI** | **Slash** | **Critical Precision** | Enables critical hits for melee and dagger weapons, multiplying damage by $4\times$. | Critical chance scales with Clover of Fortune stat. |
| **XVII** | **Lost & Found Painting** | **Duration Expansion** | Effect duration continuously fluctuates between $-50\%$ and $+200\%$ every 10 seconds. | Extends lifetime of Orbiting Grimoires and Alchemist Fire. |
| **XVIII** | **Boogaloo of Illusion** | **Expanding Horizons** | Attack Area continuously fluctuates between $-50\%$ and $+200\%$ every 10 seconds. | AoE hits peak width when context window exceeds 20,000 tokens. |
| **XIX** | **Heart of Fire** | **Infernal Pyre** | Fire projectiles explode on impact. Retaliation releases flame eruptors. | Dragon Breath fireballs create massive screen-clearing explosions. |
| **XX** | **Silent Old Sanctuary** | **Lone Coder** | Grants $+20\%$ Might and $-8\%$ Cooldown for every empty weapon slot. | Empowers 1-weapon build runs for minimal CPU overhead. |
| **XXI** | **Blood Astronomia** | **Stellar Orbit** | Magnet, Area, and Speed create damaging gravitational orbits around hero. | Gravitational orbits pull XP tokens into hero automatically. |

---

## 3. Darkana System (1:1 Reskin Matrix)

| Darkana # | Original Darkana | Token Guild Darkana Reskin | Darkana Effect Mechanics |
| :--- | :--- | :--- | :--- |
| **0** | **Stake to Your Heart** | **Stake of Redemption** | Losing health creates holy wooden stakes that impale surrounding enemies. |
| **I** | **Sapphire Mist** | **Mist of Acceleration** | Weapons have a chance to trigger extra rapid-fire attacks per stream token. |
| **III** | **Hidden Anathema** | **Anathema of the Void** | Transforms player into shadow form when HP drops below 20%, multiplying damage by $3\times$. |
| **V** | **Pale Diamond Incursion** | **Diamond Reflection** | Shields reflect $300\%$ of incoming damage back to attackers. |
| **VI** | **Moonlight Bolero** | **Lunar Frenzy** | Spawns special elite treasure mobs every 2 minutes. |
| **VIII** | **Edge of the Earth** | **Tectonic Slam** | Walking creates seismic shockwaves dealing AoE damage. |
| **X** | **Hail from the Future** | **Future Telemetry** | Grants random floor pickups whenever level-up cards are skipped. |
| **XII** | **Crystal Cries** | **Crying Crystal** | Freezing enemies converts them into crystal shards that grant temporary invulnerability. |
| **XIII** | **Call of a Mad Moon** | **Lunacy Cascade** | Night falls on dungeon, increasing enemy Curse by $+100\%$ but tripling Gold drop values. |
| **XVIII**| **Victorian Horror** | **Gothic Spectres** | Defeated mobs rise as friendly phantom minions fighting for player. |
| **XIX** | **Heir of Fate** | **Destiny Vector** | Randomly selects one active weapon per minute and maxes out all stats for 30 seconds. |
| **XXI** | **Wandering the Jet Black** | **Void Eruption** | Drains HP to generate expanding dark void explosions; damage scales with total HP recovered. |
