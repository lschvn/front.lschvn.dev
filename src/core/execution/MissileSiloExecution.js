export class MissileSiloExecution {
    constructor(silo) {
        this.active = true;
        this.silo = silo;
    }
    init(mg, ticks) {
        this.mg = mg;
    }
    tick(ticks) {
        if (this.silo.isUnderConstruction()) {
            return;
        }
        // frontTime is the time the earliest missile fired.
        const frontTime = this.silo.missileTimerQueue()[0];
        if (frontTime === undefined) {
            return;
        }
        const cooldown = this.mg.config().SiloCooldown() - (this.mg.ticks() - frontTime);
        if (cooldown <= 0) {
            this.silo.reloadMissile();
        }
    }
    isActive() {
        return this.active;
    }
    activeDuringSpawnPhase() {
        return false;
    }
}
//# sourceMappingURL=MissileSiloExecution.js.map