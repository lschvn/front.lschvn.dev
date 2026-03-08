export class UpgradeStructureExecution {
    constructor(player, unitId) {
        this.player = player;
        this.unitId = unitId;
    }
    init(mg, ticks) {
        this.structure = this.player
            .units()
            .find((unit) => unit.id() === this.unitId);
        if (this.structure === undefined) {
            console.warn(`structure is undefined`);
            return;
        }
        if (!this.player.canUpgradeUnit(this.structure)) {
            console.warn(`[UpgradeStructureExecution] unit type ${this.structure.type()} cannot be upgraded`);
            return;
        }
        this.player.upgradeUnit(this.structure);
        return;
    }
    tick(ticks) {
        return;
    }
    isActive() {
        return false;
    }
    activeDuringSpawnPhase() {
        return false;
    }
}
//# sourceMappingURL=UpgradeStructureExecution.js.map