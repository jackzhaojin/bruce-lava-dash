export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 450;
export const GROUND_Y = 370;
export const CUBE_SIZE = 36;
export const GRAVITY = 0.55;
export const JUMP_FORCE = -12;
export const GAME_SPEED_BASE = 4;
export const PARTICLE_COUNT = 20;
export const REVIVE_FRAMES = 60;
export const DEAD_COOLDOWN = 180;

export const COLOR_PRESETS = [
  { name: "Orange", gradStart: "#ffaa00", gradEnd: "#ff6600", glow: "#ff8800", border: "#ffcc44" },
  { name: "Blue",   gradStart: "#00ccff", gradEnd: "#0066ff", glow: "#0088ff", border: "#66ddff" },
  { name: "Green",  gradStart: "#44ff66", gradEnd: "#00aa22", glow: "#22dd44", border: "#88ff99" },
  { name: "Purple", gradStart: "#cc66ff", gradEnd: "#7722cc", glow: "#aa44ff", border: "#dd99ff" },
  { name: "Pink",   gradStart: "#ff66aa", gradEnd: "#cc2266", glow: "#ff4488", border: "#ff99cc" },
  { name: "Red",    gradStart: "#ff4444", gradEnd: "#cc0000", glow: "#ff2222", border: "#ff8888" },
];

export const PAD_TYPES = {
  yellow: { vy: -14, color: "#ffdd00", glow: "rgba(255,221,0,0.6)" },
  pink:   { vy: -8,  color: "#ff66aa", glow: "rgba(255,102,170,0.6)" },
  blue:   { vy: -18, color: "#00aaff", glow: "rgba(0,170,255,0.6)" },
};

export const ORB_TYPES = {
  yellow: { vy: -12, color: "#ffdd00", glow: "rgba(255,221,0,0.6)" },
  pink:   { vy: -7,  color: "#ff66aa", glow: "rgba(255,102,170,0.6)" },
  blue:   { vy: -16, color: "#00aaff", glow: "rgba(0,170,255,0.6)" },
  green:  { vy: -10, color: "#44ff66", glow: "rgba(68,255,102,0.6)" },
  black:  { vy: 8,   color: "#333333", glow: "rgba(100,100,100,0.6)" },
  red:    { vy: -18, color: "#ff3333", glow: "rgba(255,51,51,0.6)" },
};
