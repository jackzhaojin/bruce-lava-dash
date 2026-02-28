import { useState, useEffect, useRef, useCallback } from "react";

const GAME_WIDTH = 800;
const GAME_HEIGHT = 450;
const GROUND_Y = 370;
const CUBE_SIZE = 36;
const GRAVITY = 0.65;
const JUMP_FORCE = -12;
const GAME_SPEED_BASE = 5;
const PARTICLE_COUNT = 20;

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

function createParticles(x, y) {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x,
    y,
    vx: (Math.random() - 0.5) * 10,
    vy: (Math.random() - 1) * 8,
    life: 1,
    size: Math.random() * 6 + 2,
    color: ["#ff4500", "#ff6b35", "#ffa500", "#ffcc00", "#ff0000"][Math.floor(Math.random() * 5)],
  }));
}

export default function LavaDash() {
  const canvasRef = useRef(null);
  const gameRef = useRef({
    state: "menu", // menu, playing, dead
    cube: { x: 120, y: GROUND_Y - CUBE_SIZE, vy: 0, rotation: 0, grounded: true },
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

  const jump = useCallback(() => {
    const g = gameRef.current;
    if (g.state === "menu") {
      g.state = "playing";
      g.cube = { x: 120, y: GROUND_Y - CUBE_SIZE, vy: 0, rotation: 0, grounded: true };
      g.obstacles = [];
      g.particles = [];
      g.score = 0;
      g.distance = 0;
      g.nextObstacle = 400;
      g.gameSpeed = GAME_SPEED_BASE;
      g.level = 1;
      setDisplayState("playing");
      setDisplayScore(0);
    } else if (g.state === "playing" && g.cube.grounded) {
      g.cube.vy = JUMP_FORCE;
      g.cube.grounded = false;
      playSound("jump");
    } else if (g.state === "dead") {
      g.state = "menu";
      setDisplayState("menu");
    }
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [jump]);

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

    function drawCube(ctx, cube) {
      ctx.save();
      const cx = cube.x + CUBE_SIZE / 2;
      const cy = cube.y + CUBE_SIZE / 2;
      ctx.translate(cx, cy);
      ctx.rotate(cube.rotation);

      // Cube glow
      ctx.shadowColor = "#ff8800";
      ctx.shadowBlur = 15;

      // Main cube
      const cubeGrad = ctx.createLinearGradient(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE / 2, CUBE_SIZE / 2);
      cubeGrad.addColorStop(0, "#ffaa00");
      cubeGrad.addColorStop(1, "#ff6600");
      ctx.fillStyle = cubeGrad;
      ctx.fillRect(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE, CUBE_SIZE);

      // Border
      ctx.strokeStyle = "#ffcc44";
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

    function gameLoop() {
      const g = gameRef.current;
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
        g.cube.vy += GRAVITY;
        g.cube.y += g.cube.vy;
        if (g.cube.y >= GROUND_Y - CUBE_SIZE) {
          g.cube.y = GROUND_Y - CUBE_SIZE;
          g.cube.vy = 0;
          g.cube.grounded = true;
        }

        // Rotation
        if (!g.cube.grounded) {
          g.cube.rotation += 0.08;
        } else {
          g.cube.rotation = Math.round(g.cube.rotation / (Math.PI / 2)) * (Math.PI / 2);
        }

        // Generate obstacles
        g.nextObstacle -= g.gameSpeed;
        if (g.nextObstacle <= 0) {
          const newObs = generateObstacle(GAME_WIDTH + 50, g.level);
          g.obstacles.push(...newObs);
          g.nextObstacle = 220 + Math.random() * 160 - g.level * 8;
          if (g.nextObstacle < 140) g.nextObstacle = 140;
        }

        // Move & draw obstacles
        g.obstacles.forEach((o) => {
          o.x -= g.gameSpeed;
        });
        g.obstacles = g.obstacles.filter((o) => o.x > -60);

        // Collision
        const cubeL = g.cube.x + 6;
        const cubeR = g.cube.x + CUBE_SIZE - 6;
        const cubeT = g.cube.y + 6;
        const cubeB = g.cube.y + CUBE_SIZE - 4;

        for (const o of g.obstacles) {
          if (o.type === "spike") {
            // Triangle collision (simplified)
            const spikeCx = o.x + o.w / 2;
            const spikeTop = o.y - o.h;
            const triL = o.x + 4;
            const triR = o.x + o.w - 4;
            if (cubeR > triL && cubeL < triR && cubeB > spikeTop + 10 && cubeT < o.y) {
              g.state = "dead";
              g.screenShake = 12;
              g.particles = createParticles(g.cube.x + CUBE_SIZE / 2, g.cube.y + CUBE_SIZE / 2);
              if (g.score > g.highScore) g.highScore = g.score;
              setDisplayHigh(g.highScore);
              setDisplayState("dead");
              playSound("death");
            }
          } else if (o.type === "block") {
            if (cubeR > o.x + 3 && cubeL < o.x + o.w - 3 && cubeB > o.y + 3 && cubeT < o.y + o.h - 3) {
              g.state = "dead";
              g.screenShake = 12;
              g.particles = createParticles(g.cube.x + CUBE_SIZE / 2, g.cube.y + CUBE_SIZE / 2);
              if (g.score > g.highScore) g.highScore = g.score;
              setDisplayHigh(g.highScore);
              setDisplayState("dead");
              playSound("death");
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

      // Draw cube (only if playing or menu)
      if (g.state !== "dead") {
        drawCube(ctx, g.cube);
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
        ctx.fillText("🌋 LAVA DASH", GAME_WIDTH / 2, 140);
        ctx.shadowBlur = 0;

        ctx.font = "bold 18px 'Courier New', monospace";
        ctx.fillStyle = "#ffaa44";
        const pulse = 0.6 + Math.sin(Date.now() * 0.004) * 0.4;
        ctx.globalAlpha = pulse;
        ctx.fillText("TAP / SPACE / ↑ TO START", GAME_WIDTH / 2, 240);
        ctx.globalAlpha = 1;

        ctx.font = "14px 'Courier New', monospace";
        ctx.fillStyle = "#cc8844";
        ctx.fillText("Jump over obstacles! Don't touch the lava spikes!", GAME_WIDTH / 2, 290);

        if (g.highScore > 0) {
          ctx.font = "bold 16px 'Courier New', monospace";
          ctx.fillStyle = "#ffcc00";
          ctx.fillText(`HIGH SCORE: ${g.highScore}`, GAME_WIDTH / 2, 330);
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
        ctx.fillText("GAME OVER", GAME_WIDTH / 2, 150);
        ctx.shadowBlur = 0;

        ctx.font = "bold 28px 'Courier New', monospace";
        ctx.fillStyle = "#ffaa00";
        ctx.fillText(`SCORE: ${g.score}`, GAME_WIDTH / 2, 210);

        ctx.font = "bold 18px 'Courier New', monospace";
        ctx.fillStyle = "#ffcc44";
        ctx.fillText(`HIGH SCORE: ${g.highScore}`, GAME_WIDTH / 2, 250);

        ctx.font = "bold 16px 'Courier New', monospace";
        ctx.fillStyle = "#ff8844";
        const pulse = 0.5 + Math.sin(Date.now() * 0.004) * 0.5;
        ctx.globalAlpha = pulse;
        ctx.fillText("TAP / SPACE TO CONTINUE", GAME_WIDTH / 2, 310);
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
      }

      ctx.restore();
      animRef.current = requestAnimationFrame(gameLoop);
    }

    animRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

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
        🌋 Lava Dash — Built by Father & Son 🎮
      </div>
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        onClick={jump}
        onTouchStart={(e) => {
          e.preventDefault();
          jump();
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
        SPACE / ↑ / TAP to jump
      </div>
    </div>
  );
}
