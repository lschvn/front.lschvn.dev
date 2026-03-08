import { ColoredTeams, GameMode, PlayerType, RankedType, } from "../game/Game";
export class WinEvent {
    constructor(winner) {
        this.winner = winner;
    }
}
export class WinCheckExecution {
    constructor() {
        this.active = true;
        this.mg = null;
    }
    init(mg, ticks) {
        this.mg = mg;
    }
    tick(ticks) {
        if (ticks % 10 !== 0) {
            return;
        }
        if (this.mg === null)
            throw new Error("Not initialized");
        if (this.mg.config().gameConfig().gameMode === GameMode.FFA) {
            this.checkWinnerFFA();
        }
        else {
            this.checkWinnerTeam();
        }
    }
    checkWinnerFFA() {
        if (this.mg === null)
            throw new Error("Not initialized");
        const sorted = this.mg
            .players()
            .sort((a, b) => b.numTilesOwned() - a.numTilesOwned());
        if (sorted.length === 0) {
            return;
        }
        if (this.mg.config().gameConfig().rankedType === RankedType.OneVOne) {
            const humans = sorted.filter((p) => p.type() === PlayerType.Human && !p.isDisconnected());
            if (humans.length === 1) {
                this.mg.setWinner(humans[0], this.mg.stats().stats());
                console.log(`${humans[0].name()} has won the game`);
                this.active = false;
                return;
            }
        }
        const max = sorted[0];
        const timeElapsed = (this.mg.ticks() - this.mg.config().numSpawnPhaseTurns()) / 10;
        const numTilesWithoutFallout = this.mg.numLandTiles() - this.mg.numTilesWithFallout();
        if ((max.numTilesOwned() / numTilesWithoutFallout) * 100 >
            this.mg.config().percentageTilesOwnedToWin() ||
            (this.mg.config().gameConfig().maxTimerValue !== undefined &&
                timeElapsed - this.mg.config().gameConfig().maxTimerValue * 60 >= 0) ||
            timeElapsed >= WinCheckExecution.HARD_TIME_LIMIT_SECONDS) {
            this.mg.setWinner(max, this.mg.stats().stats());
            console.log(`${max.name()} has won the game`);
            this.active = false;
        }
    }
    checkWinnerTeam() {
        if (this.mg === null)
            throw new Error("Not initialized");
        const teamToTiles = new Map();
        for (const player of this.mg.players()) {
            const team = player.team();
            // Sanity check, team should not be null here
            if (team === null)
                continue;
            teamToTiles.set(team, (teamToTiles.get(team) ?? 0) + player.numTilesOwned());
        }
        const sorted = Array.from(teamToTiles.entries()).sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) {
            return;
        }
        const max = sorted[0];
        const timeElapsed = (this.mg.ticks() - this.mg.config().numSpawnPhaseTurns()) / 10;
        const numTilesWithoutFallout = this.mg.numLandTiles() - this.mg.numTilesWithFallout();
        const percentage = (max[1] / numTilesWithoutFallout) * 100;
        if (percentage > this.mg.config().percentageTilesOwnedToWin() ||
            (this.mg.config().gameConfig().maxTimerValue !== undefined &&
                timeElapsed - this.mg.config().gameConfig().maxTimerValue * 60 >= 0) ||
            timeElapsed >= WinCheckExecution.HARD_TIME_LIMIT_SECONDS) {
            if (max[0] === ColoredTeams.Bot)
                return;
            this.mg.setWinner(max[0], this.mg.stats().stats());
            console.log(`${max[0]} has won the game`);
            this.active = false;
        }
    }
    isActive() {
        return this.active;
    }
    activeDuringSpawnPhase() {
        return false;
    }
}
// Hard time limit (in seconds) to force a winner before the server's
// maxGameDuration hard kill. 170mins (10 mins before 3hrs)
WinCheckExecution.HARD_TIME_LIMIT_SECONDS = 170 * 60;
//# sourceMappingURL=WinCheckExecution.js.map