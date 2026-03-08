import {
  AIR_DEFENSE_HIGH_VALUE_TARGETS,
  AIR_DEFENSE_PRIORITY_STRUCTURE_RADIUS,
  AIR_DEFENSE_STRIKE_MISSIONS,
  RADAR_DETECTION_MESSAGE_COOLDOWN,
} from "../configuration/AntiAirBalance";
import {
  AirMissionPhase,
  AirMissionType,
  AirUnits,
  Execution,
  Game,
  MessageType,
  Unit,
  UnitType,
} from "../game/Game";

export class RadarStationExecution implements Execution {
  private mg!: Game;
  private active = true;
  private lastWarnedAt = new Map<number, number>();

  constructor(private readonly radar: Unit) {}

  init(mg: Game): void {
    this.mg = mg;
  }

  tick(ticks: number): void {
    if (!this.radar.isActive()) {
      this.active = false;
      return;
    }
    if (this.radar.isUnderConstruction()) {
      return;
    }

    const threats = this.mg.nearbyUnits(
      this.radar.tile(),
      this.mg.config().radarStationRange(),
      AirUnits.types,
      ({ unit }) =>
        unit.owner() !== this.radar.owner() &&
        !this.radar.owner().isFriendly(unit.owner()) &&
        unit.isActive() &&
        !unit.isUnderConstruction() &&
        !unit.isMarkedForDeletion() &&
        this.isAirborne(unit),
      true,
    );
    threats.sort((a, b) => this.priority(a.unit) - this.priority(b.unit));

    for (const { unit } of threats) {
      if (
        !this.threatensHighValueStructure(unit) &&
        unit.type() !== UnitType.BomberSquadron
      ) {
        continue;
      }
      const lastWarn = this.lastWarnedAt.get(unit.id()) ?? -Infinity;
      if (ticks - lastWarn < RADAR_DETECTION_MESSAGE_COOLDOWN) {
        continue;
      }
      this.lastWarnedAt.set(unit.id(), ticks);
      this.mg.displayIncomingUnit(
        unit.id(),
        unit.type() === UnitType.BomberSquadron
          ? "events_display.radar_contact_bomber"
          : "events_display.radar_contact_fighter",
        MessageType.NAVAL_INVASION_INBOUND,
        this.radar.owner().id(),
      );
      break;
    }
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  private priority(unit: Unit): number {
    const missionType = unit.airMissionType();
    if (
      unit.type() === UnitType.BomberSquadron &&
      missionType !== undefined &&
      AIR_DEFENSE_STRIKE_MISSIONS.includes(
        missionType as (typeof AIR_DEFENSE_STRIKE_MISSIONS)[number],
      )
    ) {
      return 0;
    }
    if (
      unit.type() === UnitType.FighterSquadron &&
      (missionType === AirMissionType.InterceptEnemyAircraft ||
        missionType === AirMissionType.PatrolArea)
    ) {
      return 1;
    }
    if (unit.type() === UnitType.BomberSquadron) {
      return 2;
    }
    return 3;
  }

  private threatensHighValueStructure(unit: Unit): boolean {
    return this.mg.anyUnitNearby(
      unit.tile(),
      AIR_DEFENSE_PRIORITY_STRUCTURE_RADIUS,
      AIR_DEFENSE_HIGH_VALUE_TARGETS,
      (structure) =>
        structure.owner() === this.radar.owner() &&
        structure.isActive() &&
        !structure.isUnderConstruction() &&
        !structure.isMarkedForDeletion(),
      undefined,
      true,
    );
  }

  private isAirborne(unit: Unit): boolean {
    const phase = unit.airMissionPhase();
    return (
      AirUnits.has(unit.type()) &&
      phase !== undefined &&
      phase !== AirMissionPhase.Ready &&
      phase !== AirMissionPhase.Rearming
    );
  }
}
