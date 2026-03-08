import { AirMissionType, UnitType } from "../game/Game";

export const AIRBASE_OPERATIONAL_RANGE = 140;
export const AIRBASE_SQUADRON_CAPACITY = 4;
export const AIRBASE_COST = 1_750_000;
export const AIRBASE_CONSTRUCTION_TICKS = 20 * 10;
export const FIGHTER_SQUADRON_COST = 325_000;
export const BOMBER_SQUADRON_COST = 650_000;
export const FIGHTER_SQUADRON_HEALTH = 8;
export const BOMBER_SQUADRON_HEALTH = 10;

export const FIGHTER_INTERCEPTION_RANGE = 20;
export const FIGHTER_INTERCEPTION_DAMAGE = 4;
export const FIGHTER_ESCORT_DAMAGE_REDUCTION = 0.5;
export const FIGHTER_TICKS_PER_MOVE = 1;

export const BOMBER_TICKS_PER_MOVE = 1;
export const STRATEGIC_BOMBING_TARGET_RADIUS = 12;
export const STRATEGIC_BOMBING_STRUCTURE_DAMAGE = 1;
export const PORT_STRIKE_RADIUS = 16;
export const PORT_STRIKE_STRUCTURE_DAMAGE = 1;
export const PORT_STRIKE_SHIP_DAMAGE = 220;
export const CLOSE_AIR_SUPPORT_RADIUS = 10;
export const CLOSE_AIR_SUPPORT_CAPTURE_MULTIPLIER = 1.2;
export const CLOSE_AIR_SUPPORT_CASUALTY_MULTIPLIER = 0.85;

export const FIGHTER_MISSION_DURATION: Record<
  AirMissionType.PatrolArea | AirMissionType.EscortBombers | AirMissionType.InterceptEnemyAircraft,
  number
> = {
  [AirMissionType.PatrolArea]: 45,
  [AirMissionType.EscortBombers]: 35,
  [AirMissionType.InterceptEnemyAircraft]: 40,
};

export const BOMBER_MISSION_DURATION: Record<
  AirMissionType.StrategicBombing | AirMissionType.CloseAirSupport | AirMissionType.PortStrike,
  number
> = {
  [AirMissionType.StrategicBombing]: 6,
  [AirMissionType.CloseAirSupport]: 40,
  [AirMissionType.PortStrike]: 8,
};

export const FIGHTER_REARM_TICKS = 60;

export const BOMBER_REARM_TICKS: Record<
  AirMissionType.StrategicBombing | AirMissionType.CloseAirSupport | AirMissionType.PortStrike,
  number
> = {
  [AirMissionType.StrategicBombing]: 140,
  [AirMissionType.CloseAirSupport]: 100,
  [AirMissionType.PortStrike]: 120,
};

export const STRATEGIC_BOMBING_TARGETS = [
  UnitType.Airbase,
  UnitType.RadarStation,
  UnitType.AABattery,
  UnitType.Factory,
  UnitType.Port,
  UnitType.City,
  UnitType.SAMLauncher,
  UnitType.DefensePost,
  UnitType.MissileSilo,
] as const;

export const PORT_STRIKE_TARGETS = [
  UnitType.Port,
  UnitType.Warship,
  UnitType.TransportShip,
  UnitType.TradeShip,
] as const;
