import { DefaultConfig } from "../../src/core/configuration/DefaultConfig";
export class TestConfig extends DefaultConfig {
    constructor() {
        super(...arguments);
        this._proximityBonusPortsNb = 0;
        this._defaultNukeSpeed = 4;
        this._spawnImmunityDuration = 0;
        this._nationSpawnImmunityDuration = 0;
    }
    disableNavMesh() {
        return this.gameConfig().disableNavMesh ?? true;
    }
    radiusPortSpawn() {
        return 1;
    }
    proximityBonusPortsNb(totalPorts) {
        return this._proximityBonusPortsNb;
    }
    // Specific to TestConfig
    setProximityBonusPortsNb(nb) {
        this._proximityBonusPortsNb = nb;
    }
    nukeMagnitudes(_) {
        return { inner: 1, outer: 1 };
    }
    setDefaultNukeSpeed(speed) {
        this._defaultNukeSpeed = speed;
    }
    defaultNukeSpeed() {
        return this._defaultNukeSpeed;
    }
    defaultNukeTargetableRange() {
        return 20;
    }
    deletionMarkDuration() {
        return 5;
    }
    defaultSamRange() {
        return 20;
    }
    samRange(level) {
        return 20;
    }
    aaBatteryRange() {
        return 20;
    }
    aaBatteryCooldown() {
        return 4;
    }
    radarStationRange() {
        return 32;
    }
    setSpawnImmunityDuration(duration) {
        this._spawnImmunityDuration = duration;
    }
    spawnImmunityDuration() {
        return this._spawnImmunityDuration;
    }
    setNationSpawnImmunityDuration(duration) {
        this._nationSpawnImmunityDuration = duration;
    }
    nationSpawnImmunityDuration() {
        return this._nationSpawnImmunityDuration;
    }
    attackLogic(gm, attackTroops, attacker, defender, tileToConquer) {
        return { attackerTroopLoss: 1, defenderTroopLoss: 1, tilesPerTickUsed: 1 };
    }
    attackTilesPerTick(attackTroops, attacker, defender, numAdjacentTilesWithEnemy) {
        return 1;
    }
}
export class UseRealAttackLogic extends TestConfig {
    // Override to use DefaultConfig's real attackLogic
    attackLogic(gm, attackTroops, attacker, defender, tileToConquer) {
        return DefaultConfig.prototype.attackLogic.call(this, gm, attackTroops, attacker, defender, tileToConquer);
    }
}
//# sourceMappingURL=TestConfig.js.map