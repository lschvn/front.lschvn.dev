export class BreakAllianceExecution {
    constructor(requestor, recipientID) {
        this.requestor = requestor;
        this.recipientID = recipientID;
        this.active = true;
        this.recipient = null;
        this.mg = null;
    }
    init(mg, ticks) {
        if (!mg.hasPlayer(this.recipientID)) {
            console.warn(`BreakAllianceExecution: recipient ${this.recipientID} not found`);
            this.active = false;
            return;
        }
        this.recipient = mg.player(this.recipientID);
        this.mg = mg;
    }
    tick(ticks) {
        if (this.mg === null ||
            this.requestor === null ||
            this.recipient === null) {
            throw new Error("Not initialized");
        }
        const alliance = this.requestor.allianceWith(this.recipient);
        if (alliance === null) {
            console.warn("cant break alliance, not allied");
        }
        else {
            this.requestor.breakAlliance(alliance);
            this.recipient.updateRelation(this.requestor, -100);
            const neighbors = this.requestor
                .neighbors()
                .filter((n) => n.isPlayer() && !n.isOnSameTeam(this.recipient));
            for (const neighbor of neighbors) {
                neighbor.updateRelation(this.requestor, -40);
            }
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
//# sourceMappingURL=BreakAllianceExecution.js.map