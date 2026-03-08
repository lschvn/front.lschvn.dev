import { MinHeap } from "./PriorityQueue";
const LAND_BIT = 7;
const MAGNITUDE_MASK = 0x1f;
const COST_SCALE = 100;
const BASE_COST = 1 * COST_SCALE;
// Prefer magnitude 3-10 (3-10 tiles from shore)
function getMagnitudePenalty(magnitude) {
    if (magnitude < 3)
        return 3 * COST_SCALE; // too close to shore
    if (magnitude <= 10)
        return 0; // sweet spot
    return 1 * COST_SCALE; // deep water, slight penalty
}
export class AStarWaterBounded {
    constructor(map, maxSearchArea, config) {
        this.stamp = 1;
        this.terrain = map.terrain;
        this.mapWidth = map.width();
        this.heuristicWeight = config?.heuristicWeight ?? 3;
        this.maxIterations = config?.maxIterations ?? 100000;
        this.closedStamp = new Uint32Array(maxSearchArea);
        this.gScoreStamp = new Uint32Array(maxSearchArea);
        this.gScore = new Uint32Array(maxSearchArea);
        this.cameFrom = new Int32Array(maxSearchArea);
        this.queue = new MinHeap(maxSearchArea * 4);
    }
    findPath(start, goal) {
        const starts = Array.isArray(start) ? start : [start];
        const goalX = goal % this.mapWidth;
        const goalY = (goal / this.mapWidth) | 0;
        let minX = goalX;
        let maxX = goalX;
        let minY = goalY;
        let maxY = goalY;
        for (const s of starts) {
            const sx = s % this.mapWidth;
            const sy = (s / this.mapWidth) | 0;
            minX = Math.min(minX, sx);
            maxX = Math.max(maxX, sx);
            minY = Math.min(minY, sy);
            maxY = Math.max(maxY, sy);
        }
        return this.searchBounded(starts, goal, {
            minX,
            maxX,
            minY,
            maxY,
        });
    }
    searchBounded(start, goal, bounds) {
        this.stamp++;
        if (this.stamp > 0xffffffff) {
            this.closedStamp.fill(0);
            this.gScoreStamp.fill(0);
            this.stamp = 1;
        }
        const stamp = this.stamp;
        const mapWidth = this.mapWidth;
        const terrain = this.terrain;
        const closedStamp = this.closedStamp;
        const gScoreStamp = this.gScoreStamp;
        const gScore = this.gScore;
        const cameFrom = this.cameFrom;
        const queue = this.queue;
        const weight = this.heuristicWeight;
        const landMask = 1 << LAND_BIT;
        const { minX, maxX, minY, maxY } = bounds;
        const boundsWidth = maxX - minX + 1;
        const goalX = goal % mapWidth;
        const goalY = (goal / mapWidth) | 0;
        const boundsHeight = maxY - minY + 1;
        const numLocalNodes = boundsWidth * boundsHeight;
        if (numLocalNodes > this.closedStamp.length) {
            return null;
        }
        const toLocal = (tile, clamp = false) => {
            let x = tile % mapWidth;
            let y = (tile / mapWidth) | 0;
            if (clamp) {
                x = Math.max(minX, Math.min(maxX, x));
                y = Math.max(minY, Math.min(maxY, y));
            }
            return (y - minY) * boundsWidth + (x - minX);
        };
        const toGlobal = (local) => {
            const localX = local % boundsWidth;
            const localY = (local / boundsWidth) | 0;
            return ((localY + minY) * mapWidth + (localX + minX));
        };
        const goalLocal = toLocal(goal, true);
        if (goalLocal < 0 || goalLocal >= numLocalNodes) {
            return null;
        }
        queue.clear();
        const starts = Array.isArray(start) ? start : [start];
        // For cross-product tie-breaker (prefer diagonal paths)
        const s0 = starts[0];
        const startX = s0 % mapWidth;
        const startY = (s0 / mapWidth) | 0;
        const dxGoal = goalX - startX;
        const dyGoal = goalY - startY;
        // Normalization factor to keep tie-breaker small (< COST_SCALE)
        const crossNorm = Math.max(1, Math.abs(dxGoal) + Math.abs(dyGoal));
        // Cross-product tie-breaker: measures deviation from start-goal line
        const crossTieBreaker = (nx, ny) => {
            const dxN = nx - goalX;
            const dyN = ny - goalY;
            const cross = Math.abs(dxGoal * dyN - dyGoal * dxN);
            return Math.floor((cross * (COST_SCALE - 1)) / crossNorm / crossNorm);
        };
        for (const s of starts) {
            const startLocal = toLocal(s, true);
            if (startLocal < 0 || startLocal >= numLocalNodes) {
                continue;
            }
            gScore[startLocal] = 0;
            gScoreStamp[startLocal] = stamp;
            cameFrom[startLocal] = -1;
            const sx = s % mapWidth;
            const sy = (s / mapWidth) | 0;
            const h = weight * BASE_COST * (Math.abs(sx - goalX) + Math.abs(sy - goalY));
            queue.push(startLocal, h);
        }
        let iterations = this.maxIterations;
        while (!queue.isEmpty()) {
            if (--iterations <= 0) {
                return null;
            }
            const currentLocal = queue.pop();
            if (closedStamp[currentLocal] === stamp)
                continue;
            closedStamp[currentLocal] = stamp;
            if (currentLocal === goalLocal) {
                return this.buildPath(goalLocal, toGlobal, numLocalNodes);
            }
            const currentG = gScore[currentLocal];
            // Convert to global coords for neighbor calculation
            const current = toGlobal(currentLocal);
            const currentX = current % mapWidth;
            const currentY = (current / mapWidth) | 0;
            if (currentY > minY) {
                const neighbor = current - mapWidth;
                const neighborLocal = currentLocal - boundsWidth;
                const neighborTerrain = terrain[neighbor];
                if (closedStamp[neighborLocal] !== stamp &&
                    (neighbor === goal || (neighborTerrain & landMask) === 0)) {
                    const ny = currentY - 1;
                    const distToGoal = Math.abs(currentX - goalX) + Math.abs(ny - goalY);
                    const magnitude = neighborTerrain & MAGNITUDE_MASK;
                    const cost = BASE_COST + getMagnitudePenalty(magnitude);
                    const tentativeG = currentG + cost;
                    if (gScoreStamp[neighborLocal] !== stamp ||
                        tentativeG < gScore[neighborLocal]) {
                        cameFrom[neighborLocal] = currentLocal;
                        gScore[neighborLocal] = tentativeG;
                        gScoreStamp[neighborLocal] = stamp;
                        const h = weight * BASE_COST * distToGoal;
                        const f = tentativeG + h + crossTieBreaker(currentX, ny);
                        queue.push(neighborLocal, f);
                    }
                }
            }
            if (currentY < maxY) {
                const neighbor = current + mapWidth;
                const neighborLocal = currentLocal + boundsWidth;
                const neighborTerrain = terrain[neighbor];
                if (closedStamp[neighborLocal] !== stamp &&
                    (neighbor === goal || (neighborTerrain & landMask) === 0)) {
                    const ny = currentY + 1;
                    const distToGoal = Math.abs(currentX - goalX) + Math.abs(ny - goalY);
                    const magnitude = neighborTerrain & MAGNITUDE_MASK;
                    const cost = BASE_COST + getMagnitudePenalty(magnitude);
                    const tentativeG = currentG + cost;
                    if (gScoreStamp[neighborLocal] !== stamp ||
                        tentativeG < gScore[neighborLocal]) {
                        cameFrom[neighborLocal] = currentLocal;
                        gScore[neighborLocal] = tentativeG;
                        gScoreStamp[neighborLocal] = stamp;
                        const h = weight * BASE_COST * distToGoal;
                        const f = tentativeG + h + crossTieBreaker(currentX, ny);
                        queue.push(neighborLocal, f);
                    }
                }
            }
            if (currentX > minX) {
                const neighbor = current - 1;
                const neighborLocal = currentLocal - 1;
                const neighborTerrain = terrain[neighbor];
                if (closedStamp[neighborLocal] !== stamp &&
                    (neighbor === goal || (neighborTerrain & landMask) === 0)) {
                    const nx = currentX - 1;
                    const distToGoal = Math.abs(nx - goalX) + Math.abs(currentY - goalY);
                    const magnitude = neighborTerrain & MAGNITUDE_MASK;
                    const cost = BASE_COST + getMagnitudePenalty(magnitude);
                    const tentativeG = currentG + cost;
                    if (gScoreStamp[neighborLocal] !== stamp ||
                        tentativeG < gScore[neighborLocal]) {
                        cameFrom[neighborLocal] = currentLocal;
                        gScore[neighborLocal] = tentativeG;
                        gScoreStamp[neighborLocal] = stamp;
                        const h = weight * BASE_COST * distToGoal;
                        const f = tentativeG + h + crossTieBreaker(nx, currentY);
                        queue.push(neighborLocal, f);
                    }
                }
            }
            if (currentX < maxX) {
                const neighbor = current + 1;
                const neighborLocal = currentLocal + 1;
                const neighborTerrain = terrain[neighbor];
                if (closedStamp[neighborLocal] !== stamp &&
                    (neighbor === goal || (neighborTerrain & landMask) === 0)) {
                    const nx = currentX + 1;
                    const distToGoal = Math.abs(nx - goalX) + Math.abs(currentY - goalY);
                    const magnitude = neighborTerrain & MAGNITUDE_MASK;
                    const cost = BASE_COST + getMagnitudePenalty(magnitude);
                    const tentativeG = currentG + cost;
                    if (gScoreStamp[neighborLocal] !== stamp ||
                        tentativeG < gScore[neighborLocal]) {
                        cameFrom[neighborLocal] = currentLocal;
                        gScore[neighborLocal] = tentativeG;
                        gScoreStamp[neighborLocal] = stamp;
                        const h = weight * BASE_COST * distToGoal;
                        const f = tentativeG + h + crossTieBreaker(nx, currentY);
                        queue.push(neighborLocal, f);
                    }
                }
            }
        }
        return null;
    }
    buildPath(goalLocal, toGlobal, maxPathLength) {
        const path = [];
        let current = goalLocal;
        // Safety check to prevent infinite loops
        let iterations = 0;
        while (current !== -1 && iterations < maxPathLength) {
            path.push(toGlobal(current));
            current = this.cameFrom[current];
            iterations++;
        }
        path.reverse();
        return path;
    }
}
//# sourceMappingURL=AStar.WaterBounded.js.map