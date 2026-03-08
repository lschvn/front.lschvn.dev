import { PlayerInfo, PlayerType } from "../game/Game";
import { PseudoRandom } from "../PseudoRandom";
import { simpleHash } from "../Util";
import { SpawnExecution } from "./SpawnExecution";
import { BOT_NAME_PREFIXES, BOT_NAME_SUFFIXES } from "./utils/BotNames";
export class BotSpawner {
    constructor(gs, gameID) {
        this.gs = gs;
        this.gameID = gameID;
        this.bots = [];
        // Use a different seed than createGameRunner (which uses simpleHash(gameID))
        // to avoid bot IDs colliding with nation/human IDs from the same PRNG sequence.
        this.random = new PseudoRandom(simpleHash(gameID) + 2);
    }
    spawnBots(numBots) {
        for (let i = 0; i < numBots; i++) {
            const name = this.randomBotName();
            const spawn = this.spawnBot(name);
            this.bots.push(spawn);
        }
        return this.bots;
    }
    spawnBot(botName) {
        return new SpawnExecution(this.gameID, new PlayerInfo(botName, PlayerType.Bot, null, this.random.nextID()));
    }
    randomBotName() {
        const prefixIndex = this.random.nextInt(0, BOT_NAME_PREFIXES.length);
        const suffixIndex = this.random.nextInt(0, BOT_NAME_SUFFIXES.length);
        return `${BOT_NAME_PREFIXES[prefixIndex]} ${BOT_NAME_SUFFIXES[suffixIndex]}`;
    }
}
//# sourceMappingURL=BotSpawner.js.map