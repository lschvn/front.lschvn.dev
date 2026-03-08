import { RailType } from "./RailroadView";
const railTypeToFunctionMap = {
    [RailType.TOP_RIGHT]: topRightRailroadCornerRects,
    [RailType.BOTTOM_LEFT]: bottomLeftRailroadCornerRects,
    [RailType.TOP_LEFT]: topLeftRailroadCornerRects,
    [RailType.BOTTOM_RIGHT]: bottomRightRailroadCornerRects,
    [RailType.HORIZONTAL]: horizontalRailroadRects,
    [RailType.VERTICAL]: verticalRailroadRects,
};
const railTypeToBridgeFunctionMap = {
    [RailType.TOP_RIGHT]: topRightBridgeCornerRects,
    [RailType.BOTTOM_LEFT]: bottomLeftBridgeCornerRects,
    [RailType.TOP_LEFT]: topLeftBridgeCornerRects,
    [RailType.BOTTOM_RIGHT]: bottomRightBridgeCornerRects,
    [RailType.HORIZONTAL]: horizontalBridge,
    [RailType.VERTICAL]: verticalBridge,
};
export function getRailroadRects(type) {
    const railRects = railTypeToFunctionMap[type];
    if (!railRects) {
        // Should never happen
        throw new Error(`Unsupported RailType: ${type}`);
    }
    return railRects();
}
function horizontalRailroadRects() {
    // x/y/w/h
    const rects = [
        [-1, -1, 2, 1],
        [-1, 1, 2, 1],
        [-1, 0, 1, 1],
    ];
    return rects;
}
function verticalRailroadRects() {
    // x/y/w/h
    const rects = [
        [-1, -1, 1, 2],
        [1, -1, 1, 2],
        [0, 0, 1, 1],
    ];
    return rects;
}
function topRightRailroadCornerRects() {
    // x/y/w/h
    const rects = [
        [-1, -1, 1, 1],
        [0, -1, 1, 2],
        [1, -1, 1, 3],
    ];
    return rects;
}
function topLeftRailroadCornerRects() {
    // x/y/w/h
    const rects = [
        [-1, -1, 1, 3],
        [0, -1, 1, 2],
        [1, -1, 1, 1],
    ];
    return rects;
}
function bottomRightRailroadCornerRects() {
    // x/y/w/h
    const rects = [
        [-1, 1, 1, 1],
        [0, 0, 1, 2],
        [1, -1, 1, 3],
    ];
    return rects;
}
function bottomLeftRailroadCornerRects() {
    // x/y/w/h
    const rects = [
        [-1, -1, 1, 3],
        [0, 0, 1, 2],
        [1, 1, 1, 1],
    ];
    return rects;
}
export function getBridgeRects(type) {
    const bridgeRects = railTypeToBridgeFunctionMap[type];
    if (!bridgeRects) {
        // Should never happen
        throw new Error(`Unsupported RailType: ${type}`);
    }
    return bridgeRects();
}
function horizontalBridge() {
    // x/y/w/h
    return [
        [-1, -2, 3, 1],
        [-1, 2, 3, 1],
        [-1, 3, 1, 1],
        [1, 3, 1, 1],
    ];
}
function verticalBridge() {
    // x/y/w/h
    return [
        [-2, -1, 1, 3],
        [2, -1, 1, 3],
    ];
}
// ⌞
function topRightBridgeCornerRects() {
    return [
        [-2, -2, 1, 2],
        [-1, 0, 1, 1],
        [0, 1, 1, 1],
        [1, 2, 2, 1],
        [2, -2, 1, 1],
    ];
}
// ⌝
function bottomLeftBridgeCornerRects() {
    // x/y/w/h
    const rects = [
        [-2, -2, 2, 1],
        [0, -1, 1, 1],
        [1, 0, 1, 1],
        [2, 1, 1, 2],
        [-2, 2, 1, 1],
    ];
    return rects;
}
// ⌟
function topLeftBridgeCornerRects() {
    // x/y/w/h
    const rects = [
        [-2, -2, 1, 1],
        [-2, 2, 2, 1],
        [0, 1, 1, 1],
        [1, 0, 1, 1],
        [2, -2, 1, 2],
    ];
    return rects;
}
// ⌜
function bottomRightBridgeCornerRects() {
    // x/y/w/h
    const rects = [
        [-2, 1, 1, 2],
        [-1, 0, 1, 1],
        [0, -1, 1, 1],
        [1, -2, 2, 1],
        [2, 2, 1, 1],
    ];
    return rects;
}
//# sourceMappingURL=RailroadSprites.js.map