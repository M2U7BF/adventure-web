import { MAX_WORLD_COL, MAX_WORLD_ROW } from "./constants.js";

// Mirrors TileManager.loadMap: parses a whitespace-separated grid of tile
// indices into a [col][row] lookup table.
export function parseMap(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const mapTileNum = [];
  for (let col = 0; col < MAX_WORLD_COL; col++) {
    mapTileNum.push(new Array(MAX_WORLD_ROW).fill(0));
  }
  for (let row = 0; row < MAX_WORLD_ROW; row++) {
    const numbers = lines[row].trim().split(/\s+/).map(Number);
    for (let col = 0; col < MAX_WORLD_COL; col++) {
      mapTileNum[col][row] = numbers[col];
    }
  }
  return mapTileNum;
}
