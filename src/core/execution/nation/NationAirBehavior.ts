import {
  AirMissionPhase,
  AirMissionType,
  Game,
  Player,
  Unit,
  UnitType,
} from "../../game/Game";
import { TileRef } from "../../game/GameMap";
import { PseudoRandom } from "../../PseudoRandom";
import { LaunchAirMissionExecution } from "../LaunchAirMissionExecution";
import { ProduceAirSquadronExecution } from "../ProduceAirSquadronExecution";

const STRIKE_TARGET_PRIORITY: ReadonlyArray<UnitType> = [
  UnitType.Airbase,
  UnitType.RadarStation,
  UnitType.AABattery,
  UnitType.MissileSilo,
  UnitType.Factory,
  UnitType.Port,
  UnitType.City,
  UnitType.SAMLauncher,
  UnitType.DefensePost,
];

export class NationAirBehavior {
  constructor(
    private random: PseudoRandom,
    private game: Game,
    private player: Player,
  ) {}

  maybeManageAirPower(): boolean {
    const airbases = this.player
      .units(UnitType.Airbase)
      .filter((unit) => unit.isActive() && !unit.isUnderConstruction());
    if (airbases.length === 0) {
      return false;
    }

    if (this.maybeLaunchInterceptMission(airbases)) {
      return true;
    }
    if (this.maybeLaunchStrikeMission(airbases)) {
      return true;
    }
    return this.maybeProduceSquadron(airbases);
  }

  private maybeProduceSquadron(airbases: Unit[]): boolean {
    const fighterCost = this.game.unitInfo(UnitType.FighterSquadron).cost(
      this.game,
      this.player,
    );
    const bomberCost = this.game.unitInfo(UnitType.BomberSquadron).cost(
      this.game,
      this.player,
    );
    const fighterCount = this.player.unitsOwned(UnitType.FighterSquadron);
    const bomberCount = this.player.unitsOwned(UnitType.BomberSquadron);

    const availableAirbase = airbases.find(
      (airbase) => this.player.canBuild(UnitType.FighterSquadron, airbase.tile()) !== false,
    );
    if (!availableAirbase) {
      return false;
    }

    const desiredFighters = Math.max(1, airbases.length);
    const desiredBombers = airbases.length * 2;

    if (fighterCount < desiredFighters && this.player.gold() >= fighterCost * 2n) {
      this.game.addExecution(
        new ProduceAirSquadronExecution(
          this.player,
          availableAirbase.id(),
          UnitType.FighterSquadron,
        ),
      );
      return true;
    }

    if (
      bomberCount < desiredBombers &&
      this.player.gold() >= bomberCost + fighterCost &&
      this.random.chance(2)
    ) {
      this.game.addExecution(
        new ProduceAirSquadronExecution(
          this.player,
          availableAirbase.id(),
          UnitType.BomberSquadron,
        ),
      );
      return true;
    }

    return false;
  }

  private maybeLaunchInterceptMission(airbases: Unit[]): boolean {
    const enemyBombers = this.game
      .units(UnitType.BomberSquadron)
      .filter(
        (unit) =>
          unit.owner() !== this.player &&
          !this.player.isFriendly(unit.owner()) &&
          unit.isActive() &&
          !unit.isUnderConstruction() &&
          unit.airMissionPhase() !== undefined &&
          unit.airMissionPhase() !== AirMissionPhase.Ready &&
          unit.airMissionPhase() !== AirMissionPhase.Rearming,
      );

    for (const airbase of airbases) {
      const fighter = this.readySquadron(UnitType.FighterSquadron, airbase.id());
      if (!fighter) {
        continue;
      }

      const target = enemyBombers
        .filter(
          (unit) =>
            this.inRange(airbase.tile(), unit.tile()) &&
            this.game.manhattanDist(airbase.tile(), unit.tile()) <= 180,
        )
        .sort(
          (a, b) =>
            this.game.manhattanDist(airbase.tile(), a.tile()) -
              this.game.manhattanDist(airbase.tile(), b.tile()) ||
            a.id() - b.id(),
        )[0];
      if (!target) {
        continue;
      }

      this.game.addExecution(
        new LaunchAirMissionExecution(
          this.player,
          airbase.id(),
          UnitType.FighterSquadron,
          AirMissionType.InterceptEnemyAircraft,
          target.tile(),
        ),
      );
      return true;
    }

    return false;
  }

  private maybeLaunchStrikeMission(airbases: Unit[]): boolean {
    for (const airbase of airbases) {
      const bomber = this.readySquadron(UnitType.BomberSquadron, airbase.id());
      if (!bomber) {
        continue;
      }

      const target = this.findStrikeTarget(airbase.tile());
      if (!target) {
        continue;
      }

      const missionType =
        target.type() === UnitType.Port ||
        this.game.hasUnitNearby(target.tile(), 14, UnitType.Warship)
          ? AirMissionType.PortStrike
          : AirMissionType.StrategicBombing;

      this.game.addExecution(
        new LaunchAirMissionExecution(
          this.player,
          airbase.id(),
          UnitType.BomberSquadron,
          missionType,
          target.tile(),
        ),
      );

      const escort = this.readySquadron(UnitType.FighterSquadron, airbase.id());
      if (escort && this.random.chance(2)) {
        this.game.addExecution(
          new LaunchAirMissionExecution(
            this.player,
            airbase.id(),
            UnitType.FighterSquadron,
            AirMissionType.EscortBombers,
            target.tile(),
          ),
        );
      }
      return true;
    }

    return false;
  }

  private findStrikeTarget(airbaseTile: TileRef): Unit | undefined {
    const enemyStructures = this.game
      .units(...STRIKE_TARGET_PRIORITY)
      .filter(
        (unit) =>
          unit.owner() !== this.player &&
          !this.player.isFriendly(unit.owner()) &&
          unit.isActive() &&
          !unit.isUnderConstruction() &&
          this.inRange(airbaseTile, unit.tile()),
      );
    if (enemyStructures.length === 0) {
      return undefined;
    }

    const priorities = new Map(
      STRIKE_TARGET_PRIORITY.map((type, index) => [type, index]),
    );
    enemyStructures.sort((a, b) => {
      const priorityA = priorities.get(a.type()) ?? 99;
      const priorityB = priorities.get(b.type()) ?? 99;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      const distA = this.game.manhattanDist(airbaseTile, a.tile());
      const distB = this.game.manhattanDist(airbaseTile, b.tile());
      if (distA !== distB) {
        return distA - distB;
      }
      return a.id() - b.id();
    });
    return enemyStructures[0];
  }

  private readySquadron(
    type: UnitType.FighterSquadron | UnitType.BomberSquadron,
    airbaseId: number,
  ): Unit | undefined {
    return this.player
      .units(type)
      .filter(
        (unit) =>
          unit.isActive() &&
          !unit.isUnderConstruction() &&
          !unit.isMarkedForDeletion() &&
          unit.airbaseId() === airbaseId &&
          unit.airMissionPhase() === AirMissionPhase.Ready,
      )
      .sort((a, b) => a.id() - b.id())[0];
  }

  private inRange(from: TileRef, to: TileRef): boolean {
    return (
      this.game.euclideanDistSquared(from, to) <=
      this.game.config().airbaseOperationalRange() *
        this.game.config().airbaseOperationalRange()
    );
  }
}
