import {
  GAME_WIDTH, GAME_HEIGHT, GROUND_Y, CUBE_SIZE,
  PAD_TYPES, ORB_TYPES, COLOR_PRESETS, REVIVE_FRAMES,
} from "./constants.js";
import { isTouchDevice } from "./input.js";

// On mobile Safari, shadowBlur is extremely expensive (5-10x per draw call).
// Disable or reduce it on touch devices for performance.
const shadow = isTouchDevice ? 0 : 1; // multiplier: 0 on mobile, 1 on desktop

export function drawVolcano(ctx, x, w, h) {
  const baseY = GROUND_Y + 30;
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x + w * 0.35, baseY - h);
  ctx.lineTo(x + w * 0.45, baseY - h + 8);
  ctx.lineTo(x + w * 0.55, baseY - h + 8);
  ctx.lineTo(x + w * 0.65, baseY - h);
  ctx.lineTo(x + w, baseY);
  ctx.closePath();
  const grad = ctx.createLinearGradient(x, baseY - h, x, baseY);
  grad.addColorStop(0, "#5a1a00");
  grad.addColorStop(0.5, "#3d1200");
  grad.addColorStop(1, "#2a0a00");
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x + w * 0.5, baseY - h + 8, 12, 0, Math.PI * 2);
  const glowGrad = ctx.createRadialGradient(x + w * 0.5, baseY - h + 8, 0, x + w * 0.5, baseY - h + 8, 20);
  glowGrad.addColorStop(0, "rgba(255,100,0,0.8)");
  glowGrad.addColorStop(1, "rgba(255,50,0,0)");
  ctx.fillStyle = glowGrad;
  ctx.fill();
}

export function drawSpike(ctx, x, y, w, h, direction) {
  ctx.beginPath();
  if (direction === "down") {
    ctx.moveTo(x, y);
    ctx.lineTo(x + w / 2, y + h);
    ctx.lineTo(x + w, y);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x + w / 2, y - h);
    ctx.lineTo(x + w, y);
  }
  ctx.closePath();
  const tipY = direction === "down" ? y + h : y - h;
  const grad = ctx.createLinearGradient(x, y, x + w / 2, tipY);
  grad.addColorStop(0, "#dddddd");
  grad.addColorStop(1, "#ffffff");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.shadowColor = "#aaccff";
  ctx.shadowBlur = 8 * shadow;
  ctx.fill();
  ctx.shadowBlur = 0;
}

export function drawBlock(ctx, x, y, w, h, towerIdx) {
  const isGreen = towerIdx != null && towerIdx % 2 === 0;
  const isRed = towerIdx != null && towerIdx % 2 === 1;
  const fill = isGreen ? "#1a4422" : isRed ? "#441a1a" : "#334455";
  const stroke = isGreen ? "#44ff66" : isRed ? "#ff4444" : "#88bbee";
  const inner = isGreen ? "rgba(68,255,102,0.3)" : isRed ? "rgba(255,68,68,0.3)" : "rgba(150,200,255,0.3)";
  const glowColor = isGreen ? "#22dd44" : isRed ? "#ff2222" : "#6699cc";

  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  ctx.strokeStyle = inner;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);

  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 6 * shadow;
  ctx.strokeStyle = stroke;
  ctx.strokeRect(x, y, w, h);
  ctx.shadowBlur = 0;
}

export function drawPad(ctx, o, frameCount) {
  const cfg = PAD_TYPES[o.subtype] || PAD_TYPES.yellow;
  ctx.save();
  if (o.activated) ctx.globalAlpha = 0.3;

  ctx.shadowColor = cfg.glow;
  ctx.shadowBlur = 10 * shadow;

  ctx.fillStyle = cfg.color;
  ctx.fillRect(o.x, o.y - o.h, o.w, o.h);

  ctx.fillStyle = "#fff";
  ctx.globalAlpha = o.activated ? 0.1 : 0.4;
  ctx.fillRect(o.x, o.y - o.h, o.w, 2);

  if (!o.activated) {
    ctx.globalAlpha = 0.7 + Math.sin(frameCount * 0.1) * 0.3;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    const cx = o.x + o.w / 2;
    const cy = o.y - o.h / 2;
    ctx.moveTo(cx, cy - 4);
    ctx.lineTo(cx - 4, cy + 2);
    ctx.lineTo(cx + 4, cy + 2);
    ctx.closePath();
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

export function drawOrb(ctx, o, frameCount) {
  const cfg = ORB_TYPES[o.subtype] || ORB_TYPES.yellow;
  const cx = o.x + o.w / 2;
  const cy = o.y + o.h / 2;
  const r = o.w / 2;

  ctx.save();
  if (o.activated) ctx.globalAlpha = 0.25;

  if (!o.activated) {
    const pulse = 1 + Math.sin(frameCount * 0.08) * 0.3;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = o.activated ? 0.1 : (0.4 + Math.sin(frameCount * 0.08) * 0.3);
    ctx.stroke();
    ctx.globalAlpha = o.activated ? 0.25 : 1;
  }

  const grad = ctx.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, r);
  grad.addColorStop(0, "#fff");
  grad.addColorStop(0.4, cfg.color);
  grad.addColorStop(1, o.subtype === "black" ? "#111" : cfg.color);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.shadowColor = cfg.glow;
  ctx.shadowBlur = 12 * shadow;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx - 3, cy - 3, r * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.shadowBlur = 0;
  ctx.fill();

  ctx.restore();
}

export function drawCube(ctx, player, isGhost, frameCount, colorObj) {
  const isP1 = player.id === 1;
  const gradStart = colorObj ? colorObj.gradStart : (isP1 ? "#ffaa00" : "#00ccff");
  const gradEnd = colorObj ? colorObj.gradEnd : (isP1 ? "#ff6600" : "#0066ff");
  const glowColor = colorObj ? colorObj.glow : (isP1 ? "#ff8800" : "#0088ff");
  const borderColor = colorObj ? colorObj.border : (isP1 ? "#ffcc44" : "#66ddff");

  let drawX = player.x;
  let drawY = player.y;

  ctx.save();

  if (isGhost) {
    ctx.globalAlpha = 0.35;
  }

  const cx = drawX + CUBE_SIZE / 2;
  const cy = drawY + CUBE_SIZE / 2;
  ctx.translate(cx, cy);
  ctx.rotate(player.rotation);

  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 15 * shadow;

  const cubeGrad = ctx.createLinearGradient(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE / 2, CUBE_SIZE / 2);
  cubeGrad.addColorStop(0, gradStart);
  cubeGrad.addColorStop(1, gradEnd);
  ctx.fillStyle = cubeGrad;
  ctx.fillRect(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE, CUBE_SIZE);

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE, CUBE_SIZE);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff";
  ctx.fillRect(4, -10, 12, 12);
  ctx.fillStyle = "#111";
  ctx.fillRect(9, -7, 6, 6);
  ctx.fillStyle = "#fff";
  ctx.fillRect(11, -6, 2, 2);

  ctx.restore();
}

export function drawShip(ctx, player, isGhost, frameCount, colorObj) {
  const isP1 = player.id === 1;
  const gradStart = colorObj ? colorObj.gradStart : (isP1 ? "#ffaa00" : "#00ccff");
  const gradEnd = colorObj ? colorObj.gradEnd : (isP1 ? "#ff6600" : "#0066ff");
  const glowColor = colorObj ? colorObj.glow : (isP1 ? "#ff8800" : "#0088ff");
  const borderColor = colorObj ? colorObj.border : (isP1 ? "#ffcc44" : "#66ddff");

  ctx.save();
  if (isGhost) ctx.globalAlpha = 0.35;

  const cx = player.x + CUBE_SIZE / 2;
  const cy = player.y + CUBE_SIZE / 2;
  const r = CUBE_SIZE / 2;

  ctx.translate(cx, cy);
  ctx.rotate(player.rotation);

  // Glow
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 15 * shadow;

  // Circle body
  const circGrad = ctx.createRadialGradient(-4, -4, 0, 0, 0, r);
  circGrad.addColorStop(0, gradStart);
  circGrad.addColorStop(1, gradEnd);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = circGrad;
  ctx.fill();

  // Border
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.shadowBlur = 0;

  // Ship arrow icon (pointing right)
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(-6, -8);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-6, 8);
  ctx.closePath();
  ctx.fill();

  // Small cockpit dot
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(3, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawGhostCountdown(ctx, player, frameCount, colorObj) {
  if (!player.alive && player.ghostTimer < REVIVE_FRAMES) {
    const remaining = Math.ceil((REVIVE_FRAMES - player.ghostTimer) / 60);
    const isP1 = player.id === 1;

    ctx.save();
    ctx.font = "bold 22px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = colorObj ? colorObj.gradStart : (isP1 ? "#ffaa00" : "#00ccff");
    ctx.shadowColor = colorObj ? colorObj.gradEnd : (isP1 ? "#ff6600" : "#0066ff");
    ctx.shadowBlur = 10 * shadow;
    ctx.fillText(remaining.toString(), player.x + CUBE_SIZE / 2, player.y - 12);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

export function drawMenuCubes(ctx, frameCount, c1, c2) {
  // Draw P1 cube
  const p1x = GAME_WIDTH / 2 - 55;
  const p1y = 175 + Math.sin(frameCount * 0.04) * 5;
  ctx.save();
  ctx.translate(p1x + CUBE_SIZE / 2, p1y + CUBE_SIZE / 2);
  ctx.rotate(Math.sin(frameCount * 0.02) * 0.15);
  ctx.shadowColor = c1.glow;
  ctx.shadowBlur = 15 * shadow;
  const g1 = ctx.createLinearGradient(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE / 2, CUBE_SIZE / 2);
  g1.addColorStop(0, c1.gradStart);
  g1.addColorStop(1, c1.gradEnd);
  ctx.fillStyle = g1;
  ctx.fillRect(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE, CUBE_SIZE);
  ctx.strokeStyle = c1.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE, CUBE_SIZE);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff";
  ctx.fillRect(4, -10, 12, 12);
  ctx.fillStyle = "#111";
  ctx.fillRect(9, -7, 6, 6);
  ctx.fillStyle = "#fff";
  ctx.fillRect(11, -6, 2, 2);
  ctx.restore();

  // P1 label
  ctx.save();
  ctx.font = "bold 12px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = c1.gradStart;
  ctx.fillText("P1", p1x + CUBE_SIZE / 2, p1y + CUBE_SIZE + 16);
  ctx.restore();

  // Draw P2 cube
  const p2x = GAME_WIDTH / 2 + 20;
  const p2y = 175 + Math.sin(frameCount * 0.04 + 1) * 5;
  ctx.save();
  ctx.translate(p2x + CUBE_SIZE / 2, p2y + CUBE_SIZE / 2);
  ctx.rotate(Math.sin(frameCount * 0.02 + 1) * 0.15);
  ctx.shadowColor = c2.glow;
  ctx.shadowBlur = 15 * shadow;
  const g2 = ctx.createLinearGradient(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE / 2, CUBE_SIZE / 2);
  g2.addColorStop(0, c2.gradStart);
  g2.addColorStop(1, c2.gradEnd);
  ctx.fillStyle = g2;
  ctx.fillRect(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE, CUBE_SIZE);
  ctx.strokeStyle = c2.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE, CUBE_SIZE);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff";
  ctx.fillRect(4, -10, 12, 12);
  ctx.fillStyle = "#111";
  ctx.fillRect(9, -7, 6, 6);
  ctx.fillStyle = "#fff";
  ctx.fillRect(11, -6, 2, 2);
  ctx.restore();

  // P2 label
  ctx.save();
  ctx.font = "bold 12px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = c2.gradStart;
  ctx.fillText("P2", p2x + CUBE_SIZE / 2, p2y + CUBE_SIZE + 16);
  ctx.restore();
}

export function drawPlayerStatus(ctx, g) {
  const c1 = g.p1Color || COLOR_PRESETS[0];
  const c2 = g.p2Color || COLOR_PRESETS[1];
  ctx.save();
  const statusY = 10;
  const statusH = 22;

  // P1
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(GAME_WIDTH - 200, statusY, 90, statusH);
  ctx.font = "bold 12px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = c1.gradEnd;
  ctx.fillText(g.p1.alive ? "P1: ALIVE" : "P1: DEAD", GAME_WIDTH - 195, statusY + 15);

  // P2
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(GAME_WIDTH - 105, statusY, 90, statusH);
  ctx.fillStyle = c2.gradEnd;
  ctx.fillText(g.p2.alive ? "P2: ALIVE" : "P2: DEAD", GAME_WIDTH - 100, statusY + 15);

  ctx.restore();
}

export function drawTouchZoneDivider(ctx, frameCount) {
  const centerX = GAME_WIDTH / 2;
  ctx.save();
  ctx.globalAlpha = 0.15 + Math.sin(frameCount * 0.03) * 0.05;
  ctx.setLineDash([8, 12]);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centerX, 70);
  ctx.lineTo(centerX, GROUND_Y - 10);
  ctx.stroke();
  ctx.setLineDash([]);

  // P1/P2 labels
  ctx.globalAlpha = 0.2 + Math.sin(frameCount * 0.03) * 0.05;
  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("P1", centerX - 30, 85);
  ctx.fillText("P2", centerX + 30, 85);

  ctx.restore();
}
