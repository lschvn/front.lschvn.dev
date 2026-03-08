var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { translateText } from "../../Utils";
let LeaderboardTabs = class LeaderboardTabs extends LitElement {
    constructor() {
        super(...arguments);
        this.activeTab = "players";
        this.baseTabClass = "px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all cursor-pointer select-none";
        this.activeTabClass = "bg-blue-600 text-white";
        this.inactiveTabClass = "text-white/40 hover:text-white/60 hover:bg-white/5";
        this.playerClass = this.getTabClass(this.activeTab === "players");
        this.clanClass = this.getTabClass(this.activeTab === "clans");
    }
    createRenderRoot() {
        return this;
    }
    getTabClass(active) {
        return [
            this.baseTabClass,
            active ? this.activeTabClass : this.inactiveTabClass,
        ].join(" ");
    }
    handleTabChange(tab) {
        this.dispatchEvent(new CustomEvent("tab-change", {
            detail: tab,
            bubbles: true,
            composed: true,
        }));
        this.playerClass = this.getTabClass(tab === "players");
        this.clanClass = this.getTabClass(tab === "clans");
    }
    render() {
        return html `
      <div
        role="tablist"
        class="flex gap-2 p-1 bg-white/5 rounded-full border border-white/10 mb-4 w-fit mx-auto mt-4"
      >
        <button
          type="button"
          role="tab"
          class="${this.playerClass}"
          @click=${() => this.handleTabChange("players")}
          id="player-leaderboard-tab"
          aria-selected=${this.activeTab === "players"}
        >
          ${translateText("leaderboard_modal.ranked_tab")}
        </button>
        <button
          type="button"
          role="tab"
          class="${this.clanClass}"
          @click=${() => this.handleTabChange("clans")}
          id="clan-leaderboard-tab"
          aria-selected=${this.activeTab === "clans"}
        >
          ${translateText("leaderboard_modal.clans_tab")}
        </button>
      </div>
    `;
    }
};
__decorate([
    property({ type: String })
], LeaderboardTabs.prototype, "activeTab", void 0);
__decorate([
    state()
], LeaderboardTabs.prototype, "playerClass", void 0);
__decorate([
    state()
], LeaderboardTabs.prototype, "clanClass", void 0);
LeaderboardTabs = __decorate([
    customElement("leaderboard-tabs")
], LeaderboardTabs);
export { LeaderboardTabs };
//# sourceMappingURL=LeaderboardTabs.js.map