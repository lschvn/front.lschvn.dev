import {
  AirMissionType,
  AttackMode,
  PlayerBuildableUnitType,
  UnitType,
} from "../../core/game/Game";
import { TileRef } from "../../core/game/GameMap";

export interface UIState {
  attackRatio: number;
  attackMode: AttackMode;
  ghostStructure: PlayerBuildableUnitType | null;
  overlappingRailroads: number[];
  ghostRailPaths: TileRef[][];
  rocketDirectionUp: boolean;
  selectedAirbaseId: number | null;
  pendingAirMission: {
    airbaseId: number;
    squadronType: UnitType.FighterSquadron | UnitType.BomberSquadron;
    missionType: AirMissionType;
  } | null;
}
