// Mutable game state shared by the update/render/collision modules. Kept as a
// single plain object (mirrors the original GamePanel fields) rather than
// scattered globals, so it can be threaded explicitly through function calls.
export function createInitialState() {
  return {
    tiles: [],
    mapTileNum: [],
    worldObjects: [],
    enemies: [],
    player: null,
    keyIcon: null,
    sfx: null,
    keysHeld: new Set(),
    actionKeyDown: false,
    actionQueued: false,
    messageOn: false,
    message: "",
    messageCounter: 0,
    playTime: 0,
    gameFinished: false,
    gameOver: false,
    hiddenTotal: 0,
    hiddenCollected: 0,
  };
}
