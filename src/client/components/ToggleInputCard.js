var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { translateText } from "../Utils";
const ACTIVE_CARD = "bg-blue-500/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]";
const INACTIVE_CARD = "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20";
const INPUT_CLASS = "w-full text-center rounded bg-black/60 text-white text-sm font-bold border border-white/20 focus:outline-none focus:border-blue-500 p-1 my-1";
const CARD_LABEL_CLASS = "text-xs uppercase font-bold tracking-wider leading-tight break-words hyphens-auto";
function cardClass(active, extra = "") {
    return `w-full h-full rounded-xl border cursor-pointer transition-all duration-200 active:scale-95 ${extra} ${active ? ACTIVE_CARD : INACTIVE_CARD}`;
}
let ToggleInputCard = class ToggleInputCard extends LitElement {
    constructor() {
        super(...arguments);
        this.labelKey = "";
        this.checked = false;
        this.inputType = "number";
        this.handleCardClick = () => {
            this.emitToggle();
        };
    }
    createRenderRoot() {
        return this;
    }
    updated(changedProperties) {
        if (!changedProperties.has("checked"))
            return;
        const previousChecked = changedProperties.get("checked");
        if (previousChecked === false && this.checked) {
            const input = this.querySelector("input");
            if (input) {
                input.focus();
                input.select();
            }
        }
    }
    toOptionalNumber(value) {
        if (typeof value === "number") {
            return Number.isFinite(value) ? value : undefined;
        }
        if (typeof value === "string") {
            const trimmed = value.trim();
            if (!trimmed)
                return undefined;
            const numeric = Number(trimmed);
            return Number.isFinite(numeric) ? numeric : undefined;
        }
        return undefined;
    }
    resolveValueOnEnable() {
        const currentValue = this.inputValue;
        if (currentValue === undefined ||
            currentValue === null ||
            currentValue === "") {
            return this.defaultInputValue;
        }
        if (this.minValidOnEnable === undefined) {
            return currentValue;
        }
        const numericValue = this.toOptionalNumber(currentValue);
        if (numericValue === undefined || numericValue < this.minValidOnEnable) {
            return this.defaultInputValue;
        }
        return numericValue;
    }
    emitToggle() {
        const nextChecked = !this.checked;
        const nextValue = nextChecked ? this.resolveValueOnEnable() : undefined;
        this.onToggle?.(nextChecked, nextValue);
    }
    render() {
        return html `
      <div class="${cardClass(this.checked, "relative overflow-hidden")}">
        <button
          type="button"
          aria-pressed=${this.checked}
          @click=${this.handleCardClick}
          class="w-full h-full p-3 flex flex-col items-center justify-between gap-2 focus:outline-none"
        >
          <div
            class="w-5 h-5 rounded border flex items-center justify-center transition-colors mt-1 ${this
            .checked
            ? "bg-blue-500 border-blue-500"
            : "border-white/20 bg-white/5"}"
          >
            ${this.checked
            ? html `<svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-3 w-3 text-white"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>`
            : ""}
          </div>

          ${this.checked
            ? html `<div class="h-[30px] my-1"></div>`
            : html `<div class="h-[2px] w-4 rounded my-3 bg-white/10"></div>`}

          <span
            class="${CARD_LABEL_CLASS} text-center ${this.checked
            ? "text-white"
            : "text-white/60"}"
          >
            ${translateText(this.labelKey)}
          </span>
        </button>

        ${this.checked
            ? html `
              <div
                class="absolute left-3 right-3 top-1/2 -translate-y-1/2 z-10"
              >
                <input
                  type=${this.inputType}
                  id=${this.inputId ?? nothing}
                  min=${this.inputMin ?? nothing}
                  max=${this.inputMax ?? nothing}
                  step=${this.inputStep ?? nothing}
                  .value=${String(this.inputValue ?? "")}
                  class=${INPUT_CLASS}
                  aria-label=${this.inputAriaLabel ?? nothing}
                  placeholder=${this.inputPlaceholder ?? nothing}
                  @input=${this.onInput}
                  @change=${this.onChange}
                  @keydown=${this.onKeyDown}
                />
              </div>
            `
            : nothing}
      </div>
    `;
    }
};
__decorate([
    property({ attribute: false })
], ToggleInputCard.prototype, "labelKey", void 0);
__decorate([
    property({ type: Boolean, attribute: false })
], ToggleInputCard.prototype, "checked", void 0);
__decorate([
    property({ attribute: false })
], ToggleInputCard.prototype, "inputId", void 0);
__decorate([
    property({ attribute: false })
], ToggleInputCard.prototype, "inputType", void 0);
__decorate([
    property({ attribute: false })
], ToggleInputCard.prototype, "inputMin", void 0);
__decorate([
    property({ attribute: false })
], ToggleInputCard.prototype, "inputMax", void 0);
__decorate([
    property({ attribute: false })
], ToggleInputCard.prototype, "inputStep", void 0);
__decorate([
    property({ attribute: false })
], ToggleInputCard.prototype, "inputValue", void 0);
__decorate([
    property({ attribute: false })
], ToggleInputCard.prototype, "inputAriaLabel", void 0);
__decorate([
    property({ attribute: false })
], ToggleInputCard.prototype, "inputPlaceholder", void 0);
__decorate([
    property({ attribute: false })
], ToggleInputCard.prototype, "defaultInputValue", void 0);
__decorate([
    property({ attribute: false })
], ToggleInputCard.prototype, "minValidOnEnable", void 0);
__decorate([
    property({ attribute: false })
], ToggleInputCard.prototype, "onToggle", void 0);
__decorate([
    property({ attribute: false })
], ToggleInputCard.prototype, "onInput", void 0);
__decorate([
    property({ attribute: false })
], ToggleInputCard.prototype, "onChange", void 0);
__decorate([
    property({ attribute: false })
], ToggleInputCard.prototype, "onKeyDown", void 0);
ToggleInputCard = __decorate([
    customElement("toggle-input-card")
], ToggleInputCard);
export { ToggleInputCard };
//# sourceMappingURL=ToggleInputCard.js.map