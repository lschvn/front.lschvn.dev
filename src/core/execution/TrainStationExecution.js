import { SUPPLY_FACTORY_DEPLETED_TRAIN_MULTIPLIER, SUPPLY_FACTORY_ISOLATED_TRAIN_MULTIPLIER, SUPPLY_FACTORY_STRAINED_TRAIN_MULTIPLIER, } from "../configuration/SupplyBalance";
import { SupplyState, UnitType } from "../game/Game";
import { TrainStation } from "../game/TrainStation";
import { PseudoRandom } from "../PseudoRandom";
import { TrainExecution } from "./TrainExecution";
export class TrainStationExecution {
    constructor(unit, spawnTrains) {
        this.unit = unit;
        this.spawnTrains = spawnTrains;
        this.active = true;
        this.station = null;
        this.numCars = 5;
        this.lastSpawnTick = 0;
        this.ticksCooldown = 10; // Minimum cooldown between two trains
        this.unit.setTrainStation(true);
    }
    isActive() {
        return this.active;
    }
    init(mg, ticks) {
        this.mg = mg;
        if (this.spawnTrains) {
            this.random = new PseudoRandom(mg.ticks());
        }
    }
    tick(ticks) {
        if (this.mg === undefined) {
            throw new Error("Not initialized");
        }
        if (!this.isActive() || this.unit === undefined) {
            return;
        }
        if (this.station === null) {
            // Can't create new executions on init, so it has to be done in the tick
            this.station = new TrainStation(this.mg, this.unit);
            this.mg.railNetwork().connectStation(this.station);
        }
        if (!this.station.isActive()) {
            this.active = false;
            return;
        }
        if (this.spawnTrains) {
            this.spawnTrain(this.station, ticks);
        }
    }
    shouldSpawnTrain() {
        const spawnRate = this.mg
            .config()
            .trainSpawnRate(this.unit.owner().unitCount(UnitType.Factory)) *
            this.trainSpawnMultiplier();
        for (let i = 0; i < this.unit.level(); i++) {
            if (this.random.chance(spawnRate)) {
                return true;
            }
        }
        return false;
    }
    spawnTrain(station, currentTick) {
        if (this.mg === undefined)
            throw new Error("Not initialized");
        if (!this.spawnTrains)
            return;
        if (this.random === undefined)
            throw new Error("Not initialized");
        if (currentTick < this.lastSpawnTick + this.ticksCooldown)
            return;
        const cluster = station.getCluster();
        if (cluster === null) {
            return;
        }
        const owner = this.unit.owner();
        if (!cluster.hasAnyTradeDestination(owner)) {
            return;
        }
        if (!this.shouldSpawnTrain()) {
            return;
        }
        // Pick a destination randomly.
        // Could be improved to pick a lucrative trip
        const destination = cluster.randomTradeDestination(owner, this.random);
        if (destination === null)
            return;
        if (destination === station)
            return;
        this.mg.addExecution(new TrainExecution(this.mg.railNetwork(), owner, station, destination, this.numCars));
        this.lastSpawnTick = currentTick;
    }
    activeDuringSpawnPhase() {
        return false;
    }
    trainSpawnMultiplier() {
        const tile = this.unit.tile();
        const state = this.mg.supplyState(tile);
        if (state === SupplyState.Strained) {
            return SUPPLY_FACTORY_STRAINED_TRAIN_MULTIPLIER;
        }
        if (state !== SupplyState.Isolated) {
            return 1;
        }
        return this.mg.isSupplyReserveDepleted(tile)
            ? SUPPLY_FACTORY_DEPLETED_TRAIN_MULTIPLIER
            : SUPPLY_FACTORY_ISOLATED_TRAIN_MULTIPLIER;
    }
}
//# sourceMappingURL=TrainStationExecution.js.map