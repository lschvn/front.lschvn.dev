import { generateID } from "../core/Util";
import { WorkerMessageSchema, } from "./IPCBridgeSchema";
import { startPolling } from "./PollingLoop";
export class MasterLobbyService {
    constructor(config, playlist, log) {
        this.config = config;
        this.playlist = playlist;
        this.log = log;
        this.workers = new Map();
        // Worker id => the lobbies it owns.
        this.workerLobbies = new Map();
        this.readyWorkers = new Set();
        this.started = false;
    }
    registerWorker(workerId, worker) {
        this.workers.set(workerId, worker);
        worker.on("message", (raw) => {
            const result = WorkerMessageSchema.safeParse(raw);
            if (!result.success) {
                this.log.error("Invalid IPC message from worker:", raw);
                return;
            }
            const msg = result.data;
            switch (msg.type) {
                case "workerReady":
                    this.handleWorkerReady(msg.workerId);
                    break;
                case "lobbyList":
                    this.workerLobbies.set(workerId, msg.lobbies);
                    break;
            }
        });
    }
    removeWorker(workerId) {
        this.workers.delete(workerId);
        this.workerLobbies.delete(workerId);
        this.readyWorkers.delete(workerId);
    }
    isHealthy() {
        // We consider the lobby service healthy if at least half of the workers are ready.
        // This allows for some leeway if a worker crashes.
        const minWorkers = Math.max(this.config.numWorkers() / 2, 1);
        return this.started && this.readyWorkers.size >= minWorkers;
    }
    handleWorkerReady(workerId) {
        this.readyWorkers.add(workerId);
        this.log.info(`Worker ${workerId} is ready. (${this.readyWorkers.size}/${this.config.numWorkers()} ready)`);
        if (this.readyWorkers.size === this.config.numWorkers() && !this.started) {
            this.started = true;
            this.log.info("All workers ready, starting game scheduling");
            startPolling(async () => this.broadcastLobbies(), 250);
            startPolling(async () => await this.maybeScheduleLobby(), 1000);
        }
    }
    getAllLobbies() {
        const lobbies = Array.from(this.workerLobbies.values()).flat();
        const result = {
            ffa: [],
            team: [],
            special: [],
        };
        for (const lobby of lobbies) {
            result[lobby.publicGameType].push(lobby);
        }
        for (const type of Object.keys(result)) {
            result[type].sort((a, b) => {
                if (a.startsAt === undefined && b.startsAt === undefined) {
                    // Sort by game id for stability.
                    return a.gameID > b.gameID ? 1 : -1;
                }
                // If a lobby has startsAt set, we assume it's the active one.
                if (a.startsAt === undefined)
                    return 1;
                if (b.startsAt === undefined)
                    return -1;
                return a.startsAt - b.startsAt;
            });
        }
        return result;
    }
    broadcastLobbies() {
        const msg = {
            type: "lobbiesBroadcast",
            publicGames: {
                serverTime: Date.now(),
                games: this.getAllLobbies(),
            },
        };
        for (const worker of this.workers.values()) {
            worker.send(msg, (e) => {
                if (e) {
                    this.log.error("Failed to send lobbies broadcast to worker:", e);
                }
            });
        }
    }
    async maybeScheduleLobby() {
        const lobbiesByType = this.getAllLobbies();
        for (const type of Object.keys(lobbiesByType)) {
            const lobbies = lobbiesByType[type];
            if (lobbies.length >= 2) {
                continue;
            }
            const nextLobby = lobbies[0];
            if (nextLobby && nextLobby.startsAt === undefined) {
                // The previous game has started, so we need to set the timer on the next game.
                this.sendMessageToWorker({
                    type: "updateLobby",
                    gameID: nextLobby.gameID,
                    startsAt: Date.now() + this.config.gameCreationRate(),
                });
            }
            this.sendMessageToWorker({
                type: "createGame",
                gameID: generateID(),
                gameConfig: await this.playlist.gameConfig(type),
                publicGameType: type,
            });
        }
    }
    sendMessageToWorker(msg) {
        const workerId = this.config.workerIndex(msg.gameID);
        const worker = this.workers.get(workerId);
        if (!worker) {
            this.log.error(`Worker ${workerId} not found`);
            return;
        }
        worker.send(msg, (e) => {
            if (e) {
                this.log.error("Failed to send message to worker:", e);
            }
        });
    }
}
//# sourceMappingURL=MasterLobbyService.js.map