// ---------------------------------------------------------------------
// Asset loading
// ---------------------------------------------------------------------
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image failed: " + src));
    img.src = src;
  });
}

export function loadText(src) {
  return fetch(src).then((r) => {
    if (!r.ok) throw new Error("text failed: " + src);
    return r.text();
  });
}

export class SfxPlayer {
  constructor(src, { loop = false } = {}) {
    this.audio = new Audio(src);
    this.audio.loop = loop;
    this.audio.preload = "auto";
  }
  play() {
    this.audio.currentTime = 0;
    this.audio.play().catch(() => {});
  }
  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
  }
}
