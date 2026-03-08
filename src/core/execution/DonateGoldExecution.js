import { Difficulty, PlayerType, } from "../game/Game";
import { PseudoRandom } from "../PseudoRandom";
import { assertNever, toInt } from "../Util";
import { EmojiExecution } from "./EmojiExecution";
import { EMOJI_DONATION_OK, EMOJI_DONATION_TOO_SMALL, EMOJI_LOVE, } from "./nation/NationEmojiBehavior";
export class DonateGoldExecution {
    constructor(sender, recipientID, goldNum) {
        this.sender = sender;
        this.recipientID = recipientID;
        this.active = true;
        this.gold = toInt(goldNum ?? 0);
    }
    init(mg, ticks) {
        this.mg = mg;
        this.random = new PseudoRandom(mg.ticks());
        if (!mg.hasPlayer(this.recipientID)) {
            console.warn(`DonateGoldExecution recipient ${this.recipientID} not found`);
            this.active = false;
            return;
        }
        this.recipient = mg.player(this.recipientID);
        this.gold ?? (this.gold = this.sender.gold() / 3n);
    }
    tick(ticks) {
        if (this.gold === null)
            throw new Error("not initialized");
        if (this.sender.canDonateGold(this.recipient) &&
            this.sender.donateGold(this.recipient, this.gold)) {
            // Give relation points based on how much gold was donated
            const relationUpdate = this.calculateRelationUpdate(this.gold, ticks);
            if (relationUpdate > 0) {
                this.recipient.updateRelation(this.sender, relationUpdate);
            }
            // Only AI nations auto-respond with emojis, human players should not
            if (this.recipient.type() === PlayerType.Nation &&
                this.recipient.canSendEmoji(this.sender)) {
                // Select emoji based on donation value
                const emoji = relationUpdate >= 50
                    ? EMOJI_LOVE
                    : relationUpdate > 0
                        ? EMOJI_DONATION_OK
                        : EMOJI_DONATION_TOO_SMALL;
                this.mg.addExecution(new EmojiExecution(this.recipient, this.sender.id(), this.random.randElement(emoji)));
            }
        }
        else {
            console.warn(`cannot send gold from ${this.sender.name()} to ${this.recipient.name()}`);
        }
        this.active = false;
    }
    getGoldChunkSize() {
        const { difficulty } = this.mg.config().gameConfig();
        switch (difficulty) {
            case Difficulty.Easy:
                return 2500;
            case Difficulty.Medium:
                return 5000;
            case Difficulty.Hard:
                return 12500;
            case Difficulty.Impossible:
                return 25000;
            default:
                assertNever(difficulty);
        }
    }
    calculateRelationUpdate(goldSent, ticks) {
        const chunkSize = this.getGoldChunkSize();
        // For every 5 minutes that pass, multiply the chunk size to scale with game progression
        const chunkSizeMultiplier = ticks / (3000 + this.mg.config().numSpawnPhaseTurns());
        const adjustedChunkSize = BigInt(Math.round(chunkSize + chunkSize * chunkSizeMultiplier));
        // Calculate how many complete chunks were donated
        const chunks = Number(goldSent / adjustedChunkSize);
        // Each chunk gives 5 relation points
        const relationUpdate = chunks * 5;
        // Cap at 100 relation points
        if (relationUpdate > 100)
            return 100;
        return relationUpdate;
    }
    isActive() {
        return this.active;
    }
    activeDuringSpawnPhase() {
        return false;
    }
}
//# sourceMappingURL=DonateGoldExecution.js.map