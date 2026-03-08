import { AllPlayers, Difficulty, PlayerType, SupplyState, UnitType, } from "../../game/Game";
import { ConstructionExecution } from "../ConstructionExecution";
import { EMOJI_WARSHIP_RETALIATION, } from "./NationEmojiBehavior";
export class NationWarshipBehavior {
    constructor(random, game, player, emojiBehavior) {
        this.random = random;
        this.game = game;
        this.player = player;
        this.emojiBehavior = emojiBehavior;
        // Track our transport ships we currently own
        this.trackedTransportShips = new Set();
        // Track our trade ships we currently own
        this.trackedTradeShips = new Set();
    }
    maybeSpawnWarship() {
        if (this.player === null)
            throw new Error("not initialized");
        if (!this.random.chance(50)) {
            return false;
        }
        const ports = this.player.units(UnitType.Port);
        const ships = this.player.units(UnitType.Warship);
        if (ports.length > 0 &&
            ships.length === 0 &&
            this.player.gold() > this.cost(UnitType.Warship)) {
            const port = this.random.randElement(ports);
            const targetTile = this.selectPatrolTile() ?? this.warshipSpawnTile(port.tile());
            if (targetTile === null) {
                return false;
            }
            const canBuild = this.player.canBuild(UnitType.Warship, targetTile);
            if (canBuild === false) {
                return false;
            }
            this.game.addExecution(new ConstructionExecution(this.player, UnitType.Warship, targetTile));
            return true;
        }
        return false;
    }
    selectPatrolTile() {
        const threatenedOwnPorts = this.player
            .units(UnitType.Port)
            .filter((port) => this.game.supplyState(port.tile()) !== SupplyState.Supplied)
            .sort((a, b) => this.portPriorityScore(b.tile()) - this.portPriorityScore(a.tile()));
        for (const port of threatenedOwnPorts) {
            const tile = this.portPatrolTile(port.tile());
            if (tile !== null) {
                return tile;
            }
        }
        const enemyPorts = this.game
            .players()
            .filter((player) => !this.player.isFriendly(player))
            .flatMap((player) => player.units(UnitType.Port))
            .sort((a, b) => this.portPriorityScore(b.tile()) - this.portPriorityScore(a.tile()));
        for (const port of enemyPorts) {
            const tile = this.portPatrolTile(port.tile());
            if (tile !== null) {
                return tile;
            }
        }
        return null;
    }
    warshipSpawnTile(portTile) {
        const radius = 250;
        for (let attempts = 0; attempts < 50; attempts++) {
            const randX = this.random.nextInt(this.game.x(portTile) - radius, this.game.x(portTile) + radius);
            const randY = this.random.nextInt(this.game.y(portTile) - radius, this.game.y(portTile) + radius);
            if (!this.game.isValidCoord(randX, randY)) {
                continue;
            }
            const tile = this.game.ref(randX, randY);
            // Sanity check
            if (!this.game.isOcean(tile)) {
                continue;
            }
            return tile;
        }
        return null;
    }
    portPatrolTile(portTile) {
        const candidates = [];
        for (const tile of this.game.circleSearch(portTile, 6)) {
            if (this.game.isOcean(tile)) {
                candidates.push(tile);
            }
        }
        if (candidates.length === 0) {
            return null;
        }
        return this.random.randElement(candidates);
    }
    portPriorityScore(portTile) {
        const state = this.game.supplyState(portTile);
        if (state === SupplyState.Isolated) {
            return this.game.isSupplyReserveDepleted(portTile) ? 10 : 7;
        }
        if (state === SupplyState.Strained) {
            return 4;
        }
        return 1;
    }
    trackShipsAndRetaliate() {
        this.trackTransportShipsAndRetaliate();
        this.trackTradeShipsAndRetaliate();
    }
    // Send out a warship if our transport ship got captured
    trackTransportShipsAndRetaliate() {
        // Add any currently owned transport ships to our tracking set
        this.player
            .units(UnitType.TransportShip)
            .forEach((u) => this.trackedTransportShips.add(u));
        // Iterate tracked transport ships; if it got destroyed by an enemy: retaliate
        for (const ship of Array.from(this.trackedTransportShips)) {
            if (!ship.isActive()) {
                // Distinguish between arrival/retreat and enemy destruction
                if (ship.wasDestroyedByEnemy() && ship.destroyer() !== undefined) {
                    this.maybeRetaliateWithWarship(ship.tile(), ship.destroyer(), "transport");
                }
                this.trackedTransportShips.delete(ship);
            }
        }
    }
    // Send out a warship if our trade ship got captured
    trackTradeShipsAndRetaliate() {
        // Add any currently owned trade ships to our tracking map
        this.player
            .units(UnitType.TradeShip)
            .forEach((u) => this.trackedTradeShips.add(u));
        // Iterate tracked trade ships; if we no longer own it, it was captured: retaliate
        for (const ship of Array.from(this.trackedTradeShips)) {
            if (!ship.isActive()) {
                this.trackedTradeShips.delete(ship);
                continue;
            }
            if (ship.owner().id() !== this.player.id()) {
                // Ship was ours and is now owned by someone else -> captured
                this.maybeRetaliateWithWarship(ship.tile(), ship.owner(), "trade");
                this.trackedTradeShips.delete(ship);
            }
        }
    }
    maybeRetaliateWithWarship(tile, enemy, reason) {
        // Don't retaliate against ourselves (e.g. own nuke destroyed own ship)
        if (enemy === this.player) {
            return;
        }
        // Don't send too many warships
        if (this.player.units(UnitType.Warship).length >= 10) {
            return;
        }
        const { difficulty } = this.game.config().gameConfig();
        // In Easy never retaliate. In Medium retaliate with 15% chance. Hard with 50%, Impossible with 80%.
        if ((difficulty === Difficulty.Medium && this.random.nextInt(0, 100) < 15) ||
            (difficulty === Difficulty.Hard && this.random.nextInt(0, 100) < 50) ||
            (difficulty === Difficulty.Impossible && this.random.nextInt(0, 100) < 80)) {
            const canBuild = this.player.canBuild(UnitType.Warship, tile);
            if (canBuild === false) {
                return;
            }
            this.game.addExecution(new ConstructionExecution(this.player, UnitType.Warship, tile));
            this.emojiBehavior.maybeSendEmoji(enemy, EMOJI_WARSHIP_RETALIATION);
            this.player.updateRelation(enemy, reason === "trade" ? -7.5 : -15);
        }
    }
    // Prevent warship infestations: if current player is one of the 3 richest and an enemy has too many warships, send a counter-warship.
    // What is a warship infestation? A player tries to dominate the entire ocean to block all trade and transport boats.
    counterWarshipInfestation() {
        if (!this.shouldCounterWarshipInfestation()) {
            return;
        }
        const isTeamGame = this.player.team() !== null;
        if (!this.isRichPlayer(isTeamGame)) {
            return;
        }
        const target = this.findWarshipInfestationCounterTarget(isTeamGame);
        if (target !== null) {
            this.buildCounterWarship(target);
        }
    }
    shouldCounterWarshipInfestation() {
        // Only the smart nations can do this
        const { difficulty } = this.game.config().gameConfig();
        if (difficulty !== Difficulty.Hard &&
            difficulty !== Difficulty.Impossible) {
            return false;
        }
        // Quit early if there aren't many warships in the game
        if (this.game.unitCount(UnitType.Warship) <= 10) {
            return false;
        }
        // Quit early if we can't afford a warship
        if (this.cost(UnitType.Warship) > this.player.gold()) {
            return false;
        }
        // Quit early if we don't have a port to send warships from
        if (this.player.units(UnitType.Port).length === 0) {
            return false;
        }
        // Don't send too many warships
        if (this.player.units(UnitType.Warship).length >= 10) {
            return false;
        }
        return true;
    }
    // Check if current player is one of the 3 richest (We don't want poor nations to use their precious gold on this)
    isRichPlayer(isTeamGame) {
        const players = this.game.players().filter((p) => {
            if (p.type() === PlayerType.Human)
                return false;
            return isTeamGame ? p.team() === this.player.team() : true;
        });
        const topThree = players
            .sort((a, b) => Number(b.gold() - a.gold()))
            .slice(0, 3);
        return topThree.some((p) => p.id() === this.player.id());
    }
    findWarshipInfestationCounterTarget(isTeamGame) {
        return isTeamGame
            ? this.findTeamGameWarshipTarget()
            : this.findFreeForAllWarshipTarget();
    }
    findTeamGameWarshipTarget() {
        const enemyTeamWarships = new Map();
        for (const p of this.game.players()) {
            // Skip friendly players (our team and allies)
            if (this.player.isFriendly(p) || p.id() === this.player.id()) {
                continue;
            }
            const team = p.team();
            if (team === null)
                continue;
            const teamKey = team.toString();
            const warshipCount = p.units(UnitType.Warship).length;
            if (!enemyTeamWarships.has(teamKey)) {
                enemyTeamWarships.set(teamKey, {
                    count: 0,
                    team: teamKey,
                    players: [],
                });
            }
            const teamData = enemyTeamWarships.get(teamKey);
            teamData.count += warshipCount;
            teamData.players.push(p);
        }
        // Find team with more than 15 warships
        for (const [, teamData] of enemyTeamWarships.entries()) {
            if (teamData.count > 15) {
                // Find player in that team with most warships
                const playerWithMostWarships = teamData.players.reduce((max, p) => {
                    const count = p.units(UnitType.Warship).length;
                    const maxCount = max ? max.units(UnitType.Warship).length : 0;
                    return count > maxCount ? p : max;
                }, null);
                if (playerWithMostWarships) {
                    const warships = playerWithMostWarships.units(UnitType.Warship);
                    if (warships.length > 3) {
                        return {
                            player: playerWithMostWarships,
                            warship: this.random.randElement(warships),
                        };
                    }
                }
            }
        }
        return null;
    }
    findFreeForAllWarshipTarget() {
        const enemies = this.game
            .players()
            .filter((p) => !this.player.isFriendly(p) && p.id() !== this.player.id());
        for (const enemy of enemies) {
            const enemyWarships = enemy.units(UnitType.Warship);
            if (enemyWarships.length > 10) {
                return {
                    player: enemy,
                    warship: this.random.randElement(enemyWarships),
                };
            }
        }
        return null;
    }
    buildCounterWarship(target) {
        const canBuild = this.player.canBuild(UnitType.Warship, target.warship.tile());
        if (canBuild === false) {
            return;
        }
        this.game.addExecution(new ConstructionExecution(this.player, UnitType.Warship, target.warship.tile()));
        this.emojiBehavior.sendEmoji(AllPlayers, EMOJI_WARSHIP_RETALIATION);
    }
    cost(type) {
        return this.game.unitInfo(type).cost(this.game, this.player);
    }
}
//# sourceMappingURL=NationWarshipBehavior.js.map