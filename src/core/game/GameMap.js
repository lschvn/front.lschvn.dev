import { Cell, TerrainType } from "./Game";
export class GameMapImpl {
    constructor(width, height, terrainData, numLandTiles_) {
        this.numLandTiles_ = numLandTiles_;
        this._numTilesWithFallout = 0;
        if (terrainData.length !== width * height) {
            throw new Error(`Terrain data length ${terrainData.length} doesn't match dimensions ${width}x${height}`);
        }
        this.width_ = width;
        this.height_ = height;
        this.terrain = terrainData;
        this.state = new Uint16Array(width * height);
        // Precompute the LUTs
        let ref = 0;
        this.refToX = new Array(width * height);
        this.refToY = new Array(width * height);
        this.yToRef = new Array(height);
        for (let y = 0; y < height; y++) {
            this.yToRef[y] = ref;
            for (let x = 0; x < width; x++) {
                this.refToX[ref] = x;
                this.refToY[ref] = y;
                ref++;
            }
        }
    }
    numTilesWithFallout() {
        return this._numTilesWithFallout;
    }
    ref(x, y) {
        if (!this.isValidCoord(x, y)) {
            throw new Error(`Invalid coordinates: ${x},${y}`);
        }
        return this.yToRef[y] + x;
    }
    isValidRef(ref) {
        return ref >= 0 && ref < this.refToX.length;
    }
    x(ref) {
        return this.refToX[ref];
    }
    y(ref) {
        return this.refToY[ref];
    }
    cell(ref) {
        return new Cell(this.x(ref), this.y(ref));
    }
    width() {
        return this.width_;
    }
    height() {
        return this.height_;
    }
    numLandTiles() {
        return this.numLandTiles_;
    }
    isValidCoord(x, y) {
        return x >= 0 && x < this.width_ && y >= 0 && y < this.height_;
    }
    // Terrain getters (immutable)
    isLand(ref) {
        return Boolean(this.terrain[ref] & (1 << GameMapImpl.IS_LAND_BIT));
    }
    isOceanShore(ref) {
        return (this.isLand(ref) && this.neighbors(ref).some((tr) => this.isOcean(tr)));
    }
    isOcean(ref) {
        return Boolean(this.terrain[ref] & (1 << GameMapImpl.OCEAN_BIT));
    }
    isShoreline(ref) {
        return Boolean(this.terrain[ref] & (1 << GameMapImpl.SHORELINE_BIT));
    }
    magnitude(ref) {
        return this.terrain[ref] & GameMapImpl.MAGNITUDE_MASK;
    }
    // State getters and setters (mutable)
    ownerID(ref) {
        return this.state[ref] & GameMapImpl.PLAYER_ID_MASK;
    }
    hasOwner(ref) {
        return this.ownerID(ref) !== 0;
    }
    setOwnerID(ref, playerId) {
        if (playerId > GameMapImpl.PLAYER_ID_MASK) {
            throw new Error(`Player ID ${playerId} exceeds maximum value ${GameMapImpl.PLAYER_ID_MASK}`);
        }
        this.state[ref] =
            (this.state[ref] & ~GameMapImpl.PLAYER_ID_MASK) | playerId;
    }
    hasFallout(ref) {
        return Boolean(this.state[ref] & (1 << GameMapImpl.FALLOUT_BIT));
    }
    setFallout(ref, value) {
        const existingFallout = this.hasFallout(ref);
        if (value) {
            if (!existingFallout) {
                this._numTilesWithFallout++;
                this.state[ref] |= 1 << GameMapImpl.FALLOUT_BIT;
            }
        }
        else {
            if (existingFallout) {
                this._numTilesWithFallout--;
                this.state[ref] &= ~(1 << GameMapImpl.FALLOUT_BIT);
            }
        }
    }
    hasSuppression(ref) {
        return Boolean(this.state[ref] & (1 << GameMapImpl.SUPPRESSION_BIT));
    }
    setSuppression(ref, value) {
        if (value) {
            this.state[ref] |= 1 << GameMapImpl.SUPPRESSION_BIT;
        }
        else {
            this.state[ref] &= ~(1 << GameMapImpl.SUPPRESSION_BIT);
        }
    }
    isOnEdgeOfMap(ref) {
        const x = this.x(ref);
        const y = this.y(ref);
        return (x === 0 || x === this.width() - 1 || y === 0 || y === this.height() - 1);
    }
    isBorder(ref) {
        return this.neighbors(ref).some((tr) => this.ownerID(tr) !== this.ownerID(ref));
    }
    hasDefenseBonus(ref) {
        return Boolean(this.state[ref] & (1 << GameMapImpl.DEFENSE_BONUS_BIT));
    }
    setDefenseBonus(ref, value) {
        if (value) {
            this.state[ref] |= 1 << GameMapImpl.DEFENSE_BONUS_BIT;
        }
        else {
            this.state[ref] &= ~(1 << GameMapImpl.DEFENSE_BONUS_BIT);
        }
    }
    // Helper methods
    isWater(ref) {
        return !this.isLand(ref);
    }
    isLake(ref) {
        return !this.isLand(ref) && !this.isOcean(ref);
    }
    isShore(ref) {
        return this.isLand(ref) && this.isShoreline(ref);
    }
    cost(ref) {
        return this.magnitude(ref) < 10 ? 2 : 1;
    }
    // if updating these magnitude values, also update
    // `../../../map-generator/map_generator.go` `getThumbnailColor`
    terrainType(ref) {
        if (this.isLand(ref)) {
            const magnitude = this.magnitude(ref);
            if (magnitude < 10)
                return TerrainType.Plains;
            if (magnitude < 20)
                return TerrainType.Highland;
            return TerrainType.Mountain;
        }
        return this.isOcean(ref) ? TerrainType.Ocean : TerrainType.Lake;
    }
    neighbors(ref) {
        const neighbors = [];
        const w = this.width_;
        const x = this.refToX[ref];
        if (ref >= w)
            neighbors.push(ref - w);
        if (ref < (this.height_ - 1) * w)
            neighbors.push(ref + w);
        if (x !== 0)
            neighbors.push(ref - 1);
        if (x !== w - 1)
            neighbors.push(ref + 1);
        return neighbors;
    }
    forEachTile(fn) {
        for (let ref = 0; ref < this.width_ * this.height_; ref++) {
            fn(ref);
        }
    }
    manhattanDist(c1, c2) {
        return (Math.abs(this.x(c1) - this.x(c2)) + Math.abs(this.y(c1) - this.y(c2)));
    }
    euclideanDistSquared(c1, c2) {
        const x = this.x(c1) - this.x(c2);
        const y = this.y(c1) - this.y(c2);
        return x * x + y * y;
    }
    circleSearch(tile, radius, filter) {
        const center = { x: this.x(tile), y: this.y(tile) };
        const tiles = new Set();
        const minX = Math.max(0, center.x - radius);
        const maxX = Math.min(this.width_ - 1, center.x + radius);
        const minY = Math.max(0, center.y - radius);
        const maxY = Math.min(this.height_ - 1, center.y + radius);
        for (let i = minX; i <= maxX; ++i) {
            for (let j = minY; j <= maxY; j++) {
                const t = this.yToRef[j] + i;
                const d2 = this.euclideanDistSquared(tile, t);
                if (d2 > radius * radius)
                    continue;
                if (!filter || filter(t, d2)) {
                    tiles.add(t);
                }
            }
        }
        return tiles;
    }
    bfs(tile, filter) {
        const seen = new Set();
        const q = [];
        if (filter(this, tile)) {
            seen.add(tile);
            q.push(tile);
        }
        while (q.length > 0) {
            const curr = q.pop();
            if (curr === undefined)
                continue;
            for (const n of this.neighbors(curr)) {
                if (!seen.has(n) && filter(this, n)) {
                    seen.add(n);
                    q.push(n);
                }
            }
        }
        return seen;
    }
    tileState(tile) {
        return this.state[tile];
    }
    updateTile(tile, state) {
        const existingFallout = this.hasFallout(tile);
        this.state[tile] = state;
        const newFallout = this.hasFallout(tile);
        if (existingFallout && !newFallout) {
            this._numTilesWithFallout--;
        }
        if (!existingFallout && newFallout) {
            this._numTilesWithFallout++;
        }
    }
}
// Terrain bits (Uint8Array)
GameMapImpl.IS_LAND_BIT = 7;
GameMapImpl.SHORELINE_BIT = 6;
GameMapImpl.OCEAN_BIT = 5;
GameMapImpl.MAGNITUDE_MASK = 0x1f; // 11111 in binary
// State bits (Uint16Array)
GameMapImpl.PLAYER_ID_MASK = 0xfff;
GameMapImpl.FALLOUT_BIT = 13;
GameMapImpl.DEFENSE_BONUS_BIT = 14;
GameMapImpl.SUPPRESSION_BIT = 15;
export function euclDistFN(root, dist, center = false) {
    const dist2 = dist * dist;
    if (!center) {
        return (gm, n) => gm.euclideanDistSquared(root, n) <= dist2;
    }
    else {
        return (gm, n) => {
            // shifts the root tile’s coordinates by -0.5 so that its “center”
            // center becomes the corner of four pixels rather than the middle of one pixel.
            // just makes things based off even pixels instead of odd. Used to use 9x9 icons now 10x10 icons etc...
            const rootX = gm.x(root) - 0.5;
            const rootY = gm.y(root) - 0.5;
            const dx = gm.x(n) - rootX;
            const dy = gm.y(n) - rootY;
            return dx * dx + dy * dy <= dist2;
        };
    }
}
export function manhattanDistFN(root, dist, center = false) {
    if (!center) {
        return (gm, n) => gm.manhattanDist(root, n) <= dist;
    }
    else {
        return (gm, n) => {
            const rootX = gm.x(root) - 0.5;
            const rootY = gm.y(root) - 0.5;
            const dx = Math.abs(gm.x(n) - rootX);
            const dy = Math.abs(gm.y(n) - rootY);
            return dx + dy <= dist;
        };
    }
}
export function rectDistFN(root, dist, center = false) {
    if (!center) {
        return (gm, n) => {
            const dx = Math.abs(gm.x(n) - gm.x(root));
            const dy = Math.abs(gm.y(n) - gm.y(root));
            return dx <= dist && dy <= dist;
        };
    }
    else {
        return (gm, n) => {
            const rootX = gm.x(root) - 0.5;
            const rootY = gm.y(root) - 0.5;
            const dx = Math.abs(gm.x(n) - rootX);
            const dy = Math.abs(gm.y(n) - rootY);
            return dx <= dist && dy <= dist;
        };
    }
}
function isInIsometricTile(center, tile, yOffset, distance) {
    const dx = Math.abs(tile.x - center.x);
    const dy = Math.abs(tile.y - (center.y + yOffset));
    return dx + dy * 2 <= distance + 1;
}
export function isometricDistFN(root, dist, center = false) {
    if (!center) {
        return (gm, n) => gm.manhattanDist(root, n) <= dist;
    }
    else {
        return (gm, n) => {
            const rootX = gm.x(root) - 0.5;
            const rootY = gm.y(root) - 0.5;
            return isInIsometricTile({ x: rootX, y: rootY }, { x: gm.x(n), y: gm.y(n) }, 0, dist);
        };
    }
}
export function hexDistFN(root, dist, center = false) {
    if (!center) {
        return (gm, n) => {
            const dx = Math.abs(gm.x(n) - gm.x(root));
            const dy = Math.abs(gm.y(n) - gm.y(root));
            return dx <= dist && dy <= dist && dx + dy <= dist * 1.5;
        };
    }
    else {
        return (gm, n) => {
            const rootX = gm.x(root) - 0.5;
            const rootY = gm.y(root) - 0.5;
            const dx = Math.abs(gm.x(n) - rootX);
            const dy = Math.abs(gm.y(n) - rootY);
            return dx <= dist && dy <= dist && dx + dy <= dist * 1.5;
        };
    }
}
export function andFN(x, y) {
    return (gm, tile) => x(gm, tile) && y(gm, tile);
}
//# sourceMappingURL=GameMap.js.map