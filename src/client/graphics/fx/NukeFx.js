import { FxType } from "./Fx";
import { FadeFx, SpriteFx } from "./SpriteFx";
/**
 * Shockwave effect: draw a growing 1px white circle
 */
export class ShockwaveFx {
    constructor(x, y, duration, maxRadius) {
        this.x = x;
        this.y = y;
        this.duration = duration;
        this.maxRadius = maxRadius;
        this.lifeTime = 0;
    }
    renderTick(frameTime, ctx) {
        this.lifeTime += frameTime;
        if (this.lifeTime >= this.duration) {
            return false;
        }
        const t = this.lifeTime / this.duration;
        const radius = t * this.maxRadius;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, " + (1 - t) + ")";
        ctx.lineWidth = 0.5;
        ctx.stroke();
        return true;
    }
}
/**
 * Spawn @p number of @p type animation within a perimeter
 */
function addSpriteInCircle(animatedSpriteLoader, x, y, radius, num, type, result, game) {
    const count = Math.max(0, Math.floor(num));
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * (radius / 2);
        const spawnX = Math.floor(x + Math.cos(angle) * distance);
        const spawnY = Math.floor(y + Math.sin(angle) * distance);
        if (game.isValidCoord(spawnX, spawnY) &&
            game.isLand(game.ref(spawnX, spawnY))) {
            const sprite = new FadeFx(new SpriteFx(animatedSpriteLoader, spawnX, spawnY, type, 6000), 0.1, 0.8);
            result.push(sprite);
        }
    }
}
/**
 * Explosion effect:
 * - explosion animation
 * - shockwave
 * - ruins and desolation fx
 */
export function nukeFxFactory(animatedSpriteLoader, x, y, radius, game) {
    const nukeFx = [];
    // Explosion animation
    nukeFx.push(new SpriteFx(animatedSpriteLoader, x, y, FxType.Nuke));
    // Shockwave animation
    nukeFx.push(new ShockwaveFx(x, y, 1500, radius * 1.5));
    // Ruins and desolation sprites
    const debrisPlan = [
        { type: FxType.MiniFire, radiusFactor: 1.0, density: 1 / 25 },
        { type: FxType.MiniSmoke, radiusFactor: 1.0, density: 1 / 28 },
        { type: FxType.MiniBigSmoke, radiusFactor: 0.9, density: 1 / 70 },
        { type: FxType.MiniSmokeAndFire, radiusFactor: 0.9, density: 1 / 70 },
    ];
    for (const { type, radiusFactor, density } of debrisPlan) {
        addSpriteInCircle(animatedSpriteLoader, x, y, radius * radiusFactor, radius * density, type, nukeFx, game);
    }
    return nukeFx;
}
//# sourceMappingURL=NukeFx.js.map