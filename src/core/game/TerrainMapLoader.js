import { GameMapSize } from "./Game";
import { GameMapImpl } from "./GameMap";
const loadedMaps = new Map();
export async function loadTerrainMap(map, mapSize, terrainMapFileLoader) {
    const cacheKey = `${map}:${mapSize}`;
    const cached = loadedMaps.get(cacheKey);
    if (cached !== undefined)
        return cached;
    const mapFiles = terrainMapFileLoader.getMapData(map);
    const manifest = await mapFiles.manifest();
    const gameMap = mapSize === GameMapSize.Normal
        ? await genTerrainFromBin(manifest.map, await mapFiles.mapBin())
        : await genTerrainFromBin(manifest.map4x, await mapFiles.map4xBin());
    const miniMap = mapSize === GameMapSize.Normal
        ? await genTerrainFromBin(mapSize === GameMapSize.Normal ? manifest.map4x : manifest.map16x, await mapFiles.map4xBin())
        : await genTerrainFromBin(manifest.map16x, await mapFiles.map16xBin());
    if (mapSize === GameMapSize.Compact) {
        manifest.nations.forEach((nation) => {
            nation.coordinates = [
                Math.floor(nation.coordinates[0] / 2),
                Math.floor(nation.coordinates[1] / 2),
            ];
        });
    }
    // Scale spawn areas for compact maps
    let teamGameSpawnAreas = manifest.teamGameSpawnAreas;
    if (mapSize === GameMapSize.Compact && teamGameSpawnAreas) {
        const scaled = {};
        for (const [key, areas] of Object.entries(teamGameSpawnAreas)) {
            scaled[key] = areas.map((a) => ({
                x: Math.floor(a.x / 2),
                y: Math.floor(a.y / 2),
                width: Math.max(1, Math.floor(a.width / 2)),
                height: Math.max(1, Math.floor(a.height / 2)),
            }));
        }
        teamGameSpawnAreas = scaled;
    }
    const result = {
        nations: manifest.nations,
        gameMap: gameMap,
        miniGameMap: miniMap,
        teamGameSpawnAreas,
    };
    loadedMaps.set(cacheKey, result);
    return result;
}
export async function genTerrainFromBin(mapData, data) {
    if (data.length !== mapData.width * mapData.height) {
        throw new Error(`Invalid data: buffer size ${data.length} incorrect for ${mapData.width}x${mapData.height} terrain plus 4 bytes for dimensions.`);
    }
    return new GameMapImpl(mapData.width, mapData.height, data, mapData.num_land_tiles);
}
//# sourceMappingURL=TerrainMapLoader.js.map