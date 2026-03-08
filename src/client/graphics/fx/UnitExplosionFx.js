import { FxType } from "./Fx";
import { SpriteFx } from "./SpriteFx";
import { Timeline } from "./Timeline";
/**
 * Explosion Effect: a few timed explosions
 */
export class UnitExplosionFx {
    constructor(animatedSpriteLoader, x, y, game) {
        this.x = x;
        this.y = y;
        this.timeline = new Timeline();
        this.explosions = [];
        const config = [
            { dx: 0, dy: 0, delay: 0, type: FxType.UnitExplosion },
            { dx: 4, dy: -6, delay: 80, type: FxType.UnitExplosion },
            { dx: -6, dy: 4, delay: 160, type: FxType.UnitExplosion },
        ];
        for (const { dx, dy, delay, type } of config) {
            this.timeline.add(delay, () => {
                if (game.isValidCoord(x + dx, y + dy)) {
                    this.explosions.push(new SpriteFx(animatedSpriteLoader, x + dx, y + dy, type));
                }
            });
        }
    }
    renderTick(frameTime, ctx) {
        this.timeline.update(frameTime);
        let allDone = true;
        for (const fx of this.explosions) {
            if (fx.renderTick(frameTime, ctx)) {
                allDone = false;
            }
        }
        return !allDone || !this.timeline.isComplete();
    }
}
//# sourceMappingURL=UnitExplosionFx.js.map