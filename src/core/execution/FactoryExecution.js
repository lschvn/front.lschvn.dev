import { UnitType } from "../game/Game";
import { TrainStationExecution } from "./TrainStationExecution";
export class FactoryExecution {
    constructor(factory) {
        this.factory = factory;
        this.active = true;
        this.stationCreated = false;
    }
    init(mg, ticks) {
        this.game = mg;
    }
    tick(ticks) {
        if (!this.stationCreated) {
            this.createStation();
            this.stationCreated = true;
        }
        if (!this.factory.isActive()) {
            this.active = false;
            return;
        }
    }
    isActive() {
        return this.active;
    }
    activeDuringSpawnPhase() {
        return false;
    }
    createStation() {
        const structures = this.game.nearbyUnits(this.factory.tile(), this.game.config().trainStationMaxRange(), [UnitType.City, UnitType.Port, UnitType.Factory]);
        this.game.addExecution(new TrainStationExecution(this.factory, true));
        for (const { unit } of structures) {
            if (!unit.hasTrainStation()) {
                this.game.addExecution(new TrainStationExecution(unit));
            }
        }
    }
}
//# sourceMappingURL=FactoryExecution.js.map