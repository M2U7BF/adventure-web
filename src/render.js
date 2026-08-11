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

// Axe/Shield have no sprite asset (see constants.js#OBJECT_DEFS), so they're
// drawn as a simple canvas icon on a dark badge instead of an image.
function drawIconObject(ctx, type, screenX, screenY) {
  const cx = screenX + TILE_SIZE / 2;
  const cy = screenY + TILE_SIZE / 2;
  const r = TILE_SIZE * 0.3;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(10, 12, 20, 0.55)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (type === "Axe") {
    ctx.strokeStyle = "#c9c9c9";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.3, cy - r * 0.8);
    ctx.lineTo(cx - r * 0.3, cy + r * 0.8);
    ctx.stroke();
    ctx.fillStyle = "#9a6b3a";
    ctx.beginPath();
    ctx.arc(cx + r * 0.15, cy - r * 0.35, r * 0.55, -Math.PI * 0.65, Math.PI * 0.15);
    ctx.lineTo(cx - r * 0.3, cy - r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#5a3a1a";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (type === "Shield") {
    ctx.fillStyle = "#4a90d9";
    ctx.strokeStyle = "#1c4a7a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx + r, cy - r * 0.6, cx + r * 0.8, cy + r * 0.1);
    ctx.quadraticCurveTo(cx + r * 0.5, cy + r * 0.9, cx, cy + r);
    ctx.quadraticCurveTo(cx - r * 0.5, cy + r * 0.9, cx - r * 0.8, cy + r * 0.1);
    ctx.quadraticCurveTo(cx - r, cy - r * 0.6, cx, cy - r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawObjects(ctx, state) {
  const { player, worldObjects } = state;
  for (const obj of worldObjects) {
    if (!obj || obj.removed) continue;
    if (!isOnScreen(obj.worldX, obj.worldY, player)) continue;

    const screenX = obj.worldX - player.worldX + player.screenX;
    const screenY = obj.worldY - player.worldY + player.screenY;
    if (obj.image) {
      ctx.drawImage(obj.image, screenX, screenY, TILE_SIZE, TILE_SIZE);
    } else {
      drawIconObject(ctx, obj.type, screenX, screenY);
    }
  }
}

function drawPlayer(ctx, state) {
  const { player } = state;
  // Blink while briefly invincible after taking a hit.
  if (player.invincibleTicks > 0 && Math.floor(player.invincibleTicks / 4) % 2 === 0) return;
  const sprite = player.sprites[player.direction][player.animFrame];
  ctx.drawImage(sprite, player.screenX, player.screenY, TILE_SIZE, TILE_SIZE);
}

function drawEnemies(ctx, state) {
  const { player, enemies } = state;
  for (const enemy of enemies) {
    if (!isOnScreen(enemy.worldX, enemy.worldY, player)) continue;
    const screenX = enemy.worldX - player.worldX + player.screenX;
    const screenY = enemy.worldY - player.worldY + player.screenY;
    const cx = screenX + TILE_SIZE / 2;
    const cy = screenY + TILE_SIZE / 2;
    const r = TILE_SIZE * 0.32;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#b03a3a";
    ctx.fill();
    ctx.strokeStyle = "#5a1414";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx - r * 0.35, cy - r * 0.2, r * 0.22, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.35, cy - r * 0.2, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(cx - r * 0.35, cy - r * 0.2, r * 0.1, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.35, cy - r * 0.2, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
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

function drawHpBar(ctx, state) {
  const { player } = state;
  const panelWidth = 24 + player.maxHp * 26;
  panel(ctx, 12, 70, panelWidth, 40);
  for (let i = 0; i < player.maxHp; i++) {
    const cx = 12 + 22 + i * 26;
    const cy = 70 + 20;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fillStyle = i < player.hp ? "#e04a4a" : "rgba(255,255,255,0.15)";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawGameOverUI(ctx, state) {
  ctx.textAlign = "center";
  ctx.font = "bold 64px Arial";
  strokedText(ctx, "GAME OVER", SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
  ctx.font = "24px Arial";
  strokedText(ctx, "生き延びた時間 : " + state.playTime.toFixed(1), SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + TILE_SIZE);
  ctx.textAlign = "left";
}

function drawHud(ctx, state) {
  ctx.textAlign = "left";

  // Key count pill (top-left).
  panel(ctx, 12, 10, 132, 52);
  ctx.drawImage(state.keyIcon, 20, 18, 36, 36);
  ctx.font = "bold 24px Arial";
  strokedText(ctx, "x " + state.player.hasKey, 66, 44);

  drawHpBar(ctx, state);

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

// Renders one frame. Returns "finished"/"gameover" once the corresponding
// end screen has been drawn, signalling the caller to stop the loop and show
// the matching overlay; otherwise returns null.
export function draw(ctx, state) {
  ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  drawTiles(ctx, state);
  drawObjects(ctx, state);
  drawEnemies(ctx, state);
  drawPlayer(ctx, state);

  if (state.gameOver) {
    drawGameOverUI(ctx, state);
    return "gameover";
  }

  if (state.gameFinished) {
    drawFinishedUI(ctx, state);
    return "finished";
  }

  drawHud(ctx, state);
  return null;
}
