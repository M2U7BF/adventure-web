"use strict";

// ---------------------------------------------------------------------
// Screen / world constants (ported from GamePanel.java)
// ---------------------------------------------------------------------
const ORIGINAL_TILE_SIZE = 16;
const SCALE = 3;
const TILE_SIZE = ORIGINAL_TILE_SIZE * SCALE; // 48
const MAX_SCREEN_COL = 16;
const MAX_SCREEN_ROW = 12;
const SCREEN_WIDTH = TILE_SIZE * MAX_SCREEN_COL; // 768
const SCREEN_HEIGHT = TILE_SIZE * MAX_SCREEN_ROW; // 576
const MAX_WORLD_COL = 50;
const MAX_WORLD_ROW = 50;
const FPS = 60;
const STEP_MS = 1000 / FPS;

const canvas = document.getElementById("game");
canvas.width = SCREEN_WIDTH;
canvas.height = SCREEN_HEIGHT;
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlayText");
const startBtn = document.getElementById("startBtn");

// ---------------------------------------------------------------------
// Asset loading
// ---------------------------------------------------------------------
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image failed: " + src));
    img.src = src;
  });
}

function loadText(src) {
  return fetch(src).then((r) => {
    if (!r.ok) throw new Error("text failed: " + src);
    return r.text();
  });
}

class SfxPlayer {
  constructor(src, { loop = false } = {}) {
    this.audio = new Audio(src);
    this.audio.loop = loop;
    this.audio.preload = "auto";
  }
  play() {
    this.audio.currentTime = 0;
    this.audio.play().catch(() => {});
  }
  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
  }
}

// ---------------------------------------------------------------------
// Tile definitions: index -> {src, collision}
// ---------------------------------------------------------------------
const TILE_DEFS = [
  { src: "assets/tiles/grass.png", collision: false }, // 0
  { src: "assets/tiles/wall.png", collision: true }, // 1
  { src: "assets/tiles/water.png", collision: true }, // 2
  { src: "assets/tiles/earth.png", collision: false }, // 3
  { src: "assets/tiles/tree.png", collision: true }, // 4
  { src: "assets/tiles/sand.png", collision: false }, // 5
];

const OBJECT_DEFS = {
  Key: { src: "assets/objects/key.png", collision: false },
  Door: { src: "assets/objects/door.png", collision: true },
  Chest: { src: "assets/objects/chest.png", collision: false },
  Boots: { src: "assets/objects/boots.png", collision: false },
};

// world objects placed in the field (AssetSetter.java)
const OBJECT_PLACEMENTS = [
  { type: "Key", col: 23, row: 7 },
  { type: "Key", col: 23, row: 40 },
  { type: "Key", col: 22, row: 40 },
  { type: "Door", col: 22, row: 7 },
  { type: "Door", col: 27, row: 22 },
  { type: "Door", col: 27, row: 24 },
  { type: "Chest", col: 28, row: 25 },
  { type: "Boots", col: 21, row: 40 },
];

const DEFAULT_PLAYER_TILE = [23, 21];

// ---------------------------------------------------------------------
// Rectangle helpers (mirrors java.awt.Rectangle usage in the original)
// ---------------------------------------------------------------------
function intersects(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// ---------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------
const state = {
  tiles: [],
  mapTileNum: [],
  worldObjects: [],
  player: null,
  keysHeld: new Set(),
  running: false,
  animFrame: null,
  lastTime: 0,
  accumulator: 0,
  messageOn: false,
  message: "",
  messageCounter: 0,
  playTime: 0,
  gameFinished: false,
  keyIcon: null,
};

function createPlayer() {
  return {
    worldX: TILE_SIZE * DEFAULT_PLAYER_TILE[0],
    worldY: TILE_SIZE * DEFAULT_PLAYER_TILE[1],
    speed: 8,
    direction: "down",
    hasKey: 0,
    solidArea: { x: 8, y: 16, width: 32, height: 32 },
    solidAreaDefaultX: 8,
    solidAreaDefaultY: 16,
    collisionOn: false,
    screenX: SCREEN_WIDTH / 2 - TILE_SIZE / 2,
    screenY: SCREEN_HEIGHT / 2 - TILE_SIZE / 2,
    sprites: {},
  };
}

function makeObjectInstance(def) {
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

// ---------------------------------------------------------------------
// Map loading (mirrors TileManager.loadMap)
// ---------------------------------------------------------------------
function parseMap(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const mapTileNum = [];
  for (let col = 0; col < MAX_WORLD_COL; col++) {
    mapTileNum.push(new Array(MAX_WORLD_ROW).fill(0));
  }
  for (let row = 0; row < MAX_WORLD_ROW; row++) {
    const numbers = lines[row].trim().split(/\s+/).map(Number);
    for (let col = 0; col < MAX_WORLD_COL; col++) {
      mapTileNum[col][row] = numbers[col];
    }
  }
  return mapTileNum;
}

// ---------------------------------------------------------------------
// Collision (mirrors CollisionChecker.java)
// ---------------------------------------------------------------------
function checkTileCollision(entity) {
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

  // keep the player inside the field
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

  let tileNum1, tileNum2;
  if (entity.direction === "up") {
    entityTopRow = colInclusive(entityTopWorldY - entity.speed);
    tileNum1 = state.mapTileNum[entityLeftCol][entityTopRow];
    tileNum2 = state.mapTileNum[entityRightCol][entityTopRow];
    if (state.tiles[tileNum1].collision || state.tiles[tileNum2].collision) entity.collisionOn = true;
  }
  if (entity.direction === "down") {
    entityBottomRow = colExclusive(entityBottomWorldY + entity.speed);
    tileNum1 = state.mapTileNum[entityLeftCol][entityBottomRow];
    tileNum2 = state.mapTileNum[entityRightCol][entityBottomRow];
    if (state.tiles[tileNum1].collision || state.tiles[tileNum2].collision) entity.collisionOn = true;
  }
  if (entity.direction === "left") {
    entityLeftCol = colInclusive(entityLeftWorldX - entity.speed);
    tileNum1 = state.mapTileNum[entityLeftCol][entityTopRow];
    tileNum2 = state.mapTileNum[entityLeftCol][entityBottomRow];
    if (state.tiles[tileNum1].collision || state.tiles[tileNum2].collision) entity.collisionOn = true;
  }
  if (entity.direction === "right") {
    entityRightCol = colExclusive(entityRightWorldX + entity.speed);
    tileNum1 = state.mapTileNum[entityRightCol][entityTopRow];
    tileNum2 = state.mapTileNum[entityRightCol][entityBottomRow];
    if (state.tiles[tileNum1].collision || state.tiles[tileNum2].collision) entity.collisionOn = true;
  }
}

function checkObjectCollision(entity) {
  let index = -1;

  for (let i = 0; i < state.worldObjects.length; i++) {
    const obj = state.worldObjects[i];
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

// ---------------------------------------------------------------------
// Update (mirrors Player.update / pickUpObject)
// ---------------------------------------------------------------------
function shortMessage(text) {
  state.message = text;
  state.messageOn = true;
  state.messageCounter = 0;
}

function pickUpObject(i) {
  if (i < 0) return;
  const obj = state.worldObjects[i];
  if (!obj || obj.removed) return;

  switch (obj.type) {
    case "Key":
      sfx.coin.play();
      state.player.hasKey++;
      obj.removed = true;
      shortMessage("You got a key");
      break;
    case "Door":
      if (state.player.hasKey > 0) {
        sfx.unlock.play();
        obj.removed = true;
        state.player.hasKey--;
        shortMessage("You opened the door");
      } else {
        shortMessage("You need a key");
      }
      break;
    case "Boots":
      sfx.powerup.play();
      state.player.speed += 2;
      obj.removed = true;
      shortMessage("SPEED UP");
      break;
    case "Chest":
      state.gameFinished = true;
      sfx.bgm.stop();
      sfx.fanfare.play();
      break;
  }
}

function update() {
  if (state.gameFinished) return;

  const player = state.player;
  player.collisionOn = false;
  checkTileCollision(player);
  const objIndex = checkObjectCollision(player);
  pickUpObject(objIndex);

  const up = state.keysHeld.has("up");
  const down = state.keysHeld.has("down");
  const left = state.keysHeld.has("left");
  const right = state.keysHeld.has("right");

  if (up) {
    player.direction = "up";
    if (!player.collisionOn) player.worldY -= player.speed;
  } else if (down) {
    player.direction = "down";
    if (!player.collisionOn) player.worldY += player.speed;
  } else if (left) {
    player.direction = "left";
    if (!player.collisionOn) player.worldX -= player.speed;
  } else if (right) {
    player.direction = "right";
    if (!player.collisionOn) player.worldX += player.speed;
  }

  state.playTime += 1 / FPS;

  if (state.messageOn) {
    state.messageCounter++;
    if (state.messageCounter > 30) {
      state.messageCounter = 0;
      state.messageOn = false;
    }
  }
}

// ---------------------------------------------------------------------
// Draw (mirrors TileManager.draw / SuperObject.draw / Player.draw / UI.draw)
// ---------------------------------------------------------------------
function drawTiles() {
  const player = state.player;
  for (let col = 0; col < MAX_WORLD_COL; col++) {
    for (let row = 0; row < MAX_WORLD_ROW; row++) {
      const tileNum = state.mapTileNum[col][row];
      const worldX = col * TILE_SIZE;
      const worldY = row * TILE_SIZE;
      const screenX = worldX - player.worldX + player.screenX;
      const screenY = worldY - player.worldY + player.screenY;

      if (
        worldX + TILE_SIZE > player.worldX - player.screenX &&
        worldX - TILE_SIZE < player.worldX + player.screenX &&
        worldY + TILE_SIZE > player.worldY - player.screenY &&
        worldY - TILE_SIZE < player.worldY + player.screenY
      ) {
        ctx.drawImage(state.tiles[tileNum].img, screenX, screenY, TILE_SIZE, TILE_SIZE);
      }
    }
  }
}

function drawObjects() {
  const player = state.player;
  for (const obj of state.worldObjects) {
    if (!obj || obj.removed) continue;
    const screenX = obj.worldX - player.worldX + player.screenX;
    const screenY = obj.worldY - player.worldY + player.screenY;
    if (
      obj.worldX + TILE_SIZE > player.worldX - player.screenX &&
      obj.worldX - TILE_SIZE < player.worldX + player.screenX &&
      obj.worldY + TILE_SIZE > player.worldY - player.screenY &&
      obj.worldY - TILE_SIZE < player.worldY + player.screenY
    ) {
      ctx.drawImage(obj.image, screenX, screenY, TILE_SIZE, TILE_SIZE);
    }
  }
}

function drawPlayer() {
  const player = state.player;
  const img = player.sprites[player.direction];
  ctx.drawImage(img, player.screenX, player.screenY, TILE_SIZE, TILE_SIZE);
}

function strokedText(text, x, y) {
  ctx.strokeStyle = "rgba(0,0,0,0.8)";
  ctx.lineWidth = 3;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = "white";
  ctx.fillText(text, x, y);
}

function drawUI() {
  if (state.gameFinished) {
    ctx.textAlign = "center";
    ctx.font = "40px Arial";
    let text = "you got a treasure";
    let y = SCREEN_HEIGHT / 2 - TILE_SIZE * 3;
    strokedText(text, SCREEN_WIDTH / 2, y);

    text = "Your time is : " + state.playTime.toFixed(1);
    y = SCREEN_HEIGHT / 2 + TILE_SIZE * 3;
    strokedText(text, SCREEN_WIDTH / 2, y);

    ctx.font = "bold 64px Arial";
    text = "Congratulations!";
    y = SCREEN_HEIGHT / 2 + TILE_SIZE * 2;
    strokedText(text, SCREEN_WIDTH / 2, y);

    ctx.textAlign = "left";
    stopLoop();
    showFinishedOverlay();
    return;
  }

  ctx.textAlign = "left";
  ctx.font = "40px Arial";
  ctx.drawImage(state.keyIcon, TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
  strokedText("x " + state.player.hasKey, 74, 65);
  strokedText("Time : " + state.playTime.toFixed(1), TILE_SIZE * 11, 65);

  if (state.messageOn) {
    ctx.font = "20px Arial";
    strokedText(state.message, TILE_SIZE * 5, TILE_SIZE * 5);
  }
}

function draw() {
  ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  drawTiles();
  drawObjects();
  drawPlayer();
  drawUI();
}

// ---------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------
const KEY_MAP = {
  ArrowUp: "up", KeyW: "up",
  ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
};

function setupInput() {
  window.addEventListener("keydown", (e) => {
    const dir = KEY_MAP[e.code];
    if (dir) {
      state.keysHeld.add(dir);
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => {
    const dir = KEY_MAP[e.code];
    if (dir) {
      state.keysHeld.delete(dir);
      e.preventDefault();
    }
  });

  document.querySelectorAll("#touchpad button[data-dir]").forEach((btn) => {
    const dir = btn.dataset.dir;
    const press = (e) => {
      e.preventDefault();
      state.keysHeld.add(dir);
    };
    const release = (e) => {
      e.preventDefault();
      state.keysHeld.delete(dir);
    };
    btn.addEventListener("touchstart", press, { passive: false });
    btn.addEventListener("touchend", release, { passive: false });
    btn.addEventListener("touchcancel", release, { passive: false });
    btn.addEventListener("mousedown", press);
    btn.addEventListener("mouseup", release);
    btn.addEventListener("mouseleave", release);
  });
}

// ---------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------
function loop(now) {
  state.animFrame = requestAnimationFrame(loop);
  state.accumulator += now - state.lastTime;
  state.lastTime = now;

  let steps = 0;
  while (state.accumulator >= STEP_MS && steps < 5) {
    update();
    state.accumulator -= STEP_MS;
    steps++;
  }
  draw();
}

function startLoop() {
  state.lastTime = performance.now();
  state.accumulator = 0;
  state.animFrame = requestAnimationFrame(loop);
}

function stopLoop() {
  if (state.animFrame) cancelAnimationFrame(state.animFrame);
  state.animFrame = null;
}

// ---------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------
let sfx;

function showOverlay(title, text, showButton) {
  document.getElementById("overlayTitle").textContent = title;
  overlayText.textContent = text;
  startBtn.hidden = !showButton;
  overlay.style.display = "flex";
}

function hideOverlay() {
  overlay.style.display = "none";
}

function showFinishedOverlay() {
  overlay.classList.add("finished");
  document.getElementById("overlayTitle").textContent = "";
  overlayText.textContent = "";
  startBtn.hidden = false;
  startBtn.textContent = "もう一度遊ぶ";
  overlay.style.display = "flex";
}

async function boot() {
  showOverlay("Adventure", "読み込み中...");

  try {
    const [mapText, ...tileImgs] = await Promise.all([
      loadText("assets/maps/worldmap.txt"),
      ...TILE_DEFS.map((t) => loadImage(t.src)),
    ]);

    TILE_DEFS.forEach((def, i) => {
      state.tiles.push({ img: tileImgs[i], collision: def.collision });
    });
    state.mapTileNum = parseMap(mapText);

    const objTypeNames = Object.keys(OBJECT_DEFS);
    const objImgs = await Promise.all(objTypeNames.map((t) => loadImage(OBJECT_DEFS[t].src)));
    objTypeNames.forEach((t, i) => {
      OBJECT_DEFS[t].img = objImgs[i];
    });
    state.worldObjects = OBJECT_PLACEMENTS.map(makeObjectInstance);
    state.keyIcon = OBJECT_DEFS.Key.img;

    const player = createPlayer();
    const [up, down, left, right] = await Promise.all([
      loadImage("assets/player/WalkingPlayer_back.png"),
      loadImage("assets/player/WalkingPlayer_front.png"),
      loadImage("assets/player/WalkingPlayer_left.png"),
      loadImage("assets/player/WalkingPlayer_right.png"),
    ]);
    player.sprites = { up, down, left, right };
    state.player = player;

    sfx = {
      bgm: new SfxPlayer("assets/sounds/theme4.mp3", { loop: true }),
      coin: new SfxPlayer("assets/sounds/coin2.mp3"),
      powerup: new SfxPlayer("assets/sounds/powerup2.mp3"),
      unlock: new SfxPlayer("assets/sounds/unlock2.mp3"),
      fanfare: new SfxPlayer("assets/sounds/fanfare3.mp3"),
    };

    setupInput();
    draw();
    showOverlay("Adventure", "矢印キー / WASDで移動\n鍵を集めてドアを開け、宝箱を探そう", true);
  } catch (err) {
    console.error(err);
    showOverlay("読み込みエラー", String(err.message || err));
  }
}

function start() {
  if (state.gameFinished) {
    location.reload();
    return;
  }
  hideOverlay();
  sfx.bgm.play();
  startLoop();
  canvas.focus();
}

startBtn.addEventListener("click", start);
overlay.addEventListener("click", (e) => {
  if (!startBtn.hidden) start();
});

boot();
