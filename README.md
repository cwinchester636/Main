# Spire Jumper

A browser-based platformer built with React and HTML5 Canvas. Run, jump, stomp enemies, dodge spikes, collect coins, and reach the flag across three hand-built levels.

## Controls

- **Move** — Arrow keys or A/D
- **Jump** — Arrow Up, W, or Space (hold for a higher jump)
- Touch controls appear automatically on touchscreens.

## Gameplay

- 3 lives per run, shared across all levels.
- Stomp on enemies from above to defeat them (+50 score); touching them any other way costs a life.
- Spikes and falling into pits cost a life and respawn you at the level's start.
- Collect coins for +10 score each.
- Reach the flag to complete a level and carry your score/lives into the next one.

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build
npm run lint      # oxlint
```

## Project structure

- `src/game/constants.js` — physics and gameplay tuning constants.
- `src/game/levels.js` — level data, built programmatically from ground gaps, platforms, spikes, coins, and enemy patrol ranges.
- `src/game/GameCanvas.jsx` — the game engine: input handling, physics/collision, camera, and rendering, driven by `requestAnimationFrame`.
- `src/App.jsx` — menu, HUD, and overlay screens (level complete, game over, win) wrapped around `GameCanvas`.
