var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
let Divider = class Divider extends LitElement {
    constructor() {
        super(...arguments);
        this.spacing = "md";
        this.color = "bg-zinc-700/80";
    }
    createRenderRoot() {
        return this;
    }
    render() {
        const spacingClasses = {
            sm: "my-0.5",
            md: "my-1",
            lg: "my-2",
        };
        const spacing = spacingClasses[this.spacing] ?? spacingClasses.md;
        const colorClass = this.color || "bg-zinc-700/80";
        return html `<div
      role="separator"
      aria-hidden="true"
      class="${spacing} h-px ${colorClass}"
    ></div>`;
    }
};
__decorate([
    property({ type: String })
], Divider.prototype, "spacing", void 0);
__decorate([
    property({ type: String })
], Divider.prototype, "color", void 0);
Divider = __decorate([
    customElement("ui-divider")
], Divider);
export { Divider };
//# sourceMappingURL=Divider.js.map