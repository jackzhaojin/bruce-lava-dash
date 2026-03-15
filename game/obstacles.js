import { GROUND_Y } from "./constants.js";

export function generateBlockTower(x) {
  return [
    // Column 1: 1 block
    { type: "block", x, y: GROUND_Y - 36, w: 36, h: 36 },
    { type: "spike", x: x + 50, y: GROUND_Y, w: 30, h: 40 },
    // Column 2: 2 blocks stacked
    { type: "block", x: x + 100, y: GROUND_Y - 36, w: 36, h: 36 },
    { type: "block", x: x + 100, y: GROUND_Y - 72, w: 36, h: 36 },
    { type: "spike", x: x + 150, y: GROUND_Y, w: 30, h: 40 },
    // Column 3: 3 blocks stacked
    { type: "block", x: x + 200, y: GROUND_Y - 36, w: 36, h: 36 },
    { type: "block", x: x + 200, y: GROUND_Y - 72, w: 36, h: 36 },
    { type: "block", x: x + 200, y: GROUND_Y - 108, w: 36, h: 36 },
  ];
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
