import { SupplyState, SupplySummary } from "../game/Game";

export const SUPPLY_RECALC_INTERVAL_TICKS = 12;
export const SUPPLY_CITY_RANGE = 36;
export const SUPPLY_STRAINED_RANGE = 84;
export const SUPPLY_PORT_BLOCKADE_RADIUS = 12;
export const SUPPLY_PORT_BLOCKADE_MIN_ENEMY_STRENGTH = 2;
export const SUPPLY_ISOLATED_RESERVE_TICKS = 180;

export interface SupplyStateBalance {
  attackCaptureMultiplier: number;
  attackCasualtyMultiplier: number;
  defenderCaptureVulnerability: number;
  defenderCasualtyMultiplier: number;
}

export const SUPPLY_STATE_BALANCE: Record<
  Exclude<SupplyState, SupplyState.None>,
  SupplyStateBalance
> = {
  [SupplyState.Supplied]: {
    attackCaptureMultiplier: 1,
    attackCasualtyMultiplier: 1,
    defenderCaptureVulnerability: 1,
    defenderCasualtyMultiplier: 1,
  },
  [SupplyState.Strained]: {
    attackCaptureMultiplier: 0.9,
    attackCasualtyMultiplier: 1.06,
    defenderCaptureVulnerability: 1.05,
    defenderCasualtyMultiplier: 1.04,
  },
  [SupplyState.Isolated]: {
    attackCaptureMultiplier: 0.82,
    attackCasualtyMultiplier: 1.14,
    defenderCaptureVulnerability: 1.12,
    defenderCasualtyMultiplier: 1.08,
  },
};

export const DEPLETED_ISOLATION_BALANCE: SupplyStateBalance = {
  attackCaptureMultiplier: 0.62,
  attackCasualtyMultiplier: 1.32,
  defenderCaptureVulnerability: 1.45,
  defenderCasualtyMultiplier: 1.22,
};

export const SUPPLY_STRAINED_REINFORCEMENT_MULTIPLIER = 0.95;
export const SUPPLY_STRAINED_ECONOMIC_MULTIPLIER = 0.97;
export const SUPPLY_ISOLATED_REINFORCEMENT_MULTIPLIER = 0.92;
export const SUPPLY_ISOLATED_ECONOMIC_MULTIPLIER = 0.93;
export const SUPPLY_DEPLETED_REINFORCEMENT_MULTIPLIER = 0.82;
export const SUPPLY_DEPLETED_ECONOMIC_MULTIPLIER = 0.88;

export const SUPPLY_PORT_STRAINED_TRADE_MULTIPLIER = 0.75;
export const SUPPLY_PORT_ISOLATED_TRADE_MULTIPLIER = 0.55;
export const SUPPLY_PORT_DEPLETED_TRADE_MULTIPLIER = 0.35;
export const SUPPLY_FACTORY_STRAINED_TRAIN_MULTIPLIER = 0.8;
export const SUPPLY_FACTORY_ISOLATED_TRAIN_MULTIPLIER = 0.65;
export const SUPPLY_FACTORY_DEPLETED_TRAIN_MULTIPLIER = 0.4;

export const EMPTY_SUPPLY_SUMMARY: SupplySummary = {
  suppliedTiles: 0,
  strainedTiles: 0,
  isolatedTiles: 0,
  depletedIsolatedTiles: 0,
  reinforcementMultiplier: 1,
  economicMultiplier: 1,
};
