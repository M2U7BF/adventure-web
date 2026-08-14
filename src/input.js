import { KEY_MAP, ACTION_KEYS } from "./constants.js";

// Fraction of the knob's max travel distance that must be crossed before a
// direction is registered, so small jitter near the center doesn't cause
// the player to twitch in a random direction.
const JOYSTICK_DEADZONE_RATIO = 0.25;

// Wires up the fixed-position joystick (see index.html#joystick /
// style.css): unlike a "floating" joystick that spawns at the touch point,
// this one stays put and only its knob is dragged, clamped to a circle
// around the base's center. Since movement is 4-directional (see
// gameplay.js#movePlayer), the drag vector is snapped to the nearest of
// up/down/left/right rather than driving analog movement.
function setupJoystick(state, joystick) {
  if (!joystick) return;
  const knob = joystick.querySelector("#joystickKnob");

  let activePointerId = null;
  let center = { x: 0, y: 0 };
  let maxDist = 1;
  let currentDir = null;

  const setDirection = (dir) => {
    if (dir === currentDir) return;
    if (currentDir) state.keysHeld.delete(currentDir);
    if (dir) state.keysHeld.add(dir);
    currentDir = dir;
  };

  const reset = () => {
    knob.style.transform = "translate(0px, 0px)";
    setDirection(null);
    activePointerId = null;
  };

  joystick.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    joystick.setPointerCapture(e.pointerId);
    activePointerId = e.pointerId;
    const rect = joystick.getBoundingClientRect();
    center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    maxDist = rect.width / 2 - knob.offsetWidth / 2;
  });

  joystick.addEventListener("pointermove", (e) => {
    if (e.pointerId !== activePointerId) return;
    e.preventDefault();

    let dx = e.clientX - center.x;
    let dy = e.clientY - center.y;
    const dist = Math.hypot(dx, dy);
    if (dist > maxDist) {
      const scale = maxDist / dist;
      dx *= scale;
      dy *= scale;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;

    if (dist < maxDist * JOYSTICK_DEADZONE_RATIO) {
      setDirection(null);
    } else if (Math.abs(dx) > Math.abs(dy)) {
      setDirection(dx > 0 ? "right" : "left");
    } else {
      setDirection(dy > 0 ? "down" : "up");
    }
  });

  const endHandler = (e) => {
    if (e.pointerId !== activePointerId) return;
    reset();
  };
  joystick.addEventListener("pointerup", endHandler);
  joystick.addEventListener("pointercancel", endHandler);
}

// Wires keyboard and on-screen touchpad input to `keysHeld`, the set of
// directions currently pressed (mirrors KeyHandler.java, extended for touch).
// Also queues a one-shot "action" (chop) on the action key's down-edge, so
// holding it doesn't repeat-fire once per key-repeat tick.
export function setupInput(state, touchpad, actionButton) {
  window.addEventListener("keydown", (e) => {
    const dir = KEY_MAP[e.code];
    if (dir) {
      state.keysHeld.add(dir);
      e.preventDefault();
    } else if (ACTION_KEYS.has(e.code) && !state.actionKeyDown) {
      state.actionKeyDown = true;
      state.actionQueued = true;
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => {
    const dir = KEY_MAP[e.code];
    if (dir) {
      state.keysHeld.delete(dir);
      e.preventDefault();
    } else if (ACTION_KEYS.has(e.code)) {
      state.actionKeyDown = false;
    }
  });

  if (actionButton) {
    const trigger = (e) => {
      e.preventDefault();
      state.actionQueued = true;
    };
    actionButton.addEventListener("touchstart", trigger, { passive: false });
    actionButton.addEventListener("mousedown", trigger);
  }

  setupJoystick(state, touchpad.querySelector("#joystick"));
}
