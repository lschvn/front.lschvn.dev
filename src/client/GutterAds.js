var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
let GutterAds = class GutterAds extends LitElement {
    constructor() {
        super(...arguments);
        this.isVisible = false;
        this.adLoaded = false;
        this.leftAdType = "standard_iab_left2";
        this.rightAdType = "standard_iab_rght1";
        this.leftContainerId = "gutter-ad-container-left";
        this.rightContainerId = "gutter-ad-container-right";
    }
    // Override createRenderRoot to disable shadow DOM
    createRenderRoot() {
        return this;
    }
    connectedCallback() {
        super.connectedCallback();
        document.addEventListener("userMeResponse", () => {
            if (window.adsEnabled) {
                console.log("showing gutter ads");
                this.show();
            }
            else {
                console.log("not showing gutter ads");
            }
        });
    }
    // Called after the component's DOM is first rendered
    firstUpdated() {
        // DOM is guaranteed to be available here
        console.log("GutterAdModal DOM is ready");
    }
    show() {
        this.isVisible = true;
        this.requestUpdate();
        // Wait for the update to complete, then load ads
        this.updateComplete.then(() => {
            this.loadAds();
        });
    }
    close() {
        try {
            window.ramp.destroyUnits(this.leftAdType);
            window.ramp.destroyUnits(this.rightAdType);
            console.log("successfully destroyed gutter ads");
        }
        catch (e) {
            console.error("error destroying gutter ads", e);
        }
    }
    loadAds() {
        console.log("loading ramp ads");
        // Ensure the container elements exist before loading ads
        const leftContainer = this.querySelector(`#${this.leftContainerId}`);
        const rightContainer = this.querySelector(`#${this.rightContainerId}`);
        if (!leftContainer || !rightContainer) {
            console.warn("Ad containers not found in DOM");
            return;
        }
        if (!window.ramp) {
            console.warn("Playwire RAMP not available");
            return;
        }
        if (this.adLoaded) {
            console.log("Ads already loaded, skipping");
            return;
        }
        try {
            window.ramp.que.push(() => {
                try {
                    window.ramp.spaAddAds([
                        {
                            type: this.leftAdType,
                            selectorId: this.leftContainerId,
                        },
                        {
                            type: this.rightAdType,
                            selectorId: this.rightContainerId,
                        },
                    ]);
                    this.adLoaded = true;
                    console.log("Playwire ads loaded:", this.leftAdType, this.rightAdType);
                }
                catch (e) {
                    console.log(e);
                }
            });
        }
        catch (error) {
            console.error("Failed to load Playwire ads:", error);
        }
    }
    disconnectedCallback() {
        super.disconnectedCallback();
    }
    render() {
        if (!this.isVisible) {
            return html ``;
        }
        return html `
      <!-- Left Gutter Ad -->
      <div
        class="hidden xl:flex fixed transform -translate-y-1/2 w-[160px] min-h-[600px] z-40 pointer-events-auto items-center justify-center"
        style="left: calc(50% - 10.5cm - 208px); top: calc(50% + 10px);"
      >
        <div
          id="${this.leftContainerId}"
          class="w-full h-full flex items-center justify-center p-2"
        ></div>
      </div>

      <!-- Right Gutter Ad -->
      <div
        class="hidden xl:flex fixed transform -translate-y-1/2 w-[160px] min-h-[600px] z-40 pointer-events-auto items-center justify-center"
        style="left: calc(50% + 10.5cm + 48px); top: calc(50% + 10px);"
      >
        <div
          id="${this.rightContainerId}"
          class="w-full h-full flex items-center justify-center p-2"
        ></div>
      </div>
    `;
    }
};
GutterAds.styles = css ``;
__decorate([
    state()
], GutterAds.prototype, "isVisible", void 0);
__decorate([
    state()
], GutterAds.prototype, "adLoaded", void 0);
GutterAds = __decorate([
    customElement("gutter-ads")
], GutterAds);
export { GutterAds };
//# sourceMappingURL=GutterAds.js.map