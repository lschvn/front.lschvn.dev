import {
  AirMissionPhase,
  AirMissionType,
  Execution,
  Game,
  Player,
  UnitType,
} from "../game/Game";
import { TileRef } from "../game/GameMap";

const FIGHTER_MISSION_TYPES = new Set<AirMissionType>([
  AirMissionType.PatrolArea,
  AirMissionType.EscortBombers,
  AirMissionType.InterceptEnemyAircraft,
]);

const BOMBER_MISSION_TYPES = new Set<AirMissionType>([
  AirMissionType.StrategicBombing,
  AirMissionType.CloseAirSupport,
  AirMissionType.PortStrike,
]);

export class LaunchAirMissionExecution implements Execution {
  private active = true;
  private mg!: Game;

  constructor(
    private readonly player: Player,
    private readonly airbaseId: number,
    private readonly squadronType: UnitType.FighterSquadron | UnitType.BomberSquadron,
    private readonly missionType: AirMissionType,
    private readonly targetTile: TileRef,
  ) {}

  init(mg: Game): void {
    this.mg = mg;
  }

  tick(): void {
    const airbase = this.player
      .units(UnitType.Airbase)
      .find(
        (unit) =>
          unit.id() === this.airbaseId &&
          unit.isActive() &&
          !unit.isUnderConstruction() &&
          !unit.isMarkedForDeletion(),
      );
    if (!airbase) {
      this.active = false;
      return;
    }

    const isValidMissionType =
      this.squadronType === UnitType.FighterSquadron
        ? FIGHTER_MISSION_TYPES.has(this.missionType)
        : BOMBER_MISSION_TYPES.has(this.missionType);
    if (!isValidMissionType) {
      this.active = false;
      return;
    }

    if (
      this.mg.euclideanDistSquared(airbase.tile(), this.targetTile) >
      this.mg.config().airbaseOperationalRange() *
        this.mg.config().airbaseOperationalRange()
    ) {
      this.active = false;
      return;
    }

    const squadron = this.player
      .units(this.squadronType)
      .filter(
        (unit) =>
          unit.airbaseId() === airbase.id() &&
          unit.isActive() &&
          !unit.isUnderConstruction() &&
          !unit.isMarkedForDeletion() &&
          unit.airMissionPhase() === AirMissionPhase.Ready,
      )
      .sort((a, b) => a.id() - b.id())[0];
    if (!squadron) {
      this.active = false;
      return;
    }

    squadron.move(airbase.tile());
    squadron.setTargetTile(this.targetTile);
    squadron.setAirMissionType(this.missionType);
    squadron.setAirMissionTicksRemaining(undefined);
    squadron.setRearmCompleteTick(undefined);
    squadron.setAirMissionPhase(AirMissionPhase.Outbound);
    this.active = false;
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
