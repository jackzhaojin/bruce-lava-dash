import { PARTICLE_COUNT, GROUND_Y, CUBE_SIZE } from "./constants.js";

export function createParticles(x, y, colors) {
  const particleColors = colors || ["#ff4500", "#ff6b35", "#ffa500", "#ffcc00", "#ff0000"];
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x,
    y,
    vx: (Math.random() - 0.5) * 10,
    vy: (Math.random() - 1) * 8,
    life: 1,
    size: Math.random() * 6 + 2,
    color: particleColors[Math.floor(Math.random() * particleColors.length)],
  }));
}

export function createPlayer(x, id) {
  return {
    id,
    x,
    y: GROUND_Y - CUBE_SIZE,
    vy: 0,
    rotation: 0,
    grounded: true,
    alive: true,
    ghostTimer: 0,
    shipMode: false,
    invincible: 0,
  };
}
