var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { translateText } from "../Utils";
let FluentSlider = class FluentSlider extends LitElement {
    constructor() {
        super(...arguments);
        this.value = 0;
        this.min = 0;
        this.max = 400;
        this.step = 1;
        this.labelKey = "";
        this.disabledKey = "";
        this.defaultValue = undefined;
        this.defaultLabelKey = "";
        this.isEditing = false;
    }
    createRenderRoot() {
        return this;
    }
    dispatchValueChange() {
        this.dispatchEvent(new CustomEvent("value-changed", {
            detail: { value: this.value },
            bubbles: true,
            composed: true,
        }));
    }
    handleSliderInput(e) {
        const target = e.target;
        this.value = target.valueAsNumber;
    }
    handleSliderChange(e) {
        const target = e.target;
        this.value = target.valueAsNumber;
        this.dispatchValueChange();
    }
    handleNumberInput(e) {
        const target = e.target;
        let val = target.valueAsNumber;
        if (isNaN(val)) {
            val = this.min;
        }
        if (val < this.min)
            val = this.min;
        if (val > this.max)
            val = this.max;
        this.value = val;
        // Don't dispatch value change on every input - only on blur/enter
    }
    handleNumberComplete() {
        // Dispatch the value change when editing is complete
        this.dispatchValueChange();
    }
    handleNumberKeyDown(e) {
        if (e.key === "Enter") {
            this.isEditing = false;
            this.handleNumberComplete();
        }
    }
    enableEditing() {
        this.isEditing = true;
        this.updateComplete.then(() => this.numberInput?.focus());
    }
    render() {
        const percentage = this.max === this.min
            ? 0
            : ((this.value - this.min) / (this.max - this.min)) * 100;
        return html `
      <div
        class="flex flex-col items-center justify-center gap-1 w-full text-center"
      >
        <input
          type="range"
          .min=${this.min}
          .max=${this.max}
          .step=${this.step}
          .valueAsNumber=${this.value}
          style="background: linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, rgba(255, 255, 255, 0.15) ${percentage}%, rgba(255, 255, 255, 0.15) 100%); background-size: 100% 6px; background-repeat: no-repeat; background-position: center; border-radius: 9999px;"
          class="w-full h-6 p-0 m-0 bg-transparent appearance-none cursor-pointer focus:outline-none 
                 [&::-webkit-slider-runnable-track]:w-full [&::-webkit-slider-runnable-track]:h-[6px] [&::-webkit-slider-runnable-track]:cursor-pointer [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:transition-colors
                 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:-mt-[6px] [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(59,130,246,0.2)] [&::-webkit-slider-thumb]:transition-all active:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:shadow-[0_0_0_6px_rgba(59,130,246,0.3)]
                 [&::-moz-range-track]:w-full [&::-moz-range-track]:h-[6px] [&::-moz-range-track]:cursor-pointer [&::-moz-range-track]:bg-transparent [&::-moz-range-track]:rounded-full [&::-moz-range-track]:transition-colors
                 [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-[0_0_0_4px_rgba(59,130,246,0.2)] [&::-moz-range-thumb]:transition-all active:[&::-moz-range-thumb]:scale-110 active:[&::-moz-range-thumb]:shadow-[0_0_0_6px_rgba(59,130,246,0.3)]"
          @input=${this.handleSliderInput}
          @change=${this.handleSliderChange}
        />
        <div
          class="text-xs uppercase font-bold tracking-wider text-center w-full leading-tight mb-1 flex flex-col items-center ${this
            .value > 0
            ? "text-white"
            : "text-white/60"}"
        >
          <span>${this.labelKey ? translateText(this.labelKey) : ""}</span>
          ${this.isEditing
            ? html `<input
                type="number"
                .min=${this.min}
                .max=${this.max}
                .valueAsNumber=${this.value}
                class="w-[60px] bg-black/60 text-white border border-white/20 text-center rounded text-sm p-1 leading-none font-bold font-inherit mt-1 focus:outline-none focus:border-blue-500"
                @input=${this.handleNumberInput}
                @blur=${() => {
                this.isEditing = false;
                this.handleNumberComplete();
            }}
                @keydown=${this.handleNumberKeyDown}
              />`
            : html `<span
                class="cursor-pointer min-w-[60px] inline-block text-center text-sm font-bold select-none hover:text-white transition-colors mt-1 ${this
                .value > 0
                ? "text-white"
                : "text-white/60"}"
                role="button"
                tabindex="0"
                @click=${this.enableEditing}
                @keydown=${(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    this.enableEditing();
                    e.preventDefault();
                }
            }}
              >
                ${this.value === 0 && this.disabledKey
                ? translateText(this.disabledKey)
                : this.defaultValue !== undefined &&
                    this.value === this.defaultValue &&
                    this.defaultLabelKey
                    ? html `${this.value}
                        <span class="text-white/40 uppercase"
                          >(${translateText(this.defaultLabelKey)})</span
                        >`
                    : this.value}
              </span>`}
        </div>
      </div>
    `;
    }
};
__decorate([
    property({ type: Number })
], FluentSlider.prototype, "value", void 0);
__decorate([
    property({ type: Number })
], FluentSlider.prototype, "min", void 0);
__decorate([
    property({ type: Number })
], FluentSlider.prototype, "max", void 0);
__decorate([
    property({ type: Number })
], FluentSlider.prototype, "step", void 0);
__decorate([
    property({ type: String })
], FluentSlider.prototype, "labelKey", void 0);
__decorate([
    property({ type: String })
], FluentSlider.prototype, "disabledKey", void 0);
__decorate([
    property({ type: Number })
], FluentSlider.prototype, "defaultValue", void 0);
__decorate([
    property({ type: String })
], FluentSlider.prototype, "defaultLabelKey", void 0);
__decorate([
    state()
], FluentSlider.prototype, "isEditing", void 0);
__decorate([
    query("input[type='number']")
], FluentSlider.prototype, "numberInput", void 0);
FluentSlider = __decorate([
    customElement("fluent-slider")
], FluentSlider);
export { FluentSlider };
//# sourceMappingURL=FluentSlider.js.map