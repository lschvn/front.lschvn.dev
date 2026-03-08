export var PackedMotionPlanKind;
(function (PackedMotionPlanKind) {
    PackedMotionPlanKind[PackedMotionPlanKind["GridPathSet"] = 1] = "GridPathSet";
    PackedMotionPlanKind[PackedMotionPlanKind["TrainRailPathSet"] = 2] = "TrainRailPathSet";
})(PackedMotionPlanKind || (PackedMotionPlanKind = {}));
export function packMotionPlans(records) {
    let totalWords = 1;
    for (const record of records) {
        switch (record.kind) {
            case "grid": {
                const pathLen = (record.path.length >>> 0);
                totalWords += 2 + 5 + pathLen;
                break;
            }
            case "train": {
                const carCount = (record.carUnitIds.length >>> 0);
                const pathLen = (record.path.length >>> 0);
                totalWords += 2 + 7 + carCount + pathLen;
                break;
            }
        }
    }
    const out = new Uint32Array(totalWords);
    out[0] = records.length >>> 0;
    let offset = 1;
    for (const record of records) {
        switch (record.kind) {
            case "grid": {
                const path = record.path;
                const pathLen = path.length >>> 0;
                const wordCount = 2 + 5 + pathLen;
                out[offset++] = PackedMotionPlanKind.GridPathSet;
                out[offset++] = wordCount >>> 0;
                out[offset++] = record.unitId >>> 0;
                out[offset++] = record.planId >>> 0;
                out[offset++] = record.startTick >>> 0;
                out[offset++] = record.ticksPerStep >>> 0;
                out[offset++] = pathLen >>> 0;
                for (let i = 0; i < pathLen; i++) {
                    out[offset++] = path[i] >>> 0;
                }
                break;
            }
            case "train": {
                const carUnitIds = record.carUnitIds;
                const carCount = carUnitIds.length >>> 0;
                const path = record.path;
                const pathLen = path.length >>> 0;
                const wordCount = 2 + 7 + carCount + pathLen;
                out[offset++] = PackedMotionPlanKind.TrainRailPathSet;
                out[offset++] = wordCount >>> 0;
                out[offset++] = record.engineUnitId >>> 0;
                out[offset++] = record.planId >>> 0;
                out[offset++] = record.startTick >>> 0;
                out[offset++] = record.speed >>> 0;
                out[offset++] = record.spacing >>> 0;
                out[offset++] = carCount >>> 0;
                out[offset++] = pathLen >>> 0;
                for (let i = 0; i < carCount; i++) {
                    out[offset++] = carUnitIds[i] >>> 0;
                }
                for (let i = 0; i < pathLen; i++) {
                    out[offset++] = path[i] >>> 0;
                }
                break;
            }
        }
    }
    if (offset !== out.length) {
        throw new Error(`packMotionPlans size mismatch: wrote ${offset}, expected ${out.length}`);
    }
    return out;
}
export function unpackMotionPlans(packed) {
    if (packed.length < 1) {
        return [];
    }
    const recordCount = packed[0] >>> 0;
    const records = [];
    let offset = 1;
    for (let i = 0; i < recordCount && offset + 1 < packed.length; i++) {
        const kind = packed[offset] >>> 0;
        const wordCount = packed[offset + 1] >>> 0;
        if (wordCount < 2 || offset + wordCount > packed.length) {
            break;
        }
        switch (kind) {
            case PackedMotionPlanKind.GridPathSet: {
                if (wordCount < 2 + 5) {
                    break;
                }
                const unitId = packed[offset + 2] >>> 0;
                const planId = packed[offset + 3] >>> 0;
                const startTick = packed[offset + 4] >>> 0;
                const ticksPerStep = packed[offset + 5] >>> 0;
                const pathLen = packed[offset + 6] >>> 0;
                const expectedWordCount = 2 + 5 + pathLen;
                if (expectedWordCount !== wordCount) {
                    break;
                }
                const pathStart = offset + 7;
                const pathEnd = pathStart + pathLen;
                const path = packed.slice(pathStart, pathEnd);
                records.push({
                    kind: "grid",
                    unitId,
                    planId,
                    startTick,
                    ticksPerStep,
                    path,
                });
                break;
            }
            case PackedMotionPlanKind.TrainRailPathSet: {
                if (wordCount < 2 + 7) {
                    break;
                }
                const engineUnitId = packed[offset + 2] >>> 0;
                const planId = packed[offset + 3] >>> 0;
                const startTick = packed[offset + 4] >>> 0;
                const speed = packed[offset + 5] >>> 0;
                const spacing = packed[offset + 6] >>> 0;
                const carCount = packed[offset + 7] >>> 0;
                const pathLen = packed[offset + 8] >>> 0;
                const expectedWordCount = 2 + 7 + carCount + pathLen;
                if (expectedWordCount !== wordCount) {
                    break;
                }
                const carStart = offset + 9;
                const carEnd = carStart + carCount;
                const pathStart = carEnd;
                const pathEnd = pathStart + pathLen;
                const carUnitIds = packed.slice(carStart, carEnd);
                const path = packed.slice(pathStart, pathEnd);
                records.push({
                    kind: "train",
                    engineUnitId,
                    carUnitIds,
                    planId,
                    startTick,
                    speed,
                    spacing,
                    path,
                });
                break;
            }
            default:
                // Unknown kind: skip.
                break;
        }
        offset += wordCount;
    }
    return records;
}
//# sourceMappingURL=MotionPlans.js.map