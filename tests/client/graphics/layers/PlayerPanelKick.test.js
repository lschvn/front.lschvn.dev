vi.mock("lit", () => ({
    html: (strings, ...values) => ({
        strings,
        values,
    }),
    LitElement: class extends EventTarget {
        requestUpdate() { }
    },
}));
vi.mock("lit/decorators.js", () => ({
    customElement: () => (clazz) => clazz,
    state: () => () => { },
    property: () => () => { },
    query: () => () => { },
}));
vi.mock("../../../../src/client/Utils", () => ({
    translateText: vi.fn((key) => key),
    renderDuration: vi.fn(),
    renderNumber: vi.fn(),
    renderTroops: vi.fn(),
}));
vi.mock("../../../../src/client/components/ui/ActionButton", () => ({
    actionButton: vi.fn((props) => props),
}));
import { actionButton } from "../../../../src/client/components/ui/ActionButton";
import { PlayerModerationModal } from "../../../../src/client/graphics/layers/PlayerModerationModal";
import { PlayerPanel } from "../../../../src/client/graphics/layers/PlayerPanel";
import { SendKickPlayerIntentEvent } from "../../../../src/client/Transport";
import { PlayerType } from "../../../../src/core/game/Game";
describe("PlayerPanel - kick player moderation", () => {
    let panel;
    const originalConfirm = globalThis.confirm;
    beforeEach(() => {
        panel = new PlayerPanel();
        panel.requestUpdate = vi.fn();
        panel.isVisible = true;
    });
    afterEach(() => {
        vi.clearAllMocks();
        globalThis.confirm = originalConfirm;
    });
    test("renders moderation action only when allowed or already kicked", () => {
        const my = { isLobbyCreator: () => true };
        const other = {
            id: () => 2,
            name: () => "Other",
            type: () => PlayerType.Human,
            clientID: () => "client-2",
        };
        actionButton.mockClear();
        panel.renderModeration(my, other);
        expect(actionButton).toHaveBeenCalledTimes(1);
        expect(actionButton.mock.calls[0][0]).toMatchObject({
            label: "player_panel.moderation",
            title: "player_panel.moderation",
            type: "red",
        });
        actionButton.mockClear();
        panel.kickedPlayerIDs.add("2");
        panel.renderModeration(my, other);
        expect(actionButton).toHaveBeenCalledTimes(1);
        const notCreator = { isLobbyCreator: () => false };
        actionButton.mockClear();
        panel.kickedPlayerIDs.clear();
        panel.renderModeration(notCreator, other);
        expect(actionButton).not.toHaveBeenCalled();
    });
    test("opens moderation modal and hides after a kick", () => {
        const other = {
            id: () => 2,
            name: () => "Other",
            type: () => PlayerType.Human,
            clientID: () => "client-2",
        };
        panel.openModeration({ stopPropagation: vi.fn() }, other);
        expect(panel.moderationTarget).toBe(other);
        expect(panel.suppressNextHide).toBe(true);
        panel.handleModerationKicked(new CustomEvent("kicked", { detail: { playerId: "2" } }));
        expect(panel.kickedPlayerIDs.has("2")).toBe(true);
        expect(panel.moderationTarget).toBe(null);
        expect(panel.isVisible).toBe(false);
    });
});
describe("PlayerModerationModal - kick confirmation", () => {
    const originalConfirm = globalThis.confirm;
    afterEach(() => {
        vi.clearAllMocks();
        globalThis.confirm = originalConfirm;
    });
    test("emits SendKickPlayerIntentEvent and dispatches kicked when confirmed", () => {
        globalThis.confirm = vi.fn(() => true);
        const modal = new PlayerModerationModal();
        const eventBus = { emit: vi.fn() };
        const my = { isLobbyCreator: () => true };
        const other = {
            id: () => 2,
            name: () => "Other",
            type: () => PlayerType.Human,
            clientID: () => "client-2",
        };
        modal.eventBus = eventBus;
        modal.myPlayer = my;
        modal.target = other;
        const kickedListener = vi.fn();
        modal.addEventListener("kicked", kickedListener);
        modal.handleKickClick({ stopPropagation: vi.fn() });
        expect(eventBus.emit).toHaveBeenCalledTimes(1);
        const event = eventBus.emit.mock.calls[0][0];
        expect(event).toBeInstanceOf(SendKickPlayerIntentEvent);
        expect(event.target).toBe("client-2");
        expect(kickedListener).toHaveBeenCalledTimes(1);
        const kickedEvent = kickedListener.mock.calls[0][0];
        expect(kickedEvent.detail).toEqual({ playerId: "2" });
    });
    test("does not emit when confirmation is cancelled", () => {
        globalThis.confirm = vi.fn(() => false);
        const modal = new PlayerModerationModal();
        const eventBus = { emit: vi.fn() };
        const my = { isLobbyCreator: () => true };
        const other = {
            id: () => 2,
            name: () => "Other",
            type: () => PlayerType.Human,
            clientID: () => "client-2",
        };
        modal.eventBus = eventBus;
        modal.myPlayer = my;
        modal.target = other;
        const kickedListener = vi.fn();
        modal.addEventListener("kicked", kickedListener);
        modal.handleKickClick({ stopPropagation: vi.fn() });
        expect(eventBus.emit).not.toHaveBeenCalled();
        expect(kickedListener).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=PlayerPanelKick.test.js.map