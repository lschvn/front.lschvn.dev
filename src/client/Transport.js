import { z } from "zod";
import { AllPlayers, GameType, } from "../core/game/Game";
import { ServerMessageSchema, } from "../core/Schemas";
import { replacer } from "../core/Util";
import { getPlayToken } from "./Auth";
import { LocalServer } from "./LocalServer";
export class PauseGameIntentEvent {
    constructor(paused) {
        this.paused = paused;
    }
}
export class SendAllianceRequestIntentEvent {
    constructor(requestor, recipient) {
        this.requestor = requestor;
        this.recipient = recipient;
    }
}
export class SendBreakAllianceIntentEvent {
    constructor(requestor, recipient) {
        this.requestor = requestor;
        this.recipient = recipient;
    }
}
export class SendUpgradeStructureIntentEvent {
    constructor(unitId, unitType) {
        this.unitId = unitId;
        this.unitType = unitType;
    }
}
export class SendAllianceRejectIntentEvent {
    constructor(requestor) {
        this.requestor = requestor;
    }
}
export class SendAllianceExtensionIntentEvent {
    constructor(recipient) {
        this.recipient = recipient;
    }
}
export class SendSpawnIntentEvent {
    constructor(tile) {
        this.tile = tile;
    }
}
export class SendAttackIntentEvent {
    constructor(targetID, troops, mode) {
        this.targetID = targetID;
        this.troops = troops;
        this.mode = mode;
    }
}
export class SendBoatAttackIntentEvent {
    constructor(dst, troops, mode) {
        this.dst = dst;
        this.troops = troops;
        this.mode = mode;
    }
}
export class BuildUnitIntentEvent {
    constructor(unit, tile, rocketDirectionUp) {
        this.unit = unit;
        this.tile = tile;
        this.rocketDirectionUp = rocketDirectionUp;
    }
}
export class ProduceAirSquadronIntentEvent {
    constructor(airbaseId, squadronType) {
        this.airbaseId = airbaseId;
        this.squadronType = squadronType;
    }
}
export class LaunchAirMissionIntentEvent {
    constructor(airbaseId, squadronType, missionType, targetTile) {
        this.airbaseId = airbaseId;
        this.squadronType = squadronType;
        this.missionType = missionType;
        this.targetTile = targetTile;
    }
}
export class SendTargetPlayerIntentEvent {
    constructor(targetID) {
        this.targetID = targetID;
    }
}
export class SendEmojiIntentEvent {
    constructor(recipient, emoji) {
        this.recipient = recipient;
        this.emoji = emoji;
    }
}
export class SendDonateGoldIntentEvent {
    constructor(recipient, gold) {
        this.recipient = recipient;
        this.gold = gold;
    }
}
export class SendDonateTroopsIntentEvent {
    constructor(recipient, troops) {
        this.recipient = recipient;
        this.troops = troops;
    }
}
export class SendQuickChatEvent {
    constructor(recipient, quickChatKey, target) {
        this.recipient = recipient;
        this.quickChatKey = quickChatKey;
        this.target = target;
    }
}
export class SendEmbargoIntentEvent {
    constructor(target, action) {
        this.target = target;
        this.action = action;
    }
}
export class SendEmbargoAllIntentEvent {
    constructor(action) {
        this.action = action;
    }
}
export class SendDeleteUnitIntentEvent {
    constructor(unitId) {
        this.unitId = unitId;
    }
}
export class CancelAttackIntentEvent {
    constructor(attackID) {
        this.attackID = attackID;
    }
}
export class CancelBoatIntentEvent {
    constructor(unitID) {
        this.unitID = unitID;
    }
}
export class SendWinnerEvent {
    constructor(winner, allPlayersStats) {
        this.winner = winner;
        this.allPlayersStats = allPlayersStats;
    }
}
export class SendHashEvent {
    constructor(tick, hash) {
        this.tick = tick;
        this.hash = hash;
    }
}
export class MoveWarshipIntentEvent {
    constructor(unitId, tile) {
        this.unitId = unitId;
        this.tile = tile;
    }
}
export class SendKickPlayerIntentEvent {
    constructor(target) {
        this.target = target;
    }
}
export class SendUpdateGameConfigIntentEvent {
    constructor(config) {
        this.config = config;
    }
}
export class Transport {
    constructor(lobbyConfig, eventBus) {
        this.lobbyConfig = lobbyConfig;
        this.eventBus = eventBus;
        this.socket = null;
        this.buffer = [];
        this.pingInterval = null;
        // If gameRecord is not null, we are replaying an archived game.
        // For multiplayer games, GameConfig is not known until game starts.
        this.isLocal =
            lobbyConfig.gameRecord !== undefined ||
                lobbyConfig.gameStartInfo?.config.gameType === GameType.Singleplayer;
        this.eventBus.on(SendAllianceRequestIntentEvent, (e) => this.onSendAllianceRequest(e));
        this.eventBus.on(SendAllianceRejectIntentEvent, (e) => this.onAllianceRejectUIEvent(e));
        this.eventBus.on(SendAllianceExtensionIntentEvent, (e) => this.onSendAllianceExtensionIntent(e));
        this.eventBus.on(SendBreakAllianceIntentEvent, (e) => this.onBreakAllianceRequestUIEvent(e));
        this.eventBus.on(SendSpawnIntentEvent, (e) => this.onSendSpawnIntentEvent(e));
        this.eventBus.on(SendAttackIntentEvent, (e) => this.onSendAttackIntent(e));
        this.eventBus.on(SendUpgradeStructureIntentEvent, (e) => this.onSendUpgradeStructureIntent(e));
        this.eventBus.on(SendBoatAttackIntentEvent, (e) => this.onSendBoatAttackIntent(e));
        this.eventBus.on(SendTargetPlayerIntentEvent, (e) => this.onSendTargetPlayerIntent(e));
        this.eventBus.on(SendEmojiIntentEvent, (e) => this.onSendEmojiIntent(e));
        this.eventBus.on(SendDonateGoldIntentEvent, (e) => this.onSendDonateGoldIntent(e));
        this.eventBus.on(SendDonateTroopsIntentEvent, (e) => this.onSendDonateTroopIntent(e));
        this.eventBus.on(SendQuickChatEvent, (e) => this.onSendQuickChatIntent(e));
        this.eventBus.on(SendEmbargoIntentEvent, (e) => this.onSendEmbargoIntent(e));
        this.eventBus.on(SendEmbargoAllIntentEvent, (e) => this.onSendEmbargoAllIntent(e));
        this.eventBus.on(BuildUnitIntentEvent, (e) => this.onBuildUnitIntent(e));
        this.eventBus.on(ProduceAirSquadronIntentEvent, (e) => this.onProduceAirSquadronIntent(e));
        this.eventBus.on(LaunchAirMissionIntentEvent, (e) => this.onLaunchAirMissionIntent(e));
        this.eventBus.on(PauseGameIntentEvent, (e) => this.onPauseGameIntent(e));
        this.eventBus.on(SendWinnerEvent, (e) => this.onSendWinnerEvent(e));
        this.eventBus.on(SendHashEvent, (e) => this.onSendHashEvent(e));
        this.eventBus.on(CancelAttackIntentEvent, (e) => this.onCancelAttackIntentEvent(e));
        this.eventBus.on(CancelBoatIntentEvent, (e) => this.onCancelBoatIntentEvent(e));
        this.eventBus.on(MoveWarshipIntentEvent, (e) => {
            this.onMoveWarshipEvent(e);
        });
        this.eventBus.on(SendDeleteUnitIntentEvent, (e) => this.onSendDeleteUnitIntent(e));
        this.eventBus.on(SendKickPlayerIntentEvent, (e) => this.onSendKickPlayerIntent(e));
        this.eventBus.on(SendUpdateGameConfigIntentEvent, (e) => this.onSendUpdateGameConfigIntent(e));
    }
    startPing() {
        if (this.isLocal)
            return;
        this.pingInterval ?? (this.pingInterval = window.setInterval(() => {
            if (this.socket !== null && this.socket.readyState === WebSocket.OPEN) {
                this.sendMsg({
                    type: "ping",
                });
            }
        }, 5 * 1000));
    }
    stopPing() {
        if (this.pingInterval) {
            window.clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    connect(onconnect, onmessage) {
        if (this.isLocal) {
            this.connectLocal(onconnect, onmessage);
        }
        else {
            this.connectRemote(onconnect, onmessage);
        }
    }
    updateCallback(onconnect, onmessage) {
        if (this.isLocal) {
            this.localServer.updateCallback(onconnect, onmessage);
        }
        else {
            this.onconnect = onconnect;
            this.onmessage = onmessage;
        }
    }
    connectLocal(onconnect, onmessage) {
        this.localServer = new LocalServer(this.lobbyConfig, this.lobbyConfig.gameRecord !== undefined, this.eventBus);
        this.localServer.updateCallback(onconnect, onmessage);
        this.localServer.start();
    }
    connectRemote(onconnect, onmessage) {
        this.startPing();
        this.killExistingSocket();
        const wsHost = window.location.host;
        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const workerPath = this.lobbyConfig.serverConfig.workerPath(this.lobbyConfig.gameID);
        this.socket = new WebSocket(`${wsProtocol}//${wsHost}/${workerPath}`);
        this.onconnect = onconnect;
        this.onmessage = onmessage;
        this.socket.onopen = () => {
            console.log("Connected to game server!");
            if (this.socket === null) {
                console.error("socket is null");
                return;
            }
            while (this.buffer.length > 0) {
                console.log("sending dropped message");
                const msg = this.buffer.pop();
                if (msg === undefined) {
                    console.warn("msg is undefined");
                    continue;
                }
                this.socket.send(msg);
            }
            onconnect();
        };
        this.socket.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);
                const result = ServerMessageSchema.safeParse(parsed);
                if (!result.success) {
                    const error = z.prettifyError(result.error);
                    console.error("Error parsing server message", error);
                    return;
                }
                this.onmessage(result.data);
            }
            catch (e) {
                console.error("Error in onmessage handler:", e, event.data);
                return;
            }
        };
        this.socket.onerror = (err) => {
            console.error("Socket encountered error: ", err, "Closing socket");
            if (this.socket === null)
                return;
            this.socket.close();
        };
        this.socket.onclose = (event) => {
            console.log(`WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
            if (event.code === 1002) {
                // TODO: make this a modal
                alert(`connection refused: ${event.reason}`);
            }
            else if (event.code !== 1000) {
                console.log(`received error code ${event.code}, reconnecting`);
                this.reconnect();
            }
        };
    }
    reconnect() {
        this.connect(this.onconnect, this.onmessage);
    }
    turnComplete() {
        if (this.isLocal) {
            this.localServer.turnComplete();
        }
    }
    async joinGame() {
        this.sendMsg({
            type: "join",
            gameID: this.lobbyConfig.gameID,
            // Note: clientID is not sent - server assigns it based on persistentID
            username: this.lobbyConfig.playerName,
            cosmetics: this.lobbyConfig.cosmetics,
            turnstileToken: this.lobbyConfig.turnstileToken,
            token: await getPlayToken(),
        });
    }
    async rejoinGame(lastTurn) {
        this.sendMsg({
            type: "rejoin",
            gameID: this.lobbyConfig.gameID,
            // Note: clientID is not sent - server looks it up from persistentID in token
            lastTurn: lastTurn,
            token: await getPlayToken(),
        });
    }
    leaveGame() {
        if (this.isLocal) {
            this.localServer.endGame();
            return;
        }
        this.stopPing();
        if (this.socket === null)
            return;
        if (this.socket.readyState === WebSocket.OPEN) {
            console.log("on stop: leaving game");
            this.killExistingSocket();
        }
        else {
            console.log("WebSocket is not open. Current state:", this.socket.readyState);
            console.error("attempting reconnect");
            this.killExistingSocket();
        }
    }
    onSendAllianceRequest(event) {
        this.sendIntent({
            type: "allianceRequest",
            recipient: event.recipient.id(),
        });
    }
    onAllianceRejectUIEvent(event) {
        this.sendIntent({
            type: "allianceReject",
            requestor: event.requestor.id(),
        });
    }
    onBreakAllianceRequestUIEvent(event) {
        this.sendIntent({
            type: "breakAlliance",
            recipient: event.recipient.id(),
        });
    }
    onSendAllianceExtensionIntent(event) {
        this.sendIntent({
            type: "allianceExtension",
            recipient: event.recipient.id(),
        });
    }
    onSendSpawnIntentEvent(event) {
        this.sendIntent({
            type: "spawn",
            tile: event.tile,
        });
    }
    onSendAttackIntent(event) {
        this.sendIntent({
            type: "attack",
            targetID: event.targetID,
            troops: event.troops,
            mode: event.mode,
        });
    }
    onSendBoatAttackIntent(event) {
        this.sendIntent({
            type: "boat",
            troops: event.troops,
            dst: event.dst,
            mode: event.mode,
        });
    }
    onSendUpgradeStructureIntent(event) {
        this.sendIntent({
            type: "upgrade_structure",
            unit: event.unitType,
            unitId: event.unitId,
        });
    }
    onSendTargetPlayerIntent(event) {
        this.sendIntent({
            type: "targetPlayer",
            target: event.targetID,
        });
    }
    onSendEmojiIntent(event) {
        this.sendIntent({
            type: "emoji",
            recipient: event.recipient === AllPlayers ? AllPlayers : event.recipient.id(),
            emoji: event.emoji,
        });
    }
    onSendDonateGoldIntent(event) {
        this.sendIntent({
            type: "donate_gold",
            recipient: event.recipient.id(),
            gold: event.gold ? Number(event.gold) : null,
        });
    }
    onSendDonateTroopIntent(event) {
        this.sendIntent({
            type: "donate_troops",
            recipient: event.recipient.id(),
            troops: event.troops,
        });
    }
    onSendQuickChatIntent(event) {
        this.sendIntent({
            type: "quick_chat",
            recipient: event.recipient.id(),
            quickChatKey: event.quickChatKey,
            target: event.target,
        });
    }
    onSendEmbargoIntent(event) {
        this.sendIntent({
            type: "embargo",
            targetID: event.target.id(),
            action: event.action,
        });
    }
    onSendEmbargoAllIntent(event) {
        this.sendIntent({
            type: "embargo_all",
            action: event.action,
        });
    }
    onBuildUnitIntent(event) {
        this.sendIntent({
            type: "build_unit",
            unit: event.unit,
            tile: event.tile,
            rocketDirectionUp: event.rocketDirectionUp,
        });
    }
    onProduceAirSquadronIntent(event) {
        this.sendIntent({
            type: "produce_air_squadron",
            airbaseId: event.airbaseId,
            squadronType: event.squadronType,
        });
    }
    onLaunchAirMissionIntent(event) {
        this.sendIntent({
            type: "launch_air_mission",
            airbaseId: event.airbaseId,
            squadronType: event.squadronType,
            missionType: event.missionType,
            targetTile: event.targetTile,
        });
    }
    onPauseGameIntent(event) {
        this.sendIntent({
            type: "toggle_pause",
            paused: event.paused,
        });
    }
    onSendWinnerEvent(event) {
        if (this.isLocal || this.socket?.readyState === WebSocket.OPEN) {
            this.sendMsg({
                type: "winner",
                winner: event.winner,
                allPlayersStats: event.allPlayersStats,
            });
        }
        else {
            console.log("WebSocket is not open. Current state:", this.socket?.readyState);
            console.log("attempting reconnect");
        }
    }
    onSendHashEvent(event) {
        if (this.isLocal || this.socket?.readyState === WebSocket.OPEN) {
            this.sendMsg({
                type: "hash",
                turnNumber: event.tick,
                hash: event.hash,
            });
        }
        else {
            console.log("WebSocket is not open. Current state:", this.socket?.readyState);
            console.log("attempting reconnect");
        }
    }
    onCancelAttackIntentEvent(event) {
        this.sendIntent({
            type: "cancel_attack",
            attackID: event.attackID,
        });
    }
    onCancelBoatIntentEvent(event) {
        this.sendIntent({
            type: "cancel_boat",
            unitID: event.unitID,
        });
    }
    onMoveWarshipEvent(event) {
        this.sendIntent({
            type: "move_warship",
            unitId: event.unitId,
            tile: event.tile,
        });
    }
    onSendDeleteUnitIntent(event) {
        this.sendIntent({
            type: "delete_unit",
            unitId: event.unitId,
        });
    }
    onSendKickPlayerIntent(event) {
        this.sendIntent({
            type: "kick_player",
            target: event.target,
        });
    }
    onSendUpdateGameConfigIntent(event) {
        this.sendIntent({
            type: "update_game_config",
            config: event.config,
        });
    }
    sendIntent(intent) {
        if (this.isLocal || this.socket?.readyState === WebSocket.OPEN) {
            const msg = {
                type: "intent",
                intent: intent,
            };
            this.sendMsg(msg);
        }
        else {
            console.log("WebSocket is not open. Current state:", this.socket?.readyState);
            console.log("attempting reconnect");
        }
    }
    sendMsg(msg) {
        if (this.isLocal) {
            // Forward message to local server
            this.localServer.onMessage(msg);
            return;
        }
        else if (this.socket === null) {
            // Socket missing, do nothing
            return;
        }
        const str = JSON.stringify(msg, replacer);
        if (this.socket.readyState === WebSocket.CLOSED) {
            // Buffer message
            console.warn("socket not ready, closing and trying later");
            this.socket.close();
            this.socket = null;
            this.connectRemote(this.onconnect, this.onmessage);
            this.buffer.push(str);
        }
        else {
            // Send the message directly
            this.socket.send(str);
        }
    }
    killExistingSocket() {
        if (this.socket === null) {
            return;
        }
        // Remove all event listeners
        this.socket.onmessage = null;
        this.socket.onopen = null;
        this.socket.onclose = null;
        this.socket.onerror = null;
        // Close the connection if it's still open or still connecting
        try {
            if (this.socket.readyState === WebSocket.OPEN ||
                this.socket.readyState === WebSocket.CONNECTING) {
                this.socket.close();
            }
        }
        catch (e) {
            console.warn("Error while closing WebSocket:", e);
        }
        this.socket = null;
    }
}
//# sourceMappingURL=Transport.js.map