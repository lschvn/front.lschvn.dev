import { attackModeTroopCommitment } from "../../../core/configuration/AttackModeBalance";
import { SendAllianceExtensionIntentEvent, SendAllianceRequestIntentEvent, SendAttackIntentEvent, SendBoatAttackIntentEvent, SendBreakAllianceIntentEvent, SendDeleteUnitIntentEvent, SendDonateGoldIntentEvent, SendDonateTroopsIntentEvent, SendEmbargoIntentEvent, SendEmojiIntentEvent, SendSpawnIntentEvent, SendTargetPlayerIntentEvent, } from "../../Transport";
export class PlayerActionHandler {
    constructor(eventBus, uiState) {
        this.eventBus = eventBus;
        this.uiState = uiState;
    }
    handleAttack(player, targetId) {
        this.eventBus.emit(new SendAttackIntentEvent(targetId, attackModeTroopCommitment(player.troops(), this.uiState.attackRatio, this.uiState.attackMode), this.uiState.attackMode));
    }
    handleBoatAttack(player, targetTile) {
        this.eventBus.emit(new SendBoatAttackIntentEvent(targetTile, attackModeTroopCommitment(player.troops(), this.uiState.attackRatio, this.uiState.attackMode), this.uiState.attackMode));
    }
    async findBestTransportShipSpawn(player, tile) {
        return await player.bestTransportShipSpawn(tile);
    }
    handleSpawn(tile) {
        this.eventBus.emit(new SendSpawnIntentEvent(tile));
    }
    handleAllianceRequest(player, recipient) {
        this.eventBus.emit(new SendAllianceRequestIntentEvent(player, recipient));
    }
    handleExtendAlliance(recipient) {
        this.eventBus.emit(new SendAllianceExtensionIntentEvent(recipient));
    }
    handleBreakAlliance(player, recipient) {
        this.eventBus.emit(new SendBreakAllianceIntentEvent(player, recipient));
    }
    handleTargetPlayer(targetId) {
        if (!targetId)
            return;
        this.eventBus.emit(new SendTargetPlayerIntentEvent(targetId));
    }
    handleDonateGold(recipient) {
        this.eventBus.emit(new SendDonateGoldIntentEvent(recipient, null));
    }
    handleDonateTroops(recipient, troops) {
        const amount = troops ?? null;
        if (amount !== null && amount <= 0) {
            return;
        }
        this.eventBus.emit(new SendDonateTroopsIntentEvent(recipient, amount));
    }
    handleEmbargo(recipient, action) {
        this.eventBus.emit(new SendEmbargoIntentEvent(recipient, action));
    }
    handleEmoji(targetPlayer, emojiIndex) {
        this.eventBus.emit(new SendEmojiIntentEvent(targetPlayer, emojiIndex));
    }
    handleDeleteUnit(unitId) {
        this.eventBus.emit(new SendDeleteUnitIntentEvent(unitId));
    }
}
//# sourceMappingURL=PlayerActionHandler.js.map