import { MessageType, UnitType, } from "../game/Game";
import { UniversalPathFinding } from "../pathfinding/PathFinder";
import { PathStatus } from "../pathfinding/types";
import { PseudoRandom } from "../PseudoRandom";
import { simpleHash } from "../Util";
import { NukeExecution } from "./NukeExecution";
export class MirvExecution {
    constructor(player, dst) {
        this.player = player;
        this.dst = dst;
        this.active = true;
        this.nuke = null;
        this.range = 1500;
        this.rangeSquared = this.range * this.range;
        this.minimumSpread = 55;
        this.warheadCount = 350;
        this.speed = -1;
    }
    init(mg, ticks) {
        this.random = new PseudoRandom(mg.ticks() + simpleHash(this.player.id()));
        this.mg = mg;
        this.targetPlayer = this.mg.owner(this.dst);
        this.speed = this.mg.config().defaultNukeSpeed();
        this.pathFinder = UniversalPathFinding.Parabola(mg, {
            increment: this.speed,
        });
        // Betrayal on launch
        if (this.targetPlayer.isPlayer()) {
            const alliance = this.player.allianceWith(this.targetPlayer);
            if (alliance !== null) {
                this.player.breakAlliance(alliance);
            }
            if (this.targetPlayer !== this.player) {
                this.targetPlayer.updateRelation(this.player, -100);
                this.player.updateRelation(this.targetPlayer, -100);
            }
        }
    }
    tick(ticks) {
        if (this.nuke === null) {
            const spawn = this.player.canBuild(UnitType.MIRV, this.dst);
            if (spawn === false) {
                console.warn(`cannot build MIRV`);
                this.active = false;
                return;
            }
            this.spawnTile = spawn;
            this.nuke = this.player.buildUnit(UnitType.MIRV, spawn, {
                targetTile: this.dst,
            });
            this.mg.stats().bombLaunch(this.player, this.targetPlayer, UnitType.MIRV);
            const x = Math.floor((this.mg.x(this.dst) + this.mg.x(this.mg.x(this.nuke.tile()))) / 2);
            const y = Math.max(0, this.mg.y(this.dst) - 500) + 50;
            this.separateDst = this.mg.ref(x, y);
            this.mg.displayIncomingUnit(this.nuke.id(), 
            // TODO TranslateText
            `⚠️⚠️⚠️ ${this.player.name()} - MIRV INBOUND ⚠️⚠️⚠️`, MessageType.MIRV_INBOUND, this.targetPlayer.id());
        }
        const result = this.pathFinder.next(this.spawnTile, this.separateDst, this.speed);
        if (result.status === PathStatus.COMPLETE) {
            this.separate();
            this.active = false;
            // Record stats
            this.mg.stats().bombLand(this.player, this.targetPlayer, UnitType.MIRV);
            return;
        }
        else if (result.status === PathStatus.NEXT) {
            this.nuke.move(result.node);
        }
    }
    separate() {
        if (this.nuke === null) {
            throw new Error("uninitialized");
        }
        this.baseX = this.mg.x(this.dst);
        this.baseY = this.mg.y(this.dst);
        const destinations = this.selectDestinations();
        for (const [i, dst] of destinations.entries()) {
            this.mg.addExecution(new NukeExecution(UnitType.MIRVWarhead, this.player, dst, this.nuke.tile(), 15 + Math.floor((i / this.warheadCount) * 5), 
            //   this.random.nextInt(5, 9),
            this.random.nextInt(0, 15)));
        }
        this.nuke.delete(false);
    }
    selectDestinations() {
        const targets = [this.dst];
        for (let attempt = 0; attempt < 1000; attempt++) {
            const target = this.tryGenerateTarget(targets);
            if (target)
                targets.push(target);
            if (targets.length >= this.warheadCount)
                break;
        }
        return targets.sort((a, b) => this.mg.manhattanDist(b, this.dst) - this.mg.manhattanDist(a, this.dst));
    }
    tryGenerateTarget(taken) {
        for (let attempt = 0; attempt < 100; attempt++) {
            const r1 = this.random.next();
            const r2 = (r1 * 15485863) % 1;
            const x = Math.round(r1 * this.range * 2 - this.range + this.baseX);
            const y = Math.round(r2 * this.range * 2 - this.range + this.baseY);
            if (!this.mg.isValidCoord(x, y)) {
                continue;
            }
            const tile = this.mg.ref(x, y);
            if (!this.mg.isLand(tile)) {
                continue;
            }
            if ((x - this.baseX) ** 2 + (y - this.baseY) ** 2 > this.rangeSquared) {
                continue;
            }
            if (this.mg.owner(tile) !== this.targetPlayer) {
                continue;
            }
            if (this.isOverlapping(x, y, taken)) {
                continue;
            }
            return tile;
        }
    }
    isOverlapping(x, y, taken) {
        for (const existingTile of taken) {
            const existingTileX = this.mg.x(existingTile);
            const existingTileY = this.mg.y(existingTile);
            const manhattanDistance = Math.abs(x - existingTileX) + Math.abs(y - existingTileY);
            if (manhattanDistance < this.minimumSpread) {
                return true;
            }
        }
        return false;
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
//# sourceMappingURL=MIRVExecution.js.map