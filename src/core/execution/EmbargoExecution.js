export class EmbargoExecution {
    constructor(player, targetID, action) {
        this.player = player;
        this.targetID = targetID;
        this.action = action;
        this.active = true;
    }
    init(mg, _) {
        if (!mg.hasPlayer(this.targetID)) {
            console.warn(`EmbargoExecution recipient ${this.targetID} not found`);
            this.active = false;
            return;
        }
        this.target = mg.player(this.targetID);
    }
    tick(_) {
        if (this.action === "start")
            this.player.addEmbargo(this.target, false);
        else
            this.player.stopEmbargo(this.target);
        this.active = false;
    }
    isActive() {
        return this.active;
    }
    activeDuringSpawnPhase() {
        return false;
    }
}
//# sourceMappingURL=EmbargoExecution.js.map