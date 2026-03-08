import { renderNumber } from "../../client/Utils";
import { AbstractGraphBuilder, } from "../pathfinding/algorithms/AbstractGraph";
import { AStarWaterHierarchical } from "../pathfinding/algorithms/AStar.WaterHierarchical";
import { ATTACK_INDEX_SENT } from "../StatsSchemas";
import { simpleHash } from "../Util";
import { AllianceImpl } from "./AllianceImpl";
import { AllianceRequestImpl } from "./AllianceRequestImpl";
import { ColoredTeams, Duos, GameMode, HumansVsNations, MessageType, PlayerType, Quads, Trios, UnitType, } from "./Game";
import { GameUpdateType } from "./GameUpdates";
import { packMotionPlans } from "./MotionPlans";
import { PlayerImpl } from "./PlayerImpl";
import { createRailNetwork } from "./RailNetworkImpl";
import { StatsImpl } from "./StatsImpl";
import { SupplySystem } from "./SupplySystem";
import { assignTeams } from "./TeamAssignment";
import { TerraNulliusImpl } from "./TerraNulliusImpl";
import { UnitGrid } from "./UnitGrid";
export function createGame(humans, nations, gameMap, miniGameMap, config, teamGameSpawnAreas) {
    const stats = new StatsImpl();
    return new GameImpl(humans, nations, gameMap, miniGameMap, config, stats, teamGameSpawnAreas);
}
export class GameImpl {
    constructor(_humans, _nations, _map, miniGameMap, _config, _stats, teamGameSpawnAreas) {
        this._humans = _humans;
        this._nations = _nations;
        this._map = _map;
        this.miniGameMap = miniGameMap;
        this._config = _config;
        this._stats = _stats;
        this._ticks = 0;
        this.unInitExecs = [];
        this._players = new Map();
        this._playersBySmallID = [];
        this.execs = [];
        this.allianceRequests = [];
        this.alliances_ = [];
        this.nextPlayerID = 1;
        this._nextUnitID = 1;
        this.updates = createGameUpdatesMap();
        this.tileUpdatePairs = [];
        this.supplyUpdatePairs = [];
        this.motionPlanRecords = [];
        this.planDrivenUnitIds = new Set();
        this.playerTeams = [];
        this.botTeam = ColoredTeams.Bot;
        this._railNetwork = createRailNetwork(this);
        this.supplySystem = new SupplySystem(this);
        // Used to assign unique IDs to each new alliance
        this.nextAllianceID = 0;
        this._isPaused = false;
        this._winner = null;
        this._miniWaterGraph = null;
        this._miniWaterHPA = null;
        this.suppressedTilesUntil = new Map();
        this.suppressionExpiryIndex = new Map();
        this.airSupportZones = [];
        const constructorStart = performance.now();
        this._teamGameSpawnAreas = teamGameSpawnAreas;
        this._terraNullius = new TerraNulliusImpl();
        this._width = _map.width();
        this._height = _map.height();
        this.unitGrid = new UnitGrid(this._map);
        if (_config.gameConfig().gameMode === GameMode.Team) {
            this.populateTeams();
        }
        this.addPlayers();
        if (!_config.disableNavMesh()) {
            const graphBuilder = new AbstractGraphBuilder(this.miniGameMap);
            this._miniWaterGraph = graphBuilder.build();
            this._miniWaterHPA = new AStarWaterHierarchical(this.miniGameMap, this._miniWaterGraph, { cachePaths: true });
        }
        console.log(`[GameImpl] Constructor total: ${(performance.now() - constructorStart).toFixed(0)}ms`);
    }
    populateTeams() {
        let numPlayerTeams = this._config.playerTeams();
        // HumansVsNations mode always has exactly 2 teams
        if (numPlayerTeams === HumansVsNations) {
            this.playerTeams = [ColoredTeams.Humans, ColoredTeams.Nations];
            return;
        }
        if (typeof numPlayerTeams !== "number") {
            const players = this._humans.length + this._nations.length;
            switch (numPlayerTeams) {
                case Duos:
                    numPlayerTeams = Math.ceil(players / 2);
                    break;
                case Trios:
                    numPlayerTeams = Math.ceil(players / 3);
                    break;
                case Quads:
                    numPlayerTeams = Math.ceil(players / 4);
                    break;
                default:
                    throw new Error(`Unknown TeamCountConfig ${numPlayerTeams}`);
            }
        }
        if (numPlayerTeams < 2) {
            throw new Error(`Too few teams: ${numPlayerTeams}`);
        }
        else if (numPlayerTeams < 8) {
            this.playerTeams = [ColoredTeams.Red, ColoredTeams.Blue];
            if (numPlayerTeams >= 3)
                this.playerTeams.push(ColoredTeams.Yellow);
            if (numPlayerTeams >= 4)
                this.playerTeams.push(ColoredTeams.Green);
            if (numPlayerTeams >= 5)
                this.playerTeams.push(ColoredTeams.Purple);
            if (numPlayerTeams >= 6)
                this.playerTeams.push(ColoredTeams.Orange);
            if (numPlayerTeams >= 7)
                this.playerTeams.push(ColoredTeams.Teal);
        }
        else {
            this.playerTeams = [];
            for (let i = 1; i <= numPlayerTeams; i++) {
                this.playerTeams.push(`Team ${i}`);
            }
        }
    }
    addPlayers() {
        if (this.config().gameConfig().gameMode === GameMode.FFA) {
            this._humans.forEach((p) => this.addPlayer(p));
            this._nations.forEach((n) => this.addPlayer(n.playerInfo));
            return;
        }
        if (this._config.playerTeams() === HumansVsNations) {
            this._humans.forEach((p) => this.addPlayer(p, ColoredTeams.Humans));
            this._nations.forEach((n) => this.addPlayer(n.playerInfo, ColoredTeams.Nations));
            return;
        }
        // Team mode
        const allPlayers = [
            ...this._humans,
            ...this._nations.map((n) => n.playerInfo),
        ];
        const playerToTeam = assignTeams(allPlayers, this.playerTeams);
        for (const [playerInfo, team] of playerToTeam.entries()) {
            if (team === "kicked") {
                console.warn(`Player ${playerInfo.name} was kicked from team`);
                continue;
            }
            this.addPlayer(playerInfo, team);
        }
    }
    isOnEdgeOfMap(ref) {
        return this._map.isOnEdgeOfMap(ref);
    }
    owner(ref) {
        return this.playerBySmallID(this.ownerID(ref));
    }
    alliances() {
        return this.alliances_;
    }
    playerBySmallID(id) {
        if (id === 0) {
            return this.terraNullius();
        }
        return this._playersBySmallID[id - 1];
    }
    map() {
        return this._map;
    }
    miniMap() {
        return this.miniGameMap;
    }
    addUpdate(update) {
        this.updates[update.type].push(update);
    }
    nextUnitID() {
        const old = this._nextUnitID;
        this._nextUnitID++;
        return old;
    }
    setFallout(tile, value) {
        if (value && this.hasOwner(tile)) {
            throw Error(`cannot set fallout, tile ${tile} has owner`);
        }
        if (this._map.hasFallout(tile) === value) {
            return;
        }
        this._map.setFallout(tile, value);
        this.recordTileUpdate(tile);
    }
    suppressTile(tile, duration) {
        if (duration <= 0 || !this.isLand(tile)) {
            return;
        }
        const expiresAt = this.ticks() + duration;
        const previousExpiry = this.suppressedTilesUntil.get(tile);
        if (previousExpiry !== undefined && previousExpiry >= expiresAt) {
            if (!this._map.hasSuppression(tile)) {
                this._map.setSuppression(tile, true);
                this.recordTileUpdate(tile);
                this.touchUnitsOnTile(tile);
            }
            return;
        }
        if (previousExpiry !== undefined) {
            const previousTiles = this.suppressionExpiryIndex.get(previousExpiry);
            previousTiles?.delete(tile);
            if (previousTiles?.size === 0) {
                this.suppressionExpiryIndex.delete(previousExpiry);
            }
        }
        this.suppressedTilesUntil.set(tile, expiresAt);
        const expiryTiles = this.suppressionExpiryIndex.get(expiresAt) ?? new Set();
        expiryTiles.add(tile);
        this.suppressionExpiryIndex.set(expiresAt, expiryTiles);
        if (!this._map.hasSuppression(tile)) {
            this._map.setSuppression(tile, true);
            this.recordTileUpdate(tile);
            this.touchUnitsOnTile(tile);
        }
    }
    expireSuppression() {
        const expiryTiles = this.suppressionExpiryIndex.get(this._ticks);
        if (!expiryTiles) {
            return;
        }
        for (const tile of expiryTiles) {
            if (this.suppressedTilesUntil.get(tile) !== this._ticks) {
                continue;
            }
            this.suppressedTilesUntil.delete(tile);
            if (!this._map.hasSuppression(tile)) {
                continue;
            }
            this._map.setSuppression(tile, false);
            this.recordTileUpdate(tile);
            this.touchUnitsOnTile(tile);
        }
        this.suppressionExpiryIndex.delete(this._ticks);
    }
    addAirSupportZone(owner, tile, radius, duration) {
        if (duration <= 0 || radius <= 0 || !this.isValidRef(tile)) {
            return;
        }
        this.airSupportZones.push({
            ownerSmallID: owner.smallID(),
            tile,
            radiusSquared: radius * radius,
            expiresAt: this._ticks + duration,
        });
    }
    hasAirSupport(tile, owner) {
        for (const zone of this.airSupportZones) {
            if (zone.ownerSmallID !== owner.smallID()) {
                continue;
            }
            if (zone.expiresAt <= this._ticks) {
                continue;
            }
            if (this.euclideanDistSquared(tile, zone.tile) <= zone.radiusSquared) {
                return true;
            }
        }
        return false;
    }
    hasRadarCoverage(tile, owner) {
        return this.anyUnitNearby(tile, this.config().radarStationRange(), UnitType.RadarStation, (unit) => unit.owner() === owner &&
            unit.isActive() &&
            !unit.isUnderConstruction() &&
            !unit.isMarkedForDeletion(), undefined, true);
    }
    expireAirSupportZones() {
        if (this.airSupportZones.length === 0) {
            return;
        }
        this.airSupportZones = this.airSupportZones.filter((zone) => zone.expiresAt > this._ticks);
    }
    touchUnitsOnTile(tile) {
        for (const player of this._players.values()) {
            for (const unit of player.units()) {
                if (unit.tile() === tile) {
                    unit.touch();
                }
            }
        }
    }
    units(...types) {
        return Array.from(this._players.values()).flatMap((p) => p.units(...types));
    }
    unitCount(type) {
        let total = 0;
        for (const player of this._players.values()) {
            total += player.unitCount(type);
        }
        return total;
    }
    unitInfo(type) {
        return this.config().unitInfo(type);
    }
    nations() {
        return this._nations;
    }
    createAllianceRequest(requestor, recipient) {
        if (requestor.isAlliedWith(recipient)) {
            console.log("cannot request alliance, already allied");
            return null;
        }
        if (recipient
            .incomingAllianceRequests()
            .find((ar) => ar.requestor() === requestor) !== undefined) {
            console.log(`duplicate alliance request from ${requestor.name()}`);
            return null;
        }
        const correspondingReq = requestor
            .incomingAllianceRequests()
            .find((ar) => ar.requestor() === recipient);
        if (correspondingReq !== undefined) {
            console.log(`got corresponding alliance requests, accepting`);
            correspondingReq.accept();
            return null;
        }
        const ar = new AllianceRequestImpl(requestor, recipient, this._ticks, this);
        this.allianceRequests.push(ar);
        this.addUpdate(ar.toUpdate());
        return ar;
    }
    acceptAllianceRequest(request) {
        this.allianceRequests = this.allianceRequests.filter((ar) => ar !== request);
        const requestor = request.requestor();
        const recipient = request.recipient();
        const existing = requestor.allianceWith(recipient);
        if (existing) {
            throw new Error(`cannot accept alliance request, already allied with ${recipient.name()}`);
        }
        // Create and register the new alliance
        const alliance = new AllianceImpl(this, requestor, recipient, this._ticks, this.nextAllianceID++);
        this.alliances_.push(alliance);
        request.requestor().pastOutgoingAllianceRequests.push(request);
        this.addUpdate({
            type: GameUpdateType.AllianceRequestReply,
            request: request.toUpdate(),
            accepted: true,
        });
    }
    rejectAllianceRequest(request) {
        this.allianceRequests = this.allianceRequests.filter((ar) => ar !== request);
        request.requestor().pastOutgoingAllianceRequests.push(request);
        this.addUpdate({
            type: GameUpdateType.AllianceRequestReply,
            request: request.toUpdate(),
            accepted: false,
        });
    }
    hasPlayer(id) {
        return this._players.has(id);
    }
    config() {
        return this._config;
    }
    isPaused() {
        return this._isPaused;
    }
    setPaused(paused) {
        this._isPaused = paused;
        this.addUpdate({ type: GameUpdateType.GamePaused, paused });
    }
    inSpawnPhase() {
        return this._ticks <= this.config().numSpawnPhaseTurns();
    }
    ticks() {
        return this._ticks;
    }
    executeNextTick() {
        this.updates = createGameUpdatesMap();
        this.tileUpdatePairs.length = 0;
        this.supplyUpdatePairs.length = 0;
        this.expireSuppression();
        this.expireAirSupportZones();
        this.execs.forEach((e) => {
            if ((!this.inSpawnPhase() || e.activeDuringSpawnPhase()) &&
                e.isActive()) {
                e.tick(this._ticks);
            }
        });
        const inited = [];
        const unInited = [];
        this.unInitExecs.forEach((e) => {
            if (!this.inSpawnPhase() || e.activeDuringSpawnPhase()) {
                e.init(this, this._ticks);
                inited.push(e);
            }
            else {
                unInited.push(e);
            }
        });
        this.removeInactiveExecutions();
        this.execs.push(...inited);
        this.unInitExecs = unInited;
        for (const player of this._players.values()) {
            // Players change each to so always add them
            this.addUpdate(player.toUpdate());
        }
        if (this.ticks() % 10 === 0) {
            this.addUpdate({
                type: GameUpdateType.Hash,
                tick: this.ticks(),
                hash: this.hash(),
            });
        }
        this._ticks++;
        return this.updates;
    }
    recordTileUpdate(tile) {
        this.tileUpdatePairs.push(tile, this._map.tileState(tile));
    }
    recordSupplyUpdate(tile) {
        this.supplyUpdatePairs.push(tile, this.supplySystem.supplyState(tile) |
            (this.supplySystem.isReserveDepleted(tile) ? 0b100 : 0));
    }
    drainPackedTileUpdates() {
        const pairs = this.tileUpdatePairs;
        const packed = new Uint32Array(pairs.length);
        for (let i = 0; i < pairs.length; i++) {
            packed[i] = pairs[i];
        }
        pairs.length = 0;
        return packed;
    }
    drainPackedSupplyUpdates() {
        if (this.supplyUpdatePairs.length === 0) {
            return null;
        }
        const pairs = this.supplyUpdatePairs;
        const packed = new Uint32Array(pairs.length);
        for (let i = 0; i < pairs.length; i++) {
            packed[i] = pairs[i];
        }
        pairs.length = 0;
        return packed;
    }
    recordMotionPlan(record) {
        switch (record.kind) {
            case "grid":
                this.planDrivenUnitIds.add(record.unitId);
                break;
            case "train":
                this.planDrivenUnitIds.add(record.engineUnitId);
                for (const unitId of record.carUnitIds) {
                    this.planDrivenUnitIds.add(unitId);
                }
                break;
        }
        this.motionPlanRecords.push(record);
    }
    isUnitPlanDriven(unitId) {
        return this.planDrivenUnitIds.has(unitId);
    }
    maybeAddUnitUpdate(unit) {
        if (!this.isUnitPlanDriven(unit.id())) {
            this.addUpdate(unit.toUpdate());
        }
    }
    onUnitMoved(unit) {
        this.updateUnitTile(unit);
        this.maybeAddUnitUpdate(unit);
    }
    drainPackedMotionPlans() {
        const records = this.motionPlanRecords;
        if (records.length === 0) {
            return null;
        }
        const packed = packMotionPlans(records);
        records.length = 0;
        return packed;
    }
    hash() {
        let hash = 1;
        this._players.forEach((p) => {
            hash += p.hash();
        });
        return hash;
    }
    terraNullius() {
        return this._terraNullius;
    }
    removeInactiveExecutions() {
        const activeExecs = [];
        for (const exec of this.execs) {
            if (this.inSpawnPhase()) {
                if (exec.activeDuringSpawnPhase()) {
                    if (exec.isActive()) {
                        activeExecs.push(exec);
                    }
                }
                else {
                    activeExecs.push(exec);
                }
            }
            else {
                if (exec.isActive()) {
                    activeExecs.push(exec);
                }
            }
        }
        this.execs = activeExecs;
    }
    players() {
        return Array.from(this._players.values()).filter((p) => p.isAlive());
    }
    allPlayers() {
        return Array.from(this._players.values());
    }
    executions() {
        return [...this.execs, ...this.unInitExecs];
    }
    addExecution(...exec) {
        this.unInitExecs.push(...exec);
    }
    removeExecution(exec) {
        this.execs = this.execs.filter((execution) => execution !== exec);
        this.unInitExecs = this.unInitExecs.filter((execution) => execution !== exec);
    }
    playerView(id) {
        return this.player(id);
    }
    addPlayer(playerInfo, team = null) {
        const player = new PlayerImpl(this, this.nextPlayerID, playerInfo, this.config().startManpower(playerInfo), team ?? this.maybeAssignTeam(playerInfo));
        this._playersBySmallID.push(player);
        this.nextPlayerID++;
        this._players.set(playerInfo.id, player);
        return player;
    }
    maybeAssignTeam(player) {
        if (this._config.gameConfig().gameMode !== GameMode.Team) {
            return null;
        }
        if (player.playerType === PlayerType.Bot) {
            return this.botTeam;
        }
        const rand = simpleHash(player.id);
        return this.playerTeams[rand % this.playerTeams.length];
    }
    player(id) {
        const player = this._players.get(id);
        if (player === undefined) {
            throw new Error(`Player with id ${id} not found`);
        }
        return player;
    }
    playerByClientID(id) {
        for (const [, player] of this._players) {
            if (player.clientID() === id) {
                return player;
            }
        }
        return null;
    }
    isOnMap(cell) {
        return (cell.x >= 0 &&
            cell.x < this._width &&
            cell.y >= 0 &&
            cell.y < this._height);
    }
    neighborsWithDiag(tile) {
        const x = this.x(tile);
        const y = this.y(tile);
        const ns = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0)
                    continue; // Skip the center tile
                const newX = x + dx;
                const newY = y + dy;
                if (newX >= 0 &&
                    newX < this._width &&
                    newY >= 0 &&
                    newY < this._height) {
                    ns.push(this._map.ref(newX, newY));
                }
            }
        }
        return ns;
    }
    // Zero-allocation neighbor iteration for performance-critical code
    forEachNeighborWithDiag(tile, callback) {
        const x = this.x(tile);
        const y = this.y(tile);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0)
                    continue; // Skip the center tile
                const newX = x + dx;
                const newY = y + dy;
                if (newX >= 0 &&
                    newX < this._width &&
                    newY >= 0 &&
                    newY < this._height) {
                    callback(this._map.ref(newX, newY));
                }
            }
        }
    }
    conquer(owner, tile) {
        if (!this.isLand(tile)) {
            throw Error(`cannot conquer water`);
        }
        const previousOwner = this.owner(tile);
        const previousOwnerSmallId = previousOwner.smallID();
        if (previousOwner.isPlayer()) {
            previousOwner._lastTileChange = this._ticks;
            previousOwner._tiles.delete(tile);
            previousOwner._borderTiles.delete(tile);
        }
        this._map.setOwnerID(tile, owner.smallID());
        owner._tiles.add(tile);
        owner._lastTileChange = this._ticks;
        this.updateBorders(tile);
        this._map.setFallout(tile, false);
        this.recordTileUpdate(tile);
        this.supplySystem.markTileOwnershipChanged(tile, previousOwnerSmallId, owner.smallID());
    }
    relinquish(tile) {
        if (!this.hasOwner(tile)) {
            throw new Error(`Cannot relinquish tile because it is unowned`);
        }
        if (this.isWater(tile)) {
            throw new Error("Cannot relinquish water");
        }
        const previousOwner = this.owner(tile);
        previousOwner._lastTileChange = this._ticks;
        previousOwner._tiles.delete(tile);
        previousOwner._borderTiles.delete(tile);
        this._map.setOwnerID(tile, 0);
        this.updateBorders(tile);
        this.recordTileUpdate(tile);
        this.supplySystem.markTileOwnershipChanged(tile, previousOwner.smallID(), 0);
    }
    updateBorders(tile) {
        const updateBorderStatus = (t) => {
            if (!this.hasOwner(t)) {
                return;
            }
            const owner = this.owner(t);
            if (this.calcIsBorder(t)) {
                owner._borderTiles.add(t);
            }
            else {
                owner._borderTiles.delete(t);
            }
        };
        updateBorderStatus(tile);
        this.forEachNeighbor(tile, updateBorderStatus);
    }
    calcIsBorder(tile) {
        if (!this.hasOwner(tile)) {
            return false;
        }
        const ownerId = this.ownerID(tile);
        const x = this.x(tile);
        const y = this.y(tile);
        if (x > 0 && this.ownerID(this._map.ref(x - 1, y)) !== ownerId) {
            return true;
        }
        if (x + 1 < this._width &&
            this.ownerID(this._map.ref(x + 1, y)) !== ownerId) {
            return true;
        }
        if (y > 0 && this.ownerID(this._map.ref(x, y - 1)) !== ownerId) {
            return true;
        }
        if (y + 1 < this._height &&
            this.ownerID(this._map.ref(x, y + 1)) !== ownerId) {
            return true;
        }
        return false;
    }
    target(targeter, target) {
        this.addUpdate({
            type: GameUpdateType.TargetPlayer,
            playerID: targeter.smallID(),
            targetID: target.smallID(),
        });
    }
    breakAlliance(breaker, alliance) {
        let other;
        if (alliance.requestor() === breaker) {
            other = alliance.recipient();
        }
        else {
            other = alliance.requestor();
        }
        if (!breaker.isAlliedWith(other)) {
            throw new Error(`${breaker} not allied with ${other}, cannot break alliance`);
        }
        if (!other.isTraitor() && !other.isDisconnected()) {
            breaker.markTraitor();
        }
        this.alliances_ = this.alliances_.filter((a) => a !== alliance);
        this.addUpdate({
            type: GameUpdateType.BrokeAlliance,
            traitorID: breaker.smallID(),
            betrayedID: other.smallID(),
            allianceID: alliance.id(),
        });
    }
    expireAlliance(alliance) {
        const p1Set = new Set(alliance.recipient().alliances());
        const alliances = alliance
            .requestor()
            .alliances()
            .filter((a) => p1Set.has(a));
        if (alliances.length !== 1) {
            throw new Error(`cannot expire alliance: must have exactly one alliance, have ${alliances.length}`);
        }
        this.alliances_ = this.alliances_.filter((a) => a !== alliances[0]);
        this.addUpdate({
            type: GameUpdateType.AllianceExpired,
            player1ID: alliance.requestor().smallID(),
            player2ID: alliance.recipient().smallID(),
        });
    }
    removeAlliancesByPlayerSilently(player) {
        this.alliances_ = this.alliances_.filter((a) => a.requestor() !== player && a.recipient() !== player);
    }
    isSpawnImmunityActive() {
        return (this.config().numSpawnPhaseTurns() +
            this.config().spawnImmunityDuration() >
            this.ticks());
    }
    isNationSpawnImmunityActive() {
        return (this.config().numSpawnPhaseTurns() +
            this.config().nationSpawnImmunityDuration() >
            this.ticks());
    }
    sendEmojiUpdate(msg) {
        this.addUpdate({
            type: GameUpdateType.Emoji,
            emoji: msg,
        });
    }
    setWinner(winner, allPlayersStats) {
        this._winner = winner;
        this.addUpdate({
            type: GameUpdateType.Win,
            winner: this.makeWinner(winner),
            allPlayersStats,
        });
    }
    getWinner() {
        return this._winner;
    }
    makeWinner(winner) {
        if (typeof winner === "string") {
            return [
                "team",
                winner,
                ...this.players()
                    .filter((p) => p.team() === winner && p.clientID() !== null)
                    .map((p) => p.clientID()),
            ];
        }
        else {
            const clientId = winner.clientID();
            if (clientId === null) {
                return ["nation", winner.name()];
            }
            return [
                "player",
                clientId,
                // TODO: Assists (vote for peace)
            ];
        }
    }
    teams() {
        if (this._config.gameConfig().gameMode !== GameMode.Team) {
            return [];
        }
        return [this.botTeam, ...this.playerTeams];
    }
    teamSpawnArea(team) {
        if (!this._teamGameSpawnAreas) {
            return undefined;
        }
        const numTeams = this.playerTeams.length;
        const areas = this._teamGameSpawnAreas[String(numTeams)];
        if (!areas) {
            return undefined;
        }
        const teamIndex = this.playerTeams.indexOf(team);
        if (teamIndex < 0 || teamIndex >= areas.length) {
            return undefined;
        }
        return areas[teamIndex];
    }
    displayMessage(message, type, playerID, goldAmount, params) {
        let id = null;
        if (playerID !== null) {
            id = this.player(playerID).smallID();
        }
        this.addUpdate({
            type: GameUpdateType.DisplayEvent,
            messageType: type,
            message: message,
            playerID: id,
            goldAmount: goldAmount,
            params: params,
        });
    }
    displayChat(message, category, target, playerID, isFrom, recipient) {
        let id = null;
        if (playerID !== null) {
            id = this.player(playerID).smallID();
        }
        this.addUpdate({
            type: GameUpdateType.DisplayChatEvent,
            key: message,
            category: category,
            target: target,
            playerID: id,
            isFrom,
            recipient: recipient,
        });
    }
    displayIncomingUnit(unitID, message, type, playerID) {
        const id = this.player(playerID).smallID();
        this.addUpdate({
            type: GameUpdateType.UnitIncoming,
            unitID: unitID,
            message: message,
            messageType: type,
            playerID: id,
        });
    }
    addUnit(u) {
        this.supplySystem.markUnitAdded(u.type(), u.owner(), u.tile());
        this.unitGrid.addUnit(u);
    }
    removeUnit(u) {
        this.supplySystem.markUnitRemoved(u.type(), u.owner(), u.tile());
        this.unitGrid.removeUnit(u);
        this.planDrivenUnitIds.delete(u.id());
        if (u.hasTrainStation()) {
            this._railNetwork.removeStation(u);
        }
    }
    updateUnitTile(u) {
        this.unitGrid.updateUnitCell(u);
        this.supplySystem.markUnitMoved(u.type(), u.lastTile(), u.tile());
    }
    hasUnitNearby(tile, searchRange, type, playerId, includeUnderConstruction) {
        return this.unitGrid.hasUnitNearby(tile, searchRange, type, playerId, includeUnderConstruction);
    }
    anyUnitNearby(tile, searchRange, types, predicate, playerId, includeUnderConstruction) {
        return this.unitGrid.anyUnitNearby(tile, searchRange, types, predicate, playerId, includeUnderConstruction);
    }
    nearbyUnits(tile, searchRange, types, predicate, includeUnderConstruction) {
        return this.unitGrid.nearbyUnits(tile, searchRange, types, predicate, includeUnderConstruction);
    }
    ref(x, y) {
        return this._map.ref(x, y);
    }
    isValidRef(ref) {
        return this._map.isValidRef(ref);
    }
    x(ref) {
        return this._map.x(ref);
    }
    y(ref) {
        return this._map.y(ref);
    }
    cell(ref) {
        return this._map.cell(ref);
    }
    width() {
        return this._map.width();
    }
    height() {
        return this._map.height();
    }
    numLandTiles() {
        return this._map.numLandTiles();
    }
    isValidCoord(x, y) {
        return this._map.isValidCoord(x, y);
    }
    isLand(ref) {
        return this._map.isLand(ref);
    }
    isOceanShore(ref) {
        return this._map.isOceanShore(ref);
    }
    isOcean(ref) {
        return this._map.isOcean(ref);
    }
    isShoreline(ref) {
        return this._map.isShoreline(ref);
    }
    magnitude(ref) {
        return this._map.magnitude(ref);
    }
    ownerID(ref) {
        return this._map.ownerID(ref);
    }
    hasOwner(ref) {
        return this._map.hasOwner(ref);
    }
    setOwnerID(ref, playerId) {
        return this._map.setOwnerID(ref, playerId);
    }
    hasFallout(ref) {
        return this._map.hasFallout(ref);
    }
    hasSuppression(ref) {
        return this._map.hasSuppression(ref);
    }
    setSuppression(ref, value) {
        this._map.setSuppression(ref, value);
    }
    isBorder(ref) {
        return this._map.isBorder(ref);
    }
    neighbors(ref) {
        return this._map.neighbors(ref);
    }
    // Zero-allocation neighbor iteration (cardinal only)
    forEachNeighbor(tile, callback) {
        const x = this.x(tile);
        const y = this.y(tile);
        if (x > 0)
            callback(this._map.ref(x - 1, y));
        if (x + 1 < this._width)
            callback(this._map.ref(x + 1, y));
        if (y > 0)
            callback(this._map.ref(x, y - 1));
        if (y + 1 < this._height)
            callback(this._map.ref(x, y + 1));
    }
    isWater(ref) {
        return this._map.isWater(ref);
    }
    isLake(ref) {
        return this._map.isLake(ref);
    }
    isShore(ref) {
        return this._map.isShore(ref);
    }
    cost(ref) {
        return this._map.cost(ref);
    }
    terrainType(ref) {
        return this._map.terrainType(ref);
    }
    forEachTile(fn) {
        return this._map.forEachTile(fn);
    }
    manhattanDist(c1, c2) {
        return this._map.manhattanDist(c1, c2);
    }
    euclideanDistSquared(c1, c2) {
        return this._map.euclideanDistSquared(c1, c2);
    }
    circleSearch(tile, radius, filter) {
        return this._map.circleSearch(tile, radius, filter);
    }
    bfs(tile, filter) {
        return this._map.bfs(tile, filter);
    }
    tileState(tile) {
        return this._map.tileState(tile);
    }
    updateTile(tile, state) {
        this._map.updateTile(tile, state);
    }
    numTilesWithFallout() {
        return this._map.numTilesWithFallout();
    }
    stats() {
        return this._stats;
    }
    railNetwork() {
        return this._railNetwork;
    }
    recomputeSupplyIfNeeded(ticks) {
        this.supplySystem.recomputeIfNeeded(ticks);
    }
    miniWaterHPA() {
        return this._miniWaterHPA;
    }
    miniWaterGraph() {
        return this._miniWaterGraph;
    }
    getWaterComponent(tile) {
        // Permissive fallback for tests with disableNavMesh
        if (!this._miniWaterGraph)
            return 0;
        const miniX = Math.floor(this._map.x(tile) / 2);
        const miniY = Math.floor(this._map.y(tile) / 2);
        const miniTile = this.miniGameMap.ref(miniX, miniY);
        if (this.miniGameMap.isWater(miniTile)) {
            return this._miniWaterGraph.getComponentId(miniTile);
        }
        // Shore tile: find water neighbor (expand search for minimap resolution loss)
        for (const n of this.miniGameMap.neighbors(miniTile)) {
            if (this.miniGameMap.isWater(n)) {
                return this._miniWaterGraph.getComponentId(n);
            }
        }
        // Extended search: check 2-hop neighbors for narrow straits
        for (const n of this.miniGameMap.neighbors(miniTile)) {
            for (const n2 of this.miniGameMap.neighbors(n)) {
                if (this.miniGameMap.isWater(n2)) {
                    return this._miniWaterGraph.getComponentId(n2);
                }
            }
        }
        return null;
    }
    hasWaterComponent(tile, component) {
        // Permissive fallback for tests with disableNavMesh
        if (!this._miniWaterGraph)
            return true;
        const miniX = Math.floor(this._map.x(tile) / 2);
        const miniY = Math.floor(this._map.y(tile) / 2);
        const miniTile = this.miniGameMap.ref(miniX, miniY);
        // Check miniTile itself (shore in full map may be water in minimap)
        if (this.miniGameMap.isWater(miniTile) &&
            this._miniWaterGraph.getComponentId(miniTile) === component) {
            return true;
        }
        // Check neighbors
        for (const n of this.miniGameMap.neighbors(miniTile)) {
            if (this.miniGameMap.isWater(n) &&
                this._miniWaterGraph.getComponentId(n) === component) {
                return true;
            }
        }
        // Extended search: check 2-hop neighbors for narrow straits
        for (const n of this.miniGameMap.neighbors(miniTile)) {
            for (const n2 of this.miniGameMap.neighbors(n)) {
                if (this.miniGameMap.isWater(n2) &&
                    this._miniWaterGraph.getComponentId(n2) === component) {
                    return true;
                }
            }
        }
        return false;
    }
    supplyState(tile) {
        return this.supplySystem.supplyState(tile);
    }
    isSupplyReserveDepleted(tile) {
        return this.supplySystem.isReserveDepleted(tile);
    }
    playerSupplySummary(player) {
        return this.supplySystem.playerSummary(player);
    }
    conquerPlayer(conqueror, conquered) {
        if (conquered.isDisconnected() && conqueror.isOnSameTeam(conquered)) {
            const ships = conquered
                .units()
                .filter((u) => u.type() === UnitType.Warship ||
                u.type() === UnitType.TransportShip);
            for (const ship of ships) {
                conqueror.captureUnit(ship);
            }
        }
        // Don't transfer gold when the conquered player didn't play (never attacked anyone)
        // This is especially important when starting gold is enabled
        const stats = this._stats.getPlayerStats(conquered);
        const attacksSent = stats?.attacks?.[ATTACK_INDEX_SENT] ?? 0n;
        const skipGoldTransfer = attacksSent === 0n && conquered.type() === PlayerType.Human;
        const gold = skipGoldTransfer ? 0n : conquered.gold();
        if (skipGoldTransfer) {
            this.displayMessage("events_display.conquered_no_gold", MessageType.CONQUERED_PLAYER, conqueror.id(), undefined, {
                name: conquered.displayName(),
            });
        }
        else {
            this.displayMessage("events_display.received_gold_from_conquest", MessageType.CONQUERED_PLAYER, conqueror.id(), gold, {
                gold: renderNumber(gold),
                name: conquered.displayName(),
            });
            conqueror.addGold(gold);
            conquered.removeGold(gold);
            // Record stats
            this.stats().goldWar(conqueror, conquered, gold);
        }
        this.addUpdate({
            type: GameUpdateType.ConquestEvent,
            conquerorId: conqueror.id(),
            conqueredId: conquered.id(),
            gold,
        });
    }
}
// Or a more dynamic approach that will catch new enum values:
const createGameUpdatesMap = () => {
    const map = {};
    Object.values(GameUpdateType)
        .filter((key) => !isNaN(Number(key))) // Filter out reverse mappings
        .forEach((key) => {
        map[key] = [];
    });
    return map;
};
//# sourceMappingURL=GameImpl.js.map