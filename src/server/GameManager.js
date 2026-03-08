import { Difficulty, GameMapSize, GameMapType, GameMode, GameType, } from "../core/game/Game";
import { GamePhase, GameServer } from "./GameServer";
export class GameManager {
    constructor(config, log) {
        this.config = config;
        this.log = log;
        this.games = new Map();
        setInterval(() => this.tick(), 1000);
    }
    game(id) {
        return this.games.get(id) ?? null;
    }
    publicLobbies() {
        return Array.from(this.games.values()).filter((g) => g.phase() === GamePhase.Lobby && g.isPublic());
    }
    joinClient(client, gameID) {
        const game = this.games.get(gameID);
        if (!game)
            return "not_found";
        return game.joinClient(client);
    }
    rejoinClient(ws, persistentID, gameID, lastTurn = 0, newUsername) {
        const game = this.games.get(gameID);
        if (!game)
            return false;
        return game.rejoinClient(ws, persistentID, lastTurn, newUsername);
    }
    createGame(id, gameConfig, creatorPersistentID, startsAt, publicGameType) {
        const game = new GameServer(id, this.log, Date.now(), this.config, {
            donateGold: false,
            donateTroops: false,
            gameMap: GameMapType.World,
            gameType: GameType.Private,
            gameMapSize: GameMapSize.Normal,
            difficulty: Difficulty.Medium,
            nations: "default",
            infiniteGold: false,
            infiniteTroops: false,
            maxTimerValue: undefined,
            instantBuild: false,
            randomSpawn: false,
            gameMode: GameMode.FFA,
            bots: 400,
            disabledUnits: [],
            ...gameConfig,
        }, creatorPersistentID, startsAt, publicGameType);
        this.games.set(id, game);
        return game;
    }
    activeGames() {
        return this.games.size;
    }
    activeClients() {
        let totalClients = 0;
        this.games.forEach((game) => {
            totalClients += game.activeClients.length;
        });
        return totalClients;
    }
    desyncCount() {
        let totalDesyncs = 0;
        this.games.forEach((game) => {
            totalDesyncs += game.desyncCount;
        });
        return totalDesyncs;
    }
    tick() {
        const active = new Map();
        for (const [id, game] of this.games) {
            const phase = game.phase();
            if (phase === GamePhase.Active) {
                if (!game.hasStarted()) {
                    // Prestart tells clients to start loading the game.
                    game.prestart();
                    // Start game on delay to allow time for clients to connect.
                    setTimeout(() => {
                        try {
                            game.start();
                        }
                        catch (error) {
                            this.log.error(`error starting game ${id}: ${error}`);
                        }
                    }, 2000);
                }
            }
            if (phase === GamePhase.Finished) {
                try {
                    game.end();
                }
                catch (error) {
                    this.log.error(`error ending game ${id}: ${error}`);
                }
            }
            else {
                active.set(id, game);
            }
        }
        this.games = active;
    }
}
//# sourceMappingURL=GameManager.js.map