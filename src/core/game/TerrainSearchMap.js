export var SearchMapTileType;
(function (SearchMapTileType) {
    SearchMapTileType[SearchMapTileType["Land"] = 0] = "Land";
    SearchMapTileType[SearchMapTileType["Shore"] = 1] = "Shore";
    SearchMapTileType[SearchMapTileType["Water"] = 2] = "Water";
})(SearchMapTileType || (SearchMapTileType = {}));
export class TerrainSearchMap {
    constructor(buffer) {
        this.mapData = new Uint8Array(buffer);
        this.width = (this.mapData[1] << 8) | this.mapData[0];
        this.height = (this.mapData[3] << 8) | this.mapData[2];
    }
    node(x, y) {
        const packedByte = this.mapData[4 + y * this.width + x];
        const isLand = packedByte & 0b10000000;
        const magnitude = packedByte & 0b00011111;
        if (isLand) {
            return SearchMapTileType.Land;
        }
        if (magnitude < 10) {
            return SearchMapTileType.Shore;
        }
        return SearchMapTileType.Water;
    }
    neighbors(x, y) {
        const result = [];
        // Check all 8 adjacent tiles
        const dirs = [
            [-1, -1],
            [0, -1],
            [1, -1],
            [-1, 0],
            [1, 0],
            [-1, 1],
            [0, 1],
            [1, 1],
        ];
        for (const [dx, dy] of dirs) {
            const newX = x + dx;
            const newY = y + dy;
            // Check bounds
            if (newX >= 0 && newX < this.width && newY >= 0 && newY < this.height) {
                result.push({ x: newX, y: newY });
            }
        }
        return result;
    }
    getWidth() {
        return this.width;
    }
    getHeight() {
        return this.height;
    }
}
//# sourceMappingURL=TerrainSearchMap.js.map