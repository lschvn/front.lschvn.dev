var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { BaseModal } from "./components/BaseModal";
import "./components/leaderboard/LeaderboardClanTable";
import "./components/leaderboard/LeaderboardPlayerList";
import "./components/leaderboard/LeaderboardTabs";
import { modalHeader } from "./components/ui/ModalHeader";
import { translateText } from "./Utils";
let LeaderboardModal = class LeaderboardModal extends BaseModal {
    constructor() {
        super(...arguments);
        this.activeTab = "players";
        this.clanDateRange = null;
        this.loadToken = 0;
    }
    onOpen() {
        this.loadActiveTabData();
    }
    loadActiveTabData() {
        const token = ++this.loadToken;
        const run = async () => {
            if (token !== this.loadToken)
                return;
            if (this.activeTab === "players") {
                await this.playerList?.ensureLoaded();
                if (token !== this.loadToken)
                    return;
                this.playerList?.handleTabActivated();
            }
            else {
                await this.clanTable?.ensureLoaded();
            }
            queueMicrotask(() => {
                if (token !== this.loadToken)
                    return;
                if (this.activeTab === "players")
                    void this.clanTable?.ensureLoaded();
                else
                    void this.playerList?.ensureLoaded();
            });
        };
        void (async () => {
            if (!(this.activeTab === "players" ? this.playerList : this.clanTable)) {
                await this.updateComplete;
            }
            await run();
        })();
    }
    handleTabChange(tab) {
        this.activeTab = tab;
        this.loadActiveTabData();
    }
    handleClanDateRangeChange(event) {
        this.clanDateRange = event.detail;
    }
    render() {
        let dateRange = html ``;
        if (this.clanDateRange) {
            const start = new Date(this.clanDateRange.start).toLocaleDateString();
            const end = new Date(this.clanDateRange.end).toLocaleDateString();
            dateRange = html `<span
        class="text-sm font-normal text-white/40 ml-2 wrap-break-words"
        >(${start} - ${end})</span
      >`;
        }
        const refreshTime = html `<span
      class="text-sm font-normal text-white/40 ml-2 wrap-break-words italic"
      >(${translateText("leaderboard_modal.refresh_time")})</span
    >`;
        const content = html `
      <div class="${this.modalContainerClass}">
        ${modalHeader({
            titleContent: html `
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="text-white text-xl sm:text-2xl font-bold uppercase tracking-widest"
              >
                ${translateText("leaderboard_modal.title")}
              </span>
              ${this.activeTab === "clans" ? dateRange : ""}
              ${this.activeTab === "players" ? refreshTime : ""}
            </div>
          `,
            onBack: () => this.close(),
            ariaLabel: translateText("common.close"),
        })}

        <div class="flex-1 flex flex-col min-h-0">
          <leaderboard-tabs
            .activeTab=${this.activeTab}
            @tab-change=${(event) => this.handleTabChange(event.detail)}
          ></leaderboard-tabs>
          <div class="flex-1 min-h-0">
            <leaderboard-player-list
              class=${this.activeTab === "players" ? "h-full" : "hidden"}
            ></leaderboard-player-list>
            <leaderboard-clan-table
              class=${this.activeTab === "clans" ? "h-full" : "hidden"}
              @date-range-change=${(event) => this.handleClanDateRangeChange(event)}
            ></leaderboard-clan-table>
          </div>
        </div>
      </div>
    `;
        if (this.inline)
            return content;
        return html `
      <o-modal
        id="leaderboard-modal"
        ?inline=${this.inline}
        hideCloseButton
        hideHeader
      >
        ${content}
      </o-modal>
    `;
    }
};
__decorate([
    state()
], LeaderboardModal.prototype, "activeTab", void 0);
__decorate([
    state()
], LeaderboardModal.prototype, "clanDateRange", void 0);
__decorate([
    query("leaderboard-player-list")
], LeaderboardModal.prototype, "playerList", void 0);
__decorate([
    query("leaderboard-clan-table")
], LeaderboardModal.prototype, "clanTable", void 0);
LeaderboardModal = __decorate([
    customElement("leaderboard-modal")
], LeaderboardModal);
export { LeaderboardModal };
//# sourceMappingURL=LeaderboardModal.js.map