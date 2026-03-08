var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Platform } from "./Platform";
/**
 * Google AdSense integration component
 *
 * This component creates a configurable container for Google AdSense ads
 * and properly initializes them after the component is rendered.
 */
let GoogleAdElement = class GoogleAdElement extends LitElement {
    constructor() {
        super(...arguments);
        // Configurable properties
        this.adClient = "ca-pub-7035513310742290";
        this.adSlot = "5220834834";
        this.adFormat = "auto";
        this.fullWidthResponsive = true;
        this.adTest = "off"; // "on" for testing, remove or set to "off" for production
    }
    // Disable shadow DOM so AdSense can access the elements
    createRenderRoot() {
        return this;
    }
    render() {
        if (Platform.isElectron) {
            return html ``;
        }
        return html `
      <div class="mt-4 rounded-lg p-2 w-full overflow-hidden">
        <ins
          class="adsbygoogle block"
          data-ad-client="${this.adClient}"
          data-ad-slot="${this.adSlot}"
          data-ad-format="${this.adFormat}"
          data-full-width-responsive="${this.fullWidthResponsive}"
          data-adtest="${this.adTest}"
        ></ins>
      </div>
    `;
    }
    connectedCallback() {
        super.connectedCallback();
        if (Platform.isElectron) {
            return;
        }
        // Wait for the component to be fully rendered
        setTimeout(() => {
            try {
                // Initialize this specific ad
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                console.log("Ad initialized for slot:", this.adSlot);
            }
            catch (e) {
                console.error("AdSense initialization error for slot:", this.adSlot, e);
            }
        }, 100);
    }
};
__decorate([
    property({ type: String })
], GoogleAdElement.prototype, "adClient", void 0);
__decorate([
    property({ type: String })
], GoogleAdElement.prototype, "adSlot", void 0);
__decorate([
    property({ type: String })
], GoogleAdElement.prototype, "adFormat", void 0);
__decorate([
    property({ type: Boolean })
], GoogleAdElement.prototype, "fullWidthResponsive", void 0);
__decorate([
    property({ type: String })
], GoogleAdElement.prototype, "adTest", void 0);
GoogleAdElement = __decorate([
    customElement("google-ad")
], GoogleAdElement);
export { GoogleAdElement };
export default GoogleAdElement;
//# sourceMappingURL=GoogleAdElement.js.map