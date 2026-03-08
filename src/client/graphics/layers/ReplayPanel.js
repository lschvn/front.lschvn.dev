var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ReplaySpeedChangeEvent } from "../../InputHandler";
import { defaultReplaySpeedMultiplier, ReplaySpeedMultiplier, } from "../../utilities/ReplaySpeedMultiplier";
import { translateText } from "../../Utils";
export class ShowReplayPanelEvent {
    constructor(visible = true, isSingleplayer = false) {
        this.visible = visible;
        this.isSingleplayer = isSingleplayer;
    }
}
let ReplayPanel = class ReplayPanel extends LitElement {
    constructor() {
        super(...arguments);
        this.visible = false;
        this._replaySpeedMultiplier = defaultReplaySpeedMultiplier;
        this.isSingleplayer = false;
    }
    createRenderRoot() {
        return this; // Enable Tailwind CSS
    }
    init() {
        if (this.eventBus) {
            this.eventBus.on(ShowReplayPanelEvent, (event) => {
                this.visible = event.visible;
                this.isSingleplayer = event.isSingleplayer;
            });
        }
    }
    getTickIntervalMs() {
        return 1000;
    }
    tick() {
        if (!this.visible)
            return;
        this.requestUpdate();
    }
    onReplaySpeedChange(value) {
        this._replaySpeedMultiplier = value;
        this.eventBus?.emit(new ReplaySpeedChangeEvent(value));
    }
    renderLayer(_ctx) { }
    shouldTransform() {
        return false;
    }
    render() {
        if (!this.visible)
            return html ``;
        return html `
      <div
        class="p-2 bg-gray-800/70 backdrop-blur-xs shadow-xs min-[1200px]:rounded-lg rounded-l-lg"
        @contextmenu=${(e) => e.preventDefault()}
      >
        <label class="block mb-2 text-white" translate="no">
          ${this.game?.config()?.isReplay()
            ? translateText("replay_panel.replay_speed")
            : translateText("replay_panel.game_speed")}
        </label>
        <div class="grid grid-cols-4 gap-2">
          ${this.renderSpeedButton(ReplaySpeedMultiplier.slow, "×0.5")}
          ${this.renderSpeedButton(ReplaySpeedMultiplier.normal, "×1")}
          ${this.renderSpeedButton(ReplaySpeedMultiplier.fast, "×2")}
          ${this.renderSpeedButton(ReplaySpeedMultiplier.fastest, translateText("replay_panel.fastest_game_speed"))}
        </div>
      </div>
    `;
    }
    renderSpeedButton(value, label) {
        const backgroundColor = this._replaySpeedMultiplier === value ? "bg-blue-400" : "";
        return html `
      <button
        class="py-0.5 px-1 text-sm text-white rounded-sm border transition border-gray-500 ${backgroundColor} hover:border-gray-200"
        @click=${() => this.onReplaySpeedChange(value)}
      >
        ${label}
      </button>
    `;
    }
};
__decorate([
    property({ type: Boolean })
], ReplayPanel.prototype, "visible", void 0);
__decorate([
    state()
], ReplayPanel.prototype, "_replaySpeedMultiplier", void 0);
__decorate([
    property({ type: Boolean })
], ReplayPanel.prototype, "isSingleplayer", void 0);
ReplayPanel = __decorate([
    customElement("replay-panel")
], ReplayPanel);
export { ReplayPanel };
//# sourceMappingURL=ReplayPanel.js.map