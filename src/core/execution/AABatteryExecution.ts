import {
  AA_BATTERY_BOMBER_DAMAGE,
  AA_BATTERY_FIGHTER_DAMAGE,
  AA_BATTERY_LOCKON_TICKS,
  AA_OVERLAP_PENALTY_PER_EXTRA_BATTERY,
  AIR_DEFENSE_HIGH_VALUE_TARGETS,
  AIR_DEFENSE_PRIORITY_STRUCTURE_RADIUS,
  AIR_DEFENSE_STRIKE_MISSIONS,
  RADAR_STATION_AA_DAMAGE_MULTIPLIER,
  RADAR_STATION_LOCKON_REDUCTION,
} from "../configuration/AntiAirBalance";
import {
  AirMissionPhase,
  AirMissionType,
  AirUnits,
  Execution,
  Game,
  Unit,
  UnitType,
} from "../game/Game";

export class AABatteryExecution implements Execution {
  private mg!: Game;
  private active = true;
  private currentTarget: Unit | null = null;
  private lockStartedAt: number | null = null;

  constructor(private readonly battery: Unit) {}

  init(mg: Game): void {
    this.mg = mg;
  }

  tick(ticks: number): void {
    if (!this.battery.isActive()) {
      this.active = false;
      return;
    }
    if (this.battery.isUnderConstruction()) {
      return;
    }

    if (this.battery.isInCooldown()) {
      const frontTime = this.battery.missileTimerQueue()[0];
      if (
        frontTime !== undefined &&
        this.mg.ticks() - frontTime >= this.mg.config().aaBatteryCooldown()
      ) {
        this.battery.reloadMissile();
      }
      return;
    }

    const target = this.selectTarget();
    if (!target) {
      this.clearTarget();
      return;
    }

    if (this.currentTarget?.id() !== target.id()) {
      this.currentTarget = target;
      this.lockStartedAt = ticks;
      this.battery.setTargetUnit(target);
    }

    const radarSupported = this.mg.hasRadarCoverage(
      target.tile(),
      this.battery.owner(),
    );
    const lockTicks = Math.max(
      1,
      AA_BATTERY_LOCKON_TICKS -
        (radarSupported ? RADAR_STATION_LOCKON_REDUCTION : 0),
    );
    if (ticks - (this.lockStartedAt ?? ticks) < lockTicks) {
      return;
    }

    this.fireAtTarget(target, radarSupported);
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  private fireAtTarget(target: Unit, radarSupported: boolean): void {
    this.battery.launch();
    const baseDamage =
      target.type() === UnitType.BomberSquadron
        ? AA_BATTERY_BOMBER_DAMAGE
        : AA_BATTERY_FIGHTER_DAMAGE;
    const overlappingCoverage = this.coverageCount(target);
    const overlapDivisor =
      1 +
      Math.max(0, overlappingCoverage - 1) *
        AA_OVERLAP_PENALTY_PER_EXTRA_BATTERY;
    const radarMultiplier = radarSupported
      ? RADAR_STATION_AA_DAMAGE_MULTIPLIER
      : 1;
    const damage = Math.max(
      1,
      Math.round((baseDamage * radarMultiplier) / overlapDivisor),
    );
    target.modifyHealth(-damage, this.battery.owner());
    if (!target.isActive()) {
      this.clearTarget();
    }
  }

  private selectTarget(): Unit | null {
    const candidates = this.mg.nearbyUnits(
      this.battery.tile(),
      this.mg.config().aaBatteryRange(),
      AirUnits.types,
      ({ unit }) =>
        unit.owner() !== this.battery.owner() &&
        !this.battery.owner().isFriendly(unit.owner()) &&
        unit.isActive() &&
        !unit.isUnderConstruction() &&
        !unit.isMarkedForDeletion() &&
        this.isAirborne(unit),
      true,
    );
    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => {
      const priorityA = this.targetPriority(a.unit);
      const priorityB = this.targetPriority(b.unit);
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      const highValueBiasA = this.threatensHighValueStructure(a.unit) ? 0 : 1;
      const highValueBiasB = this.threatensHighValueStructure(b.unit) ? 0 : 1;
      if (highValueBiasA !== highValueBiasB) {
        return highValueBiasA - highValueBiasB;
      }

      if (a.distSquared !== b.distSquared) {
        return a.distSquared - b.distSquared;
      }
      return a.unit.id() - b.unit.id();
    });

    return candidates[0]?.unit ?? null;
  }

  private coverageCount(target: Unit): number {
    return this.mg.nearbyUnits(
      target.tile(),
      this.mg.config().aaBatteryRange(),
      UnitType.AABattery,
      ({ unit }) =>
        unit.owner() === this.battery.owner() &&
        unit.isActive() &&
        !unit.isUnderConstruction() &&
        !unit.isMarkedForDeletion(),
      true,
    ).length;
  }

  private targetPriority(unit: Unit): number {
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
    if (
      unit.type() === UnitType.FighterSquadron &&
      missionType === AirMissionType.EscortBombers
    ) {
      return 3;
    }
    return 4;
  }

  private threatensHighValueStructure(unit: Unit): boolean {
    return this.mg.anyUnitNearby(
      unit.tile(),
      AIR_DEFENSE_PRIORITY_STRUCTURE_RADIUS,
      AIR_DEFENSE_HIGH_VALUE_TARGETS,
      (structure) =>
        structure.owner() === this.battery.owner() &&
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

  private clearTarget(): void {
    this.currentTarget = null;
    this.lockStartedAt = null;
    this.battery.setTargetUnit(undefined);
  }
}
