# Base weapons and evolutions: planning map

> Planning status (2026-08-01): retained reference, not a shipped contract. Verify every weapon table and evolution rule before implementation; canonical current data lives in `src/game/data/`.

## 1. Overview & Mechanics

In **Token Guild**, weapons represent auto-firing combat capabilities that trigger continuously while the user works in the IDE.

* **Base Weapons:** Can be upgraded from Level 1 to Level 8 (or Level 12 for Victory Sword, Level 7 for Holy Shield, Level 6 for Bracelet).
* **Evolution Requirement:** A Base Weapon reaches Level 8 (or max level), the hero possesses at least Level 1 of the designated Passive Accessory, and a Floor Chest is dropped by an elite mob or boss (spawned upon process exit or key token milestones).
* **Union Weapons:** Two specific maxed Base Weapons combine into a single powerful weapon (e.g. Peachone + Ebony Wings $\rightarrow$ Vandalier, Vento Sacro + Bloody Tear $\rightarrow$ Fuwalafuwaloo, Phiera + Eight $\rightarrow$ Phieraggi), freeing up inventory slots.

---

## 2. Exhaustive Base & Evolved Weapon Roster (1:1 Reskin Matrix)

| Token Guild Weapon | VS Original | Target Type | Base Damage | Base Cooldown | Max Lvl | Evolution Passive / Union Req. | Token Guild Evolved Name |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Broadsword** | Whip | Horizontal Arc | 20 | 1.35s | 8 | Heart of Vitality *(Hollow Heart)* | **Excalibur** *(Bloody Tear)* |
| **Arcane Bolt** | Magic Wand | Nearest Target | 10 | 1.00s | 8 | Haste Amulet *(Empty Tome)* | **Archmage Staff** *(Holy Wand)* |
| **Throwing Daggers** | Knife | Facing Direction | 6.5 | 1.00s | 8 | Iron Bracer *(Bracer)* | **Thousand Blades** *(Thousand Edge)* |
| **Battle Axe** | Axe | High Arc Drop | 20 | 1.25s | 8 | Orb of Expansion *(Candelabrador)* | **Scythe of Doom** *(Death Spiral)* |
| **Celestial Cross** | Cross | Nearest -> Back | 10 | 2.00s | 8 | Clover of Fortune *(Clover)* | **Heaven Blade** *(Heaven Sword)* |
| **Orbiting Grimoire** | King Bible | Orbital Shield | 10 | 3.00s | 8 | Spellbinder Scroll *(Spellbinder)* | **Unabridged Codex** *(Unholy Vespers)* |
| **Dragon Breath** | Fire Wand | Random Enemy | 20 | 1.20s | 8 | Power Gauntlets *(Spinach)* | **Cataclysm Orb** *(Hellfire)* |
| **Aegis Barrier** | Garlic | Radial Aura | 5 | 1.00s | 8 | Phoenix Amulet *(Pummarola)* | **Sanctuary** *(Soul Eater)* |
| **Alchemist Fire** | Santa Water | Area Floor Pool | 10 | 4.00s | 8 | Token Magnetism *(Attractorb)* | **Philosopher's Potion** *(La Borra)* |
| **Bouncing Arrow** | Runetracer | Ricochet Wall | 10 | 3.00s | 8 | Iron Armor *(Armor)* | **NO FUTURE** *(NO FUTURE)* |
| **Chain Lightning** | Lightning Ring | Random Cluster | 15 | 4.50s | 8 | Ring of Duplication *(Duplicator)* | **Thunderfall Orb** *(Thunder Loop)* |
| **White Dove** | Peachone | Circular Zone | 10 | 4.00s | 8 | Union: Ebony Wings | **Vandalier** *(Vandalier)* |
| **Black Raven** | Ebony Wings | Counter Zone | 10 | 4.00s | 8 | Union: Peachone | **Vandalier** *(Vandalier)* |
| **Phiera Twin** | Phiera Der Tuphello | 4-Diagonal Stream | 10 | 1.50s | 8 | Union: Eight The Sparrow + Tiragisú | **Phieraggi** *(Phieraggi)* |
| **Eight Sparrow** | Eight The Sparrow | 4-Cardinal Stream | 10 | 1.50s | 8 | Union: Phiera + Tiragisú | **Phieraggi** *(Phieraggi)* |
| **Feline Spirit** | Gatti Amari | Wandering Claws | 10 | 4.00s | 8 | Stone Mask *(Stone Mask)* | **Vicious Hunger** *(Vicious Hunger)* |
| **Harmonic Wave** | Song of Mana | Vertical Pillar | 20 | 3.50s | 8 | Skull of Doom *(Skull O'Maniac)* | **Genesis Requiem** *(Mannajja)* |
| **Void Dart** | Shadow Pinion | Dash Charge | 15 | 3.00s | 8 | Wings of Hermes *(Wings)* | **Abyssal Valkyrie** *(Valkyrie Turner)* |
| **Purifying Nova** | Pentagram | Screen Wipe | N/A | 90.0s | 8 | Crown of Wisdom *(Crown)* | **Gorgeous Moon** *(Gorgeous Moon)* |
| **Chrono Ray** | Clock Lancet | Freeze Beam | 0 | 2.00s | 8 | Ring of Wealth (L9) + Ring of Clarity (L9) | **Infinite Corridor** |
| **Holy Shield** | Laurel | Invulnerability | 0 | 60.0s | 7 | Aegis Left Crest (L9) + Aegis Right Crest (L9) | **Crimson Shroud** |
| **Victory Sword** | Victory Sword | Combo Slash Finisher| 25 | 0.75s | 12 | Torrona's Box (Lvl 9) | **Sole Solution** |
| **Flames of Misspell**| Flames of Misspell| Cone Firestorm | 15 | 1.00s | 8 | Torrona's Box (Lvl 9) | **Ashes of Muspell** |
| **Wind Blade** | Vento Sacro | Horizontal Slash | 10 | 0.75s | 8 | Union: Excalibur *(Bloody Tear)* | **Fuwalafuwaloo** |
| **Power Bangle** | Bracelet | Random Spark | 10 | 2.00s | 6 | Level 6 Level-Up Chest Upgrade | **Bi-Bracelet** $\rightarrow$ **Tri-Bracelet** |
| **Glass Rapier** | Glass Fandango | Freezing Thrust | 15 | 1.00s | 8 | Wings of Hermes *(Wings)* | **Celestial Voulge** |
| **Photon Laser** | Phas3r | Continuous Laser Beam| 10 | 2.00s | 8 | Haste Amulet *(Empty Tome)* | **Photon Storm** |
| **Holy Javelin** | Santa Javelin | Sky Lance | 20 | 2.50s | 8 | Orb of Expansion *(Candelabrador)* | **Seraphic Javelin** |
| **Bat Swarm** | Pako Battiliar | Retaliation Swarm | 10 | 3.00s | 8 | Heart of Vitality *(Hollow Heart)* | **Mango-Dango** |
| **Fireworks** | Great Jubilee | Screen Confetti | 10 | 3.00s | 8 | Stone Mask *(Stone Mask)* | **Jubilee Supreme** |

---

## 3. Explicit Level 1 to Level 8/12 Stat Progression Tables

### 1. **Broadsword** *(VS: Whip)*
* **Level 1:** Base Damage 20, Area 1.0, Cooldown 1.35s, Amount 1. Fires 1 horizontal arc strike.
* **Level 2:** Base Damage 25 (+5), Area 1.1 (+10%).
* **Level 3:** Base Damage 25, Amount 2 (+1 projectile behind player).
* **Level 4:** Base Damage 30 (+5), Area 1.2 (+10%).
* **Level 5:** Base Damage 35 (+5), Cooldown 1.20s (-10%).
* **Level 6:** Base Damage 40 (+5), Area 1.3 (+10%).
* **Level 7:** Base Damage 40, Amount 3 (+1 extra arc strike).
* **Level 8:** Base Damage 45 (+5), Cooldown 1.05s (-10%).

---

### 2. **Arcane Bolt** *(VS: Magic Wand)*
* **Level 1:** Base Damage 10, Cooldown 1.00s, Amount 1. Fires 1 projectile at nearest target.
* **Level 2:** Amount 2 (+1 projectile).
* **Level 3:** Base Damage 15 (+5).
* **Level 4:** Amount 3 (+1 projectile).
* **Level 5:** Base Damage 20 (+5).
* **Level 6:** Amount 4 (+1 projectile).
* **Level 7:** Base Damage 25 (+5), Pierce 2 (+1 enemy piercing).
* **Level 8:** Base Damage 30 (+5).

---

### 3. **Throwing Daggers** *(VS: Knife)*
* **Level 1:** Base Damage 6.5, Cooldown 1.00s, Amount 1. Fires 1 dagger in facing direction.
* **Level 2:** Amount 2 (+1 dagger).
* **Level 3:** Amount 3 (+1 dagger).
* **Level 4:** Base Damage 11.5 (+5).
* **Level 5:** Amount 4 (+1 dagger).
* **Level 6:** Amount 5 (+1 dagger).
* **Level 7:** Base Damage 16.5 (+5).
* **Level 8:** Pierce 2 (+1 enemy piercing).

---

### 4. **Battle Axe** *(VS: Axe)*
* **Level 1:** Base Damage 20, Cooldown 1.25s, Area 1.0, Amount 1. High arc projectile.
* **Level 2:** Base Damage 30 (+10).
* **Level 3:** Amount 2 (+1 axe).
* **Level 4:** Base Damage 40 (+10), Area 1.2 (+20%).
* **Level 5:** Amount 3 (+1 axe).
* **Level 6:** Base Damage 50 (+10), Area 1.4 (+20%).
* **Level 7:** Amount 4 (+1 axe).
* **Level 8:** Base Damage 60 (+10).

---

### 5. **Celestial Cross** *(VS: Cross)*
* **Level 1:** Base Damage 10, Cooldown 2.00s, Amount 1. Flies to nearest enemy then reverses direction.
* **Level 2:** Base Damage 15 (+5), Speed 1.2 (+20%).
* **Level 3:** Amount 2 (+1 cross).
* **Level 4:** Base Damage 20 (+5), Area 1.2 (+20%).
* **Level 5:** Base Damage 25 (+5), Speed 1.4 (+20%).
* **Level 6:** Amount 3 (+1 cross).
* **Level 7:** Base Damage 30 (+5), Area 1.4 (+20%).
* **Level 8:** Base Damage 35 (+5), Speed 1.6 (+20%).

---

### 6. **Orbiting Grimoire** *(VS: King Bible)*
* **Level 1:** Base Damage 10, Cooldown 3.00s, Duration 3.0s, Amount 1. Spawns 1 orbiter.
* **Level 2:** Amount 2 (+1 book), Speed 1.2 (+20%).
* **Level 3:** Base Damage 15 (+5), Duration 3.5s (+0.5s).
* **Level 4:** Amount 3 (+1 book), Speed 1.4 (+20%).
* **Level 5:** Base Damage 20 (+5), Duration 4.0s (+0.5s).
* **Level 6:** Amount 4 (+1 book), Speed 1.6 (+20%).
* **Level 7:** Base Damage 25 (+5), Duration 4.5s (+0.5s).
* **Level 8:** Area 1.2 (+20%), Speed 1.8 (+20%).

---

### 7. **Aegis Barrier** *(VS: Garlic)*
* **Level 1:** Base Damage 5, Cooldown 1.00s, Area 1.0. Circular holy aura dealing periodic damage & knockback.
* **Level 2:** Area 1.2 (+20%), Base Damage 7 (+2).
* **Level 3:** Cooldown 0.85s (-15%), Knockback +50%.
* **Level 4:** Area 1.4 (+20%), Base Damage 9 (+2).
* **Level 5:** Cooldown 0.70s (-15%), Knockback +50%.
* **Level 6:** Area 1.6 (+20%), Base Damage 11 (+2).
* **Level 7:** Cooldown 0.55s (-15%), Knockback +50%.
* **Level 8:** Area 1.8 (+20%), Base Damage 13 (+2).

---

### 8. **Dragon Breath** *(VS: Fire Wand)*
* **Level 1:** Base Damage 20, Cooldown 1.20s, Area 1.0, Amount 3. Fires 3 fireballs at random targets.
* **Level 2:** Base Damage 30 (+10).
* **Level 3:** Speed 1.2 (+20%), Area 1.2 (+20%).
* **Level 4:** Base Damage 40 (+10).
* **Level 5:** Speed 1.4 (+20%), Area 1.4 (+20%).
* **Level 6:** Base Damage 50 (+10).
* **Level 7:** Speed 1.6 (+20%), Area 1.6 (+20%).
* **Level 8:** Base Damage 60 (+10).

---

### 9. **Alchemist Fire** *(VS: Santa Water)*
* **Level 1:** Base Damage 10, Cooldown 4.00s, Duration 2.0s, Area 1.0, Amount 1. Drops 1 burning floor pool.
* **Level 2:** Amount 2 (+1 pool), Area 1.2 (+20%).
* **Level 3:** Duration 2.5s (+0.5s), Base Damage 15 (+5).
* **Level 4:** Amount 3 (+1 pool), Area 1.4 (+20%).
* **Level 5:** Duration 3.0s (+0.5s), Base Damage 20 (+5).
* **Level 6:** Amount 4 (+1 pool), Area 1.6 (+20%).
* **Level 7:** Duration 3.5s (+0.5s), Base Damage 25 (+5).
* **Level 8:** Area 1.8 (+20%), Base Damage 30 (+5).

---

### 10. **Bouncing Arrow** *(VS: Runetracer)*
* **Level 1:** Base Damage 10, Cooldown 3.00s, Duration 3.0s, Speed 1.0, Amount 1. Bouncing ricochet projectile.
* **Level 2:** Speed 1.2 (+20%), Duration 3.5s (+0.5s).
* **Level 3:** Amount 2 (+1 arrow).
* **Level 4:** Base Damage 15 (+5), Speed 1.4 (+20%).
* **Level 5:** Amount 3 (+1 arrow).
* **Level 6:** Base Damage 20 (+5), Duration 4.0s (+0.5s).
* **Level 7:** Amount 4 (+1 arrow).
* **Level 8:** Speed 1.6 (+20%), Duration 4.5s (+0.5s).

---

### 11. **Chain Lightning** *(VS: Lightning Ring)*
* **Level 1:** Base Damage 15, Cooldown 4.50s, Area 1.0, Amount 2. Strikes 2 random targets.
* **Level 2:** Amount 3 (+1 strike), Area 1.2 (+20%).
* **Level 3:** Base Damage 25 (+10).
* **Level 4:** Amount 4 (+1 strike), Area 1.4 (+20%).
* **Level 5:** Base Damage 35 (+10).
* **Level 6:** Amount 5 (+1 strike), Area 1.6 (+20%).
* **Level 7:** Base Damage 45 (+10).
* **Level 8:** Amount 6 (+1 strike), Area 1.8 (+20%).

---

### 12. **White Dove & Black Raven** *(VS: Peachone & Ebony Wings)*
* **Level 1:** Base Damage 10, Cooldown 4.00s, Duration 4.0s, Amount 4. Circular bombardment zone.
* **Level 2:** Area 1.2 (+20%), Amount 5.
* **Level 3:** Base Damage 15 (+5).
* **Level 4:** Cooldown 3.50s (-0.5s), Amount 6.
* **Level 5:** Area 1.4 (+20%).
* **Level 6:** Base Damage 20 (+5), Amount 7.
* **Level 7:** Area 1.6 (+20%).
* **Level 8:** Base Damage 25 (+5), Amount 8.

---

### 13. **Phiera Twin & Eight Sparrow** *(VS: Phiera Der Tuphello & Eight The Sparrow)*
* **Level 1:** Base Damage 10, Cooldown 1.50s, Amount 2. Fires diagonal/cardinal laser streams.
* **Level 2:** Base Damage 15 (+5).
* **Level 3:** Cooldown 1.35s (-10%).
* **Level 4:** Base Damage 20 (+5).
* **Level 5:** Cooldown 1.20s (-10%).
* **Level 6:** Base Damage 25 (+5).
* **Level 7:** Cooldown 1.05s (-10%).
* **Level 8:** Base Damage 30 (+5).

---

### 14. **Feline Spirit** *(VS: Gatti Amari)*
* **Level 1:** Base Damage 10, Cooldown 4.00s, Duration 5.0s, Amount 1. Wandering cats that claw & interact with floor pickups.
* **Level 2:** Duration 6.0s (+1.0s).
* **Level 3:** Amount 2 (+1 cat).
* **Level 4:** Base Damage 15 (+5).
* **Level 5:** Duration 7.0s (+1.0s).
* **Level 6:** Amount 3 (+1 cat).
* **Level 7:** Base Damage 20 (+5).
* **Level 8:** Duration 8.0s (+1.0s).

---

### 15. **Harmonic Wave** *(VS: Song of Mana)*
* **Level 1:** Base Damage 20, Cooldown 3.50s, Area 1.0, Amount 1. Vertical holy sound pillar.
* **Level 2:** Area 1.2 (+20%).
* **Level 3:** Cooldown 3.15s (-10%).
* **Level 4:** Area 1.4 (+20%).
* **Level 5:** Cooldown 2.80s (-10%).
* **Level 6:** Area 1.6 (+20%).
* **Level 7:** Cooldown 2.45s (-10%).
* **Level 8:** Area 1.8 (+20%), Base Damage 30 (+10).

---

### 16. **Void Dart** *(VS: Shadow Pinion)*
* **Level 1:** Base Damage 15, Cooldown 3.00s, Amount 1. Leaves void darts behind movement; released on stopping.
* **Level 2:** Base Damage 20 (+5).
* **Level 3:** Duration 4.0s (+1.0s).
* **Level 4:** Amount 2 (+1 dart).
* **Level 5:** Base Damage 25 (+5).
* **Level 6:** Duration 5.0s (+1.0s).
* **Level 7:** Amount 3 (+1 dart).
* **Level 8:** Base Damage 30 (+5).

---

### 17. **Purifying Nova** *(VS: Pentagram)*
* **Level 1:** Damage N/A, Cooldown 90s. 20% chance to leave gems on screen wipe.
* **Level 2:** Cooldown 85s (-5s), Gem retention chance 35%.
* **Level 3:** Cooldown 80s (-5s), Gem retention chance 50%.
* **Level 4:** Cooldown 75s (-5s), Gem retention chance 65%.
* **Level 5:** Cooldown 70s (-5s), Gem retention chance 80%.
* **Level 6:** Cooldown 65s (-5s), Gem retention chance 90%.
* **Level 7:** Cooldown 60s (-5s), Gem retention chance 100%.
* **Level 8:** Cooldown 55s (-5s).

---

### 18. **Chrono Ray** *(VS: Clock Lancet)*
* **Level 1:** Damage 0, Cooldown 2.00s, Amount 1. Emits freezing beam.
* **Level 2:** Duration 3.0s (+0.5s).
* **Level 3:** Cooldown 1.8s (-0.2s).
* **Level 4:** Amount 2 (+1 beam direction).
* **Level 5:** Duration 3.5s (+0.5s).
* **Level 6:** Cooldown 1.6s (-0.2s).
* **Level 7:** Amount 3 (+1 beam direction).
* **Level 8:** Duration 4.0s (+0.5s).

---

### 19. **Holy Shield** *(VS: Laurel — 7 Levels)*
* **Level 1:** Damage 0, Cooldown 60s. Invulnerability shield active for 1 hit.
* **Level 2:** Shield recharge cooldown 50s (-10s).
* **Level 3:** Shield recharge cooldown 40s (-10s).
* **Level 4:** Active shield charges +1 (max 2 shields).
* **Level 5:** Shield recharge cooldown 30s (-10s).
* **Level 6:** Shield recharge cooldown 20s (-10s).
* **Level 7:** Active shield charges +1 (max 3 shields), Cooldown 15s.

---

### 20. **Victory Sword** *(VS: Victory Sword — 12 Levels)*
* **Level 1:** Base Damage 25, Cooldown 0.75s, Area 1.0. Strikes nearest enemy with combo slashes.
* **Level 2:** Area 1.1 (+10%).
* **Level 3:** Base Damage 30 (+5).
* **Level 4:** Cooldown 0.65s (-10%).
* **Level 5:** Base Damage 35 (+5).
* **Level 6:** Area 1.2 (+10%).
* **Level 7:** Base Damage 40 (+5).
* **Level 8:** Enables critical strikes ($2\times$ damage) + 5th slash finisher.
* **Level 9:** Base Damage 45 (+5).
* **Level 10:** Cooldown 0.55s (-10%).
* **Level 11:** Area 1.3 (+10%).
* **Level 12:** Base Damage 50 (+5). Evolvability condition unlocked.

---

### 21. **Wind Blade** *(VS: Vento Sacro)*
* **Level 1:** Base Damage 10, Cooldown 0.75s, Area 1.0. Horizontal slashing blades.
* **Level 2:** Area 1.1 (+10%).
* **Level 3:** Base Damage 15 (+5).
* **Level 4:** Cooldown 0.65s (-10%).
* **Level 5:** Base Damage 20 (+5).
* **Level 6:** Area 1.2 (+10%).
* **Level 7:** Base Damage 25 (+5).
* **Level 8:** Enables critical strike whirlwind combo.

---

### 22. **Power Bangle** *(VS: Bracelet — 6 Levels)*
* **Level 1:** Base Damage 10, Cooldown 2.00s. Spawns random magic sparks.
* **Level 2:** Base Damage 15 (+5).
* **Level 3:** Cooldown 1.75s (-10%).
* **Level 4:** Base Damage 20 (+5).
* **Level 5:** Cooldown 1.50s (-10%).
* **Level 6:** Base Damage 25 (+5). Evolves into **Bi-Bracelet** via Level 6 floor chest.

---

### 23. **Glass Rapier** *(VS: Glass Fandango)*
* **Level 1:** Base Damage 15, Cooldown 1.00s, Area 1.0. Freezing thrust attack.
* **Level 2:** Base Damage 20 (+5).
* **Level 3:** Cooldown 0.90s (-10%).
* **Level 4:** Area 1.2 (+20%).
* **Level 5:** Base Damage 25 (+5).
* **Level 6:** Cooldown 0.80s (-10%).
* **Level 7:** Area 1.4 (+20%).
* **Level 8:** Base Damage 30 (+5).

---

### 24. **Photon Laser** *(VS: Phas3r)*
* **Level 1:** Base Damage 10, Cooldown 2.00s, Area 1.0. Continuous vertical laser beam.
* **Level 2:** Base Damage 15 (+5).
* **Level 3:** Cooldown 1.80s (-10%).
* **Level 4:** Area 1.2 (+20%).
* **Level 5:** Base Damage 20 (+5).
* **Level 6:** Cooldown 1.60s (-10%).
* **Level 7:** Area 1.4 (+20%).
* **Level 8:** Base Damage 25 (+5).

---

### 25. **Holy Javelin** *(VS: Santa Javelin)*
* **Level 1:** Base Damage 20, Cooldown 2.50s, Area 1.0. Sky lance that drops from above.
* **Level 2:** Base Damage 25 (+5).
* **Level 3:** Area 1.2 (+20%).
* **Level 4:** Cooldown 2.20s (-10%).
* **Level 5:** Base Damage 30 (+5).
* **Level 6:** Area 1.4 (+20%).
* **Level 7:** Cooldown 1.90s (-10%).
* **Level 8:** Base Damage 35 (+5).

---

### 26. **Bat Swarm** *(VS: Pako Battiliar)*
* **Level 1:** Base Damage 10, Cooldown 3.00s, Amount 1. Swarm bats that retaliate on player damage.
* **Level 2:** Base Damage 15 (+5).
* **Level 3:** Amount 2 (+1 bat).
* **Level 4:** Area 1.2 (+20%).
* **Level 5:** Base Damage 20 (+5).
* **Level 6:** Amount 3 (+1 bat).
* **Level 7:** Area 1.4 (+20%).
* **Level 8:** Base Damage 25 (+5).

---

### 27. **Fireworks** *(VS: Great Jubilee)*
* **Level 1:** Base Damage 10, Cooldown 3.00s, Area 1.0. Screen confetti fireworks dropping gold & pickups.
* **Level 2:** Area 1.2 (+20%).
* **Level 3:** Base Damage 15 (+5).
* **Level 4:** Cooldown 2.70s (-10%).
* **Level 5:** Area 1.4 (+20%).
* **Level 6:** Base Damage 20 (+5).
* **Level 7:** Cooldown 2.40s (-10%).
* **Level 8:** Area 1.6 (+20%), Base Damage 25 (+5).
