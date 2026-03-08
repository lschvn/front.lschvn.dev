import { AttackMode, UnitType } from "../game/Game";

export const DEFAULT_ATTACK_MODE = AttackMode.Blitz;

export interface AttackModeBalance {
  troopCommitmentMultiplier: number;
  captureSpeedMultiplier: number;
  attackerCasualtyMultiplier: number;
  fortifiedCaptureMultiplier: number;
  frontlineSuppressionDuration: number;
  frontlineSuppressionRadius: number;
  buildingDamageIntervalTicks: number;
  buildingDamagePerPulse: number;
  economicDisruptionRatio: number;
  economicDisruptionMin: bigint;
  economicDisruptionMax: bigint;
  targetPriorityRadius: number;
  targetPriorityBias: number;
}

export const ATTACK_MODE_BALANCE: Record<AttackMode, AttackModeBalance> = {
  [AttackMode.Blitz]: {
    troopCommitmentMultiplier: 1.05,
    captureSpeedMultiplier: 1.1,
    attackerCasualtyMultiplier: 1.35,
    fortifiedCaptureMultiplier: 0.75,
    frontlineSuppressionDuration: 0,
    frontlineSuppressionRadius: 0,
    buildingDamageIntervalTicks: 0,
    buildingDamagePerPulse: 0,
    economicDisruptionRatio: 0,
    economicDisruptionMin: 0n,
    economicDisruptionMax: 0n,
    targetPriorityRadius: 0,
    targetPriorityBias: 0,
  },
  [AttackMode.Siege]: {
    troopCommitmentMultiplier: 0.9,
    captureSpeedMultiplier: 0.78,
    attackerCasualtyMultiplier: 0.78,
    fortifiedCaptureMultiplier: 1,
    frontlineSuppressionDuration: 16,
    frontlineSuppressionRadius: 2,
    buildingDamageIntervalTicks: 8,
    buildingDamagePerPulse: 1,
    economicDisruptionRatio: 0,
    economicDisruptionMin: 0n,
    economicDisruptionMax: 0n,
    targetPriorityRadius: 2,
    targetPriorityBias: 6,
  },
  [AttackMode.Raid]: {
    troopCommitmentMultiplier: 0.75,
    captureSpeedMultiplier: 0.45,
    attackerCasualtyMultiplier: 1.05,
    fortifiedCaptureMultiplier: 1,
    frontlineSuppressionDuration: 0,
    frontlineSuppressionRadius: 0,
    buildingDamageIntervalTicks: 6,
    buildingDamagePerPulse: 1,
    economicDisruptionRatio: 0.015,
    economicDisruptionMin: 15_000n,
    economicDisruptionMax: 100_000n,
    targetPriorityRadius: 4,
    targetPriorityBias: 20,
  },
};

export const SIEGE_DAMAGEABLE_UNIT_TYPES = [
  UnitType.DefensePost,
  UnitType.SAMLauncher,
  UnitType.AABattery,
  UnitType.RadarStation,
  UnitType.Port,
  UnitType.Airbase,
  UnitType.Factory,
  UnitType.City,
] as const;

export const RAID_PRIORITY_UNIT_TYPES = [
  UnitType.Port,
  UnitType.Factory,
  UnitType.City,
  UnitType.TradeShip,
  UnitType.TransportShip,
] as const;

export const RAID_TARGET_PRIORITY: Record<UnitType, number> = {
  [UnitType.DefensePost]: 0,
  [UnitType.Port]: 1,
  [UnitType.Factory]: 2,
  [UnitType.City]: 3,
  [UnitType.Airbase]: 4,
  [UnitType.RadarStation]: 5,
  [UnitType.AABattery]: 6,
  [UnitType.SAMLauncher]: 7,
  [UnitType.TradeShip]: 8,
  [UnitType.TransportShip]: 9,
  [UnitType.Warship]: 99,
  [UnitType.Submarine]: 99,
  [UnitType.Shell]: 99,
  [UnitType.SAMMissile]: 99,
  [UnitType.FighterSquadron]: 99,
  [UnitType.BomberSquadron]: 99,
  [UnitType.AtomBomb]: 99,
  [UnitType.HydrogenBomb]: 99,
  [UnitType.MissileSilo]: 99,
  [UnitType.SonarStation]: 99,
  [UnitType.MIRV]: 99,
  [UnitType.MIRVWarhead]: 99,
  [UnitType.Train]: 99,
};

export function attackModeTroopCommitment(
  availableTroops: number,
  attackRatio: number,
  mode: AttackMode,
): number {
  return Math.min(
    availableTroops,
    availableTroops *
      attackRatio *
      ATTACK_MODE_BALANCE[mode].troopCommitmentMultiplier,
  );
}
