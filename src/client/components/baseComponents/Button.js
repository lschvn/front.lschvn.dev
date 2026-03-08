var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var OButton_1;
import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { translateText } from "../../Utils";
let OButton = OButton_1 = class OButton extends LitElement {
    constructor() {
        super(...arguments);
        this.title = "";
        this.translationKey = "";
        this.secondary = false;
        this.block = false;
        this.blockDesktop = false;
        this.disable = false;
        this.fill = false;
        this.submit = false;
    }
    createRenderRoot() {
        return this;
    }
    getButtonClasses() {
        return {
            [OButton_1.BASE_CLASS]: true,
            "w-full block": this.block,
            "h-full w-full flex items-center justify-center": this.fill,
            "lg:w-auto lg:inline-block": !this.block && !this.blockDesktop && !this.fill,
            "lg:w-1/2 lg:mx-auto lg:block": this.blockDesktop,
            "bg-gray-700 text-gray-100 hover:bg-gray-600": this.secondary,
            "disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:bg-gray-600": this.disable,
        };
    }
    render() {
        return html `
      <button
        class=${classMap(this.getButtonClasses())}
        ?disabled=${this.disable}
        type=${this.submit ? "submit" : "button"}
      >
        <span class="block min-w-0">
          ${this.translationKey === ""
            ? this.title
            : translateText(this.translationKey)}
        </span>
      </button>
    `;
    }
};
OButton.BASE_CLASS = "bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider px-4 py-3 rounded-xl transition-all duration-300 transform hover:-translate-y-px outline-none border border-transparent text-center text-base lg:text-lg whitespace-normal break-words leading-tight overflow-hidden relative";
__decorate([
    property({ type: String })
], OButton.prototype, "title", void 0);
__decorate([
    property({ type: String })
], OButton.prototype, "translationKey", void 0);
__decorate([
    property({ type: Boolean })
], OButton.prototype, "secondary", void 0);
__decorate([
    property({ type: Boolean })
], OButton.prototype, "block", void 0);
__decorate([
    property({ type: Boolean })
], OButton.prototype, "blockDesktop", void 0);
__decorate([
    property({ type: Boolean })
], OButton.prototype, "disable", void 0);
__decorate([
    property({ type: Boolean })
], OButton.prototype, "fill", void 0);
__decorate([
    property({ type: Boolean })
], OButton.prototype, "submit", void 0);
OButton = OButton_1 = __decorate([
    customElement("o-button")
], OButton);
export { OButton };
//# sourceMappingURL=Button.js.map