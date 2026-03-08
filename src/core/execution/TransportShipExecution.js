import { renderTroops } from "../../client/Utils";
import { MessageType, UnitType, } from "../game/Game";
import { targetTransportTile } from "../game/TransportShipUtils";
import { PathFinding } from "../pathfinding/PathFinder";
import { PathStatus } from "../pathfinding/types";
import { DEFAULT_ATTACK_MODE } from "../configuration/AttackModeBalance";
import { AttackExecution } from "./AttackExecution";
const malusForRetreat = 25;
export class TransportShipExecution {
    constructor(attacker, ref, troops, mode = DEFAULT_ATTACK_MODE) {
        this.attacker = attacker;
        this.ref = ref;
        this.troops = troops;
        this.mode = mode;
        this.active = true;
        // TODO: make this configurable
        this.ticksPerMove = 1;
        this.retreatDst = null;
        this.motionPlanId = 1;
        this.motionPlanDst = null;
        this.originalOwner = this.attacker;
    }
    activeDuringSpawnPhase() {
        return false;
    }
    init(mg, ticks) {
        if (!mg.isValidRef(this.ref)) {
            console.warn(`TransportShipExecution: ref ${this.ref} not valid`);
            this.active = false;
            return;
        }
        this.lastMove = ticks;
        this.mg = mg;
        this.target = mg.owner(this.ref);
        this.pathFinder = PathFinding.Water(mg);
        if (this.attacker.unitCount(UnitType.TransportShip) >=
            mg.config().boatMaxNumber()) {
            mg.displayMessage("events_display.no_boats_available", MessageType.ATTACK_FAILED, this.attacker.id(), undefined, { max: mg.config().boatMaxNumber() });
            this.active = false;
            return;
        }
        if (this.target.isPlayer() && !this.attacker.canAttackPlayer(this.target)) {
            this.active = false;
            return;
        }
        this.troops ?? (this.troops = this.mg
            .config()
            .boatAttackAmount(this.attacker, this.target));
        this.troops = Math.min(this.troops, this.attacker.troops());
        this.dst = targetTransportTile(this.mg, this.ref);
        if (this.dst === null) {
            console.warn(`${this.attacker} cannot send ship to ${this.target}, cannot find target tile`);
            this.active = false;
            return;
        }
        const src = this.attacker.canBuild(UnitType.TransportShip, this.dst);
        if (src === false) {
            console.warn(`${this.attacker} cannot send ship to ${this.target}, cannot find start tile`);
            this.active = false;
            return;
        }
        this.src = src;
        this.boat = this.attacker.buildUnit(UnitType.TransportShip, this.src, {
            troops: this.troops,
            targetTile: this.dst,
        });
        const fullPath = this.pathFinder.findPath(this.src, this.dst) ?? [this.src];
        if (fullPath.length === 0 || fullPath[0] !== this.src) {
            fullPath.unshift(this.src);
        }
        const motionPlan = {
            kind: "grid",
            unitId: this.boat.id(),
            planId: this.motionPlanId,
            startTick: ticks + this.ticksPerMove,
            ticksPerStep: this.ticksPerMove,
            path: fullPath,
        };
        this.mg.recordMotionPlan(motionPlan);
        this.motionPlanDst = this.dst;
        // Notify the target player about the incoming naval invasion
        if (this.target.id() !== mg.terraNullius().id()) {
            mg.displayIncomingUnit(this.boat.id(), 
            // TODO TranslateText
            `Naval invasion incoming from ${this.attacker.displayName()} (${renderTroops(this.boat.troops())})`, MessageType.NAVAL_INVASION_INBOUND, this.target.id());
        }
        // Record stats
        this.mg
            .stats()
            .boatSendTroops(this.attacker, this.target, this.boat.troops());
    }
    tick(ticks) {
        if (this.dst === null) {
            this.active = false;
            return;
        }
        if (!this.active) {
            return;
        }
        if (!this.boat.isActive()) {
            this.active = false;
            return;
        }
        if (ticks - this.lastMove < this.ticksPerMove) {
            return;
        }
        this.lastMove = ticks;
        // Team mate can conquer disconnected player and get their ships
        // captureUnit has changed the owner of the unit, now update attacker
        const boatOwner = this.boat.owner();
        if (this.originalOwner.isDisconnected() &&
            boatOwner !== this.originalOwner &&
            boatOwner.isOnSameTeam(this.originalOwner)) {
            this.attacker = boatOwner;
            this.originalOwner = boatOwner; // for when this owner disconnects too
        }
        if (this.boat.retreating()) {
            // Resolve retreat destination once, based on current boat location when retreat begins.
            this.retreatDst ?? (this.retreatDst = this.attacker.bestTransportShipSpawn(this.boat.tile()));
            if (this.retreatDst === false) {
                console.warn(`TransportShipExecution: retreating but no retreat destination found`);
                this.attacker.addTroops(this.boat.troops());
                this.boat.delete(false);
                this.active = false;
                return;
            }
            else {
                this.dst = this.retreatDst;
                if (this.boat.targetTile() !== this.dst) {
                    this.boat.setTargetTile(this.dst);
                }
            }
        }
        const result = this.pathFinder.next(this.boat.tile(), this.dst);
        switch (result.status) {
            case PathStatus.COMPLETE:
                if (this.mg.owner(this.dst) === this.attacker) {
                    const deaths = this.boat.troops() * (malusForRetreat / 100);
                    const survivors = this.boat.troops() - deaths;
                    this.attacker.addTroops(survivors);
                    this.boat.delete(false);
                    this.active = false;
                    // Record stats
                    this.mg
                        .stats()
                        .boatArriveTroops(this.attacker, this.target, survivors);
                    if (deaths) {
                        this.mg.displayMessage("events_display.attack_cancelled_retreat", MessageType.ATTACK_CANCELLED, this.attacker.id(), undefined, { troops: renderTroops(deaths) });
                    }
                    return;
                }
                this.attacker.conquer(this.dst);
                if (this.target.isPlayer() && this.attacker.isFriendly(this.target)) {
                    this.attacker.addTroops(this.boat.troops());
                }
                else {
                    this.mg.addExecution(new AttackExecution(this.boat.troops(), this.attacker, this.target.id(), this.dst, false, this.mode));
                }
                this.boat.delete(false);
                this.active = false;
                // Record stats
                this.mg
                    .stats()
                    .boatArriveTroops(this.attacker, this.target, this.boat.troops());
                return;
            case PathStatus.NEXT:
                this.boat.move(result.node);
                break;
            case PathStatus.NOT_FOUND: {
                // TODO: add to poisoned port list
                const map = this.mg.map();
                const boatTile = this.boat.tile();
                console.warn(`TransportShip path not found: boat@(${map.x(boatTile)},${map.y(boatTile)}) -> dst@(${map.x(this.dst)},${map.y(this.dst)}), attacker=${this.attacker.id()}, target=${this.target.id()}`);
                this.attacker.addTroops(this.boat.troops());
                this.boat.delete(false);
                this.active = false;
                return;
            }
        }
        if (this.dst !== null && this.dst !== this.motionPlanDst) {
            this.motionPlanId++;
            const fullPath = this.pathFinder.findPath(this.boat.tile(), this.dst) ?? [
                this.boat.tile(),
            ];
            if (fullPath.length === 0 || fullPath[0] !== this.boat.tile()) {
                fullPath.unshift(this.boat.tile());
            }
            this.mg.recordMotionPlan({
                kind: "grid",
                unitId: this.boat.id(),
                planId: this.motionPlanId,
                startTick: ticks + this.ticksPerMove,
                ticksPerStep: this.ticksPerMove,
                path: fullPath,
            });
            this.motionPlanDst = this.dst;
        }
    }
    owner() {
        return this.attacker;
    }
    isActive() {
        return this.active;
    }
}
//# sourceMappingURL=TransportShipExecution.js.map