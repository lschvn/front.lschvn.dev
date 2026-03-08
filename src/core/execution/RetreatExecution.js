const cancelDelay = 20;
export class RetreatExecution {
    constructor(player, attackID) {
        this.player = player;
        this.attackID = attackID;
        this.active = true;
        this.retreatOrdered = false;
    }
    init(mg, ticks) {
        this.mg = mg;
        this.startTick = mg.ticks();
    }
    tick(ticks) {
        if (!this.retreatOrdered) {
            this.player.orderRetreat(this.attackID);
            this.retreatOrdered = true;
        }
        if (this.mg.ticks() >= this.startTick + cancelDelay) {
            this.player.executeRetreat(this.attackID);
            this.active = false;
        }
    }
    owner() {
        return this.player;
    }
    isActive() {
        return this.active;
    }
    activeDuringSpawnPhase() {
        return false;
    }
}
//# sourceMappingURL=RetreatExecution.js.map