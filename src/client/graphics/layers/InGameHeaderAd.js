var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
const AD_SHOW_TICKS = 10 * 60 * 10; // 2 minutes
const HEADER_AD_TYPE = "standard_iab_head1";
const HEADER_AD_CONTAINER_ID = "header-ad-container";
const TWO_XL_BREAKPOINT = 1536;
let InGameHeaderAd = class InGameHeaderAd extends LitElement {
    constructor() {
        super(...arguments);
        this.isHidden = false;
        this.adLoaded = false;
        this.shouldShow = false;
    }
    createRenderRoot() {
        return this;
    }
    init() {
        // TODO: move ad and re-enable.
        // this.showHeaderAd();
    }
    showHeaderAd() {
        // Don't show header ad on screens smaller than 2xl
        if (window.innerWidth < TWO_XL_BREAKPOINT) {
            return;
        }
        if (!window.adsEnabled) {
            return;
        }
        this.shouldShow = true;
        this.requestUpdate();
        // Wait for the element to render before loading the ad
        this.updateComplete.then(() => {
            this.loadAd();
        });
    }
    loadAd() {
        if (!window.ramp) {
            console.warn("Playwire RAMP not available for header ad");
            return;
        }
        try {
            window.ramp.que.push(() => {
                try {
                    window.ramp.spaAddAds([
                        {
                            type: HEADER_AD_TYPE,
                            selectorId: HEADER_AD_CONTAINER_ID,
                        },
                    ]);
                    this.adLoaded = true;
                    console.log("Header ad loaded:", HEADER_AD_TYPE);
                }
                catch (e) {
                    console.error("Failed to add header ad:", e);
                }
            });
        }
        catch (error) {
            console.error("Failed to load header ad:", error);
        }
    }
    hideHeaderAd() {
        this.shouldShow = false;
        this.adLoaded = false;
        try {
            window.ramp.destroyUnits(HEADER_AD_TYPE);
            console.log("successfully destroyed in game header ad");
        }
        catch (e) {
            console.error("error destroying in game header ad", e);
        }
        this.requestUpdate();
    }
    tick() {
        if (this.isHidden) {
            return;
        }
        const gameTicks = this.game.ticks() - this.game.config().numSpawnPhaseTurns();
        if (gameTicks > AD_SHOW_TICKS) {
            console.log("destroying header ad and refreshing PageOS");
            this.hideHeaderAd();
            this.isHidden = true;
            if (window.PageOS?.session?.newPageView) {
                window.PageOS.session.newPageView();
            }
            return;
        }
    }
    shouldTransform() {
        return false;
    }
    render() {
        if (!this.shouldShow) {
            return html ``;
        }
        return html `
      <div
        id="${HEADER_AD_CONTAINER_ID}"
        class="hidden 2xl:flex fixed top-0 left-1/2 -translate-x-1/2 z-[100] justify-center items-center pointer-events-auto p-0 -mt-[20px]"
      ></div>
    `;
    }
};
InGameHeaderAd = __decorate([
    customElement("in-game-header-ad")
], InGameHeaderAd);
export { InGameHeaderAd };
//# sourceMappingURL=InGameHeaderAd.js.map