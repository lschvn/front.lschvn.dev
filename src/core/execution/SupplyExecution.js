export class SupplyExecution {
    constructor() {
        this.mg = null;
    }
    init(mg) {
        this.mg = mg;
    }
    tick(ticks) {
        this.mg?.recomputeSupplyIfNeeded(ticks);
    }
    isActive() {
        return true;
    }
    activeDuringSpawnPhase() {
        return false;
    }
}
//# sourceMappingURL=SupplyExecution.js.map