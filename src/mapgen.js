import {
  MAX_WORLD_COL,
  MAX_WORLD_ROW,
  TILE_DEFS,
  GRASS_TILE,
  WATER_TILE,
  EARTH_TILE,
  TREE_TILE,
  SAND_TILE,
  FLOWER_TILE,
  PATH_TILE,
  BUSH_TILE,
  ROCK_TILE,
  WALL_TILE,
} from "./constants.js";

// ---------------------------------------------------------------------
// Procedural map generation. Produces a fresh MAX_WORLD_COL x MAX_WORLD_ROW
// grid (same [col][row] shape map.js#parseMap used to build from the static
// worldmap.txt) every time it's called, then guarantees the result is
// actually playable: the player start and every fixed object placement
// (keys/doors/chest/boots) stay reachable from one another.
// ---------------------------------------------------------------------

function makeGrid(fill) {
  const grid = [];
  for (let col = 0; col < MAX_WORLD_COL; col++) {
    grid.push(new Array(MAX_WORLD_ROW).fill(fill));
  }
  return grid;
}

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// "Drunkard's walk" blob painter: wanders from a random interior point,
// painting a small disc of `tile` at each step. Produces organic-looking
// clusters instead of hard-edged rectangles. `canPaint` optionally
// restricts which existing tiles may be overwritten.
function paintBlob(grid, tile, { steps, radius, canPaint }) {
  let col = randInt(2, MAX_WORLD_COL - 3);
  let row = randInt(2, MAX_WORLD_ROW - 3);

  for (let s = 0; s < steps; s++) {
    const r = radius();
    for (let dc = -r; dc <= r; dc++) {
      for (let dr = -r; dr <= r; dr++) {
        if (dc * dc + dr * dr > r * r) continue;
        const c = col + dc;
        const rr = row + dr;
        if (c < 1 || c >= MAX_WORLD_COL - 1 || rr < 1 || rr >= MAX_WORLD_ROW - 1) continue;
        if (canPaint && !canPaint(grid[c][rr])) continue;
        grid[c][rr] = tile;
      }
    }
    col += randInt(-2, 2);
    row += randInt(-2, 2);
    col = Math.max(2, Math.min(MAX_WORLD_COL - 3, col));
    row = Math.max(2, Math.min(MAX_WORLD_ROW - 3, row));
  }
}

function paintBlobs(grid, tile, count, opts) {
  for (let i = 0; i < count; i++) paintBlob(grid, tile, opts);
}

function isSolid(tile) {
  return TILE_DEFS[tile].collision;
}

// Flood-fills from `sources` over non-solid tiles, returning the set of
// reachable "col,row" keys.
function reachableSet(grid, sources) {
  const seen = new Set();
  const queue = [...sources];
  for (const key of sources) seen.add(key);

  while (queue.length) {
    const [col, row] = queue.shift().split(",").map(Number);
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = col + dc;
      const r = row + dr;
      if (c < 0 || c >= MAX_WORLD_COL || r < 0 || r >= MAX_WORLD_ROW) continue;
      const key = `${c},${r}`;
      if (seen.has(key) || isSolid(grid[c][r])) continue;
      seen.add(key);
      queue.push(key);
    }
  }
  return seen;
}

// 0-1 BFS from every tile in `sources` to `target`: moving into a non-solid
// tile costs 0, moving into a solid tile costs 1 (it will need to be carved
// away). Returns the list of solid [col, row] cells on the cheapest path,
// i.e. the minimal set of obstacles standing between the reachable region
// and the target.
function cheapestCarve(grid, sources, target) {
  const dist = new Map();
  const prev = new Map();
  const deque = [];

  for (const key of sources) {
    dist.set(key, 0);
    deque.push(key);
  }

  const targetKey = `${target[0]},${target[1]}`;

  while (deque.length) {
    const key = deque.shift();
    const d = dist.get(key);
    if (key === targetKey) break;

    const [col, row] = key.split(",").map(Number);
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = col + dc;
      const r = row + dr;
      if (c < 0 || c >= MAX_WORLD_COL || r < 0 || r >= MAX_WORLD_ROW) continue;
      const nKey = `${c},${r}`;
      const cost = isSolid(grid[c][r]) ? 1 : 0;
      const nd = d + cost;
      if (dist.has(nKey) && dist.get(nKey) <= nd) continue;
      dist.set(nKey, nd);
      prev.set(nKey, key);
      if (cost === 0) deque.unshift(nKey);
      else deque.push(nKey);
    }
  }

  const path = [];
  let cur = targetKey;
  while (prev.has(cur)) {
    const [c, r] = cur.split(",").map(Number);
    if (isSolid(grid[c][r])) path.push([c, r]);
    cur = prev.get(cur);
  }
  return path;
}

// Ensures every position in `mustReach` (plus the implicit spawn source) can
// be walked to from spawn, carving the minimal number of solid tiles to
// grass wherever generation happened to seal off an area.
function ensureConnectivity(grid, spawn, mustReach) {
  for (const [col, row] of mustReach) {
    const reached = reachableSet(grid, [`${spawn[0]},${spawn[1]}`]);
    if (reached.has(`${col},${row}`)) continue;

    const carve = cheapestCarve(grid, reached, [col, row]);
    for (const [c, r] of carve) grid[c][r] = GRASS_TILE;
  }
}

const HIDDEN_BORDER_MARGIN = 3;
const HIDDEN_MIN_SPAWN_DISTANCE = 6;
const HIDDEN_MIN_SPACING = 4;

function distanceBetween([c1, r1], [c2, r2]) {
  return Math.hypot(c1 - c2, r1 - r2);
}

// Picks `count` random tile positions for hidden collectibles, spaced apart
// from each other, from the player spawn, and from `existingPlacements` (the
// key/door/chest/boots objects). The caller must fold these positions into
// generateMap()'s objectPlacements so ensureConnectivity() guarantees they
// stay reachable.
export function placeHiddenItems(count, playerTile, existingPlacements) {
  const placed = existingPlacements.map((o) => [o.col, o.row]);
  const items = [];
  for (let i = 0; i < count; i++) {
    let col, row;
    let attempts = 0;
    do {
      col = randInt(HIDDEN_BORDER_MARGIN, MAX_WORLD_COL - 1 - HIDDEN_BORDER_MARGIN);
      row = randInt(HIDDEN_BORDER_MARGIN, MAX_WORLD_ROW - 1 - HIDDEN_BORDER_MARGIN);
      attempts++;
    } while (
      attempts < 500 &&
      (distanceBetween([col, row], playerTile) < HIDDEN_MIN_SPAWN_DISTANCE ||
        placed.some((p) => distanceBetween([col, row], p) < HIDDEN_MIN_SPACING))
    );
    placed.push([col, row]);
    items.push({ col, row });
  }
  return items;
}

export function generateMap(objectPlacements, playerTile) {
  const grid = makeGrid(GRASS_TILE);

  // World border: impassable trees, mirroring the original hand-authored map.
  for (let col = 0; col < MAX_WORLD_COL; col++) {
    grid[col][0] = TREE_TILE;
    grid[col][MAX_WORLD_ROW - 1] = TREE_TILE;
  }
  for (let row = 0; row < MAX_WORLD_ROW; row++) {
    grid[0][row] = TREE_TILE;
    grid[MAX_WORLD_COL - 1][row] = TREE_TILE;
  }

  // Lakes, then a sandy beach ring around them.
  paintBlobs(grid, WATER_TILE, randInt(3, 5), { steps: randInt(10, 18), radius: () => randInt(1, 3) });
  for (let col = 1; col < MAX_WORLD_COL - 1; col++) {
    for (let row = 1; row < MAX_WORLD_ROW - 1; row++) {
      if (grid[col][row] !== GRASS_TILE) continue;
      const neighbors = [[col + 1, row], [col - 1, row], [col, row + 1], [col, row - 1]];
      if (neighbors.some(([c, r]) => grid[c][r] === WATER_TILE)) grid[col][row] = SAND_TILE;
    }
  }

  // Dirt clearings and stone paths for terrain variety.
  paintBlobs(grid, EARTH_TILE, randInt(4, 6), {
    steps: randInt(8, 14),
    radius: () => randInt(1, 2),
    canPaint: (t) => t === GRASS_TILE,
  });
  paintBlobs(grid, PATH_TILE, randInt(3, 5), {
    steps: randInt(10, 16),
    radius: () => 1,
    canPaint: (t) => t === GRASS_TILE,
  });

  // Forests and shrubs (destructible obstacles) and rocky outcrops
  // (permanent obstacles) scattered across the remaining grass.
  paintBlobs(grid, TREE_TILE, randInt(10, 16), {
    steps: randInt(10, 22),
    radius: () => randInt(1, 2),
    canPaint: (t) => t === GRASS_TILE,
  });
  paintBlobs(grid, BUSH_TILE, randInt(6, 10), {
    steps: randInt(3, 7),
    radius: () => 1,
    canPaint: (t) => t === GRASS_TILE,
  });
  paintBlobs(grid, ROCK_TILE, randInt(5, 8), {
    steps: randInt(2, 5),
    radius: () => 1,
    canPaint: (t) => t === GRASS_TILE,
  });

  // Small ruined-wall clusters for extra obstacle variety.
  paintBlobs(grid, WALL_TILE, randInt(3, 5), {
    steps: randInt(2, 4),
    radius: () => 1,
    canPaint: (t) => t === GRASS_TILE,
  });

  // Purely decorative, non-solid flower patches on top of grass.
  paintBlobs(grid, FLOWER_TILE, randInt(8, 14), {
    steps: randInt(4, 8),
    radius: () => 1,
    canPaint: (t) => t === GRASS_TILE,
  });

  // Guarantee the spawn point and every object placement sit on open ground.
  const keyPositions = [playerTile, ...objectPlacements.map((o) => [o.col, o.row])];
  for (const [col, row] of keyPositions) {
    grid[col][row] = GRASS_TILE;
  }

  ensureConnectivity(grid, playerTile, keyPositions);

  return grid;
}
