import { SCREEN_WIDTH, SCREEN_HEIGHT, TILE_DEFS, OBJECT_DEFS, RANDOM_OBJECT_TYPES, FIXED_OBJECT_PLACEMENTS, DEFAULT_PLAYER_TILE, PLAYER_SPRITE_SRC, SFX_SRC, GRASS_TILE, MAX_WORLD_COL, MAX_WORLD_ROW, ENEMY_COUNT } from "./constants.js";
import { loadImage, SfxPlayer } from "./assets.js";
import { generateMap, randomizeObjectPlacements } from "./mapgen.js";
import { createPlayer, makeObjectInstance, createEnemy } from "./entities.js";
import { createInitialState } from "./state.js";
import { update } from "./gameplay.js";
import { draw } from "./render.js";
import { setupInput } from "./input.js";
import { GameLoop } from "./loop.js";
import { Overlay } from "./overlay.js";

const canvas = document.getElementById("game");
canvas.width = SCREEN_WIDTH;
canvas.height = SCREEN_HEIGHT;
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const overlay = new Overlay({
  root: document.getElementById("overlay"),
  title: document.getElementById("overlayTitle"),
  text: document.getElementById("overlayText"),
  button: document.getElementById("startBtn"),
});

const state = createInitialState();
const loop = new GameLoop(
  () => update(state),
  () => {
    const result = draw(ctx, state);
    if (result === "finished") {
      loop.stop();
      overlay.showFinished();
    } else if (result === "gameover") {
      loop.stop();
      overlay.showGameOver();
    }
  }
);

async function loadWorld() {
  const tileImgs = await Promise.all(TILE_DEFS.map((t) => loadImage(t.src)));

  const objectPlacements = randomizeObjectPlacements(RANDOM_OBJECT_TYPES, FIXED_OBJECT_PLACEMENTS, DEFAULT_PLAYER_TILE);

  state.tiles = TILE_DEFS.map((def, i) => ({ img: tileImgs[i], collision: def.collision, destructibleTo: def.destructibleTo }));
  state.mapTileNum = generateMap(objectPlacements, DEFAULT_PLAYER_TILE);

  const objTypeNames = Object.keys(OBJECT_DEFS);
  const objImgs = await Promise.all(objTypeNames.map((t) => loadImage(OBJECT_DEFS[t].src)));
  objTypeNames.forEach((t, i) => {
    OBJECT_DEFS[t].img = objImgs[i];
  });
  state.worldObjects = objectPlacements.map(makeObjectInstance);
  state.keyIcon = OBJECT_DEFS.Key.img;
  state.enemies = spawnEnemies(state, DEFAULT_PLAYER_TILE, ENEMY_COUNT);
}

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Scatters enemies on open ground, away from the player's spawn tile, so the
// player isn't ambushed the instant the game starts.
function spawnEnemies(state, playerTile, count) {
  const enemies = [];
  let attempts = 0;
  while (enemies.length < count && attempts < 1000) {
    attempts++;
    const col = randInt(2, MAX_WORLD_COL - 3);
    const row = randInt(2, MAX_WORLD_ROW - 3);
    if (state.mapTileNum[col][row] !== GRASS_TILE) continue;
    const dx = col - playerTile[0];
    const dy = row - playerTile[1];
    if (dx * dx + dy * dy < 36) continue;
    enemies.push(createEnemy(col, row));
  }
  return enemies;
}

async function loadPlayer() {
  const player = createPlayer();
  const entries = Object.entries(PLAYER_SPRITE_SRC);
  const frameSets = await Promise.all(
    entries.map(([, srcs]) => Promise.all(srcs.map(loadImage)))
  );
  entries.forEach(([direction], i) => {
    player.sprites[direction] = frameSets[i];
  });
  state.player = player;
}

function loadSfx() {
  state.sfx = Object.fromEntries(
    Object.entries(SFX_SRC).map(([name, { src, loop }]) => [name, new SfxPlayer(src, { loop })])
  );
}

async function boot() {
  overlay.show("Adventure", "読み込み中...");

  try {
    await Promise.all([loadWorld(), loadPlayer()]);
    loadSfx();

    setupInput(state, document.getElementById("touchpad"), document.getElementById("actionBtn"));
    draw(ctx, state);
    overlay.show("Adventure", "矢印キー / WASDで移動\n鍵を集めてドアを開け、宝箱を探そう", true);
  } catch (err) {
    console.error(err);
    overlay.show("読み込みエラー", String(err.message || err));
  }
}

function start() {
  if (state.gameFinished || state.gameOver) {
    location.reload();
    return;
  }
  overlay.hide();
  state.sfx.bgm.play();
  loop.start();
  canvas.focus();
}

document.getElementById("startBtn").addEventListener("click", start);
document.getElementById("overlay").addEventListener("click", () => {
  if (overlay.isStartVisible) start();
});

boot();
