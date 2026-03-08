export var RailType;
(function (RailType) {
    RailType[RailType["VERTICAL"] = 0] = "VERTICAL";
    RailType[RailType["HORIZONTAL"] = 1] = "HORIZONTAL";
    RailType[RailType["TOP_LEFT"] = 2] = "TOP_LEFT";
    RailType[RailType["TOP_RIGHT"] = 3] = "TOP_RIGHT";
    RailType[RailType["BOTTOM_LEFT"] = 4] = "BOTTOM_LEFT";
    RailType[RailType["BOTTOM_RIGHT"] = 5] = "BOTTOM_RIGHT";
})(RailType || (RailType = {}));
export function computeRailTiles(game, tiles) {
    if (tiles.length === 0)
        return [];
    if (tiles.length === 1) {
        return [{ tile: tiles[0], type: RailType.VERTICAL }];
    }
    const railTypes = [];
    // Inverse direction computation for the first tile
    railTypes.push({
        tile: tiles[0],
        type: computeExtremityDirection(game, tiles[0], tiles[1]),
    });
    for (let i = 1; i < tiles.length - 1; i++) {
        const direction = computeDirection(game, tiles[i - 1], tiles[i], tiles[i + 1]);
        railTypes.push({ tile: tiles[i], type: direction });
    }
    railTypes.push({
        tile: tiles[tiles.length - 1],
        type: computeExtremityDirection(game, tiles[tiles.length - 1], tiles[tiles.length - 2]),
    });
    return railTypes;
}
function computeExtremityDirection(game, tile, next) {
    const x = game.x(tile);
    const y = game.y(tile);
    const nextX = game.x(next);
    const nextY = game.y(next);
    const dx = nextX - x;
    const dy = nextY - y;
    if (dx === 0 && dy === 0)
        return RailType.VERTICAL; // No movement
    if (dx === 0) {
        return RailType.VERTICAL;
    }
    else if (dy === 0) {
        return RailType.HORIZONTAL;
    }
    return RailType.VERTICAL;
}
export function computeDirection(game, prev, current, next) {
    const x1 = game.x(prev);
    const y1 = game.y(prev);
    const x2 = game.x(current);
    const y2 = game.y(current);
    const x3 = game.x(next);
    const y3 = game.y(next);
    const dx1 = x2 - x1;
    const dy1 = y2 - y1;
    const dx2 = x3 - x2;
    const dy2 = y3 - y2;
    // Straight line
    if (dx1 === dx2 && dy1 === dy2) {
        if (dx1 !== 0)
            return RailType.HORIZONTAL;
        if (dy1 !== 0)
            return RailType.VERTICAL;
    }
    // Turn (corner) cases
    if ((dx1 === 0 && dx2 !== 0) || (dx1 !== 0 && dx2 === 0)) {
        // Now figure out which type of corner
        if (dx1 === 0 && dx2 === 1 && dy1 === -1)
            return RailType.BOTTOM_RIGHT;
        if (dx1 === 0 && dx2 === -1 && dy1 === -1)
            return RailType.BOTTOM_LEFT;
        if (dx1 === 0 && dx2 === 1 && dy1 === 1)
            return RailType.TOP_RIGHT;
        if (dx1 === 0 && dx2 === -1 && dy1 === 1)
            return RailType.TOP_LEFT;
        if (dx1 === 1 && dx2 === 0 && dy2 === -1)
            return RailType.TOP_LEFT;
        if (dx1 === -1 && dx2 === 0 && dy2 === -1)
            return RailType.TOP_RIGHT;
        if (dx1 === 1 && dx2 === 0 && dy2 === 1)
            return RailType.BOTTOM_LEFT;
        if (dx1 === -1 && dx2 === 0 && dy2 === 1)
            return RailType.BOTTOM_RIGHT;
    }
    console.warn(`Invalid rail segment: ${dx1}:${dy1}, ${dx2}:${dy2}`);
    return RailType.VERTICAL;
}
/**
 * A list of tile that can be incrementally painted each tick
 */
export class RailroadView {
    constructor(id, railTiles, complete = false) {
        this.id = id;
        this.railTiles = railTiles;
        this.headIndex = 0;
        this.increment = 3;
        // If the railroad is considered complete, no drawing or animation is required
        this.tailIndex = complete ? 0 : railTiles.length;
    }
    isComplete() {
        return this.headIndex >= this.tailIndex;
    }
    tiles() {
        return this.railTiles;
    }
    remainingTiles() {
        if (this.isComplete()) {
            // Animation complete, no tiles need to be painted
            return [];
        }
        return this.railTiles.slice(this.headIndex, this.tailIndex);
    }
    drawnTiles() {
        if (this.isComplete()) {
            // Animation complete, every tiles have been painted
            return this.tiles();
        }
        let drawnTiles = this.railTiles.slice(0, this.headIndex);
        drawnTiles = drawnTiles.concat(this.railTiles.slice(this.tailIndex));
        return drawnTiles;
    }
    tick() {
        if (this.isComplete())
            return [];
        let updatedRailTiles;
        // Check if remaining tiles can be done all at once
        if (this.tailIndex - this.headIndex <= 2 * this.increment) {
            updatedRailTiles = this.railTiles.slice(this.headIndex, this.tailIndex);
        }
        else {
            updatedRailTiles = [
                ...this.railTiles.slice(this.headIndex, this.headIndex + this.increment),
                ...this.railTiles.slice(this.tailIndex - this.increment, this.tailIndex),
            ];
        }
        this.headIndex = Math.min(this.headIndex + this.increment, this.tailIndex);
        this.tailIndex = Math.max(this.tailIndex - this.increment, this.headIndex);
        return updatedRailTiles;
    }
}
//# sourceMappingURL=RailroadView.js.map