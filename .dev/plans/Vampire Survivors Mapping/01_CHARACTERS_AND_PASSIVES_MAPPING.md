# Character classes and passives: planning map

> Planning status (2026-08-01): retained reference, not a shipped contract. Verify identities, formulas, unlocks, and scope before implementation; current source code and tests are authoritative.

## 1. Character Mapping Philosophy

The tables propose 16-bit fantasy reskins for base, secret, and DLC characters. Only the bounded current roster should inform near-term work; secret and DLC entries remain later/reference-only.

* **Base-stat candidates:** Health, Armor, Movement Speed, Might, Cooldown, Area, Speed, Duration, Amount, Revival, Magnet, Luck, Growth, Greed, and Curse values require current source verification; these tables do not establish exact parity.
* **Passive growth proposals:** Per-level passive modifiers require verification and implementation tests. XP comes from collected gems, not streaming tokens.
* **Legacy telemetry proposals:** The tables preserve early synergy ideas for historical context. They are not approved; character passives must remain independent of LLM telemetry under the current product decisions.

---

## 2. Exhaustive Base Character Roster (1:1 Reskin Matrix)

### 1. Antonio Belpaese $\rightarrow$ **Warrior**
* **VS Equivalent:** Antonio Belpaese
* **Starting Weapon:** **Broadsword** *(VS: Whip)*
* **Base Stats:** $100\text{ HP}$, $1\text{ Armor}$, $1.0\times\text{ Speed}$, $1.0\times\text{ Might}$
* **Passive Ability:** $+10\%$ Damage every 10 levels (max $+50\%$ at Level 50).
* **Token Guild Synergy:** **Brute Streaming** — Physical melee strikes scale damage dynamically when token output rate exceeds $30\text{ t/s}$.

### 2. Imelda Belpaese $\rightarrow$ **Wizard**
* **VS Equivalent:** Imelda Belpaese
* **Starting Weapon:** **Arcane Bolt** *(VS: Magic Wand)*
* **Base Stats:** $100\text{ HP}$, $+10\%\text{ Growth}$
* **Passive Ability:** $+10\%$ XP Gain every 5 levels (max $+30\%$ at Level 15).
* **Token Guild Synergy:** **High-Throughput Learner** — Output tokens award $+1.3\times$ base XP during active agent streaming.

### 3. Gennaro Belpaese $\rightarrow$ **Rogue**
* **VS Equivalent:** Gennaro Belpaese
* **Starting Weapon:** **Throwing Daggers** *(VS: Knife)*
* **Base Stats:** $120\text{ HP}$, $+1\text{ Amount}$ to all weapons
* **Passive Ability:** Permanently grants $+1$ extra projectile to all active weapons.
* **Token Guild Synergy:** **Multi-File Edit Burst** — Spawns extra daggers whenever the LLM agent modifies multiple files in a single turn.

### 4. Pasqualina Belpaese $\rightarrow$ **Ranger**
* **VS Equivalent:** Pasqualina Belpaese
* **Starting Weapon:** **Bouncing Arrow** *(VS: Runetracer)*
* **Base Stats:** $100\text{ HP}$, $+10\%\text{ Speed}$
* **Passive Ability:** $+10\%$ Projectile Speed every 5 levels (max $+30\%$ at Level 15).
* **Token Guild Synergy:** **Rapid Fire Parsing** — Arrow ricochet speed increases proportionally to LLM response generation speed.

### 5. Poe Ratcho $\rightarrow$ **Paladin**
* **VS Equivalent:** Poe Ratcho
* **Starting Weapon:** **Aegis Barrier** *(VS: Garlic)*
* **Base Stats:** $70\text{ HP}$, $+25\%\text{ Magnet}$
* **Passive Ability:** Starts with Aegis Barrier aura and $+25\%$ pickup radius.
* **Token Guild Synergy:** **Safe Refactoring Aura** — Barrier knocks back mobs when agent refactors code without linter errors.

### 6. Arca Ladonna $\rightarrow$ **Pyromancer**
* **VS Equivalent:** Arca Ladonna
* **Starting Weapon:** **Dragon Breath** *(VS: Fire Wand)*
* **Base Stats:** $100\text{ HP}$, $+10\%\text{ Might}$
* **Passive Ability:** $-5\%$ Cooldown every 10 levels (max $-15\%$ at Level 30).
* **Token Guild Synergy:** **Hot-Reload Burst** — Spell cooldowns tick $2\times$ faster while prompt tokens are actively streaming.

### 7. Porta Ladonna $\rightarrow$ **Stormbringer**
* **VS Equivalent:** Porta Ladonna
* **Starting Weapon:** **Chain Lightning** *(VS: Lightning Ring)*
* **Base Stats:** $100\text{ HP}$, $+30\%\text{ Area}$, temporary initial Area bonus
* **Passive Ability:** $+30\%$ Attack Area modifier.
* **Token Guild Synergy:** **Context Spike Lightning** — Lightning strikes expand viewport coverage when LLM context exceeds 10,000 tokens.

### 8. Lama Ladonna $\rightarrow$ **Berserker**
* **VS Equivalent:** Lama Ladonna
* **Starting Weapon:** **Battle Axe** *(VS: Axe)*
* **Base Stats:** $110\text{ HP}$, $+10\%\text{ Might}$, $+10\%\text{ Speed}$, $+10\%\text{ Curse}$
* **Passive Ability:** $+10\%$ Might, Speed, and Curse every 10 levels (max $+20\%$).
* **Token Guild Synergy:** **High-Risk Coding** — Increases enemy spawn rate but doubles gold drop rate during heavy multi-turn tasks.

### 9. Dommario $\rightarrow$ **Inquisitor**
* **VS Equivalent:** Dommario
* **Starting Weapon:** **Orbiting Grimoire** *(VS: King Bible)*
* **Base Stats:** $100\text{ HP}$, $+40\%\text{ Duration}$, $+40\%\text{ Speed}$, $-40\%\text{ MoveSpeed}$
* **Passive Ability:** $+40\%$ Duration & Speed, $-40\%$ MoveSpeed.
* **Token Guild Synergy:** **Stationary Debugging** — Books never expire while user is typing or reviewing agent output.

### 10. Krochi Freeto $\rightarrow$ **Revenant**
* **VS Equivalent:** Krochi Freeto
* **Starting Weapon:** **Celestial Cross** *(VS: Cross)*
* **Base Stats:** $100\text{ HP}$, $+30\%\text{ MoveSpeed}$, $+1\text{ Revival}$
* **Passive Ability:** $+1$ Revival at start; gains $+1$ additional Revival at Level 33.
* **Token Guild Synergy:** **Rollback Recovery** — Revives hero with full HP if agent recovers from a non-zero exit code.

### 11. Christine Davain $\rightarrow$ **Spellweaver**
* **VS Equivalent:** Christine Davain
* **Starting Weapon:** **Purifying Nova** *(VS: Pentagram)*
* **Base Stats:** $50\text{ HP}$, $-35\%\text{ Might}$, $-25\%\text{ Cooldown}$, $+30\%\text{ MoveSpeed}$
* **Passive Ability:** $-25\%$ Cooldown, $+30\%$ Speed.
* **Token Guild Synergy:** **Instant Auto-Format** — Pentagram wipes screen without destroying gems when agent formats files clean.

### 12. Pugnala Provola $\rightarrow$ **Dual Gunslinger**
* **VS Equivalent:** Pugnala Provola
* **Starting Weapon:** **Twin Flintlocks** *(VS: Phiera Der Tuphello & Eight)*
* **Base Stats:** $100\text{ HP}$, $+20\%\text{ MoveSpeed}$
* **Passive Ability:** $+1\%$ Might **every level** (uncapped).
* **Token Guild Synergy:** **Uncapped Token Scaling** — Hero damage scales endlessly on long 50,000+ token sessions.

### 13. Poppea Pecorina $\rightarrow$ **Minstrel (Bard)**
* **VS Equivalent:** Poppea Pecorina
* **Starting Weapon:** **Harmonic Wave** *(VS: Song of Mana)*
* **Base Stats:** $100\text{ HP}$, $+20\%\text{ MoveSpeed}$
* **Passive Ability:** $+1\%$ Duration **every level** (uncapped).
* **Token Guild Synergy:** **Sustained Stream Harmony** — Pulsing sonic waves expand duration as long as token stream does not pause.

### 14. Giovanna Grana $\rightarrow$ **Sorceress**
* **VS Equivalent:** Giovanna Grana
* **Starting Weapon:** **Feline Spirit** *(VS: Gatti Amari)*
* **Base Stats:** $100\text{ HP}$, $+20\%\text{ MoveSpeed}$
* **Passive Ability:** $+1\%$ Projectile Speed **every level** (uncapped).
* **Token Guild Synergy:** **Fast Token Velocity** — Projectile velocity scales continuously with peak $t/s$ rates.

### 15. Concetta Caciotta $\rightarrow$ **Void Walker**
* **VS Equivalent:** Concetta Caciotta
* **Starting Weapon:** **Void Dart** *(VS: Shadow Pinion)*
* **Base Stats:** $100\text{ HP}$, $+20\%\text{ MoveSpeed}$, $+10\%\text{ Curse}$
* **Passive Ability:** $+1\%$ Area **every level** (uncapped).
* **Token Guild Synergy:** **Expanding Context Void** — Void trails widen dynamically as active workspace file size increases.

### 16. Mortaccio $\rightarrow$ **Necromancer**
* **VS Equivalent:** Mortaccio
* **Starting Weapon:** **Bone Throw** *(VS: Bone)*
* **Base Stats:** $100\text{ HP}$
* **Passive Ability:** $+1$ Amount every 20 levels up to Level 60 (max $+3$).
* **Token Guild Synergy:** **Dead Code Summoner** — Cleansed code lines roll into bouncing bone projectiles.

### 17. Yatta Cavallo $\rightarrow$ **Bombardier**
* **VS Equivalent:** Yatta Cavallo
* **Starting Weapon:** **Explosive Orb** *(VS: Cherry Bomb)*
* **Base Stats:** $100\text{ HP}$
* **Passive Ability:** $+1$ Amount every 20 levels up to Level 60 (max $+3$).
* **Token Guild Synergy:** Spawns explosive cherry bombs on terminal output triggers.

### 18. Bianca Ramba $\rightarrow$ **Artificer**
* **VS Equivalent:** Bianca Ramba
* **Starting Weapon:** **Rolling Cart** *(VS: Carréllo)*
* **Base Stats:** $100\text{ HP}$
* **Passive Ability:** $+1$ Amount every 20 levels up to Level 60 (max $+3$).
* **Token Guild Synergy:** Bouncing carts scale speed with streaming response length.

### 19. Sir Ambrojoe $\rightarrow$ **Grand Aristocrat**
* **VS Equivalent:** Sir Ambrojoe
* **Starting Weapon:** **Falling Furniture** *(VS: La Robba)*
* **Base Stats:** $100\text{ HP}$, $+10\text{ Amount}$ (decreases by 2 per level until Lvl 6)
* **Passive Ability:** Gains $+1$ Amount every 20 levels from Lvl 20 to 60.
* **Token Guild Synergy:** Massive initial furniture barrage upon starting agent prompts.

### 20. Zi'Assunta Belpaese $\rightarrow$ **Grand Matriarch**
* **VS Equivalent:** Zi'Assunta Belpaese
* **Starting Weapon:** **Vento Sacro**
* **Base Stats:** $100\text{ HP}$, $+20\%\text{ MoveSpeed}$, $+10\%\text{ Curse}$
* **Passive Ability:** $+0.5\%$ Might, Area, Speed, and Duration every level (uncapped).
* **Token Guild Synergy:** Quad-stat scaling during high-velocity agent execution.

### 21. Queen Sigma $\rightarrow$ **Supreme Archon**
* **VS Equivalent:** Queen Sigma
* **Starting Weapon:** **Victory Sword**
* **Base Stats:** $333\text{ HP}$, $+50\%\text{ Might}$, $+50\%\text{ Luck}$, $-25\%\text{ Cooldown}$, $+108\text{ Rerolls}$
* **Passive Ability:** $+1\%$ Might **every level** (uncapped). Cannot collect Golden Eggs.
* **Token Guild Synergy:** **Empowered Code Creation** — Sweeping galaxy slashes damage all mobs continuously during active LLM token streaming.

---

## 3. Exhaustive Secret Character Roster

| Original VS Character | Token Guild RPG Class | Starting Weapon | Base Stats & Unique Passive | Secret Unlock Condition |
| :--- | :--- | :--- | :--- | :--- |
| **Mask of the Red Death** | **Grim Executioner** | Scythe of Doom | $255\text{ HP}$, $+100\%\text{ Speed}$, $+20\%\text{ Might}$ | Defeat 30:00 Reaper with Crimson Shroud |
| **Exdash Exivii** | **Lucky Nomad** | Ebony Wings | $77\text{ HP}$, $+100\%\text{ Luck}$, $-10\%\text{ Might}$, $+10\%\text{ Cooldown}$ | Type code `x-x1viiq` in menu |
| **Toastie** | **Gilded Sprite** | Peachone | $1\text{ HP}$, $+100\%\text{ Speed}$, $+100\%\text{ Luck}$, Lvl 100 Armor burst | Press down arrow + Enter on Toastie hit |
| **Smith IV** | **Master Craftsman** | Vandalier | $7\text{ HP}$, exponential per-level stat scaling | Type code `spam` in menu |
| **Peppino** | **Ancient Sentinel** | Aegis Barrier | $100\text{ HP}$, $+100\%\text{ Area}$, $+2\text{ Armor}$, $-100\%\text{ Speed}$ | Heal trees in Mad Forest for 100k HP |
| **Gains Boros** | **Dragon Sovereign** | Heaven Blade | $100\text{ HP}$, $+2\%\text{ Growth}$ per level (unlimited) | Stand in Moongolow flower ring |
| **Leda** | **Shadow Archmage** | Archmage Staff | $100\text{ HP}$, $+100\%\text{ Might}$, $+5\text{ Armor}$, $-20\%\text{ Cooldown}$ | Defeat Leda at bottom of Gallo Tower |
| **Minnah Anami** | **Were-Brawler** | Excalibur | $150\text{ HP}$, stat swap every 60s (Might/Area/Speed) | Complete Moongolow cheese event |
| **Gyorunton** | **Three-Headed Hydra**| Bracelet | $300\text{ HP}$, $+30\%\text{ Might}$, $+1\%\text{ Curse}$ per level | Win Boss Rash with 1 weapon equipped |
| **Big Trouser** | **Gilded Merchant** | Candybox | $100\text{ HP}$, $+1\%\text{ Greed}$ per level (unlimited) | Max out 16 passives in Moongolow |
| **Avatar Infernas** | **Hellfire Warlock** | Flames of Misspell | $150\text{ HP}$, $+0.5\%\text{ Might}$ & $+0.5\%\text{ Speed}$ per level | Clear Eudaimonia M. secret puzzle |
| **Cosmo Pavone** | **Celestial Phoenix** | Peachone | $20\text{ HP}$, $+1\text{ Recovery}$ per level, $+1\text{ Revival}$ per 100 levels | Find Pure Heart with zero Golden Eggs |
| **Boon Marrabbio** | **Shadow Ninja** | Thousand Blades | $100\text{ HP}$, $+20\%\text{ Might}$, $-80\%\text{ Speed}$, $+110\%\text{ Area}$ | Follow pies in Mad Forest |
| **Scorej-Oni** | **Thunder Demon** | Chain Lightning | $108\text{ HP}$, $+1\text{ Lightning}$ every 8 levels | Defeat boss on Tiny Bridge stage |
