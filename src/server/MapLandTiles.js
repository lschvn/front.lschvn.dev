import { FetchGameMapLoader } from "src/core/game/FetchGameMapLoader";
import { logger } from "./Logger";
let mapLoader = null;
const log = logger.child({ component: "MapLandTiles" });
// Gets or creates the map loader, uses FetchGameMapLoader pointing to the master server.
function getMapLoader() {
    mapLoader ?? (mapLoader = new FetchGameMapLoader("http://localhost:3000/maps"));
    return mapLoader;
}
// Gets the number of land tiles for a map
// FetchGameMapLoader already caches maps, so no need for additional caching here.
export async function getMapLandTiles(map) {
    try {
        const loader = getMapLoader();
        const mapData = loader.getMapData(map);
        const manifest = await mapData.manifest();
        return manifest.map.num_land_tiles;
    }
    catch (error) {
        log.error(`Failed to load manifest for ${map}: ${error}`, { map });
        return 1000000; // Default fallback
    }
}
//# sourceMappingURL=MapLandTiles.js.map