import { TILE_SIZE, MAX_WORLD_COL, MAX_WORLD_ROW, SCREEN_WIDTH, SCREEN_HEIGHT } from "./constants.js";

function isOnScreen(worldX, worldY, player) {
  return (
    worldX + TILE_SIZE > player.worldX - player.screenX &&
    worldX - TILE_SIZE < player.worldX + player.screenX &&
    worldY + TILE_SIZE > player.worldY - player.screenY &&
    worldY - TILE_SIZE < player.worldY + player.screenY
  );
}

function drawTiles(ctx, state) {
  const { player, tiles, mapTileNum } = state;
  for (let col = 0; col < MAX_WORLD_COL; col++) {
    for (let row = 0; row < MAX_WORLD_ROW; row++) {
      const worldX = col * TILE_SIZE;
      const worldY = row * TILE_SIZE;
      if (!isOnScreen(worldX, worldY, player)) continue;

      const screenX = worldX - player.worldX + player.screenX;
      const screenY = worldY - player.worldY + player.screenY;
      ctx.drawImage(tiles[mapTileNum[col][row]].img, screenX, screenY, TILE_SIZE, TILE_SIZE);
    }
  }
}

function drawObjects(ctx, state) {
  const { player, worldObjects } = state;
  for (const obj of worldObjects) {
    if (!obj || obj.removed) continue;
    if (!isOnScreen(obj.worldX, obj.worldY, player)) continue;

    const screenX = obj.worldX - player.worldX + player.screenX;
    const screenY = obj.worldY - player.worldY + player.screenY;
    ctx.drawImage(obj.image, screenX, screenY, TILE_SIZE, TILE_SIZE);
  }
}

function drawPlayer(ctx, state) {
  const { player } = state;
  ctx.drawImage(player.sprites[player.direction], player.screenX, player.screenY, TILE_SIZE, TILE_SIZE);
}

function strokedText(ctx, text, x, y) {
  ctx.strokeStyle = "rgba(0,0,0,0.8)";
  ctx.lineWidth = 3;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = "white";
  ctx.fillText(text, x, y);
}

function drawFinishedUI(ctx, state) {
  ctx.textAlign = "center";
  ctx.font = "40px Arial";
  strokedText(ctx, "you got a treasure", SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - TILE_SIZE * 3);
  strokedText(ctx, "Your time is : " + state.playTime.toFixed(1), SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + TILE_SIZE * 3);

  ctx.font = "bold 64px Arial";
  strokedText(ctx, "Congratulations!", SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + TILE_SIZE * 2);
  ctx.textAlign = "left";
}

function drawHud(ctx, state) {
  ctx.textAlign = "left";
  ctx.font = "40px Arial";
  ctx.drawImage(state.keyIcon, TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
  strokedText(ctx, "x " + state.player.hasKey, 74, 65);
  strokedText(ctx, "Time : " + state.playTime.toFixed(1), TILE_SIZE * 11, 65);

  if (state.messageOn) {
    ctx.font = "20px Arial";
    strokedText(ctx, state.message, TILE_SIZE * 5, TILE_SIZE * 5);
  }
}

// Renders one frame. Returns true once the finished screen has been drawn,
// signalling the caller to stop the loop and show the "play again" overlay.
export function draw(ctx, state) {
  ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  drawTiles(ctx, state);
  drawObjects(ctx, state);
  drawPlayer(ctx, state);

  if (state.gameFinished) {
    drawFinishedUI(ctx, state);
    return true;
  }

  drawHud(ctx, state);
  return false;
}
