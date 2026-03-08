import { UnitType } from "../game/Game";
export class MoveWarshipExecution {
    constructor(owner, unitId, position) {
        this.owner = owner;
        this.unitId = unitId;
        this.position = position;
    }
    init(mg, ticks) {
        if (!mg.isValidRef(this.position)) {
            console.warn(`MoveWarshipExecution: position ${this.position} not valid`);
            return;
        }
        const navalUnit = this.owner
            .units(UnitType.Warship, UnitType.Submarine)
            .find((u) => u.id() === this.unitId);
        if (!navalUnit) {
            console.warn("MoveWarshipExecution: naval unit not found");
            return;
        }
        if (!navalUnit.isActive()) {
            console.warn("MoveWarshipExecution: naval unit is not active");
            return;
        }
        navalUnit.setPatrolTile(this.position);
        navalUnit.setTargetTile(undefined);
    }
    tick(ticks) { }
    isActive() {
        return false;
    }
    activeDuringSpawnPhase() {
        return false;
    }
}
//# sourceMappingURL=MoveWarshipExecution.js.map