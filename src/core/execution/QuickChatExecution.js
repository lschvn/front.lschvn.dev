export class QuickChatExecution {
    constructor(sender, recipientID, quickChatKey, target) {
        this.sender = sender;
        this.recipientID = recipientID;
        this.quickChatKey = quickChatKey;
        this.target = target;
        this.active = true;
    }
    init(mg, ticks) {
        this.mg = mg;
        if (!mg.hasPlayer(this.recipientID)) {
            console.warn(`QuickChatExecution: recipient ${this.recipientID} not found`);
            this.active = false;
            return;
        }
        this.recipient = mg.player(this.recipientID);
    }
    tick(ticks) {
        const message = this.getMessageFromKey(this.quickChatKey);
        this.mg.displayChat(message[1], message[0], this.target, this.recipient.id(), true, this.sender.id());
        this.mg.displayChat(message[1], message[0], this.target, this.sender.id(), false, this.recipient.id());
        console.log(`[QuickChat] ${this.sender.name} → ${this.recipient.displayName}: ${message}`);
        this.active = false;
    }
    owner() {
        return this.sender;
    }
    isActive() {
        return this.active;
    }
    activeDuringSpawnPhase() {
        return false;
    }
    getMessageFromKey(fullKey) {
        const translated = fullKey.split(".");
        return translated;
    }
}
//# sourceMappingURL=QuickChatExecution.js.map