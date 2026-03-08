import {
  ProceduralLandmassStyle,
  ProceduralPerformancePreset,
  ProceduralWorldSizePreset,
} from "./Game";

export const PROCEDURAL_MEGA_WORLD_DEFAULT_SEED = "openfront-mega-world";
export const PROCEDURAL_MEGA_WORLD_MAX_BOTS = 2000;
export const PROCEDURAL_MEGA_WORLD_MAX_NATIONS = 500;
export const PROCEDURAL_CHUNK_ROWS = 64;

export const PROCEDURAL_WORLD_DIMENSIONS: Record<
  ProceduralWorldSizePreset,
  { width: number; height: number }
> = {
  [ProceduralWorldSizePreset.Mega]: { width: 2048, height: 1024 },
  [ProceduralWorldSizePreset.Vast]: { width: 2560, height: 1280 },
  [ProceduralWorldSizePreset.Colossal]: { width: 3072, height: 1536 },
};

export const PROCEDURAL_LANDMASS_BASE_THRESHOLD: Record<
  ProceduralLandmassStyle,
  number
> = {
  [ProceduralLandmassStyle.Balanced]: 0.51,
  [ProceduralLandmassStyle.YoungWorld]: 0.46,
  [ProceduralLandmassStyle.FracturedWorld]: 0.57,
  [ProceduralLandmassStyle.WarTorn]: 0.53,
};

export const PROCEDURAL_DEFAULT_NATIONS: Record<
  ProceduralPerformancePreset,
  number
> = {
  [ProceduralPerformancePreset.Quality]: 220,
  [ProceduralPerformancePreset.Balanced]: 320,
  [ProceduralPerformancePreset.MassiveScale]: 500,
};

export const PROCEDURAL_AI_LOD_INTERVALS: Record<
  ProceduralPerformancePreset,
  { active: number; strategic: number; remote: number }
> = {
  [ProceduralPerformancePreset.Quality]: { active: 1, strategic: 3, remote: 8 },
  [ProceduralPerformancePreset.Balanced]: {
    active: 1,
    strategic: 5,
    remote: 15,
  },
  [ProceduralPerformancePreset.MassiveScale]: {
    active: 1,
    strategic: 8,
    remote: 24,
  },
};
