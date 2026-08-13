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
// Tile definitions: index -> {src, collision, destructibleTo}
// `destructibleTo` is the tile index a destructible obstacle turns into
// once the player chops it down (see gameplay.js#chopTile).
// ---------------------------------------------------------------------
export const GRASS_TILE = 0;
export const WALL_TILE = 1;
export const WATER_TILE = 2;
export const EARTH_TILE = 3;
export const TREE_TILE = 4;
export const SAND_TILE = 5;
export const FLOWER_TILE = 6;
export const PATH_TILE = 7;
export const BUSH_TILE = 8;
export const ROCK_TILE = 9;

export const TILE_DEFS = [
  { src: "assets/tiles/grass.png", collision: false }, // 0
  { src: "assets/tiles/wall.png", collision: true }, // 1
  { src: "assets/tiles/water.png", collision: true }, // 2
  { src: "assets/tiles/earth.png", collision: false }, // 3
  { src: "assets/tiles/tree.png", collision: true, destructibleTo: GRASS_TILE }, // 4
  { src: "assets/tiles/sand.png", collision: false }, // 5
  { src: "assets/tiles/flower.png", collision: false }, // 6
  { src: "assets/tiles/path.png", collision: false }, // 7
  { src: "assets/tiles/bush.png", collision: true, destructibleTo: GRASS_TILE }, // 8
  { src: "assets/tiles/rock.png", collision: true }, // 9
];

// Axe/Shield have no sprite asset (see render.js#drawIconObject, which draws
// them procedurally), so they're the only entries without a `src`.
export const OBJECT_DEFS = {
  Key: { src: "assets/objects/key.png", collision: false },
  Door: { src: "assets/objects/door.png", collision: true },
  Chest: { src: "assets/objects/chest.png", collision: false },
  Boots: { src: "assets/objects/boots.png", collision: false },
  Axe: { collision: false },
  Shield: { collision: false },
};

// Object types re-rolled to a random position every game (see
// mapgen.js#randomizeObjectPlacements) so keys/doors/the chest never sit in
// the same spot twice.
export const RANDOM_OBJECT_TYPES = ["Key", "Key", "Key", "Door", "Door", "Door", "Chest"];

// Object placements that stay fixed regardless of the random roll above.
export const FIXED_OBJECT_PLACEMENTS = [
  { type: "Boots", col: 21, row: 40 },
  { type: "Axe", col: 15, row: 30 },
  { type: "Shield", col: 35, row: 15 },
];

// Ticks (at FPS) a Shield pickup's temporary invincibility lasts. Much
// longer than PLAYER_INVINCIBLE_TICKS (the post-hit grace period) so it
// reads as a deliberate power-up rather than incidental i-frames.
export const SHIELD_INVINCIBLE_TICKS = 300;

export const DEFAULT_PLAYER_TILE = [23, 21];

// localStorage key the best clear time (in seconds, see main.js#recordFinishTime)
// is persisted under.
export const BEST_TIME_STORAGE_KEY = "adventure_best_time";

// ---------------------------------------------------------------------
// Enemies / HP
// ---------------------------------------------------------------------
export const PLAYER_MAX_HP = 5;
export const ENEMY_COUNT = 6;
export const ENEMY_SPEED = 2;
export const ENEMY_CONTACT_DAMAGE = 1;
export const ENEMY_KNOCKBACK = TILE_SIZE * 2;
// Ticks (at FPS) the player is immune to further damage after being hit.
export const PLAYER_INVINCIBLE_TICKS = 60;

// Dash attack: triggered by the same action key as the axe (see
// gameplay.js#update), it's the current means of defeating enemies. Any
// enemy the player touches while dashing is defeated instead of dealing
// contact damage (see gameplay.js#handleEnemyContact).
export const DASH_SPEED = 20;
export const DASH_DURATION_TICKS = 8;

// Two frames per direction: [idle/step-1, step-2]. render.js alternates
// between them while the player is moving to animate the walk cycle.
export const PLAYER_SPRITE_SRC = {
  up: ["assets/player/WalkingPlayer_back.png", "assets/player/WalkingPlayer_back_2.png"],
  down: ["assets/player/WalkingPlayer_front.png", "assets/player/WalkingPlayer_front_2.png"],
  left: ["assets/player/WalkingPlayer_left.png", "assets/player/WalkingPlayer_left_2.png"],
  right: ["assets/player/WalkingPlayer_right.png", "assets/player/WalkingPlayer_right_2.png"],
};

// Number of update ticks a walk-cycle frame is held before switching.
export const ANIMATION_FRAME_TICKS = 8;

export const SFX_SRC = {
  bgm: { src: "assets/sounds/theme4.mp3", loop: true },
  coin: { src: "assets/sounds/coin2.mp3" },
  powerup: { src: "assets/sounds/powerup2.mp3" },
  unlock: { src: "assets/sounds/unlock2.mp3" },
  fanfare: { src: "assets/sounds/fanfare3.mp3" },
  chop: { src: "assets/sounds/coin2.mp3" },
};

// Canonical direction list and their (col, row) step vectors, shared by
// gameplay.js (player/enemy movement) and collision.js (lookahead checks).
export const DIRECTIONS = ["up", "down", "left", "right"];
export const DIRECTION_OFFSETS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

export const KEY_MAP = {
  ArrowUp: "up", KeyW: "up",
  ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
};

// Pressed to swing the axe: chops down a destructible obstacle (tree/bush)
// the player is facing (see gameplay.js#chopTile) and triggers a short dash
// attack that defeats any enemy touched along the way (see
// gameplay.js#updateDash).
export const ACTION_KEYS = new Set(["Space", "Enter"]);
