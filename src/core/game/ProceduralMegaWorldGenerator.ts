import { GameMapSize, ProceduralWorldConfig } from "./Game";
import { GameMap, GameMapImpl } from "./GameMap";
import {
  PROCEDURAL_CHUNK_ROWS,
  PROCEDURAL_DEFAULT_NATIONS,
  PROCEDURAL_LANDMASS_BASE_THRESHOLD,
  PROCEDURAL_MEGA_WORLD_DEFAULT_SEED,
  PROCEDURAL_WORLD_DIMENSIONS,
} from "./ProceduralMegaWorldConstants";
import type { MapManifest, Nation } from "./TerrainMapLoader";

type ProceduralGenerationMetrics = {
  seed: string;
  generationMs: number;
  chunkCount: number;
  avgChunkMs: number;
  maxChunkMs: number;
  landTiles: number;
};

export type ProceduralTerrainMapData = {
  nations: Nation[];
  gameMap: GameMap;
  miniGameMap: GameMap;
  metrics: ProceduralGenerationMetrics;
};

export function normalizeProceduralConfig(
  config?: ProceduralWorldConfig,
): ProceduralWorldConfig {
  return {
    seed: config?.seed?.trim() || PROCEDURAL_MEGA_WORLD_DEFAULT_SEED,
    worldSizePreset: config?.worldSizePreset ?? "Mega",
    landmassStyle: config?.landmassStyle ?? "Balanced",
    performancePreset: config?.performancePreset ?? "Balanced",
  } as ProceduralWorldConfig;
}

export function createProceduralManifest(
  gameMapSize: GameMapSize = GameMapSize.Normal,
  config?: ProceduralWorldConfig,
): MapManifest {
  const procedural = normalizeProceduralConfig(config);
  const base = PROCEDURAL_WORLD_DIMENSIONS[procedural.worldSizePreset];
  const scale = gameMapSize === GameMapSize.Compact ? 0.5 : 1;
  const width = Math.max(128, Math.floor(base.width * scale));
  const height = Math.max(64, Math.floor(base.height * scale));
  const defaultNationCount = PROCEDURAL_DEFAULT_NATIONS[procedural.performancePreset];
  const nations: Nation[] = Array.from({ length: defaultNationCount }, (_, i) => ({
    coordinates: [0, 0],
    flag: "UN",
    name: `Mega Nation ${i + 1}`,
  }));
  const numTiles = width * height;
  const miniWidth = Math.max(1, Math.floor(width / 2));
  const miniHeight = Math.max(1, Math.floor(height / 2));
  const microWidth = Math.max(1, Math.floor(miniWidth / 2));
  const microHeight = Math.max(1, Math.floor(miniHeight / 2));
  return {
    name: "Procedural Mega World",
    map: { width, height, num_land_tiles: Math.floor(numTiles * 0.52) },
    map4x: {
      width: miniWidth,
      height: miniHeight,
      num_land_tiles: Math.floor((miniWidth * miniHeight) * 0.52),
    },
    map16x: {
      width: microWidth,
      height: microHeight,
      num_land_tiles: Math.floor((microWidth * microHeight) * 0.52),
    },
    nations,
  };
}

export async function generateProceduralTerrainMap(
  mapSize: GameMapSize,
  config?: ProceduralWorldConfig,
): Promise<ProceduralTerrainMapData> {
  const procedural = normalizeProceduralConfig(config);
  const base = PROCEDURAL_WORLD_DIMENSIONS[procedural.worldSizePreset];
  const scale = mapSize === GameMapSize.Compact ? 0.5 : 1;
  const width = Math.max(128, Math.floor(base.width * scale));
  const height = Math.max(64, Math.floor(base.height * scale));
  const seedHash = fnv1a32(procedural.seed);
  const terrain = new Uint8Array(width * height);
  const chunkDurations: number[] = [];
  const generationStart = performance.now();
  let landTiles = 0;

  const baseThreshold = PROCEDURAL_LANDMASS_BASE_THRESHOLD[procedural.landmassStyle];
  const styleTurbulence =
    procedural.landmassStyle === "Fractured World"
      ? 0.22
      : procedural.landmassStyle === "Young World"
        ? 0.1
        : procedural.landmassStyle === "War Torn"
          ? 0.16
          : 0.13;

  for (let rowStart = 0; rowStart < height; rowStart += PROCEDURAL_CHUNK_ROWS) {
    const chunkStart = performance.now();
    const rowEnd = Math.min(height, rowStart + PROCEDURAL_CHUNK_ROWS);
    for (let y = rowStart; y < rowEnd; y++) {
      const ny = y / height - 0.5;
      for (let x = 0; x < width; x++) {
        const nx = x / width - 0.5;
        const idx = y * width + x;
        const continent = fbm2d(nx * 1.7, ny * 1.7, seedHash, 5);
        const detail = fbm2d(nx * 6.4, ny * 6.4, seedHash ^ 0x7f4a7c15, 3);
        const ridge = 1 - Math.abs(fbm2d(nx * 2.8, ny * 2.8, seedHash ^ 0x44ad12e1, 4) * 2 - 1);
        const radialMask = 1 - clamp01(Math.sqrt(nx * nx * 1.15 + ny * ny * 1.7));
        const turbulence =
          (valueNoise2d(nx * 8.2, ny * 8.2, seedHash ^ 0x13579bdf) - 0.5) *
          styleTurbulence;
        const elevation =
          continent * 0.6 + detail * 0.18 + ridge * 0.12 + radialMask * 0.22 + turbulence;
        const threshold =
          baseThreshold +
          (valueNoise2d(nx * 1.6, ny * 1.6, seedHash ^ 0x91ac4f2b) - 0.5) * 0.06;
        const isLand = elevation > threshold;
        if (isLand) {
          landTiles++;
        }
        const magnitude = isLand
          ? clampInt(Math.floor(clamp01((elevation - threshold) / (1 - threshold)) * 30), 0, 30)
          : clampInt(Math.floor(clamp01((threshold - elevation) / Math.max(0.1, threshold)) * 12), 0, 31);
        terrain[idx] = (isLand ? 0b1000_0000 : 0) | magnitude;
      }
    }
    chunkDurations.push(performance.now() - chunkStart);
    await Promise.resolve();
  }

  const oceanMask = classifyOceanMask(terrain, width, height);
  markShorelines(terrain, width, height);
  applyOceanMask(terrain, oceanMask);

  const mini = downsampleTerrain(terrain, width, height);
  const nationCount = PROCEDURAL_DEFAULT_NATIONS[procedural.performancePreset];
  const nations = generateNations(terrain, width, height, nationCount, seedHash ^ 0xabc44211);
  const metrics: ProceduralGenerationMetrics = {
    seed: procedural.seed,
    generationMs: Math.round(performance.now() - generationStart),
    chunkCount: chunkDurations.length,
    avgChunkMs:
      chunkDurations.length > 0
        ? Math.round((chunkDurations.reduce((s, v) => s + v, 0) / chunkDurations.length) * 100) / 100
        : 0,
    maxChunkMs:
      chunkDurations.length > 0
        ? Math.round(Math.max(...chunkDurations) * 100) / 100
        : 0,
    landTiles,
  };

  return {
    nations,
    gameMap: new GameMapImpl(width, height, terrain, landTiles),
    miniGameMap: new GameMapImpl(mini.width, mini.height, mini.terrain, mini.landTiles),
    metrics,
  };
}

function generateNations(
  terrain: Uint8Array,
  width: number,
  height: number,
  target: number,
  seed: number,
): Nation[] {
  const candidates: number[] = [];
  for (let y = 6; y < height - 6; y += 2) {
    for (let x = 6; x < width - 6; x += 2) {
      const ref = y * width + x;
      if (!isLand(terrain[ref]) || isShoreline(terrain[ref])) {
        continue;
      }
      const density = localLandDensity(terrain, width, height, x, y, 3);
      if (density < 0.68) {
        continue;
      }
      candidates.push(ref);
    }
  }

  const random = mulberry32(seed);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const chosen: number[] = [];
  let minDistance = Math.max(
    12,
    Math.floor(Math.sqrt((width * height) / Math.max(1, target)) * 0.45),
  );

  while (chosen.length < target && minDistance >= 3) {
    chosen.length = 0;
    for (const ref of candidates) {
      if (chosen.length >= target) {
        break;
      }
      const x = ref % width;
      const y = Math.floor(ref / width);
      if (
        chosen.every((s) => {
          const sx = s % width;
          const sy = Math.floor(s / width);
          const dx = sx - x;
          const dy = sy - y;
          return dx * dx + dy * dy >= minDistance * minDistance;
        })
      ) {
        chosen.push(ref);
      }
    }
    minDistance -= 2;
  }

  return chosen.slice(0, target).map((ref, idx) => ({
    coordinates: [ref % width, Math.floor(ref / width)],
    flag: "UN",
    name: `Mega Nation ${idx + 1}`,
  }));
}

function localLandDensity(
  terrain: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
): number {
  let land = 0;
  let total = 0;
  for (let y = Math.max(0, cy - radius); y <= Math.min(height - 1, cy + radius); y++) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(width - 1, cx + radius); x++) {
      total++;
      if (isLand(terrain[y * width + x])) {
        land++;
      }
    }
  }
  return total > 0 ? land / total : 0;
}

function downsampleTerrain(
  source: Uint8Array,
  width: number,
  height: number,
): { terrain: Uint8Array; width: number; height: number; landTiles: number } {
  const targetWidth = Math.max(1, Math.floor(width / 2));
  const targetHeight = Math.max(1, Math.floor(height / 2));
  const terrain = new Uint8Array(targetWidth * targetHeight);
  let landTiles = 0;

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const sx = x * 2;
      const sy = y * 2;
      const refs = [
        sy * width + sx,
        sy * width + Math.min(width - 1, sx + 1),
        Math.min(height - 1, sy + 1) * width + sx,
        Math.min(height - 1, sy + 1) * width + Math.min(width - 1, sx + 1),
      ];
      let landCount = 0;
      let oceanCount = 0;
      let magnitudeSum = 0;
      for (const ref of refs) {
        const t = source[ref];
        if (isLand(t)) {
          landCount++;
        } else if (isOcean(t)) {
          oceanCount++;
        }
        magnitudeSum += magnitude(t);
      }
      const isLandTile = landCount >= 2;
      if (isLandTile) {
        landTiles++;
      }
      const mag = clampInt(Math.floor(magnitudeSum / refs.length), 0, 31);
      let bits = mag;
      if (isLandTile) {
        bits |= 0b1000_0000;
      } else if (oceanCount >= 2) {
        bits |= 0b0010_0000;
      }
      terrain[y * targetWidth + x] = bits;
    }
  }

  markShorelines(terrain, targetWidth, targetHeight);
  return { terrain, width: targetWidth, height: targetHeight, landTiles };
}

function applyOceanMask(terrain: Uint8Array, oceanMask: Uint8Array): void {
  for (let i = 0; i < terrain.length; i++) {
    if (!isLand(terrain[i]) && oceanMask[i] === 1) {
      terrain[i] |= 0b0010_0000;
    }
  }
}

function classifyOceanMask(
  terrain: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const mask = new Uint8Array(terrain.length);
  const queue = new Int32Array(terrain.length);
  let head = 0;
  let tail = 0;

  const enqueue = (ref: number) => {
    if (mask[ref] === 1 || isLand(terrain[ref])) {
      return;
    }
    mask[ref] = 1;
    queue[tail++] = ref;
  };

  for (let x = 0; x < width; x++) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    enqueue(y * width);
    enqueue(y * width + (width - 1));
  }

  while (head < tail) {
    const ref = queue[head++];
    const x = ref % width;
    const y = Math.floor(ref / width);
    if (x > 0) enqueue(ref - 1);
    if (x + 1 < width) enqueue(ref + 1);
    if (y > 0) enqueue(ref - width);
    if (y + 1 < height) enqueue(ref + width);
  }

  return mask;
}

function markShorelines(terrain: Uint8Array, width: number, height: number): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ref = y * width + x;
      const land = isLand(terrain[ref]);
      let shoreline = false;
      if (x > 0 && isLand(terrain[ref - 1]) !== land) shoreline = true;
      else if (x + 1 < width && isLand(terrain[ref + 1]) !== land) shoreline = true;
      else if (y > 0 && isLand(terrain[ref - width]) !== land) shoreline = true;
      else if (y + 1 < height && isLand(terrain[ref + width]) !== land) shoreline = true;
      if (shoreline) {
        terrain[ref] |= 0b0100_0000;
      }
    }
  }
}

function fbm2d(x: number, y: number, seed: number, octaves: number): number {
  let total = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let ampSum = 0;
  for (let i = 0; i < octaves; i++) {
    total += valueNoise2d(x * frequency, y * frequency, seed + i * 1013) * amplitude;
    ampSum += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return ampSum > 0 ? total / ampSum : 0;
}

function valueNoise2d(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const v00 = hash2d(seed, x0, y0);
  const v10 = hash2d(seed, x0 + 1, y0);
  const v01 = hash2d(seed, x0, y0 + 1);
  const v11 = hash2d(seed, x0 + 1, y0 + 1);
  const sx = smoothstep(tx);
  const sy = smoothstep(ty);
  const ix0 = lerp(v00, v10, sx);
  const ix1 = lerp(v01, v11, sx);
  return lerp(ix0, ix1, sy);
}

function hash2d(seed: number, x: number, y: number): number {
  let h = seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let n = Math.imul(t ^ (t >>> 15), 1 | t);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

function isLand(value: number): boolean {
  return (value & 0b1000_0000) !== 0;
}

function isShoreline(value: number): boolean {
  return (value & 0b0100_0000) !== 0;
}

function isOcean(value: number): boolean {
  return (value & 0b0010_0000) !== 0;
}

function magnitude(value: number): number {
  return value & 0b0001_1111;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n | 0));
}
