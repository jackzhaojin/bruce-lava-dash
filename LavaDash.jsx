import { useState, useEffect, useRef, useCallback } from "react";
import {
  GAME_WIDTH, GAME_HEIGHT, GROUND_Y, CUBE_SIZE,
  JUMP_FORCE, GAME_SPEED_BASE, DEAD_COOLDOWN, REVIVE_FRAMES,
  COLOR_PRESETS, SHIP_FLY_FORCE,
} from "./game/constants.js";
import { loadHighScores, updateHighScores } from "./game/highScores.js";
import { playSound } from "./game/audio.js";
import { generateObstacle, generateBlockTower, generateShipObstacle } from "./game/obstacles.js";
import { createPlayer } from "./game/entities.js";
import { updatePlayer, updateShipPlayer, checkCollision, checkBoosts, killPlayer, revivePlayer } from "./game/physics.js";
import {
  drawVolcano, drawSpike, drawBlock, drawPad, drawOrb,
  drawCube, drawShip, drawGhostCountdown, drawMenuCubes, drawPlayerStatus,
  drawTouchZoneDivider,
} from "./game/renderer.js";
import {
  isTouchDevice, setupKeyboardListeners,
  handleTouchStart, handleTouchEnd, getTouchState,
  handleMouseDown, handleMouseUp, handleMouseLeave,
} from "./game/input.js";

export default function LavaDash() {
  const canvasRef = useRef(null);
  const [playerMode, setPlayerMode] = useState(null);
  const [p1Color, setP1Color] = useState(0);
  const [p2Color, setP2Color] = useState(1);
  const keysHeld = useRef({ shiftLeft: false, shiftRight: false, space: false });
  const mouseHeld = useRef(false);
  const touchesRef = useRef(new Map());
  const gameRef = useRef({
    state: "menu",
    playerMode: 2,
    p1: createPlayer(100, 1),
    p2: createPlayer(170, 2),
    obstacles: [],
    lavaDrops: [],
    bgLava: [],
    particles: [],
    volcanoSmoke: [],
    score: 0,
    highScores: loadHighScores(),
    newRecords: [],
    distance: 0,
    nextObstacle: 400,
    gameSpeed: GAME_SPEED_BASE,
    level: 1,
    beatTimer: 0,
    deadTimer: 0,
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
  const [displayHigh, setDisplayHigh] = useState(() => loadHighScores().allTime);

  const selectMode = useCallback((mode) => {
    setPlayerMode(mode);
    gameRef.current.playerMode = mode;
    gameRef.current.p1Color = COLOR_PRESETS[p1Color];
    gameRef.current.p2Color = COLOR_PRESETS[p2Color];
  }, [p1Color, p2Color]);

  const startGame = useCallback(() => {
    const g = gameRef.current;
    if (g.state === "menu") {
      g.state = "playing";
      g.p1 = createPlayer(g.playerMode === 1 ? 140 : 100, 1);
      g.p2 = createPlayer(170, 2);
      if (g.playerMode === 1) {
        g.p2.alive = false;
        g.p2.ghostTimer = Infinity;
      }
      g.obstacles = [];
      g.particles = [];
      g.score = 0;
      g.distance = 0;
      g.nextObstacle = 400;
      g.gameSpeed = GAME_SPEED_BASE;
      g.level = 1;
      g.frameCount = 0;
      g.spawnTowerFirst = true;
      g.towerAt2000 = false;
      g.currentMode = "cube"; // "cube" or "ship" — alternates every 1000 score
      g.lastModeThousand = 0;
      g.shipCountdown = 0; // countdown frames remaining (0 = inactive)
      g.shipCountdownText = "";
      setDisplayState("playing");
      setDisplayScore(0);
    } else if (g.state === "dead") {
      if (g.deadTimer < DEAD_COOLDOWN) return;
      g.state = "menu";
      setDisplayState("menu");
    }
  }, []);

  // Keyboard listeners
  useEffect(() => {
    return setupKeyboardListeners(keysHeld, gameRef, startGame);
  }, [startGame]);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    gameRef.current.p1Color = COLOR_PRESETS[p1Color];
    gameRef.current.p2Color = COLOR_PRESETS[p2Color];

    const STEP_MS = 8; // ~120fps fixed step (matches user's 120Hz display)
    let lastTime = 0;
    let accumulator = 0;

    // Handle tab visibility — reset timing on return from background
    const handleVisibility = () => {
      if (!document.hidden) {
        lastTime = 0;
        accumulator = 0;
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Cache gradients outside the loop — createLinearGradient is slow on Safari iPad
    const skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    skyGrad.addColorStop(0, "#0a0005");
    skyGrad.addColorStop(0.4, "#1a0008");
    skyGrad.addColorStop(0.7, "#3d0a00");
    skyGrad.addColorStop(1, "#661500");

    const lavaGradCube = ctx.createLinearGradient(0, GROUND_Y, 0, GAME_HEIGHT);
    lavaGradCube.addColorStop(0, "#ff4400");
    lavaGradCube.addColorStop(0.3, "#cc2200");
    lavaGradCube.addColorStop(1, "#660000");

    const lavaGradShip = ctx.createLinearGradient(0, GROUND_Y, 0, GAME_HEIGHT);
    lavaGradShip.addColorStop(0, "#8800ff");
    lavaGradShip.addColorStop(0.3, "#5500cc");
    lavaGradShip.addColorStop(1, "#220066");

    const isMobile = isTouchDevice;

    // DEBUG: FPS counter
    let fpsFrames = 0;
    let fpsTime = 0;
    let fpsDisplay = 0;
    let stepsDisplay = 0;

    function gameLoop(timestamp) {
      if (!lastTime) lastTime = timestamp;
      const delta = Math.min(timestamp - lastTime, 200);
      accumulator += delta;
      lastTime = timestamp;

      // FPS tracking
      fpsFrames++;
      fpsTime += delta;
      if (fpsTime >= 1000) {
        fpsDisplay = fpsFrames;
        fpsFrames = 0;
        fpsTime = 0;
      }

      // At least 1 step per frame (preserves desktop feel),
      // more if frame was slow (catches up on mobile). Cap at 8.
      let steps = 0;
      while (accumulator >= STEP_MS) {
        accumulator -= STEP_MS;
        steps++;
      }
      if (steps > 16) { steps = 16; accumulator = 0; }
      stepsDisplay = steps;

      const g = gameRef.current;
      g.frameCount++;
      const shake = g.screenShake > 0 ? (Math.random() - 0.5) * g.screenShake : 0;
      const shakeY = g.screenShake > 0 ? (Math.random() - 0.5) * g.screenShake : 0;
      if (g.screenShake > 0) g.screenShake *= 0.9;
      if (g.screenShake < 0.5) g.screenShake = 0;

      ctx.save();
      ctx.translate(shake, shakeY);

      // Sky
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

      // Background volcanoes (skip on mobile — each creates 2 gradients)
      if (!isMobile) {
        drawVolcano(ctx, -20, 200, 120);
        drawVolcano(ctx, 250, 160, 90);
        drawVolcano(ctx, 500, 220, 140);
        drawVolcano(ctx, 700, 150, 80);
      }

      // Lava ground (different color in ship mode)
      const inShipMode = g.currentMode === "ship";
      ctx.fillStyle = inShipMode ? lavaGradShip : lavaGradCube;
      ctx.fillRect(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y);

      // Animated lava surface
      const waveStep = isMobile ? 40 : 20;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      for (let x = 0; x <= GAME_WIDTH; x += waveStep) {
        const wave = Math.sin((x + (g.distance || 0) * 2) * 0.03) * 3 + (isMobile ? 0 : Math.sin((x + Date.now() * 0.003) * 0.06) * 2);
        ctx.lineTo(x, GROUND_Y + wave);
      }
      ctx.lineTo(GAME_WIDTH, GROUND_Y - 5);
      ctx.lineTo(0, GROUND_Y - 5);
      ctx.closePath();
      ctx.fillStyle = inShipMode ? "#aa44ff" : "#ff6600";
      ctx.fill();

      // Ground line glow (skip on mobile)
      if (!isMobile) {
        ctx.shadowColor = inShipMode ? "#8800ff" : "#ff4400";
        ctx.shadowBlur = 20;
        ctx.strokeStyle = inShipMode ? "#bb66ff" : "#ff8844";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y);
        for (let x = 0; x <= GAME_WIDTH; x += 10) {
          const wave = Math.sin((x + (g.distance || 0) * 2) * 0.03) * 3;
          ctx.lineTo(x, GROUND_Y + wave);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Grid lines on ground (skip on mobile)
      if (!isMobile) {
        ctx.strokeStyle = inShipMode ? "rgba(150,50,255,0.15)" : "rgba(255,100,0,0.15)";
        ctx.lineWidth = 1;
        const gridOff = g.state === "playing" ? g.groundOffset % 40 : 0;
        for (let x = -gridOff; x <= GAME_WIDTH; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, GROUND_Y);
          ctx.lineTo(x, GAME_HEIGHT);
          ctx.stroke();
        }
      }

      // Fixed-step game logic: 1 step at 60fps+, multiple steps at lower fps
      for (let step = 0; step < steps; step++) {

        if (g.state === "dead") {
          g.deadTimer++;
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
        // Slow down during ship mode
        if (g.currentMode === "ship") g.gameSpeed *= 0.75;

        // Score
        g.score = Math.floor(g.distance / 10);
        setDisplayScore(g.score);

        // Physics
        if (g.p1.shipMode) updateShipPlayer(g.p1, g.obstacles);
        else updatePlayer(g.p1, g.obstacles);
        if (g.playerMode === 2) {
          if (g.p2.shipMode) updateShipPlayer(g.p2, g.obstacles);
          else updatePlayer(g.p2, g.obstacles);
        }

        // Hold-to-jump: keyboard, mouse, and touch
        const is1P = g.playerMode === 1;
        const held = keysHeld.current;
        const mHeld = mouseHeld.current;
        const touch = getTouchState(touchesRef);

        if (is1P) {
          const p1Held = held.shiftLeft || held.shiftRight || held.space || mHeld || touch.p1Held;
          if (g.p1.shipMode && g.p1.alive) {
            // Ship mode: hold to fly up continuously
            if (p1Held) g.p1.vy += SHIP_FLY_FORCE;
          } else if (p1Held && g.p1.grounded && g.p1.alive) {
            g.p1.vy = JUMP_FORCE;
            g.p1.grounded = false;
            playSound("jump");
          }
        } else {
          let jumped = false;
          const p1Held = held.shiftLeft || touch.p1Held;
          const p2Held = held.shiftRight || touch.p2Held;

          // P1 input
          if (g.p1.shipMode && g.p1.alive) {
            if (p1Held || held.space || mHeld) g.p1.vy += SHIP_FLY_FORCE;
          } else if ((p1Held) && g.p1.grounded && g.p1.alive) {
            g.p1.vy = JUMP_FORCE;
            g.p1.grounded = false;
            jumped = true;
          }

          // P2 input
          if (g.p2.shipMode && g.p2.alive) {
            if (p2Held || held.space || mHeld) g.p2.vy += SHIP_FLY_FORCE;
          } else if ((p2Held) && g.p2.grounded && g.p2.alive) {
            g.p2.vy = JUMP_FORCE;
            g.p2.grounded = false;
            jumped = true;
          }

          // Space/mouse still jumps both (backward compatible, cube mode only)
          if ((held.space || mHeld) && !g.p1.shipMode) {
            if (g.p1.grounded && g.p1.alive) {
              g.p1.vy = JUMP_FORCE;
              g.p1.grounded = false;
              jumped = true;
            }
            if (g.p2.grounded && g.p2.alive) {
              g.p2.vy = JUMP_FORCE;
              g.p2.grounded = false;
              jumped = true;
            }
          }
          if (jumped) playSound("jump");
        }

        // Alternate ship/cube every 1000 score: even thousands (2k,4k,6k) = ship, odd (3k,5k,7k) = cube
        const currentThousand = Math.floor(g.score / 1000);
        if (currentThousand >= 2 && currentThousand > g.lastModeThousand) {
          g.lastModeThousand = currentThousand;
          const isShip = currentThousand % 2 === 0; // even thousands = ship
          if (isShip) {
            // Start countdown before switching to ship mode
            g.shipCountdown = 180; // 3 seconds at 60fps
            g.shipCountdownTarget = true;
            g.nextObstacle = 800; // big gap so no obstacles during countdown
          } else {
            g.currentMode = "cube";
            g.towerAt2000 = false;
            g.p1.shipMode = false;
            if (g.playerMode === 2) g.p2.shipMode = false;
          }
        }

        // Ship countdown timer
        if (g.shipCountdown > 0) {
          g.shipCountdown--;
          const secs = Math.ceil(g.shipCountdown / 60);
          if (g.shipCountdown === 0) {
            g.shipCountdownText = "BLAST OFF!";
            g.shipCountdownShow = 40; // show "BLAST OFF!" for 40 frames
            // Actually switch to ship mode
            g.currentMode = "ship";
            g.towerAt2000 = true;
            g.p1.shipMode = true;
            if (g.playerMode === 2) g.p2.shipMode = true;
            g.nextObstacle = 400;
          } else {
            g.shipCountdownText = `${secs}`;
          }
        }
        // Show "BLAST OFF!" text briefly after countdown ends
        if (g.shipCountdownShow > 0) {
          g.shipCountdownShow--;
          if (g.shipCountdownShow === 0) g.shipCountdownText = "";
        }

        // Generate obstacles
        g.nextObstacle -= g.gameSpeed;
        if (g.nextObstacle <= 0) {
          let newObs;
          if (g.spawnTowerFirst) {
            newObs = generateBlockTower(GAME_WIDTH + 50);
            g.spawnTowerFirst = false;
            g.obstacles.push(...newObs);
            g.nextObstacle = 700;
          } else if (g.towerAt2000) {
            // Ship mode: continuous ground/ceiling spikes + towers
            newObs = generateShipObstacle(GAME_WIDTH + 50);
            g.obstacles.push(...newObs);
            g.nextObstacle = 280;
          } else {
            newObs = generateObstacle(GAME_WIDTH + 50, g.level);
            g.obstacles.push(...newObs);
            g.nextObstacle = 350 + Math.random() * 250 - g.level * 5;
            if (g.nextObstacle < 230) g.nextObstacle = 230;
          }
        }

        // Move obstacles
        g.obstacles.forEach((o) => {
          o.x -= g.gameSpeed;
        });
        g.obstacles = g.obstacles.filter((o) => o.x > -60);

        // Boost collision (pads/orbs) - before kill checks
        if (g.p1.alive) checkBoosts(g.p1, g.obstacles, g);
        if (g.playerMode === 2 && g.p2.alive) checkBoosts(g.p2, g.obstacles, g);

        // Tick down invincibility timers
        if (g.p1.invincible > 0) g.p1.invincible--;
        if (g.playerMode === 2 && g.p2.invincible > 0) g.p2.invincible--;

        // Collision for P1
        if (g.p1.alive && g.p1.invincible <= 0 && checkCollision(g.p1, g.obstacles)) {
          killPlayer(g, g.p1);
          if (g.playerMode === 1 || !g.p2.alive) {
            g.state = "dead";
            g.deadTimer = 0;
            const result = updateHighScores(g.score);
            g.highScores = result.scores;
            g.newRecords = result.newRecords;
            setDisplayHigh(g.highScores.allTime);
            setDisplayState("dead");
          }
        }

        // Collision for P2 (only in 2P mode)
        if (g.playerMode === 2 && g.p2.alive && g.p2.invincible <= 0 && checkCollision(g.p2, g.obstacles)) {
          killPlayer(g, g.p2);
          if (!g.p1.alive) {
            g.state = "dead";
            g.deadTimer = 0;
            const result = updateHighScores(g.score);
            g.highScores = result.scores;
            g.newRecords = result.newRecords;
            setDisplayHigh(g.highScores.allTime);
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
      } // end fixed-step loop

      // Draw obstacles
      g.obstacles.forEach((o) => {
        if (o.type === "spike") drawSpike(ctx, o.x, o.y, o.w, o.h, o.direction);
        else if (o.type === "block") drawBlock(ctx, o.x, o.y, o.w, o.h);
        else if (o.type === "pad") drawPad(ctx, o, g.frameCount);
        else if (o.type === "orb") drawOrb(ctx, o, g.frameCount);
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

      // Draw cubes - pass colorObj explicitly
      const c1 = g.p1Color || COLOR_PRESETS[0];
      const c2 = g.p2Color || COLOR_PRESETS[1];

      if (g.state === "playing") {
        const drawP = (player, ghost, fc, col) =>
          player.shipMode ? drawShip(ctx, player, ghost, fc, col) : drawCube(ctx, player, ghost, fc, col);

        if (g.p1.alive) {
          // Blink when invincible
          if (g.p1.invincible <= 0 || g.frameCount % 6 < 3) {
            drawP(g.p1, false, g.frameCount, c1);
          }
        } else if (g.playerMode === 2) {
          drawP(g.p1, true, g.frameCount, c1);
          drawGhostCountdown(ctx, g.p1, g.frameCount, c1);
        }
        if (g.playerMode === 2) {
          if (g.p2.alive) {
            if (g.p2.invincible <= 0 || g.frameCount % 6 < 3) {
              drawP(g.p2, false, g.frameCount, c2);
            }
          } else {
            drawP(g.p2, true, g.frameCount, c2);
            drawGhostCountdown(ctx, g.p2, g.frameCount, c2);
          }
        }

        // Touch zone divider (2P + touch devices only)
        if (g.playerMode === 2 && isTouchDevice) {
          drawTouchZoneDivider(ctx, g.frameCount);
        }
      } else if (g.state === "menu") {
        drawCube(ctx, g.p1, false, g.frameCount, c1);
        if (g.playerMode === 2) {
          drawCube(ctx, g.p2, false, g.frameCount, c2);
        }
      }

      // Ambient lava particles (skip on mobile — arc() per particle is expensive)
      if (!isMobile) {
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
          ctx.fillStyle = inShipMode ? "#aa44ff" : "#ff6600";
          ctx.shadowColor = inShipMode ? "#8800ff" : "#ff4400";
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        });
        ctx.globalAlpha = 1;
      }

      // UI Overlay
      if (g.state === "menu") {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.save();
        ctx.shadowColor = "#ff4400";
        ctx.shadowBlur = isMobile ? 0 : 30;
        ctx.font = "bold 52px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff6600";
        ctx.fillText("\u{1F30B} LAVA DASH", GAME_WIDTH / 2, 120);
        ctx.shadowBlur = 0;

        ctx.font = "bold 16px 'Courier New', monospace";
        ctx.fillStyle = "#ff9966";
        if (g.playerMode === 1) {
          ctx.fillText("1-PLAYER MODE", GAME_WIDTH / 2, 148);
        } else {
          ctx.fillText("2-PLAYER CO-OP", GAME_WIDTH / 2, 148);
          if (isTouchDevice) {
            ctx.font = "13px 'Courier New', monospace";
            ctx.fillStyle = "#cc8855";
            ctx.fillText("Tap left half = P1 | Tap right half = P2", GAME_WIDTH / 2, 165);
          }
        }

        // Draw menu cubes
        if (g.playerMode === 2) {
          drawMenuCubes(ctx, g.frameCount, c1, c2);
        } else {
          const p1x = GAME_WIDTH / 2 - CUBE_SIZE / 2;
          const p1y = 175 + Math.sin(g.frameCount * 0.04) * 5;
          ctx.save();
          ctx.translate(p1x + CUBE_SIZE / 2, p1y + CUBE_SIZE / 2);
          ctx.rotate(Math.sin(g.frameCount * 0.02) * 0.15);
          ctx.shadowColor = c1.glow;
          ctx.shadowBlur = isMobile ? 0 : 15;
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
        }

        ctx.font = "bold 16px 'Courier New', monospace";
        ctx.textAlign = "center";
        const pulse = 0.6 + Math.sin(Date.now() * 0.004) * 0.4;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = "#ffaa44";
        if (g.playerMode === 1) {
          ctx.fillText(
            isTouchDevice ? "TAP TO START" : "PRESS SPACE OR CLICK TO START",
            GAME_WIDTH / 2, 245
          );
        } else {
          ctx.fillText(
            isTouchDevice ? "TAP TO START" : "LEFT SHIFT (P1) / RIGHT SHIFT (P2) TO START",
            GAME_WIDTH / 2, 245
          );
        }
        ctx.globalAlpha = 1;

        ctx.font = "14px 'Courier New', monospace";
        ctx.fillStyle = "#cc8844";
        if (g.playerMode === 1) {
          ctx.fillText("Jump over obstacles and survive!", GAME_WIDTH / 2, 280);
        } else {
          ctx.fillText("Jump over obstacles together! Revive your partner!", GAME_WIDTH / 2, 280);
        }

        if (g.highScores.allTime > 0) {
          ctx.font = "bold 16px 'Courier New', monospace";
          ctx.fillStyle = "#ffcc00";
          ctx.fillText(`ALL-TIME BEST: ${g.highScores.allTime}`, GAME_WIDTH / 2, 320);
        }
        ctx.restore();
      }

      if (g.state === "dead") {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.save();
        ctx.shadowColor = "#ff0000";
        ctx.shadowBlur = isMobile ? 0 : 20;
        ctx.font = "bold 48px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff3300";
        ctx.fillText("GAME OVER", GAME_WIDTH / 2, 130);
        ctx.shadowBlur = 0;

        drawMenuCubes(ctx, g.frameCount, c1, c2);

        ctx.font = "bold 28px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffaa00";
        ctx.fillText(`SCORE: ${g.score}`, GAME_WIDTH / 2, 260);

        // High score categories
        const hs = g.highScores;
        const nr = g.newRecords || [];
        const categories = [
          { label: "ALL-TIME", value: hs.allTime, key: "allTime" },
          { label: "YEARLY",   value: hs.yearly.score, key: "yearly" },
          { label: "MONTHLY",  value: hs.monthly.score, key: "monthly" },
          { label: "WEEKLY",   value: hs.weekly.score, key: "weekly" },
          { label: "DAILY",    value: hs.daily.score, key: "daily" },
        ];

        const colX = [GAME_WIDTH / 2 - 130, GAME_WIDTH / 2 + 40];
        let row = 0;
        let col = 0;
        const startY = 290;
        const rowH = 22;

        ctx.font = "bold 13px 'Courier New', monospace";
        ctx.textAlign = "left";
        for (const cat of categories) {
          const x = colX[col];
          const y = startY + row * rowH;
          const isNew = nr.includes(cat.key);

          ctx.fillStyle = isNew ? "#ffdd44" : "#cc8855";
          ctx.fillText(`${cat.label}: ${cat.value}`, x, y);

          if (isNew) {
            ctx.fillStyle = "#44ff66";
            ctx.shadowColor = "#44ff66";
            ctx.shadowBlur = isMobile ? 0 : 8;
            ctx.fillText("NEW!", x + 145, y);
            ctx.shadowBlur = 0;
          }

          col++;
          if (col > 1) { col = 0; row++; }
        }

        ctx.textAlign = "center";
        ctx.font = "bold 16px 'Courier New', monospace";
        if (g.deadTimer < DEAD_COOLDOWN) {
          const secondsLeft = Math.ceil((DEAD_COOLDOWN - g.deadTimer) / 60);
          ctx.fillStyle = "#ff6644";
          ctx.fillText(`WAIT ${secondsLeft}...`, GAME_WIDTH / 2, startY + (row + 1) * rowH + 20);
        } else {
          ctx.fillStyle = "#ff8844";
          const pulse2 = 0.5 + Math.sin(Date.now() * 0.004) * 0.5;
          ctx.globalAlpha = pulse2;
          ctx.fillText(
            isTouchDevice ? "TAP TO CONTINUE" : "TAP / SPACE TO CONTINUE",
            GAME_WIDTH / 2, startY + (row + 1) * rowH + 20
          );
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      }

      // Score display during play
      if (g.state === "playing") {
        ctx.save();
        ctx.font = "bold 20px 'Courier New', monospace";
        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(10, 10, 160, 52);
        ctx.fillStyle = "#ffcc00";
        ctx.shadowColor = "#ff8800";
        ctx.shadowBlur = isMobile ? 0 : 6;
        ctx.fillText(`SCORE: ${g.score}`, 20, 35);
        ctx.shadowBlur = 0;

        ctx.font = "bold 12px 'Courier New', monospace";
        ctx.fillStyle = "#cc8844";
        ctx.fillText(`BEST: ${g.highScores.allTime}`, 20, 52);

        ctx.font = "bold 14px 'Courier New', monospace";
        ctx.fillStyle = "#ff6644";
        ctx.fillText(`LVL ${g.level}`, 120, 52);
        ctx.restore();

        if (g.playerMode === 2) {
          drawPlayerStatus(ctx, g);
        }

        // Ship countdown overlay
        if (g.shipCountdownText) {
          ctx.save();
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const isBlastOff = g.shipCountdownText === "BLAST OFF!";
          const size = isBlastOff ? 48 : 72;
          ctx.font = `bold ${size}px 'Courier New', monospace`;
          ctx.fillStyle = isBlastOff ? "#ff4400" : "#ffdd00";
          ctx.shadowColor = isBlastOff ? "#ff6600" : "#ff8800";
          ctx.shadowBlur = 20;
          ctx.fillText(g.shipCountdownText, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30);
          ctx.shadowBlur = 0;
          ctx.font = "bold 16px 'Courier New', monospace";
          ctx.fillStyle = "#ffffff";
          if (!isBlastOff) {
            ctx.fillText("SHIP MODE INCOMING!", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);
          }
          ctx.restore();
        }
      }

      // DEBUG: FPS + steps overlay
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "right";
      ctx.fillStyle = "#00ff00";
      ctx.fillText(`FPS: ${fpsDisplay} | Steps: ${stepsDisplay} | Delta: ${Math.round(delta)}ms`, GAME_WIDTH - 10, GAME_HEIGHT - 10);

      ctx.restore();
      animRef.current = requestAnimationFrame(gameLoop);
    }

    animRef.current = requestAnimationFrame(gameLoop);
    return () => {
      cancelAnimationFrame(animRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
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
        {/* Color Picker */}
        <div style={{ marginBottom: 20, textAlign: "center" }}>
          <div style={{ color: "#cc8844", fontSize: 13, marginBottom: 8, letterSpacing: 1 }}>
            P1 COLOR
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {COLOR_PRESETS.map((c, i) => (
              <div
                key={`p1-${i}`}
                onClick={() => {
                  if (i !== p2Color) setP1Color(i);
                }}
                title={c.name}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: `linear-gradient(135deg, ${c.gradStart}, ${c.gradEnd})`,
                  border: p1Color === i ? "3px solid #fff" : "2px solid rgba(255,255,255,0.2)",
                  cursor: i === p2Color ? "not-allowed" : "pointer",
                  opacity: i === p2Color ? 0.3 : 1,
                  boxShadow: p1Color === i ? `0 0 12px ${c.glow}` : "none",
                  transition: "transform 0.1s, box-shadow 0.1s",
                }}
              />
            ))}
          </div>
          <div style={{ color: "#cc8844", fontSize: 13, marginTop: 12, marginBottom: 8, letterSpacing: 1 }}>
            P2 COLOR
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {COLOR_PRESETS.map((c, i) => (
              <div
                key={`p2-${i}`}
                onClick={() => {
                  if (i !== p1Color) setP2Color(i);
                }}
                title={c.name}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: `linear-gradient(135deg, ${c.gradStart}, ${c.gradEnd})`,
                  border: p2Color === i ? "3px solid #fff" : "2px solid rgba(255,255,255,0.2)",
                  cursor: i === p1Color ? "not-allowed" : "pointer",
                  opacity: i === p1Color ? 0.3 : 1,
                  boxShadow: p2Color === i ? `0 0 12px ${c.glow}` : "none",
                  transition: "transform 0.1s, box-shadow 0.1s",
                }}
              />
            ))}
          </div>
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
        onMouseDown={() => handleMouseDown(mouseHeld, gameRef, startGame)}
        onMouseUp={() => handleMouseUp(mouseHeld)}
        onMouseLeave={() => handleMouseLeave(mouseHeld)}
        onTouchStart={(e) => handleTouchStart(e, canvasRef, touchesRef, gameRef, startGame, playerMode)}
        onTouchEnd={(e) => handleTouchEnd(e, touchesRef)}
        style={{
          border: "2px solid #ff440055",
          borderRadius: 8,
          cursor: "pointer",
          maxWidth: "100%",
          touchAction: "none",
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
        {isTouchDevice
          ? (playerMode === 1 ? "TAP TO JUMP" : "TAP LEFT = P1 | TAP RIGHT = P2")
          : (playerMode === 1
            ? "SPACE / SHIFT / CLICK = JUMP"
            : "LEFT SHIFT = P1 JUMP | RIGHT SHIFT = P2 JUMP")}
      </div>
    </div>
  );
}
