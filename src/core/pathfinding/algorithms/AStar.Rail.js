import { DebugSpan } from "../../utilities/DebugSpan";
import { AStar } from "./AStar";
export class AStarRail {
    constructor(gameMap) {
        const adapter = new RailAdapter(gameMap);
        this.aStar = new AStar({ adapter });
    }
    findPath(from, to) {
        return DebugSpan.wrap("AStar.Rail:findPath", () => this.aStar.findPath(from, to));
    }
}
// Internal adapter
class RailAdapter {
    constructor(gameMap) {
        this.waterPenalty = 5;
        this.heuristicWeight = 2;
        this.directionChangePenalty = 3;
        this.gameMap = gameMap;
        this.width = gameMap.width();
        this.height = gameMap.height();
        this._numNodes = this.width * this.height;
    }
    numNodes() {
        return this._numNodes;
    }
    maxNeighbors() {
        return 4;
    }
    maxPriority() {
        const maxCost = 1 + this.waterPenalty + this.directionChangePenalty;
        return this.heuristicWeight * (this.width + this.height) * maxCost;
    }
    neighbors(node, buffer) {
        let count = 0;
        const x = node % this.width;
        const fromShoreline = this.gameMap.isShoreline(node);
        if (node >= this.width) {
            const n = node - this.width;
            if (this.isTraversable(n, fromShoreline))
                buffer[count++] = n;
        }
        if (node < this._numNodes - this.width) {
            const n = node + this.width;
            if (this.isTraversable(n, fromShoreline))
                buffer[count++] = n;
        }
        if (x !== 0) {
            const n = node - 1;
            if (this.isTraversable(n, fromShoreline))
                buffer[count++] = n;
        }
        if (x !== this.width - 1) {
            const n = node + 1;
            if (this.isTraversable(n, fromShoreline))
                buffer[count++] = n;
        }
        return count;
    }
    isTraversable(to, fromShoreline) {
        const toWater = this.gameMap.isWater(to);
        if (!toWater)
            return true;
        return fromShoreline || this.gameMap.isShoreline(to);
    }
    cost(from, to, prev) {
        const penalized = this.gameMap.isWater(to) || this.gameMap.isShoreline(to);
        let c = penalized ? 1 + this.waterPenalty : 1;
        if (prev !== undefined) {
            const d1 = from - prev;
            const d2 = to - from;
            if (d1 !== d2) {
                c += this.directionChangePenalty;
            }
        }
        return c;
    }
    heuristic(node, goal) {
        const nx = node % this.width;
        const ny = (node / this.width) | 0;
        const gx = goal % this.width;
        const gy = (goal / this.width) | 0;
        return this.heuristicWeight * (Math.abs(nx - gx) + Math.abs(ny - gy));
    }
}
//# sourceMappingURL=AStar.Rail.js.map