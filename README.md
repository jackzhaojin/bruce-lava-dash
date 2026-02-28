# 🌋 Lava Dash

A **Geometry Dash-inspired** side-scrolling game set in a volcanic lava world — built by father & son with Claude AI.

![Game](https://img.shields.io/badge/genre-platformer-ff4400) ![Built With](https://img.shields.io/badge/built%20with-React%20%2B%20Canvas-61dafb) ![AI](https://img.shields.io/badge/AI%20assisted-Claude-blueviolet)

## 🎮 Gameplay

You control a **glowing cube** dashing through a dangerous volcanic landscape. Jump over lava spikes and obsidian blocks to survive as long as possible. The game speeds up as you progress through levels — how far can you go?

### Controls

| Input | Action |
|-------|--------|
| `Space` | Jump |
| `↑ Arrow` | Jump |
| `W` | Jump |
| `Click / Tap` | Jump |

### Features

- 🟧 Classic cube character with glowing eye and rotation physics
- 🌋 Animated volcanic world — dark skies, background volcanoes, flowing lava surface
- 🔺 Multiple obstacle types — spikes, blocks, and combo patterns
- 🎵 8-bit chiptune sound effects (jump, death, background beat)
- 📈 Progressive difficulty — speed and obstacle complexity increase per level
- 💥 Particle explosion effects on death
- 🏆 High score tracking (per session)

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
lava-dash-game/
├── index.html          # Entry HTML
├── package.json        # Dependencies & scripts
├── vite.config.js      # Vite bundler config
├── README.md
└── src/
    ├── main.jsx        # React entry point
    └── LavaDash.jsx    # The entire game (React + Canvas)
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
- [ ] Leaderboard with persistent high scores
- [ ] Mobile-optimized touch controls
- [ ] Background music track (procedural chiptune)
- [ ] Boss obstacles
- [ ] Character skins / unlockables

## 📝 License

This is a personal father-son project. Feel free to learn from it and remix it!

---

*Built with ❤️ and 🌋 using Claude AI*
