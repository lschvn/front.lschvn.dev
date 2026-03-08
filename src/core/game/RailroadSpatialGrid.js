export class RailSpatialGrid {
    constructor(game, cellSize) {
        this.game = game;
        this.cellSize = cellSize;
        this.cells = new Map();
        // Quick access to avoid iterating over the cells
        this.railToCells = new Map();
        if (cellSize <= 0) {
            throw new Error("cellSize must be > 0");
        }
    }
    register(rail) {
        // Defensive: avoid double-registration but it should never happen
        this.unregister(rail);
        const railCells = new Set();
        for (const tile of rail.tiles) {
            const { cx, cy } = this.cellOf(this.game.x(tile), this.game.y(tile));
            const k = this.key(cx, cy);
            if (railCells.has(k))
                continue;
            let set = this.cells.get(k);
            if (!set) {
                set = new Set();
                this.cells.set(k, set);
            }
            railCells.add(k);
            set.add(rail);
        }
        if (railCells.size > 0) {
            this.railToCells.set(rail, railCells);
        }
    }
    unregister(rail) {
        const keys = this.railToCells.get(rail);
        if (!keys)
            return;
        for (const k of keys) {
            const set = this.cells.get(k);
            if (!set)
                continue;
            set.delete(rail);
            if (set.size === 0) {
                this.cells.delete(k);
            }
        }
        this.railToCells.delete(rail);
    }
    query(tile, radius) {
        const x = this.game.x(tile);
        const y = this.game.y(tile);
        const minX = x - radius;
        const minY = y - radius;
        const maxX = x + radius;
        const maxY = y + radius;
        const c0 = this.cellOf(minX, minY);
        const c1 = this.cellOf(maxX, maxY);
        const result = new Set();
        for (let cx = c0.cx; cx <= c1.cx; cx++) {
            for (let cy = c0.cy; cy <= c1.cy; cy++) {
                const set = this.cells.get(this.key(cx, cy));
                if (!set)
                    continue;
                for (const rail of set) {
                    result.add(rail);
                }
            }
        }
        return result;
    }
    key(cx, cy) {
        return `${cx}:${cy}`;
    }
    cellOf(x, y) {
        return {
            cx: Math.floor(x / this.cellSize),
            cy: Math.floor(y / this.cellSize),
        };
    }
}
//# sourceMappingURL=RailroadSpatialGrid.js.map