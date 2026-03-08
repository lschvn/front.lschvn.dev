import { GameMapType } from "./Game";
export class FetchGameMapLoader {
    constructor(prefix, cacheBuster) {
        this.prefix = prefix;
        this.cacheBuster = cacheBuster;
        this.maps = new Map();
    }
    getMapData(map) {
        const cachedMap = this.maps.get(map);
        if (cachedMap) {
            return cachedMap;
        }
        const key = Object.keys(GameMapType).find((k) => GameMapType[k] === map);
        const fileName = key?.toLowerCase();
        if (!fileName) {
            throw new Error(`Unknown map: ${map}`);
        }
        const mapData = {
            mapBin: () => this.loadBinaryFromUrl(this.url(fileName, "map.bin")),
            map4xBin: () => this.loadBinaryFromUrl(this.url(fileName, "map4x.bin")),
            map16xBin: () => this.loadBinaryFromUrl(this.url(fileName, "map16x.bin")),
            manifest: () => this.loadJsonFromUrl(this.url(fileName, "manifest.json")),
            webpPath: this.url(fileName, "thumbnail.webp"),
        };
        this.maps.set(map, mapData);
        return mapData;
    }
    url(map, path) {
        let url = `${this.prefix}/${map}/${path}`;
        if (this.cacheBuster) {
            url += `${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(this.cacheBuster.trim())}`;
        }
        return url;
    }
    async loadBinaryFromUrl(url) {
        const startTime = performance.now();
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.statusText}`);
        }
        const data = await response.arrayBuffer();
        console.log(`[MapLoader] ${url}: ${(performance.now() - startTime).toFixed(0)}ms`);
        return new Uint8Array(data);
    }
    async loadJsonFromUrl(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.statusText}`);
        }
        return response.json();
    }
}
//# sourceMappingURL=FetchGameMapLoader.js.map