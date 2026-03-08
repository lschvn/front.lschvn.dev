import { PseudoRandom } from "../PseudoRandom";
export class AirPathFinder {
    constructor(game) {
        this.game = game;
        this.seed = game.ticks();
    }
    findPath(from, to) {
        if (Array.isArray(from)) {
            throw new Error("AirPathFinder does not support multiple start points");
        }
        const random = new PseudoRandom(this.seed);
        const path = [from];
        let current = from;
        while (current !== to) {
            const next = this.computeNext(current, to, random);
            if (next === current)
                break; // Prevent infinite loop if something breaks
            current = next;
            path.push(current);
        }
        return path;
    }
    computeNext(from, to, random) {
        const x = this.game.x(from);
        const y = this.game.y(from);
        const dstX = this.game.x(to);
        const dstY = this.game.y(to);
        if (x === dstX && y === dstY) {
            return to;
        }
        let nextX = x;
        let nextY = y;
        const ratio = Math.floor(1 + Math.abs(dstY - y) / (Math.abs(dstX - x) + 1));
        if (x === dstX) {
            // Can only move in Y
            nextY += y < dstY ? 1 : -1;
        }
        else if (y === dstY) {
            // Can only move in X
            nextX += x < dstX ? 1 : -1;
        }
        else {
            if (random.chance(ratio)) {
                nextX += x < dstX ? 1 : -1;
            }
            else {
                nextY += y < dstY ? 1 : -1;
            }
        }
        return this.game.ref(nextX, nextY);
    }
}
//# sourceMappingURL=PathFinder.Air.js.map