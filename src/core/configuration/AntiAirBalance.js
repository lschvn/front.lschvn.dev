import { AirMissionType, UnitType } from "../game/Game";
export const AA_BATTERY_COST = 650000;
export const AA_BATTERY_CONSTRUCTION_TICKS = 10 * 10;
export const AA_BATTERY_ENGAGEMENT_RANGE = 28;
export const AA_BATTERY_COOLDOWN = 8;
export const AA_BATTERY_LOCKON_TICKS = 3;
export const AA_BATTERY_BOMBER_DAMAGE = 4;
export const AA_BATTERY_FIGHTER_DAMAGE = 3;
export const AA_OVERLAP_PENALTY_PER_EXTRA_BATTERY = 0.75;
export const RADAR_STATION_COST = 500000;
export const RADAR_STATION_CONSTRUCTION_TICKS = 8 * 10;
export const RADAR_STATION_DETECTION_RADIUS = 70;
export const RADAR_STATION_LOCKON_REDUCTION = 2;
export const RADAR_STATION_AA_DAMAGE_MULTIPLIER = 1.25;
export const RADAR_STATION_FIGHTER_RANGE_BONUS = 8;
export const RADAR_STATION_FIGHTER_DAMAGE_BONUS = 1;
export const RADAR_DETECTION_MESSAGE_COOLDOWN = 60;
export const AIR_DEFENSE_PRIORITY_STRUCTURE_RADIUS = 14;
export const AIR_DEFENSE_HIGH_VALUE_TARGETS = [
    UnitType.City,
    UnitType.Factory,
    UnitType.Port,
    UnitType.Airbase,
    UnitType.AABattery,
    UnitType.RadarStation,
    UnitType.SAMLauncher,
    UnitType.MissileSilo,
    UnitType.DefensePost,
];
export const AIR_DEFENSE_STRIKE_MISSIONS = [
    AirMissionType.StrategicBombing,
    AirMissionType.CloseAirSupport,
    AirMissionType.PortStrike,
];
//# sourceMappingURL=AntiAirBalance.js.map