import { GAME_WIDTH } from "./constants.js";

export const isTouchDevice = typeof window !== "undefined" &&
  ("ontouchstart" in window || navigator.maxTouchPoints > 0);

export function setupKeyboardListeners(keysHeld, gameRef, startGame) {
  const handleKeyDown = (e) => {
    const g = gameRef.current;
    if (e.code === "ShiftLeft") {
      e.preventDefault();
      if (!keysHeld.current.shiftLeft) {
        keysHeld.current.shiftLeft = true;
        if (g.state === "menu" || g.state === "dead") startGame();
      }
    } else if (e.code === "ShiftRight") {
      e.preventDefault();
      if (!keysHeld.current.shiftRight) {
        keysHeld.current.shiftRight = true;
        if (g.state === "menu" || g.state === "dead") startGame();
      }
    } else if (e.code === "Space") {
      e.preventDefault();
      if (!keysHeld.current.space) {
        keysHeld.current.space = true;
        if (g.state === "menu" || g.state === "dead") startGame();
      }
    }
  };
  const handleKeyUp = (e) => {
    if (e.code === "ShiftLeft") keysHeld.current.shiftLeft = false;
    else if (e.code === "ShiftRight") keysHeld.current.shiftRight = false;
    else if (e.code === "Space") keysHeld.current.space = false;
  };
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
  };
}

export function handleTouchStart(e, canvasRef, touchesRef, gameRef, startGame, playerMode) {
  e.preventDefault();
  const g = gameRef.current;
  const canvas = canvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();

  for (const touch of e.changedTouches) {
    const canvasX = (touch.clientX - rect.left) / rect.width * GAME_WIDTH;
    let side;
    if (playerMode === 1) {
      side = "p1";
    } else {
      side = canvasX < GAME_WIDTH / 2 ? "p1" : "p2";
    }
    touchesRef.current.set(touch.identifier, { side });
  }

  if (g.state === "menu" || g.state === "dead") {
    startGame();
  }
}

export function handleTouchEnd(e, touchesRef) {
  e.preventDefault();
  for (const touch of e.changedTouches) {
    touchesRef.current.delete(touch.identifier);
  }
}

export function getTouchState(touchesRef) {
  let p1Held = false;
  let p2Held = false;
  for (const [, val] of touchesRef.current) {
    if (val.side === "p1") p1Held = true;
    if (val.side === "p2") p2Held = true;
  }
  return { p1Held, p2Held };
}

export function handleMouseDown(mouseHeld, gameRef, startGame) {
  mouseHeld.current = true;
  const g = gameRef.current;
  if (g.state === "menu" || g.state === "dead") startGame();
}

export function handleMouseUp(mouseHeld) {
  mouseHeld.current = false;
}

export function handleMouseLeave(mouseHeld) {
  mouseHeld.current = false;
}
