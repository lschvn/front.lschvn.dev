var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { crazyGamesSDK } from "src/client/CrazyGamesSDK";
import { Platform } from "src/client/Platform";
import { getGamesPlayed } from "src/client/Utils";
import { GameType } from "src/core/game/Game";
import "../../components/VideoPromo";
let SpawnVideoAd = class SpawnVideoAd extends LitElement {
    constructor() {
        super(...arguments);
        this.shouldShow = false;
        this.adComplete = false;
        this.handleComplete = () => {
            this.adComplete = true;
            this.shouldShow = false;
        };
    }
    createRenderRoot() {
        return this;
    }
    init() {
        if (!window.adsEnabled ||
            Platform.isMobileWidth ||
            crazyGamesSDK.isOnCrazyGames() ||
            this.game.config().gameConfig().gameType === GameType.Singleplayer ||
            getGamesPlayed() < 3 // Don't show to new players
        ) {
            return;
        }
        this.shouldShow = true;
    }
    tick() {
        if (this.adComplete)
            return;
        // Hide when spawn phase ends
        if (this.shouldShow && !this.game.inSpawnPhase()) {
            this.shouldShow = false;
            this.requestUpdate();
        }
    }
    shouldTransform() {
        return false;
    }
    render() {
        if (!this.shouldShow || this.adComplete) {
            return html ``;
        }
        return html `
      <div class="fixed bottom-0 left-0 z-[9999] pointer-events-auto">
        <video-ad
          style="width: 400px; max-width: 400px; height: 225px; aspect-ratio: auto;"
          .onComplete="${this.handleComplete}"
        ></video-ad>
      </div>
    `;
    }
};
__decorate([
    state()
], SpawnVideoAd.prototype, "shouldShow", void 0);
__decorate([
    state()
], SpawnVideoAd.prototype, "adComplete", void 0);
SpawnVideoAd = __decorate([
    customElement("spawn-video-ad")
], SpawnVideoAd);
export { SpawnVideoAd };
//# sourceMappingURL=SpawnVideoReward.js.map