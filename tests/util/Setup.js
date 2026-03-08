import fs from "fs";
import path from "path";
import { Difficulty, GameMapSize, GameMapType, GameMode, GameType, PlayerInfo, } from "../../src/core/game/Game";
import { createGame } from "../../src/core/game/GameImpl";
import { genTerrainFromBin, } from "../../src/core/game/TerrainMapLoader";
import { UserSettings } from "../../src/core/game/UserSettings";
import { TestConfig } from "./TestConfig";
import { TestServerConfig } from "./TestServerConfig";
export async function setup(mapName, _gameConfig = {}, humans = [], currentDir = __dirname, ConfigClass = TestConfig) {
    // Suppress console.debug for tests.
    console.debug = () => { };
    // Simple binary file loading using fs.readFileSync()
    const mapBinPath = path.join(currentDir, `../testdata/maps/${mapName}/map.bin`);
    const miniMapBinPath = path.join(currentDir, `../testdata/maps/${mapName}/map4x.bin`);
    const manifestPath = path.join(currentDir, `../testdata/maps/${mapName}/manifest.json`);
    const mapBinBuffer = fs.readFileSync(mapBinPath);
    const miniMapBinBuffer = fs.readFileSync(miniMapBinPath);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const gameMap = await genTerrainFromBin(manifest.map, mapBinBuffer);
    const miniGameMap = await genTerrainFromBin(manifest.map4x, miniMapBinBuffer);
    // Configure the game
    const serverConfig = new TestServerConfig();
    const gameConfig = {
        gameMap: GameMapType.Asia,
        gameMapSize: GameMapSize.Normal,
        gameMode: GameMode.FFA,
        gameType: GameType.Singleplayer,
        difficulty: Difficulty.Medium,
        nations: "default",
        donateGold: false,
        donateTroops: false,
        bots: 0,
        infiniteGold: false,
        infiniteTroops: false,
        instantBuild: false,
        randomSpawn: false,
        ..._gameConfig,
    };
    const config = new ConfigClass(serverConfig, gameConfig, new UserSettings(), false);
    return createGame(humans, [], gameMap, miniGameMap, config);
}
export function playerInfo(name, type) {
    return new PlayerInfo(name, type, null, name);
}
//# sourceMappingURL=Setup.js.map