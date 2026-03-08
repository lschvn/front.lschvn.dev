import { UnitType } from "../game/Game";
export class BoatRetreatExecution {
    constructor(player, unitID) {
        this.player = player;
        this.unitID = unitID;
        this.active = true;
    }
    init(mg, ticks) { }
    tick(ticks) {
        const unit = this.player
            .units()
            .find((unit) => unit.id() === this.unitID && unit.type() === UnitType.TransportShip);
        if (!unit) {
            console.warn(`Didn't find outgoing boat with id ${this.unitID}`);
            this.active = false;
            return;
        }
        unit.orderBoatRetreat();
        this.active = false;
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
//# sourceMappingURL=BoatRetreatExecution.js.map