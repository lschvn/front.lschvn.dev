import { UnitType } from "../game/Game";
import { PathFinding } from "../pathfinding/PathFinder";
import { PathStatus } from "../pathfinding/types";
import { PseudoRandom } from "../PseudoRandom";
export class ShellExecution {
    constructor(spawn, _owner, ownerUnit, target) {
        this.spawn = spawn;
        this._owner = _owner;
        this.ownerUnit = ownerUnit;
        this.target = target;
        this.active = true;
        this.destroyAtTick = -1;
    }
    init(mg, ticks) {
        this.pathFinder = PathFinding.Air(mg);
        this.mg = mg;
        this.random = new PseudoRandom(mg.ticks());
    }
    tick(ticks) {
        this.shell ?? (this.shell = this._owner.buildUnit(UnitType.Shell, this.spawn, {}));
        if (!this.shell.isActive()) {
            this.active = false;
            return;
        }
        if (!this.target.isActive() ||
            this.target.owner() === this.shell.owner() ||
            (this.destroyAtTick !== -1 && this.mg.ticks() >= this.destroyAtTick)) {
            this.shell.delete(false);
            this.active = false;
            return;
        }
        if (this.destroyAtTick === -1 && !this.ownerUnit.isActive()) {
            this.destroyAtTick = this.mg.ticks() + this.mg.config().shellLifetime();
        }
        for (let i = 0; i < 3; i++) {
            const result = this.pathFinder.next(this.shell.tile(), this.target.tile());
            if (result.status === PathStatus.COMPLETE) {
                this.active = false;
                this.target.modifyHealth(-this.effectOnTarget(), this._owner);
                this.shell.setReachedTarget();
                this.shell.delete(false);
                return;
            }
            else if (result.status === PathStatus.NEXT) {
                this.shell.move(result.node);
            }
        }
    }
    effectOnTarget() {
        const { damage } = this.mg.config().unitInfo(UnitType.Shell);
        const baseDamage = damage ?? 250;
        const roll = this.random.nextInt(1, 6);
        const damageMultiplier = (roll - 1) * 25 + 200;
        return Math.round((baseDamage / 250) * damageMultiplier);
    }
    getEffectOnTargetForTesting() {
        return this.effectOnTarget();
    }
    isActive() {
        return this.active;
    }
    activeDuringSpawnPhase() {
        return false;
    }
}
//# sourceMappingURL=ShellExecution.js.map