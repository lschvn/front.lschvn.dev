import { placeName } from "../client/graphics/NameBoxCalculator";
import { getConfig } from "./configuration/ConfigLoader";
import { Executor } from "./execution/ExecutionManager";
import { RecomputeRailClusterExecution } from "./execution/RecomputeRailClusterExecution";
import { SupplyExecution } from "./execution/SupplyExecution";
import { WinCheckExecution } from "./execution/WinCheckExecution";
import { AllPlayers, PlayerInfo, PlayerType, UnitType, } from "./game/Game";
import { createGame } from "./game/GameImpl";
import { createNationsForGame } from "./game/NationCreation";
import { loadTerrainMap as loadGameMap } from "./game/TerrainMapLoader";
import { PseudoRandom } from "./PseudoRandom";
import { simpleHash } from "./Util";
export async function createGameRunner(gameStart, clientID, mapLoader, callBack) {
    const config = await getConfig(gameStart.config, null);
    const gameMap = await loadGameMap(gameStart.config.gameMap, gameStart.config.gameMapSize, mapLoader);
    const random = new PseudoRandom(simpleHash(gameStart.gameID));
    const humans = gameStart.players.map((p) => {
        return new PlayerInfo(p.username, PlayerType.Human, p.clientID, random.nextID(), p.isLobbyCreator ?? false);
    });
    const nations = createNationsForGame(gameStart, gameMap.nations, humans.length, random);
    const game = createGame(humans, nations, gameMap.gameMap, gameMap.miniGameMap, config, gameMap.teamGameSpawnAreas);
    const gr = new GameRunner(game, new Executor(game, gameStart.gameID, clientID), callBack);
    gr.init();
    return gr;
}
export class GameRunner {
    constructor(game, execManager, callBack) {
        this.game = game;
        this.execManager = execManager;
        this.callBack = callBack;
        this.turns = [];
        this.currTurn = 0;
        this.isExecuting = false;
        this.playerViewData = {};
    }
    init() {
        if (this.game.config().isRandomSpawn()) {
            this.game.addExecution(...this.execManager.spawnPlayers());
        }
        if (this.game.config().bots() > 0) {
            this.game.addExecution(...this.execManager.spawnBots(this.game.config().numBots()));
        }
        if (this.game.config().spawnNations()) {
            this.game.addExecution(...this.execManager.nationExecutions());
        }
        this.game.addExecution(new WinCheckExecution());
        if (!this.game.config().isUnitDisabled(UnitType.Factory)) {
            this.game.addExecution(new RecomputeRailClusterExecution(this.game.railNetwork()));
        }
        this.game.addExecution(new SupplyExecution());
    }
    addTurn(turn) {
        this.turns.push(turn);
    }
    executeNextTick(pendingTurns) {
        if (this.isExecuting) {
            return false;
        }
        if (this.currTurn >= this.turns.length) {
            return false;
        }
        this.isExecuting = true;
        this.game.addExecution(...this.execManager.createExecs(this.turns[this.currTurn]));
        this.currTurn++;
        let updates;
        let tickExecutionDuration = 0;
        try {
            const startTime = performance.now();
            updates = this.game.executeNextTick();
            const endTime = performance.now();
            tickExecutionDuration = endTime - startTime;
        }
        catch (error) {
            if (error instanceof Error) {
                console.error("Game tick error:", error.message);
                this.callBack({
                    errMsg: error.message,
                    stack: error.stack,
                });
            }
            else {
                console.error("Game tick error:", error);
            }
            this.isExecuting = false;
            return false;
        }
        if (this.game.inSpawnPhase() && this.game.ticks() % 2 === 0) {
            this.game
                .players()
                .filter((p) => p.type() === PlayerType.Human || p.type() === PlayerType.Nation)
                .forEach((p) => (this.playerViewData[p.id()] = placeName(this.game, p)));
        }
        if (this.game.ticks() < 3 || this.game.ticks() % 30 === 0) {
            this.game.players().forEach((p) => {
                this.playerViewData[p.id()] = placeName(this.game, p);
            });
        }
        const packedTileUpdates = this.game.drainPackedTileUpdates();
        const packedSupplyUpdates = this.game.drainPackedSupplyUpdates();
        const packedMotionPlans = this.game.drainPackedMotionPlans();
        this.callBack({
            tick: this.game.ticks(),
            packedTileUpdates,
            ...(packedSupplyUpdates ? { packedSupplyUpdates } : {}),
            ...(packedMotionPlans ? { packedMotionPlans } : {}),
            updates: updates,
            playerNameViewData: this.playerViewData,
            tickExecutionDuration: tickExecutionDuration,
            pendingTurns: pendingTurns ?? 0,
        });
        this.isExecuting = false;
        return true;
    }
    pendingTurns() {
        return Math.max(0, this.turns.length - this.currTurn);
    }
    playerBuildables(playerID, x, y, units) {
        const player = this.game.player(playerID);
        const tile = x !== undefined && y !== undefined ? this.game.ref(x, y) : null;
        return player.buildableUnits(tile, units);
    }
    playerActions(playerID, x, y, units) {
        const player = this.game.player(playerID);
        const tile = x !== undefined && y !== undefined ? this.game.ref(x, y) : null;
        const actions = {
            canAttack: tile !== null && player.canAttack(tile),
            buildableUnits: units === null ? [] : player.buildableUnits(tile, units),
            canSendEmojiAllPlayers: player.canSendEmoji(AllPlayers),
            canEmbargoAll: player.canEmbargoAll(),
        };
        if (tile !== null && this.game.hasOwner(tile)) {
            const other = this.game.owner(tile);
            actions.interaction = {
                sharedBorder: player.sharesBorderWith(other),
                canSendEmoji: player.canSendEmoji(other),
                canTarget: player.canTarget(other),
                canSendAllianceRequest: player.canSendAllianceRequest(other),
                canBreakAlliance: player.isAlliedWith(other),
                canDonateGold: player.canDonateGold(other),
                canDonateTroops: player.canDonateTroops(other),
                canEmbargo: !player.hasEmbargoAgainst(other),
                allianceInfo: player.allianceInfo(other) ?? undefined,
            };
        }
        return actions;
    }
    playerProfile(playerID) {
        const player = this.game.playerBySmallID(playerID);
        if (!player.isPlayer()) {
            throw new Error(`player with id ${playerID} not found`);
        }
        return player.playerProfile();
    }
    playerBorderTiles(playerID) {
        const player = this.game.player(playerID);
        if (!player.isPlayer()) {
            throw new Error(`player with id ${playerID} not found`);
        }
        return {
            borderTiles: player.borderTiles(),
        };
    }
    attackAveragePosition(playerID, attackID) {
        const player = this.game.playerBySmallID(playerID);
        if (!player.isPlayer()) {
            throw new Error(`player with id ${playerID} not found`);
        }
        const condition = (a) => a.id() === attackID;
        const attack = player.outgoingAttacks().find(condition) ??
            player.incomingAttacks().find(condition);
        if (attack === undefined) {
            return null;
        }
        return attack.averagePosition();
    }
    bestTransportShipSpawn(playerID, targetTile) {
        const player = this.game.player(playerID);
        if (!player.isPlayer()) {
            throw new Error(`player with id ${playerID} not found`);
        }
        return player.bestTransportShipSpawn(targetTile);
    }
}
//# sourceMappingURL=GameRunner.js.map