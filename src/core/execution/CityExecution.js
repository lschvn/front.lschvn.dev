import { UnitType } from "../game/Game";
import { TrainStationExecution } from "./TrainStationExecution";
export class CityExecution {
    constructor(city) {
        this.city = city;
        this.active = true;
        this.stationCreated = false;
    }
    init(mg, ticks) {
        this.mg = mg;
    }
    tick(ticks) {
        if (!this.stationCreated) {
            this.createStation();
            this.stationCreated = true;
        }
        if (!this.city.isActive()) {
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
        const nearbyFactory = this.mg.hasUnitNearby(this.city.tile(), this.mg.config().trainStationMaxRange(), UnitType.Factory);
        if (nearbyFactory) {
            this.mg.addExecution(new TrainStationExecution(this.city));
        }
    }
}
//# sourceMappingURL=CityExecution.js.map