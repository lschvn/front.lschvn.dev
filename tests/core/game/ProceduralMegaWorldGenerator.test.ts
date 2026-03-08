import {
  GameMapSize,
  ProceduralLandmassStyle,
  ProceduralPerformancePreset,
  ProceduralWorldSizePreset,
} from "../../../src/core/game/Game";
import { generateProceduralTerrainMap } from "../../../src/core/game/ProceduralMegaWorldGenerator";

function terrainFingerprint(map: {
  width: () => number;
  height: () => number;
  isLand: (ref: number) => boolean;
  magnitude: (ref: number) => number;
  isOcean: (ref: number) => boolean;
}): number {
  let hash = 2166136261 >>> 0;
  const width = map.width();
  const height = map.height();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ref = y * width + x;
      const value =
        (map.isLand(ref) ? 1 : 0) |
        ((map.isOcean(ref) ? 1 : 0) << 1) |
        (map.magnitude(ref) << 2);
      hash ^= value + ref;
      hash = Math.imul(hash, 16777619);
    }
  }
  return hash >>> 0;
}

describe("Procedural mega world generation", () => {
  test("same seed/config generates identical terrain", async () => {
    const config = {
      seed: "deterministic-seed-123",
      worldSizePreset: ProceduralWorldSizePreset.Mega,
      landmassStyle: ProceduralLandmassStyle.Balanced,
      performancePreset: ProceduralPerformancePreset.Balanced,
    };
    const a = await generateProceduralTerrainMap(GameMapSize.Compact, config);
    const b = await generateProceduralTerrainMap(GameMapSize.Compact, config);
    expect(terrainFingerprint(a.gameMap)).toBe(terrainFingerprint(b.gameMap));
    expect(a.nations).toEqual(b.nations);
  });

  test("different seeds generate different terrain", async () => {
    const configA = {
      seed: "seed-a",
      worldSizePreset: ProceduralWorldSizePreset.Mega,
      landmassStyle: ProceduralLandmassStyle.Balanced,
      performancePreset: ProceduralPerformancePreset.Balanced,
    };
    const configB = {
      ...configA,
      seed: "seed-b",
    };
    const a = await generateProceduralTerrainMap(GameMapSize.Compact, configA);
    const b = await generateProceduralTerrainMap(GameMapSize.Compact, configB);
    expect(terrainFingerprint(a.gameMap)).not.toBe(terrainFingerprint(b.gameMap));
  });

  test("nations spawn on valid land with spacing", async () => {
    const gameData = await generateProceduralTerrainMap(GameMapSize.Compact, {
      seed: "nation-spacing",
      worldSizePreset: ProceduralWorldSizePreset.Mega,
      landmassStyle: ProceduralLandmassStyle.WarTorn,
      performancePreset: ProceduralPerformancePreset.Quality,
    });
    const refs = new Set<number>();
    for (const nation of gameData.nations) {
      const ref = gameData.gameMap.ref(nation.coordinates[0], nation.coordinates[1]);
      refs.add(ref);
      expect(gameData.gameMap.isLand(ref)).toBe(true);
      expect(gameData.gameMap.isShore(ref)).toBe(false);
    }
    expect(refs.size).toBe(gameData.nations.length);
  });
});
