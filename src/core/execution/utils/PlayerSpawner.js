import { PlayerType } from "../../game/Game";
import { SpawnExecution } from "../SpawnExecution";
export class PlayerSpawner {
    constructor(gm, gameID) {
        this.gm = gm;
        this.gameID = gameID;
        this.players = [];
    }
    spawnPlayers() {
        for (const player of this.gm.allPlayers()) {
            if (player.type() !== PlayerType.Human) {
                continue;
            }
            this.players.push(new SpawnExecution(this.gameID, player.info()));
        }
        return this.players;
    }
}
//# sourceMappingURL=PlayerSpawner.js.map