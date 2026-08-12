import { SCREEN_WIDTH, SCREEN_HEIGHT, TILE_DEFS, OBJECT_DEFS, RANDOM_OBJECT_TYPES, FIXED_OBJECT_PLACEMENTS, DEFAULT_PLAYER_TILE, PLAYER_SPRITE_SRC, SFX_SRC, GRASS_TILE, MAX_WORLD_COL, MAX_WORLD_ROW, DIFFICULTIES, DEFAULT_DIFFICULTY, BEST_TIME_STORAGE_KEY } from "./constants.js";
import { loadImage, SfxPlayer } from "./assets.js";
import { generateMap, randomizeObjectPlacements } from "./mapgen.js";
import { createPlayer, makeObjectInstance, createEnemy } from "./entities.js";
import { createInitialState } from "./state.js";
import { update } from "./gameplay.js";
import { draw } from "./render.js";
import { setupInput } from "./input.js";
import { GameLoop } from "./loop.js";
import { Overlay } from "./overlay.js";
import { randInt } from "./random.js";

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
  difficultyPanel: document.getElementById("difficultySelect"),
});

const state = createInitialState();

function loadBestTime() {
  const stored = localStorage.getItem(BEST_TIME_STORAGE_KEY);
  state.bestTime = stored !== null ? parseFloat(stored) : null;
  state.isNewBest = false;
}

// Called once, the instant gameFinished flips to true, before the finish
// screen is drawn on that same frame (see the onDraw callback below), so
// state.bestTime/isNewBest are already correct by the time render.js reads
// them.
function recordFinishTime() {
  if (state.bestTime === null || state.playTime < state.bestTime) {
    state.bestTime = state.playTime;
    state.isNewBest = true;
    localStorage.setItem(BEST_TIME_STORAGE_KEY, String(state.playTime));
  }
}

let finishRecorded = false;
const loop = new GameLoop(
  () => update(state),
  () => {
    if (state.gameFinished && !finishRecorded) {
      finishRecorded = true;
      recordFinishTime();
    }
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

// Loads tile/object images shared by every difficulty. Map generation itself
// is deferred to setupWorld() so it can be re-rolled once the player picks a
// difficulty.
async function loadAssets() {
  const tileImgs = await Promise.all(TILE_DEFS.map((t) => loadImage(t.src)));
  state.tiles = TILE_DEFS.map((def, i) => ({ img: tileImgs[i], collision: def.collision, destructibleTo: def.destructibleTo }));

  // Axe/Shield have no `src` (render.js draws them procedurally instead), so
  // only load images for the object types that actually have one.
  const objTypeNames = Object.keys(OBJECT_DEFS).filter((t) => OBJECT_DEFS[t].src);
  const objImgs = await Promise.all(objTypeNames.map((t) => loadImage(OBJECT_DEFS[t].src)));
  objTypeNames.forEach((t, i) => {
    OBJECT_DEFS[t].img = objImgs[i];
  });
  state.keyIcon = OBJECT_DEFS.Key.img;
}

// Builds the map, world objects and enemies for the chosen difficulty, and
// applies its player speed bonus. Runs synchronously since every image is
// already loaded by loadAssets().
function setupWorld(difficultyKey) {
  const difficulty = DIFFICULTIES[difficultyKey] || DIFFICULTIES[DEFAULT_DIFFICULTY];
  const objectPlacements = randomizeObjectPlacements(RANDOM_OBJECT_TYPES, FIXED_OBJECT_PLACEMENTS, DEFAULT_PLAYER_TILE);
  state.mapTileNum = generateMap(objectPlacements, DEFAULT_PLAYER_TILE, difficulty.obstacleDensity);
  state.worldObjects = objectPlacements.map(makeObjectInstance);
  state.enemies = spawnEnemies(state, DEFAULT_PLAYER_TILE, difficulty.enemyCount);
  state.player.speed += difficulty.playerSpeedBonus;
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
  loadBestTime();

  try {
    await Promise.all([loadAssets(), loadPlayer()]);
    loadSfx();

    setupInput(state, document.getElementById("touchpad"), document.getElementById("actionBtn"));
    overlay.showDifficultySelect("難易度を選んでください", "かんたん/ふつう/むずかしいから選んでね");
  } catch (err) {
    console.error(err);
    overlay.show("読み込みエラー", String(err.message || err));
  }
}

document.querySelectorAll("#difficultySelect button[data-difficulty]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    setupWorld(btn.dataset.difficulty);
    draw(ctx, state);
    const bestText = state.bestTime !== null ? `\nベストタイム: ${state.bestTime.toFixed(1)}` : "";
    overlay.show("Adventure", "矢印キー / WASDで移動\n鍵を集めてドアを開け、宝箱を探そう" + bestText, true);
  });
});

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
