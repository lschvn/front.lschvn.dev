import { Cell } from "../../game/Game";
import { calculateBoundingBox } from "../../Util";
export function randTerritoryTileArray(random, mg, player, numTiles) {
    const boundingBox = calculateBoundingBox(mg, player.borderTiles());
    const tiles = [];
    for (let i = 0; i < numTiles; i++) {
        const tile = randTerritoryTile(random, mg, player, boundingBox);
        if (tile !== null) {
            tiles.push(tile);
        }
    }
    return tiles;
}
function randTerritoryTile(random, mg, p, boundingBox = null) {
    // Prefer sampling inside the bounding box first (fast, usually good enough)
    boundingBox ?? (boundingBox = calculateBoundingBox(mg, p.borderTiles()));
    for (let i = 0; i < 100; i++) {
        const randX = random.nextInt(boundingBox.min.x, boundingBox.max.x);
        const randY = random.nextInt(boundingBox.min.y, boundingBox.max.y);
        if (!mg.isOnMap(new Cell(randX, randY))) {
            // Sanity check should never happen
            continue;
        }
        const randTile = mg.ref(randX, randY);
        if (mg.owner(randTile) === p) {
            return randTile;
        }
    }
    if (p.numTilesOwned() <= 100) {
        return random.randElement(Array.from(p.tiles()));
    }
    return null;
}
//# sourceMappingURL=NationUtils.js.map