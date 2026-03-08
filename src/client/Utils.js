import IntlMessageFormat from "intl-messageformat";
import { Duos, GameMode, HumansVsNations, MessageType, Quads, Trios, } from "../core/game/Game";
import { Platform } from "./Platform";
export const TUTORIAL_VIDEO_URL = "https://www.youtube.com/embed/EN2oOog3pSs";
export function normaliseMapKey(mapName) {
    return mapName.toLowerCase().replace(/[\s.]+/g, "");
}
export function getMapName(mapName) {
    if (!mapName)
        return null;
    return translateText(`map.${normaliseMapKey(mapName)}`);
}
/**
 * Returns a display label for the game mode (e.g. "FFA", "4 Teams", "Duos").
 */
export function getGameModeLabel(gameConfig) {
    const { gameMode, playerTeams, maxPlayers } = gameConfig;
    if (gameMode !== GameMode.Team) {
        return translateText("game_mode.ffa");
    }
    // Humans vs Nations
    if (playerTeams === HumansVsNations) {
        if (maxPlayers) {
            return translateText("public_lobby.teams_hvn_detailed", {
                num: maxPlayers,
            });
        }
        return translateText("public_lobby.teams_hvn");
    }
    // Named team types (Duos, Trios, Quads)
    if (typeof playerTeams === "string") {
        const teamKey = `public_lobby.teams_${playerTeams}`;
        const teamCount = getTeamCount(playerTeams, maxPlayers ?? 0);
        const translated = translateText(teamKey, { team_count: teamCount });
        if (translated !== teamKey) {
            return translated;
        }
    }
    // Numeric team count (e.g. "5 teams of 20")
    const teamCount = typeof playerTeams === "number"
        ? playerTeams
        : getTeamCount(playerTeams, maxPlayers ?? 0);
    const teamSize = teamCount > 0 ? Math.floor((maxPlayers ?? 0) / teamCount) : 0;
    // If the computed team size matches a named format, use that label instead
    const namedTeamType = teamSize === 2
        ? Duos
        : teamSize === 3
            ? Trios
            : teamSize === 4
                ? Quads
                : null;
    if (namedTeamType) {
        const teamKey = `public_lobby.teams_${namedTeamType}`;
        const translated = translateText(teamKey, { team_count: teamCount });
        if (translated !== teamKey) {
            return translated;
        }
    }
    const teamsLabel = translateText("public_lobby.teams", { num: teamCount });
    if (teamSize > 0) {
        return `${teamsLabel} ${translateText("public_lobby.players_per_team", { num: teamSize })}`;
    }
    return teamsLabel;
}
function getTeamCount(playerTeams, maxPlayers) {
    if (typeof playerTeams === "number")
        return playerTeams;
    const teamSize = getTeamSize(playerTeams, maxPlayers);
    return teamSize > 0 ? Math.floor(maxPlayers / teamSize) : 0;
}
function getTeamSize(playerTeams, maxPlayers) {
    if (playerTeams === Duos)
        return 2;
    if (playerTeams === Trios)
        return 3;
    if (playerTeams === Quads)
        return 4;
    if (playerTeams === HumansVsNations)
        return maxPlayers;
    if (typeof playerTeams === "number" && playerTeams > 0) {
        return Math.floor(maxPlayers / playerTeams);
    }
    return 0;
}
/**
 * Returns structured modifier info for both detailed config display and badges.
 */
export function getActiveModifiers(modifiers) {
    if (!modifiers)
        return [];
    const result = [];
    if (modifiers.isRandomSpawn) {
        result.push({
            labelKey: "host_modal.random_spawn",
            badgeKey: "public_game_modifier.random_spawn",
        });
    }
    if (modifiers.isCompact) {
        result.push({
            labelKey: "host_modal.compact_map",
            badgeKey: "public_game_modifier.compact_map",
        });
    }
    if (modifiers.isCrowded) {
        result.push({
            labelKey: "host_modal.crowded",
            badgeKey: "public_game_modifier.crowded",
        });
    }
    if (modifiers.isHardNations) {
        result.push({
            labelKey: "host_modal.hard_nations",
            badgeKey: "public_game_modifier.hard_nations",
        });
    }
    if (modifiers.startingGold) {
        const millions = parseFloat((modifiers.startingGold / 1000000).toPrecision(12));
        result.push({
            labelKey: "host_modal.starting_gold",
            badgeKey: "public_game_modifier.starting_gold",
            badgeParams: {
                amount: millions,
            },
            value: modifiers.startingGold,
            formattedValue: `${millions}M`,
        });
    }
    return result;
}
/**
 * Returns an array of translated modifier labels for badge display.
 */
export function getModifierLabels(modifiers) {
    return getActiveModifiers(modifiers).map((m) => translateText(m.badgeKey, m.badgeParams));
}
export function renderDuration(totalSeconds) {
    if (totalSeconds <= 0)
        return "0s";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    let time = "";
    if (minutes > 0)
        time += `${minutes}min `;
    time += `${seconds}s`;
    return time.trim();
}
export function renderTroops(troops) {
    return renderNumber(troops / 10);
}
export async function copyToClipboard(text, onSuccess, onReset, timeout = 2000) {
    try {
        await navigator.clipboard.writeText(text);
        if (onSuccess)
            onSuccess();
        if (onReset) {
            setTimeout(() => {
                onReset();
            }, timeout);
        }
    }
    catch (err) {
        console.warn("Failed to copy to clipboard", err);
    }
}
export function renderNumber(num, fixedPoints) {
    num = Number(num);
    num = Math.max(num, 0);
    if (num >= 10000000) {
        const value = Math.floor(num / 100000) / 10;
        return value.toFixed(fixedPoints ?? 1) + "M";
    }
    else if (num >= 1000000) {
        const value = Math.floor(num / 10000) / 100;
        return value.toFixed(fixedPoints ?? 2) + "M";
    }
    else if (num >= 100000) {
        return Math.floor(num / 1000) + "K";
    }
    else if (num >= 10000) {
        const value = Math.floor(num / 100) / 10;
        return value.toFixed(fixedPoints ?? 1) + "K";
    }
    else if (num >= 1000) {
        const value = Math.floor(num / 10) / 100;
        return value.toFixed(fixedPoints ?? 2) + "K";
    }
    else {
        return Math.floor(num).toString();
    }
}
export function formatPercentage(value) {
    const perc = value * 100;
    if (Number.isNaN(perc))
        return "0%";
    return perc.toFixed(1) + "%";
}
/**
 * Formats a keyboard key code for user-friendly display.
 * Handles empty values, spaces, and normalizes key codes like "Digit1" and "KeyA".
 *
 * @param value - The key code to format (e.g., "Digit1", "KeyA", "Space")
 * @returns The formatted key for display (e.g., "1", "A", "Space")
 *
 * @example
 * formatKeyForDisplay("Digit5") // returns "5"
 * formatKeyForDisplay("KeyA") // returns "A"
 * formatKeyForDisplay("Space") // returns "Space"
 * formatKeyForDisplay(" ") // returns "Space"
 * formatKeyForDisplay("ArrowUp") // returns "Arrowup"
 * formatKeyForDisplay("") // returns ""
 */
export function formatKeyForDisplay(value) {
    // Handle empty string
    if (!value)
        return "";
    // Handle space character or "Space" key
    if (value === " " || value === "Space")
        return "Space";
    // Handle DigitN pattern (e.g., "Digit1" -> "1")
    if (/^Digit\d$/.test(value)) {
        return value.replace("Digit", "");
    }
    // Handle KeyX pattern (e.g., "KeyA" -> "A")
    if (/^Key[A-Z]$/.test(value)) {
        return value.replace("Key", "");
    }
    // Fallback: capitalize first letter
    return value.charAt(0).toUpperCase() + value.slice(1);
}
export function createCanvas() {
    const canvas = document.createElement("canvas");
    // Set canvas style to fill the screen
    canvas.style.position = "fixed";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.touchAction = "none";
    return canvas;
}
/**
 * A polyfill for crypto.randomUUID that provides fallback implementations
 * for older browsers, particularly Safari versions < 15.4
 */
export function generateCryptoRandomUUID() {
    // Type guard to check if randomUUID is available
    if (crypto !== undefined && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    // Fallback using crypto.getRandomValues
    if (crypto !== undefined && "getRandomValues" in crypto) {
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) => (c ^
            (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));
    }
    // Last resort fallback using Math.random
    // Note: This is less cryptographically secure but ensures functionality
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
export function formatDebugTranslation(key, params) {
    const entries = Object.entries(params);
    if (entries.length === 0)
        return key;
    const serializedParams = entries
        .map(([paramKey, value]) => `${paramKey}=${String(value)}`)
        .join(",");
    return `${key}::${serializedParams}`;
}
const EMPTY_TRANSLATION_PARAMS = {};
function getCachedLangSelector() {
    const self = translateText;
    const cached = self.langSelector;
    if (cached && cached.isConnected)
        return cached;
    const found = document.querySelector("lang-selector");
    self.langSelector = found ?? null;
    return found;
}
export const translateText = (key, params) => {
    const self = translateText;
    self.formatterCache ?? (self.formatterCache = new Map());
    self.lastLang ?? (self.lastLang = null);
    const langSelector = getCachedLangSelector();
    if (!langSelector) {
        console.warn("LangSelector not found in DOM");
        return key;
    }
    const resolvedParams = params ?? EMPTY_TRANSLATION_PARAMS;
    if (langSelector.currentLang === "debug") {
        return formatDebugTranslation(key, resolvedParams);
    }
    const translations = langSelector.translations;
    const defaultTranslations = langSelector.defaultTranslations;
    if (!translations && !defaultTranslations)
        return key;
    if (self.lastLang !== langSelector.currentLang) {
        self.formatterCache.clear();
        self.lastLang = langSelector.currentLang;
    }
    let message = translations?.[key];
    const hasPrimaryTranslation = message !== undefined;
    message ?? (message = defaultTranslations?.[key]);
    if (message === undefined)
        return key;
    // Fast path: no params and no ICU placeholders.
    if (resolvedParams === EMPTY_TRANSLATION_PARAMS &&
        message.indexOf("{") === -1) {
        return message;
    }
    try {
        const locale = !hasPrimaryTranslation && langSelector.currentLang !== "en"
            ? "en"
            : langSelector.currentLang;
        const cacheKey = `${key}:${locale}:${message}`;
        let formatter = self.formatterCache.get(cacheKey);
        if (!formatter) {
            formatter = new IntlMessageFormat(message, locale);
            self.formatterCache.set(cacheKey, formatter);
        }
        return formatter.format(resolvedParams);
    }
    catch (e) {
        console.warn("ICU format error", e);
        return message;
    }
};
export function getTranslatedPlayerTeamLabel(team) {
    if (!team)
        return "";
    const translationKey = `team_colors.${team.toLowerCase()}`;
    const translated = translateText(translationKey);
    return translated === translationKey ? team : translated;
}
/**
 * Severity colors mapping for message types
 */
export const severityColors = {
    fail: "text-red-400",
    warn: "text-yellow-400",
    success: "text-green-400",
    info: "text-gray-200",
    blue: "text-blue-400",
    white: "text-white",
};
/**
 * Gets the CSS classes for styling message types based on their severity
 * @param type The message type to get styling for
 * @returns CSS class string for the message type
 */
export function getMessageTypeClasses(type) {
    switch (type) {
        case MessageType.SAM_HIT:
        case MessageType.CAPTURED_ENEMY_UNIT:
        case MessageType.RECEIVED_GOLD_FROM_TRADE:
        case MessageType.CONQUERED_PLAYER:
            return severityColors["success"];
        case MessageType.ATTACK_FAILED:
        case MessageType.ALLIANCE_REJECTED:
        case MessageType.ALLIANCE_BROKEN:
        case MessageType.UNIT_CAPTURED_BY_ENEMY:
        case MessageType.UNIT_DESTROYED:
            return severityColors["fail"];
        case MessageType.ATTACK_CANCELLED:
        case MessageType.ATTACK_REQUEST:
        case MessageType.ALLIANCE_ACCEPTED:
        case MessageType.SENT_GOLD_TO_PLAYER:
        case MessageType.SENT_TROOPS_TO_PLAYER:
        case MessageType.RECEIVED_GOLD_FROM_PLAYER:
        case MessageType.RECEIVED_TROOPS_FROM_PLAYER:
            return severityColors["blue"];
        case MessageType.MIRV_INBOUND:
        case MessageType.NUKE_INBOUND:
        case MessageType.HYDROGEN_BOMB_INBOUND:
        case MessageType.SAM_MISS:
        case MessageType.ALLIANCE_EXPIRED:
        case MessageType.NAVAL_INVASION_INBOUND:
        case MessageType.RENEW_ALLIANCE:
            return severityColors["warn"];
        case MessageType.CHAT:
        case MessageType.ALLIANCE_REQUEST:
            return severityColors["info"];
        default:
            console.warn(`Message type ${type} has no explicit color`);
            return severityColors["white"];
    }
}
export function getModifierKey() {
    return Platform.isMac ? "⌘" : "Ctrl";
}
export function getAltKey() {
    return Platform.isMac ? "⌥" : "Alt";
}
export function getGamesPlayed() {
    try {
        return parseInt(localStorage.getItem("gamesPlayed") ?? "0", 10) || 0;
    }
    catch (error) {
        console.warn("Failed to read games played from localStorage:", error);
        return 0;
    }
}
export function incrementGamesPlayed() {
    try {
        localStorage.setItem("gamesPlayed", (getGamesPlayed() + 1).toString());
    }
    catch (error) {
        console.warn("Failed to increment games played in localStorage:", error);
    }
}
export function isInIframe() {
    try {
        return window.self !== window.top;
    }
    catch (e) {
        // If we can't access window.top due to cross-origin restrictions,
        // we're definitely in an iframe
        return true;
    }
}
export async function getSvgAspectRatio(src) {
    const self = getSvgAspectRatio;
    self.svgAspectRatioCache ?? (self.svgAspectRatioCache = new Map());
    const cached = self.svgAspectRatioCache.get(src);
    if (cached !== undefined)
        return cached;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const resp = await fetch(src, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!resp.ok)
            throw new Error(`Fetch failed: ${resp.status}`);
        const text = await resp.text();
        // Try parse viewBox
        const vbMatch = text.match(/viewBox="([^"]+)"/i);
        if (vbMatch) {
            const parts = vbMatch[1]
                .trim()
                .split(/[\s,]+/)
                .map(Number);
            if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
                const [, , vbW, vbH] = parts;
                if (vbW > 0 && vbH > 0) {
                    const ratio = vbW / vbH;
                    self.svgAspectRatioCache.set(src, ratio);
                    return ratio;
                }
            }
        }
        // Fallback to width/height attributes (may be with units; strip px)
        const widthMatch = text.match(/<svg[^>]*\swidth="([^"]+)"/i);
        const heightMatch = text.match(/<svg[^>]*\sheight="([^"]+)"/i);
        if (widthMatch && heightMatch) {
            const parseNum = (s) => Number(s.replace(/[^0-9.]/g, ""));
            const w = parseNum(widthMatch[1]);
            const h = parseNum(heightMatch[1]);
            if (w > 0 && h > 0) {
                const ratio = w / h;
                self.svgAspectRatioCache.set(src, ratio);
                return ratio;
            }
        }
        // Not an SVG or no usable metadata
    }
    catch (e) {
        // fetch may fail due to CORS or non-SVG..
    }
    const imgRatio = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                resolve(img.naturalWidth / img.naturalHeight);
            }
            else {
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });
    if (imgRatio !== null) {
        self.svgAspectRatioCache.set(src, imgRatio);
        return imgRatio;
    }
    return null;
}
export function getDiscordAvatarUrl(user) {
    if (user.avatar) {
        // - id is a Discord numeric string
        // - avatar is a hash, optionally prefixed with "a_" for animated avatars
        const validId = /^\d+$/.test(user.id);
        const validAvatar = /^[a-f0-9]+$/.test(user.avatar) || /^a_[a-f0-9]+$/.test(user.avatar);
        if (validId && validAvatar) {
            const extension = user.avatar.startsWith("a_") ? "gif" : "png";
            return `https://cdn.discordapp.com/avatars/${encodeURIComponent(user.id)}/${encodeURIComponent(user.avatar)}.${extension}?size=64`;
        }
    }
    if (user.discriminator !== undefined) {
        const idx = Number(user.discriminator) % 5;
        return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
    }
    return null;
}
//# sourceMappingURL=Utils.js.map