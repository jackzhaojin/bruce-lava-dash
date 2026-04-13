import { GROUND_Y, SHIP_CEILING_Y } from "./constants.js";

export function generateBlockTower(x) {
  return [
    // Row 1: 1 block high, 3 columns wide
    { type: "block", x, y: GROUND_Y - 36, w: 36, h: 36 },
    { type: "block", x: x + 36, y: GROUND_Y - 36, w: 36, h: 36 },
    { type: "block", x: x + 72, y: GROUND_Y - 36, w: 36, h: 36 },
    // Row 2: 2 blocks high, 2 columns wide
    { type: "block", x: x + 130, y: GROUND_Y - 36, w: 36, h: 36 },
    { type: "block", x: x + 166, y: GROUND_Y - 36, w: 36, h: 36 },
    { type: "block", x: x + 130, y: GROUND_Y - 72, w: 36, h: 36 },
    { type: "block", x: x + 166, y: GROUND_Y - 72, w: 36, h: 36 },
    // Row 3: 3 blocks high, 1 column wide
    { type: "block", x: x + 260, y: GROUND_Y - 36, w: 36, h: 36 },
    { type: "block", x: x + 260, y: GROUND_Y - 72, w: 36, h: 36 },
    { type: "block", x: x + 260, y: GROUND_Y - 108, w: 36, h: 36 },
    // Single spike after tower
    { type: "spike", x: x + 340, y: GROUND_Y, w: 30, h: 40 },
  ];
}

export function generateShipObstacle(x) {
  const obs = [];
  const roll = Math.random();

  if (roll < 0.4) {
    // Ground & ceiling spikes
    const spikeSpacing = 35;
    const numSpikes = 8;
    for (let i = 0; i < numSpikes; i++) {
      obs.push({ type: "spike", x: x + i * spikeSpacing, y: GROUND_Y, w: 30, h: 40 });
    }
    for (let i = 0; i < numSpikes; i++) {
      obs.push({ type: "spike", x: x + i * spikeSpacing, y: SHIP_CEILING_Y, w: 30, h: 40, direction: "down" });
    }
  } else if (roll < 0.7) {
    // Green tower: 3 blocks tall with spike on top
    const bw = 36;
    for (let row = 0; row < 3; row++) {
      obs.push({ type: "block", x, y: GROUND_Y - bw * (row + 1), w: bw, h: bw });
    }
    obs.push({ type: "spike", x: x + 3, y: GROUND_Y - bw * 3, w: 30, h: 40 });
  } else {
    // Double green towers with gap between them
    const bw = 36;
    // First tower: 3 blocks + spike
    for (let row = 0; row < 3; row++) {
      obs.push({ type: "block", x, y: GROUND_Y - bw * (row + 1), w: bw, h: bw });
    }
    obs.push({ type: "spike", x: x + 3, y: GROUND_Y - bw * 3, w: 30, h: 40 });
    // Second tower: 3 blocks + spike
    const x2 = x + 180;
    for (let row = 0; row < 3; row++) {
      obs.push({ type: "block", x: x2, y: GROUND_Y - bw * (row + 1), w: bw, h: bw });
    }
    obs.push({ type: "spike", x: x2 + 3, y: GROUND_Y - bw * 3, w: 30, h: 40 });
  }

  return obs;
}

export function generateSandboxBallObstacle(x, onCeiling) {
  const obs = [];
  const bw = 36; // block width

  if (onCeiling) {
    // 3-wide x 4-tall tower hanging from the ceiling
    for (let col = 0; col < 3; col++) {
      for (let row = 0; row < 4; row++) {
        obs.push({ type: "block", x: x + col * bw, y: SHIP_CEILING_Y + bw * row, w: bw, h: bw });
      }
    }
    // Spikes on bottom of the tower (pointing down)
    for (let col = 0; col < 3; col++) {
      obs.push({ type: "spike", x: x + col * bw + 3, y: SHIP_CEILING_Y + bw * 4, w: 30, h: 40, direction: "down" });
    }
    // Spikes on the left side (pointing left)
    for (let row = 0; row < 4; row++) {
      obs.push({ type: "spike", x: x - 30, y: SHIP_CEILING_Y + bw * row + 3, w: 30, h: 30, direction: "left" });
    }
    // Spikes on the right side (pointing right)
    for (let row = 0; row < 4; row++) {
      obs.push({ type: "spike", x: x + 3 * bw, y: SHIP_CEILING_Y + bw * row + 3, w: 30, h: 30, direction: "right" });
    }
  } else {
    // 3-wide x 4-tall tower on the ground
    for (let col = 0; col < 3; col++) {
      for (let row = 0; row < 4; row++) {
        obs.push({ type: "block", x: x + col * bw, y: GROUND_Y - bw * (row + 1), w: bw, h: bw });
      }
    }
    // Spikes on top of the tower
    for (let col = 0; col < 3; col++) {
      obs.push({ type: "spike", x: x + col * bw + 3, y: GROUND_Y - bw * 4, w: 30, h: 40 });
    }
    // Spikes on the left side (pointing left)
    for (let row = 0; row < 4; row++) {
      obs.push({ type: "spike", x: x - 30, y: GROUND_Y - bw * (row + 1) + 3, w: 30, h: 30, direction: "left" });
    }
    // Spikes on the right side (pointing right)
    for (let row = 0; row < 4; row++) {
      obs.push({ type: "spike", x: x + 3 * bw, y: GROUND_Y - bw * (row + 1) + 3, w: 30, h: 30, direction: "right" });
    }
  }
  return obs;
}

export function generateBallObstacle(x) {
  const obs = [];
  const roll = Math.random();

  if (roll < 0.3) {
    // Ground spikes — must flip to ceiling to dodge
    const numSpikes = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numSpikes; i++) {
      obs.push({ type: "spike", x: x + i * 35, y: GROUND_Y, w: 30, h: 40 });
    }
  } else if (roll < 0.55) {
    // Ceiling spikes — must be on ground to dodge
    const numSpikes = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numSpikes; i++) {
      obs.push({ type: "spike", x: x + i * 35, y: SHIP_CEILING_Y, w: 30, h: 40, direction: "down" });
    }
  } else if (roll < 0.8) {
    // Alternating ground & ceiling — requires well-timed flips
    obs.push({ type: "spike", x, y: GROUND_Y, w: 30, h: 40 });
    obs.push({ type: "spike", x: x + 35, y: GROUND_Y, w: 30, h: 40 });
    obs.push({ type: "spike", x: x + 120, y: SHIP_CEILING_Y, w: 30, h: 40, direction: "down" });
    obs.push({ type: "spike", x: x + 155, y: SHIP_CEILING_Y, w: 30, h: 40, direction: "down" });
  } else {
    // Gauntlet — both surfaces at once with narrow gap
    for (let i = 0; i < 5; i++) {
      obs.push({ type: "spike", x: x + i * 40, y: GROUND_Y, w: 30, h: 30 });
      obs.push({ type: "spike", x: x + i * 40 + 20, y: SHIP_CEILING_Y, w: 30, h: 30, direction: "down" });
    }
  }

  return obs;
}

export function generateObstacle(x, level) {
  const patterns = [
    // Single spike
    [{ type: "spike", x, y: GROUND_Y, w: 30, h: 40 }],
    // Double spike
    [
      { type: "spike", x, y: GROUND_Y, w: 30, h: 40 },
      { type: "spike", x: x + 45, y: GROUND_Y, w: 30, h: 40 },
    ],
    // Block
    [{ type: "block", x, y: GROUND_Y - 36, w: 36, h: 36 }],
    // Block + spike
    [
      { type: "block", x, y: GROUND_Y - 36, w: 36, h: 36 },
      { type: "spike", x: x + 55, y: GROUND_Y, w: 30, h: 40 },
    ],
    // Tall block
    [{ type: "block", x, y: GROUND_Y - 72, w: 36, h: 72 }],
    // Triple spike
    [
      { type: "spike", x, y: GROUND_Y, w: 30, h: 40 },
      { type: "spike", x: x + 40, y: GROUND_Y, w: 30, h: 40 },
      { type: "spike", x: x + 80, y: GROUND_Y, w: 30, h: 40 },
    ],
    // Yellow pad before spike gap
    [
      { type: "pad", subtype: "yellow", x, y: GROUND_Y, w: 40, h: 10, activated: false },
      { type: "spike", x: x + 80, y: GROUND_Y, w: 30, h: 40 },
      { type: "spike", x: x + 120, y: GROUND_Y, w: 30, h: 40 },
    ],
    // Floating yellow orb
    [
      { type: "orb", subtype: "yellow", x: x + 20, y: GROUND_Y - 100, w: 28, h: 28, activated: false },
    ],
    // Pink pad + tall block combo
    [
      { type: "pad", subtype: "pink", x, y: GROUND_Y, w: 40, h: 10, activated: false },
      { type: "block", x: x + 70, y: GROUND_Y - 36, w: 36, h: 36 },
    ],
    // Black orb trap above spikes
    [
      { type: "orb", subtype: "black", x: x + 30, y: GROUND_Y - 120, w: 28, h: 28, activated: false },
      { type: "spike", x: x + 60, y: GROUND_Y, w: 30, h: 40 },
    ],
    // Blue pad + triple spike
    [
      { type: "pad", subtype: "blue", x, y: GROUND_Y, w: 40, h: 10, activated: false },
      { type: "spike", x: x + 80, y: GROUND_Y, w: 30, h: 40 },
      { type: "spike", x: x + 120, y: GROUND_Y, w: 30, h: 40 },
      { type: "spike", x: x + 160, y: GROUND_Y, w: 30, h: 40 },
    ],
    // Orb chain at different heights
    [
      { type: "orb", subtype: "green", x, y: GROUND_Y - 90, w: 28, h: 28, activated: false },
      { type: "orb", subtype: "yellow", x: x + 80, y: GROUND_Y - 130, w: 28, h: 28, activated: false },
      { type: "orb", subtype: "pink", x: x + 160, y: GROUND_Y - 80, w: 28, h: 28, activated: false },
    ],
    // 3-step staircase with spikes in gaps
    [
      { type: "block", x, y: GROUND_Y - 36, w: 36, h: 36 },
      { type: "spike", x: x + 50, y: GROUND_Y, w: 30, h: 40 },
      { type: "block", x: x + 90, y: GROUND_Y - 72, w: 36, h: 72 },
      { type: "spike", x: x + 140, y: GROUND_Y, w: 30, h: 40 },
      { type: "block", x: x + 180, y: GROUND_Y - 108, w: 36, h: 108 },
    ],
  ];
  const maxIdx = Math.min(patterns.length, 2 + Math.floor(level / 3));
  return patterns[Math.floor(Math.random() * maxIdx)];
}
