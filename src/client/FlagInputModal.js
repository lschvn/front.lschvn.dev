var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import Countries from "resources/countries.json" with { type: "json" };
import { translateText } from "./Utils";
import { BaseModal } from "./components/BaseModal";
import { modalHeader } from "./components/ui/ModalHeader";
let FlagInputModal = class FlagInputModal extends BaseModal {
    constructor() {
        super(...arguments);
        this.search = "";
        this.returnTo = "";
    }
    updated(changedProperties) {
        super.updated(changedProperties);
    }
    render() {
        const content = html `
      <div class="${this.modalContainerClass}">
        <div
          class="relative flex flex-col border-b border-white/10 pb-4 shrink-0"
        >
          ${modalHeader({
            title: translateText("flag_input.title"),
            onBack: () => this.close(),
            ariaLabel: translateText("common.back"),
        })}

          <div class="md:flex items-center gap-2 justify-center mt-4">
            <input
              class="h-12 w-full max-w-md border border-white/10 bg-black/60
              rounded-xl shadow-inner text-xl text-center focus:outline-none
              focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-white/30 transition-all"
              type="text"
              placeholder=${translateText("flag_input.search_flag")}
              @change=${this.handleSearch}
              @keyup=${this.handleSearch}
            />
          </div>
        </div>

        <div
          class="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent mr-1"
        >
          <div class="pt-2 flex flex-wrap justify-center gap-4 min-h-min">
            ${Countries.filter((country) => !country.restricted && this.includedInSearch(country)).map((country) => html `
                <button
                  @click=${() => {
            this.setFlag(country.code);
            this.close();
        }}
                  class="group relative flex flex-col items-center gap-2 p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer
                      w-[100px] sm:w-[120px]"
                >
                  <img
                    class="w-full h-auto rounded group-hover:scale-105 transition-transform duration-200 pointer-events-none"
                    draggable="false"
                    src="/flags/${country.code}.svg"
                    loading="lazy"
                    @error=${(e) => {
            const img = e.currentTarget;
            const fallback = "/flags/xx.svg";
            if (img.src && !img.src.endsWith(fallback)) {
                img.src = fallback;
            }
        }}
                  />
                  <span
                    class="text-xs font-bold text-gray-300 group-hover:text-white text-center leading-tight w-full whitespace-normal break-words"
                    >${country.name}</span
                  >
                </button>
              `)}
          </div>
        </div>
      </div>
    `;
        if (this.inline) {
            return content;
        }
        return html `
      <o-modal
        id="flag-input-modal"
        title=${translateText("flag_input.title")}
        ?inline=${this.inline}
        hideHeader
        hideCloseButton
      >
        ${content}
      </o-modal>
    `;
    }
    includedInSearch(country) {
        return (country.name.toLowerCase().includes(this.search.toLowerCase()) ||
            country.code.toLowerCase().includes(this.search.toLowerCase()));
    }
    handleSearch(event) {
        this.search = event.target.value;
    }
    setFlag(flag) {
        localStorage.setItem("flag", flag);
        this.dispatchEvent(new CustomEvent("flag-change", {
            detail: { flag },
            bubbles: true,
            composed: true,
        }));
    }
    onOpen() {
        // No custom logic needed
    }
    onClose() {
        if (this.returnTo) {
            const returnEl = document.querySelector(this.returnTo);
            if (returnEl?.open) {
                returnEl.open();
            }
            this.returnTo = "";
        }
    }
};
__decorate([
    query("#flag-input-modal")
], FlagInputModal.prototype, "modalRef", void 0);
__decorate([
    state()
], FlagInputModal.prototype, "search", void 0);
FlagInputModal = __decorate([
    customElement("flag-input-modal")
], FlagInputModal);
export { FlagInputModal };
//# sourceMappingURL=FlagInputModal.js.map