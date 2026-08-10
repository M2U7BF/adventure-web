import { STEP_MS } from "./constants.js";

const MAX_STEPS_PER_FRAME = 5;

// Fixed-timestep game loop: calls `onUpdate` at a steady FPS regardless of
// the browser's actual frame rate, then `onDraw` once per rendered frame.
export class GameLoop {
  constructor(onUpdate, onDraw) {
    this.onUpdate = onUpdate;
    this.onDraw = onDraw;
    this.animFrame = null;
    this.lastTime = 0;
    this.accumulator = 0;
    this.tick = this.tick.bind(this);
  }

  tick(now) {
    this.animFrame = requestAnimationFrame(this.tick);
    this.accumulator += now - this.lastTime;
    this.lastTime = now;

    let steps = 0;
    while (this.accumulator >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
      this.onUpdate();
      this.accumulator -= STEP_MS;
      steps++;
    }
    this.onDraw();
  }

  start() {
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.animFrame = requestAnimationFrame(this.tick);
  }

  stop() {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this.animFrame = null;
  }
}
