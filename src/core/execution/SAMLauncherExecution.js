import { isUnit, MessageType, UnitType, } from "../game/Game";
import { PseudoRandom } from "../PseudoRandom";
import { SAMMissileExecution } from "./SAMMissileExecution";
/**
 * Smart SAM targeting system preshoting nukes so its range is strictly enforced
 */
class SAMTargetingSystem {
    constructor(mg, sam) {
        this.mg = mg;
        this.sam = sam;
        // Interception tiles are computed a single time, but it may not be reachable yet.
        // Store the result so it can be intercepted at the proper time, rather than recomputing each tick.
        // Null interception tile means there are no interception tiles in range. Store it to avoid recomputing.
        this.precomputedNukes = new Map();
        this.missileSpeed = this.mg.config().defaultSamMissileSpeed();
    }
    updateUnreachableNukes(nearbyUnits) {
        if (this.precomputedNukes.size === 0) {
            return;
        }
        // Avoid per-tick allocations for the common case where only a few nukes are tracked.
        if (this.precomputedNukes.size <= 16) {
            for (const nukeId of this.precomputedNukes.keys()) {
                let found = false;
                for (const u of nearbyUnits) {
                    if (u.unit.id() === nukeId) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    this.precomputedNukes.delete(nukeId);
                }
            }
            return;
        }
        const nearbyUnitSet = new Set();
        for (const u of nearbyUnits) {
            nearbyUnitSet.add(u.unit.id());
        }
        for (const nukeId of this.precomputedNukes.keys()) {
            if (!nearbyUnitSet.has(nukeId)) {
                this.precomputedNukes.delete(nukeId);
            }
        }
    }
    tickToReach(currentTile, tile) {
        return Math.ceil(this.mg.manhattanDist(currentTile, tile) / this.missileSpeed);
    }
    computeInterceptionTile(unit, samTile, rangeSquared) {
        const trajectory = unit.trajectory();
        const currentIndex = unit.trajectoryIndex();
        const explosionTick = trajectory.length - currentIndex;
        for (let i = currentIndex; i < trajectory.length; i++) {
            const trajectoryTile = trajectory[i];
            if (trajectoryTile.targetable &&
                this.mg.euclideanDistSquared(samTile, trajectoryTile.tile) <=
                    rangeSquared) {
                const nukeTickToReach = i - currentIndex;
                const samTickToReach = this.tickToReach(samTile, trajectoryTile.tile);
                const tickBeforeShooting = nukeTickToReach - samTickToReach;
                if (samTickToReach < explosionTick && tickBeforeShooting >= 0) {
                    return { tick: tickBeforeShooting, tile: trajectoryTile.tile };
                }
            }
        }
        return undefined;
    }
    getSingleTarget(ticks) {
        const samTile = this.sam.tile();
        const range = this.mg.config().samRange(this.sam.level());
        const rangeSquared = range * range;
        // Look beyond the SAM range so it can preshot nukes
        const detectionRange = this.mg.config().maxSamRange() * 2;
        const nukes = this.mg.nearbyUnits(samTile, detectionRange, [UnitType.AtomBomb, UnitType.HydrogenBomb], ({ unit }) => {
            return (isUnit(unit) &&
                unit.owner() !== this.sam.owner() &&
                !this.sam.owner().isFriendly(unit.owner()) &&
                !unit.targetedBySAM());
        });
        // Clear unreachable nukes that went out of range
        this.updateUnreachableNukes(nukes);
        let best = null;
        for (const nuke of nukes) {
            const nukeId = nuke.unit.id();
            const cached = this.precomputedNukes.get(nukeId);
            if (cached !== undefined) {
                if (cached === null) {
                    // Already computed as unreachable, skip
                    continue;
                }
                if (cached.tick === ticks) {
                    // Time to shoot!
                    const target = { tile: cached.tile, unit: nuke.unit };
                    if (best === null ||
                        (target.unit.type() === UnitType.HydrogenBomb &&
                            best.unit.type() !== UnitType.HydrogenBomb)) {
                        best = target;
                    }
                    this.precomputedNukes.delete(nukeId);
                    continue;
                }
                if (cached.tick > ticks) {
                    // Not due yet, skip for now.
                    continue;
                }
                // Missed the planned tick (e.g was on cooldown), recompute a new interception tile if possible
                this.precomputedNukes.delete(nukeId);
            }
            const interceptionTile = this.computeInterceptionTile(nuke.unit, samTile, rangeSquared);
            if (interceptionTile !== undefined) {
                if (interceptionTile.tick <= 1) {
                    // Shoot instantly
                    const target = { unit: nuke.unit, tile: interceptionTile.tile };
                    if (best === null ||
                        (target.unit.type() === UnitType.HydrogenBomb &&
                            best.unit.type() !== UnitType.HydrogenBomb)) {
                        best = target;
                    }
                }
                else {
                    // Nuke will be reachable but not yet. Store the result.
                    this.precomputedNukes.set(nukeId, {
                        tick: interceptionTile.tick + ticks,
                        tile: interceptionTile.tile,
                    });
                }
            }
            else {
                // Store unreachable nukes in order to prevent useless interception computation
                this.precomputedNukes.set(nukeId, null);
            }
        }
        return best;
    }
}
export class SAMLauncherExecution {
    constructor(player, tile, sam = null) {
        this.player = player;
        this.tile = tile;
        this.sam = sam;
        this.active = true;
        // As MIRV go very fast we have to detect them very early but we only
        // shoot the one targeting very close (MIRVWarheadProtectionRadius)
        this.MIRVWarheadSearchRadius = 400;
        this.MIRVWarheadProtectionRadius = 50;
        if (sam !== null) {
            this.tile = sam.tile();
        }
    }
    init(mg, ticks) {
        this.mg = mg;
    }
    tick(ticks) {
        if (this.mg === null || this.player === null) {
            throw new Error("Not initialized");
        }
        if (this.sam === null) {
            if (this.tile === null) {
                throw new Error("tile is null");
            }
            const spawnTile = this.player.canBuild(UnitType.SAMLauncher, this.tile);
            if (spawnTile === false) {
                console.warn("cannot build SAM Launcher");
                this.active = false;
                return;
            }
            this.sam = this.player.buildUnit(UnitType.SAMLauncher, spawnTile, {});
        }
        this.targetingSystem ?? (this.targetingSystem = new SAMTargetingSystem(this.mg, this.sam));
        if (this.sam.isUnderConstruction()) {
            return;
        }
        if (this.sam.isInCooldown()) {
            const frontTime = this.sam.missileTimerQueue()[0];
            if (frontTime === undefined) {
                return;
            }
            const cooldown = this.mg.config().SAMCooldown() - (this.mg.ticks() - frontTime);
            if (cooldown <= 0) {
                this.sam.reloadMissile();
            }
            return;
        }
        if (!this.sam.isActive()) {
            this.active = false;
            return;
        }
        if (this.player !== this.sam.owner()) {
            this.player = this.sam.owner();
        }
        this.pseudoRandom ?? (this.pseudoRandom = new PseudoRandom(this.sam.id()));
        const mirvWarheadTargets = this.mg.nearbyUnits(this.sam.tile(), this.MIRVWarheadSearchRadius, UnitType.MIRVWarhead, ({ unit }) => {
            if (!isUnit(unit))
                return false;
            if (unit.owner() === this.player)
                return false;
            if (this.player.isFriendly(unit.owner()))
                return false;
            const dst = unit.targetTile();
            return (this.sam !== null &&
                dst !== undefined &&
                this.mg.manhattanDist(dst, this.sam.tile()) <
                    this.MIRVWarheadProtectionRadius);
        });
        let target = null;
        if (mirvWarheadTargets.length === 0) {
            target = this.targetingSystem.getSingleTarget(ticks);
            if (target !== null) {
                console.log("Target acquired");
            }
        }
        // target is already filtered to exclude nukes targeted by other SAMs
        if (target || mirvWarheadTargets.length > 0) {
            this.sam.launch();
            const type = mirvWarheadTargets.length > 0
                ? UnitType.MIRVWarhead
                : target?.unit.type();
            if (type === undefined)
                throw new Error("Unknown unit type");
            if (mirvWarheadTargets.length > 0) {
                const samOwner = this.sam.owner();
                // Message
                this.mg.displayMessage("events_display.mirv_warheads_intercepted", MessageType.SAM_HIT, samOwner.id(), undefined, { count: mirvWarheadTargets.length });
                mirvWarheadTargets.forEach(({ unit: u }) => {
                    // Delete warheads
                    u.delete();
                });
                // Record stats
                this.mg
                    .stats()
                    .bombIntercept(samOwner, UnitType.MIRVWarhead, mirvWarheadTargets.length);
            }
            else if (target !== null) {
                target.unit.setTargetedBySAM(true);
                this.mg.addExecution(new SAMMissileExecution(this.sam.tile(), this.sam.owner(), this.sam, target.unit, target.tile));
            }
            else {
                throw new Error("target is null");
            }
        }
    }
    isActive() {
        return this.active;
    }
    activeDuringSpawnPhase() {
        return false;
    }
}
//# sourceMappingURL=SAMLauncherExecution.js.map