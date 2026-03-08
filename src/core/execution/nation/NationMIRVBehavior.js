import { AllPlayers, Difficulty, PlayerType, UnitType, } from "../../game/Game";
import { assertNever } from "../../Util";
import { MirvExecution } from "../MIRVExecution";
import { calculateTerritoryCenter } from "../Util";
import { EMOJI_NUKE, respondToMIRV, } from "./NationEmojiBehavior";
// 30 seconds at 10 ticks/second
const MIRV_COOLDOWN_TICKS = 300;
export class NationMIRVBehavior {
    constructor(random, game, player, emojiBehavior) {
        this.random = random;
        this.game = game;
        this.player = player;
        this.emojiBehavior = emojiBehavior;
    }
    get hesitationOdds() {
        const { difficulty } = this.game.config().gameConfig();
        switch (difficulty) {
            case Difficulty.Easy:
                return 2; // More likely to hesitate
            case Difficulty.Medium:
                return 4;
            case Difficulty.Hard:
                return 8;
            case Difficulty.Impossible:
                return 16; // Rarely hesitates
            default:
                assertNever(difficulty);
        }
    }
    get victoryDenialTeamThreshold() {
        const { difficulty } = this.game.config().gameConfig();
        switch (difficulty) {
            case Difficulty.Easy:
                return 0.9; // Only react right before the game ends (95%)
            case Difficulty.Medium:
                return 0.8;
            case Difficulty.Hard:
                return 0.7;
            case Difficulty.Impossible:
                return 0.6; // Reacts early
            default:
                assertNever(difficulty);
        }
    }
    get victoryDenialIndividualThreshold() {
        const { difficulty } = this.game.config().gameConfig();
        switch (difficulty) {
            case Difficulty.Easy:
                return 0.75; // Only react right before the game ends (80%)
            case Difficulty.Medium:
                return 0.65;
            case Difficulty.Hard:
                return 0.55;
            case Difficulty.Impossible:
                return 0.4; // Reacts early
            default:
                assertNever(difficulty);
        }
    }
    get steamrollCityGapMultiplier() {
        const { difficulty } = this.game.config().gameConfig();
        switch (difficulty) {
            case Difficulty.Easy:
                return 1.5; // Needs larger gap to trigger
            case Difficulty.Medium:
                return 1.3;
            case Difficulty.Hard:
                return 1.2;
            case Difficulty.Impossible:
                return 1.15; // Reacts to smaller gaps
            default:
                assertNever(difficulty);
        }
    }
    get steamrollMinLeaderCities() {
        const { difficulty } = this.game.config().gameConfig();
        switch (difficulty) {
            case Difficulty.Easy:
                return 15; // Needs more cities to trigger
            case Difficulty.Medium:
            case Difficulty.Hard:
                return 10;
            case Difficulty.Impossible:
                return 8; // Reacts early
            default:
                assertNever(difficulty);
        }
    }
    considerMIRV() {
        if (this.player === null)
            throw new Error("not initialized");
        if (this.player.units(UnitType.MissileSilo).length === 0) {
            return false;
        }
        if (this.player.gold() < this.cost(UnitType.MIRV)) {
            return false;
        }
        if (this.random.chance(this.hesitationOdds)) {
            return false;
        }
        const inboundMIRVSender = this.selectCounterMirvTarget();
        if (inboundMIRVSender && !this.wasRecentlyMirved(inboundMIRVSender)) {
            this.maybeSendMIRV(inboundMIRVSender);
            return true;
        }
        const victoryDenialTarget = this.selectVictoryDenialTarget();
        if (victoryDenialTarget && !this.wasRecentlyMirved(victoryDenialTarget)) {
            this.maybeSendMIRV(victoryDenialTarget);
            return true;
        }
        const steamrollStopTarget = this.selectSteamrollStopTarget();
        if (steamrollStopTarget && !this.wasRecentlyMirved(steamrollStopTarget)) {
            this.maybeSendMIRV(steamrollStopTarget);
            return true;
        }
        return false;
    }
    // MIRV Strategy Methods
    selectCounterMirvTarget() {
        if (this.player === null)
            throw new Error("not initialized");
        const attackers = this.getValidMirvTargetPlayers().filter((p) => this.isInboundMIRVFrom(p));
        if (attackers.length === 0)
            return null;
        attackers.sort((a, b) => b.numTilesOwned() - a.numTilesOwned());
        return attackers[0];
    }
    selectVictoryDenialTarget() {
        if (this.player === null)
            throw new Error("not initialized");
        const totalLand = this.game.numLandTiles();
        if (totalLand === 0)
            return null;
        let best = null;
        for (const p of this.getValidMirvTargetPlayers()) {
            let severity = 0;
            const team = p.team();
            if (team !== null) {
                const teamMembers = this.game
                    .players()
                    .filter((x) => x.team() === team && x.isPlayer());
                const teamTerritory = teamMembers
                    .map((x) => x.numTilesOwned())
                    .reduce((a, b) => a + b, 0);
                const teamShare = teamTerritory / totalLand;
                if (teamShare >= this.victoryDenialTeamThreshold) {
                    // Only consider the largest team member as the target when team exceeds threshold
                    let largestMember = null;
                    let largestTiles = -1;
                    for (const member of teamMembers) {
                        const tiles = member.numTilesOwned();
                        if (tiles > largestTiles) {
                            largestTiles = tiles;
                            largestMember = member;
                        }
                    }
                    if (largestMember === p) {
                        severity = teamShare;
                    }
                    else {
                        severity = 0; // Skip non-largest members
                    }
                }
            }
            else {
                const share = p.numTilesOwned() / totalLand;
                if (share >= this.victoryDenialIndividualThreshold)
                    severity = share;
            }
            if (severity > 0) {
                if (best === null || severity > best.severity)
                    best = { p, severity };
            }
        }
        return best ? best.p : null;
    }
    selectSteamrollStopTarget() {
        if (this.player === null)
            throw new Error("not initialized");
        const validTargets = this.getValidMirvTargetPlayers();
        if (validTargets.length === 0)
            return null;
        const allPlayers = this.game
            .players()
            .filter((p) => p.isPlayer())
            .map((p) => ({ p, cityCount: this.countCities(p) }))
            .sort((a, b) => b.cityCount - a.cityCount);
        if (allPlayers.length < 2)
            return null;
        const topPlayer = allPlayers[0];
        if (topPlayer.cityCount <= this.steamrollMinLeaderCities)
            return null;
        const secondHighest = allPlayers[1].cityCount;
        const threshold = secondHighest * this.steamrollCityGapMultiplier;
        if (topPlayer.cityCount >= threshold) {
            return validTargets.some((p) => p === topPlayer.p) ? topPlayer.p : null;
        }
        return null;
    }
    // MIRV Cooldown Methods
    wasRecentlyMirved(target) {
        const lastTick = NationMIRVBehavior.recentMirvTargets.get(target.id());
        if (lastTick === undefined)
            return false;
        return this.game.ticks() - lastTick < MIRV_COOLDOWN_TICKS;
    }
    recordMirvHit(target) {
        NationMIRVBehavior.recentMirvTargets.set(target.id(), this.game.ticks());
    }
    // MIRV Helper Methods
    getValidMirvTargetPlayers() {
        if (this.player === null)
            throw new Error("not initialized");
        return this.game.players().filter((p) => {
            return (p !== this.player &&
                p.isPlayer() &&
                p.type() !== PlayerType.Bot &&
                !this.player.isOnSameTeam(p));
        });
    }
    isInboundMIRVFrom(attacker) {
        if (this.player === null)
            throw new Error("not initialized");
        const enemyMirvs = attacker.units(UnitType.MIRV);
        for (const mirv of enemyMirvs) {
            const dst = mirv.targetTile();
            if (!dst)
                continue;
            if (!this.game.hasOwner(dst))
                continue;
            const owner = this.game.owner(dst);
            if (owner === this.player) {
                return true;
            }
        }
        return false;
    }
    // MIRV Execution Methods
    maybeSendMIRV(enemy) {
        if (this.player === null)
            throw new Error("not initialized");
        this.emojiBehavior.maybeSendAttackEmoji(enemy);
        const centerTile = this.calculateTerritoryCenter(enemy);
        if (centerTile && this.player.canBuild(UnitType.MIRV, centerTile)) {
            this.game.addExecution(new MirvExecution(this.player, centerTile));
            this.recordMirvHit(enemy);
            this.emojiBehavior.sendEmoji(AllPlayers, EMOJI_NUKE);
            respondToMIRV(this.game, this.random, enemy);
        }
    }
    countCities(p) {
        return p.unitCount(UnitType.City);
    }
    calculateTerritoryCenter(target) {
        return calculateTerritoryCenter(this.game, target);
    }
    cost(type) {
        if (this.player === null)
            throw new Error("not initialized");
        return this.game.unitInfo(type).cost(this.game, this.player);
    }
}
// Shared across all NationMIRVBehavior instances.
// Tracks the last tick a MIRV was sent at each player, so multiple nations don't pile-on the same target.
// Especially important for games with very high starting gold settings.
NationMIRVBehavior.recentMirvTargets = new Map();
//# sourceMappingURL=NationMIRVBehavior.js.map