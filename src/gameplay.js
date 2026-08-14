import { FPS, TILE_SIZE, MAX_WORLD_COL, MAX_WORLD_ROW, ANIMATION_FRAME_TICKS, ENEMY_CONTACT_DAMAGE, ENEMY_KNOCKBACK, ENEMY_HIT_COOLDOWN_TICKS, PLAYER_INVINCIBLE_TICKS, ROCK_TILE, GRASS_TILE, SHIELD_INVINCIBLE_TICKS, WAVE_RANGE_TILES_NORMAL, WAVE_RANGE_TILES_CHARGED, WAVE_SPEED, WAVE_SIZE, DIRECTIONS, DIRECTION_OFFSETS, SCORE_ENEMY_DEFEAT, SCORE_CHOP } from "./constants.js";
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

// Chops the destructible obstacle (tree/bush) at the given tile, turning it
// into the tile named by its `destructibleTo` definition (see
// constants.js#TILE_DEFS), or breaks a rock if the player has the Axe
// upgrade (see the "Axe" case in pickUpObject above). Returns true if the
// tile was destroyed, so callers (see updateWaves below) know to stop a
// wave attack there.
function chopAt(state, col, row) {
  const tileIndex = state.mapTileNum[col][row];

  if (tileIndex === ROCK_TILE) {
    if (!state.player.hasAxeUpgrade) return false;
    state.mapTileNum[col][row] = GRASS_TILE;
    state.score += SCORE_CHOP;
    state.sfx.chop.play();
    showMessage(state, "岩を砕いた");
    return true;
  }

  const tileDef = state.tiles[tileIndex];
  if (!tileDef || tileDef.destructibleTo === undefined) return false;

  state.mapTileNum[col][row] = tileDef.destructibleTo;
  state.score += SCORE_CHOP;
  state.sfx.chop.play();
  showMessage(state, "You cleared the way");
  return true;
}

function movePlayer(state, direction) {
  const player = state.player;
  player.isMoving = false;
  if (!direction || player.collisionOn) return;

  const [dCol, dRow] = DIRECTION_OFFSETS[direction];
  player.worldX += dCol * player.speed;
  player.worldY += dRow * player.speed;
  player.isMoving = true;
}

// Fires a wave attack in the player's facing direction, triggered on
// release of the action key/button (see input.js). A quick tap fires a
// wave that travels WAVE_RANGE_TILES_NORMAL tile, holding the button for at
// least ACTION_CHARGE_MS charges it to travel WAVE_RANGE_TILES_CHARGED
// tiles instead (see updateWaves below for what it does along the way).
function fireWave(state, charged) {
  const player = state.player;
  const direction = player.direction;
  const [dCol, dRow] = DIRECTION_OFFSETS[direction];
  const centerX = player.worldX + player.solidArea.x + player.solidArea.width / 2;
  const centerY = player.worldY + player.solidArea.y + player.solidArea.height / 2;
  const rangeTiles = charged ? WAVE_RANGE_TILES_CHARGED : WAVE_RANGE_TILES_NORMAL;

  state.waves.push({
    worldX: centerX + dCol * (TILE_SIZE / 2) - WAVE_SIZE / 2,
    worldY: centerY + dRow * (TILE_SIZE / 2) - WAVE_SIZE / 2,
    direction,
    distance: 0,
    maxDistance: rangeTiles * TILE_SIZE,
    solidArea: { x: 0, y: 0, width: WAVE_SIZE, height: WAVE_SIZE },
    solidAreaDefaultX: 0,
    solidAreaDefaultY: 0,
    charged,
  });
}

// Advances in-flight wave attacks (see fireWave above): each travels in a
// straight line up to its range, damaging every enemy it touches along the
// way (enemy.hitCooldownTicks, set by damageEnemy, keeps a lingering wave
// from multi-hitting the same enemy every tick) and disappearing into the
// first solid tile it reaches - the current means of defeating enemies at
// range (issue #34), replacing the previous dash-into-enemy attack.
function updateWaves(state) {
  for (let i = state.waves.length - 1; i >= 0; i--) {
    const wave = state.waves[i];
    const [dCol, dRow] = DIRECTION_OFFSETS[wave.direction];
    const step = Math.min(WAVE_SPEED, wave.maxDistance - wave.distance);
    wave.worldX += dCol * step;
    wave.worldY += dRow * step;
    wave.distance += step;

    const enemyIndex = checkEnemyContact(wave, state.enemies);
    if (enemyIndex >= 0) damageEnemy(state, enemyIndex);

    const col = Math.floor((wave.worldX + wave.solidArea.width / 2) / TILE_SIZE);
    const row = Math.floor((wave.worldY + wave.solidArea.height / 2) / TILE_SIZE);
    const outOfBounds = col < 0 || col >= MAX_WORLD_COL || row < 0 || row >= MAX_WORLD_ROW;
    const blocked = outOfBounds || chopAt(state, col, row) || state.tiles[state.mapTileNum[col][row]].collision;

    if (blocked || wave.distance >= wave.maxDistance) {
      state.waves.splice(i, 1);
    }
  }
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

// Removes the enemy a wave attack just defeated (see updateWaves above).
function defeatEnemy(state, index) {
  state.enemies.splice(index, 1);
  state.score += SCORE_ENEMY_DEFEAT;
  state.sfx.chop.play();
  showMessage(state, "敵を倒した！");
}

// Applies one wave hit to the enemy at `index`: the "tough" enemy (see
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
// the intent of Player.hp in the original game's later revisions).
function handleEnemyContact(state) {
  const player = state.player;

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
    state.sfx.gameover.play();
  }
}

// Advances the simulation by one fixed timestep (mirrors Player.update).
export function update(state) {
  if (state.gameFinished || state.gameOver) return;

  const player = state.player;
  player.collisionOn = false;

  // Face the currently-held direction *before* checking collision, so the
  // lookahead below (and pickUpObject's, which also reads player.direction)
  // tests the tile the player is actually about to step into this frame
  // rather than the previous frame's direction. Checking against a stale
  // direction is what caused the "catches on walls" feel (issue #34): on
  // the frame you turn beside a wall, the game would block movement based
  // on whether the *old* direction was blocked, ignoring the new one.
  const direction = DIRECTIONS.find((d) => state.keysHeld.has(d));
  if (direction) player.direction = direction;

  checkTileCollision(player, state);
  pickUpObject(state, checkObjectCollision(player, state.worldObjects));

  movePlayer(state, direction);
  tickAnimation(state);
  updateEnemies(state);
  updateWaves(state);
  handleEnemyContact(state);

  if (state.actionQueued) {
    fireWave(state, state.actionCharged);
    state.actionQueued = false;
    state.actionCharged = false;
  }

  state.playTime += 1 / FPS;
  tickMessage(state);
}
