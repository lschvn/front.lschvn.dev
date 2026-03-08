var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var HeadsUpMessage_1;
import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { GameType } from "../../../core/game/Game";
import { GameUpdateType } from "../../../core/game/GameUpdates";
import { translateText } from "../../Utils";
let HeadsUpMessage = HeadsUpMessage_1 = class HeadsUpMessage extends LitElement {
    constructor() {
        super(...arguments);
        this.isVisible = false;
        this.isPaused = false;
        this.isImmunityActive = false;
        this.isCatchingUp = false;
        this.catchingUpTicks = 0;
        this.toastMessage = null;
        this.toastColor = "green";
        this.toastTimeout = null;
        this.handleShowMessage = (event) => {
            const { message, duration, color } = event.detail ?? {};
            if (typeof message === "string" ||
                (message && typeof message.values === "object")) {
                this.toastMessage = message;
                this.toastColor = color === "red" ? "red" : "green";
                this.requestUpdate();
                if (this.toastTimeout) {
                    clearTimeout(this.toastTimeout);
                }
                this.toastTimeout = window.setTimeout(() => {
                    this.toastMessage = null;
                    this.requestUpdate();
                }, typeof duration === "number" ? (duration ?? 2000) : 2000);
            }
        };
    }
    createRenderRoot() {
        return this;
    }
    connectedCallback() {
        super.connectedCallback();
        window.addEventListener("show-message", this.handleShowMessage);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener("show-message", this.handleShowMessage);
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
    }
    init() {
        this.isVisible = true;
        this.requestUpdate();
    }
    tick() {
        const updates = this.game.updatesSinceLastTick();
        if (updates && updates[GameUpdateType.GamePaused].length > 0) {
            const pauseUpdate = updates[GameUpdateType.GamePaused][0];
            this.isPaused = pauseUpdate.paused;
        }
        const showImmunityHudDuration = 10 * 10;
        const spawnEnd = this.game.config().numSpawnPhaseTurns();
        const ticksSinceSpawnEnd = this.game.ticks() - spawnEnd;
        this.isImmunityActive =
            this.game.config().hasExtendedSpawnImmunity() &&
                !this.game.inSpawnPhase() &&
                this.game.isSpawnImmunityActive() &&
                ticksSinceSpawnEnd < showImmunityHudDuration;
        const currentlyCatchingUp = !this.game.config().isReplay() && this.game.isCatchingUp();
        if (currentlyCatchingUp) {
            this.catchingUpTicks++;
        }
        else {
            this.catchingUpTicks = 0;
        }
        this.isCatchingUp =
            this.catchingUpTicks >= HeadsUpMessage_1.CATCHING_UP_SHOW_THRESHOLD;
        this.isVisible =
            this.game.inSpawnPhase() ||
                this.isPaused ||
                this.isImmunityActive ||
                this.isCatchingUp;
        this.requestUpdate();
    }
    getMessage() {
        if (this.isCatchingUp) {
            return translateText("heads_up_message.catching_up");
        }
        if (this.isPaused) {
            if (this.game.config().gameConfig().gameType === GameType.Singleplayer) {
                return translateText("heads_up_message.singleplayer_game_paused");
            }
            else {
                return translateText("heads_up_message.multiplayer_game_paused");
            }
        }
        if (this.isImmunityActive) {
            return translateText("heads_up_message.pvp_immunity_active", {
                seconds: Math.round(this.game.config().spawnImmunityDuration() / 10),
            });
        }
        return this.game.config().isRandomSpawn()
            ? translateText("heads_up_message.random_spawn")
            : translateText("heads_up_message.choose_spawn");
    }
    render() {
        return html `
      <div style="pointer-events: none;">
        ${this.toastMessage
            ? html `
              <div
                class="fixed top-6 left-1/2 -translate-x-1/2 z-[800] px-6 py-4 rounded-xl transition-all duration-300 animate-fade-in-out"
                style="max-width: 90vw; min-width: 200px; text-align: center;
                  background: ${this.toastColor === "red"
                ? "rgba(239,68,68,0.1)"
                : "rgba(34,197,94,0.1)"};
                  border: 1px solid ${this.toastColor === "red"
                ? "rgba(239,68,68,0.5)"
                : "rgba(34,197,94,0.5)"};
                  color: white;
                  box-shadow: 0 0 30px 0 ${this.toastColor === "red"
                ? "rgba(239,68,68,0.3)"
                : "rgba(34,197,94,0.3)"};
                  backdrop-filter: blur(12px);"
                @contextmenu=${(e) => e.preventDefault()}
              >
                ${typeof this.toastMessage === "string"
                ? html `<span class="font-medium">${this.toastMessage}</span>`
                : this.toastMessage}
              </div>
            `
            : null}
        ${this.isVisible
            ? html `
              <div
                class="fixed top-[15%] left-1/2 -translate-x-1/2 z-[799]
                            inline-flex items-center justify-center min-h-8 lg:min-h-10
                            w-fit max-w-[90vw]
                            bg-gray-800/70 rounded-md lg:rounded-lg
                            backdrop-blur-xs text-white text-md lg:text-xl px-3 lg:px-4 py-1
                            text-center break-words"
                style="word-wrap: break-word; hyphens: auto;"
                @contextmenu=${(e) => e.preventDefault()}
              >
                ${this.getMessage()}
              </div>
            `
            : null}
      </div>
    `;
    }
};
HeadsUpMessage.CATCHING_UP_SHOW_THRESHOLD = 10;
__decorate([
    state()
], HeadsUpMessage.prototype, "isVisible", void 0);
__decorate([
    state()
], HeadsUpMessage.prototype, "isPaused", void 0);
__decorate([
    state()
], HeadsUpMessage.prototype, "isImmunityActive", void 0);
__decorate([
    state()
], HeadsUpMessage.prototype, "isCatchingUp", void 0);
__decorate([
    state()
], HeadsUpMessage.prototype, "toastMessage", void 0);
__decorate([
    state()
], HeadsUpMessage.prototype, "toastColor", void 0);
HeadsUpMessage = HeadsUpMessage_1 = __decorate([
    customElement("heads-up-message")
], HeadsUpMessage);
export { HeadsUpMessage };
//# sourceMappingURL=HeadsUpMessage.js.map