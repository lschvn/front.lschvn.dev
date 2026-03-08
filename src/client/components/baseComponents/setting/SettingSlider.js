var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
let SettingSlider = class SettingSlider extends LitElement {
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
        this.value = Number(input.value);
        this.updateSliderStyle(input);
        this.dispatchEvent(new CustomEvent("change", {
            detail: { value: this.value },
            bubbles: true,
            composed: true,
        }));
    }
    updateSliderStyle(slider) {
        const percent = ((this.value - this.min) / (this.max - this.min)) * 100;
        const clamped = Math.max(0, Math.min(100, percent));
        slider.style.setProperty("--fill", `${clamped}%`);
    }
    firstUpdated() {
        const slider = this.renderRoot.querySelector("input[type=range]");
        if (slider)
            this.updateSliderStyle(slider);
    }
    render() {
        const rainbowClass = this.easter
            ? "bg-[linear-gradient(270deg,#990033,#996600,#336600,#008080,#1c3f99,#5e0099,#990033)] bg-[length:1400%_1400%] animate-rainbow-bg text-white hover:bg-[linear-gradient(270deg,#990033,#996600,#336600,#008080,#1c3f99,#5e0099,#990033)]"
            : "";
        return html `
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all gap-3 sm:gap-4 ${rainbowClass}"
      >
        <div class="flex flex-col flex-1 min-w-0 sm:mr-4">
          <label class="text-white font-bold text-base block mb-1"
            >${this.label}</label
          >
          <div class="text-white/50 text-sm leading-snug">
            ${this.description}
          </div>
        </div>

        <div
          class="flex flex-col items-start sm:items-end gap-2 shrink-0 w-full sm:w-[200px]"
        >
          <div class="flex items-center gap-2 w-full">
            <input
              type="range"
              class="flex-1 w-auto appearance-none h-2 bg-transparent rounded outline-none 
              [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded [&::-webkit-slider-runnable-track]:bg-[image:linear-gradient(to_right,#3b82f6_0%,#3b82f6_var(--fill),rgba(255,255,255,0.1)_var(--fill),rgba(255,255,255,0.1)_100%)]
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:-mt-[6px] [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(59,130,246,0.2)] [&::-webkit-slider-thumb]:transition-all active:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:shadow-[0_0_0_6px_rgba(59,130,246,0.3)]
              [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded [&::-moz-range-track]:bg-white/10
              [&::-moz-range-progress]:h-2 [&::-moz-range-progress]:rounded [&::-moz-range-progress]:bg-blue-500
              [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-[0_0_0_4px_rgba(59,130,246,0.2)] [&::-moz-range-thumb]:transition-all active:[&::-moz-range-thumb]:scale-110 active:[&::-moz-range-thumb]:shadow-[0_0_0_6px_rgba(59,130,246,0.3)]"
              min=${this.min}
              max=${this.max}
              .value=${String(this.value)}
              @input=${this.handleInput}
            />
            <span
              class="text-white font-bold text-sm shrink-0 text-right min-w-[3ch]"
              >${this.value}%</span
            >
          </div>
        </div>
      </div>
    `;
    }
};
__decorate([
    property()
], SettingSlider.prototype, "label", void 0);
__decorate([
    property()
], SettingSlider.prototype, "description", void 0);
__decorate([
    property({ type: Number })
], SettingSlider.prototype, "value", void 0);
__decorate([
    property({ type: Number })
], SettingSlider.prototype, "min", void 0);
__decorate([
    property({ type: Number })
], SettingSlider.prototype, "max", void 0);
__decorate([
    property({ type: Boolean })
], SettingSlider.prototype, "easter", void 0);
SettingSlider = __decorate([
    customElement("setting-slider")
], SettingSlider);
export { SettingSlider };
//# sourceMappingURL=SettingSlider.js.map