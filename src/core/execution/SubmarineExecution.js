import { isUnit, UnitType, } from "../game/Game";
import { PathFinding } from "../pathfinding/PathFinder";
import { PathStatus } from "../pathfinding/types";
import { PseudoRandom } from "../PseudoRandom";
import { SONAR_STATION_REVEAL_RADIUS, SUBMARINE_ATTACK_RANGE, SUBMARINE_ATTACK_RATE, SUBMARINE_ATTACK_REVEAL_TICKS, SUBMARINE_TRANSPORT_DAMAGE, SUBMARINE_WARSHIP_DAMAGE, } from "../configuration/NavalStealthBalance";
export class SubmarineExecution {
    constructor(input) {
        this.input = input;
        this.lastAttackTick = 0;
        this.revealedUntilTick = 0;
    }
    init(mg) {
        this.mg = mg;
        this.pathfinder = PathFinding.Water(mg);
        this.random = new PseudoRandom(mg.ticks());
        if (isUnit(this.input)) {
            this.submarine = this.input;
        }
        else {
            const spawn = this.input.owner.canBuild(UnitType.Submarine, this.input.patrolTile);
            if (spawn === false) {
                console.warn(`Failed to spawn submarine for ${this.input.owner.name()} at ${this.input.patrolTile}`);
                return;
            }
            this.submarine = this.input.owner.buildUnit(UnitType.Submarine, spawn, this.input);
        }
        this.submarine.setTargetable(false);
    }
    tick(ticks) {
        if (!this.submarine?.isActive()) {
            return;
        }
        if (this.submarine.health() <= 0) {
            this.submarine.delete();
            return;
        }
        if (this.submarine.owner().unitCount(UnitType.Port) > 0) {
            this.submarine.modifyHealth(1);
        }
        this.updateRevealState(ticks);
        this.submarine.setTargetUnit(this.findTargetUnit());
        if (this.submarine.targetUnit()) {
            this.huntAndStrikeTarget(ticks);
            return;
        }
        this.patrol();
    }
    updateRevealState(ticks) {
        const revealed = this.revealedUntilTick > ticks || this.hasEnemySonarCoverage();
        this.submarine.setTargetable(revealed);
    }
    hasEnemySonarCoverage() {
        const radiusSquared = SONAR_STATION_REVEAL_RADIUS ** 2;
        const owner = this.submarine.owner();
        for (const player of this.mg.players()) {
            if (player === owner || player.isFriendly(owner)) {
                continue;
            }
            for (const sonar of player.units(UnitType.SonarStation)) {
                if (!sonar.isActive() || sonar.isUnderConstruction()) {
                    continue;
                }
                if (this.mg.euclideanDistSquared(sonar.tile(), this.submarine.tile()) <=
                    radiusSquared) {
                    return true;
                }
            }
        }
        return false;
    }
    findTargetUnit() {
        const owner = this.submarine.owner();
        const patrolTile = this.submarine.patrolTile() ?? this.submarine.tile();
        const patrolRangeSquared = this.mg.config().warshipPatrolRange() ** 2;
        const ships = this.mg.nearbyUnits(this.submarine.tile(), this.mg.config().warshipTargettingRange(), [UnitType.TransportShip, UnitType.TradeShip, UnitType.Warship]);
        let bestUnit;
        let bestPriority = Number.MAX_SAFE_INTEGER;
        let bestDistSquared = Number.MAX_SAFE_INTEGER;
        for (const { unit, distSquared } of ships) {
            if (unit.owner() === owner ||
                !owner.canAttackPlayer(unit.owner(), true)) {
                continue;
            }
            if (unit.type() === UnitType.TradeShip &&
                (unit.isSafeFromPirates() ||
                    unit.targetUnit()?.owner() === owner ||
                    unit.targetUnit()?.owner().isFriendly(owner))) {
                continue;
            }
            if (unit.type() !== UnitType.Warship &&
                this.mg.euclideanDistSquared(patrolTile, unit.tile()) >
                    patrolRangeSquared) {
                continue;
            }
            const priority = unit.type() === UnitType.TransportShip
                ? 0
                : unit.type() === UnitType.TradeShip
                    ? 1
                    : 2;
            if (bestUnit === undefined ||
                priority < bestPriority ||
                (priority === bestPriority && distSquared < bestDistSquared)) {
                bestUnit = unit;
                bestPriority = priority;
                bestDistSquared = distSquared;
            }
        }
        return bestUnit;
    }
    huntAndStrikeTarget(ticks) {
        const target = this.submarine.targetUnit();
        if (!target || !target.isActive()) {
            this.submarine.setTargetUnit(undefined);
            return;
        }
        const inRange = this.mg.euclideanDistSquared(this.submarine.tile(), target.tile()) <=
            SUBMARINE_ATTACK_RANGE ** 2;
        if (!inRange) {
            const result = this.pathfinder.next(this.submarine.tile(), target.tile());
            switch (result.status) {
                case PathStatus.COMPLETE:
                case PathStatus.NEXT:
                    this.submarine.move(result.node);
                    return;
                case PathStatus.NOT_FOUND:
                    this.submarine.setTargetUnit(undefined);
                    return;
            }
        }
        if (ticks - this.lastAttackTick < SUBMARINE_ATTACK_RATE) {
            return;
        }
        this.lastAttackTick = ticks;
        this.revealedUntilTick = ticks + SUBMARINE_ATTACK_REVEAL_TICKS;
        this.updateRevealState(ticks);
        switch (target.type()) {
            case UnitType.TransportShip: {
                const remainingTroops = Math.max(0, target.troops() - SUBMARINE_TRANSPORT_DAMAGE);
                target.setTroops(remainingTroops);
                if (remainingTroops === 0) {
                    target.delete(true, this.submarine.owner());
                }
                else {
                    target.touch();
                }
                break;
            }
            case UnitType.TradeShip:
                target.delete(true, this.submarine.owner());
                break;
            case UnitType.Warship:
                target.modifyHealth(-SUBMARINE_WARSHIP_DAMAGE, this.submarine.owner());
                break;
            default:
                break;
        }
        if (!target.isActive()) {
            this.submarine.setTargetUnit(undefined);
        }
    }
    patrol() {
        if (this.submarine.targetTile() === undefined) {
            this.submarine.setTargetTile(this.randomTile());
            if (this.submarine.targetTile() === undefined) {
                return;
            }
        }
        const result = this.pathfinder.next(this.submarine.tile(), this.submarine.targetTile());
        switch (result.status) {
            case PathStatus.COMPLETE:
                this.submarine.setTargetTile(undefined);
                this.submarine.move(result.node);
                break;
            case PathStatus.NEXT:
                this.submarine.move(result.node);
                break;
            case PathStatus.NOT_FOUND:
                this.submarine.setTargetTile(undefined);
                break;
        }
    }
    randomTile() {
        let patrolRange = this.mg.config().warshipPatrolRange();
        const maxAttemptBeforeExpand = 500;
        let attempts = 0;
        let expandCount = 0;
        const component = this.mg.getWaterComponent(this.submarine.tile());
        while (expandCount < 3) {
            const x = this.mg.x(this.submarine.patrolTile()) +
                this.random.nextInt(-patrolRange / 2, patrolRange / 2);
            const y = this.mg.y(this.submarine.patrolTile()) +
                this.random.nextInt(-patrolRange / 2, patrolRange / 2);
            if (!this.mg.isValidCoord(x, y)) {
                continue;
            }
            const tile = this.mg.ref(x, y);
            if (!this.mg.isOcean(tile) || this.mg.isShoreline(tile)) {
                attempts++;
            }
            else if (component === null ||
                this.mg.hasWaterComponent(tile, component)) {
                return tile;
            }
            if (attempts >= maxAttemptBeforeExpand) {
                attempts = 0;
                expandCount++;
                patrolRange *= 2;
            }
        }
        return undefined;
    }
    isActive() {
        return this.submarine?.isActive() ?? false;
    }
    activeDuringSpawnPhase() {
        return false;
    }
}
//# sourceMappingURL=SubmarineExecution.js.map