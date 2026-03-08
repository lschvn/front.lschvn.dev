export class RecomputeRailClusterExecution {
    constructor(railNetwork) {
        this.railNetwork = railNetwork;
    }
    isActive() {
        return true;
    }
    activeDuringSpawnPhase() {
        return false;
    }
    init(mg, ticks) { }
    tick(ticks) {
        this.railNetwork.recomputeClusters();
    }
}
//# sourceMappingURL=RecomputeRailClusterExecution.js.map