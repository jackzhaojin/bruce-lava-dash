# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server (http://localhost:5173)
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build locally

There are no tests or linting configured.

## Architecture

This is a single-file canvas game. The entire game lives in `LavaDash.jsx` — a single React component that uses `<canvas>` for all rendering via a `requestAnimationFrame` game loop.

**Entry flow:** `index.html` → `main.jsx` → `<LavaDash />`

### LavaDash.jsx structure

- **Constants & config** (top): game dimensions, physics values (`GRAVITY`, `JUMP_FORCE`, `GAME_SPEED_BASE`), color presets, pad/orb type definitions
- **Helper functions** (outside component): `getCurrentPeriods()`, `loadHighScores()`, `saveHighScores()`, `updateHighScores()` for localStorage-backed multi-category high scores; `playSound()` using a shared Web Audio API `AudioContext`; `generateObstacle()` for procedural obstacle patterns; `createParticles()`, `createPlayer()`
- **Component state**: `playerMode` (null/1/2), color selections (`p1Color`, `p2Color`), display state synced from game loop
- **`gameRef.current`**: all mutable game state (players, obstacles, score, highScores, physics) — mutated directly in the game loop, not via React state
- **Game loop** (inside `useEffect`): handles physics, collision, rendering, and UI overlays (menu/playing/dead screens) — all drawn to canvas via 2D context
- **Three game states**: `"menu"` → `"playing"` → `"dead"` → back to `"menu"`

### Key patterns

- All rendering is imperative canvas drawing, not React DOM — the React component just hosts the `<canvas>` element and the mode-selection screen
- Game state is in a ref (`gameRef`) to avoid re-renders during gameplay; only `displayState`/`displayScore`/`displayHigh` are React state (for the mode-selection UI)
- Sound uses a single shared `AudioContext` (not one per sound) to avoid browser audio context limits
- High scores persist in `localStorage` under key `"lavadash_scores"` with 5 categories: daily, weekly, monthly, yearly, all-time
- Obstacle types: `spike` (triangle), `block` (rectangle/platform), `pad` (ground boost), `orb` (floating boost ring)
- 2-player co-op: players revive each other after `REVIVE_FRAMES`; game over only when both are dead simultaneously

## Do not

- Do not commit or push unless explicitly instructed to
- Do not create markdown files like CHANGES.md in the root
