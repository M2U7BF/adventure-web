import { KEY_MAP, ACTION_KEYS } from "./constants.js";

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

  touchpad.querySelectorAll("button[data-dir]").forEach((btn) => {
    const dir = btn.dataset.dir;
    const press = (e) => {
      e.preventDefault();
      state.keysHeld.add(dir);
    };
    const release = (e) => {
      e.preventDefault();
      state.keysHeld.delete(dir);
    };
    btn.addEventListener("touchstart", press, { passive: false });
    btn.addEventListener("touchend", release, { passive: false });
    btn.addEventListener("touchcancel", release, { passive: false });
    btn.addEventListener("mousedown", press);
    btn.addEventListener("mouseup", release);
    btn.addEventListener("mouseleave", release);
  });
}
