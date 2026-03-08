import { Colord, colord } from "colord";
import { base64url } from "jose";
import { PatternDecoder } from "../PatternDecoder";
import { createRandomName } from "../Util";
import { UnitType, } from "./Game";
import { GameUpdateType, } from "./GameUpdates";
import { unpackMotionPlans } from "./MotionPlans";
import { TerraNulliusImpl } from "./TerraNulliusImpl";
import { UnitGrid } from "./UnitGrid";
import { UserSettings } from "./UserSettings";
const userSettings = new UserSettings();
const FRIENDLY_TINT_TARGET = { r: 0, g: 255, b: 0, a: 1 };
const EMBARGO_TINT_TARGET = { r: 255, g: 0, b: 0, a: 1 };
const BORDER_TINT_RATIO = 0.35;
function unpackSupplyTileState(packed) {
    return {
        state: (packed & 0b11),
        reserveDepleted: (packed & 0b100) !== 0,
    };
}
export class UnitView {
    constructor(gameView, data) {
        this.gameView = gameView;
        this.data = data;
        this._wasUpdated = true;
        this.lastPos = [];
        this.lastPos.push(data.pos);
        this._createdAt = this.gameView.ticks();
    }
    createdAt() {
        return this._createdAt;
    }
    wasUpdated() {
        return this._wasUpdated;
    }
    lastTiles() {
        return this.lastPos;
    }
    lastTile() {
        if (this.lastPos.length === 0) {
            return this.data.pos;
        }
        return this.lastPos[0];
    }
    update(data) {
        this.lastPos.push(data.pos);
        this._wasUpdated = true;
        this.data = data;
    }
    applyDerivedPosition(pos) {
        const prev = this.data.pos;
        this.lastPos.push(pos);
        this._wasUpdated = true;
        this.data = {
            ...this.data,
            lastPos: prev,
            pos,
        };
    }
    id() {
        return this.data.id;
    }
    targetable() {
        return this.data.targetable;
    }
    markedForDeletion() {
        return this.data.markedForDeletion;
    }
    type() {
        return this.data.unitType;
    }
    troops() {
        return this.data.troops;
    }
    retreating() {
        if (this.type() !== UnitType.TransportShip) {
            throw Error("Must be a transport ship");
        }
        return this.data.retreating;
    }
    tile() {
        return this.data.pos;
    }
    owner() {
        return this.gameView.playerBySmallID(this.data.ownerID);
    }
    isActive() {
        return this.data.isActive;
    }
    reachedTarget() {
        return this.data.reachedTarget;
    }
    hasHealth() {
        return this.data.health !== undefined;
    }
    health() {
        return this.data.health ?? 0;
    }
    isUnderConstruction() {
        return this.data.underConstruction === true;
    }
    targetUnitId() {
        return this.data.targetUnitId;
    }
    targetTile() {
        return this.data.targetTile;
    }
    airbaseId() {
        return this.data.airbaseId;
    }
    airMissionType() {
        return this.data.airMissionType;
    }
    airMissionPhase() {
        return this.data.airMissionPhase;
    }
    airMissionTicksRemaining() {
        return this.data.airMissionTicksRemaining;
    }
    rearmCompleteTick() {
        return this.data.rearmCompleteTick;
    }
    // How "ready" this unit is from 0 to 1.
    missileReadinesss() {
        const maxMissiles = this.data.level;
        const missilesReloading = this.data.missileTimerQueue.length;
        if (missilesReloading === 0) {
            return 1;
        }
        const missilesReady = maxMissiles - missilesReloading;
        if (missilesReady === 0 && maxMissiles > 1) {
            // Unless we have just one missile (level 1),
            // show 0% readiness so user knows no missiles are ready.
            return 0;
        }
        let readiness = missilesReady / maxMissiles;
        const cooldownDuration = this.data.unitType === UnitType.SAMLauncher
            ? this.gameView.config().SAMCooldown()
            : this.data.unitType === UnitType.AABattery
                ? this.gameView.config().aaBatteryCooldown()
                : this.gameView.config().SiloCooldown();
        for (const cooldown of this.data.missileTimerQueue) {
            const cooldownProgress = this.gameView.ticks() - cooldown;
            const cooldownRatio = cooldownProgress / cooldownDuration;
            const adjusted = cooldownRatio / maxMissiles;
            readiness += adjusted;
        }
        return readiness;
    }
    level() {
        return this.data.level;
    }
    hasTrainStation() {
        return this.data.hasTrainStation;
    }
    isSuppressed() {
        return this.data.suppressed;
    }
    trainType() {
        return this.data.trainType;
    }
    isLoaded() {
        return this.data.loaded;
    }
}
export class PlayerView {
    constructor(game, data, nameData, cosmetics) {
        this.game = game;
        this.data = data;
        this.nameData = nameData;
        this.cosmetics = cosmetics;
        this.anonymousName = null;
        if (data.clientID === game.myClientID()) {
            this.anonymousName = this.data.name;
        }
        else {
            this.anonymousName = createRandomName(this.data.name, this.data.playerType);
        }
        const defaultTerritoryColor = this.game
            .config()
            .theme()
            .territoryColor(this);
        const defaultBorderColor = this.game
            .config()
            .theme()
            .borderColor(defaultTerritoryColor);
        const pattern = userSettings.territoryPatterns()
            ? this.cosmetics.pattern
            : undefined;
        if (pattern) {
            pattern.colorPalette ?? (pattern.colorPalette = {
                name: "",
                primaryColor: defaultTerritoryColor.toHex(),
                secondaryColor: defaultBorderColor.toHex(),
            });
        }
        if (this.team() === null) {
            this._territoryColor = colord(this.cosmetics.color?.color ??
                pattern?.colorPalette?.primaryColor ??
                defaultTerritoryColor.toHex());
        }
        else {
            this._territoryColor = defaultTerritoryColor;
        }
        this._structureColors = this.game
            .config()
            .theme()
            .structureColors(this._territoryColor);
        const maybeFocusedBorderColor = this.game.myClientID() === this.data.clientID
            ? this.game.config().theme().focusedBorderColor()
            : defaultBorderColor;
        this._borderColor = new Colord(pattern?.colorPalette?.secondaryColor ??
            this.cosmetics.color?.color ??
            maybeFocusedBorderColor.toHex());
        // Pre-compute all border color variants once
        const theme = this.game.config().theme();
        const baseRgb = this._borderColor.toRgb();
        // Neutral is just the base color
        this._borderColorNeutral = this._borderColor;
        // Compute friendly tint
        this._borderColorFriendly = colord({
            r: Math.round(baseRgb.r * (1 - BORDER_TINT_RATIO) +
                FRIENDLY_TINT_TARGET.r * BORDER_TINT_RATIO),
            g: Math.round(baseRgb.g * (1 - BORDER_TINT_RATIO) +
                FRIENDLY_TINT_TARGET.g * BORDER_TINT_RATIO),
            b: Math.round(baseRgb.b * (1 - BORDER_TINT_RATIO) +
                FRIENDLY_TINT_TARGET.b * BORDER_TINT_RATIO),
            a: baseRgb.a,
        });
        // Compute embargo tint
        this._borderColorEmbargo = colord({
            r: Math.round(baseRgb.r * (1 - BORDER_TINT_RATIO) +
                EMBARGO_TINT_TARGET.r * BORDER_TINT_RATIO),
            g: Math.round(baseRgb.g * (1 - BORDER_TINT_RATIO) +
                EMBARGO_TINT_TARGET.g * BORDER_TINT_RATIO),
            b: Math.round(baseRgb.b * (1 - BORDER_TINT_RATIO) +
                EMBARGO_TINT_TARGET.b * BORDER_TINT_RATIO),
            a: baseRgb.a,
        });
        // Pre-compute defended variants
        this._borderColorDefendedNeutral = theme.defendedBorderColors(this._borderColorNeutral);
        this._borderColorDefendedFriendly = theme.defendedBorderColors(this._borderColorFriendly);
        this._borderColorDefendedEmbargo = theme.defendedBorderColors(this._borderColorEmbargo);
        this.decoder =
            pattern === undefined
                ? undefined
                : new PatternDecoder(pattern, base64url.decode);
    }
    territoryColor(tile) {
        if (tile === undefined || this.decoder === undefined) {
            return this._territoryColor;
        }
        const isPrimary = this.decoder.isPrimary(this.game.x(tile), this.game.y(tile));
        return isPrimary ? this._territoryColor : this._borderColor;
    }
    structureColors() {
        return this._structureColors;
    }
    /**
     * Border color for a tile:
     * - Tints by neighbor relations (embargo → red, friendly → green, else neutral).
     * - If defended, applies theme checkerboard to the tinted color.
     */
    borderColor(tile, isDefended = false) {
        if (tile === undefined) {
            return this._borderColor;
        }
        const { hasEmbargo, hasFriendly } = this.borderRelationFlags(tile);
        let baseColor;
        let defendedColors;
        if (hasEmbargo) {
            baseColor = this._borderColorEmbargo;
            defendedColors = this._borderColorDefendedEmbargo;
        }
        else if (hasFriendly) {
            baseColor = this._borderColorFriendly;
            defendedColors = this._borderColorDefendedFriendly;
        }
        else {
            baseColor = this._borderColorNeutral;
            defendedColors = this._borderColorDefendedNeutral;
        }
        if (!isDefended) {
            return baseColor;
        }
        const x = this.game.x(tile);
        const y = this.game.y(tile);
        const lightTile = (x % 2 === 0 && y % 2 === 0) || (y % 2 === 1 && x % 2 === 1);
        return lightTile ? defendedColors.light : defendedColors.dark;
    }
    /**
     * Border relation flags for a tile, used by both CPU and WebGL renderers.
     */
    borderRelationFlags(tile) {
        const mySmallID = this.smallID();
        let hasEmbargo = false;
        let hasFriendly = false;
        for (const n of this.game.neighbors(tile)) {
            if (!this.game.hasOwner(n)) {
                continue;
            }
            const otherOwner = this.game.owner(n);
            if (!otherOwner.isPlayer() || otherOwner.smallID() === mySmallID) {
                continue;
            }
            if (this.hasEmbargo(otherOwner)) {
                hasEmbargo = true;
                break;
            }
            if (this.isFriendly(otherOwner) || otherOwner.isFriendly(this)) {
                hasFriendly = true;
            }
        }
        return { hasEmbargo, hasFriendly };
    }
    async actions(tile, units) {
        return this.game.worker.playerInteraction(this.id(), tile && this.game.x(tile), tile && this.game.y(tile), units);
    }
    async buildables(tile, units) {
        return this.game.worker.playerBuildables(this.id(), tile && this.game.x(tile), tile && this.game.y(tile), units);
    }
    async borderTiles() {
        return this.game.worker.playerBorderTiles(this.id());
    }
    outgoingAttacks() {
        return this.data.outgoingAttacks;
    }
    incomingAttacks() {
        return this.data.incomingAttacks;
    }
    async attackAveragePosition(playerID, attackID) {
        return this.game.worker.attackAveragePosition(playerID, attackID);
    }
    units(...types) {
        return this.game
            .units(...types)
            .filter((u) => u.owner().smallID() === this.smallID());
    }
    nameLocation() {
        return this.nameData;
    }
    smallID() {
        return this.data.smallID;
    }
    name() {
        return this.anonymousName !== null && userSettings.anonymousNames()
            ? this.anonymousName
            : this.data.name;
    }
    displayName() {
        return this.anonymousName !== null && userSettings.anonymousNames()
            ? this.anonymousName
            : this.data.name;
    }
    clientID() {
        return this.data.clientID;
    }
    id() {
        return this.data.id;
    }
    team() {
        return this.data.team ?? null;
    }
    type() {
        return this.data.playerType;
    }
    isAlive() {
        return this.data.isAlive;
    }
    isPlayer() {
        return true;
    }
    numTilesOwned() {
        return this.data.tilesOwned;
    }
    allies() {
        return this.data.allies.map((a) => this.game.playerBySmallID(a));
    }
    targets() {
        return this.data.targets.map((id) => this.game.playerBySmallID(id));
    }
    gold() {
        return this.data.gold;
    }
    troops() {
        return this.data.troops;
    }
    totalUnitLevels(type) {
        return this.units(type)
            .filter((unit) => !unit.isUnderConstruction())
            .map((unit) => unit.level())
            .reduce((a, b) => a + b, 0);
    }
    isMe() {
        return this.smallID() === this.game.myPlayer()?.smallID();
    }
    isLobbyCreator() {
        return this.data.isLobbyCreator;
    }
    isAlliedWith(other) {
        return this.data.allies.some((n) => other.smallID() === n);
    }
    isOnSameTeam(other) {
        return this.data.team !== undefined && this.data.team === other.data.team;
    }
    isFriendly(other) {
        return this.isAlliedWith(other) || this.isOnSameTeam(other);
    }
    isRequestingAllianceWith(other) {
        return this.data.outgoingAllianceRequests.some((id) => other.id() === id);
    }
    alliances() {
        return this.data.alliances;
    }
    hasEmbargoAgainst(other) {
        return this.data.embargoes.has(other.id());
    }
    hasEmbargo(other) {
        return this.hasEmbargoAgainst(other) || other.hasEmbargoAgainst(this);
    }
    profile() {
        return this.game.worker.playerProfile(this.smallID());
    }
    bestTransportShipSpawn(targetTile) {
        return this.game.worker.transportShipSpawn(this.id(), targetTile);
    }
    transitiveTargets() {
        return [...this.targets(), ...this.allies().flatMap((p) => p.targets())];
    }
    isTraitor() {
        return this.data.isTraitor;
    }
    getTraitorRemainingTicks() {
        return Math.max(0, this.data.traitorRemainingTicks ?? 0);
    }
    outgoingEmojis() {
        return this.data.outgoingEmojis;
    }
    hasSpawned() {
        return this.data.hasSpawned;
    }
    isDisconnected() {
        return this.data.isDisconnected;
    }
    lastDeleteUnitTick() {
        return this.data.lastDeleteUnitTick;
    }
    deleteUnitCooldown() {
        return (Math.max(0, this.game.config().deleteUnitCooldown() -
            (this.game.ticks() + 1 - this.lastDeleteUnitTick())) / 10);
    }
    supplySummary() {
        return this.data.supplySummary;
    }
}
export class GameView {
    constructor(worker, _config, _mapData, _myClientID, _myUsername, _gameID, humans) {
        this.worker = worker;
        this._config = _config;
        this._mapData = _mapData;
        this._myClientID = _myClientID;
        this._myUsername = _myUsername;
        this._gameID = _gameID;
        this.humans = humans;
        this.smallIDToID = new Map();
        this._players = new Map();
        this._units = new Map();
        this.updatedTiles = [];
        this._myPlayer = null;
        this.updatedSupplyTiles = [];
        this.unitMotionPlans = new Map();
        this.trainMotionPlans = new Map();
        this.trainUnitToEngine = new Map();
        this.toDelete = new Set();
        this._cosmetics = new Map();
        this.motionPlannedUnitIdsCache = [];
        this.motionPlannedUnitIdsDirty = true;
        this._map = this._mapData.gameMap;
        this.lastUpdate = null;
        this.unitGrid = new UnitGrid(this._map);
        this.supplyStates = new Uint8Array(this._map.width() * this._map.height());
        this.supplyReserveDepleted = new Uint8Array(this._map.width() * this._map.height());
        // Replace the local player's username with their own stored username.
        // This way the user does not know they are being censored.
        for (const h of this.humans) {
            if (h.clientID === this._myClientID) {
                h.username = this._myUsername;
            }
        }
        this._cosmetics = new Map(this.humans.map((h) => [h.clientID, h.cosmetics ?? {}]));
        for (const nation of this._mapData.nations) {
            // Nations don't have client ids, so we use their name as the key instead.
            this._cosmetics.set(nation.name, {
                flag: nation.flag,
            });
        }
    }
    isOnEdgeOfMap(ref) {
        return this._map.isOnEdgeOfMap(ref);
    }
    updatesSinceLastTick() {
        return this.lastUpdate?.updates ?? null;
    }
    motionPlans() {
        return this.unitMotionPlans;
    }
    markMotionPlannedUnitIdsDirty() {
        this.motionPlannedUnitIdsDirty = true;
    }
    rebuildMotionPlannedUnitIdsCacheIfDirty() {
        if (!this.motionPlannedUnitIdsDirty) {
            return;
        }
        this.motionPlannedUnitIdsDirty = false;
        const out = this.motionPlannedUnitIdsCache;
        out.length = 0;
        for (const unitId of this.unitMotionPlans.keys()) {
            out.push(unitId);
        }
        for (const [engineId, plan] of this.trainMotionPlans) {
            out.push(engineId);
            for (let i = 0; i < plan.carUnitIds.length; i++) {
                const id = plan.carUnitIds[i] >>> 0;
                if (id !== 0)
                    out.push(id);
            }
        }
    }
    motionPlannedUnitIds() {
        this.rebuildMotionPlannedUnitIdsCacheIfDirty();
        return this.motionPlannedUnitIdsCache;
    }
    isCatchingUp() {
        return (this.lastUpdate?.pendingTurns ?? 0) > 1;
    }
    update(gu) {
        this.toDelete.forEach((id) => this._units.delete(id));
        this.toDelete.clear();
        this.lastUpdate = gu;
        this.updatedTiles = [];
        this.updatedSupplyTiles = [];
        const packed = this.lastUpdate.packedTileUpdates;
        for (let i = 0; i + 1 < packed.length; i += 2) {
            const tile = packed[i];
            const state = packed[i + 1];
            this.updateTile(tile, state);
            this.updatedTiles.push(tile);
        }
        const packedSupply = this.lastUpdate.packedSupplyUpdates;
        if (packedSupply) {
            for (let i = 0; i + 1 < packedSupply.length; i += 2) {
                const tile = packedSupply[i];
                const decoded = unpackSupplyTileState(packedSupply[i + 1]);
                this.supplyStates[tile] = decoded.state;
                this.supplyReserveDepleted[tile] = decoded.reserveDepleted ? 1 : 0;
                this.updatedSupplyTiles.push(tile);
            }
        }
        if (gu.packedMotionPlans) {
            const records = unpackMotionPlans(gu.packedMotionPlans);
            this.applyMotionPlanRecords(records);
        }
        if (gu.updates === null) {
            throw new Error("lastUpdate.updates not initialized");
        }
        gu.updates[GameUpdateType.Player].forEach((pu) => {
            this.smallIDToID.set(pu.smallID, pu.id);
            const player = this._players.get(pu.id);
            if (player !== undefined) {
                player.data = pu;
                player.nameData = gu.playerNameViewData[pu.id];
            }
            else {
                this._players.set(pu.id, new PlayerView(this, pu, gu.playerNameViewData[pu.id], 
                // First check human by clientID, then check nation by name.
                this._cosmetics.get(pu.clientID ?? "") ??
                    this._cosmetics.get(pu.name) ??
                    {}));
            }
        });
        if (this._myClientID) {
            this._myPlayer ?? (this._myPlayer = this.playerByClientID(this._myClientID));
        }
        for (const unit of this._units.values()) {
            unit._wasUpdated = false;
            unit.lastPos = unit.lastPos.slice(-1);
        }
        gu.updates[GameUpdateType.Unit].forEach((update) => {
            let unit = this._units.get(update.id);
            if (unit !== undefined) {
                unit.update(update);
            }
            else {
                unit = new UnitView(this, update);
                this._units.set(update.id, unit);
                this.unitGrid.addUnit(unit);
            }
            if (!update.isActive) {
                this.unitGrid.removeUnit(unit);
            }
            else if (unit.tile() !== unit.lastTile()) {
                this.unitGrid.updateUnitCell(unit);
            }
            if (!unit.isActive()) {
                // Wait until next tick to delete the unit.
                this.toDelete.add(unit.id());
                if (this.unitMotionPlans.delete(unit.id())) {
                    this.markMotionPlannedUnitIdsDirty();
                }
                this.clearTrainPlanForUnit(unit.id());
            }
        });
        this.advanceMotionPlannedUnits(gu.tick);
        this.rebuildMotionPlannedUnitIdsCacheIfDirty();
    }
    advanceMotionPlannedUnits(currentTick) {
        for (const [unitId, plan] of this.unitMotionPlans) {
            const unit = this._units.get(unitId);
            if (!unit || !unit.isActive()) {
                if (this.unitMotionPlans.delete(unitId)) {
                    this.markMotionPlannedUnitIdsDirty();
                }
                continue;
            }
            const oldTile = unit.tile();
            const dt = currentTick - plan.startTick;
            const stepIndex = dt <= 0 ? 0 : Math.floor(dt / Math.max(1, plan.ticksPerStep));
            const lastIndex = plan.path.length - 1;
            const idx = Math.max(0, Math.min(lastIndex, stepIndex));
            const newTile = plan.path[idx];
            if (newTile !== oldTile) {
                unit.applyDerivedPosition(newTile);
                this.unitGrid.updateUnitCell(unit);
                continue;
            }
            // Once a plan is past its final step, `newTile` remains clamped to the last path tile.
            // Drop finished plans to avoid repeatedly marking static units as updated each tick.
            if (dt > 0 && stepIndex >= lastIndex) {
                if (this.unitMotionPlans.delete(unitId)) {
                    this.markMotionPlannedUnitIdsDirty();
                }
            }
        }
        this.advanceTrainMotionPlannedUnits(currentTick);
    }
    clearTrainPlanForUnit(unitId) {
        const engineId = this.trainUnitToEngine.get(unitId) ??
            (this.trainMotionPlans.has(unitId) ? unitId : null);
        if (engineId === null) {
            return;
        }
        const plan = this.trainMotionPlans.get(engineId);
        if (!plan) {
            this.trainUnitToEngine.delete(unitId);
            return;
        }
        if (this.trainMotionPlans.delete(engineId)) {
            this.markMotionPlannedUnitIdsDirty();
        }
        this.trainUnitToEngine.delete(engineId);
        for (let i = 0; i < plan.carUnitIds.length; i++) {
            const id = plan.carUnitIds[i] >>> 0;
            if (id !== 0)
                this.trainUnitToEngine.delete(id);
        }
    }
    advanceTrainMotionPlannedUnits(currentTick) {
        const staleEngineIds = [];
        for (const [engineId, plan] of this.trainMotionPlans) {
            const engine = this._units.get(engineId);
            if (!engine || !engine.isActive()) {
                staleEngineIds.push(engineId);
                continue;
            }
            const steps = currentTick - plan.lastAdvancedTick;
            if (steps <= 0) {
                continue;
            }
            const path = plan.path;
            const lastIndex = path.length - 1;
            const cap = plan.usedTilesBuf.length;
            const pushUsed = (tile) => {
                if (cap === 0)
                    return;
                if (plan.usedLen < cap) {
                    const idx = (plan.usedHead + plan.usedLen) % cap;
                    plan.usedTilesBuf[idx] = tile >>> 0;
                    plan.usedLen++;
                }
                else {
                    plan.usedTilesBuf[plan.usedHead] = tile >>> 0;
                    plan.usedHead = (plan.usedHead + 1) % cap;
                    plan.usedLen = cap;
                }
            };
            const usedGet = (index) => {
                if (index < 0 || index >= plan.usedLen || cap === 0)
                    return null;
                const idx = (plan.usedHead + index) % cap;
                return plan.usedTilesBuf[idx];
            };
            let didMove = false;
            for (let step = 0; step < steps; step++) {
                const cursor = plan.cursor;
                if (cursor >= lastIndex) {
                    break;
                }
                for (let i = 0; i < plan.speed && cursor + i < path.length; i++) {
                    pushUsed(path[cursor + i]);
                }
                plan.cursor = Math.min(lastIndex, cursor + plan.speed);
                for (let i = plan.carUnitIds.length - 1; i >= 0; --i) {
                    const carId = plan.carUnitIds[i] >>> 0;
                    if (carId === 0)
                        continue;
                    const car = this._units.get(carId);
                    if (!car || !car.isActive()) {
                        continue;
                    }
                    const carTileIndex = (i + 1) * plan.spacing + 2;
                    const tile = usedGet(carTileIndex);
                    if (tile !== null) {
                        const oldTile = car.tile();
                        if (tile !== oldTile) {
                            car.applyDerivedPosition(tile);
                            this.unitGrid.updateUnitCell(car);
                            didMove = true;
                        }
                    }
                }
                const newEngineTile = path[plan.cursor];
                const oldEngineTile = engine.tile();
                if (newEngineTile !== oldEngineTile) {
                    engine.applyDerivedPosition(newEngineTile);
                    this.unitGrid.updateUnitCell(engine);
                    didMove = true;
                }
            }
            plan.lastAdvancedTick = currentTick;
            // Preserve the final-step redraw (plan remains for the tick where motion ends),
            // then clear once the train has settled and no longer moves.
            // Note: trains are currently deleted at the end of TrainExecution, and the ensuing
            // `Unit` update (isActive=false) also clears any associated motion plan records.
            // This expiry is defensive to avoid keeping stale plans around if that behavior changes.
            if (!didMove && plan.cursor >= lastIndex) {
                staleEngineIds.push(engineId);
            }
        }
        for (const engineId of staleEngineIds) {
            this.clearTrainPlanForUnit(engineId);
        }
    }
    applyMotionPlanRecords(records) {
        for (const record of records) {
            switch (record.kind) {
                case "grid": {
                    if (record.ticksPerStep < 1 || record.path.length < 1) {
                        break;
                    }
                    const existing = this.unitMotionPlans.get(record.unitId);
                    if (existing && record.planId <= existing.planId) {
                        break;
                    }
                    const path = record.path instanceof Uint32Array
                        ? record.path
                        : Uint32Array.from(record.path);
                    this.unitMotionPlans.set(record.unitId, {
                        planId: record.planId,
                        startTick: record.startTick,
                        ticksPerStep: record.ticksPerStep,
                        path,
                    });
                    this.markMotionPlannedUnitIdsDirty();
                    break;
                }
                case "train": {
                    if (record.speed < 1 || record.path.length < 1) {
                        break;
                    }
                    const existing = this.trainMotionPlans.get(record.engineUnitId);
                    if (existing && record.planId <= existing.planId) {
                        break;
                    }
                    if (existing) {
                        this.clearTrainPlanForUnit(record.engineUnitId);
                    }
                    const carUnitIds = record.carUnitIds instanceof Uint32Array
                        ? record.carUnitIds
                        : Uint32Array.from(record.carUnitIds);
                    const path = record.path instanceof Uint32Array
                        ? record.path
                        : Uint32Array.from(record.path);
                    const usedCap = carUnitIds.length * record.spacing + 3;
                    const usedTilesBuf = new Uint32Array(Math.max(0, usedCap));
                    this.trainMotionPlans.set(record.engineUnitId, {
                        planId: record.planId,
                        startTick: record.startTick,
                        speed: record.speed,
                        spacing: record.spacing,
                        carUnitIds,
                        path,
                        cursor: 0,
                        usedTilesBuf,
                        usedHead: 0,
                        usedLen: 0,
                        lastAdvancedTick: record.startTick,
                    });
                    this.markMotionPlannedUnitIdsDirty();
                    this.trainUnitToEngine.set(record.engineUnitId, record.engineUnitId);
                    for (let i = 0; i < carUnitIds.length; i++) {
                        const carId = carUnitIds[i] >>> 0;
                        if (carId !== 0)
                            this.trainUnitToEngine.set(carId, record.engineUnitId);
                    }
                    break;
                }
            }
        }
    }
    recentlyUpdatedTiles() {
        return this.updatedTiles;
    }
    recentlyUpdatedSupplyTiles() {
        return this.updatedSupplyTiles;
    }
    nearbyUnits(tile, searchRange, types, predicate) {
        const viewer = this.myPlayer();
        return this.unitGrid
            .nearbyUnits(tile, searchRange, types, predicate)
            .filter(({ unit }) => this.canPlayerSeeUnit(viewer, unit));
    }
    hasUnitNearby(tile, searchRange, type, playerId, includeUnderConstruction) {
        return this.unitGrid.hasUnitNearby(tile, searchRange, type, playerId, includeUnderConstruction);
    }
    anyUnitNearby(tile, searchRange, types, predicate, playerId, includeUnderConstruction) {
        return this.unitGrid.anyUnitNearby(tile, searchRange, types, predicate, playerId, includeUnderConstruction);
    }
    myClientID() {
        return this._myClientID;
    }
    myPlayer() {
        return this._myPlayer;
    }
    player(id) {
        const player = this._players.get(id);
        if (player === undefined) {
            throw Error(`player id ${id} not found`);
        }
        return player;
    }
    players() {
        return Array.from(this._players.values());
    }
    playerBySmallID(id) {
        if (id === 0) {
            return new TerraNulliusImpl();
        }
        const playerId = this.smallIDToID.get(id);
        if (playerId === undefined) {
            throw new Error(`small id ${id} not found`);
        }
        return this.player(playerId);
    }
    playerByClientID(id) {
        const player = Array.from(this._players.values()).filter((p) => p.clientID() === id)[0] ?? null;
        if (player === null) {
            return null;
        }
        return player;
    }
    hasPlayer(id) {
        return false;
    }
    playerViews() {
        return Array.from(this._players.values());
    }
    owner(tile) {
        return this.playerBySmallID(this.ownerID(tile));
    }
    supplyState(tile) {
        return (this.supplyStates[tile] ?? 0);
    }
    isSupplyReserveDepleted(tile) {
        return this.supplyReserveDepleted[tile] === 1;
    }
    ticks() {
        if (this.lastUpdate === null)
            return 0;
        return this.lastUpdate.tick;
    }
    inSpawnPhase() {
        return this.ticks() <= this._config.numSpawnPhaseTurns();
    }
    isSpawnImmunityActive() {
        return (this._config.numSpawnPhaseTurns() + this._config.spawnImmunityDuration() >
            this.ticks());
    }
    isNationSpawnImmunityActive() {
        return (this._config.numSpawnPhaseTurns() +
            this._config.nationSpawnImmunityDuration() >
            this.ticks());
    }
    config() {
        return this._config;
    }
    canPlayerSeeUnit(player, unit) {
        if (unit.type() !== UnitType.Submarine) {
            return true;
        }
        if (player === null) {
            return true;
        }
        return player === unit.owner() || player.isFriendly(unit.owner()) || unit.targetable();
    }
    units(...types) {
        const viewer = this.myPlayer();
        if (types.length === 0) {
            return Array.from(this._units.values()).filter((u) => u.isActive() && this.canPlayerSeeUnit(viewer, u));
        }
        return Array.from(this._units.values()).filter((u) => u.isActive() &&
            types.includes(u.type()) &&
            this.canPlayerSeeUnit(viewer, u));
    }
    unit(id) {
        return this._units.get(id);
    }
    unitInfo(type) {
        return this._config.unitInfo(type);
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
    setFallout(ref, value) {
        return this._map.setFallout(ref, value);
    }
    hasSuppression(ref) {
        return this._map.hasSuppression(ref);
    }
    setSuppression(ref, value) {
        return this._map.setSuppression(ref, value);
    }
    isBorder(ref) {
        return this._map.isBorder(ref);
    }
    neighbors(ref) {
        return this._map.neighbors(ref);
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
    gameID() {
        return this._gameID;
    }
    focusedPlayer() {
        return this.myPlayer();
    }
}
//# sourceMappingURL=GameView.js.map