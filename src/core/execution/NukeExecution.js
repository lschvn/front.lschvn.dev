import { MessageType, Structures, UnitType, } from "../game/Game";
import { UniversalPathFinding } from "../pathfinding/PathFinder";
import { PathStatus } from "../pathfinding/types";
import { PseudoRandom } from "../PseudoRandom";
import { listNukeBreakAlliance } from "./Util";
const SPRITE_RADIUS = 16;
export class NukeExecution {
    constructor(nukeType, player, dst, src, speed = -1, waitTicks = 0, rocketDirectionUp = true) {
        this.nukeType = nukeType;
        this.player = player;
        this.dst = dst;
        this.src = src;
        this.speed = speed;
        this.waitTicks = waitTicks;
        this.rocketDirectionUp = rocketDirectionUp;
        this.active = true;
        this.nuke = null;
    }
    init(mg, ticks) {
        this.mg = mg;
        if (this.speed === -1) {
            this.speed = this.mg.config().defaultNukeSpeed();
        }
        this.pathFinder = UniversalPathFinding.Parabola(mg, {
            increment: this.speed,
            distanceBasedHeight: this.nukeType !== UnitType.MIRVWarhead,
            directionUp: this.rocketDirectionUp,
        });
    }
    target() {
        return this.mg.owner(this.dst);
    }
    tilesToDestroy() {
        if (this.tilesToDestroyCache !== undefined) {
            return this.tilesToDestroyCache;
        }
        if (this.nuke === null) {
            throw new Error("Not initialized");
        }
        const magnitude = this.mg.config().nukeMagnitudes(this.nuke.type());
        const rand = new PseudoRandom(this.mg.ticks());
        const inner2 = magnitude.inner * magnitude.inner;
        const outer2 = magnitude.outer * magnitude.outer;
        this.tilesToDestroyCache = this.mg.bfs(this.dst, (_, n) => {
            const d2 = this.mg?.euclideanDistSquared(this.dst, n) ?? 0;
            return d2 <= outer2 && (d2 <= inner2 || rand.chance(2));
        });
        return this.tilesToDestroyCache;
    }
    /**
     * Break alliances with players significantly affected by the nuke strike.
     * Uses weighted tile counting (inner=1, outer=0.5) OR if any allied structure would be destroyed.
     */
    maybeBreakAlliances() {
        if (this.nuke === null) {
            throw new Error("Not initialized");
        }
        if (this.nuke.type() === UnitType.MIRVWarhead) {
            // MIRV warheads shouldn't break alliances
            return;
        }
        const magnitude = this.mg.config().nukeMagnitudes(this.nuke.type());
        const playersToBreakAllianceWith = listNukeBreakAlliance({
            game: this.mg,
            targetTile: this.dst,
            magnitude,
            allySmallIds: new Set(this.player.allies().map((a) => a.smallID())),
            threshold: this.mg.config().nukeAllianceBreakThreshold(),
        });
        // Automatically reject incoming alliance requests.
        for (const incoming of this.player.incomingAllianceRequests()) {
            if (playersToBreakAllianceWith.has(incoming.requestor().smallID())) {
                incoming.reject();
            }
        }
        for (const playerSmallId of playersToBreakAllianceWith) {
            const attackedPlayer = this.mg.playerBySmallID(playerSmallId);
            if (!attackedPlayer.isPlayer()) {
                continue;
            }
            // Resolves exploit of alliance breaking in which a pending alliance request
            // was accepted in the middle of a missile attack.
            const outgoingAllianceRequest = attackedPlayer
                .incomingAllianceRequests()
                .find((ar) => ar.requestor() === this.player);
            if (outgoingAllianceRequest) {
                outgoingAllianceRequest.reject();
                continue;
            }
            const alliance = this.player.allianceWith(attackedPlayer);
            if (alliance !== null) {
                this.player.breakAlliance(alliance);
            }
            if (attackedPlayer !== this.player) {
                attackedPlayer.updateRelation(this.player, -100);
            }
        }
    }
    tick(ticks) {
        if (this.nuke === null) {
            const spawn = this.player.canBuild(this.nukeType, this.dst);
            if (spawn === false) {
                console.warn(`cannot build Nuke`);
                this.active = false;
                return;
            }
            this.src = spawn;
            this.nuke = this.player.buildUnit(this.nukeType, spawn, {
                targetTile: this.dst,
                trajectory: this.getTrajectory(this.dst),
            });
            if (this.nuke.type() !== UnitType.MIRVWarhead) {
                this.maybeBreakAlliances();
            }
            if (this.mg.hasOwner(this.dst)) {
                const target = this.mg.owner(this.dst);
                if (!target.isPlayer()) {
                    // Ignore terra nullius
                }
                else if (this.nukeType === UnitType.AtomBomb) {
                    this.mg.displayIncomingUnit(this.nuke.id(), 
                    // TODO TranslateText
                    `${this.player.name()} - atom bomb inbound`, MessageType.NUKE_INBOUND, target.id());
                }
                else if (this.nukeType === UnitType.HydrogenBomb) {
                    this.mg.displayIncomingUnit(this.nuke.id(), 
                    // TODO TranslateText
                    `${this.player.name()} - hydrogen bomb inbound`, MessageType.HYDROGEN_BOMB_INBOUND, target.id());
                }
                // Record stats
                this.mg.stats().bombLaunch(this.player, target, this.nukeType);
            }
            // after sending a nuke set the missilesilo on cooldown
            const silo = this.player
                .units(UnitType.MissileSilo)
                .find((silo) => silo.tile() === spawn);
            if (silo) {
                silo.launch();
            }
            return;
        }
        // make the nuke unactive if it was intercepted
        if (!this.nuke.isActive()) {
            console.log(`Nuke destroyed before reaching target`);
            this.active = false;
            return;
        }
        if (this.waitTicks > 0) {
            this.waitTicks--;
            return;
        }
        // Move to next tile
        const result = this.pathFinder.next(this.src, this.dst, this.speed);
        if (result.status === PathStatus.COMPLETE) {
            this.detonate();
            return;
        }
        else if (result.status === PathStatus.NEXT) {
            this.updateNukeTargetable();
            this.nuke.move(result.node);
            // Update index so SAM can interpolate future position
            this.nuke.setTrajectoryIndex(this.pathFinder.currentIndex());
        }
    }
    getNuke() {
        return this.nuke;
    }
    getTrajectory(target) {
        const trajectoryTiles = [];
        const targetRangeSquared = this.mg.config().defaultNukeTargetableRange() ** 2;
        const allTiles = this.pathFinder.findPath(this.src, target) ?? [];
        for (const tile of allTiles) {
            trajectoryTiles.push({
                tile,
                targetable: this.isTargetable(target, tile, targetRangeSquared),
            });
        }
        return trajectoryTiles;
    }
    isTargetable(targetTile, nukeTile, targetRangeSquared) {
        return (this.mg.euclideanDistSquared(nukeTile, targetTile) < targetRangeSquared ||
            (this.src !== undefined &&
                this.src !== null &&
                this.mg.euclideanDistSquared(this.src, nukeTile) < targetRangeSquared));
    }
    updateNukeTargetable() {
        if (this.nuke === null || this.nuke.targetTile() === undefined) {
            return;
        }
        const targetRangeSquared = this.mg.config().defaultNukeTargetableRange() ** 2;
        const targetTile = this.nuke.targetTile();
        this.nuke.setTargetable(this.isTargetable(targetTile, this.nuke.tile(), targetRangeSquared));
    }
    detonate() {
        if (this.nuke === null) {
            throw new Error("Not initialized");
        }
        const mg = this.mg;
        const config = mg.config();
        const magnitude = config.nukeMagnitudes(this.nuke.type());
        const toDestroy = this.tilesToDestroy();
        // Retrieve all impacted players and the number of tiles
        const tilesPerPlayers = new Map();
        for (const tile of toDestroy) {
            const owner = mg.owner(tile);
            if (owner.isPlayer()) {
                owner.relinquish(tile);
                tilesPerPlayers.set(owner, (tilesPerPlayers.get(owner) ?? 0) + 1);
            }
            if (mg.isLand(tile)) {
                mg.setFallout(tile, true);
            }
        }
        // Then compute the explosion effect on each player
        for (const [player, numImpactedTiles] of tilesPerPlayers) {
            const tilesBeforeNuke = player.numTilesOwned() + numImpactedTiles;
            const transportShips = player.units(UnitType.TransportShip);
            const outgoingAttacks = player.outgoingAttacks();
            const maxTroops = config.maxTroops(player);
            // nukeDeathFactor could compute the complete fallout in a single call instead
            for (let i = 0; i < numImpactedTiles; i++) {
                // Diminishing effect as each affected tile has been nuked
                const numTilesLeft = tilesBeforeNuke - i;
                player.removeTroops(config.nukeDeathFactor(this.nukeType, player.troops(), numTilesLeft, maxTroops));
                for (const attack of outgoingAttacks) {
                    const attackTroops = attack.troops();
                    const deaths = config.nukeDeathFactor(this.nukeType, attackTroops, numTilesLeft, maxTroops);
                    attack.setTroops(attackTroops - deaths);
                }
                for (const unit of transportShips) {
                    const unitTroops = unit.troops();
                    const deaths = config.nukeDeathFactor(this.nukeType, unitTroops, numTilesLeft, maxTroops);
                    unit.setTroops(unitTroops - deaths);
                }
            }
        }
        const outer2 = magnitude.outer * magnitude.outer;
        const dst = this.dst;
        const destroyer = this.player;
        for (const unit of mg.units()) {
            const type = unit.type();
            if (type === UnitType.AtomBomb ||
                type === UnitType.HydrogenBomb ||
                type === UnitType.MIRVWarhead ||
                type === UnitType.MIRV ||
                type === UnitType.SAMMissile) {
                continue;
            }
            if (mg.euclideanDistSquared(dst, unit.tile()) < outer2) {
                unit.delete(true, destroyer);
            }
        }
        this.redrawBuildings(magnitude.outer + SPRITE_RADIUS);
        this.active = false;
        this.nuke.setReachedTarget();
        this.nuke.delete(false);
        // Record stats
        this.mg
            .stats()
            .bombLand(this.player, this.target(), this.nuke.type());
    }
    redrawBuildings(range) {
        const rangeSquared = range * range;
        for (const unit of this.mg.units()) {
            if (Structures.has(unit.type())) {
                if (this.mg.euclideanDistSquared(this.dst, unit.tile()) < rangeSquared) {
                    unit.touch();
                }
            }
        }
    }
    owner() {
        return this.player;
    }
    isActive() {
        return this.active;
    }
    activeDuringSpawnPhase() {
        return false;
    }
}
//# sourceMappingURL=NukeExecution.js.map