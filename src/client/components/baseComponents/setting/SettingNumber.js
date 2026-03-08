var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
let SettingNumber = class SettingNumber extends LitElement {
    constructor() {
        super(...arguments);
        this.label = "Setting";
        this.description = "";
        this.value = 0;
        this.min = 0;
        this.max = 100;
        this.easter = false;
    }
    createRenderRoot() {
        return this;
    }
    handleInput(e) {
        const input = e.target;
        const newValue = Number(input.value);
        this.value = newValue;
        this.dispatchEvent(new CustomEvent("change", {
            detail: { value: newValue },
            bubbles: true,
            composed: true,
        }));
    }
    render() {
        const rainbowClass = this.easter
            ? "bg-[linear-gradient(270deg,#990033,#996600,#336600,#008080,#1c3f99,#5e0099,#990033)] bg-[length:1400%_1400%] animate-rainbow-bg text-white hover:bg-[linear-gradient(270deg,#990033,#996600,#336600,#008080,#1c3f99,#5e0099,#990033)]"
            : "";
        return html `
      <div
        class="flex flex-row items-center justify-between w-full p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all gap-4 ${rainbowClass}"
      >
        <div class="flex flex-col flex-1 min-w-0 mr-4">
          <label
            class="text-white font-bold text-base block mb-1"
            for="setting-number-input"
            >${this.label}</label
          >
          <div class="text-white/50 text-sm leading-snug">
            ${this.description}
          </div>
        </div>
        <input
          type="number"
          id="setting-number-input"
          class="shrink-0 w-[100px] py-2 px-3 border border-white/20 rounded-lg bg-black/60 text-white font-mono text-center focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          .value=${String(this.value ?? 0)}
          min=${this.min}
          max=${this.max}
          @input=${this.handleInput}
        />
      </div>
    `;
    }
};
__decorate([
    property()
], SettingNumber.prototype, "label", void 0);
__decorate([
    property()
], SettingNumber.prototype, "description", void 0);
__decorate([
    property({ type: Number })
], SettingNumber.prototype, "value", void 0);
__decorate([
    property({ type: Number })
], SettingNumber.prototype, "min", void 0);
__decorate([
    property({ type: Number })
], SettingNumber.prototype, "max", void 0);
__decorate([
    property({ type: Boolean })
], SettingNumber.prototype, "easter", void 0);
SettingNumber = __decorate([
    customElement("setting-number")
], SettingNumber);
export { SettingNumber };
//# sourceMappingURL=SettingNumber.js.map