import { MessageType, UnitType, } from "../game/Game";
import { PathFinding } from "../pathfinding/PathFinder";
import { PathStatus } from "../pathfinding/types";
export class SAMMissileExecution {
    constructor(spawn, _owner, ownerUnit, target, targetTile) {
        this.spawn = spawn;
        this._owner = _owner;
        this.ownerUnit = ownerUnit;
        this.target = target;
        this.targetTile = targetTile;
        this.active = true;
        this.speed = 0;
    }
    init(mg, ticks) {
        this.pathFinder = PathFinding.Air(mg);
        this.mg = mg;
        this.speed = this.mg.config().defaultSamMissileSpeed();
    }
    tick(ticks) {
        this.SAMMissile ?? (this.SAMMissile = this._owner.buildUnit(UnitType.SAMMissile, this.spawn, {}));
        if (!this.SAMMissile.isActive()) {
            this.active = false;
            return;
        }
        // Mirv warheads are too fast, and mirv shouldn't be stopped ever
        const nukesWhitelist = [UnitType.AtomBomb, UnitType.HydrogenBomb];
        if (!this.target.isActive() ||
            !this.ownerUnit.isActive() ||
            this.target.owner() === this.SAMMissile.owner() ||
            !nukesWhitelist.includes(this.target.type())) {
            // Clear the flag so other SAMs can re-target this nuke
            if (this.target.isActive()) {
                this.target.setTargetedBySAM(false);
            }
            this.SAMMissile.delete(false);
            this.active = false;
            return;
        }
        for (let i = 0; i < this.speed; i++) {
            const result = this.pathFinder.next(this.SAMMissile.tile(), this.targetTile);
            if (result.status === PathStatus.COMPLETE) {
                this.mg.displayMessage("events_display.missile_intercepted", MessageType.SAM_HIT, this._owner.id(), undefined, { unit: this.target.type() });
                this.active = false;
                this.target.delete(true, this._owner);
                this.SAMMissile.delete(false);
                // Record stats
                this.mg
                    .stats()
                    .bombIntercept(this._owner, this.target.type(), 1);
                return;
            }
            else if (result.status === PathStatus.NEXT) {
                this.SAMMissile.move(result.node);
            }
        }
    }
    isActive() {
        return this.active;
    }
    activeDuringSpawnPhase() {
        return false;
    }
}
//# sourceMappingURL=SAMMissileExecution.js.map