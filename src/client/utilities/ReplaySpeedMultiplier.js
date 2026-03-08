export var ReplaySpeedMultiplier;
(function (ReplaySpeedMultiplier) {
    ReplaySpeedMultiplier[ReplaySpeedMultiplier["slow"] = 2] = "slow";
    ReplaySpeedMultiplier[ReplaySpeedMultiplier["normal"] = 1] = "normal";
    ReplaySpeedMultiplier[ReplaySpeedMultiplier["fast"] = 0.5] = "fast";
    ReplaySpeedMultiplier[ReplaySpeedMultiplier["fastest"] = 0] = "fastest";
})(ReplaySpeedMultiplier || (ReplaySpeedMultiplier = {}));
export const defaultReplaySpeedMultiplier = ReplaySpeedMultiplier.normal;
//# sourceMappingURL=ReplaySpeedMultiplier.js.map