// One-off generator for the procedural sound effects shipped in
// assets/sounds/ that don't come from an external sample. Run with
// `node tools/gen_sfx.mjs` from the repo root whenever they need to be
// regenerated, so the audio is reproducible instead of a binary blob nobody
// can touch again (mirrors tools/gen_assets.py for the pixel art).
import { writeFileSync } from "node:fs";

const SAMPLE_RATE = 44100;

function writeWav(path, samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  writeFileSync(path, buffer);
  console.log("wrote", path, `${(samples.length / SAMPLE_RATE).toFixed(2)}s`);
}

// A short descending "wah wah wah waaah" jingle for the game-over screen:
// four square-wave notes stepping down in pitch, each with a quick
// attack/decay envelope so they read as distinct plucks rather than one
// continuous drone.
function genGameOver() {
  const notes = [392.0, 349.23, 311.13, 196.0]; // G4, F4, Eb4, G3
  const noteDuration = 0.22;
  const lastNoteDuration = 0.5;
  const samples = [];

  notes.forEach((freq, i) => {
    const duration = i === notes.length - 1 ? lastNoteDuration : noteDuration;
    const count = Math.floor(SAMPLE_RATE * duration);
    for (let n = 0; n < count; n++) {
      const t = n / SAMPLE_RATE;
      const phase = t * freq;
      const square = Math.sign(Math.sin(2 * Math.PI * phase));
      const attack = Math.min(1, n / (SAMPLE_RATE * 0.01));
      const decay = Math.pow(1 - n / count, 1.5);
      samples.push(square * attack * decay * 0.35);
    }
  });

  writeWav("assets/sounds/gameover.wav", samples);
}

genGameOver();
