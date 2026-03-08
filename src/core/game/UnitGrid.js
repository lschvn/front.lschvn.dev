export class UnitGrid {
    constructor(gm) {
        this.gm = gm;
        this.cellSize = 100;
        this.grid = Array(Math.ceil(gm.height() / this.cellSize))
            .fill(null)
            .map(() => Array(Math.ceil(gm.width() / this.cellSize))
            .fill(null)
            .map(() => new Map()));
    }
    // Get grid coordinates from pixel coordinates
    getGridCoords(x, y) {
        return [Math.floor(x / this.cellSize), Math.floor(y / this.cellSize)];
    }
    // Add a unit to the grid
    addUnit(unit) {
        const tile = unit.tile();
        const [gridX, gridY] = this.getGridCoords(this.gm.x(tile), this.gm.y(tile));
        if (this.isValidCell(gridX, gridY)) {
            const unitSet = this.grid[gridY][gridX].get(unit.type());
            if (unitSet !== undefined) {
                unitSet.add(unit);
            }
            else {
                this.grid[gridY][gridX].set(unit.type(), new Set([unit]));
            }
        }
    }
    // Remove a unit from the grid
    removeUnit(unit) {
        const tile = unit.tile();
        this.removeUnitByTile(unit, tile);
    }
    removeUnitByTile(unit, tile) {
        const [gridX, gridY] = this.getGridCoords(this.gm.x(tile), this.gm.y(tile));
        if (this.isValidCell(gridX, gridY)) {
            const unitSet = this.grid[gridY][gridX].get(unit.type());
            if (unitSet !== undefined) {
                unitSet.delete(unit);
            }
        }
    }
    /**
     * Move an unit to its new cell if it changed
     */
    updateUnitCell(unit) {
        const newTile = unit.tile();
        const oldTile = unit.lastTile();
        const [gridX, gridY] = this.getGridCoords(this.gm.x(oldTile), this.gm.y(oldTile));
        const [newGridX, newGridY] = this.getGridCoords(this.gm.x(newTile), this.gm.y(newTile));
        if (gridX !== newGridX || gridY !== newGridY) {
            this.removeUnitByTile(unit, oldTile);
            this.addUnit(unit);
        }
    }
    isValidCell(gridX, gridY) {
        return (gridX >= 0 &&
            gridX < this.grid[0].length &&
            gridY >= 0 &&
            gridY < this.grid.length);
    }
    // Compute the exact cells in range of tile
    getCellsInRange(tile, range) {
        const x = this.gm.x(tile);
        const y = this.gm.y(tile);
        const cellSize = this.cellSize;
        const [gridX, gridY] = this.getGridCoords(x, y);
        const startGridX = Math.max(0, gridX - Math.ceil((range - (x % cellSize)) / cellSize));
        const endGridX = Math.min(this.grid[0].length - 1, gridX + Math.ceil((range - (cellSize - (x % cellSize))) / cellSize));
        const startGridY = Math.max(0, gridY - Math.ceil((range - (y % cellSize)) / cellSize));
        const endGridY = Math.min(this.grid.length - 1, gridY + Math.ceil((range - (cellSize - (y % cellSize))) / cellSize));
        return { startGridX, endGridX, startGridY, endGridY };
    }
    squaredDistanceFromTile(unit, tile) {
        const x = this.gm.x(tile);
        const y = this.gm.y(tile);
        const tileX = this.gm.x(unit.tile());
        const tileY = this.gm.y(unit.tile());
        const dx = tileX - x;
        const dy = tileY - y;
        const distSquared = dx * dx + dy * dy;
        return distSquared;
    }
    // Get all units within range of a point
    // Returns [unit, distanceSquared] pairs for efficient filtering
    nearbyUnits(tile, searchRange, types, predicate, includeUnderConstruction = false) {
        const nearby = [];
        const gm = this.gm;
        const x = gm.x(tile);
        const y = gm.y(tile);
        const { startGridX, endGridX, startGridY, endGridY } = this.getCellsInRange(tile, searchRange);
        const rangeSquared = searchRange * searchRange;
        if (Array.isArray(types)) {
            for (let cy = startGridY; cy <= endGridY; cy++) {
                for (let cx = startGridX; cx <= endGridX; cx++) {
                    const cell = this.grid[cy][cx];
                    for (const type of types) {
                        const unitSet = cell.get(type);
                        if (unitSet === undefined)
                            continue;
                        for (const unit of unitSet) {
                            if (!unit.isActive())
                                continue;
                            // Exclude units under construction by default (e.g., defense posts being built)
                            // But include them for spacing checks
                            if (!includeUnderConstruction && unit.isUnderConstruction())
                                continue;
                            const unitTile = unit.tile();
                            const dx = gm.x(unitTile) - x;
                            const dy = gm.y(unitTile) - y;
                            const distSquared = dx * dx + dy * dy;
                            if (distSquared > rangeSquared)
                                continue;
                            const value = { unit, distSquared };
                            if (predicate !== undefined && !predicate(value))
                                continue;
                            nearby.push(value);
                        }
                    }
                }
            }
            return nearby;
        }
        const type = types;
        for (let cy = startGridY; cy <= endGridY; cy++) {
            for (let cx = startGridX; cx <= endGridX; cx++) {
                const unitSet = this.grid[cy][cx].get(type);
                if (unitSet === undefined)
                    continue;
                for (const unit of unitSet) {
                    if (!unit.isActive())
                        continue;
                    // Exclude units under construction by default (e.g., defense posts being built)
                    // But include them for spacing checks
                    if (!includeUnderConstruction && unit.isUnderConstruction())
                        continue;
                    const unitTile = unit.tile();
                    const dx = gm.x(unitTile) - x;
                    const dy = gm.y(unitTile) - y;
                    const distSquared = dx * dx + dy * dy;
                    if (distSquared > rangeSquared)
                        continue;
                    const value = { unit, distSquared };
                    if (predicate !== undefined && !predicate(value))
                        continue;
                    nearby.push(value);
                }
            }
        }
        return nearby;
    }
    unitIsInRange(unit, tile, rangeSquared, playerId, includeUnderConstruction = false) {
        if (!unit.isActive()) {
            return false;
        }
        // Exclude units under construction by default (e.g., defense posts being built)
        // But include them for spacing checks
        if (!includeUnderConstruction && unit.isUnderConstruction()) {
            return false;
        }
        if (playerId !== undefined && unit.owner().id() !== playerId) {
            return false;
        }
        const distSquared = this.squaredDistanceFromTile(unit, tile);
        return distSquared <= rangeSquared;
    }
    // Return true if it finds an owned specific unit in range
    hasUnitNearby(tile, searchRange, type, playerId, includeUnderConstruction = false) {
        const { startGridX, endGridX, startGridY, endGridY } = this.getCellsInRange(tile, searchRange);
        const rangeSquared = searchRange * searchRange;
        for (let cy = startGridY; cy <= endGridY; cy++) {
            for (let cx = startGridX; cx <= endGridX; cx++) {
                const unitSet = this.grid[cy][cx].get(type);
                if (unitSet === undefined)
                    continue;
                for (const unit of unitSet) {
                    if (this.unitIsInRange(unit, tile, rangeSquared, playerId, includeUnderConstruction)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    // Return true if any unit of the given types matches the predicate
    anyUnitNearby(tile, searchRange, types, predicate, playerId, includeUnderConstruction = false) {
        const { startGridX, endGridX, startGridY, endGridY } = this.getCellsInRange(tile, searchRange);
        const rangeSquared = searchRange * searchRange;
        for (let cy = startGridY; cy <= endGridY; cy++) {
            for (let cx = startGridX; cx <= endGridX; cx++) {
                for (const type of types) {
                    const unitSet = this.grid[cy][cx].get(type);
                    if (unitSet === undefined)
                        continue;
                    for (const unit of unitSet) {
                        if (!this.unitIsInRange(unit, tile, rangeSquared, playerId, includeUnderConstruction)) {
                            continue;
                        }
                        if (predicate(unit)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
}
//# sourceMappingURL=UnitGrid.js.map