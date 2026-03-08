import { PseudoRandom } from "../PseudoRandom";
import { UnitType } from "./Game";
import { GameUpdateType } from "./GameUpdates";
class TradeStationStopHandler {
    onStop(mg, station, trainExecution) {
        const stationOwner = station.unit.owner();
        const trainOwner = trainExecution.owner();
        const gold = mg.config().trainGold(rel(trainOwner, stationOwner));
        // Share revenue with the station owner if it's not the current player
        if (trainOwner !== stationOwner) {
            stationOwner.addGold(gold, station.tile());
            mg.stats().trainExternalTrade(trainOwner, gold);
        }
        trainOwner.addGold(gold, station.tile());
        mg.stats().trainSelfTrade(trainOwner, gold);
    }
}
class FactoryStopHandler {
    onStop(mg, station, trainExecution) { }
}
export function createTrainStopHandlers(random) {
    return {
        [UnitType.City]: new TradeStationStopHandler(),
        [UnitType.Port]: new TradeStationStopHandler(),
        [UnitType.Factory]: new FactoryStopHandler(),
    };
}
export class TrainStation {
    constructor(mg, unit) {
        this.mg = mg;
        this.unit = unit;
        this.id = -1; // assigned by StationManager
        this.stopHandlers = {};
        this.cluster = null;
        this.railroads = new Set();
        // Quick lookup from neighboring station to connecting railroad
        this.railroadByNeighbor = new Map();
        this.stopHandlers = createTrainStopHandlers(new PseudoRandom(mg.ticks()));
    }
    tradeAvailable(otherPlayer) {
        const player = this.unit.owner();
        return otherPlayer === player || player.canTrade(otherPlayer);
    }
    clearRailroads() {
        this.railroads.clear();
        this.railroadByNeighbor.clear();
    }
    addRailroad(railRoad) {
        this.railroads.add(railRoad);
        const neighbor = railRoad.from === this ? railRoad.to : railRoad.from;
        this.railroadByNeighbor.set(neighbor, railRoad);
    }
    removeRailroad(railRoad) {
        this.railroads.delete(railRoad);
        const neighbor = railRoad.from === this ? railRoad.to : railRoad.from;
        this.railroadByNeighbor.delete(neighbor);
    }
    removeNeighboringRails(station) {
        const toRemove = [...this.railroads].find((r) => r.from === station || r.to === station);
        if (toRemove) {
            this.mg.addUpdate({
                type: GameUpdateType.RailroadDestructionEvent,
                id: toRemove.id,
            });
            this.removeRailroad(toRemove);
        }
    }
    neighbors() {
        const neighbors = [];
        for (const r of this.railroads) {
            if (r.from !== this) {
                neighbors.push(r.from);
            }
            else {
                neighbors.push(r.to);
            }
        }
        return neighbors;
    }
    tile() {
        return this.unit.tile();
    }
    isActive() {
        return this.unit.isActive();
    }
    getRailroads() {
        return this.railroads;
    }
    getRailroadTo(station) {
        return this.railroadByNeighbor.get(station) ?? null;
    }
    setCluster(cluster) {
        // Properly disconnect cluster if it's already set
        if (this.cluster !== null) {
            this.cluster.removeStation(this);
        }
        this.cluster = cluster;
    }
    getCluster() {
        return this.cluster;
    }
    onTrainStop(trainExecution) {
        const type = this.unit.type();
        const handler = this.stopHandlers[type];
        if (handler) {
            handler.onStop(this.mg, this, trainExecution);
        }
    }
}
/**
 * Cluster of connected stations
 */
export class Cluster {
    constructor() {
        this.stations = new Set();
        this.tradeStations = new Set();
    }
    isTradeStation(station) {
        const type = station.unit.type();
        return type === UnitType.City || type === UnitType.Port;
    }
    has(station) {
        return this.stations.has(station);
    }
    addStation(station) {
        this.stations.add(station);
        if (this.isTradeStation(station)) {
            this.tradeStations.add(station);
        }
        station.setCluster(this);
    }
    removeStation(station) {
        this.stations.delete(station);
        this.tradeStations.delete(station);
    }
    addStations(stations) {
        for (const station of stations) {
            this.addStation(station);
        }
    }
    merge(other) {
        for (const s of other.stations) {
            this.addStation(s);
        }
    }
    hasAnyTradeDestination(player) {
        for (const station of this.tradeStations) {
            if (station.tradeAvailable(player)) {
                return true;
            }
        }
        return false;
    }
    randomTradeDestination(player, random) {
        let selected = null;
        let eligibleSeen = 0;
        for (const station of this.tradeStations) {
            if (!station.tradeAvailable(player))
                continue;
            eligibleSeen++;
            // Reservoir sampling: keep each eligible station with probability 1/eligibleSeen.
            if (random.nextInt(0, eligibleSeen) === 0) {
                selected = station;
            }
        }
        return selected;
    }
    availableForTrade(player) {
        const tradingStations = new Set();
        for (const station of this.tradeStations) {
            if (station.tradeAvailable(player)) {
                tradingStations.add(station);
            }
        }
        return tradingStations;
    }
    size() {
        return this.stations.size;
    }
    clear() {
        this.stations.clear();
        this.tradeStations.clear();
    }
}
function rel(player, other) {
    if (player === other) {
        return "self";
    }
    if (player.isOnSameTeam(other)) {
        return "team";
    }
    if (player.isAlliedWith(other)) {
        return "ally";
    }
    return "other";
}
//# sourceMappingURL=TrainStation.js.map