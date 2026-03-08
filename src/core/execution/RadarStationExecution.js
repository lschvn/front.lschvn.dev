import { AIR_DEFENSE_HIGH_VALUE_TARGETS, AIR_DEFENSE_PRIORITY_STRUCTURE_RADIUS, AIR_DEFENSE_STRIKE_MISSIONS, RADAR_DETECTION_MESSAGE_COOLDOWN, } from "../configuration/AntiAirBalance";
import { AirMissionPhase, AirMissionType, AirUnits, MessageType, UnitType, } from "../game/Game";
export class RadarStationExecution {
    constructor(radar) {
        this.radar = radar;
        this.active = true;
        this.lastWarnedAt = new Map();
    }
    init(mg) {
        this.mg = mg;
    }
    tick(ticks) {
        if (!this.radar.isActive()) {
            this.active = false;
            return;
        }
        if (this.radar.isUnderConstruction()) {
            return;
        }
        const threats = this.mg.nearbyUnits(this.radar.tile(), this.mg.config().radarStationRange(), AirUnits.types, ({ unit }) => unit.owner() !== this.radar.owner() &&
            !this.radar.owner().isFriendly(unit.owner()) &&
            unit.isActive() &&
            !unit.isUnderConstruction() &&
            !unit.isMarkedForDeletion() &&
            this.isAirborne(unit), true);
        threats.sort((a, b) => this.priority(a.unit) - this.priority(b.unit));
        for (const { unit } of threats) {
            if (!this.threatensHighValueStructure(unit) &&
                unit.type() !== UnitType.BomberSquadron) {
                continue;
            }
            const lastWarn = this.lastWarnedAt.get(unit.id()) ?? -Infinity;
            if (ticks - lastWarn < RADAR_DETECTION_MESSAGE_COOLDOWN) {
                continue;
            }
            this.lastWarnedAt.set(unit.id(), ticks);
            this.mg.displayIncomingUnit(unit.id(), unit.type() === UnitType.BomberSquadron
                ? "events_display.radar_contact_bomber"
                : "events_display.radar_contact_fighter", MessageType.NAVAL_INVASION_INBOUND, this.radar.owner().id());
            break;
        }
    }
    isActive() {
        return this.active;
    }
    activeDuringSpawnPhase() {
        return false;
    }
    priority(unit) {
        const missionType = unit.airMissionType();
        if (unit.type() === UnitType.BomberSquadron &&
            missionType !== undefined &&
            AIR_DEFENSE_STRIKE_MISSIONS.includes(missionType)) {
            return 0;
        }
        if (unit.type() === UnitType.FighterSquadron &&
            (missionType === AirMissionType.InterceptEnemyAircraft ||
                missionType === AirMissionType.PatrolArea)) {
            return 1;
        }
        if (unit.type() === UnitType.BomberSquadron) {
            return 2;
        }
        return 3;
    }
    threatensHighValueStructure(unit) {
        return this.mg.anyUnitNearby(unit.tile(), AIR_DEFENSE_PRIORITY_STRUCTURE_RADIUS, AIR_DEFENSE_HIGH_VALUE_TARGETS, (structure) => structure.owner() === this.radar.owner() &&
            structure.isActive() &&
            !structure.isUnderConstruction() &&
            !structure.isMarkedForDeletion(), undefined, true);
    }
    isAirborne(unit) {
        const phase = unit.airMissionPhase();
        return (AirUnits.has(unit.type()) &&
            phase !== undefined &&
            phase !== AirMissionPhase.Ready &&
            phase !== AirMissionPhase.Rearming);
    }
}
//# sourceMappingURL=RadarStationExecution.js.map