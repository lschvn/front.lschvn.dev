/**
 * Core pathfinding types and interfaces.
 * No dependencies - safe to import from anywhere.
 */
export var PathStatus;
(function (PathStatus) {
    PathStatus[PathStatus["NEXT"] = 0] = "NEXT";
    PathStatus[PathStatus["COMPLETE"] = 2] = "COMPLETE";
    PathStatus[PathStatus["NOT_FOUND"] = 3] = "NOT_FOUND";
})(PathStatus || (PathStatus = {}));
//# sourceMappingURL=types.js.map