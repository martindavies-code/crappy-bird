# KNIGHTMARE: DUNGEONEER'S FLIGHT ⚔️🪶

[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)]()
[![Tests](https://img.shields.io/badge/Tests-7%2F7%20Passed-brightgreen.svg)]()
[![Accessibility](https://img.shields.io/badge/WCAG-2.2%20AAA%20Compliant-blue.svg)]()
[![Theme](https://img.shields.io/badge/Theme-ITV%20Knightmare-amber.svg)]()
[![License](https://img.shields.io/badge/License-MIT-purple.svg)]()

> *"Enter, Stranger! Tread the path of peril, fly through the Corridor of Blades, and let not thy Life Force perish into bone and ash!"* — **Treguard of Dunshelm**

An accessible, roguelite ("gongueslike") flappy bird adventure steeped in the dark fantasy aesthetic of the legendary late 80s/90s British television kids show **Knightmare** (ITV/Broadsword).

---

## 🏰 The Knightmare Experience

Rather than cartoon pipes and sunny skies, enter the subterranean halls of **Castle Dunshelm**:
- **The Helmet of Justice**: Don the horned iron helm that covers your eyes, navigating perilous gothic arches by arcane flight instincts.
- **The Iconic Life Force Clock**: Your vitality decays over time, mirrored in the animated helmeted face in your HUD:
  - 🟢 **Green Visor** (100%–65%): Pristine armor and high vigor.
  - 🟡 **Amber Guard** (64%–33%): Warning bells toll; the visor peels away.
  - 🔴 **Red Menace** (32%–1%): Urgent heartbeat drums; flesh strips away with glowing red eyes.
  - 💀 **Skull of Doom** (0%): Terminal collapse into bleached bone!
- **Dungeon Rations**: Scavenge **Dungeon Apples**, **Knight's Meat Pies**, and **Roast Fowl** floating within passages to stave off hunger.
- **Hazardous Corridors**: Face spiked stone portcullises, guillotine pendulums in the *Corridor of Blades*, bubbling alembics in *The Alchemist's Vaults*, and the clockwork crushers of *Lord Fear's Technomantic Spire*.
- **Treguard's Counsel**: The Dungeon Master observes your flight, offering live commentary ("Enter, Stranger!", "Warning, team!", "Ooh, nasty!").

---

## 🔮 Roguelite Meta-Progression ("Gongueslike")

Every run earns **Dunshelm Gold Coins** and **Blood Rubies** that persist beyond death. Enter **Treguard's Sanctuary** between runs to forge eternal enchantments:

| Upgrade | Effect |
| :--- | :--- |
| **🛡️ Horns of Resilience** | +20% Maximum Life Force per tier (up to +100%) |
| **🪶 Plume of Levitation** | Reduces falling acceleration by 8% per tier |
| **🏛️ Dunshelm Masonry** | Expands obstacle corridor clearance by +14px per tier |
| **🪙 Alchemist's Satchel** | Multiplies gold and ruby drop values (+25% per tier) |
| **⚔️ Armor of Justice** | Grants iron shields that absorb lethal obstacle strikes |
| **❤️‍🔥 Treguard's Second Wind** | Miraculously revives you once per run with 50% Life Force |
| **📜 Spellcraft Affinity** | Reduces spell cooldowns (-10%) & extends duration (+15%) |
| **🥖 Scavenger's Lore** | Boosts food frequency and nutritional replenishment (+15%) |

### In-Run Relics
Discover ancient relics during long dungeon explorations:
- **Merlin's Feather**: Softer downward flutter arcs.
- **Smirky's Lucky Charm**: Magnetically draws gold and rubies to you.
- **Gwen's Golden Chalice**: Reduces natural Life Force decay rate by 25%.
- **Hourglass of Dunshelm**: Accelerates spell recharge by 35%.

---

## ⚡ Arcane Spells

Cast spells during flight to overcome insurmountable hazards:
- **`D-I-S-M-I-S-S`** `[E / 1]`: Pulverizes the nearest obstacle directly ahead into rubble.
- **`E-Y-E-S-H-I-E-L-D`**: Enters bullet-time slow motion (60% time dilation) for surgical gap threading.
- **`A-N-V-I-L`**: Summons a golden invulnerable ward crashing through all barriers.
- **`L-E-V-I-T-A-T-E`**: Suspends the dungeoneer in stable hover for 3 seconds.

---

## ♿ Uncompromised Accessibility (WCAG 2.2 AAA Target)

Engineered from the ground up for maximum inclusion:
1. **Screen Reader Live Regions**:
   - `aria-live="polite"` announces chamber milestones, rations eaten, and purchases.
   - `aria-live="assertive"` announces emergency life force alarms, armor strikes, and death.
2. **Real-time Closed Captions HUD**:
   - Live visual subtitles describe all synthesized audio events (`🔊 [Blade whoosh]`, `🔊 [Heartbeat pounding]`, `🔊 [Gold collected]`).
3. **Motor & Mobility Assist Suite**:
   - **Single-Switch Mode (Hold to Ascend)**: Fly smoothly by holding a single key or pointer without rapid repetitive tapping.
   - **Game Speed Slider**: Run the game at 50%, 75%, 100%, or 125% pace.
   - **Invincible Practice Mode**: Rehearse obstacle timing without damage.
4. **Sensory & Visual Options**:
   - **High Contrast Mode**: 7:1+ contrast with solid borders and high-luminance yellow-on-black HUD.
   - **Reduced Motion Mode**: Respects `prefers-reduced-motion` and toggles screen shake, flash, and parallax off.
   - **Dyslexic Font Mode**: Replaces gothic lettering with clean, high-legibility sans-serif typography.
5. **Keyboard & Semantic Modals**:
   - Built on native `<dialog>` with `.showModal()`, focus trapping, and ESC dismissal.
   - Fully operable with standard keyboard navigation.

---

## 🕹️ Controls

| Action | Primary Key | Alternate Inputs |
| :--- | :--- | :--- |
| **Flap / Ascend** | `Space` | `Arrow Up`, `W`, `Enter`, Left Click, Screen Touch |
| **Cast Spell (DISMISS)** | `E` | `Digit 1`, `Q`, In-HUD Spell Button |
| **Pause / Resume** | `Escape` | `P` |
| **Navigate Menus** | `Tab` / `Shift+Tab` | Arrow Keys, `Enter`, `Space` |

---

## 🛠️ Technology Stack

- **Architecture**: Modular Modern ES Modules (Zero runtime frameworks required).
- **Rendering**: HTML5 Canvas 2D engine with multi-layer parallax, procedural vector dungeoneer art, and particle dynamics.
- **Audio**: Custom zero-dependency **Web Audio API** procedural synthesizer (authentic medieval chords, chimes, horns, and blade whooshes).
- **State & Save**: LocalStorage with schema validation, export/import JSON backups.
- **Bundler & Dev**: Vite 5.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)

### Installation
```bash
# Clone the repository
git clone https://github.com/martindavies-code/crappy-bird.git
cd crappy-bird

# Install dependencies
npm install

# Start local development server
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your browser.

### Run Automated Tests
```bash
npm test
```

### Production Build
```bash
npm run build
```

---

*Dedicated to fans of Knightmare, Treguard of Dunshelm, and accessible retro web gaming.*
