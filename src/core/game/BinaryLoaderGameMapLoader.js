import { GameMapType } from "./Game";
export class BinaryLoaderGameMapLoader {
    constructor() {
        this.maps = new Map();
    }
    createLazyLoader(importFn) {
        let cache = null;
        return () => {
            cache ?? (cache = importFn());
            return cache;
        };
    }
    getMapData(map) {
        const cachedMap = this.maps.get(map);
        if (cachedMap) {
            return cachedMap;
        }
        const key = Object.keys(GameMapType).find((k) => GameMapType[k] === map);
        const fileName = key?.toLowerCase();
        const loadBinary = (url) => fetch(url)
            .then((res) => {
            if (!res.ok)
                throw new Error(`Failed to load ${url}`);
            return res.arrayBuffer();
        })
            .then((buf) => new Uint8Array(buf));
        const mapBasePath = `/maps/${fileName}`;
        const mapData = {
            mapBin: this.createLazyLoader(() => loadBinary(`${mapBasePath}/map.bin`)),
            map4xBin: this.createLazyLoader(() => loadBinary(`${mapBasePath}/map4x.bin`)),
            map16xBin: this.createLazyLoader(() => loadBinary(`${mapBasePath}/map16x.bin`)),
            manifest: this.createLazyLoader(() => fetch(`${mapBasePath}/manifest.json`).then((res) => {
                if (!res.ok) {
                    throw new Error(`Failed to load ${mapBasePath}/manifest.json`);
                }
                return res.json();
            })),
            webpPath: `${mapBasePath}/thumbnail.webp`,
        };
        this.maps.set(map, mapData);
        return mapData;
    }
}
//# sourceMappingURL=BinaryLoaderGameMapLoader.js.map