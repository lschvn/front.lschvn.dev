import { GameUpdateType } from "./GameUpdates";
export class Railroad {
    constructor(from, to, tiles, id) {
        this.from = from;
        this.to = to;
        this.tiles = tiles;
        this.id = id;
    }
    delete(game) {
        game.addUpdate({
            type: GameUpdateType.RailroadDestructionEvent,
            id: this.id,
        });
        this.from.removeRailroad(this);
        this.to.removeRailroad(this);
    }
    getClosestTileIndex(game, to) {
        if (this.tiles.length === 0)
            return -1;
        const toX = game.x(to);
        const toY = game.y(to);
        let closestIndex = 0;
        let minDistSquared = Infinity;
        for (let i = 0; i < this.tiles.length; i++) {
            const tile = this.tiles[i];
            const dx = game.x(tile) - toX;
            const dy = game.y(tile) - toY;
            const distSquared = dx * dx + dy * dy;
            if (distSquared < minDistSquared) {
                minDistSquared = distSquared;
                closestIndex = i;
            }
        }
        return closestIndex;
    }
}
export function getOrientedRailroad(from, to) {
    const railroad = from.getRailroadTo(to);
    if (!railroad)
        return null;
    // If tiles are stored from -> to, we go forward when railroad.to === to
    const forward = railroad.to === to;
    return new OrientedRailroad(railroad, forward);
}
/**
 * Wrap a railroad with a direction so it always starts at tiles[0]
 */
export class OrientedRailroad {
    constructor(railroad, forward) {
        this.railroad = railroad;
        this.forward = forward;
        this.tiles = [];
        this.tiles = this.forward
            ? this.railroad.tiles
            : [...this.railroad.tiles].reverse();
    }
    getTiles() {
        return this.tiles;
    }
    getStart() {
        return this.forward ? this.railroad.from : this.railroad.to;
    }
    getEnd() {
        return this.forward ? this.railroad.to : this.railroad.from;
    }
}
//# sourceMappingURL=Railroad.js.map