import { TILE_SIZE, SCREEN_WIDTH, SCREEN_HEIGHT, DEFAULT_PLAYER_TILE, OBJECT_DEFS, PLAYER_MAX_HP, ENEMY_SPEED, DIRECTIONS } from "./constants.js";
import { randInt } from "./random.js";

export function createPlayer() {
  return {
    worldX: TILE_SIZE * DEFAULT_PLAYER_TILE[0],
    worldY: TILE_SIZE * DEFAULT_PLAYER_TILE[1],
    speed: 8,
    direction: "down",
    hasKey: 0,
    hasAxeUpgrade: false,
    hp: PLAYER_MAX_HP,
    maxHp: PLAYER_MAX_HP,
    invincibleTicks: 0,
    solidArea: { x: 8, y: 16, width: 32, height: 32 },
    solidAreaDefaultX: 8,
    solidAreaDefaultY: 16,
    collisionOn: false,
    screenX: SCREEN_WIDTH / 2 - TILE_SIZE / 2,
    screenY: SCREEN_HEIGHT / 2 - TILE_SIZE / 2,
    sprites: {},
    isMoving: false,
    animTimer: 0,
    animFrame: 0,
    dashTicks: 0,
  };
}

// Wandering hazard entity (mirrors Player's movement fields closely enough
// to be reused by collision.js#checkTileCollision).
export function createEnemy(col, row) {
  return {
    worldX: col * TILE_SIZE,
    worldY: row * TILE_SIZE,
    speed: ENEMY_SPEED,
    direction: DIRECTIONS[randInt(0, DIRECTIONS.length - 1)],
    solidArea: { x: 8, y: 8, width: 32, height: 32 },
    solidAreaDefaultX: 8,
    solidAreaDefaultY: 8,
    collisionOn: false,
    wanderTicks: 0,
  };
}

export function makeObjectInstance(def) {
  return {
    type: def.type,
    image: OBJECT_DEFS[def.type].img,
    collision: OBJECT_DEFS[def.type].collision,
    worldX: def.col * TILE_SIZE,
    worldY: def.row * TILE_SIZE,
    solidArea: { x: 0, y: 0, width: TILE_SIZE, height: TILE_SIZE },
    solidAreaDefaultX: 0,
    solidAreaDefaultY: 0,
    removed: false,
  };
}
