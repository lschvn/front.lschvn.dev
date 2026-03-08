/**
 * Wraps a PathFinder to handle shore tiles.
 * Coerces shore tiles to nearby water tiles before pathfinding,
 * then fixes the path extremes to include the original shore tiles.
 */
export class ShoreCoercingTransformer {
    constructor(inner, map) {
        this.inner = inner;
        this.map = map;
    }
    findPath(from, to) {
        const fromArray = Array.isArray(from) ? from : [from];
        const waterToOriginal = new Map();
        const waterFrom = [];
        for (const f of fromArray) {
            const coerced = this.coerceToWater(f);
            if (coerced.water !== null) {
                waterFrom.push(coerced.water);
                waterToOriginal.set(coerced.water, coerced.original);
            }
        }
        if (waterFrom.length === 0) {
            return null;
        }
        const coercedTo = this.coerceToWater(to);
        if (coercedTo.water === null) {
            return null;
        }
        const fromTiles = waterFrom.length === 1 ? waterFrom[0] : waterFrom;
        const path = this.inner.findPath(fromTiles, coercedTo.water);
        if (!path || path.length === 0) {
            return null;
        }
        // Restore original start shore tile
        const originalShore = waterToOriginal.get(path[0]);
        if (originalShore !== undefined && originalShore !== null) {
            path.unshift(originalShore);
        }
        // Append original to if different
        if (coercedTo.original !== null &&
            path[path.length - 1] !== coercedTo.original) {
            path.push(coercedTo.original);
        }
        return path;
    }
    /**
     * Coerce a tile to water for pathfinding.
     * If tile is already water, returns it unchanged.
     * If tile is shore, finds the best adjacent water neighbor.
     */
    coerceToWater(tile) {
        if (this.map.isWater(tile)) {
            return { water: tile, original: null };
        }
        let best = null;
        let maxScore = -1;
        for (const n of this.map.neighbors(tile)) {
            if (!this.map.isWater(n))
                continue;
            // Score by water neighbor count (connectivity)
            const score = this.countWaterNeighbors(n);
            // Pick highest connectivity
            if (score > maxScore) {
                maxScore = score;
                best = n;
            }
        }
        if (best !== null) {
            return { water: best, original: tile };
        }
        return { water: null, original: tile };
    }
    countWaterNeighbors(tile) {
        let count = 0;
        for (const n of this.map.neighbors(tile)) {
            if (this.map.isWater(n))
                count++;
        }
        return count;
    }
}
//# sourceMappingURL=ShoreCoercingTransformer.js.map