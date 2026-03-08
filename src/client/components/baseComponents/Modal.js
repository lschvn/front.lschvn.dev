var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var OModal_1;
import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import tailwindStyles from "../../styles.css?inline";
let OModal = OModal_1 = class OModal extends LitElement {
    constructor() {
        super(...arguments);
        this.isModalOpen = false;
        this.inline = false;
        this.alwaysMaximized = false;
        this.hideCloseButton = false;
        this.title = "";
        this.hideHeader = false;
        this.maxWidth = "";
    }
    open() {
        if (!this.isModalOpen) {
            if (!this.inline) {
                OModal_1.openCount = OModal_1.openCount + 1;
                if (OModal_1.openCount === 1)
                    document.body.style.overflow = "hidden";
            }
            this.isModalOpen = true;
        }
    }
    close() {
        if (this.isModalOpen) {
            this.isModalOpen = false;
            this.onClose?.();
            if (!this.inline) {
                OModal_1.openCount = Math.max(0, OModal_1.openCount - 1);
                if (OModal_1.openCount === 0)
                    document.body.style.overflow = "";
            }
        }
    }
    disconnectedCallback() {
        // Ensure global counter is decremented if this modal is removed while open.
        if (this.isModalOpen && !this.inline) {
            OModal_1.openCount = Math.max(0, OModal_1.openCount - 1);
            if (OModal_1.openCount === 0)
                document.body.style.overflow = "";
        }
        super.disconnectedCallback();
    }
    render() {
        const backdropClass = this.inline
            ? "relative z-10 w-full h-full flex items-stretch bg-transparent"
            : "fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center overflow-hidden";
        const wrapperClass = this.inline
            ? "relative flex flex-col w-full h-full m-0 max-w-full max-h-none shadow-none"
            : `relative flex flex-col w-full h-full lg:w-[90%] lg:h-auto lg:min-w-[400px] lg:max-w-[900px] lg:m-8 lg:rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.8)] lg:max-h-[calc(100vh-4rem)] ${this.alwaysMaximized ? "h-auto" : ""}`;
        const wrapperStyle = !this.inline && this.maxWidth ? `max-width: ${this.maxWidth};` : "";
        return html `
      ${this.isModalOpen
            ? html `
            <aside
              class="${backdropClass}"
              @click=${this.inline ? null : () => this.close()}
            >
              <div
                @click=${(e) => e.stopPropagation()}
                class="${wrapperClass}"
                style="${wrapperStyle}"
              >
                ${this.inline || this.hideCloseButton
                ? html ``
                : html `<div
                      class="absolute top-5 right-5 z-10 text-white cursor-pointer"
                      @click=${() => this.close()}
                    >
                      ✕
                    </div>`}
                ${!this.hideHeader && this.title
                ? html `<div
                      class="px-[1.4rem] py-[1rem] text-2xl font-bold text-white"
                    >
                      ${this.title}
                    </div>`
                : html ``}
                <section
                  class="relative flex-1 min-h-0 p-0 lg:p-[1.4rem] text-white bg-[#23232382] backdrop-blur-md lg:rounded-lg overflow-y-auto"
                >
                  <slot></slot>
                </section>
              </div>
            </aside>
          `
            : html ``}
    `;
    }
};
OModal.styles = [unsafeCSS(tailwindStyles)];
OModal.openCount = 0;
__decorate([
    state()
], OModal.prototype, "isModalOpen", void 0);
__decorate([
    property({ type: Boolean })
], OModal.prototype, "inline", void 0);
__decorate([
    property({ type: Boolean })
], OModal.prototype, "alwaysMaximized", void 0);
__decorate([
    property({ type: Boolean })
], OModal.prototype, "hideCloseButton", void 0);
__decorate([
    property({ type: String })
], OModal.prototype, "title", void 0);
__decorate([
    property({ type: Boolean })
], OModal.prototype, "hideHeader", void 0);
__decorate([
    property({ type: String })
], OModal.prototype, "maxWidth", void 0);
OModal = OModal_1 = __decorate([
    customElement("o-modal")
], OModal);
export { OModal };
//# sourceMappingURL=Modal.js.map