import { Cell } from "src/core/game/Game";
const MIN_TEXT_ZOOM = 1.1;
export class TextIndicator {
    constructor(transformHandler, text, x, y, duration, riseDistance = 15, color = {
        r: 255,
        g: 255,
        b: 255,
    }) {
        this.transformHandler = transformHandler;
        this.text = text;
        this.x = x;
        this.y = y;
        this.duration = duration;
        this.riseDistance = riseDistance;
        this.color = color;
        this.fontSize = 8;
        this.font = "Overpass, sans-serif";
        this.lifeTime = 0;
        this.cell = new Cell(this.x + 0.5, this.y + 0.5);
    }
    render(ctx, delta) {
        this.lifeTime += delta;
        if (this.lifeTime >= this.duration) {
            return false;
        }
        const transformScale = this.transformHandler.scale;
        if (transformScale < MIN_TEXT_ZOOM) {
            // Reduce visual noise when dezoomed enough
            return true;
        }
        const screenPos = this.transformHandler.worldToScreenCoordinates(this.cell);
        screenPos.x = Math.round(screenPos.x);
        screenPos.y = Math.round(screenPos.y);
        const size = Math.round(this.fontSize * transformScale);
        const t = this.lifeTime / this.duration;
        const currentY = screenPos.y - t * this.riseDistance * transformScale;
        const alpha = Math.max(0, 1 - t);
        ctx.save();
        ctx.font = `${size}px ${this.font}`;
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha})`;
        ctx.textAlign = "center";
        ctx.fillText(this.text, screenPos.x, currentY);
        ctx.restore();
        return true;
    }
}
//# sourceMappingURL=TextIndicator.js.map