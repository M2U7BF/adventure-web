import { FPS, TILE_SIZE, MAX_WORLD_COL, MAX_WORLD_ROW, ANIMATION_FRAME_TICKS, ENEMY_CONTACT_DAMAGE, ENEMY_KNOCKBACK, ENEMY_HIT_COOLDOWN_TICKS, PLAYER_INVINCIBLE_TICKS, ROCK_TILE, GRASS_TILE, SHIELD_INVINCIBLE_TICKS, DASH_SPEED, DASH_DURATION_TICKS, DIRECTIONS, DIRECTION_OFFSETS, SCORE_ENEMY_DEFEAT, SCORE_CHOP } from "./constants.js";
import { checkTileCollision, checkObjectCollision, checkEnemyContact } from "./collision.js";
import { randInt } from "./random.js";

const MESSAGE_DURATION_TICKS = 30;

function showMessage(state, text) {
  state.message = text;
  state.messageOn = true;
  state.messageCounter = 0;
}

// Mirrors Player.pickUpObject: applies the effect of touching a world object
// and clears it from the field when consumed.
function pickUpObject(state, index) {
  if (index < 0) return;
  const obj = state.worldObjects[index];
  if (!obj || obj.removed) return;

  const player = state.player;
  const { sfx } = state;

  switch (obj.type) {
    case "Key":
      sfx.coin.play();
      player.hasKey++;
      obj.removed = true;
      showMessage(state, "You got a key");
      break;
    case "Door":
      if (player.hasKey > 0) {
        sfx.unlock.play();
        obj.removed = true;
        player.hasKey--;
        showMessage(state, "You opened the door");
      } else {
        showMessage(state, "You need a key");
      }
      break;
    case "Boots":
      sfx.powerup.play();
      player.speed += 2;
      obj.removed = true;
      showMessage(state, "SPEED UP");
      break;
    case "Chest":
      state.gameFinished = true;
      sfx.bgm.stop();
      sfx.fanfare.play();
      break;
    case "Hidden":
      sfx.coin.play();
      obj.removed = true;
      state.hiddenCollected++;
      showMessage(state, `隠しアイテムを見つけた！ (${state.hiddenCollected}/${state.hiddenTotal})`);
      break;
    case "Axe":
      sfx.powerup.play();
      player.hasAxeUpgrade = true;
      obj.removed = true;
      showMessage(state, "斧をアップグレードした！岩も壊せる");
      break;
    case "Shield":
      sfx.powerup.play();
      player.invincibleTicks = Math.max(player.invincibleTicks, SHIELD_INVINCIBLE_TICKS);
      obj.removed = true;
      showMessage(state, "シールドで一定時間無敵になった！");
      break;
  }
}

// Chops down the destructible obstacle (tree/bush) directly in front of the
// player, if any, turning its tile into the tile named by its
// `destructibleTo` definition (see constants.js#TILE_DEFS). Rocks have no
// `destructibleTo` and can only be chopped once the player has the Axe
// upgrade (see the "Axe" case in pickUpObject above).
function chopTile(state) {
  const player = state.player;
  const [dCol, dRow] = DIRECTION_OFFSETS[player.direction];
  const playerCol = Math.floor((player.worldX + player.solidArea.x + player.solidArea.width / 2) / TILE_SIZE);
  const playerRow = Math.floor((player.worldY + player.solidArea.y + player.solidArea.height / 2) / TILE_SIZE);
  const col = playerCol + dCol;
  const row = playerRow + dRow;

  if (col < 0 || col >= MAX_WORLD_COL || row < 0 || row >= MAX_WORLD_ROW) return;

  const tileIndex = state.mapTileNum[col][row];

  if (tileIndex === ROCK_TILE) {
    if (!player.hasAxeUpgrade) return;
    state.mapTileNum[col][row] = GRASS_TILE;
    state.score += SCORE_CHOP;
    state.sfx.chop.play();
    showMessage(state, "岩を砕いた");
    return;
  }

  const tileDef = state.tiles[tileIndex];
  if (!tileDef || tileDef.destructibleTo === undefined) return;

  state.mapTileNum[col][row] = tileDef.destructibleTo;
  state.score += SCORE_CHOP;
  state.sfx.chop.play();
  showMessage(state, "You cleared the way");
}

function movePlayer(state) {
  const player = state.player;
  player.isMoving = false;

  const direction = DIRECTIONS.find((d) => state.keysHeld.has(d));
  if (!direction) return;

  player.direction = direction;
  if (player.collisionOn) return;

  const [dCol, dRow] = DIRECTION_OFFSETS[direction];
  player.worldX += dCol * player.speed;
  player.worldY += dRow * player.speed;
  player.isMoving = true;
}

// Advances an in-progress dash attack: a short burst of movement in the
// player's facing direction, faster than normal walking and (per
// handleEnemyContact below) lethal to any enemy touched along the way.
// Overrides player.speed for the tile-collision lookahead so the dash
// respects walls/water at its own (longer) reach, mirroring movePlayer.
function updateDash(state) {
  const player = state.player;
  player.dashTicks--;

  const [dCol, dRow] = DIRECTION_OFFSETS[player.direction];
  const normalSpeed = player.speed;
  player.speed = DASH_SPEED;
  checkTileCollision(player, state);
  if (!player.collisionOn) {
    player.worldX += dCol * DASH_SPEED;
    player.worldY += dRow * DASH_SPEED;
    player.isMoving = true;
  }
  player.speed = normalSpeed;
}

// Alternates the player's walk-cycle frame while moving; holds frame 0
// (idle pose) as soon as they stop.
function tickAnimation(state) {
  const player = state.player;
  if (!player.isMoving) {
    player.animTimer = 0;
    player.animFrame = 0;
    return;
  }
  player.animTimer++;
  if (player.animTimer >= ANIMATION_FRAME_TICKS) {
    player.animTimer = 0;
    player.animFrame = 1 - player.animFrame;
  }
}

function tickMessage(state) {
  if (!state.messageOn) return;
  state.messageCounter++;
  if (state.messageCounter > MESSAGE_DURATION_TICKS) {
    state.messageCounter = 0;
    state.messageOn = false;
  }
}

// Simple wander AI: walk in the current direction until blocked or a random
// timer runs out, then pick a new random direction. Reuses checkTileCollision
// so enemies respect the same solid tiles as the player.
function updateEnemies(state) {
  for (const enemy of state.enemies) {
    if (enemy.hitCooldownTicks > 0) enemy.hitCooldownTicks--;

    enemy.collisionOn = false;
    checkTileCollision(enemy, state);

    enemy.wanderTicks--;
    if (enemy.wanderTicks <= 0 || enemy.collisionOn) {
      enemy.direction = DIRECTIONS[randInt(0, DIRECTIONS.length - 1)];
      enemy.wanderTicks = randInt(45, 150);
    }

    if (!enemy.collisionOn) {
      const [dCol, dRow] = DIRECTION_OFFSETS[enemy.direction];
      enemy.worldX += dCol * enemy.speed;
      enemy.worldY += dRow * enemy.speed;
    }
  }
}

// Removes the enemy the player just dashed into (see updateDash) - the
// current means of defeating enemies (issue #24).
function defeatEnemy(state, index) {
  state.enemies.splice(index, 1);
  state.score += SCORE_ENEMY_DEFEAT;
  state.sfx.chop.play();
  showMessage(state, "敵を倒した！");
}

// Applies one dash hit to the enemy at `index`: the "tough" enemy (see
// entities.js#createEnemy) survives until its hp reaches 0, everything else
// is defeated in one hit as before.
function damageEnemy(state, index) {
  const enemy = state.enemies[index];
  if (enemy.hitCooldownTicks > 0) return;

  enemy.hp -= 1;
  if (enemy.hp <= 0) {
    defeatEnemy(state, index);
    return;
  }
  enemy.hitCooldownTicks = ENEMY_HIT_COOLDOWN_TICKS;
  state.sfx.chop.play();
  showMessage(state, `敵にダメージを与えた！ (残り${enemy.hp})`);
}

// Applies contact damage/knockback and triggers game over at 0 HP (mirrors
// the intent of Player.hp in the original game's later revisions). While
// dashing, contact damages the enemy instead of hurting the player.
function handleEnemyContact(state) {
  const player = state.player;

  if (player.dashTicks > 0) {
    const dashIndex = checkEnemyContact(player, state.enemies);
    if (dashIndex >= 0) damageEnemy(state, dashIndex);
    return;
  }

  if (player.invincibleTicks > 0) {
    player.invincibleTicks--;
    return;
  }

  const index = checkEnemyContact(player, state.enemies);
  if (index < 0) return;

  const enemy = state.enemies[index];
  player.hp -= ENEMY_CONTACT_DAMAGE;
  player.invincibleTicks = PLAYER_INVINCIBLE_TICKS;
  showMessage(state, "ダメージを受けた！");

  // Knock the player straight back away from the enemy that hit them.
  const dx = player.worldX - enemy.worldX;
  const dy = player.worldY - enemy.worldY;
  if (Math.abs(dx) > Math.abs(dy)) {
    player.worldX += Math.sign(dx || 1) * ENEMY_KNOCKBACK;
  } else {
    player.worldY += Math.sign(dy || 1) * ENEMY_KNOCKBACK;
  }
  player.worldX = Math.max(TILE_SIZE, Math.min((MAX_WORLD_COL - 2) * TILE_SIZE, player.worldX));
  player.worldY = Math.max(TILE_SIZE, Math.min((MAX_WORLD_ROW - 2) * TILE_SIZE, player.worldY));

  if (player.hp <= 0) {
    player.hp = 0;
    state.gameOver = true;
    state.sfx.bgm.stop();
  }
}

// Advances the simulation by one fixed timestep (mirrors Player.update).
export function update(state) {
  if (state.gameFinished || state.gameOver) return;

  const player = state.player;
  player.collisionOn = false;
  checkTileCollision(player, state);
  pickUpObject(state, checkObjectCollision(player, state.worldObjects));

  if (player.dashTicks > 0) {
    updateDash(state);
  } else {
    movePlayer(state);
  }
  tickAnimation(state);
  updateEnemies(state);
  handleEnemyContact(state);

  if (state.actionQueued) {
    chopTile(state);
    if (player.dashTicks <= 0) player.dashTicks = DASH_DURATION_TICKS;
    state.actionQueued = false;
  }

  state.playTime += 1 / FPS;
  tickMessage(state);
}
