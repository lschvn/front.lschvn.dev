// Generic A* implementation with adapter interface
// See AStar.Rail.ts for adapter version where performance is not critical
// See AStar.Water.ts for inlined version for performance-critical use
import { BucketQueue } from "./PriorityQueue";
export class AStar {
    constructor(config) {
        this.stamp = 1;
        this.adapter = config.adapter;
        this.maxIterations = config.maxIterations ?? 500000;
        this.neighborBuffer = new Int32Array(this.adapter.maxNeighbors());
        this.closedStamp = new Uint32Array(this.adapter.numNodes());
        this.gScoreStamp = new Uint32Array(this.adapter.numNodes());
        this.gScore = new Uint32Array(this.adapter.numNodes());
        this.cameFrom = new Int32Array(this.adapter.numNodes());
        this.queue = new BucketQueue(this.adapter.maxPriority());
    }
    findPath(start, goal) {
        this.stamp++;
        if (this.stamp > 0xffffffff) {
            this.closedStamp.fill(0);
            this.gScoreStamp.fill(0);
            this.stamp = 1;
        }
        const stamp = this.stamp;
        const adapter = this.adapter;
        const closedStamp = this.closedStamp;
        const gScoreStamp = this.gScoreStamp;
        const gScore = this.gScore;
        const cameFrom = this.cameFrom;
        const queue = this.queue;
        const buffer = this.neighborBuffer;
        queue.clear();
        const starts = Array.isArray(start) ? start : [start];
        for (const s of starts) {
            gScore[s] = 0;
            gScoreStamp[s] = stamp;
            cameFrom[s] = -1;
            queue.push(s, adapter.heuristic(s, goal));
        }
        let iterations = this.maxIterations;
        while (!queue.isEmpty()) {
            if (--iterations <= 0) {
                return null;
            }
            const current = queue.pop();
            if (closedStamp[current] === stamp)
                continue;
            closedStamp[current] = stamp;
            if (current === goal) {
                return this.buildPath(goal);
            }
            const currentG = gScore[current];
            const prev = cameFrom[current];
            const count = adapter.neighbors(current, buffer);
            for (let i = 0; i < count; i++) {
                const neighbor = buffer[i];
                if (closedStamp[neighbor] === stamp)
                    continue;
                const tentativeG = currentG +
                    adapter.cost(current, neighbor, prev === -1 ? undefined : prev);
                if (gScoreStamp[neighbor] !== stamp || tentativeG < gScore[neighbor]) {
                    cameFrom[neighbor] = current;
                    gScore[neighbor] = tentativeG;
                    gScoreStamp[neighbor] = stamp;
                    queue.push(neighbor, tentativeG + adapter.heuristic(neighbor, goal));
                }
            }
        }
        return null;
    }
    buildPath(goal) {
        const path = [];
        let current = goal;
        while (current !== -1) {
            path.push(current);
            current = this.cameFrom[current];
        }
        path.reverse();
        return path;
    }
}
//# sourceMappingURL=AStar.js.map