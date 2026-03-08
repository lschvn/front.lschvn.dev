import { DEPLETED_ISOLATION_BALANCE, EMPTY_SUPPLY_SUMMARY, SUPPLY_CITY_RANGE, SUPPLY_DEPLETED_ECONOMIC_MULTIPLIER, SUPPLY_DEPLETED_REINFORCEMENT_MULTIPLIER, SUPPLY_ISOLATED_ECONOMIC_MULTIPLIER, SUPPLY_ISOLATED_REINFORCEMENT_MULTIPLIER, SUPPLY_ISOLATED_RESERVE_TICKS, SUPPLY_PORT_BLOCKADE_MIN_ENEMY_STRENGTH, SUPPLY_PORT_BLOCKADE_RADIUS, SUPPLY_RECALC_INTERVAL_TICKS, SUPPLY_STATE_BALANCE, SUPPLY_STRAINED_ECONOMIC_MULTIPLIER, SUPPLY_STRAINED_RANGE, SUPPLY_STRAINED_REINFORCEMENT_MULTIPLIER, } from "../configuration/SupplyBalance";
import { MessageType, SupplyState, UnitType, } from "./Game";
const PACKED_SUPPLY_STATE_MASK = 0b11;
const PACKED_SUPPLY_RESERVE_DEPLETED_BIT = 0b100;
const SUPPLY_STRUCTURE_TYPES = new Set([
    UnitType.City,
    UnitType.Port,
    UnitType.Factory,
]);
export function packSupplyTileState(state, reserveDepleted) {
    return ((state & PACKED_SUPPLY_STATE_MASK) |
        (reserveDepleted ? PACKED_SUPPLY_RESERVE_DEPLETED_BIT : 0));
}
export function unpackSupplyTileState(packed) {
    return {
        state: (packed & PACKED_SUPPLY_STATE_MASK),
        reserveDepleted: (packed & PACKED_SUPPLY_RESERVE_DEPLETED_BIT) !== 0,
    };
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
export class SupplySystem {
    constructor(game) {
        this.game = game;
        this.generation = 1;
        this.lastRecomputeTick = -1;
        this.dirtyPlayers = new Set();
        const size = this.game.width() * this.game.height();
        this.supplyStates = new Uint8Array(size);
        this.reserveDepleted = new Uint8Array(size);
        this.isolatedSinceTick = new Int32Array(size);
        this.isolatedSinceTick.fill(-1);
        this.visitGeneration = new Uint32Array(size);
        this.distances = new Uint16Array(size);
        this.queue = new Int32Array(size);
        for (const player of this.game.allPlayers()) {
            this.dirtyPlayers.add(player.smallID());
        }
    }
    supplyState(tile) {
        return (this.supplyStates[tile] ?? 0);
    }
    isReserveDepleted(tile) {
        return this.reserveDepleted[tile] === 1;
    }
    playerSummary(player) {
        const resolved = typeof player === "string" ? this.game.player(player) : player;
        return resolved.supplySummary();
    }
    markPlayerDirty(player) {
        const smallId = typeof player === "number" ? player : player.smallID();
        if (smallId > 0) {
            this.dirtyPlayers.add(smallId);
        }
    }
    markTileOwnershipChanged(tile, previousOwnerSmallId, newOwnerSmallId) {
        this.clearTile(tile);
        if (previousOwnerSmallId > 0) {
            this.dirtyPlayers.add(previousOwnerSmallId);
        }
        if (newOwnerSmallId > 0) {
            this.dirtyPlayers.add(newOwnerSmallId);
        }
    }
    markUnitAdded(unitType, owner, tile) {
        if (!SUPPLY_STRUCTURE_TYPES.has(unitType) &&
            unitType !== UnitType.Warship) {
            return;
        }
        this.markPlayerDirty(owner);
        if (unitType === UnitType.Warship) {
            this.markNearbyPortOwnersDirty(tile);
        }
    }
    markUnitRemoved(unitType, owner, tile) {
        if (!SUPPLY_STRUCTURE_TYPES.has(unitType) &&
            unitType !== UnitType.Warship) {
            return;
        }
        this.markPlayerDirty(owner);
        if (unitType === UnitType.Warship) {
            this.markNearbyPortOwnersDirty(tile);
        }
    }
    markUnitMoved(unitType, from, to) {
        if (unitType !== UnitType.Warship) {
            return;
        }
        this.markNearbyPortOwnersDirty(from);
        this.markNearbyPortOwnersDirty(to);
    }
    recomputeIfNeeded(ticks) {
        if (this.dirtyPlayers.size === 0) {
            return;
        }
        if (this.lastRecomputeTick >= 0 &&
            ticks - this.lastRecomputeTick < SUPPLY_RECALC_INTERVAL_TICKS) {
            return;
        }
        this.lastRecomputeTick = ticks;
        const playerIds = Array.from(this.dirtyPlayers.values()).sort((a, b) => a - b);
        this.dirtyPlayers.clear();
        for (const smallId of playerIds) {
            const player = this.game.playerBySmallID(smallId);
            if (!player.isPlayer()) {
                continue;
            }
            this.recomputePlayer(player, ticks);
        }
    }
    combatBalance(tile) {
        const state = this.supplyState(tile);
        if (state === SupplyState.None || state === SupplyState.Supplied) {
            return SUPPLY_STATE_BALANCE[SupplyState.Supplied];
        }
        if (state === SupplyState.Strained) {
            return SUPPLY_STATE_BALANCE[SupplyState.Strained];
        }
        return this.isReserveDepleted(tile)
            ? DEPLETED_ISOLATION_BALANCE
            : SUPPLY_STATE_BALANCE[SupplyState.Isolated];
    }
    markNearbyPortOwnersDirty(tile) {
        const nearbyPorts = this.game.nearbyUnits(tile, SUPPLY_PORT_BLOCKADE_RADIUS + 2, UnitType.Port);
        for (const { unit } of nearbyPorts) {
            this.markPlayerDirty(unit.owner());
        }
    }
    clearTile(tile) {
        if (this.supplyStates[tile] === SupplyState.None &&
            this.reserveDepleted[tile] === 0) {
            this.isolatedSinceTick[tile] = -1;
            return;
        }
        this.supplyStates[tile] = SupplyState.None;
        this.reserveDepleted[tile] = 0;
        this.isolatedSinceTick[tile] = -1;
        this.game.recordSupplyUpdate(tile);
    }
    recomputePlayer(player, ticks) {
        if (!player.isAlive()) {
            player.setSupplySummary(EMPTY_SUPPLY_SUMMARY);
            return;
        }
        const hubTiles = this.collectHubTiles(player);
        this.runDistanceSearch(player, hubTiles);
        let suppliedTiles = 0;
        let strainedTiles = 0;
        let isolatedTiles = 0;
        let depletedIsolatedTiles = 0;
        for (const tile of player._tiles) {
            const { nextState, nextReserveDepleted } = this.classifyTile(tile, ticks);
            if (this.supplyStates[tile] !== nextState ||
                (this.reserveDepleted[tile] === 1) !== nextReserveDepleted) {
                this.supplyStates[tile] = nextState;
                this.reserveDepleted[tile] = nextReserveDepleted ? 1 : 0;
                this.game.recordSupplyUpdate(tile);
            }
            switch (nextState) {
                case SupplyState.Supplied:
                    suppliedTiles++;
                    break;
                case SupplyState.Strained:
                    strainedTiles++;
                    break;
                case SupplyState.Isolated:
                    isolatedTiles++;
                    if (nextReserveDepleted) {
                        depletedIsolatedTiles++;
                    }
                    break;
                default:
                    break;
            }
        }
        const summary = this.buildSummary(suppliedTiles, strainedTiles, isolatedTiles, depletedIsolatedTiles);
        this.maybeEmitSupplyMessages(player, summary);
        player.setSupplySummary(summary);
        if (isolatedTiles > depletedIsolatedTiles) {
            this.dirtyPlayers.add(player.smallID());
        }
    }
    classifyTile(tile, ticks) {
        const visited = this.visitGeneration[tile] === this.generation;
        const distance = visited ? this.distances[tile] : Number.MAX_SAFE_INTEGER;
        let nextState = SupplyState.Isolated;
        if (visited && distance <= SUPPLY_CITY_RANGE) {
            nextState = SupplyState.Supplied;
        }
        else if (visited && distance <= SUPPLY_STRAINED_RANGE) {
            nextState = SupplyState.Strained;
        }
        if (nextState !== SupplyState.Isolated) {
            this.isolatedSinceTick[tile] = -1;
            return { nextState, nextReserveDepleted: false };
        }
        if (this.isolatedSinceTick[tile] < 0) {
            this.isolatedSinceTick[tile] = ticks;
        }
        const nextReserveDepleted = ticks - this.isolatedSinceTick[tile] >= SUPPLY_ISOLATED_RESERVE_TICKS;
        return { nextState, nextReserveDepleted };
    }
    buildSummary(suppliedTiles, strainedTiles, isolatedTiles, depletedIsolatedTiles) {
        const totalTiles = suppliedTiles + strainedTiles + isolatedTiles;
        if (totalTiles <= 0) {
            return EMPTY_SUPPLY_SUMMARY;
        }
        const strainedShare = strainedTiles / totalTiles;
        const isolatedReserveShare = Math.max(0, isolatedTiles - depletedIsolatedTiles) / totalTiles;
        const depletedShare = depletedIsolatedTiles / totalTiles;
        const reinforcementMultiplier = clamp(1 -
            strainedShare * (1 - SUPPLY_STRAINED_REINFORCEMENT_MULTIPLIER) -
            isolatedReserveShare * (1 - SUPPLY_ISOLATED_REINFORCEMENT_MULTIPLIER) -
            depletedShare * (1 - SUPPLY_DEPLETED_REINFORCEMENT_MULTIPLIER), 0.7, 1);
        const economicMultiplier = clamp(1 -
            strainedShare * (1 - SUPPLY_STRAINED_ECONOMIC_MULTIPLIER) -
            isolatedReserveShare * (1 - SUPPLY_ISOLATED_ECONOMIC_MULTIPLIER) -
            depletedShare * (1 - SUPPLY_DEPLETED_ECONOMIC_MULTIPLIER), 0.75, 1);
        return {
            suppliedTiles,
            strainedTiles,
            isolatedTiles,
            depletedIsolatedTiles,
            reinforcementMultiplier,
            economicMultiplier,
        };
    }
    collectHubTiles(player) {
        const hubTiles = new Set();
        const playerStations = [];
        const sourcedClusters = new Set();
        for (const city of player.units(UnitType.City)) {
            if (city.isActive() && !city.isUnderConstruction()) {
                hubTiles.add(city.tile());
            }
        }
        for (const port of player.units(UnitType.Port)) {
            if (port.isActive() &&
                !port.isUnderConstruction() &&
                !this.isPortBlockaded(player, port.tile(), port.level())) {
                hubTiles.add(port.tile());
            }
        }
        for (const station of this.game.railNetwork().stationManager().getAll()) {
            const unit = station.unit;
            if (unit.owner() !== player ||
                !unit.isActive() ||
                unit.isUnderConstruction()) {
                continue;
            }
            playerStations.push(station);
            if (hubTiles.has(station.tile()) && station.getCluster() !== null) {
                sourcedClusters.add(station.getCluster());
            }
        }
        for (const station of playerStations) {
            const cluster = station.getCluster();
            if (cluster !== null && sourcedClusters.has(cluster)) {
                hubTiles.add(station.tile());
            }
        }
        return Array.from(hubTiles.values());
    }
    isPortBlockaded(owner, portTile, portLevel) {
        const waterComponent = this.game.getWaterComponent(portTile);
        const warships = this.game.nearbyUnits(portTile, SUPPLY_PORT_BLOCKADE_RADIUS, UnitType.Warship);
        let friendlyStrength = 0;
        let enemyStrength = 0;
        for (const { unit } of warships) {
            if (waterComponent !== null &&
                !this.game.hasWaterComponent(unit.tile(), waterComponent)) {
                continue;
            }
            const strength = Math.max(1, unit.level());
            if (unit.owner() === owner || owner.isFriendly(unit.owner(), true)) {
                friendlyStrength += strength;
            }
            else {
                enemyStrength += strength;
            }
        }
        return (enemyStrength >= SUPPLY_PORT_BLOCKADE_MIN_ENEMY_STRENGTH &&
            enemyStrength > friendlyStrength + Math.max(0, portLevel - 1));
    }
    runDistanceSearch(player, hubTiles) {
        this.generation++;
        if (this.generation === 0) {
            this.generation = 1;
            this.visitGeneration.fill(0);
        }
        let head = 0;
        let tail = 0;
        for (const hub of hubTiles) {
            if (this.visitGeneration[hub] === this.generation) {
                continue;
            }
            this.visitGeneration[hub] = this.generation;
            this.distances[hub] = 0;
            this.queue[tail++] = hub;
        }
        while (head < tail) {
            const tile = this.queue[head++];
            const distance = this.distances[tile];
            if (distance >= SUPPLY_STRAINED_RANGE) {
                continue;
            }
            this.game.forEachNeighbor(tile, (neighbor) => {
                if (this.game.ownerID(neighbor) !== player.smallID()) {
                    return;
                }
                if (this.visitGeneration[neighbor] === this.generation) {
                    return;
                }
                this.visitGeneration[neighbor] = this.generation;
                this.distances[neighbor] = distance + 1;
                this.queue[tail++] = neighbor;
            });
        }
    }
    maybeEmitSupplyMessages(player, summary) {
        const previous = player.supplySummary();
        const wasIsolated = previous.isolatedTiles > 0;
        const nowIsolated = summary.isolatedTiles > 0;
        const wasDepleted = previous.depletedIsolatedTiles > 0;
        const nowDepleted = summary.depletedIsolatedTiles > 0;
        if (!wasIsolated && nowIsolated) {
            this.game.displayMessage("events_display.supply_cut_off", MessageType.ATTACK_REQUEST, player.id());
        }
        else if (wasIsolated && !nowIsolated) {
            this.game.displayMessage("events_display.supply_restored", MessageType.ATTACK_REQUEST, player.id());
        }
        else if (!wasDepleted && nowDepleted) {
            this.game.displayMessage("events_display.supply_reserves_depleted", MessageType.ATTACK_REQUEST, player.id());
        }
    }
}
//# sourceMappingURL=SupplySystem.js.map