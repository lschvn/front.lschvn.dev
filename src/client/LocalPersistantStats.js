import { replacer } from "../core/Util";
let _startTime;
function getStats() {
    const statsStr = localStorage.getItem("game-records");
    return statsStr ? JSON.parse(statsStr) : {};
}
function save(stats) {
    // To execute asynchronously
    setTimeout(() => localStorage.setItem("game-records", JSON.stringify(stats, replacer)), 0);
}
// The user can quit the game anytime so better save the lobby as soon as the
// game starts.
export function startGame(id, lobby) {
    if (localStorage === undefined) {
        return;
    }
    _startTime = Date.now();
    const stats = getStats();
    stats[id] = { lobby };
    save(stats);
}
export function startTime() {
    return _startTime;
}
export function endGame(gameRecord) {
    if (localStorage === undefined) {
        return;
    }
    const stats = getStats();
    const gameStat = stats[gameRecord.info.gameID];
    if (!gameStat) {
        console.log("LocalPersistantStats: game not found");
        return;
    }
    gameStat.gameRecord = gameRecord;
    save(stats);
}
//# sourceMappingURL=LocalPersistantStats.js.map