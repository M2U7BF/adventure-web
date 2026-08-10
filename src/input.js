import { KEY_MAP } from "./constants.js";

// Wires keyboard and on-screen touchpad input to `keysHeld`, the set of
// directions currently pressed (mirrors KeyHandler.java, extended for touch).
export function setupInput(state, touchpad) {
  window.addEventListener("keydown", (e) => {
    const dir = KEY_MAP[e.code];
    if (dir) {
      state.keysHeld.add(dir);
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => {
    const dir = KEY_MAP[e.code];
    if (dir) {
      state.keysHeld.delete(dir);
      e.preventDefault();
    }
  });

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
