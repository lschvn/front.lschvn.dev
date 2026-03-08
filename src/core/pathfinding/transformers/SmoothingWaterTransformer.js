import { DebugSpan } from "../../utilities/DebugSpan";
import { AStarWaterBounded, } from "../algorithms/AStar.WaterBounded";
const ENDPOINT_REFINEMENT_TILES = 50;
const LOCAL_ASTAR_MAX_AREA = 100 * 100;
const LOS_MIN_MAGNITUDE_PASS1 = 2;
const LOS_MIN_MAGNITUDE_PASS2 = 3;
const MAGNITUDE_MASK = 0x1f;
/**
 * Water path smoother transformer:
 * 1. Binary search LOS smoothing (avoids shallow water)
 * 2. Local A* refinement on endpoints (first/last N tiles)
 * 3. Binary search LOS smoothing again (farther from shore)
 */
export class SmoothingWaterTransformer {
    constructor(inner, map, isTraversable = (t) => map.isWater(t)) {
        this.inner = inner;
        this.map = map;
        this.mapWidth = map.width();
        this.localAStar = new AStarWaterBounded(map, LOCAL_ASTAR_MAX_AREA);
        this.terrain = map.terrain;
        this.isTraversable = isTraversable;
    }
    findPath(from, to) {
        const path = this.inner.findPath(from, to);
        return DebugSpan.wrap("smoothingTransformer", () => path ? this.smooth(path) : null);
    }
    smooth(path) {
        if (path.length <= 2) {
            return path;
        }
        // Pass 1: LOS smoothing with binary search
        let smoothed = DebugSpan.wrap("smoother:los", () => this.losSmooth(path, LOS_MIN_MAGNITUDE_PASS1));
        // Pass 2: Local A* refinement on endpoints
        smoothed = DebugSpan.wrap("smoother:refine", () => this.refineEndpoints(smoothed));
        // Pass 3: LOS smoothing again, farther from the shore
        smoothed = DebugSpan.wrap("smoother:los2", () => this.losSmooth(smoothed, LOS_MIN_MAGNITUDE_PASS2));
        return smoothed;
    }
    losSmooth(path, minMagnitude) {
        const result = [path[0]];
        let current = 0;
        while (current < path.length - 1) {
            // Binary search for farthest visible waypoint
            let lo = current + 1;
            let hi = path.length - 1;
            let farthest = lo;
            while (lo <= hi) {
                const mid = (lo + hi) >>> 1;
                if (this.canSee(path[current], path[mid], minMagnitude)) {
                    farthest = mid;
                    lo = mid + 1;
                }
                else {
                    hi = mid - 1;
                }
            }
            // Trace the path to farthest visible point
            if (farthest > current + 1) {
                const trace = this.tracePath(path[current], path[farthest]);
                if (trace) {
                    // Add all intermediate tiles except the last (will be added in next iteration or at end)
                    for (let i = 1; i < trace.length - 1; i++) {
                        result.push(trace[i]);
                    }
                }
            }
            current = farthest;
            if (current < path.length - 1) {
                result.push(path[current]);
            }
        }
        result.push(path[path.length - 1]);
        return result;
    }
    refineEndpoints(path) {
        if (path.length <= 2) {
            return path;
        }
        const refineDist = ENDPOINT_REFINEMENT_TILES;
        let result = path;
        // Find the index where cumulative distance reaches refineDist from start
        const startEndIdx = this.findTileAtDistance(path, 0, refineDist, true);
        // Refine start segment if it's more than 2 tiles and not already optimal
        if (startEndIdx > 1) {
            const startSegment = this.refineSegment(path[0], path[startEndIdx]);
            if (startSegment && startSegment.length > 0) {
                result = [...startSegment.slice(0, -1), ...result.slice(startEndIdx)];
            }
        }
        // Find the index where cumulative distance reaches refineDist from end
        const endStartIdx = this.findTileAtDistance(result, result.length - 1, refineDist, false);
        // Refine end segment if it's more than 2 tiles and not already optimal
        // Search in reverse (from destination backwards) so path approaches target naturally
        if (endStartIdx < result.length - 2) {
            const endSegment = this.refineSegment(result[result.length - 1], result[endStartIdx]);
            if (endSegment && endSegment.length > 0) {
                endSegment.reverse();
                result = [...result.slice(0, endStartIdx), ...endSegment];
            }
        }
        return result;
    }
    findTileAtDistance(path, startIdx, distance, forward) {
        let cumDist = 0;
        let idx = startIdx;
        if (forward) {
            while (idx < path.length - 1 && cumDist < distance) {
                cumDist += this.manhattanDist(path[idx], path[idx + 1]);
                idx++;
            }
        }
        else {
            while (idx > 0 && cumDist < distance) {
                cumDist += this.manhattanDist(path[idx], path[idx - 1]);
                idx--;
            }
        }
        return idx;
    }
    refineSegment(from, to) {
        const x0 = this.map.x(from);
        const y0 = this.map.y(from);
        const x1 = this.map.x(to);
        const y1 = this.map.y(to);
        // Calculate bounds with padding
        const padding = 10;
        const bounds = {
            minX: Math.max(0, Math.min(x0, x1) - padding),
            maxX: Math.min(this.map.width() - 1, Math.max(x0, x1) + padding),
            minY: Math.max(0, Math.min(y0, y1) - padding),
            maxY: Math.min(this.map.height() - 1, Math.max(y0, y1) + padding),
        };
        return this.localAStar.searchBounded(from, to, bounds);
    }
    canSee(from, to, minMagnitude) {
        const x0 = from % this.mapWidth;
        const y0 = (from / this.mapWidth) | 0;
        const x1 = to % this.mapWidth;
        const y1 = (to / this.mapWidth) | 0;
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;
        let x = x0;
        let y = y0;
        const maxTiles = 100000;
        let iterations = 0;
        while (true) {
            if (iterations++ > maxTiles)
                return false;
            const tile = (y * this.mapWidth + x);
            if (!this.isTraversable(tile))
                return false;
            // Check magnitude - avoid shallow water
            const magnitude = this.terrain[tile] & MAGNITUDE_MASK;
            if (magnitude < minMagnitude)
                return false;
            if (x === x1 && y === y1)
                return true;
            const e2 = 2 * err;
            const shouldMoveX = e2 > -dy;
            const shouldMoveY = e2 < dx;
            if (shouldMoveX && shouldMoveY) {
                // Diagonal move - check intermediate tile
                x += sx;
                err -= dy;
                const intermediateTile = (y * this.mapWidth + x);
                const intMag = this.terrain[intermediateTile] & MAGNITUDE_MASK;
                if (!this.isTraversable(intermediateTile) || intMag < minMagnitude) {
                    // Try alternative path
                    x -= sx;
                    err += dy;
                    y += sy;
                    err += dx;
                    const altTile = (y * this.mapWidth + x);
                    const altMag = this.terrain[altTile] & MAGNITUDE_MASK;
                    if (!this.isTraversable(altTile) || altMag < minMagnitude)
                        return false;
                    x += sx;
                    err -= dy;
                }
                else {
                    y += sy;
                    err += dx;
                }
            }
            else {
                if (shouldMoveX) {
                    x += sx;
                    err -= dy;
                }
                if (shouldMoveY) {
                    y += sy;
                    err += dx;
                }
            }
        }
    }
    tracePath(from, to) {
        const x0 = from % this.mapWidth;
        const y0 = (from / this.mapWidth) | 0;
        const x1 = to % this.mapWidth;
        const y1 = (to / this.mapWidth) | 0;
        const tiles = [];
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;
        let x = x0;
        let y = y0;
        const maxTiles = 100000;
        let iterations = 0;
        while (true) {
            if (iterations++ > maxTiles)
                return null;
            const tile = (y * this.mapWidth + x);
            if (!this.isTraversable(tile))
                return null;
            tiles.push(tile);
            if (x === x1 && y === y1)
                break;
            const e2 = 2 * err;
            const shouldMoveX = e2 > -dy;
            const shouldMoveY = e2 < dx;
            if (shouldMoveX && shouldMoveY) {
                x += sx;
                err -= dy;
                const intermediateTile = (y * this.mapWidth + x);
                if (!this.isTraversable(intermediateTile)) {
                    x -= sx;
                    err += dy;
                    y += sy;
                    err += dx;
                    const altTile = (y * this.mapWidth + x);
                    if (!this.isTraversable(altTile))
                        return null;
                    tiles.push(altTile);
                    x += sx;
                    err -= dy;
                }
                else {
                    tiles.push(intermediateTile);
                    y += sy;
                    err += dx;
                }
            }
            else {
                if (shouldMoveX) {
                    x += sx;
                    err -= dy;
                }
                if (shouldMoveY) {
                    y += sy;
                    err += dx;
                }
            }
        }
        return tiles;
    }
    manhattanDist(a, b) {
        const ax = a % this.mapWidth;
        const ay = (a / this.mapWidth) | 0;
        const bx = b % this.mapWidth;
        const by = (b / this.mapWidth) | 0;
        return Math.abs(ax - bx) + Math.abs(ay - by);
    }
}
//# sourceMappingURL=SmoothingWaterTransformer.js.map