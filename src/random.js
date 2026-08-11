// Shared RNG helper (previously duplicated across main.js/gameplay.js/mapgen.js).
export function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}
