var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
let ModalOverlay = class ModalOverlay extends LitElement {
    constructor() {
        super(...arguments);
        this.visible = false;
    }
    createRenderRoot() {
        return this;
    }
    render() {
        return html `
      <div
        class="absolute left-0 top-0 w-full h-full ${this.visible
            ? ""
            : "hidden"}"
        @click=${() => (this.visible = false)}
      ></div>
    `;
    }
};
__decorate([
    property({ reflect: true })
], ModalOverlay.prototype, "visible", void 0);
ModalOverlay = __decorate([
    customElement("modal-overlay")
], ModalOverlay);
export { ModalOverlay };
//# sourceMappingURL=ModalOverlay.js.map