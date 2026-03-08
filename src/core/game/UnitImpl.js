import { simpleHash, toInt, withinInt } from "../Util";
import { MessageType, TrainType, UnitType, } from "./Game";
import { GameUpdateType } from "./GameUpdates";
export class UnitImpl {
    constructor(_type, mg, _tile, _id, _owner, params = {}) {
        this._type = _type;
        this.mg = mg;
        this._tile = _tile;
        this._id = _id;
        this._owner = _owner;
        this._active = true;
        this._retreating = false;
        this._targetedBySAM = false;
        this._reachedTarget = false;
        this._wasDestroyedByEnemy = false;
        this._destroyer = undefined;
        this._underConstruction = false;
        this._lastOwner = null;
        // Number of missiles in cooldown, if empty all missiles are ready.
        this._missileTimerQueue = [];
        this._hasTrainStation = false;
        this._level = 1;
        this._targetable = true;
        // Nuke only
        this._trajectoryIndex = 0;
        this._deletionAt = null;
        this._lastTile = _tile;
        this._health = toInt(this.mg.unitInfo(_type).maxHealth ?? 1);
        this._targetTile =
            "targetTile" in params ? (params.targetTile ?? undefined) : undefined;
        this._trajectory = "trajectory" in params ? (params.trajectory ?? []) : [];
        this._troops = "troops" in params ? (params.troops ?? 0) : 0;
        this._lastSetSafeFromPirates =
            "lastSetSafeFromPirates" in params
                ? (params.lastSetSafeFromPirates ?? 0)
                : 0;
        this._patrolTile =
            "patrolTile" in params ? (params.patrolTile ?? undefined) : undefined;
        this._targetUnit =
            "targetUnit" in params ? (params.targetUnit ?? undefined) : undefined;
        this._loaded =
            "loaded" in params ? (params.loaded ?? undefined) : undefined;
        this._trainType = "trainType" in params ? params.trainType : undefined;
        this._airbaseId =
            "airbaseId" in params ? (params.airbaseId ?? undefined) : undefined;
        this._airMissionType =
            "missionType" in params ? (params.missionType ?? undefined) : undefined;
        this._airMissionPhase =
            "missionPhase" in params ? (params.missionPhase ?? undefined) : undefined;
        this._airMissionTicksRemaining =
            "missionTicksRemaining" in params
                ? (params.missionTicksRemaining ?? undefined)
                : undefined;
        this._rearmCompleteTick =
            "rearmCompleteTick" in params
                ? (params.rearmCompleteTick ?? undefined)
                : undefined;
        if (this._type === UnitType.Submarine) {
            this._targetable = false;
        }
        switch (this._type) {
            case UnitType.Warship:
            case UnitType.Submarine:
            case UnitType.Port:
            case UnitType.MissileSilo:
            case UnitType.DefensePost:
            case UnitType.SAMLauncher:
            case UnitType.SonarStation:
            case UnitType.AABattery:
            case UnitType.RadarStation:
            case UnitType.Airbase:
            case UnitType.City:
            case UnitType.Factory:
                this.mg.stats().unitBuild(_owner, this._type);
        }
    }
    setTargetable(targetable) {
        if (this._targetable !== targetable) {
            this._targetable = targetable;
            this.mg.addUpdate(this.toUpdate());
        }
    }
    isTargetable() {
        return this._targetable;
    }
    setPatrolTile(tile) {
        this._patrolTile = tile;
    }
    patrolTile() {
        return this._patrolTile;
    }
    isUnit() {
        return true;
    }
    touch() {
        this.mg.addUpdate(this.toUpdate());
    }
    setTileTarget(tile) {
        this._targetTile = tile;
    }
    tileTarget() {
        return this._targetTile;
    }
    id() {
        return this._id;
    }
    toUpdate() {
        return {
            type: GameUpdateType.Unit,
            unitType: this._type,
            id: this._id,
            troops: this._troops,
            ownerID: this._owner.smallID(),
            lastOwnerID: this._lastOwner?.smallID(),
            isActive: this._active,
            reachedTarget: this._reachedTarget,
            retreating: this._retreating,
            pos: this._tile,
            markedForDeletion: this._deletionAt ?? false,
            targetable: this._targetable,
            lastPos: this._lastTile,
            health: this.hasHealth() ? Number(this._health) : undefined,
            underConstruction: this._underConstruction,
            targetUnitId: this._targetUnit?.id() ?? undefined,
            targetTile: this.targetTile() ?? undefined,
            missileTimerQueue: this._missileTimerQueue,
            level: this.level(),
            hasTrainStation: this._hasTrainStation,
            suppressed: this.mg.hasSuppression(this.tile()),
            trainType: this._trainType,
            loaded: this._loaded,
            airbaseId: this._airbaseId,
            airMissionType: this._airMissionType,
            airMissionPhase: this._airMissionPhase,
            airMissionTicksRemaining: this._airMissionTicksRemaining,
            rearmCompleteTick: this._rearmCompleteTick,
        };
    }
    type() {
        return this._type;
    }
    lastTile() {
        return this._lastTile;
    }
    move(tile) {
        if (tile === null) {
            throw new Error("tile cannot be null");
        }
        this._lastTile = this._tile;
        this._tile = tile;
        this.mg.onUnitMoved(this);
    }
    setTroops(troops) {
        this._troops = Math.max(0, troops);
    }
    troops() {
        return this._troops;
    }
    health() {
        return Number(this._health);
    }
    hasHealth() {
        return this.info().maxHealth !== undefined;
    }
    tile() {
        return this._tile;
    }
    owner() {
        return this._owner;
    }
    info() {
        return this.mg.unitInfo(this._type);
    }
    setOwner(newOwner) {
        this.clearPendingDeletion();
        switch (this._type) {
            case UnitType.Warship:
            case UnitType.Submarine:
            case UnitType.Port:
            case UnitType.MissileSilo:
            case UnitType.DefensePost:
            case UnitType.SAMLauncher:
            case UnitType.SonarStation:
            case UnitType.AABattery:
            case UnitType.RadarStation:
            case UnitType.Airbase:
            case UnitType.City:
            case UnitType.Factory:
                this.mg.stats().unitCapture(newOwner, this._type);
                this.mg.stats().unitLose(this._owner, this._type);
                break;
        }
        this._lastOwner = this._owner;
        this._lastOwner._units = this._lastOwner._units.filter((u) => u !== this);
        this._owner = newOwner;
        this._owner._units.push(this);
        this.mg.addUpdate(this.toUpdate());
        this.mg.displayMessage("events_display.unit_captured_by_enemy", MessageType.UNIT_CAPTURED_BY_ENEMY, this._lastOwner.id(), undefined, { unit: this.type(), name: newOwner.displayName() });
        this.mg.displayMessage("events_display.captured_enemy_unit", MessageType.CAPTURED_ENEMY_UNIT, newOwner.id(), undefined, { unit: this.type(), name: this._lastOwner.displayName() });
    }
    modifyHealth(delta, attacker) {
        this._health = withinInt(this._health + toInt(delta), 0n, toInt(this.info().maxHealth ?? 1));
        if (this._health === 0n) {
            this.delete(true, attacker);
        }
    }
    clearPendingDeletion() {
        this._deletionAt = null;
    }
    isMarkedForDeletion() {
        return this._deletionAt !== null;
    }
    markForDeletion() {
        if (!this.isActive()) {
            return;
        }
        this._deletionAt =
            this.mg.ticks() + this.mg.config().deletionMarkDuration();
        this.mg.addUpdate(this.toUpdate());
    }
    isOverdueDeletion() {
        if (!this.isActive()) {
            return false;
        }
        return this._deletionAt !== null && this.mg.ticks() - this._deletionAt > 0;
    }
    delete(displayMessage, destroyer) {
        if (!this.isActive()) {
            throw new Error(`cannot delete ${this} not active`);
        }
        // Record whether this unit was destroyed by an enemy (vs. arrived / retreated)
        this._wasDestroyedByEnemy = destroyer !== undefined;
        this._destroyer = destroyer ?? undefined;
        this._owner._units = this._owner._units.filter((b) => b !== this);
        this._active = false;
        this.mg.addUpdate(this.toUpdate());
        this.mg.removeUnit(this);
        if (displayMessage !== false) {
            this.displayMessageOnDeleted();
        }
        if (destroyer !== undefined) {
            switch (this._type) {
                case UnitType.TransportShip:
                    this.mg
                        .stats()
                        .boatDestroyTroops(destroyer, this._owner, this._troops);
                    break;
                case UnitType.TradeShip:
                    this.mg.stats().boatDestroyTrade(destroyer, this._owner);
                    break;
                case UnitType.City:
                case UnitType.DefensePost:
                case UnitType.MissileSilo:
                case UnitType.Port:
                case UnitType.SAMLauncher:
                case UnitType.SonarStation:
                case UnitType.AABattery:
                case UnitType.RadarStation:
                case UnitType.Airbase:
                case UnitType.Warship:
                case UnitType.Submarine:
                case UnitType.Factory:
                    this.mg.stats().unitDestroy(destroyer, this._type);
                    this.mg.stats().unitLose(this.owner(), this._type);
                    break;
            }
        }
    }
    displayMessageOnDeleted() {
        if (this._type === UnitType.MIRVWarhead) {
            return;
        }
        if (this._type === UnitType.Train && this._trainType !== TrainType.Engine) {
            return;
        }
        this.mg.displayMessage("events_display.unit_destroyed", MessageType.UNIT_DESTROYED, this.owner().id(), undefined, { unit: this._type });
    }
    isActive() {
        return this._active;
    }
    wasDestroyedByEnemy() {
        return this._wasDestroyedByEnemy;
    }
    destroyer() {
        return this._destroyer;
    }
    retreating() {
        return this._retreating;
    }
    orderBoatRetreat() {
        if (this.type() !== UnitType.TransportShip) {
            throw new Error(`Cannot retreat ${this.type()}`);
        }
        if (!this._retreating) {
            this._retreating = true;
            this.mg.addUpdate(this.toUpdate());
        }
    }
    isUnderConstruction() {
        return this._underConstruction;
    }
    setUnderConstruction(underConstruction) {
        if (this._underConstruction !== underConstruction) {
            this._underConstruction = underConstruction;
            this.mg.addUpdate(this.toUpdate());
        }
    }
    hash() {
        return (this.tile() +
            simpleHash(this.type()) * this._id +
            simpleHash(this._airMissionType ?? "none") +
            simpleHash(this._airMissionPhase ?? "none") +
            (this._targetTile ?? 0) +
            (this._airMissionTicksRemaining ?? 0) +
            (this._rearmCompleteTick ?? 0));
    }
    toString() {
        return `Unit:${this._type},owner:${this.owner().name()}`;
    }
    launch() {
        this._missileTimerQueue.push(this.mg.ticks());
        this.mg.addUpdate(this.toUpdate());
    }
    ticksLeftInCooldown() {
        return this._missileTimerQueue[0];
    }
    isInCooldown() {
        return this._missileTimerQueue.length === this._level;
    }
    missileTimerQueue() {
        return this._missileTimerQueue;
    }
    reloadMissile() {
        this._missileTimerQueue.shift();
        this.mg.addUpdate(this.toUpdate());
    }
    setTargetTile(targetTile) {
        this._targetTile = targetTile;
    }
    targetTile() {
        return this._targetTile;
    }
    setTrajectoryIndex(i) {
        const max = this._trajectory.length - 1;
        this._trajectoryIndex = i < 0 ? 0 : i > max ? max : i;
    }
    trajectoryIndex() {
        return this._trajectoryIndex;
    }
    trajectory() {
        return this._trajectory;
    }
    setTargetUnit(target) {
        this._targetUnit = target;
    }
    targetUnit() {
        return this._targetUnit;
    }
    setTargetedBySAM(targeted) {
        this._targetedBySAM = targeted;
    }
    targetedBySAM() {
        return this._targetedBySAM;
    }
    setReachedTarget() {
        this._reachedTarget = true;
    }
    reachedTarget() {
        return this._reachedTarget;
    }
    setSafeFromPirates() {
        this._lastSetSafeFromPirates = this.mg.ticks();
    }
    isSafeFromPirates() {
        return (this.mg.ticks() - this._lastSetSafeFromPirates <
            this.mg.config().safeFromPiratesCooldownMax());
    }
    level() {
        return this._level;
    }
    setTrainStation(trainStation) {
        this._hasTrainStation = trainStation;
        this.mg.addUpdate(this.toUpdate());
    }
    hasTrainStation() {
        return this._hasTrainStation;
    }
    increaseLevel() {
        this._level++;
        if ([UnitType.MissileSilo, UnitType.SAMLauncher, UnitType.AABattery].includes(this.type())) {
            this._missileTimerQueue.push(this.mg.ticks());
        }
        this.mg.addUpdate(this.toUpdate());
    }
    decreaseLevel(destroyer) {
        this._level--;
        if ([UnitType.MissileSilo, UnitType.SAMLauncher, UnitType.AABattery].includes(this.type())) {
            this._missileTimerQueue.pop();
        }
        if (this._level <= 0) {
            this.delete(true, destroyer);
            return;
        }
        this.mg.addUpdate(this.toUpdate());
    }
    trainType() {
        return this._trainType;
    }
    isLoaded() {
        return this._loaded;
    }
    setLoaded(loaded) {
        if (this._loaded !== loaded) {
            this._loaded = loaded;
            this.mg.addUpdate(this.toUpdate());
        }
    }
    airbaseId() {
        return this._airbaseId;
    }
    airMissionType() {
        return this._airMissionType;
    }
    setAirMissionType(missionType) {
        if (this._airMissionType !== missionType) {
            this._airMissionType = missionType;
            this.mg.addUpdate(this.toUpdate());
        }
    }
    airMissionPhase() {
        return this._airMissionPhase;
    }
    setAirMissionPhase(phase) {
        if (this._airMissionPhase !== phase) {
            this._airMissionPhase = phase;
            this.mg.addUpdate(this.toUpdate());
        }
    }
    airMissionTicksRemaining() {
        return this._airMissionTicksRemaining;
    }
    setAirMissionTicksRemaining(ticks) {
        if (this._airMissionTicksRemaining !== ticks) {
            this._airMissionTicksRemaining = ticks;
            this.mg.addUpdate(this.toUpdate());
        }
    }
    rearmCompleteTick() {
        return this._rearmCompleteTick;
    }
    setRearmCompleteTick(tick) {
        if (this._rearmCompleteTick !== tick) {
            this._rearmCompleteTick = tick;
            this.mg.addUpdate(this.toUpdate());
        }
    }
}
//# sourceMappingURL=UnitImpl.js.map