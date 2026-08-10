import { SCREEN_WIDTH, SCREEN_HEIGHT, TILE_DEFS, OBJECT_DEFS, OBJECT_PLACEMENTS, DEFAULT_PLAYER_TILE, PLAYER_SPRITE_SRC, SFX_SRC } from "./constants.js";
import { loadImage, SfxPlayer } from "./assets.js";
import { generateMap } from "./mapgen.js";
import { createPlayer, makeObjectInstance } from "./entities.js";
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
    if (draw(ctx, state)) {
      loop.stop();
      overlay.showFinished();
    }
  }
);

async function loadWorld() {
  const tileImgs = await Promise.all(TILE_DEFS.map((t) => loadImage(t.src)));

  state.tiles = TILE_DEFS.map((def, i) => ({ img: tileImgs[i], collision: def.collision, destructibleTo: def.destructibleTo }));
  state.mapTileNum = generateMap(OBJECT_PLACEMENTS, DEFAULT_PLAYER_TILE);

  const objTypeNames = Object.keys(OBJECT_DEFS);
  const objImgs = await Promise.all(objTypeNames.map((t) => loadImage(OBJECT_DEFS[t].src)));
  objTypeNames.forEach((t, i) => {
    OBJECT_DEFS[t].img = objImgs[i];
  });
  state.worldObjects = OBJECT_PLACEMENTS.map(makeObjectInstance);
  state.keyIcon = OBJECT_DEFS.Key.img;
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
  if (state.gameFinished) {
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
