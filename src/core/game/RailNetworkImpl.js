import { PathFinding } from "../pathfinding/PathFinder";
import { UnitType } from "./Game";
import { GameUpdateType } from "./GameUpdates";
import { Railroad } from "./Railroad";
import { RailSpatialGrid } from "./RailroadSpatialGrid";
import { Cluster } from "./TrainStation";
export class StationManagerImpl {
    constructor() {
        this.stations = new Set();
        this.stationsById = [];
        this.nextId = 1; // Start from 1; 0 is reserved as invalid/sentinel
    }
    addStation(station) {
        station.id = this.nextId++;
        this.stationsById[station.id] = station;
        this.stations.add(station);
    }
    removeStation(station) {
        this.stationsById[station.id] = undefined;
        this.stations.delete(station);
    }
    findStation(unit) {
        for (const station of this.stations) {
            if (station.unit === unit)
                return station;
        }
        return null;
    }
    getAll() {
        return this.stations;
    }
    getById(id) {
        return this.stationsById[id];
    }
    count() {
        return this.nextId;
    }
}
class RailPathFinderServiceImpl {
    constructor(game) {
        this.game = game;
    }
    findTilePath(from, to) {
        return PathFinding.Rail(this.game).findPath(from, to) ?? [];
    }
    findStationsPath(from, to) {
        return PathFinding.Stations(this.game).findPath(from, to) ?? [];
    }
}
export function createRailNetwork(game) {
    const stationManager = new StationManagerImpl();
    const pathService = new RailPathFinderServiceImpl(game);
    return new RailNetworkImpl(game, stationManager, pathService);
}
export class RailNetworkImpl {
    constructor(game, _stationManager, pathService) {
        this.game = game;
        this._stationManager = _stationManager;
        this.pathService = pathService;
        this.maxConnectionDistance = 4;
        this.stationRadius = 3;
        this.gridCellSize = 4;
        this.nextId = 0;
        this.dirtyClusters = new Set();
        this.railGrid = new RailSpatialGrid(game, this.gridCellSize); // 4x4 tiles spatial grid
    }
    stationManager() {
        return this._stationManager;
    }
    connectStation(station) {
        this._stationManager.addStation(station);
        if (!this.connectToExistingRails(station)) {
            this.connectToNearbyStations(station);
        }
    }
    recomputeClusters() {
        if (this.dirtyClusters.size === 0)
            return;
        for (const cluster of this.dirtyClusters) {
            const allOriginalStations = new Set(cluster.stations);
            while (allOriginalStations.size > 0) {
                const nextStation = allOriginalStations.values().next().value;
                const allConnectedStations = this.computeCluster(nextStation);
                // Filter stations that are connected to the current cluster
                for (const connectedStation of allConnectedStations) {
                    allOriginalStations.delete(connectedStation);
                }
                // Those stations were disconnected: new cluster
                if (allOriginalStations.size > 0) {
                    const newCluster = new Cluster();
                    // Switching their cluster will automatically remove them from their current cluster
                    newCluster.addStations(allConnectedStations);
                }
            }
        }
        this.dirtyClusters.clear();
    }
    removeStation(unit) {
        const station = this._stationManager.findStation(unit);
        if (!station)
            return;
        this.disconnectFromNetwork(station);
        this._stationManager.removeStation(station);
        station.unit.setTrainStation(false);
        const cluster = station.getCluster();
        if (!cluster)
            return;
        cluster.removeStation(station);
        if (cluster.size() === 0) {
            this.deleteCluster(cluster);
            this.dirtyClusters.delete(cluster);
            return;
        }
        this.dirtyClusters.add(cluster);
    }
    /**
     * Return the intermediary stations connecting two stations
     */
    findStationsPath(from, to) {
        return this.pathService.findStationsPath(from, to);
    }
    connectToExistingRails(station) {
        const rails = this.railGrid.query(station.tile(), this.stationRadius);
        const editedClusters = new Set();
        for (const rail of rails) {
            const from = rail.from;
            const to = rail.to;
            const originalId = rail.id;
            const closestRailIndex = rail.getClosestTileIndex(this.game, station.tile());
            if (closestRailIndex === 0 || closestRailIndex >= rail.tiles.length) {
                continue;
            }
            // Disconnect current rail as it will become invalid
            from.removeRailroad(rail);
            to.removeRailroad(rail);
            this.railGrid.unregister(rail);
            const newRailFrom = new Railroad(from, station, rail.tiles.slice(0, closestRailIndex), this.nextId++);
            const newRailTo = new Railroad(station, to, rail.tiles.slice(closestRailIndex), this.nextId++);
            // New station is connected to both new rails
            station.addRailroad(newRailFrom);
            station.addRailroad(newRailTo);
            // From and to are connected to the new segments
            from.addRailroad(newRailFrom);
            to.addRailroad(newRailTo);
            this.railGrid.register(newRailTo);
            this.railGrid.register(newRailFrom);
            const cluster = from.getCluster();
            if (cluster) {
                cluster.addStation(station);
                editedClusters.add(cluster);
            }
            this.game.addUpdate({
                type: GameUpdateType.RailroadSnapEvent,
                originalId,
                newId1: newRailFrom.id,
                newId2: newRailTo.id,
                tiles1: newRailFrom.tiles,
                tiles2: newRailTo.tiles,
            });
        }
        // If multiple clusters own the new station, merge them into a single cluster
        if (editedClusters.size > 1) {
            this.mergeClusters(editedClusters);
        }
        return editedClusters.size !== 0;
    }
    overlappingRailroads(tile) {
        return [...this.railGrid.query(tile, this.stationRadius)].map((railroad) => railroad.id);
    }
    canSnapToExistingRailway(tile) {
        return this.railGrid.query(tile, this.stationRadius).size > 0;
    }
    computeGhostRailPaths(unitType, tile) {
        // Factories already show their radius, so we'll exclude from ghost rails
        // in order not to clutter the interface too much.
        if (![UnitType.City, UnitType.Port].includes(unitType)) {
            return [];
        }
        if (this.canSnapToExistingRailway(tile)) {
            return [];
        }
        const maxRange = this.game.config().trainStationMaxRange();
        const minRangeSquared = this.game.config().trainStationMinRange() ** 2;
        const maxPathSize = this.game.config().railroadMaxSize();
        // Cannot connect if outside the max range of a factory
        if (!this.game.hasUnitNearby(tile, maxRange, UnitType.Factory)) {
            return [];
        }
        const neighbors = this.game.nearbyUnits(tile, maxRange, [
            UnitType.City,
            UnitType.Factory,
            UnitType.Port,
        ]);
        neighbors.sort((a, b) => a.distSquared - b.distSquared);
        const paths = [];
        const connectedStations = [];
        for (const neighbor of neighbors) {
            // Limit to the closest 5 stations to avoid running too many pathfinding calls.
            if (paths.length >= 5)
                break;
            if (neighbor.distSquared <= minRangeSquared)
                continue;
            const neighborStation = this._stationManager.findStation(neighbor.unit);
            if (!neighborStation)
                continue;
            const alreadyReachable = connectedStations.some((s) => this.distanceFrom(neighborStation, s, this.maxConnectionDistance - 1) !== -1);
            if (alreadyReachable)
                continue;
            const path = this.pathService.findTilePath(tile, neighborStation.tile());
            if (path.length > 0 && path.length < maxPathSize) {
                paths.push(path);
                connectedStations.push(neighborStation);
            }
        }
        return paths;
    }
    connectToNearbyStations(station) {
        const neighbors = this.game.nearbyUnits(station.tile(), this.game.config().trainStationMaxRange(), [UnitType.City, UnitType.Factory, UnitType.Port]);
        const editedClusters = new Set();
        neighbors.sort((a, b) => a.distSquared - b.distSquared);
        for (const neighbor of neighbors) {
            if (neighbor.unit === station.unit)
                continue;
            const neighborStation = this._stationManager.findStation(neighbor.unit);
            if (!neighborStation)
                continue;
            const distanceToStation = this.distanceFrom(neighborStation, station, this.maxConnectionDistance);
            const neighborCluster = neighborStation.getCluster();
            if (neighborCluster === null)
                continue;
            const connectionAvailable = distanceToStation > this.maxConnectionDistance ||
                distanceToStation === -1;
            if (connectionAvailable &&
                neighbor.distSquared > this.game.config().trainStationMinRange() ** 2) {
                if (this.connect(station, neighborStation)) {
                    neighborCluster.addStation(station);
                    editedClusters.add(neighborCluster);
                }
            }
        }
        // If multiple clusters own the new station, merge them into a single cluster
        if (editedClusters.size > 1) {
            this.mergeClusters(editedClusters);
        }
        else if (editedClusters.size === 0) {
            // If no cluster owns the station, creates a new one for it
            const newCluster = new Cluster();
            newCluster.addStation(station);
        }
    }
    disconnectFromNetwork(station) {
        for (const rail of station.getRailroads()) {
            rail.delete(this.game);
            this.railGrid.unregister(rail);
        }
        station.clearRailroads();
    }
    deleteCluster(cluster) {
        for (const station of cluster.stations) {
            station.setCluster(null);
        }
        cluster.clear();
    }
    connect(from, to) {
        const path = this.pathService.findTilePath(from.tile(), to.tile());
        if (path.length > 0 && path.length < this.game.config().railroadMaxSize()) {
            const railroad = new Railroad(from, to, path, this.nextId++);
            this.game.addUpdate({
                type: GameUpdateType.RailroadConstructionEvent,
                id: railroad.id,
                tiles: railroad.tiles,
            });
            from.addRailroad(railroad);
            to.addRailroad(railroad);
            this.railGrid.register(railroad);
            return true;
        }
        return false;
    }
    distanceFrom(start, dest, maxDistance) {
        if (start === dest)
            return 0;
        const visited = new Set();
        const queue = [
            { station: start, distance: 0 },
        ];
        while (queue.length > 0) {
            const { station, distance } = queue.shift();
            if (visited.has(station))
                continue;
            visited.add(station);
            if (distance >= maxDistance)
                continue;
            for (const neighbor of station.neighbors()) {
                if (neighbor === dest)
                    return distance + 1;
                if (!visited.has(neighbor)) {
                    queue.push({ station: neighbor, distance: distance + 1 });
                }
            }
        }
        // If destination not found within maxDistance
        return -1;
    }
    computeCluster(start) {
        const visited = new Set();
        const queue = [start];
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current))
                continue;
            visited.add(current);
            for (const neighbor of current.neighbors()) {
                if (!visited.has(neighbor))
                    queue.push(neighbor);
            }
        }
        return visited;
    }
    mergeClusters(clustersToMerge) {
        const merged = new Cluster();
        for (const cluster of clustersToMerge) {
            merged.merge(cluster);
        }
    }
}
//# sourceMappingURL=RailNetworkImpl.js.map