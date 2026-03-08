import { DataSet, RegExpMatcher, collapseDuplicatesTransformer, englishDataset, pattern, resolveConfusablesTransformer, resolveLeetSpeakTransformer, skipNonAlphabeticTransformer, toAsciiLowerCaseTransformer, } from "obscenity";
import { decodePatternData } from "../core/PatternDecoder";
import { FlagSchema, } from "../core/Schemas";
import { getClanTagOriginalCase, simpleHash } from "../core/Util";
export const shadowNames = [
    "UnhuggedToday",
    "DaddysLilChamp",
    "BunnyKisses67",
    "SnugglePuppy",
    "CuddleMonster67",
    "DaddysLilStar",
    "SnuggleMuffin",
    "PeesALittle",
    "PleaseFullSendMe",
    "NanasLilMan",
    "NoAlliances",
    "TryingTooHard67",
    "MommysLilStinker",
    "NeedHugs",
    "MommysLilPeanut",
    "IWillBetrayU",
    "DaddysLilTater",
    "PreciousBubbles",
    "67 Cringelord",
    "Peace And Love",
    "AlmostPottyTrained",
];
export function createMatcher(bannedWords) {
    const customDataset = new DataSet().addAll(englishDataset);
    for (const word of bannedWords) {
        customDataset.addPhrase((phrase) => phrase.setMetadata({ originalWord: word }).addPattern(pattern `${word}`));
    }
    return new RegExpMatcher({
        ...customDataset.build(),
        blacklistMatcherTransformers: [
            toAsciiLowerCaseTransformer(),
            resolveConfusablesTransformer(),
            resolveLeetSpeakTransformer(),
            collapseDuplicatesTransformer(),
            skipNonAlphabeticTransformer(),
        ],
    });
}
/**
 * Sanitizes and censors profane usernames and clan tags.
 * Profane username is overwritten, profane clan tag is removed.
 *
 * Removing bad clan tags won't hurt existing clans nor cause desyncs:
 * - full name including clan tag was overwritten in the past, if any part of name was bad
 * - only each separate local player name with a profane clan tag will remain, no clan team assignment
 *
 * Examples:
 * - "GoodName" -> "GoodName"
 * - "BadName" -> "Censored"
 * - "[CLAN]GoodName" -> "[CLAN]GoodName"
 * - "[CLaN]BadName" -> "[CLAN] Censored"
 * - "[BAD]GoodName" -> "GoodName"
 * - "[BAD]BadName" -> "Censored"
 */
function censorUsernameWithMatcher(username, matcher) {
    const clanTag = getClanTagOriginalCase(username);
    const nameWithoutClan = clanTag
        ? username.replace(`[${clanTag}]`, "").trim()
        : username;
    const clanTagIsProfane = clanTag ? matcher.hasMatch(clanTag) : false;
    const usernameIsProfane = matcher.hasMatch(nameWithoutClan);
    const censoredName = usernameIsProfane
        ? shadowNames[simpleHash(nameWithoutClan) % shadowNames.length]
        : nameWithoutClan;
    // Restore clan tag only if it's clean, otherwise remove it entirely
    if (clanTag && !clanTagIsProfane) {
        return `[${clanTag.toUpperCase()}] ${censoredName}`;
    }
    return censoredName;
}
export class PrivilegeCheckerImpl {
    constructor(cosmetics, b64urlDecode, bannedWords) {
        this.cosmetics = cosmetics;
        this.b64urlDecode = b64urlDecode;
        this.matcher = createMatcher(bannedWords);
    }
    isAllowed(flares, refs) {
        const cosmetics = {};
        if (refs.patternName) {
            try {
                cosmetics.pattern = this.isPatternAllowed(flares, refs.patternName, refs.patternColorPaletteName ?? null);
            }
            catch (e) {
                return { type: "forbidden", reason: "invalid pattern: " + e.message };
            }
        }
        if (refs.color) {
            try {
                cosmetics.color = this.isColorAllowed(flares, refs.color);
            }
            catch (e) {
                return { type: "forbidden", reason: "invalid color: " + e.message };
            }
        }
        if (refs.flag) {
            const result = FlagSchema.safeParse(refs.flag);
            if (!result.success) {
                return {
                    type: "forbidden",
                    reason: "invalid flag: " + result.error.message,
                };
            }
            cosmetics.flag = result.data;
        }
        return { type: "allowed", cosmetics };
    }
    isPatternAllowed(flares, name, colorPaletteName) {
        // Look for the pattern in the cosmetics.json config
        const found = this.cosmetics.patterns[name];
        if (!found)
            throw new Error(`Pattern ${name} not found`);
        try {
            decodePatternData(found.pattern, this.b64urlDecode);
        }
        catch (e) {
            throw new Error(`Invalid pattern ${name}`);
        }
        const colorPalette = this.cosmetics.colorPalettes?.[colorPaletteName ?? ""];
        if (flares.includes("pattern:*")) {
            return {
                name: found.name,
                patternData: found.pattern,
                colorPalette,
            };
        }
        const flareName = `pattern:${found.name}` +
            (colorPaletteName ? `:${colorPaletteName}` : "");
        if (flares.includes(flareName)) {
            // Player has a flare for this pattern
            return {
                name: found.name,
                patternData: found.pattern,
                colorPalette,
            };
        }
        else {
            throw new Error(`No flares for pattern ${name}`);
        }
    }
    isColorAllowed(flares, color) {
        const allowedColors = flares
            .filter((flare) => flare.startsWith("color:"))
            .map((flare) => flare.split(":")[1]);
        if (!allowedColors.includes(color)) {
            throw new Error(`Color ${color} not allowed`);
        }
        return { color };
    }
    censorUsername(username) {
        return censorUsernameWithMatcher(username, this.matcher);
    }
}
// Default matcher with no custom banned words (just englishDataset)
const defaultMatcher = createMatcher([]);
export class FailOpenPrivilegeChecker {
    isAllowed(flares, refs) {
        return { type: "allowed", cosmetics: {} };
    }
    censorUsername(username) {
        // Fail open: use matcher with just the built-in English profanity dataset
        return censorUsernameWithMatcher(username, defaultMatcher);
    }
}
//# sourceMappingURL=Privilege.js.map