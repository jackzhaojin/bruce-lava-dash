# 🌋 Lava Dash

A **Geometry Dash-inspired** side-scrolling game set in a volcanic lava world — built by father & son with Claude AI.

![Game](https://img.shields.io/badge/genre-platformer-ff4400) ![Built With](https://img.shields.io/badge/built%20with-React%20%2B%20Canvas-61dafb) ![AI](https://img.shields.io/badge/AI%20assisted-Claude-blueviolet)

## 🎮 Gameplay

You control a **glowing cube** dashing through a dangerous volcanic landscape. Jump over lava spikes and obsidian blocks to survive as long as possible. The game speeds up as you progress through levels — how far can you go?

### Controls

**1-Player Mode:**

| Input | Action |
|-------|--------|
| `Space` / `Shift` | Jump |
| `Click` | Jump |
| `Tap` (mobile) | Jump |

**2-Player Co-op:**

| Input | Action |
|-------|--------|
| `Left Shift` | P1 Jump |
| `Right Shift` | P2 Jump |
| `Space` / `Click` | Both Jump |
| Tap left half (mobile) | P1 Jump |
| Tap right half (mobile) | P2 Jump |

### Features

- 🟧 Classic cube character with glowing eye and rotation physics
- 🌋 Animated volcanic world — dark skies, background volcanoes, flowing lava surface
- 🔺 Multiple obstacle types — spikes, blocks, pads, orbs, and combo patterns
- 🎵 8-bit chiptune sound effects (jump, death, boost, revive, background beat)
- 📈 Progressive difficulty — speed and obstacle complexity increase per level
- 💥 Particle explosion effects on death and boosts
- 🏆 Persistent high scores — daily, weekly, monthly, yearly, and all-time
- 🤝 2-player co-op — revive your partner when they die
- 📱 Mobile touch controls — tap zones split screen for 2-player on one device
- 🎨 Customizable player colors — 6 color presets per player

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer)
- npm (comes with Node.js)

### Run It

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

Then open **http://localhost:5173** in your browser and play!

### Build for Production

```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
bruce-lava-dash/
├── index.html          # Entry HTML
├── main.jsx            # React entry point
├── LavaDash.jsx        # React component: game loop, canvas, mode selection UI
├── game/
│   ├── constants.js    # Dimensions, physics, color presets, pad/orb types
│   ├── audio.js        # Shared AudioContext singleton, playSound()
│   ├── highScores.js   # localStorage high score CRUD
│   ├── obstacles.js    # Procedural obstacle pattern generation
│   ├── entities.js     # createPlayer(), createParticles()
│   ├── physics.js      # Player update, collision, boosts, kill/revive
│   ├── renderer.js     # All canvas draw functions
│   └── input.js        # Keyboard, multi-touch zones, mouse handlers
├── package.json
├── vite.config.js
└── README.md
```

## 🛠 Tech Stack

- **React 18** — component structure & state management
- **HTML5 Canvas** — game rendering (60fps game loop)
- **Web Audio API** — 8-bit chiptune sound synthesis (no audio files needed!)
- **Vite** — fast dev server & bundler

## 🎯 Game Design Decisions

These were chosen by a young game designer via multiple-choice questions:

| Decision | Choice |
|----------|--------|
| Player character | Classic cube |
| World theme | Lava & volcanoes |
| Main mechanic | Jump over obstacles |
| Audio style | Retro 8-bit chiptune |
| Starting difficulty | Medium (a little challenge) |

## 🔮 Ideas for Next Features

- [ ] Rocket ship mode (fly instead of jump)
- [ ] Gravity flip portals
- [ ] Collectible coins / gems
- [ ] Multiple level themes (ice world, space, candy)
- [ ] Custom level editor
- [x] Leaderboard with persistent high scores
- [x] Mobile-optimized touch controls
- [ ] Background music track (procedural chiptune)
- [ ] Boss obstacles
- [ ] Character skins / unlockables

## 📝 License

This is a personal father-son project. Feel free to learn from it and remix it!

---

*Built with ❤️ and 🌋 using Claude AI*
