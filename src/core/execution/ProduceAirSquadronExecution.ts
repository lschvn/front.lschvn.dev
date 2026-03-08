import {
  AirMissionPhase,
  Execution,
  Game,
  Player,
  UnitType,
} from "../game/Game";
import { AirMissionExecution } from "./AirMissionExecution";

export class ProduceAirSquadronExecution implements Execution {
  private active = true;
  private mg!: Game;

  constructor(
    private readonly player: Player,
    private readonly airbaseId: number,
    private readonly squadronType: UnitType.FighterSquadron | UnitType.BomberSquadron,
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

    const spawnTile = this.player.canBuild(this.squadronType, airbase.tile());
    if (spawnTile === false) {
      this.active = false;
      return;
    }

    const squadron = this.player.buildUnit(this.squadronType, spawnTile, {
      airbaseId: airbase.id(),
      missionPhase: AirMissionPhase.Ready,
    });
    this.mg.addExecution(new AirMissionExecution(squadron));
    this.active = false;
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
