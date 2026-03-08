var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { renderPlayerFlag } from "../core/CustomFlag";
import { FlagSchema } from "../core/Schemas";
import { translateText } from "./Utils";
const flagKey = "flag";
let FlagInput = class FlagInput extends LitElement {
    constructor() {
        super(...arguments);
        this.flag = "";
        this.showSelectLabel = false;
        this.updateFlag = (ev) => {
            const e = ev;
            if (!FlagSchema.safeParse(e.detail.flag).success)
                return;
            if (this.flag !== e.detail.flag) {
                this.flag = e.detail.flag;
            }
        };
    }
    isDefaultFlagValue(flag) {
        return !flag || flag === "xx";
    }
    getCurrentFlag() {
        return this.flag;
    }
    getStoredFlag() {
        const storedFlag = localStorage.getItem(flagKey);
        if (storedFlag) {
            return storedFlag;
        }
        return "";
    }
    dispatchFlagEvent() {
        this.dispatchEvent(new CustomEvent("flag-change", {
            detail: { flag: this.flag },
            bubbles: true,
            composed: true,
        }));
    }
    onInputClick(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dispatchEvent(new CustomEvent("flag-input-click", {
            bubbles: true,
            composed: true,
        }));
    }
    connectedCallback() {
        super.connectedCallback();
        this.flag = this.getStoredFlag();
        this.dispatchFlagEvent();
        window.addEventListener("flag-change", this.updateFlag);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener("flag-change", this.updateFlag);
    }
    createRenderRoot() {
        return this;
    }
    render() {
        const isDefaultFlag = this.isDefaultFlagValue(this.flag);
        const showSelect = this.showSelectLabel && isDefaultFlag;
        const buttonTitle = showSelect
            ? translateText("flag_input.title")
            : translateText("flag_input.button_title");
        return html `
      <button
        id="flag-input"
        class="flag-btn p-0 m-0 border-0 w-full h-full flex cursor-pointer justify-center items-center focus:outline-none focus:ring-0 transition-all duration-200 hover:scale-105 bg-[color-mix(in_oklab,var(--frenchBlue)_75%,black)] hover:brightness-[1.08] active:brightness-[0.95] rounded-lg overflow-hidden"
        title=${buttonTitle}
        @click=${this.onInputClick}
      >
        <span
          id="flag-preview"
          class=${showSelect ? "hidden" : "w-full h-full overflow-hidden"}
        ></span>
        ${showSelect
            ? html `<span
              class="text-[10px] font-black text-white uppercase leading-none break-words w-full text-center px-1"
            >
              ${translateText("flag_input.title")}
            </span>`
            : null}
      </button>
    `;
    }
    updated() {
        const preview = this.renderRoot.querySelector("#flag-preview");
        if (!preview)
            return;
        if (this.showSelectLabel && this.isDefaultFlagValue(this.flag)) {
            preview.innerHTML = "";
            return;
        }
        preview.innerHTML = "";
        if (this.flag?.startsWith("!")) {
            renderPlayerFlag(this.flag, preview);
        }
        else {
            const img = document.createElement("img");
            img.src = this.flag ? `/flags/${this.flag}.svg` : `/flags/xx.svg`;
            img.className = "w-full h-full object-cover pointer-events-none";
            img.draggable = false;
            img.onerror = () => {
                if (!img.src.endsWith("/flags/xx.svg")) {
                    img.src = "/flags/xx.svg";
                }
            };
            preview.appendChild(img);
        }
    }
};
__decorate([
    state()
], FlagInput.prototype, "flag", void 0);
__decorate([
    property({ type: Boolean, attribute: "show-select-label" })
], FlagInput.prototype, "showSelectLabel", void 0);
FlagInput = __decorate([
    customElement("flag-input")
], FlagInput);
export { FlagInput };
//# sourceMappingURL=FlagInput.js.map