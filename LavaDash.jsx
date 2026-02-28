import { useState, useEffect, useRef, useCallback } from "react";

const GAME_WIDTH = 800;
const GAME_HEIGHT = 450;
const GROUND_Y = 370;
const CUBE_SIZE = 36;
const GRAVITY = 0.55; // reduced from 0.65 (20% easier - more airtime)
const JUMP_FORCE = -12;
const GAME_SPEED_BASE = 4; // reduced from 5 (20% easier)
const PARTICLE_COUNT = 20;
const REVIVE_FRAMES = 60; // 1 second at 60fps

// 8-bit chiptune sound generator
const AudioCtx = typeof window !== "undefined" ? (window.AudioContext || window.webkitAudioContext) : null;

function playSound(type) {
  if (!AudioCtx) return;
  try {
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "jump") {
      osc.type = "square";
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === "death") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === "score") {
      osc.type = "square";
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.08);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === "bgBeat") {
      osc.type = "square";
      osc.frequency.setValueAtTime(130, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === "revive") {
      osc.type = "square";
      osc.frequency.setValueAtTime(330, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.07);
      osc.frequency.setValueAtTime(550, ctx.currentTime + 0.14);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.21);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {}
}

// Obstacle patterns for medium difficulty
function generateObstacle(x, level) {
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
  ];
  const maxIdx = Math.min(patterns.length, 2 + Math.floor(level / 3));
  return patterns[Math.floor(Math.random() * maxIdx)];
}

function createParticles(x, y, colors) {
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

function createPlayer(x, id) {
  return {
    id,
    x,
    y: GROUND_Y - CUBE_SIZE,
    vy: 0,
    rotation: 0,
    grounded: true,
    alive: true,
    ghostTimer: 0, // counts up when dead, revives at REVIVE_FRAMES
  };
}

export default function LavaDash() {
  const canvasRef = useRef(null);
  const [playerMode, setPlayerMode] = useState(null); // null = choosing, 1 or 2
  const gameRef = useRef({
    state: "menu", // menu, playing, dead
    playerMode: 2,
    p1: createPlayer(100, 1),
    p2: createPlayer(170, 2),
    obstacles: [],
    lavaDrops: [],
    bgLava: [],
    particles: [],
    volcanoSmoke: [],
    score: 0,
    highScore: 0,
    distance: 0,
    nextObstacle: 400,
    gameSpeed: GAME_SPEED_BASE,
    level: 1,
    beatTimer: 0,
    screenShake: 0,
    groundOffset: 0,
    frameCount: 0,
    starField: Array.from({ length: 30 }, () => ({
      x: Math.random() * GAME_WIDTH,
      y: Math.random() * 200,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.3 + 0.1,
    })),
  });
  const animRef = useRef(null);
  const [displayState, setDisplayState] = useState("menu");
  const [displayScore, setDisplayScore] = useState(0);
  const [displayHigh, setDisplayHigh] = useState(0);

  const selectMode = useCallback((mode) => {
    setPlayerMode(mode);
    gameRef.current.playerMode = mode;
  }, []);

  const startGame = useCallback(() => {
    const g = gameRef.current;
    if (g.state === "menu") {
      g.state = "playing";
      g.p1 = createPlayer(g.playerMode === 1 ? 140 : 100, 1);
      g.p2 = createPlayer(170, 2);
      if (g.playerMode === 1) {
        g.p2.alive = false;
        g.p2.ghostTimer = Infinity; // never revive in 1P
      }
      g.obstacles = [];
      g.particles = [];
      g.score = 0;
      g.distance = 0;
      g.nextObstacle = 400;
      g.gameSpeed = GAME_SPEED_BASE;
      g.level = 1;
      g.frameCount = 0;
      setDisplayState("playing");
      setDisplayScore(0);
    } else if (g.state === "dead") {
      g.state = "menu";
      setDisplayState("menu");
    }
  }, []);

  const jumpPlayer = useCallback((playerNum) => {
    const g = gameRef.current;
    if (g.state === "menu" || g.state === "dead") {
      startGame();
      return;
    }
    if (g.state === "playing") {
      const player = playerNum === 1 ? g.p1 : g.p2;
      if (player.alive && player.grounded) {
        player.vy = JUMP_FORCE;
        player.grounded = false;
        playSound("jump");
      }
    }
  }, [startGame]);

  const jumpBoth = useCallback(() => {
    const g = gameRef.current;
    if (g.state === "menu" || g.state === "dead") {
      startGame();
      return;
    }
    if (g.state === "playing") {
      let jumped = false;
      if (g.p1.alive && g.p1.grounded) {
        g.p1.vy = JUMP_FORCE;
        g.p1.grounded = false;
        jumped = true;
      }
      if (g.p2.alive && g.p2.grounded) {
        g.p2.vy = JUMP_FORCE;
        g.p2.grounded = false;
        jumped = true;
      }
      if (jumped) playSound("jump");
    }
  }, [startGame]);

  useEffect(() => {
    const handleKey = (e) => {
      const g = gameRef.current;
      const is1P = g.playerMode === 1;

      if (e.code === "ShiftLeft") {
        e.preventDefault();
        if (is1P) {
          if (g.state === "menu" || g.state === "dead") startGame();
          else jumpPlayer(1);
        } else {
          jumpPlayer(1);
        }
      } else if (e.code === "ShiftRight") {
        e.preventDefault();
        if (is1P) {
          if (g.state === "menu" || g.state === "dead") startGame();
          else jumpPlayer(1);
        } else {
          jumpPlayer(2);
        }
      } else if (e.code === "Space") {
        e.preventDefault();
        if (g.state === "menu" || g.state === "dead") {
          startGame();
        } else if (is1P) {
          jumpPlayer(1);
        } else {
          jumpBoth();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [jumpPlayer, jumpBoth, startGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function drawVolcano(ctx, x, w, h) {
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

      // Lava glow at top
      ctx.beginPath();
      ctx.arc(x + w * 0.5, baseY - h + 8, 12, 0, Math.PI * 2);
      const glowGrad = ctx.createRadialGradient(x + w * 0.5, baseY - h + 8, 0, x + w * 0.5, baseY - h + 8, 20);
      glowGrad.addColorStop(0, "rgba(255,100,0,0.8)");
      glowGrad.addColorStop(1, "rgba(255,50,0,0)");
      ctx.fillStyle = glowGrad;
      ctx.fill();
    }

    function drawSpike(ctx, x, y, w, h) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w / 2, y - h);
      ctx.lineTo(x + w, y);
      ctx.closePath();
      const grad = ctx.createLinearGradient(x, y, x + w / 2, y - h);
      grad.addColorStop(0, "#cc2200");
      grad.addColorStop(1, "#ff6600");
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = "#ff8800";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Glow
      ctx.shadowColor = "#ff4400";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    function drawBlock(ctx, x, y, w, h) {
      ctx.fillStyle = "#661100";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#ff4400";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Inner pattern
      ctx.strokeStyle = "rgba(255,100,0,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);

      // Glow
      ctx.shadowColor = "#ff2200";
      ctx.shadowBlur = 6;
      ctx.strokeStyle = "#ff4400";
      ctx.strokeRect(x, y, w, h);
      ctx.shadowBlur = 0;
    }

    function drawCube(ctx, player, isGhost, frameCount) {
      const isP1 = player.id === 1;
      // Color config
      const gradStart = isP1 ? "#ffaa00" : "#00ccff";
      const gradEnd = isP1 ? "#ff6600" : "#0066ff";
      const glowColor = isP1 ? "#ff8800" : "#0088ff";
      const borderColor = isP1 ? "#ffcc44" : "#66ddff";

      let drawX = player.x;
      let drawY = player.y;

      if (isGhost) {
        // Ghost bob effect
        const bob = Math.sin(frameCount * 0.08) * 4;
        drawY = player.y + bob;
      }

      ctx.save();

      if (isGhost) {
        ctx.globalAlpha = 0.3;
      }

      const cx = drawX + CUBE_SIZE / 2;
      const cy = drawY + CUBE_SIZE / 2;
      ctx.translate(cx, cy);
      ctx.rotate(player.rotation);

      // Cube glow
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15;

      // Main cube
      const cubeGrad = ctx.createLinearGradient(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE / 2, CUBE_SIZE / 2);
      cubeGrad.addColorStop(0, gradStart);
      cubeGrad.addColorStop(1, gradEnd);
      ctx.fillStyle = cubeGrad;
      ctx.fillRect(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE, CUBE_SIZE);

      // Border
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE, CUBE_SIZE);

      // Eye
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff";
      ctx.fillRect(4, -10, 12, 12);
      ctx.fillStyle = "#111";
      ctx.fillRect(9, -7, 6, 6);
      ctx.fillStyle = "#fff";
      ctx.fillRect(11, -6, 2, 2);

      ctx.restore();
    }

    function drawGhostCountdown(ctx, player, frameCount) {
      if (!player.alive && player.ghostTimer < REVIVE_FRAMES) {
        const remaining = Math.ceil((REVIVE_FRAMES - player.ghostTimer) / 60);
        const bob = Math.sin(frameCount * 0.08) * 4;
        const drawY = player.y + bob;

        ctx.save();
        ctx.font = "bold 22px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = player.id === 1 ? "#ffaa00" : "#00ccff";
        ctx.shadowColor = player.id === 1 ? "#ff6600" : "#0066ff";
        ctx.shadowBlur = 10;
        ctx.fillText(remaining.toString(), player.x + CUBE_SIZE / 2, drawY - 12);
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

    function checkCollision(player, obstacles) {
      const cubeL = player.x + 6;
      const cubeR = player.x + CUBE_SIZE - 6;
      const cubeT = player.y + 6;
      const cubeB = player.y + CUBE_SIZE - 4;

      for (const o of obstacles) {
        if (o.type === "spike") {
          const spikeTop = o.y - o.h;
          const triL = o.x + 4;
          const triR = o.x + o.w - 4;
          if (cubeR > triL && cubeL < triR && cubeB > spikeTop + 10 && cubeT < o.y) {
            return true;
          }
        } else if (o.type === "block") {
          if (cubeR > o.x + 3 && cubeL < o.x + o.w - 3 && cubeB > o.y + 3 && cubeT < o.y + o.h - 3) {
            return true;
          }
        }
      }
      return false;
    }

    function updatePlayer(player) {
      if (!player.alive) return;
      player.vy += GRAVITY;
      player.y += player.vy;
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

    function killPlayer(g, player) {
      player.alive = false;
      player.ghostTimer = 0;
      g.screenShake = 12;
      const colors = player.id === 1
        ? ["#ff4500", "#ff6b35", "#ffa500", "#ffcc00", "#ff0000"]
        : ["#0088ff", "#00bbff", "#00ccff", "#66ddff", "#0044cc"];
      g.particles.push(...createParticles(player.x + CUBE_SIZE / 2, player.y + CUBE_SIZE / 2, colors));
      playSound("death");
    }

    function revivePlayer(g, deadPlayer, alivePlayer) {
      deadPlayer.alive = true;
      deadPlayer.ghostTimer = 0;
      deadPlayer.vy = 0;
      deadPlayer.grounded = true;
      deadPlayer.rotation = 0;
      // Respawn next to alive player
      if (alivePlayer && alivePlayer.alive) {
        deadPlayer.x = alivePlayer.x + (deadPlayer.id === 1 ? -70 : 70);
        // Clamp to screen
        if (deadPlayer.x < 30) deadPlayer.x = 30;
        if (deadPlayer.x > GAME_WIDTH - 100) deadPlayer.x = GAME_WIDTH - 100;
      }
      deadPlayer.y = GROUND_Y - CUBE_SIZE;
      playSound("revive");
    }

    function drawMenuCubes(ctx, frameCount) {
      // Draw P1 orange cube
      const p1x = GAME_WIDTH / 2 - 55;
      const p1y = 175 + Math.sin(frameCount * 0.04) * 5;
      ctx.save();
      ctx.translate(p1x + CUBE_SIZE / 2, p1y + CUBE_SIZE / 2);
      ctx.rotate(Math.sin(frameCount * 0.02) * 0.15);
      ctx.shadowColor = "#ff8800";
      ctx.shadowBlur = 15;
      const g1 = ctx.createLinearGradient(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE / 2, CUBE_SIZE / 2);
      g1.addColorStop(0, "#ffaa00");
      g1.addColorStop(1, "#ff6600");
      ctx.fillStyle = g1;
      ctx.fillRect(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE, CUBE_SIZE);
      ctx.strokeStyle = "#ffcc44";
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
      ctx.fillStyle = "#ffaa00";
      ctx.fillText("P1", p1x + CUBE_SIZE / 2, p1y + CUBE_SIZE + 16);
      ctx.restore();

      // Draw P2 blue cube
      const p2x = GAME_WIDTH / 2 + 20;
      const p2y = 175 + Math.sin(frameCount * 0.04 + 1) * 5;
      ctx.save();
      ctx.translate(p2x + CUBE_SIZE / 2, p2y + CUBE_SIZE / 2);
      ctx.rotate(Math.sin(frameCount * 0.02 + 1) * 0.15);
      ctx.shadowColor = "#0088ff";
      ctx.shadowBlur = 15;
      const g2 = ctx.createLinearGradient(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE / 2, CUBE_SIZE / 2);
      g2.addColorStop(0, "#00ccff");
      g2.addColorStop(1, "#0066ff");
      ctx.fillStyle = g2;
      ctx.fillRect(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE, CUBE_SIZE);
      ctx.strokeStyle = "#66ddff";
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
      ctx.fillStyle = "#00ccff";
      ctx.fillText("P2", p2x + CUBE_SIZE / 2, p2y + CUBE_SIZE + 16);
      ctx.restore();
    }

    function drawPlayerStatus(ctx, g) {
      // P1 status
      ctx.save();
      const statusY = 10;
      const statusH = 22;

      // P1
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(GAME_WIDTH - 200, statusY, 90, statusH);
      ctx.font = "bold 12px 'Courier New', monospace";
      ctx.textAlign = "left";
      ctx.fillStyle = g.p1.alive ? "#ffaa00" : "#884400";
      ctx.fillText(g.p1.alive ? "P1: ALIVE" : "P1: DEAD", GAME_WIDTH - 195, statusY + 15);

      // P2
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(GAME_WIDTH - 105, statusY, 90, statusH);
      ctx.fillStyle = g.p2.alive ? "#00ccff" : "#004488";
      ctx.fillText(g.p2.alive ? "P2: ALIVE" : "P2: DEAD", GAME_WIDTH - 100, statusY + 15);

      ctx.restore();
    }

    function gameLoop() {
      const g = gameRef.current;
      g.frameCount++;
      const shake = g.screenShake > 0 ? (Math.random() - 0.5) * g.screenShake : 0;
      const shakeY = g.screenShake > 0 ? (Math.random() - 0.5) * g.screenShake : 0;
      if (g.screenShake > 0) g.screenShake *= 0.9;
      if (g.screenShake < 0.5) g.screenShake = 0;

      ctx.save();
      ctx.translate(shake, shakeY);

      // Sky gradient - dark volcanic sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
      skyGrad.addColorStop(0, "#0a0005");
      skyGrad.addColorStop(0.4, "#1a0008");
      skyGrad.addColorStop(0.7, "#3d0a00");
      skyGrad.addColorStop(1, "#661500");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Stars
      g.starField.forEach((s) => {
        ctx.fillStyle = `rgba(255,200,150,${0.3 + Math.sin(Date.now() * 0.002 + s.x) * 0.2})`;
        ctx.fillRect(s.x, s.y, s.size, s.size);
        if (g.state === "playing") {
          s.x -= s.speed * g.gameSpeed * 0.3;
          if (s.x < 0) s.x = GAME_WIDTH;
        }
      });

      // Background volcanoes
      drawVolcano(ctx, -20, 200, 120);
      drawVolcano(ctx, 250, 160, 90);
      drawVolcano(ctx, 500, 220, 140);
      drawVolcano(ctx, 700, 150, 80);

      // Lava ground
      const lavaGrad = ctx.createLinearGradient(0, GROUND_Y, 0, GAME_HEIGHT);
      lavaGrad.addColorStop(0, "#ff4400");
      lavaGrad.addColorStop(0.3, "#cc2200");
      lavaGrad.addColorStop(1, "#660000");
      ctx.fillStyle = lavaGrad;
      ctx.fillRect(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y);

      // Animated lava surface
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      for (let x = 0; x <= GAME_WIDTH; x += 20) {
        const wave = Math.sin((x + (g.distance || 0) * 2) * 0.03) * 3 + Math.sin((x + Date.now() * 0.003) * 0.06) * 2;
        ctx.lineTo(x, GROUND_Y + wave);
      }
      ctx.lineTo(GAME_WIDTH, GROUND_Y - 5);
      ctx.lineTo(0, GROUND_Y - 5);
      ctx.closePath();
      ctx.fillStyle = "#ff6600";
      ctx.fill();

      // Ground line glow
      ctx.shadowColor = "#ff4400";
      ctx.shadowBlur = 20;
      ctx.strokeStyle = "#ff8844";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      for (let x = 0; x <= GAME_WIDTH; x += 10) {
        const wave = Math.sin((x + (g.distance || 0) * 2) * 0.03) * 3;
        ctx.lineTo(x, GROUND_Y + wave);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Grid lines on ground
      ctx.strokeStyle = "rgba(255,100,0,0.15)";
      ctx.lineWidth = 1;
      const gridOff = g.state === "playing" ? g.groundOffset % 40 : 0;
      for (let x = -gridOff; x <= GAME_WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y);
        ctx.lineTo(x, GAME_HEIGHT);
        ctx.stroke();
      }

      if (g.state === "playing") {
        // Update game
        g.distance += g.gameSpeed;
        g.groundOffset += g.gameSpeed;
        g.beatTimer++;
        if (g.beatTimer % 18 === 0) playSound("bgBeat");

        // Level up speed
        g.level = 1 + Math.floor(g.distance / 2000);
        g.gameSpeed = GAME_SPEED_BASE + g.level * 0.3;

        // Score
        g.score = Math.floor(g.distance / 10);
        setDisplayScore(g.score);

        // Physics
        updatePlayer(g.p1);
        if (g.playerMode === 2) updatePlayer(g.p2);

        // Generate obstacles
        g.nextObstacle -= g.gameSpeed;
        if (g.nextObstacle <= 0) {
          const newObs = generateObstacle(GAME_WIDTH + 50, g.level);
          g.obstacles.push(...newObs);
          g.nextObstacle = 270 + Math.random() * 190 - g.level * 6; // wider spacing (20% easier)
          if (g.nextObstacle < 170) g.nextObstacle = 170;
        }

        // Move obstacles
        g.obstacles.forEach((o) => {
          o.x -= g.gameSpeed;
        });
        g.obstacles = g.obstacles.filter((o) => o.x > -60);

        // Collision for P1
        if (g.p1.alive && checkCollision(g.p1, g.obstacles)) {
          killPlayer(g, g.p1);
          // 1P mode: instant game over. 2P mode: game over if both dead
          if (g.playerMode === 1 || !g.p2.alive) {
            g.state = "dead";
            if (g.score > g.highScore) g.highScore = g.score;
            setDisplayHigh(g.highScore);
            setDisplayState("dead");
          }
        }

        // Collision for P2 (only in 2P mode)
        if (g.playerMode === 2 && g.p2.alive && checkCollision(g.p2, g.obstacles)) {
          killPlayer(g, g.p2);
          if (!g.p1.alive) {
            g.state = "dead";
            if (g.score > g.highScore) g.highScore = g.score;
            setDisplayHigh(g.highScore);
            setDisplayState("dead");
          }
        }

        // Ghost/revive timers (2P only)
        if (g.playerMode === 2) {
          if (!g.p1.alive && g.state === "playing") {
            g.p1.ghostTimer++;
            if (g.p1.ghostTimer >= REVIVE_FRAMES) {
              revivePlayer(g, g.p1, g.p2);
            }
          }
          if (!g.p2.alive && g.state === "playing") {
            g.p2.ghostTimer++;
            if (g.p2.ghostTimer >= REVIVE_FRAMES) {
              revivePlayer(g, g.p2, g.p1);
            }
          }
        }
      }

      // Draw obstacles
      g.obstacles.forEach((o) => {
        if (o.type === "spike") drawSpike(ctx, o.x, o.y, o.w, o.h);
        else if (o.type === "block") drawBlock(ctx, o.x, o.y, o.w, o.h);
      });

      // Draw particles
      g.particles = g.particles.filter((p) => p.life > 0);
      g.particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life -= 0.025;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
      ctx.globalAlpha = 1;

      // Draw cubes
      if (g.state === "playing") {
        // Draw alive players solid, dead as ghosts
        if (g.p1.alive) {
          drawCube(ctx, g.p1, false, g.frameCount);
        } else if (g.playerMode === 2) {
          drawCube(ctx, g.p1, true, g.frameCount);
          drawGhostCountdown(ctx, g.p1, g.frameCount);
        }
        if (g.playerMode === 2) {
          if (g.p2.alive) {
            drawCube(ctx, g.p2, false, g.frameCount);
          } else {
            drawCube(ctx, g.p2, true, g.frameCount);
            drawGhostCountdown(ctx, g.p2, g.frameCount);
          }
        }
      } else if (g.state === "menu") {
        drawCube(ctx, g.p1, false, g.frameCount);
        if (g.playerMode === 2) {
          drawCube(ctx, g.p2, false, g.frameCount);
        }
      }

      // Ambient lava particles
      if (Math.random() < 0.1) {
        g.lavaDrops.push({
          x: Math.random() * GAME_WIDTH,
          y: GROUND_Y,
          vy: -(Math.random() * 3 + 1),
          life: 1,
          size: Math.random() * 3 + 1,
        });
      }
      g.lavaDrops = g.lavaDrops.filter((d) => d.life > 0);
      g.lavaDrops.forEach((d) => {
        d.y += d.vy;
        d.vy += 0.05;
        d.life -= 0.02;
        ctx.globalAlpha = d.life;
        ctx.fillStyle = "#ff6600";
        ctx.shadowColor = "#ff4400";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      ctx.globalAlpha = 1;

      // UI Overlay
      if (g.state === "menu") {
        // Title
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.save();
        ctx.shadowColor = "#ff4400";
        ctx.shadowBlur = 30;
        ctx.font = "bold 52px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff6600";
        ctx.fillText("\u{1F30B} LAVA DASH", GAME_WIDTH / 2, 120);
        ctx.shadowBlur = 0;

        // Subtitle adapts to mode
        ctx.font = "bold 16px 'Courier New', monospace";
        ctx.fillStyle = "#ff9966";
        ctx.fillText(g.playerMode === 1 ? "1-PLAYER MODE" : "2-PLAYER CO-OP", GAME_WIDTH / 2, 148);

        // Draw menu cubes
        if (g.playerMode === 2) {
          drawMenuCubes(ctx, g.frameCount);
        } else {
          // Draw single P1 cube centered
          const p1x = GAME_WIDTH / 2 - CUBE_SIZE / 2;
          const p1y = 175 + Math.sin(g.frameCount * 0.04) * 5;
          ctx.save();
          ctx.translate(p1x + CUBE_SIZE / 2, p1y + CUBE_SIZE / 2);
          ctx.rotate(Math.sin(g.frameCount * 0.02) * 0.15);
          ctx.shadowColor = "#ff8800";
          ctx.shadowBlur = 15;
          const g1 = ctx.createLinearGradient(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE / 2, CUBE_SIZE / 2);
          g1.addColorStop(0, "#ffaa00");
          g1.addColorStop(1, "#ff6600");
          ctx.fillStyle = g1;
          ctx.fillRect(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE, CUBE_SIZE);
          ctx.strokeStyle = "#ffcc44";
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

        ctx.font = "bold 16px 'Courier New', monospace";
        ctx.textAlign = "center";
        const pulse = 0.6 + Math.sin(Date.now() * 0.004) * 0.4;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = "#ffaa44";
        if (g.playerMode === 1) {
          ctx.fillText("PRESS SPACE OR CLICK TO START", GAME_WIDTH / 2, 245);
        } else {
          ctx.fillText("LEFT SHIFT (P1) / RIGHT SHIFT (P2) TO START", GAME_WIDTH / 2, 245);
        }
        ctx.globalAlpha = 1;

        ctx.font = "14px 'Courier New', monospace";
        ctx.fillStyle = "#cc8844";
        if (g.playerMode === 1) {
          ctx.fillText("Jump over obstacles and survive!", GAME_WIDTH / 2, 280);
        } else {
          ctx.fillText("Jump over obstacles together! Revive your partner!", GAME_WIDTH / 2, 280);
        }

        if (g.highScore > 0) {
          ctx.font = "bold 16px 'Courier New', monospace";
          ctx.fillStyle = "#ffcc00";
          ctx.fillText(`HIGH SCORE: ${g.highScore}`, GAME_WIDTH / 2, 320);
        }
        ctx.restore();
      }

      if (g.state === "dead") {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.save();
        ctx.shadowColor = "#ff0000";
        ctx.shadowBlur = 20;
        ctx.font = "bold 48px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff3300";
        ctx.fillText("GAME OVER", GAME_WIDTH / 2, 130);
        ctx.shadowBlur = 0;

        // Draw both cubes on game over screen
        drawMenuCubes(ctx, g.frameCount);

        ctx.font = "bold 28px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffaa00";
        ctx.fillText(`SCORE: ${g.score}`, GAME_WIDTH / 2, 265);

        ctx.font = "bold 18px 'Courier New', monospace";
        ctx.fillStyle = "#ffcc44";
        ctx.fillText(`HIGH SCORE: ${g.highScore}`, GAME_WIDTH / 2, 300);

        ctx.font = "bold 16px 'Courier New', monospace";
        ctx.fillStyle = "#ff8844";
        const pulse = 0.5 + Math.sin(Date.now() * 0.004) * 0.5;
        ctx.globalAlpha = pulse;
        ctx.fillText("TAP / SPACE TO CONTINUE", GAME_WIDTH / 2, 350);
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Score display during play
      if (g.state === "playing") {
        ctx.save();
        ctx.font = "bold 20px 'Courier New', monospace";
        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(10, 10, 160, 36);
        ctx.fillStyle = "#ffcc00";
        ctx.shadowColor = "#ff8800";
        ctx.shadowBlur = 6;
        ctx.fillText(`SCORE: ${g.score}`, 20, 35);
        ctx.shadowBlur = 0;

        // Level indicator
        ctx.font = "bold 14px 'Courier New', monospace";
        ctx.fillStyle = "#ff6644";
        ctx.fillText(`LVL ${g.level}`, 20, 62);
        ctx.restore();

        // Player status indicators (2P only)
        if (g.playerMode === 2) {
          drawPlayerStatus(ctx, g);
        }
      }

      ctx.restore();
      animRef.current = requestAnimationFrame(gameLoop);
    }

    animRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animRef.current);
  }, [playerMode]);

  // Mode selection screen
  if (playerMode === null) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#0a0005",
          fontFamily: "'Courier New', monospace",
          userSelect: "none",
        }}
      >
        <div
          style={{
            color: "#ff6600",
            fontSize: 48,
            fontWeight: "bold",
            marginBottom: 8,
            textShadow: "0 0 30px rgba(255,68,0,0.6)",
          }}
        >
          {"\u{1F30B}"} LAVA DASH
        </div>
        <div
          style={{
            color: "#ff9966",
            fontSize: 14,
            marginBottom: 40,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          Built by Father & Son
        </div>
        <div
          style={{
            color: "#ffcc88",
            fontSize: 20,
            fontWeight: "bold",
            marginBottom: 24,
            letterSpacing: 2,
          }}
        >
          SELECT MODE
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          <button
            onClick={() => selectMode(1)}
            style={{
              background: "linear-gradient(180deg, #ff8800, #cc4400)",
              border: "2px solid #ffaa44",
              borderRadius: 12,
              color: "#fff",
              fontFamily: "'Courier New', monospace",
              fontSize: 18,
              fontWeight: "bold",
              padding: "20px 36px",
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(255,136,0,0.4)",
              transition: "transform 0.1s, box-shadow 0.1s",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.05)";
              e.target.style.boxShadow = "0 0 30px rgba(255,136,0,0.7)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = "0 0 20px rgba(255,136,0,0.4)";
            }}
          >
            {"\u{1F3AE}"} 1 PLAYER
          </button>
          <button
            onClick={() => selectMode(2)}
            style={{
              background: "linear-gradient(180deg, #0088ff, #0044cc)",
              border: "2px solid #66bbff",
              borderRadius: 12,
              color: "#fff",
              fontFamily: "'Courier New', monospace",
              fontSize: 18,
              fontWeight: "bold",
              padding: "20px 36px",
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(0,136,255,0.4)",
              transition: "transform 0.1s, box-shadow 0.1s",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.05)";
              e.target.style.boxShadow = "0 0 30px rgba(0,136,255,0.7)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = "0 0 20px rgba(0,136,255,0.4)";
            }}
          >
            {"\u{1F91D}"} 2 PLAYERS
          </button>
        </div>
        <div
          style={{
            color: "#664422",
            fontSize: 12,
            marginTop: 32,
            letterSpacing: 1,
          }}
        >
          2-Player mode: team up & revive each other!
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#0a0005",
        fontFamily: "'Courier New', monospace",
        userSelect: "none",
      }}
    >
      <div
        style={{
          color: "#ff6600",
          fontSize: 13,
          marginBottom: 8,
          letterSpacing: 2,
          textTransform: "uppercase",
          opacity: 0.7,
        }}
      >
        {"\u{1F30B}"} Lava Dash — Built by Father & Son {"\u{1F3AE}"}
      </div>
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        onClick={() => gameRef.current.playerMode === 1 ? jumpPlayer(1) : jumpBoth()}
        onTouchStart={(e) => {
          e.preventDefault();
          gameRef.current.playerMode === 1 ? jumpPlayer(1) : jumpBoth();
        }}
        style={{
          border: "2px solid #ff440055",
          borderRadius: 8,
          cursor: "pointer",
          maxWidth: "100%",
          boxShadow: "0 0 40px rgba(255,68,0,0.3), inset 0 0 60px rgba(255,68,0,0.05)",
        }}
      />
      <div
        style={{
          color: "#884422",
          fontSize: 12,
          marginTop: 8,
          letterSpacing: 1,
        }}
      >
        {playerMode === 1
          ? "SPACE / SHIFT / CLICK = JUMP"
          : "LEFT SHIFT = P1 JUMP | RIGHT SHIFT = P2 JUMP"}
      </div>
    </div>
  );
}
