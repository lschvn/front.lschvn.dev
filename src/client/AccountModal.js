var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { getServerConfigFromClient } from "../core/configuration/ConfigLoader";
import { fetchPlayerById, getUserMe } from "./Api";
import { discordLogin, logOut, sendMagicLink } from "./Auth";
import "./components/baseComponents/stats/DiscordUserHeader";
import "./components/baseComponents/stats/GameList";
import "./components/baseComponents/stats/PlayerStatsTable";
import "./components/baseComponents/stats/PlayerStatsTree";
import { BaseModal } from "./components/BaseModal";
import "./components/CopyButton";
import "./components/Difficulties";
import "./components/PatternButton";
import { modalHeader } from "./components/ui/ModalHeader";
import { translateText } from "./Utils";
let AccountModal = class AccountModal extends BaseModal {
    constructor() {
        super();
        this.email = "";
        this.isLoadingUser = false;
        this.userMeResponse = null;
        this.statsTree = null;
        this.recentGames = [];
        document.addEventListener("userMeResponse", (event) => {
            const customEvent = event;
            if (customEvent.detail) {
                this.userMeResponse = customEvent.detail;
                if (this.userMeResponse?.player?.publicId === undefined) {
                    this.statsTree = null;
                    this.recentGames = [];
                }
            }
            else {
                this.statsTree = null;
                this.recentGames = [];
                this.requestUpdate();
            }
        });
    }
    hasAnyStats() {
        if (!this.statsTree)
            return false;
        // Check if statsTree has any data
        return (Object.keys(this.statsTree).length > 0 &&
            Object.values(this.statsTree).some((gameTypeStats) => gameTypeStats && Object.keys(gameTypeStats).length > 0));
    }
    render() {
        const content = this.isLoadingUser
            ? this.renderLoadingSpinner(translateText("account_modal.fetching_account"))
            : this.renderInner();
        if (this.inline) {
            return this.isLoadingUser
                ? html `<div class="${this.modalContainerClass}">
            ${modalHeader({
                    title: translateText("account_modal.title"),
                    onBack: () => this.close(),
                    ariaLabel: translateText("common.back"),
                })}
            ${content}
          </div>`
                : content;
        }
        return html `
      <o-modal
        id="account-modal"
        title=""
        ?hideCloseButton=${true}
        ?inline=${this.inline}
        hideHeader
      >
        ${content}
      </o-modal>
    `;
    }
    renderInner() {
        const isLoggedIn = !!this.userMeResponse?.user;
        const title = translateText("account_modal.title");
        const publicId = this.userMeResponse?.player?.publicId ?? "";
        const displayId = publicId || translateText("account_modal.not_found");
        return html `
      <div class="${this.modalContainerClass}">
        ${modalHeader({
            title,
            onBack: () => this.close(),
            ariaLabel: translateText("common.back"),
            rightContent: isLoggedIn
                ? html `
                <div class="flex items-center gap-2">
                  <span
                    class="text-xs text-blue-400 font-bold uppercase tracking-wider"
                    >${translateText("account_modal.personal_player_id")}</span
                  >
                  <copy-button
                    .lobbyId=${publicId}
                    .copyText=${publicId}
                    .displayText=${displayId}
                  ></copy-button>
                </div>
              `
                : undefined,
        })}

        <div class="flex-1 overflow-y-auto custom-scrollbar mr-1">
          ${isLoggedIn ? this.renderAccountInfo() : this.renderLoginOptions()}
        </div>
      </div>
    `;
    }
    renderAccountInfo() {
        const me = this.userMeResponse?.user;
        const isLinked = me?.discord ?? me?.email;
        if (!isLinked) {
            return this.renderLoginOptions();
        }
        return html `
      <div class="p-6">
        <div class="flex flex-col gap-6">
          <!-- Top Row: Connected As -->
          <div class="bg-white/5 rounded-xl border border-white/10 p-6">
            <div class="flex flex-col items-center gap-4">
              <div
                class="text-xs text-white/40 uppercase tracking-widest font-bold border-b border-white/5 pb-2 px-8"
              >
                ${translateText("account_modal.connected_as")}
              </div>
              <div class="flex items-center gap-8 justify-center flex-wrap">
                <discord-user-header
                  .data=${this.userMeResponse?.user?.discord ?? null}
                ></discord-user-header>
                ${this.renderLoggedInAs()}
              </div>
            </div>
          </div>

          <!-- Middle Row: Stats Section -->
          ${this.hasAnyStats()
            ? html `<div
                class="bg-white/5 rounded-xl border border-white/10 p-6"
              >
                <h3
                  class="text-lg font-bold text-white mb-4 flex items-center gap-2"
                >
                  <span class="text-blue-400">📊</span>
                  ${translateText("account_modal.stats_overview")}
                </h3>
                <player-stats-tree-view
                  .statsTree=${this.statsTree}
                ></player-stats-tree-view>
              </div>`
            : ""}

          <!-- Bottom Row: Recent Games Section -->
          <div class="bg-white/5 rounded-xl border border-white/10 p-6">
            <h3
              class="text-lg font-bold text-white mb-4 flex items-center gap-2"
            >
              <span class="text-blue-400">🎮</span>
              ${translateText("game_list.recent_games")}
            </h3>
            <game-list
              .games=${this.recentGames}
              .onViewGame=${(id) => void this.viewGame(id)}
            ></game-list>
          </div>
        </div>
      </div>
    `;
    }
    renderLoggedInAs() {
        const me = this.userMeResponse?.user;
        if (me?.discord) {
            return html `
        <div class="flex flex-col items-center gap-3 w-full">
          ${this.renderLogoutButton()}
        </div>
      `;
        }
        else if (me?.email) {
            return html `
        <div class="flex flex-col items-center gap-3 w-full">
          <div class="text-white text-lg font-medium">
            ${translateText("account_modal.linked_account", {
                account_name: me.email,
            })}
          </div>
          ${this.renderLogoutButton()}
        </div>
      `;
        }
        return html ``;
    }
    async viewGame(gameId) {
        this.close();
        const config = await getServerConfigFromClient();
        const encodedGameId = encodeURIComponent(gameId);
        const newUrl = `/${config.workerPath(gameId)}/game/${encodedGameId}`;
        history.pushState({ join: gameId }, "", newUrl);
        window.dispatchEvent(new CustomEvent("join-changed", { detail: { gameId: encodedGameId } }));
    }
    renderLogoutButton() {
        return html `
      <button
        @click="${this.handleLogout}"
        class="px-6 py-2 text-sm font-bold text-white uppercase tracking-wider bg-red-600/80 hover:bg-red-600 border border-red-500/50 rounded-lg transition-all shadow-lg hover:shadow-red-900/40"
      >
        ${translateText("account_modal.log_out")}
      </button>
    `;
    }
    renderLoginOptions() {
        return html `
      <div class="flex items-center justify-center p-6 min-h-full">
        <div
          class="w-full max-w-md bg-white/5 rounded-2xl border border-white/10 p-8"
        >
          <div class="text-center mb-8">
            <div
              class="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-inner"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-8 h-8 text-blue-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
            </div>
            <p class="text-white/50 text-sm font-medium">
              ${translateText("account_modal.sign_in_desc")}
            </p>
          </div>

          <div class="space-y-6">
            <!-- Discord Login Button -->
            <button
              @click="${this.handleDiscordLogin}"
              class="w-full px-6 py-4 text-white bg-[#5865F2] hover:bg-[#4752C4] border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5865F2] transition-colors duration-200 flex items-center justify-center gap-3 group relative overflow-hidden shadow-lg hover:shadow-[#5865F2]/20"
            >
              <img
                src="/images/DiscordLogo.svg"
                alt="Discord"
                class="w-6 h-6 relative z-10"
              />
              <span class="font-bold relative z-10 tracking-wide"
                >${translateText("main.login_discord") ||
            translateText("account_modal.link_discord")}</span
              >
            </button>

            <!-- Divider -->
            <div class="flex items-center gap-4 py-2">
              <div class="h-px bg-white/10 flex-1"></div>
              <span
                class="text-[10px] uppercase tracking-widest text-white/30 font-bold"
              >
                ${translateText("account_modal.or")}
              </span>
              <div class="h-px bg-white/10 flex-1"></div>
            </div>

            <!-- Email Recovery -->
            <div class="space-y-3">
              <div class="relative group">
                <input
                  type="email"
                  id="email"
                  name="email"
                  .value="${this.email}"
                  @input="${this.handleEmailInput}"
                  class="w-full pl-4 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-medium hover:bg-white/10"
                  placeholder="${translateText("account_modal.email_placeholder")}"
                  required
                />
              </div>
              <button
                @click="${this.handleSubmit}"
                class="w-full px-6 py-3 text-sm font-bold text-white uppercase tracking-wider bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl transition-all shadow-lg hover:shadow-blue-900/40 border border-white/5"
              >
                ${translateText("account_modal.get_magic_link")}
              </button>
            </div>
          </div>

          <div class="mt-8 text-center border-t border-white/10 pt-6">
            <button
              @click="${this.handleLogout}"
              class="text-[10px] font-bold text-white/20 hover:text-red-400 transition-colors uppercase tracking-widest pb-0.5"
            >
              ${translateText("account_modal.clear_session")}
            </button>
          </div>
        </div>
      </div>
    `;
    }
    handleEmailInput(e) {
        const target = e.target;
        this.email = target.value;
    }
    async handleSubmit() {
        if (!this.email) {
            alert(translateText("account_modal.enter_email_address"));
            return;
        }
        const success = await sendMagicLink(this.email);
        if (success) {
            alert(translateText("account_modal.recovery_email_sent", {
                email: this.email,
            }));
        }
        else {
            alert(translateText("account_modal.failed_to_send_recovery_email"));
        }
    }
    handleDiscordLogin() {
        discordLogin();
    }
    onOpen() {
        this.isLoadingUser = true;
        void getUserMe()
            .then((userMe) => {
            if (userMe) {
                this.userMeResponse = userMe;
                if (this.userMeResponse?.player?.publicId) {
                    this.loadPlayerProfile(this.userMeResponse.player.publicId);
                }
            }
            this.isLoadingUser = false;
            this.requestUpdate();
        })
            .catch((err) => {
            console.warn("Failed to fetch user info in AccountModal.open():", err);
            this.isLoadingUser = false;
            this.requestUpdate();
        });
        this.requestUpdate();
    }
    onClose() {
        this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
    }
    async handleLogout() {
        await logOut();
        this.close();
        // Refresh the page after logout to update the UI state
        window.location.reload();
    }
    async loadPlayerProfile(publicId) {
        try {
            const data = await fetchPlayerById(publicId);
            if (!data) {
                this.requestUpdate();
                return;
            }
            this.recentGames = data.games;
            this.statsTree = data.stats;
            this.requestUpdate();
        }
        catch (err) {
            console.warn("Failed to load player data:", err);
            this.requestUpdate();
        }
    }
};
__decorate([
    state()
], AccountModal.prototype, "email", void 0);
__decorate([
    state()
], AccountModal.prototype, "isLoadingUser", void 0);
AccountModal = __decorate([
    customElement("account-modal")
], AccountModal);
export { AccountModal };
//# sourceMappingURL=AccountModal.js.map