import { GameMapType } from "../../core/game/Game";
/**
 * Maps a slider value (0-400) to the nations config value.
 * 0 → "disabled", value === defaultNationCount → "default", otherwise → number.
 */
export function sliderToNationsConfig(sliderValue, defaultNationCount) {
    if (sliderValue === 0)
        return "disabled";
    if (sliderValue === defaultNationCount)
        return "default";
    return sliderValue;
}
/**
 * Maps a nations config value to a slider-friendly number.
 * "disabled" → 0, "default" → defaultNationCount, number → number.
 */
export function nationsConfigToSlider(nations, defaultNationCount) {
    if (nations === "disabled")
        return 0;
    if (nations === "default")
        return defaultNationCount;
    return nations;
}
export function toOptionalNumber(value) {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed)
            return undefined;
        const numeric = Number(trimmed);
        return Number.isFinite(numeric) ? numeric : undefined;
    }
    return undefined;
}
export function preventDisallowedKeys(e, disallowedKeys) {
    if (disallowedKeys.includes(e.key)) {
        e.preventDefault();
    }
}
export function parseBoundedIntegerFromInput(input, { min, max, stripPattern = /[eE+-]/g, radix = 10, }) {
    input.value = input.value.replace(stripPattern, "");
    const value = parseInt(input.value, radix);
    if (isNaN(value) || value < min || value > max) {
        return undefined;
    }
    return value;
}
export function parseBoundedFloatFromInput(input, { min, max }) {
    const value = parseFloat(input.value);
    if (isNaN(value) || value < min || value > max) {
        return undefined;
    }
    return value;
}
export function getBotsForCompactMap(bots, compactMapEnabled) {
    if (compactMapEnabled && bots === 400) {
        return 100;
    }
    if (!compactMapEnabled && bots === 100) {
        return 400;
    }
    return bots;
}
export function getNationsForCompactMap(nations, defaultNationCount, compactMapEnabled) {
    const compactCount = Math.max(0, Math.floor(defaultNationCount * 0.25));
    if (compactMapEnabled) {
        // Only reduce if at the full default
        if (nations === defaultNationCount) {
            return compactCount;
        }
        return nations;
    }
    // Restoring from compact: if at the compact default, go back to full default
    if (nations === compactCount) {
        return defaultNationCount;
    }
    return nations;
}
export function getRandomMapType() {
    const maps = Object.values(GameMapType);
    const randIdx = Math.floor(Math.random() * maps.length);
    return maps[randIdx];
}
export function getUpdatedDisabledUnits(disabledUnits, unit, checked) {
    return checked
        ? [...disabledUnits, unit]
        : disabledUnits.filter((u) => u !== unit);
}
//# sourceMappingURL=GameConfigHelpers.js.map