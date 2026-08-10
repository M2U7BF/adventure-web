// ---------------------------------------------------------------------
// Screen / world constants (ported from GamePanel.java)
// ---------------------------------------------------------------------
export const ORIGINAL_TILE_SIZE = 16;
export const SCALE = 3;
export const TILE_SIZE = ORIGINAL_TILE_SIZE * SCALE; // 48
export const MAX_SCREEN_COL = 16;
export const MAX_SCREEN_ROW = 12;
export const SCREEN_WIDTH = TILE_SIZE * MAX_SCREEN_COL; // 768
export const SCREEN_HEIGHT = TILE_SIZE * MAX_SCREEN_ROW; // 576
export const MAX_WORLD_COL = 50;
export const MAX_WORLD_ROW = 50;
export const FPS = 60;
export const STEP_MS = 1000 / FPS;

// ---------------------------------------------------------------------
// Tile definitions: index -> {src, collision}
// ---------------------------------------------------------------------
export const TILE_DEFS = [
  { src: "assets/tiles/grass.png", collision: false }, // 0
  { src: "assets/tiles/wall.png", collision: true }, // 1
  { src: "assets/tiles/water.png", collision: true }, // 2
  { src: "assets/tiles/earth.png", collision: false }, // 3
  { src: "assets/tiles/tree.png", collision: true }, // 4
  { src: "assets/tiles/sand.png", collision: false }, // 5
];

export const OBJECT_DEFS = {
  Key: { src: "assets/objects/key.png", collision: false },
  Door: { src: "assets/objects/door.png", collision: true },
  Chest: { src: "assets/objects/chest.png", collision: false },
  Boots: { src: "assets/objects/boots.png", collision: false },
};

// World objects placed in the field (AssetSetter.java)
export const OBJECT_PLACEMENTS = [
  { type: "Key", col: 23, row: 7 },
  { type: "Key", col: 23, row: 40 },
  { type: "Key", col: 22, row: 40 },
  { type: "Door", col: 22, row: 7 },
  { type: "Door", col: 27, row: 22 },
  { type: "Door", col: 27, row: 24 },
  { type: "Chest", col: 28, row: 25 },
  { type: "Boots", col: 21, row: 40 },
];

export const DEFAULT_PLAYER_TILE = [23, 21];

export const MAP_SRC = "assets/maps/worldmap.txt";

export const PLAYER_SPRITE_SRC = {
  up: "assets/player/WalkingPlayer_back.png",
  down: "assets/player/WalkingPlayer_front.png",
  left: "assets/player/WalkingPlayer_left.png",
  right: "assets/player/WalkingPlayer_right.png",
};

export const SFX_SRC = {
  bgm: { src: "assets/sounds/theme4.mp3", loop: true },
  coin: { src: "assets/sounds/coin2.mp3" },
  powerup: { src: "assets/sounds/powerup2.mp3" },
  unlock: { src: "assets/sounds/unlock2.mp3" },
  fanfare: { src: "assets/sounds/fanfare3.mp3" },
};

export const KEY_MAP = {
  ArrowUp: "up", KeyW: "up",
  ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
};
