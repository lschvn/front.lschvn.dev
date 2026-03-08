import { getServerConfigFromClient } from "../core/configuration/ConfigLoader";
import { PublicGamesSchema } from "../core/Schemas";
function getRandomWorkerPath(numWorkers) {
    const workerIndex = Math.floor(Math.random() * numWorkers);
    return `/w${workerIndex}`;
}
export class PublicLobbySocket {
    constructor(onLobbiesUpdate, options) {
        this.onLobbiesUpdate = onLobbiesUpdate;
        this.ws = null;
        this.wsReconnectTimeout = null;
        this.wsConnectionAttempts = 0;
        this.wsAttemptCounted = false;
        this.workerPath = "";
        this.reconnectDelay = options?.reconnectDelay ?? 3000;
        this.maxWsAttempts = options?.maxWsAttempts ?? 3;
    }
    async start() {
        this.wsConnectionAttempts = 0;
        // Get config to determine number of workers, then pick a random one
        const config = await getServerConfigFromClient();
        this.workerPath = getRandomWorkerPath(config.numWorkers());
        this.connectWebSocket();
    }
    stop() {
        this.disconnectWebSocket();
    }
    connectWebSocket() {
        try {
            // Clean up existing WebSocket before creating a new one
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            const wsUrl = `${protocol}//${window.location.host}${this.workerPath}/lobbies`;
            this.ws = new WebSocket(wsUrl);
            this.wsAttemptCounted = false;
            this.ws.addEventListener("open", () => this.handleOpen());
            this.ws.addEventListener("message", (event) => this.handleMessage(event));
            this.ws.addEventListener("close", () => this.handleClose());
            this.ws.addEventListener("error", (error) => this.handleError(error));
        }
        catch (error) {
            this.handleConnectError(error);
        }
    }
    handleOpen() {
        console.log("WebSocket connected: lobby updating");
        this.wsConnectionAttempts = 0;
        if (this.wsReconnectTimeout !== null) {
            clearTimeout(this.wsReconnectTimeout);
            this.wsReconnectTimeout = null;
        }
    }
    handleMessage(event) {
        try {
            const publicGames = PublicGamesSchema.parse(JSON.parse(event.data));
            this.onLobbiesUpdate(publicGames);
        }
        catch (error) {
            console.error("Error parsing WebSocket message:", error);
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                try {
                    this.ws.close();
                }
                catch (closeError) {
                    console.error("Error closing WebSocket after parse failure:", closeError);
                }
            }
        }
    }
    handleClose() {
        console.log("WebSocket disconnected, attempting to reconnect...");
        if (!this.wsAttemptCounted) {
            this.wsAttemptCounted = true;
            this.wsConnectionAttempts++;
        }
        if (this.wsConnectionAttempts >= this.maxWsAttempts) {
            console.error("Max WebSocket attempts reached");
        }
        else {
            this.scheduleReconnect();
        }
    }
    handleError(error) {
        console.error("WebSocket error:", error);
    }
    handleConnectError(error) {
        console.error("Error connecting WebSocket:", error);
        if (!this.wsAttemptCounted) {
            this.wsAttemptCounted = true;
            this.wsConnectionAttempts++;
        }
        if (this.wsConnectionAttempts >= this.maxWsAttempts) {
            alert("error connecting to game service");
        }
        else {
            this.scheduleReconnect();
        }
    }
    scheduleReconnect() {
        if (this.wsReconnectTimeout !== null)
            return;
        this.wsReconnectTimeout = window.setTimeout(() => {
            this.wsReconnectTimeout = null;
            this.connectWebSocket();
        }, this.reconnectDelay);
    }
    disconnectWebSocket() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        if (this.wsReconnectTimeout !== null) {
            clearTimeout(this.wsReconnectTimeout);
            this.wsReconnectTimeout = null;
        }
    }
}
//# sourceMappingURL=LobbySocket.js.map