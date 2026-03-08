import { AllPlayers, Difficulty, GameMode, PlayerType, Relation, } from "../../game/Game";
import { flattenedEmojiTable } from "../../Util";
import { EmojiExecution } from "../EmojiExecution";
const emojiId = (e) => flattenedEmojiTable.indexOf(e);
export const EMOJI_ASSIST_ACCEPT = ["👍", "🤝", "🎯"].map(emojiId);
export const EMOJI_ASSIST_RELATION_TOO_LOW = ["🥱", "🤦‍♂️"].map(emojiId);
export const EMOJI_ASSIST_TARGET_ME = ["🥺", "💀"].map(emojiId);
export const EMOJI_ASSIST_TARGET_ALLY = ["🕊️", "👎"].map(emojiId);
export const EMOJI_AGGRESSIVE_ATTACK = ["😈"].map(emojiId);
export const EMOJI_ATTACK = ["😡"].map(emojiId);
export const EMOJI_WARSHIP_RETALIATION = ["⛵"].map(emojiId);
export const EMOJI_NUKE = ["☢️", "💥"].map(emojiId);
export const EMOJI_GOT_INSULTED = ["🖕", "😡", "🤡", "😞", "😭"].map(emojiId);
export const EMOJI_LOVE = ["❤️", "😊", "🥰"].map(emojiId);
export const EMOJI_CONFUSED = ["❓", "🤡"].map(emojiId);
export const EMOJI_BRAG = ["👑", "🥇", "💪"].map(emojiId);
export const EMOJI_CHARM_ALLIES = ["🤝", "😇", "💪"].map(emojiId);
export const EMOJI_CLOWN = ["🤡", "🤦‍♂️"].map(emojiId);
export const EMOJI_RAT = ["🐀"].map(emojiId);
export const EMOJI_OVERWHELMED = ["💀", "🆘", "😱", "🥺", "😭", "😞", "🫡", "👋"].map(emojiId);
export const EMOJI_CONGRATULATE = ["👏"].map(emojiId);
export const EMOJI_SCARED_OF_THREAT = ["🙏", "🥺"].map(emojiId);
export const EMOJI_BORED = ["🥱"].map(emojiId);
export const EMOJI_HANDSHAKE = ["🤝"].map(emojiId);
export const EMOJI_DONATION_OK = ["👍"].map(emojiId);
export const EMOJI_DONATION_TOO_SMALL = ["❓", "🥱"].map(emojiId);
export const EMOJI_GREET = ["👋"].map(emojiId);
export class NationEmojiBehavior {
    constructor(random, game, player) {
        this.random = random;
        this.game = game;
        this.player = player;
        this.lastEmojiSent = new Map();
        this.gameOver = false;
    }
    maybeSendCasualEmoji() {
        if (this.gameOver)
            return;
        this.checkOverwhelmedByAttacks();
        this.checkVerySmallAttack();
        this.congratulateWinner();
        this.brag();
        this.charmAllies();
        this.annoyTraitors();
        this.findRat();
        this.greetNearbyPlayers();
    }
    checkOverwhelmedByAttacks() {
        if (!this.random.chance(16))
            return;
        const incomingAttacks = this.player.incomingAttacks();
        if (incomingAttacks.length === 0)
            return;
        const incomingTroops = incomingAttacks.reduce((sum, attack) => sum + attack.troops(), 0);
        const ourTroops = this.player.troops();
        // If incoming troops are at least 3x our troops, we're overwhelmed
        if (incomingTroops >= ourTroops * 3) {
            this.sendEmoji(AllPlayers, EMOJI_OVERWHELMED);
        }
    }
    checkVerySmallAttack() {
        if (!this.random.chance(8))
            return;
        const incomingAttacks = this.player.incomingAttacks();
        if (incomingAttacks.length === 0)
            return;
        const ourTroops = this.player.troops();
        if (ourTroops <= 0)
            return;
        // Find attacks from humans that are very small (less than 10% of our troops)
        for (const attack of incomingAttacks) {
            const attacker = attack.attacker();
            if (attacker.type() !== PlayerType.Human)
                continue;
            if (attack.troops() < ourTroops * 0.1) {
                this.maybeSendEmoji(attacker, this.random.chance(2) ? EMOJI_CONFUSED : EMOJI_BORED);
            }
        }
    }
    // Check if game is over - send congratulations
    congratulateWinner() {
        const winner = this.game.getWinner();
        if (winner === null)
            return;
        this.gameOver = true;
        const isTeamGame = this.game.config().gameConfig().gameMode === GameMode.Team;
        if (isTeamGame) {
            // Team game: all nations congratulate if another team won
            // Don't congratulate if it's our own team
            if (winner === this.player.team())
                return;
            this.sendEmoji(AllPlayers, EMOJI_CONGRATULATE);
        }
        else {
            // FFA game: The largest nation congratulates if a human player won
            if (typeof winner === "string")
                return; // It's a team, not a player
            // Only the largest nation sends the congratulation
            const largestNation = this.game
                .players()
                .filter((p) => p.type() === PlayerType.Nation)
                .sort((a, b) => b.numTilesOwned() - a.numTilesOwned())[0];
            if (largestNation !== this.player)
                return;
            this.sendEmoji(winner, EMOJI_CONGRATULATE);
        }
    }
    // Brag with our crown
    brag() {
        if (!this.random.chance(300))
            return;
        const sorted = this.game
            .players()
            .sort((a, b) => b.numTilesOwned() - a.numTilesOwned());
        if (sorted.length === 0 || sorted[0] !== this.player)
            return;
        this.sendEmoji(AllPlayers, EMOJI_BRAG);
    }
    charmAllies() {
        if (!this.random.chance(250))
            return;
        const humanAllies = this.player
            .allies()
            .filter((p) => p.type() === PlayerType.Human);
        if (humanAllies.length === 0)
            return;
        const ally = this.random.randElement(humanAllies);
        const emojiList = this.random.chance(3) ? EMOJI_LOVE : EMOJI_CHARM_ALLIES;
        this.sendEmoji(ally, emojiList);
    }
    annoyTraitors() {
        if (!this.random.chance(40))
            return;
        const traitors = this.game
            .players()
            .filter((p) => p.type() === PlayerType.Human &&
            !p.isFriendly(this.player) &&
            p.isTraitor());
        if (traitors.length === 0)
            return;
        const traitor = this.random.randElement(traitors);
        this.sendEmoji(traitor, EMOJI_CLOWN);
    }
    findRat() {
        if (this.game.ticks() < 6000)
            return; // Ignore first 10 minutes (everybody is small in the early game)
        if (!this.random.chance(10000))
            return;
        const totalLand = this.game.numLandTiles();
        const threshold = totalLand * 0.01; // 1% of land
        const smallPlayers = this.game
            .players()
            .filter((p) => p.type() === PlayerType.Human &&
            p.numTilesOwned() < threshold &&
            p.numTilesOwned() > 0);
        if (smallPlayers.length === 0)
            return;
        const smallPlayer = this.random.randElement(smallPlayers);
        this.sendEmoji(smallPlayer, EMOJI_RAT);
    }
    greetNearbyPlayers() {
        if (this.game.ticks() > 600)
            return; // Only in the first minute
        if (!this.random.chance(250))
            return;
        const nearbyHumans = this.player
            .neighbors()
            .filter((p) => p.isPlayer() && p.type() === PlayerType.Human);
        if (nearbyHumans.length === 0)
            return;
        const neighbor = this.random.randElement(nearbyHumans);
        this.sendEmoji(neighbor, EMOJI_GREET);
    }
    maybeSendEmoji(otherPlayer, emojisList) {
        if (!this.shouldSendEmoji(otherPlayer))
            return;
        return this.sendEmoji(otherPlayer, emojisList);
    }
    maybeSendAttackEmoji(otherPlayer) {
        if (!this.shouldSendEmoji(otherPlayer))
            return;
        // If we have a good relation to the other player, we are probably attacking first (aggressive)
        if (this.player.relation(otherPlayer) >= Relation.Neutral) {
            if (!this.random.chance(2))
                return;
            this.sendEmoji(otherPlayer, EMOJI_AGGRESSIVE_ATTACK);
            return;
        }
        // We are probably retaliating
        if (!this.random.chance(4))
            return;
        this.sendEmoji(otherPlayer, EMOJI_ATTACK);
    }
    sendEmoji(otherPlayer, emojisList) {
        if (!this.shouldSendEmoji(otherPlayer, false))
            return;
        if (!this.player.canSendEmoji(otherPlayer))
            return;
        this.game.addExecution(new EmojiExecution(this.player, otherPlayer === AllPlayers ? AllPlayers : otherPlayer.id(), this.random.randElement(emojisList)));
    }
    shouldSendEmoji(otherPlayer, limitEmojisByTime = true) {
        if (otherPlayer === AllPlayers)
            return true;
        if (this.player.type() === PlayerType.Bot)
            return false;
        if (otherPlayer.type() !== PlayerType.Human)
            return false;
        if (limitEmojisByTime) {
            const lastSent = this.lastEmojiSent.get(otherPlayer) ?? -300;
            if (this.game.ticks() - lastSent <= 300)
                return false;
            this.lastEmojiSent.set(otherPlayer, this.game.ticks());
        }
        return true;
    }
}
export function respondToEmoji(game, random, sender, recipient, emojiString) {
    if (recipient === AllPlayers || recipient.type() !== PlayerType.Nation) {
        return;
    }
    if (!recipient.canSendEmoji(sender))
        return;
    if (emojiString === "🖕") {
        recipient.updateRelation(sender, -100);
        game.addExecution(new EmojiExecution(recipient, sender.id(), random.randElement(EMOJI_GOT_INSULTED)));
    }
    if (emojiString === "🤡") {
        recipient.updateRelation(sender, -10);
        game.addExecution(new EmojiExecution(recipient, sender.id(), random.randElement(EMOJI_CONFUSED)));
    }
    if (["🕊️", "🏳️", "❤️", "🥰", "👏"].includes(emojiString)) {
        if (game.config().gameConfig().difficulty === Difficulty.Easy) {
            recipient.updateRelation(sender, 15);
        }
        game.addExecution(new EmojiExecution(recipient, sender.id(), sender.relation(recipient) >= Relation.Neutral
            ? random.randElement(EMOJI_LOVE)
            : random.randElement(EMOJI_CONFUSED)));
    }
}
export function respondToMIRV(game, random, mirvTarget) {
    if (!random.chance(8))
        return;
    if (!mirvTarget.canSendEmoji(AllPlayers))
        return;
    game.addExecution(new EmojiExecution(mirvTarget, AllPlayers, random.randElement(EMOJI_OVERWHELMED)));
}
//# sourceMappingURL=NationEmojiBehavior.js.map