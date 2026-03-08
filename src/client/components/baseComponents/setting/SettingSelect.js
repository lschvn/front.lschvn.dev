var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
let SettingSelect = class SettingSelect extends LitElement {
    constructor() {
        super(...arguments);
        this.label = "Setting";
        this.description = "";
        this.options = [];
        this.value = "";
    }
    createRenderRoot() {
        return this;
    }
    handleChange(e) {
        const input = e.target;
        const selected = this.options.find((option) => String(option.value) === input.value);
        const selectedValue = selected?.value ?? input.value;
        this.value = String(selectedValue);
        this.dispatchEvent(new CustomEvent("change", {
            detail: { value: selectedValue },
            bubbles: true,
            composed: true,
        }));
    }
    render() {
        return html `
      <div
        class="flex flex-col w-full p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all gap-3"
      >
        <div class="flex flex-col min-w-0">
          <label
            class="text-white font-bold text-base block mb-1"
            for="setting-select-input"
            >${this.label}</label
          >
          <div class="text-white/50 text-sm leading-snug">
            ${this.description}
          </div>
        </div>
        <div class="relative w-full">
          <select
            id="setting-select-input"
            class="w-full appearance-none py-2 pl-3 pr-9 border border-white/20 rounded-lg bg-black/40 text-white font-mono text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            .value=${String(this.value)}
            @change=${this.handleChange}
          >
            ${this.options.map((option) => html `<option
                  value=${String(option.value)}
                  ?selected=${String(option.value) === String(this.value)}
                >
                  ${option.label}
                </option>`)}
          </select>
          <span
            class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/60"
            aria-hidden="true"
          >
            <svg
              class="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
                clip-rule="evenodd"
              />
            </svg>
          </span>
        </div>
      </div>
    `;
    }
};
__decorate([
    property()
], SettingSelect.prototype, "label", void 0);
__decorate([
    property()
], SettingSelect.prototype, "description", void 0);
__decorate([
    property({ type: Array })
], SettingSelect.prototype, "options", void 0);
__decorate([
    property({ type: String })
], SettingSelect.prototype, "value", void 0);
SettingSelect = __decorate([
    customElement("setting-select")
], SettingSelect);
export { SettingSelect };
//# sourceMappingURL=SettingSelect.js.map