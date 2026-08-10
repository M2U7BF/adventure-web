import { FPS } from "./constants.js";
import { checkTileCollision, checkObjectCollision } from "./collision.js";

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
  }
}

function movePlayer(state) {
  const player = state.player;
  const { keysHeld } = state;

  if (keysHeld.has("up")) {
    player.direction = "up";
    if (!player.collisionOn) player.worldY -= player.speed;
  } else if (keysHeld.has("down")) {
    player.direction = "down";
    if (!player.collisionOn) player.worldY += player.speed;
  } else if (keysHeld.has("left")) {
    player.direction = "left";
    if (!player.collisionOn) player.worldX -= player.speed;
  } else if (keysHeld.has("right")) {
    player.direction = "right";
    if (!player.collisionOn) player.worldX += player.speed;
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

// Advances the simulation by one fixed timestep (mirrors Player.update).
export function update(state) {
  if (state.gameFinished) return;

  const player = state.player;
  player.collisionOn = false;
  checkTileCollision(player, state);
  pickUpObject(state, checkObjectCollision(player, state.worldObjects));

  movePlayer(state);

  state.playTime += 1 / FPS;
  tickMessage(state);
}
