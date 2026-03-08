import { WebSocket, WebSocketServer } from "ws";
import { MasterMessageSchema, } from "./IPCBridgeSchema";
export class WorkerLobbyService {
    constructor(server, gameWss, gm, log) {
        this.server = server;
        this.gameWss = gameWss;
        this.gm = gm;
        this.log = log;
        this.lobbyClients = new Set();
        this.lobbiesWss = new WebSocketServer({ noServer: true });
        this.setupUpgradeHandler();
        this.setupLobbiesWebSocket();
        this.setupIPCListener();
    }
    setupIPCListener() {
        process.on("message", (raw) => {
            const result = MasterMessageSchema.safeParse(raw);
            if (!result.success) {
                this.log.error("Invalid IPC message from master:", raw);
                return;
            }
            const msg = result.data;
            switch (msg.type) {
                case "lobbiesBroadcast":
                    // Forward message to all clients
                    this.broadcastLobbiesToClients(msg.publicGames);
                    // Update master with my lobby info
                    this.sendMyLobbiesToMaster();
                    break;
                case "createGame":
                    if (this.gm.game(msg.gameID) !== null) {
                        this.log.warn(`Game ${msg.gameID} already exists, skipping create`);
                        return;
                    }
                    this.log.info(`Creating public game ${msg.gameID} from master`);
                    this.gm.createGame(msg.gameID, msg.gameConfig, undefined, undefined, msg.publicGameType);
                    break;
                case "updateLobby": {
                    const game = this.gm.game(msg.gameID);
                    if (!game) {
                        this.log.warn("cannot update game, not found", {
                            gameID: msg.gameID,
                        });
                        return;
                    }
                    game.setStartsAt(msg.startsAt);
                    break;
                }
            }
        });
    }
    sendReady(workerId) {
        const msg = { type: "workerReady", workerId };
        process.send?.(msg);
    }
    sendMyLobbiesToMaster() {
        const lobbies = this.gm
            .publicLobbies()
            .map((g) => g.gameInfo())
            .map((gi) => {
            return {
                gameID: gi.gameID,
                numClients: gi.clients?.length ?? 0,
                startsAt: gi.startsAt,
                gameConfig: gi.gameConfig,
                publicGameType: gi.publicGameType,
            };
        });
        process.send?.({ type: "lobbyList", lobbies });
    }
    setupUpgradeHandler() {
        this.server.on("upgrade", (request, socket, head) => {
            const pathname = request.url ?? "";
            if (pathname === "/lobbies" || pathname.endsWith("/lobbies")) {
                this.lobbiesWss.handleUpgrade(request, socket, head, (ws) => {
                    this.lobbiesWss.emit("connection", ws, request);
                });
            }
            else {
                this.gameWss.handleUpgrade(request, socket, head, (ws) => {
                    this.gameWss.emit("connection", ws, request);
                });
            }
        });
    }
    setupLobbiesWebSocket() {
        this.lobbiesWss.on("connection", (ws) => {
            this.lobbyClients.add(ws);
            ws.on("close", () => {
                this.lobbyClients.delete(ws);
            });
            ws.on("error", (error) => {
                this.log.error(`Lobbies WebSocket error:`, error);
                this.lobbyClients.delete(ws);
                try {
                    if (ws.readyState === WebSocket.OPEN ||
                        ws.readyState === WebSocket.CONNECTING) {
                        ws.close(1011, "WebSocket internal error");
                    }
                }
                catch (closeError) {
                    this.log.error("Error closing lobbies WebSocket:", closeError);
                }
            });
        });
    }
    broadcastLobbiesToClients(publicGames) {
        const message = JSON.stringify(publicGames);
        const clientsToRemove = [];
        this.lobbyClients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
            else {
                clientsToRemove.push(client);
            }
        });
        clientsToRemove.forEach((client) => {
            this.lobbyClients.delete(client);
        });
    }
}
//# sourceMappingURL=WorkerLobbyService.js.map