import { AirMissionPhase, UnitType, } from "../game/Game";
import { AirMissionExecution } from "./AirMissionExecution";
export class ProduceAirSquadronExecution {
    constructor(player, airbaseId, squadronType) {
        this.player = player;
        this.airbaseId = airbaseId;
        this.squadronType = squadronType;
        this.active = true;
    }
    init(mg) {
        this.mg = mg;
    }
    tick() {
        const airbase = this.player
            .units(UnitType.Airbase)
            .find((unit) => unit.id() === this.airbaseId &&
            unit.isActive() &&
            !unit.isUnderConstruction() &&
            !unit.isMarkedForDeletion());
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
    isActive() {
        return this.active;
    }
    activeDuringSpawnPhase() {
        return false;
    }
}
//# sourceMappingURL=ProduceAirSquadronExecution.js.map