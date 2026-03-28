import { GRAVITY, GROUND_Y, CUBE_SIZE, GAME_WIDTH, PAD_TYPES, ORB_TYPES, SHIP_GRAVITY, SHIP_MAX_VY, SHIP_CEILING_Y } from "./constants.js";
import { playSound } from "./audio.js";
import { createParticles } from "./entities.js";

export function updatePlayer(player, obstacles) {
  player.vy += GRAVITY;
  player.y += player.vy;

  // Land on block tops (platforms)
  if (player.alive && player.vy >= 0 && obstacles) {
    const prevBottom = player.y - player.vy + CUBE_SIZE;
    const currBottom = player.y + CUBE_SIZE;
    const cubeL = player.x + 6;
    const cubeR = player.x + CUBE_SIZE - 6;
    for (const o of obstacles) {
      if (o.type !== "block") continue;
      if (cubeR > o.x + 3 && cubeL < o.x + o.w - 3 &&
          prevBottom <= o.y + 6 && currBottom >= o.y) {
        player.y = o.y - CUBE_SIZE;
        player.vy = 0;
        player.grounded = true;
        break;
      }
    }
  }

  if (player.y >= GROUND_Y - CUBE_SIZE) {
    player.y = GROUND_Y - CUBE_SIZE;
    player.vy = 0;
    player.grounded = true;
  }
  // Rotation
  if (!player.grounded) {
    player.rotation += 0.08;
  } else {
    player.rotation = Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
  }
}

export function updateShipPlayer(player, obstacles) {
  player.vy += SHIP_GRAVITY;
  if (player.vy > SHIP_MAX_VY) player.vy = SHIP_MAX_VY;
  if (player.vy < -SHIP_MAX_VY) player.vy = -SHIP_MAX_VY;
  player.y += player.vy;

  // Land on block tops
  if (player.alive && player.vy >= 0 && obstacles) {
    const prevBottom = player.y - player.vy + CUBE_SIZE;
    const currBottom = player.y + CUBE_SIZE;
    const cubeL = player.x + 6;
    const cubeR = player.x + CUBE_SIZE - 6;
    for (const o of obstacles) {
      if (o.type !== "block") continue;
      if (cubeR > o.x + 3 && cubeL < o.x + o.w - 3 &&
          prevBottom <= o.y + 6 && currBottom >= o.y) {
        player.y = o.y - CUBE_SIZE;
        player.vy = 0;
        player.grounded = true;
        break;
      }
    }
  }

  // Ceiling clamp
  if (player.y < SHIP_CEILING_Y) {
    player.y = SHIP_CEILING_Y;
    player.vy = 0;
  }
  // Ground clamp
  if (player.y >= GROUND_Y - CUBE_SIZE) {
    player.y = GROUND_Y - CUBE_SIZE;
    player.vy = 0;
    player.grounded = true;
  } else if (player.vy !== 0) {
    player.grounded = false;
  }

  // Smooth tilt based on vertical velocity
  const targetRotation = player.vy * 0.05;
  player.rotation += (targetRotation - player.rotation) * 0.15;
}

export function checkCollision(player, obstacles) {
  const cubeL = player.x + 6;
  const cubeR = player.x + CUBE_SIZE - 6;
  const cubeT = player.y + 6;
  const cubeB = player.y + CUBE_SIZE - 4;

  for (const o of obstacles) {
    if (o.type === "spike") {
      const triL = o.x + 4;
      const triR = o.x + o.w - 4;
      if (o.direction === "down") {
        const spikeBottom = o.y + o.h;
        if (cubeR > triL && cubeL < triR && cubeB > o.y && cubeT < spikeBottom - 10) {
          return true;
        }
      } else {
        const spikeTop = o.y - o.h;
        if (cubeR > triL && cubeL < triR && cubeB > spikeTop + 10 && cubeT < o.y) {
          return true;
        }
      }
    } else if (o.type === "block") {
      const playerBottom = player.y + CUBE_SIZE;
      const onTop = playerBottom <= o.y + 10;
      if (!onTop && cubeR > o.x + 10 && cubeL < o.x + o.w - 3 && cubeB > o.y + 3 && cubeT < o.y + o.h - 3) {
        return true;
      }
    }
  }
  return false;
}

export function checkBoosts(player, obstacles, g) {
  const cubeL = player.x + 4;
  const cubeR = player.x + CUBE_SIZE - 4;
  const cubeT = player.y + 4;
  const cubeB = player.y + CUBE_SIZE - 2;

  for (const o of obstacles) {
    if ((o.type !== "pad" && o.type !== "orb") || o.activated) continue;

    let oL, oR, oT, oB;
    if (o.type === "pad") {
      oL = o.x;
      oR = o.x + o.w;
      oT = o.y - o.h;
      oB = o.y;
    } else {
      oL = o.x;
      oR = o.x + o.w;
      oT = o.y;
      oB = o.y + o.h;
    }

    if (cubeR > oL && cubeL < oR && cubeB > oT && cubeT < oB) {
      o.activated = true;
      const cfg = o.type === "pad" ? PAD_TYPES[o.subtype] : ORB_TYPES[o.subtype];
      if (cfg) {
        player.vy = cfg.vy;
        player.grounded = false;
        playSound("boost");
        const pColor = cfg.color;
        g.particles.push(...createParticles(
          player.x + CUBE_SIZE / 2,
          player.y + CUBE_SIZE / 2,
          [pColor, "#fff", pColor, "#ffcc00", pColor]
        ));
      }
    }
  }
}

export function killPlayer(g, player) {
  player.alive = false;
  player.ghostTimer = 0;
  g.screenShake = 12;
  const isP1 = player.id === 1;
  const colorObj = isP1 ? g.p1Color : g.p2Color;
  const colors = colorObj
    ? [colorObj.gradStart, colorObj.gradEnd, colorObj.glow, colorObj.border, colorObj.gradEnd]
    : (isP1
      ? ["#ff4500", "#ff6b35", "#ffa500", "#ffcc00", "#ff0000"]
      : ["#0088ff", "#00bbff", "#00ccff", "#66ddff", "#0044cc"]);
  g.particles.push(...createParticles(player.x + CUBE_SIZE / 2, player.y + CUBE_SIZE / 2, colors));
  playSound("death");
}

export function revivePlayer(g, deadPlayer, alivePlayer) {
  deadPlayer.alive = true;
  deadPlayer.ghostTimer = 0;
  deadPlayer.invincible = 90; // 1.5 seconds of invincibility after revive
  deadPlayer.vy = 0;
  deadPlayer.grounded = true;
  deadPlayer.rotation = 0;
  // Revive in current mode (ship or cube)
  deadPlayer.shipMode = g.currentMode === "ship";
  if (alivePlayer && alivePlayer.alive) {
    deadPlayer.x = alivePlayer.x + (deadPlayer.id === 1 ? -70 : 70);
    if (deadPlayer.x < 30) deadPlayer.x = 30;
    if (deadPlayer.x > GAME_WIDTH - 100) deadPlayer.x = GAME_WIDTH - 100;
  }
  deadPlayer.y = GROUND_Y - CUBE_SIZE;
  playSound("revive");
}
