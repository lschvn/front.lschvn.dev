export class MarkDisconnectedExecution {
    constructor(player, isDisconnected) {
        this.player = player;
        this.isDisconnected = isDisconnected;
    }
    init(mg, ticks) {
        this.player.markDisconnected(this.isDisconnected);
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
//# sourceMappingURL=MarkDisconnectedExecution.js.map