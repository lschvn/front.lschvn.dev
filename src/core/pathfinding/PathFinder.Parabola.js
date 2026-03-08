import { within } from "../Util";
import { DistanceBasedBezierCurve } from "../utilities/Line";
import { PathStatus } from "./types";
const PARABOLA_MIN_HEIGHT = 50;
export class ParabolaUniversalPathFinder {
    constructor(gameMap, options) {
        this.gameMap = gameMap;
        this.options = options;
        this.curve = null;
        this.lastTo = null;
    }
    createCurve(from, to) {
        const increment = this.options?.increment ?? 3;
        const distanceBasedHeight = this.options?.distanceBasedHeight ?? true;
        const directionUp = this.options?.directionUp ?? true;
        const p0 = { x: this.gameMap.x(from), y: this.gameMap.y(from) };
        const p3 = { x: this.gameMap.x(to), y: this.gameMap.y(to) };
        const dx = p3.x - p0.x;
        const dy = p3.y - p0.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxHeight = distanceBasedHeight
            ? Math.max(distance / 3, PARABOLA_MIN_HEIGHT)
            : 0;
        const heightMult = directionUp ? -1 : 1;
        const mapHeight = this.gameMap.height();
        const p1 = {
            x: p0.x + dx / 4,
            y: within(p0.y + dy / 4 + heightMult * maxHeight, 0, mapHeight - 1),
        };
        const p2 = {
            x: p0.x + (dx * 3) / 4,
            y: within(p0.y + (dy * 3) / 4 + heightMult * maxHeight, 0, mapHeight - 1),
        };
        return new DistanceBasedBezierCurve(p0, p1, p2, p3, increment);
    }
    findPath(from, to) {
        if (Array.isArray(from)) {
            throw new Error("ParabolaUniversalPathFinder does not support multiple start points");
        }
        const curve = this.createCurve(from, to);
        return curve
            .getAllPoints()
            .map((p) => this.gameMap.ref(Math.floor(p.x), Math.floor(p.y)));
    }
    next(from, to, speed) {
        if (this.lastTo !== to) {
            this.curve = this.createCurve(from, to);
            this.lastTo = to;
        }
        const nextPoint = this.curve.increment(speed ?? 1);
        if (!nextPoint) {
            return { status: PathStatus.COMPLETE, node: to };
        }
        const tile = this.gameMap.ref(Math.floor(nextPoint.x), Math.floor(nextPoint.y));
        return { status: PathStatus.NEXT, node: tile };
    }
    invalidate() {
        this.curve = null;
        this.lastTo = null;
    }
    currentIndex() {
        return this.curve?.getCurrentIndex() ?? 0;
    }
}
//# sourceMappingURL=PathFinder.Parabola.js.map