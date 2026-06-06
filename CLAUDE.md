# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server (http://localhost:5173)
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build locally

There are no tests or linting configured.

## Architecture

A canvas-based React game split into modules under `game/`.

**Entry flow:** `index.html` → `main.jsx` → `<LavaDash />`

### File structure

```
game/
  constants.js       — dimensions, physics, COLOR_PRESETS, PAD_TYPES, ORB_TYPES
  audio.js           — shared AudioContext singleton, playSound()
  highScores.js      — localStorage high score CRUD (daily/weekly/monthly/yearly/all-time)
  obstacles.js       — generateObstacle() procedural patterns
  entities.js        — createPlayer(), createParticles()
  physics.js         — updatePlayer, checkCollision, checkBoosts, killPlayer, revivePlayer
  renderer.js        — all draw* functions + drawTouchZoneDivider
  input.js           — keyboard listeners, multi-touch zone detection, mouse handlers, isTouchDevice
LavaDash.jsx         — React component: game loop orchestration, canvas, mode selection UI
```

### LavaDash.jsx structure

- **Component state**: `playerMode` (null/1/2), `sandboxStart`, color selections (`p1Color`, `p2Color`) — nothing else; the game loop must never call React state setters (re-renders during gameplay cause GC stutter)
- **`gameRef.current`**: all mutable game state (players, obstacles, score, highScores, physics) — mutated directly in the game loop, not via React state
- **Game loop** (inside `useEffect`): orchestrates physics, collision, rendering, and UI overlays (menu/playing/dead screens)
- **Three game states**: `"menu"` → `"playing"` → `"dead"` → back to `"menu"`

### Key patterns

- All rendering is imperative canvas drawing, not React DOM — the React component just hosts the `<canvas>` element and the mode-selection screen
- Game state is in a ref (`gameRef`, lazily initialized once with an `if (gameRef.current === null)` guard — a `useRef({...})` literal would rebuild the object every render) to avoid re-renders during gameplay
- Sound uses a single shared `AudioContext` (not one per sound) to avoid browser audio context limits; `unlockAudio()` is called from user gestures (mode select, game start) so the context is created/resumed before gameplay, not on the first in-game sound
- Canvas gradients are cached (`getGradient()` in `renderer.js`, keyed per-context) — never create gradients per frame; entity draws use `ctx.translate()` local space so cached gradients are position-independent
- A warm-up pass in the game-loop `useEffect` pre-renders every entity/font/gradient and runs each generator once, then clears the canvas — keeps first-use costs out of mode transitions
- High scores persist in `localStorage` under key `"lavadash_scores"` with 5 categories: daily, weekly, monthly, yearly, all-time
- Obstacle types: `spike` (triangle), `block` (rectangle/platform), `pad` (ground boost), `orb` (floating boost ring)
- 2-player co-op: players revive each other after `REVIVE_FRAMES`; game over only when both are dead simultaneously

### Mobile touch controls

- `input.js` exports multi-touch handlers: `handleTouchStart` maps each touch to P1/P2 based on canvas half (left = P1, right = P2 in 2P mode)
- Touch state tracked in `touchesRef` (Map of touchId → side), read each frame via `getTouchState()`
- `isTouchDevice` flag controls touch-specific UI text and the center divider line in 2P mode
- Canvas has `touchAction: "none"` to prevent browser zoom/scroll gestures

## Do not

- Do not commit or push unless explicitly instructed to
- Do not create markdown files like CHANGES.md in the root
