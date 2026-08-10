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
  const sprite = player.sprites[player.direction][player.animFrame];
  ctx.drawImage(sprite, player.screenX, player.screenY, TILE_SIZE, TILE_SIZE);
}

function strokedText(ctx, text, x, y) {
  ctx.strokeStyle = "rgba(0,0,0,0.8)";
  ctx.lineWidth = 3;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = "white";
  ctx.fillText(text, x, y);
}

function panel(ctx, x, y, width, height, radius = 10) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  ctx.fillStyle = "rgba(10, 12, 20, 0.55)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
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

  // Key count pill (top-left).
  panel(ctx, 12, 10, 132, 52);
  ctx.drawImage(state.keyIcon, 20, 18, 36, 36);
  ctx.font = "bold 24px Arial";
  strokedText(ctx, "x " + state.player.hasKey, 66, 44);

  // Timer pill (top-right).
  const timeText = "Time : " + state.playTime.toFixed(1);
  ctx.font = "bold 24px Arial";
  const timeWidth = ctx.measureText(timeText).width;
  const timePanelWidth = timeWidth + 32;
  const timePanelX = SCREEN_WIDTH - timePanelWidth - 12;
  panel(ctx, timePanelX, 10, timePanelWidth, 52);
  strokedText(ctx, timeText, timePanelX + 16, 44);

  if (state.messageOn) {
    ctx.font = "20px Arial";
    const msgWidth = ctx.measureText(state.message).width;
    const msgX = SCREEN_WIDTH / 2 - msgWidth / 2 - 16;
    const msgY = TILE_SIZE * 5 - 26;
    panel(ctx, msgX, msgY, msgWidth + 32, 38);
    ctx.textAlign = "center";
    strokedText(ctx, state.message, SCREEN_WIDTH / 2, msgY + 25);
    ctx.textAlign = "left";
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
