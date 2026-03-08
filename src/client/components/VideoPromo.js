var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var VideoAd_1;
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
const VIDEO_AD_UNIT_TYPE = "precontent_ad_video";
let VideoAd = VideoAd_1 = class VideoAd extends LitElement {
    constructor() {
        super(...arguments);
        this.isVisible = true;
        this.adLoadTimeout = null;
        this.rampCheckInterval = null;
        this.rampWaitTimeout = null;
        this.adStarted = false;
    }
    createRenderRoot() {
        return this;
    }
    connectedCallback() {
        super.connectedCallback();
        // Set dimensions on the custom element itself (required by Playwire)
        // Playwire requires explicit pixel dimensions, use max-width for responsiveness
        this.style.display = "block";
        this.style.width = "100%";
        this.style.maxWidth = "800px";
        this.style.aspectRatio = "16/9";
        this.showVideoAd();
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        // Clean up timeout if component is removed
        if (this.adLoadTimeout) {
            clearTimeout(this.adLoadTimeout);
            this.adLoadTimeout = null;
        }
        if (this.rampCheckInterval) {
            clearInterval(this.rampCheckInterval);
            this.rampCheckInterval = null;
        }
        if (this.rampWaitTimeout) {
            clearTimeout(this.rampWaitTimeout);
            this.rampWaitTimeout = null;
        }
    }
    showVideoAd() {
        if (!window.ramp) {
            // Wait for ramp to be available, but give up after timeout
            this.rampCheckInterval = setInterval(() => {
                if (window.ramp && window.ramp.que) {
                    if (this.rampCheckInterval) {
                        clearInterval(this.rampCheckInterval);
                        this.rampCheckInterval = null;
                    }
                    if (this.rampWaitTimeout) {
                        clearTimeout(this.rampWaitTimeout);
                        this.rampWaitTimeout = null;
                    }
                    this.loadVideoAd();
                }
            }, 100);
            // Stop polling after timeout (e.g. adblocker preventing ramp from loading)
            this.rampWaitTimeout = setTimeout(() => {
                if (this.rampCheckInterval) {
                    clearInterval(this.rampCheckInterval);
                    this.rampCheckInterval = null;
                }
                console.log("[VideoAd] Ramp SDK never loaded - possible adblocker");
                this.handleAdBlocked();
            }, VideoAd_1.AD_LOAD_TIMEOUT_MS);
            return;
        }
        this.loadVideoAd();
    }
    loadVideoAd() {
        // Start timeout to detect if ad doesn't load (e.g., due to adblocker)
        this.adLoadTimeout = setTimeout(() => {
            if (!this.adStarted) {
                console.log("[VideoAd] Ad load timeout - possible adblocker detected");
                this.handleAdBlocked();
            }
        }, VideoAd_1.AD_LOAD_TIMEOUT_MS);
        // Set up event listeners when player is ready, chaining any existing handler
        const prevOnPlayerReady = window.ramp.onPlayerReady;
        window.ramp.onPlayerReady = () => {
            if (prevOnPlayerReady)
                prevOnPlayerReady();
            if (window.Bolt) {
                // Listen for ad start to know ad is loading successfully
                window.Bolt.on(VIDEO_AD_UNIT_TYPE, window.Bolt.BOLT_AD_STARTED ?? "boltAdStarted", () => {
                    console.log("[VideoAd] Ad started");
                    this.adStarted = true;
                    // Clear the timeout since ad is playing
                    if (this.adLoadTimeout) {
                        clearTimeout(this.adLoadTimeout);
                        this.adLoadTimeout = null;
                    }
                });
                window.Bolt.on(VIDEO_AD_UNIT_TYPE, window.Bolt.BOLT_AD_COMPLETE, () => {
                    console.log("[VideoAd] Ad completed");
                    this.hideElement();
                });
                window.Bolt.on(VIDEO_AD_UNIT_TYPE, window.Bolt.BOLT_AD_ERROR, () => {
                    console.log("[VideoAd] Ad error/no fill");
                    this.handleAdBlocked();
                });
                window.Bolt.on(VIDEO_AD_UNIT_TYPE, window.Bolt.BOLT_MIDPOINT, () => {
                    console.log("[VideoAd] Ad midpoint");
                    if (this.onMidpoint) {
                        this.onMidpoint();
                    }
                });
                window.Bolt.on(VIDEO_AD_UNIT_TYPE, window.Bolt.SHOW_HIDDEN_CONTAINER ?? "showHiddenContainer", () => {
                    console.log("[VideoAd] Ad finished");
                    this.hideElement();
                });
            }
        };
        // Queue the video ad initialization
        window.ramp.que.push(() => {
            const pwUnits = [{ type: VIDEO_AD_UNIT_TYPE }];
            window.ramp
                .addUnits(pwUnits)
                .then(() => {
                window.ramp.displayUnits();
            })
                .catch((e) => {
                console.error("[VideoAd] Error adding units:", e);
                window.ramp.displayUnits();
            });
        });
    }
    handleAdBlocked() {
        // Clear timeout if still pending
        if (this.adLoadTimeout) {
            clearTimeout(this.adLoadTimeout);
            this.adLoadTimeout = null;
        }
        // Call the callback if provided
        if (this.onAdBlocked) {
            this.onAdBlocked();
        }
    }
    hideElement() {
        this.style.display = "none";
        this.isVisible = false;
        // Call the callback if provided
        if (this.onComplete) {
            this.onComplete();
        }
        // Also dispatch event for backwards compatibility
        this.dispatchEvent(new CustomEvent("ad-complete", {
            bubbles: true,
            composed: true,
        }));
    }
    render() {
        if (!this.isVisible) {
            return html ``;
        }
        // Provide a container for the Playwire video player to render into
        // Structure matches Playwire example: wrapper > game-video-ad > precontent-video-location
        return html `
      <div
        class="game-video-ad"
        style="width: 100%; height: 100%; overflow: hidden;"
      >
        <div
          id="precontent-video-location"
          style="width: 100%; height: 100%;"
        ></div>
      </div>
    `;
    }
};
// How long to wait for ad to start before assuming it's blocked
VideoAd.AD_LOAD_TIMEOUT_MS = 8000;
__decorate([
    state()
], VideoAd.prototype, "isVisible", void 0);
__decorate([
    property({ attribute: false })
], VideoAd.prototype, "onComplete", void 0);
__decorate([
    property({ attribute: false })
], VideoAd.prototype, "onMidpoint", void 0);
__decorate([
    property({ attribute: false })
], VideoAd.prototype, "onAdBlocked", void 0);
VideoAd = VideoAd_1 = __decorate([
    customElement("video-ad")
], VideoAd);
export { VideoAd };
//# sourceMappingURL=VideoPromo.js.map