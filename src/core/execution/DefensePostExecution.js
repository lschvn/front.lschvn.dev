import { ShellExecution } from "./ShellExecution";
export class DefensePostExecution {
    constructor(post) {
        this.post = post;
        this.active = true;
        this.target = null;
        this.lastShellAttack = 0;
        this.alreadySentShell = new Set();
    }
    init(mg, ticks) {
        this.mg = mg;
    }
    shoot() {
        if (this.target === null)
            return;
        const shellAttackRate = this.mg.config().defensePostShellAttackRate();
        if (this.mg.ticks() - this.lastShellAttack > shellAttackRate) {
            this.lastShellAttack = this.mg.ticks();
            this.mg.addExecution(new ShellExecution(this.post.tile(), this.post.owner(), this.post, this.target));
            if (!this.target.hasHealth()) {
                // Don't send multiple shells to target that can be oneshotted
                this.alreadySentShell.add(this.target);
                this.target = null;
                return;
            }
        }
    }
    tick(ticks) {
        if (!this.post.isActive()) {
            this.active = false;
            return;
        }
        // Do nothing while the structure is under construction
        if (this.post.isUnderConstruction()) {
            return;
        }
        if (this.target !== null && !this.target.isActive()) {
            this.target = null;
        }
        // TODO: Reconsider how/if defense posts target ships.
        // const ships = this.mg
        //   .nearbyUnits(
        //     this.post.tile(),
        //     this.mg.config().defensePostTargettingRange(),
        //     [UnitType.TransportShip, UnitType.Warship],
        //   )
        //   .filter(
        //     ({ unit }) =>
        //       this.post !== null &&
        //       unit.owner() !== this.post.owner() &&
        //       !unit.owner().isFriendly(this.post.owner()) &&
        //       !this.alreadySentShell.has(unit),
        //   );
        //
        // this.target =
        //   ships.sort((a, b) => {
        //     const { unit: unitA, distSquared: distA } = a;
        //     const { unit: unitB, distSquared: distB } = b;
        //
        //     // Prioritize TransportShip
        //     if (
        //       unitA.type() === UnitType.TransportShip &&
        //       unitB.type() !== UnitType.TransportShip
        //     )
        //       return -1;
        //     if (
        //       unitA.type() !== UnitType.TransportShip &&
        //       unitB.type() === UnitType.TransportShip
        //     )
        //       return 1;
        //
        //     // If both are the same type, sort by distance (lower `distSquared` means closer)
        //     return distA - distB;
        //   })[0]?.unit ?? null;
        //
        // if (this.target === null || !this.target.isActive()) {
        //   this.target = null;
        //   return;
        // } else {
        //   this.shoot();
        //   return;
        // }
    }
    isActive() {
        return this.active;
    }
    activeDuringSpawnPhase() {
        return false;
    }
}
//# sourceMappingURL=DefensePostExecution.js.map