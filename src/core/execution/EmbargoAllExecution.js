import { PlayerType } from "../game/Game";
export class EmbargoAllExecution {
    constructor(player, action) {
        this.player = player;
        this.action = action;
    }
    init(mg, _) {
        if (!this.player.canEmbargoAll()) {
            return;
        }
        const me = this.player;
        for (const p of mg.players()) {
            if (p.id() === me.id())
                continue;
            if (p.type() === PlayerType.Bot)
                continue;
            if (me.isOnSameTeam(p))
                continue;
            if (this.action === "start") {
                if (!me.hasEmbargoAgainst(p))
                    me.addEmbargo(p, false);
            }
            else {
                if (me.hasEmbargoAgainst(p))
                    me.stopEmbargo(p);
            }
        }
        this.player.recordEmbargoAll();
    }
    tick(_) { }
    isActive() {
        return false;
    }
    activeDuringSpawnPhase() {
        return false;
    }
}
//# sourceMappingURL=EmbargoAllExecution.js.map