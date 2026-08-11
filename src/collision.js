import { TILE_SIZE, MAX_WORLD_COL, MAX_WORLD_ROW } from "./constants.js";
import { intersects } from "./geometry.js";

// Mirrors CollisionChecker.checkTile: mutates entity.collisionOn / nudges the
// entity back inside the field when it would step off the world edge.
export function checkTileCollision(entity, world) {
  const entityLeftWorldX = entity.worldX + entity.solidArea.x;
  const entityRightWorldX = entity.worldX + entity.solidArea.x + entity.solidArea.width;
  const entityTopWorldY = entity.worldY + entity.solidArea.y;
  const entityBottomWorldY = entity.worldY + entity.solidArea.y + entity.solidArea.height;

  // entityRightWorldX/entityBottomWorldY are exclusive edges (the pixel just past
  // the hitbox), so the tile they fall in must be computed from edge-1, otherwise
  // a hitbox that is exactly tile-aligned (e.g. at spawn) gets attributed to the
  // next row/col and can appear blocked by a tile it isn't actually touching.
  const colInclusive = (px) => Math.floor(px / TILE_SIZE);
  const colExclusive = (px) => Math.floor((px - 1) / TILE_SIZE);

  let entityLeftCol = colInclusive(entityLeftWorldX);
  let entityRightCol = colExclusive(entityRightWorldX);
  let entityTopRow = colInclusive(entityTopWorldY);
  let entityBottomRow = colExclusive(entityBottomWorldY);

  // Keep the player inside the field.
  if (entityTopWorldY - entity.speed <= 0) {
    entity.worldY += entity.speed * 2;
    return;
  }
  if (colExclusive(entityBottomWorldY + entity.speed) >= MAX_WORLD_ROW) {
    entity.worldY -= entity.speed * 2;
    return;
  }
  if (entityLeftWorldX - entity.speed <= 0) {
    entity.worldX += entity.speed * 2;
    return;
  }
  if (colExclusive(entityRightWorldX + entity.speed) >= MAX_WORLD_COL) {
    entity.worldX -= entity.speed * 2;
    return;
  }

  const isTileSolid = (col, row) => world.tiles[world.mapTileNum[col][row]].collision;

  switch (entity.direction) {
    case "up":
      entityTopRow = colInclusive(entityTopWorldY - entity.speed);
      if (isTileSolid(entityLeftCol, entityTopRow) || isTileSolid(entityRightCol, entityTopRow)) {
        entity.collisionOn = true;
      }
      break;
    case "down":
      entityBottomRow = colExclusive(entityBottomWorldY + entity.speed);
      if (isTileSolid(entityLeftCol, entityBottomRow) || isTileSolid(entityRightCol, entityBottomRow)) {
        entity.collisionOn = true;
      }
      break;
    case "left":
      entityLeftCol = colInclusive(entityLeftWorldX - entity.speed);
      if (isTileSolid(entityLeftCol, entityTopRow) || isTileSolid(entityLeftCol, entityBottomRow)) {
        entity.collisionOn = true;
      }
      break;
    case "right":
      entityRightCol = colExclusive(entityRightWorldX + entity.speed);
      if (isTileSolid(entityRightCol, entityTopRow) || isTileSolid(entityRightCol, entityBottomRow)) {
        entity.collisionOn = true;
      }
      break;
  }
}

// Returns the index of the enemy currently overlapping the player's hitbox,
// or -1. Unlike checkObjectCollision this checks the entities' *current*
// position (no lookahead) since enemies move independently of the player.
export function checkEnemyContact(player, enemies) {
  const p = {
    x: player.worldX + player.solidArea.x,
    y: player.worldY + player.solidArea.y,
    width: player.solidArea.width,
    height: player.solidArea.height,
  };
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const box = {
      x: e.worldX + e.solidArea.x,
      y: e.worldY + e.solidArea.y,
      width: e.solidArea.width,
      height: e.solidArea.height,
    };
    if (intersects(p, box)) return i;
  }
  return -1;
}

// Mirrors CollisionChecker.checkObject: returns the index of the world object
// the entity is (about to be) touching in its current direction, or -1.
export function checkObjectCollision(entity, worldObjects) {
  let index = -1;

  for (let i = 0; i < worldObjects.length; i++) {
    const obj = worldObjects[i];
    if (!obj || obj.removed) continue;

    entity.solidArea.x = entity.worldX + entity.solidArea.x;
    entity.solidArea.y = entity.worldY + entity.solidArea.y;
    obj.solidArea.x = obj.worldX + obj.solidArea.x;
    obj.solidArea.y = obj.worldY + obj.solidArea.y;

    switch (entity.direction) {
      case "up":
        entity.solidArea.y -= entity.speed;
        break;
      case "down":
        entity.solidArea.y += entity.speed;
        break;
      case "left":
        entity.solidArea.x -= entity.speed;
        break;
      case "right":
        entity.solidArea.x += entity.speed;
        break;
    }

    if (intersects(entity.solidArea, obj.solidArea)) {
      if (obj.collision) entity.collisionOn = true;
      index = i;
    }

    entity.solidArea.x = entity.solidAreaDefaultX;
    entity.solidArea.y = entity.solidAreaDefaultY;
    obj.solidArea.x = obj.solidAreaDefaultX;
    obj.solidArea.y = obj.solidAreaDefaultY;
  }

  return index;
}
