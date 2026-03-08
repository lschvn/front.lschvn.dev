import { BOMBER_MISSION_DURATION, BOMBER_REARM_TICKS, BOMBER_TICKS_PER_MOVE, CLOSE_AIR_SUPPORT_RADIUS, FIGHTER_ESCORT_DAMAGE_REDUCTION, FIGHTER_INTERCEPTION_DAMAGE, FIGHTER_INTERCEPTION_RANGE, FIGHTER_MISSION_DURATION, FIGHTER_REARM_TICKS, FIGHTER_TICKS_PER_MOVE, PORT_STRIKE_RADIUS, PORT_STRIKE_SHIP_DAMAGE, PORT_STRIKE_STRUCTURE_DAMAGE, PORT_STRIKE_TARGETS, STRATEGIC_BOMBING_STRUCTURE_DAMAGE, STRATEGIC_BOMBING_TARGET_RADIUS, STRATEGIC_BOMBING_TARGETS, } from "../configuration/AirBalance";
import { RADAR_STATION_FIGHTER_DAMAGE_BONUS, RADAR_STATION_FIGHTER_RANGE_BONUS, } from "../configuration/AntiAirBalance";
import { AirMissionPhase, AirMissionType, AirUnits, UnitType, } from "../game/Game";
import { AirPathFinder } from "../pathfinding/PathFinder.Air";
export class AirMissionExecution {
    constructor(squadron) {
        this.squadron = squadron;
        this.active = true;
    }
    init(mg) {
        this.mg = mg;
    }
    tick(ticks) {
        if (!this.squadron.isActive()) {
            this.active = false;
            return;
        }
        const airbase = this.findAirbase();
        if (!airbase) {
            this.squadron.delete(true);
            this.active = false;
            return;
        }
        const phase = this.squadron.airMissionPhase() ?? AirMissionPhase.Ready;
        if (phase === AirMissionPhase.Ready) {
            if (this.squadron.tile() !== airbase.tile()) {
                this.squadron.move(airbase.tile());
            }
            return;
        }
        if (phase === AirMissionPhase.Rearming) {
            if (this.squadron.tile() !== airbase.tile()) {
                this.squadron.move(airbase.tile());
            }
            if ((this.squadron.rearmCompleteTick() ?? Number.MAX_SAFE_INTEGER) <= ticks) {
                this.squadron.setAirMissionPhase(AirMissionPhase.Ready);
                this.squadron.setAirMissionType(undefined);
                this.squadron.setAirMissionTicksRemaining(undefined);
                this.squadron.setRearmCompleteTick(undefined);
                this.squadron.setTargetTile(undefined);
            }
            return;
        }
        const targetTile = this.squadron.targetTile();
        if (targetTile === undefined) {
            this.beginReturn(airbase, ticks);
            return;
        }
        if (this.mg.euclideanDistSquared(airbase.tile(), targetTile) >
            this.mg.config().airbaseOperationalRange() *
                this.mg.config().airbaseOperationalRange()) {
            this.beginReturn(airbase, ticks);
            return;
        }
        switch (phase) {
            case AirMissionPhase.Outbound:
                if (this.moveTowards(targetTile)) {
                    this.squadron.setAirMissionPhase(AirMissionPhase.OnStation);
                }
                if (this.squadron.type() === UnitType.BomberSquadron) {
                    this.maybeInterceptBomber();
                }
                return;
            case AirMissionPhase.OnStation:
                this.handleOnStation(ticks);
                return;
            case AirMissionPhase.Returning:
                if (this.moveTowards(airbase.tile())) {
                    this.squadron.move(airbase.tile());
                    this.squadron.setAirMissionPhase(AirMissionPhase.Rearming);
                    this.squadron.setRearmCompleteTick(ticks + this.rearmTicks());
                }
                if (this.squadron.type() === UnitType.BomberSquadron) {
                    this.maybeInterceptBomber();
                }
                return;
            case AirMissionPhase.Ready:
            case AirMissionPhase.Rearming:
                return;
        }
    }
    isActive() {
        return this.active;
    }
    activeDuringSpawnPhase() {
        return false;
    }
    handleOnStation(ticks) {
        const missionType = this.squadron.airMissionType();
        if (missionType === undefined) {
            this.beginReturn(this.findAirbase(), ticks);
            return;
        }
        const duration = this.missionDuration();
        const remaining = this.squadron.airMissionTicksRemaining() ?? duration;
        if (remaining === duration) {
            this.resolveMissionArrival();
        }
        if (this.squadron.type() === UnitType.BomberSquadron) {
            this.maybeInterceptBomber();
            if (!this.squadron.isActive()) {
                this.active = false;
                return;
            }
        }
        const nextRemaining = remaining - 1;
        this.squadron.setAirMissionTicksRemaining(nextRemaining);
        if (nextRemaining <= 0) {
            this.beginReturn(this.findAirbase(), ticks);
        }
    }
    resolveMissionArrival() {
        const missionType = this.squadron.airMissionType();
        const targetTile = this.squadron.targetTile();
        if (missionType === undefined || targetTile === undefined) {
            return;
        }
        switch (missionType) {
            case AirMissionType.PatrolArea:
            case AirMissionType.EscortBombers:
            case AirMissionType.InterceptEnemyAircraft:
                return;
            case AirMissionType.StrategicBombing:
                this.resolveStrategicBombing(targetTile);
                return;
            case AirMissionType.CloseAirSupport:
                this.mg.addAirSupportZone(this.squadron.owner(), targetTile, CLOSE_AIR_SUPPORT_RADIUS, BOMBER_MISSION_DURATION[AirMissionType.CloseAirSupport]);
                return;
            case AirMissionType.PortStrike:
                this.resolvePortStrike(targetTile);
                return;
        }
    }
    resolveStrategicBombing(targetTile) {
        const targets = this.mg.nearbyUnits(targetTile, STRATEGIC_BOMBING_TARGET_RADIUS, STRATEGIC_BOMBING_TARGETS, ({ unit }) => unit.owner() !== this.squadron.owner() &&
            this.squadron.owner().canAttackPlayer(unit.owner(), true), true);
        if (targets.length === 0) {
            return;
        }
        const targetPriority = new Map(STRATEGIC_BOMBING_TARGETS.map((type, index) => [type, index]));
        targets.sort((a, b) => {
            const priorityA = targetPriority.get(a.unit.type()) ?? 99;
            const priorityB = targetPriority.get(b.unit.type()) ?? 99;
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            if (a.distSquared !== b.distSquared) {
                return a.distSquared - b.distSquared;
            }
            return a.unit.id() - b.unit.id();
        });
        this.damageStructureTarget(targets[0].unit, STRATEGIC_BOMBING_STRUCTURE_DAMAGE);
    }
    resolvePortStrike(targetTile) {
        const targets = this.mg.nearbyUnits(targetTile, PORT_STRIKE_RADIUS, PORT_STRIKE_TARGETS, ({ unit }) => unit.owner() !== this.squadron.owner() &&
            this.squadron.owner().canAttackPlayer(unit.owner(), true), true);
        if (targets.length === 0) {
            return;
        }
        targets.sort((a, b) => {
            const priorityA = a.unit.type() === UnitType.Port
                ? 0
                : a.unit.type() === UnitType.Warship
                    ? 1
                    : a.unit.type() === UnitType.TransportShip
                        ? 2
                        : 3;
            const priorityB = b.unit.type() === UnitType.Port
                ? 0
                : b.unit.type() === UnitType.Warship
                    ? 1
                    : b.unit.type() === UnitType.TransportShip
                        ? 2
                        : 3;
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            if (a.distSquared !== b.distSquared) {
                return a.distSquared - b.distSquared;
            }
            return a.unit.id() - b.unit.id();
        });
        for (const { unit } of targets.slice(0, 3)) {
            switch (unit.type()) {
                case UnitType.Port:
                    this.damageStructureTarget(unit, PORT_STRIKE_STRUCTURE_DAMAGE);
                    break;
                case UnitType.Warship:
                    unit.modifyHealth(-PORT_STRIKE_SHIP_DAMAGE, this.squadron.owner());
                    break;
                case UnitType.TransportShip: {
                    const troops = Math.max(0, unit.troops() - PORT_STRIKE_SHIP_DAMAGE);
                    unit.setTroops(troops);
                    if (troops === 0) {
                        unit.delete(true, this.squadron.owner());
                    }
                    else {
                        unit.touch();
                    }
                    break;
                }
                case UnitType.TradeShip:
                    unit.delete(true, this.squadron.owner());
                    break;
            }
        }
    }
    damageStructureTarget(target, damage) {
        for (let i = 0; i < damage; i++) {
            if (!target.isActive()) {
                return;
            }
            if (target.level() > 1) {
                target.decreaseLevel(this.squadron.owner());
            }
            else {
                target.delete(true, this.squadron.owner());
            }
        }
    }
    maybeInterceptBomber() {
        if (this.squadron.type() !== UnitType.BomberSquadron || !this.squadron.isActive()) {
            return;
        }
        const interceptors = this.mg.nearbyUnits(this.squadron.tile(), FIGHTER_INTERCEPTION_RANGE + RADAR_STATION_FIGHTER_RANGE_BONUS, UnitType.FighterSquadron, ({ unit }) => unit.owner() !== this.squadron.owner() &&
            !unit.isUnderConstruction() &&
            !unit.isMarkedForDeletion() &&
            this.isAirborne(unit) &&
            (unit.airMissionType() === AirMissionType.PatrolArea ||
                unit.airMissionType() === AirMissionType.InterceptEnemyAircraft ||
                unit.airMissionType() === AirMissionType.EscortBombers));
        if (interceptors.length === 0) {
            return;
        }
        const escortingFriendlyFighters = this.mg.nearbyUnits(this.squadron.tile(), FIGHTER_INTERCEPTION_RANGE, UnitType.FighterSquadron, ({ unit }) => unit.owner() === this.squadron.owner() &&
            !unit.isUnderConstruction() &&
            !unit.isMarkedForDeletion() &&
            this.isAirborne(unit) &&
            unit.airMissionType() === AirMissionType.EscortBombers);
        let damage = FIGHTER_INTERCEPTION_DAMAGE * Math.min(2, interceptors.length);
        if (this.mg.hasRadarCoverage(this.squadron.tile(), interceptors[0].unit.owner())) {
            damage += RADAR_STATION_FIGHTER_DAMAGE_BONUS;
        }
        if (escortingFriendlyFighters.length > 0) {
            damage = Math.max(1, Math.ceil(damage * FIGHTER_ESCORT_DAMAGE_REDUCTION));
        }
        this.squadron.modifyHealth(-damage, interceptors[0].unit.owner());
    }
    isAirborne(unit) {
        const phase = unit.airMissionPhase();
        return (AirUnits.has(unit.type()) &&
            phase !== undefined &&
            phase !== AirMissionPhase.Ready &&
            phase !== AirMissionPhase.Rearming);
    }
    beginReturn(airbase, ticks) {
        this.squadron.setAirMissionPhase(AirMissionPhase.Returning);
        if (this.squadron.tile() === airbase.tile()) {
            this.squadron.setAirMissionPhase(AirMissionPhase.Rearming);
            this.squadron.setRearmCompleteTick(ticks + this.rearmTicks());
        }
    }
    missionDuration() {
        const missionType = this.squadron.airMissionType();
        if (missionType === undefined) {
            return 0;
        }
        if (this.squadron.type() === UnitType.FighterSquadron) {
            return FIGHTER_MISSION_DURATION[missionType];
        }
        return BOMBER_MISSION_DURATION[missionType];
    }
    rearmTicks() {
        const missionType = this.squadron.airMissionType();
        if (this.squadron.type() === UnitType.FighterSquadron) {
            return FIGHTER_REARM_TICKS;
        }
        if (missionType === AirMissionType.StrategicBombing ||
            missionType === AirMissionType.CloseAirSupport ||
            missionType === AirMissionType.PortStrike) {
            return BOMBER_REARM_TICKS[missionType];
        }
        return FIGHTER_REARM_TICKS;
    }
    moveTowards(target) {
        if (this.squadron.tile() === target) {
            return true;
        }
        const path = new AirPathFinder(this.mg).findPath(this.squadron.tile(), target);
        if (path === null || path.length <= 1) {
            return this.squadron.tile() === target;
        }
        const speed = this.squadron.type() === UnitType.FighterSquadron
            ? FIGHTER_TICKS_PER_MOVE
            : BOMBER_TICKS_PER_MOVE;
        if (speed > 1) {
            return false;
        }
        this.squadron.move(path[1]);
        return this.squadron.tile() === target;
    }
    findAirbase() {
        const airbaseId = this.squadron.airbaseId();
        if (airbaseId === undefined) {
            return undefined;
        }
        return this.squadron
            .owner()
            .units(UnitType.Airbase)
            .find((unit) => unit.id() === airbaseId &&
            unit.isActive() &&
            !unit.isUnderConstruction() &&
            !unit.isMarkedForDeletion());
    }
}
//# sourceMappingURL=AirMissionExecution.js.map