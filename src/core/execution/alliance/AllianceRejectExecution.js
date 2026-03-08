export class AllianceRejectExecution {
    constructor(requestorID, recipient) {
        this.requestorID = requestorID;
        this.recipient = recipient;
        this.active = true;
    }
    init(mg, ticks) {
        if (!mg.hasPlayer(this.requestorID)) {
            console.warn(`[AllianceRejectExecution] Requestor ${this.requestorID} not found`);
            this.active = false;
            return;
        }
        const requestor = mg.player(this.requestorID);
        if (requestor.isFriendly(this.recipient)) {
            console.warn(`[AllianceRejectExecution] Player ${this.requestorID} cannot reject alliance with ${this.recipient.id}, already allied`);
        }
        else {
            const request = requestor
                .outgoingAllianceRequests()
                .find((ar) => ar.recipient() === this.recipient);
            if (request === undefined) {
                console.warn(`[AllianceRejectExecution] Player ${this.requestorID} cannot reject alliance with ${this.recipient.id}, no alliance request found`);
            }
            else {
                request.reject();
            }
        }
        this.active = false;
    }
    tick(ticks) { }
    isActive() {
        return this.active;
    }
    activeDuringSpawnPhase() {
        return false;
    }
}
//# sourceMappingURL=AllianceRejectExecution.js.map