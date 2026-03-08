import {
  GameMapSize,
  GameMapType,
  ProceduralWorldConfig,
  TeamGameSpawnAreas,
} from "./Game";
import { GameMap, GameMapImpl } from "./GameMap";
import { GameMapLoader } from "./GameMapLoader";
import { generateProceduralTerrainMap } from "./ProceduralMegaWorldGenerator";

export type TerrainMapData = {
  nations: Nation[];
  gameMap: GameMap;
  miniGameMap: GameMap;
  teamGameSpawnAreas?: TeamGameSpawnAreas;
};

const loadedMaps = new Map<string, TerrainMapData>();

export interface MapMetadata {
  width: number;
  height: number;
  num_land_tiles: number;
}

export interface MapManifest {
  name: string;
  map: MapMetadata;
  map4x: MapMetadata;
  map16x: MapMetadata;
  nations: Nation[];
  teamGameSpawnAreas?: TeamGameSpawnAreas;
}

export interface Nation {
  coordinates: [number, number];
  flag: string;
  name: string;
}

export async function loadTerrainMap(
  map: GameMapType,
  mapSize: GameMapSize,
  terrainMapFileLoader: GameMapLoader,
  proceduralWorld?: ProceduralWorldConfig,
): Promise<TerrainMapData> {
  const proceduralKey = proceduralWorld
    ? `:${proceduralWorld.seed}:${proceduralWorld.worldSizePreset}:${proceduralWorld.landmassStyle}:${proceduralWorld.performancePreset}`
    : "";
  const cacheKey = `${map}:${mapSize}${proceduralKey}`;
  const cached = loadedMaps.get(cacheKey);
  if (cached !== undefined) return cached;

  if (map === GameMapType.ProceduralMegaWorld) {
    const proceduralData = await generateProceduralTerrainMap(
      mapSize,
      proceduralWorld,
    );
    const result = {
      nations: proceduralData.nations,
      gameMap: proceduralData.gameMap,
      miniGameMap: proceduralData.miniGameMap,
    };
    console.log(
      `[ProceduralMegaWorld] seed=${proceduralData.metrics.seed} generation=${proceduralData.metrics.generationMs}ms chunks=${proceduralData.metrics.chunkCount} avgChunk=${proceduralData.metrics.avgChunkMs}ms maxChunk=${proceduralData.metrics.maxChunkMs}ms land=${proceduralData.metrics.landTiles}`,
    );
    loadedMaps.set(cacheKey, result);
    return result;
  }

  const mapFiles = terrainMapFileLoader.getMapData(map);
  const manifest = await mapFiles.manifest();

  const gameMap =
    mapSize === GameMapSize.Normal
      ? await genTerrainFromBin(manifest.map, await mapFiles.mapBin())
      : await genTerrainFromBin(manifest.map4x, await mapFiles.map4xBin());

  const miniMap =
    mapSize === GameMapSize.Normal
      ? await genTerrainFromBin(
          mapSize === GameMapSize.Normal ? manifest.map4x : manifest.map16x,
          await mapFiles.map4xBin(),
        )
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
    const scaled: TeamGameSpawnAreas = {};
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

export async function genTerrainFromBin(
  mapData: MapMetadata,
  data: Uint8Array,
): Promise<GameMap> {
  if (data.length !== mapData.width * mapData.height) {
    throw new Error(
      `Invalid data: buffer size ${data.length} incorrect for ${mapData.width}x${mapData.height} terrain plus 4 bytes for dimensions.`,
    );
  }

  return new GameMapImpl(
    mapData.width,
    mapData.height,
    data,
    mapData.num_land_tiles,
  );
}
