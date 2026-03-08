var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
let LobbyConfigItem = class LobbyConfigItem extends LitElement {
    constructor() {
        super(...arguments);
        this.label = "";
        this.value = "";
    }
    createRenderRoot() {
        return this;
    }
    render() {
        return html `
      <div
        class="bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col items-center justify-center gap-1 text-center min-w-[100px]"
      >
        <span
          class="text-white/40 text-[10px] font-bold uppercase tracking-wider"
          >${this.label}</span
        >
        <span
          class="text-white font-bold text-sm w-full break-words hyphens-auto"
          >${this.value}</span
        >
      </div>
    `;
    }
};
__decorate([
    property({ type: String })
], LobbyConfigItem.prototype, "label", void 0);
__decorate([
    property({ attribute: false })
], LobbyConfigItem.prototype, "value", void 0);
LobbyConfigItem = __decorate([
    customElement("lobby-config-item")
], LobbyConfigItem);
export { LobbyConfigItem };
//# sourceMappingURL=LobbyConfigItem.js.map