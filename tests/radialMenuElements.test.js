import { vi } from "vitest";
// Mock BuildMenu to avoid importing lit and other ESM-heavy deps in this unit test
vi.mock("../src/client/graphics/layers/BuildMenu", () => ({
    BuildMenu: class {
    },
    flattenedBuildTable: [],
}));
// Mock Utils to avoid touching DOM (document) during tests
vi.mock("../src/client/Utils", () => ({
    translateText: (k) => k,
    getSvgAspectRatio: async () => 1,
}));
import { COLORS, rootMenuElement, } from "../src/client/graphics/layers/RadialMenuElements";
// Minimal stubs to satisfy types used in rootMenuElement.subMenu and allyBreak actions
const makePlayer = (id, opts) => ({
    id: () => id,
    isAlliedWith: (other) => other && typeof other.id === "function" && other.id() !== id
        ? true
        : true,
    isTraitor: () => opts?.isTraitor ?? false,
    isDisconnected: () => opts?.isDisconnected ?? false,
});
const makeParams = (opts) => {
    const myPlayer = opts?.myPlayer ?? makePlayer("p1");
    const selected = opts?.selected ?? makePlayer("p2");
    return {
        myPlayer,
        selected,
        tile: {},
        playerActions: {
            canAttack: true,
            interaction: {
                canBreakAlliance: true,
                canSendAllianceRequest: false,
                canEmbargo: false,
            },
        },
        game: {
            inSpawnPhase: () => false,
            owner: () => ({ isPlayer: () => false }),
        },
        buildMenu: {
            canBuildOrUpgrade: () => false,
            cost: () => 0,
            count: () => 0,
            sendBuildOrUpgrade: () => { },
        },
        emojiTable: {},
        playerActionHandler: {
            handleBreakAlliance: vi.fn(),
            handleEmbargo: vi.fn(),
            handleDonateGold: vi.fn(),
            handleDonateTroops: vi.fn(),
            handleTargetPlayer: vi.fn(),
        },
        playerPanel: {
            show: vi.fn(),
        },
        chatIntegration: {
            createQuickChatMenu: vi.fn(() => []),
        },
        eventBus: {},
        closeMenu: vi.fn(),
    };
};
const findAllyBreak = (items) => items.find((i) => i && i.id === "ally_break");
describe("RadialMenuElements ally break", () => {
    test("shows break option with correct color when allied", () => {
        const params = makeParams();
        const items = rootMenuElement.subMenu(params);
        const ally = findAllyBreak(items);
        expect(ally).toBeTruthy();
        expect(ally.name).toBe("break");
        expect(typeof ally.color).toBe("function");
        expect(ally.color(params)).toBe(COLORS.breakAlly);
    });
    test("shows break option with orange color when allied to traitor", () => {
        const params = makeParams({
            selected: makePlayer("p2", { isTraitor: true }),
        });
        const items = rootMenuElement.subMenu(params);
        const ally = findAllyBreak(items);
        expect(ally.color(params)).toBe(COLORS.breakAllyNoDebuff);
    });
    test("shows boat button instead of break when allied to disconnected player", () => {
        const params = makeParams({
            selected: makePlayer("p2", { isDisconnected: true }),
        });
        const items = rootMenuElement.subMenu(params);
        expect(findAllyBreak(items)).toBeUndefined();
        expect(items.find((i) => i.id === "boat")).toBeDefined();
    });
    test("break action calls handleBreakAlliance and closes menu", () => {
        const params = makeParams();
        const items = rootMenuElement.subMenu(params);
        const ally = findAllyBreak(items);
        ally.action(params);
        expect(params.playerActionHandler.handleBreakAlliance).toHaveBeenCalledWith(params.myPlayer, params.selected);
        expect(params.closeMenu).toHaveBeenCalled();
    });
});
//# sourceMappingURL=radialMenuElements.test.js.map