var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
let MainLayout = class MainLayout extends LitElement {
    constructor() {
        super(...arguments);
        this._initialChildren = [];
    }
    createRenderRoot() {
        return this;
    }
    connectedCallback() {
        if (this._initialChildren.length === 0 && this.childNodes.length > 0) {
            this._initialChildren = Array.from(this.childNodes);
        }
        super.connectedCallback();
    }
    render() {
        return html `
      <main
        class="relative [.in-game_&]:hidden flex flex-col flex-1 overflow-hidden w-full px-0 lg:px-[clamp(1.5rem,3vw,3rem)] pt-0 lg:pt-[clamp(0.75rem,1.5vw,1.5rem)] pb-0 lg:pb-[clamp(0.75rem,1.5vw,1.5rem)]"
      >
        <div
          class="w-full lg:max-w-[20cm] mx-auto flex flex-col flex-1 gap-0 lg:gap-[clamp(1.5rem,3vw,3rem)] overflow-y-auto overflow-x-hidden sm:px-4 lg:px-0"
        >
          ${this._initialChildren}
        </div>
      </main>
    `;
    }
};
MainLayout = __decorate([
    customElement("main-layout")
], MainLayout);
export { MainLayout };
//# sourceMappingURL=MainLayout.js.map