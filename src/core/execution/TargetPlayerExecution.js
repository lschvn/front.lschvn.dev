export class TargetPlayerExecution {
    constructor(requestor, targetID) {
        this.requestor = requestor;
        this.targetID = targetID;
        this.active = true;
    }
    init(mg, ticks) {
        if (!mg.hasPlayer(this.targetID)) {
            console.warn(`TargetPlayerExecution: target ${this.targetID} not found`);
            this.active = false;
            return;
        }
        this.target = mg.player(this.targetID);
    }
    tick(ticks) {
        if (this.requestor.canTarget(this.target)) {
            this.requestor.target(this.target);
            this.target.updateRelation(this.requestor, -40);
        }
        this.active = false;
    }
    isActive() {
        return this.active;
    }
    activeDuringSpawnPhase() {
        return false;
    }
}
//# sourceMappingURL=TargetPlayerExecution.js.map