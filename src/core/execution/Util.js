import { Structures } from "../game/Game";
import { euclDistFN } from "../game/GameMap";
/**
 * Counts how many tiles each player has in the nuke's blast zone.
 *
 * returns Map of player ID and weighted tile count
 */
export function computeNukeBlastCounts(params) {
    const { gm, targetTile, magnitude } = params;
    const inner2 = magnitude.inner * magnitude.inner;
    const counts = new Map();
    gm.circleSearch(targetTile, magnitude.outer, (tile, d2) => {
        const ownerSmallId = gm.ownerID(tile);
        if (ownerSmallId > 0) {
            const weight = d2 <= inner2 ? 1 : 0.5;
            const prev = counts.get(ownerSmallId) ?? 0;
            counts.set(ownerSmallId, prev + weight);
        }
        return true;
    });
    return counts;
}
// Checks if nuking this tile would break an alliance.
// Returns true if either:
// 1. The weighted tile count for any ally exceeds the threshold
// 2. Any allied structure would be destroyed
export function wouldNukeBreakAlliance(params) {
    const { game, targetTile, magnitude, allySmallIds, threshold } = params;
    if (allySmallIds.size === 0) {
        return false;
    }
    // Check if any allied structure would be destroyed
    const wouldDestroyAlliedStructure = game.anyUnitNearby(targetTile, magnitude.outer, Structures.types, (unit) => unit.owner().isPlayer() && allySmallIds.has(unit.owner().smallID()));
    if (wouldDestroyAlliedStructure)
        return true;
    const inner2 = magnitude.inner * magnitude.inner;
    const allyTileCounts = new Map();
    let result = false;
    game.circleSearch(targetTile, magnitude.outer, (tile, d2) => {
        const ownerSmallId = game.ownerID(tile);
        if (ownerSmallId > 0 && allySmallIds.has(ownerSmallId)) {
            const weight = d2 <= inner2 ? 1 : 0.5;
            const newCount = (allyTileCounts.get(ownerSmallId) ?? 0) + weight;
            allyTileCounts.set(ownerSmallId, newCount);
            if (newCount > threshold) {
                result = true;
                return false; // Found one! Stop searching.
            }
        }
        return true;
    });
    return result;
}
// Same as wouldNukeBreakAlliance(), but takes time to find every player
// that would be "angered" from this nuke.
// This includes unallied players!
export function listNukeBreakAlliance(params) {
    const { game, targetTile, magnitude, threshold } = params;
    // Collect all players that should have alliance broken:
    // either exceeds tile threshold OR has a structure in blast radius
    const playersToBreakAllianceWith = new Set();
    // compute tile breakage threshold
    const blastCounts = computeNukeBlastCounts({
        gm: game,
        targetTile,
        magnitude,
    });
    for (const [playerSmallId, totalWeight] of blastCounts) {
        if (totalWeight > threshold) {
            playersToBreakAllianceWith.add(playerSmallId);
        }
    }
    // Also check if any allied structures would be destroyed
    game
        .nearbyUnits(targetTile, magnitude.outer, Structures.types)
        .forEach(({ unit }) => playersToBreakAllianceWith.add(unit.owner().smallID()));
    return playersToBreakAllianceWith;
}
export function getSpawnTiles(gm, tile, requireAllValid = false) {
    const spawnTiles = Array.from(gm.bfs(tile, euclDistFN(tile, 4, true)));
    const isInvalid = (t) => gm.hasOwner(t) || !gm.isLand(t);
    if (!requireAllValid) {
        return spawnTiles.filter((t) => !isInvalid(t));
    }
    if (spawnTiles.some(isInvalid)) {
        return null;
    }
    return spawnTiles;
}
export function closestTile(gm, refs, tile) {
    let minDistance = Infinity;
    let minRef = null;
    for (const ref of refs) {
        const distance = gm.manhattanDist(ref, tile);
        if (distance < minDistance) {
            minDistance = distance;
            minRef = ref;
        }
    }
    return [minRef, minDistance];
}
export function closestTwoTiles(gm, x, y) {
    const xSorted = Array.from(x).sort((a, b) => gm.x(a) - gm.x(b));
    const ySorted = Array.from(y).sort((a, b) => gm.x(a) - gm.x(b));
    if (xSorted.length === 0 || ySorted.length === 0) {
        return null;
    }
    let i = 0;
    let j = 0;
    let minDistance = Infinity;
    let result = { x: xSorted[0], y: ySorted[0] };
    while (i < xSorted.length && j < ySorted.length) {
        const currentX = xSorted[i];
        const currentY = ySorted[j];
        const distance = Math.abs(gm.x(currentX) - gm.x(currentY)) +
            Math.abs(gm.y(currentX) - gm.y(currentY));
        if (distance < minDistance) {
            minDistance = distance;
            result = { x: currentX, y: currentY };
        }
        // If we're at the end of X, must move Y forward
        if (i === xSorted.length - 1) {
            j++;
        }
        // If we're at the end of Y, must move X forward
        else if (j === ySorted.length - 1) {
            i++;
        }
        // Otherwise, move whichever pointer has smaller x value
        else if (gm.x(currentX) < gm.x(currentY)) {
            i++;
        }
        else {
            j++;
        }
    }
    return result;
}
/**
 * Calculates the center of a player's territory using geometric approach.
 * Uses the bounding box center and verifies ownership, falling back to nearest border tile if necessary.
 *
 * @param game - The game instance
 * @param target - The player whose territory center to calculate
 * @returns The tile reference for the territory center, or null if no valid center found
 */
export function calculateTerritoryCenter(game, target) {
    const borderTiles = target.borderTiles();
    if (borderTiles.size === 0)
        return null;
    // Calculate bounding box center in a single pass through border tiles
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const tile of borderTiles) {
        const x = game.x(tile);
        const y = game.y(tile);
        if (x < minX)
            minX = x;
        if (x > maxX)
            maxX = x;
        if (y < minY)
            minY = y;
        if (y > maxY)
            maxY = y;
    }
    const centerX = Math.floor((minX + maxX) / 2);
    const centerY = Math.floor((minY + maxY) / 2);
    const centerTile = game.ref(centerX, centerY);
    // Verify ownership of the center tile
    if (game.owner(centerTile) === target) {
        return centerTile;
    }
    // Fall back to nearest border tile if center is not owned
    let closestTile = null;
    let closestDistanceSquared = Infinity;
    for (const tile of borderTiles) {
        const dx = game.x(tile) - centerX;
        const dy = game.y(tile) - centerY;
        const distSquared = dx * dx + dy * dy;
        if (distSquared < closestDistanceSquared) {
            closestDistanceSquared = distSquared;
            closestTile = tile;
        }
    }
    return closestTile;
}
//# sourceMappingURL=Util.js.map