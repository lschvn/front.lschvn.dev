import { PathFinding } from "../../../../src/core/pathfinding/PathFinder.js";
import { DebugSpan } from "../../../../src/core/utilities/DebugSpan.js";
import { getAdapter } from "../../utils.js";
import { COMPARISON_ADAPTERS, loadMap } from "./maps.js";
// Cache adapters per map
const adapterCache = new Map();
/**
 * Get or create an adapter for a map
 */
function getOrCreateAdapter(mapName, adapterName, game) {
    if (!adapterCache.has(mapName)) {
        adapterCache.set(mapName, new Map());
    }
    const mapAdapters = adapterCache.get(mapName);
    if (!mapAdapters.has(adapterName)) {
        mapAdapters.set(adapterName, getAdapter(game, adapterName));
    }
    return mapAdapters.get(adapterName);
}
/**
 * Convert TileRef array to coordinate array
 */
function pathToCoords(path, game) {
    if (!path)
        return null;
    return path.map((tile) => [game.x(tile), game.y(tile)]);
}
/**
 * Extract timings from DebugSpan hierarchy
 * Flattens nested spans into { spanName: duration } format
 */
function extractTimings(span) {
    const timings = {};
    if (span.duration !== undefined) {
        timings[span.name] = span.duration;
    }
    for (const child of span.children) {
        Object.assign(timings, extractTimings(child));
    }
    return timings;
}
/**
 * Compute primary path using PathFinding.Water with debug info
 */
function computePrimaryPath(game, fromRef, toRef) {
    const miniMap = game.miniMap();
    // Use standard PathFinding.Water
    const pf = PathFinding.Water(game);
    // Enable DebugSpan to capture internal state
    DebugSpan.enable();
    const path = pf.findPath(fromRef, toRef);
    // Get span data and disable
    const span = DebugSpan.getLastSpan();
    DebugSpan.disable();
    // Convert node path (miniMap coords) to full map coords
    let nodePath = null;
    const spanNodePath = span?.data?.nodePath;
    if (spanNodePath) {
        nodePath = spanNodePath.map((tile) => {
            const x = miniMap.x(tile) * 2;
            const y = miniMap.y(tile) * 2;
            return [x, y];
        });
    }
    // Convert initialPath (miniMap TileRefs) to full map coords
    let initialPath = null;
    const spanInitialPath = span?.data?.initialPath;
    if (spanInitialPath) {
        initialPath = spanInitialPath.map((tile) => {
            const x = miniMap.x(tile) * 2;
            const y = miniMap.y(tile) * 2;
            return [x, y];
        });
    }
    let cachedSegmentsUsed = null;
    if (span?.data?.cachedSegmentsUsed !== undefined) {
        cachedSegmentsUsed = span.data.cachedSegmentsUsed;
    }
    // Extract timings from span hierarchy
    const timings = span ? extractTimings(span) : {};
    return {
        path: pathToCoords(path, game),
        length: path ? path.length : 0,
        time: timings["hpa:findPath"] || 0,
        debug: {
            nodePath,
            initialPath,
            cachedSegmentsUsed,
            timings,
        },
    };
}
/**
 * Compute comparison path using adapter
 */
function computeComparisonPath(adapter, game, fromRef, toRef, adapterName) {
    const start = performance.now();
    const path = adapter.findPath(fromRef, toRef);
    const time = performance.now() - start;
    return {
        adapter: adapterName,
        path: pathToCoords(path, game),
        length: path ? path.length : 0,
        time,
    };
}
/**
 * Compute pathfinding between two points
 */
export async function computePath(mapName, from, to, options = {}) {
    const { game } = await loadMap(mapName);
    // Convert coordinates to TileRefs
    const fromRef = game.ref(from[0], from[1]);
    const toRef = game.ref(to[0], to[1]);
    // Validate that both points are water tiles
    if (!game.isWater(fromRef)) {
        throw new Error(`Start point (${from[0]}, ${from[1]}) is not water`);
    }
    if (!game.isWater(toRef)) {
        throw new Error(`End point (${to[0]}, ${to[1]}) is not water`);
    }
    // Compute primary path (PathFinding.Water with debug)
    const primary = computePrimaryPath(game, fromRef, toRef);
    // Compute comparison paths
    const selectedAdapters = options.adapters ?? COMPARISON_ADAPTERS;
    const comparisons = [];
    for (const adapterName of selectedAdapters) {
        if (!COMPARISON_ADAPTERS.includes(adapterName)) {
            console.warn(`Unknown adapter: ${adapterName}, skipping`);
            continue;
        }
        try {
            const adapter = getOrCreateAdapter(mapName, adapterName, game);
            const result = computeComparisonPath(adapter, game, fromRef, toRef, adapterName);
            comparisons.push(result);
        }
        catch (error) {
            console.error(`Error with adapter ${adapterName}:`, error);
            comparisons.push({
                adapter: adapterName,
                path: null,
                length: 0,
                time: 0,
            });
        }
    }
    return { primary, comparisons };
}
/**
 * Clear pathfinding adapter caches
 */
export function clearAdapterCaches() {
    adapterCache.clear();
}
//# sourceMappingURL=pathfinding.js.map