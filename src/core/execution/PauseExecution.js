import { GameType } from "../game/Game";
export class PauseExecution {
    constructor(player, paused) {
        this.player = player;
        this.paused = paused;
    }
    isActive() {
        return false;
    }
    activeDuringSpawnPhase() {
        return true;
    }
    init(game, ticks) {
        if (this.player.isLobbyCreator() ||
            game.config().gameConfig().gameType === GameType.Singleplayer) {
            game.setPaused(this.paused);
        }
    }
    tick(ticks) { }
}
//# sourceMappingURL=PauseExecution.js.map