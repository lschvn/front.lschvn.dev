import { Cell, UnitType } from "src/core/game/Game";
const BASE_ALPHA = 0.9;
const SHADOW_OFFSET_Y = 2;
/**
 * Draw a simple zoom-aware target
 */
export class Target {
    constructor(transformHandler, x, y, radius) {
        this.transformHandler = transformHandler;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.offset = 0;
        this.rotationSpeed = 20;
        this.animationDuration = 150;
        this.animationElapsedTime = 0;
        this.ended = false;
        this.lifeTime = 0;
        this.outerRadius = radius * 2 - 4;
        // 2 dashes per circle, with a 10 pixel gap
        this.dashSize = Math.PI * this.outerRadius - 10;
        this.cell = new Cell(this.x + 0.5, this.y + 0.5);
    }
    render(ctx, delta) {
        this.lifeTime += delta;
        if (this.ended) {
            this.animationElapsedTime += delta;
            if (this.animationElapsedTime >= this.animationDuration)
                return false;
        }
        let t;
        if (this.ended) {
            // end animation
            t = Math.max(0, 1 - this.animationElapsedTime / this.animationDuration);
        }
        else {
            t = 1; // No start fade feels more reactive
        }
        const alpha = Math.max(0, Math.min(1, BASE_ALPHA * t));
        const screenPos = this.transformHandler.worldToScreenCoordinates(this.cell);
        screenPos.x = Math.round(screenPos.x);
        screenPos.y = Math.round(screenPos.y);
        const transformScale = this.transformHandler.scale;
        const scale = transformScale > 10 ? 1 + (transformScale - 10) / 10 : 1;
        this.offset += this.rotationSpeed * (delta / 1000);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(255,0,0,${alpha})`;
        this.drawInnerRing(ctx, screenPos.x, screenPos.y, scale);
        this.drawOuterRing(ctx, screenPos.x, screenPos.y, scale);
        ctx.restore();
        return true;
    }
    drawInnerRing(ctx, x, y, scale) {
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.lineDashOffset = this.offset * scale;
        ctx.setLineDash([8 * scale, 8 * scale]);
        ctx.arc(x, y, this.radius * scale, 0, Math.PI * 2);
        ctx.stroke();
    }
    drawOuterRing(ctx, x, y, scale) {
        ctx.beginPath();
        ctx.lineWidth = 4 * scale;
        ctx.lineDashOffset = (-this.offset / 2) * scale;
        ctx.setLineDash([this.dashSize * scale, 10 * scale]);
        ctx.arc(x, y, this.outerRadius * scale, 0, Math.PI * 2);
        ctx.stroke();
        // Small shadow under the outer circle
        ctx.beginPath();
        ctx.strokeStyle = `rgba(0,0,0,0.2)`;
        ctx.arc(x, y + SHADOW_OFFSET_Y, this.outerRadius * scale, 0, Math.PI * 2);
        ctx.stroke();
    }
}
/**
 * Bind a target to a naval invasion
 */
export class NavalTarget extends Target {
    constructor(transformHandler, game, unit) {
        const tile = unit.targetTile();
        if (tile === undefined) {
            throw new Error("NavalTarget requires a target tile");
        }
        super(transformHandler, game.x(tile), game.y(tile), 10);
        this.game = game;
        this.unit = unit;
    }
    render(ctx, delta) {
        if (!this.ended &&
            (!this.unit.isActive() ||
                (this.unit.type() === UnitType.TransportShip && this.unit.retreating()))) {
            this.ended = true;
        }
        return super.render(ctx, delta);
    }
}
//# sourceMappingURL=NavalTarget.js.map