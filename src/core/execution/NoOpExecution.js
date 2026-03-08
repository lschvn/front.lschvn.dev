export class NoOpExecution {
    isActive() {
        return false;
    }
    activeDuringSpawnPhase() {
        return false;
    }
    init(mg, ticks) { }
    tick(ticks) { }
}
//# sourceMappingURL=NoOpExecution.js.map