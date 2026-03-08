var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Colord } from "colord";
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { GameMode } from "../../../core/game/Game";
import { Platform } from "../../Platform";
import { getTranslatedPlayerTeamLabel, translateText } from "../../Utils";
import { ImmunityBarVisibleEvent } from "./ImmunityTimer";
import { SpawnBarVisibleEvent } from "./SpawnTimer";
import leaderboardRegularIcon from "/images/LeaderboardIconRegularWhite.svg?url";
import leaderboardSolidIcon from "/images/LeaderboardIconSolidWhite.svg?url";
import teamRegularIcon from "/images/TeamIconRegularWhite.svg?url";
import teamSolidIcon from "/images/TeamIconSolidWhite.svg?url";
let GameLeftSidebar = class GameLeftSidebar extends LitElement {
    constructor() {
        super(...arguments);
        this.isLeaderboardShow = false;
        this.isTeamLeaderboardShow = false;
        this.isVisible = false;
        this.isPlayerTeamLabelVisible = false;
        this.playerTeam = null;
        this.spawnBarVisible = false;
        this.immunityBarVisible = false;
        this.playerColor = new Colord("#FFFFFF");
        this._shownOnInit = false;
    }
    createRenderRoot() {
        return this;
    }
    init() {
        this.isVisible = true;
        this.eventBus.on(SpawnBarVisibleEvent, (e) => {
            this.spawnBarVisible = e.visible;
        });
        this.eventBus.on(ImmunityBarVisibleEvent, (e) => {
            this.immunityBarVisible = e.visible;
        });
        if (this.isTeamGame) {
            this.isPlayerTeamLabelVisible = true;
        }
        // Make it visible by default on large screens
        if (Platform.isDesktopWidth) {
            // lg breakpoint
            this._shownOnInit = true;
        }
        this.requestUpdate();
    }
    tick() {
        if (!this.playerTeam && this.game.myPlayer()?.team()) {
            this.playerTeam = this.game.myPlayer().team();
            if (this.playerTeam) {
                this.playerColor = this.game
                    .config()
                    .theme()
                    .teamColor(this.playerTeam);
                this.requestUpdate();
            }
        }
        if (this._shownOnInit && !this.game.inSpawnPhase()) {
            this._shownOnInit = false;
            this.isLeaderboardShow = true;
            this.requestUpdate();
        }
        if (!this.game.inSpawnPhase() && this.isPlayerTeamLabelVisible) {
            this.isPlayerTeamLabelVisible = false;
            this.requestUpdate();
        }
    }
    get barOffset() {
        return (this.spawnBarVisible ? 7 : 0) + (this.immunityBarVisible ? 7 : 0);
    }
    toggleLeaderboard() {
        this.isLeaderboardShow = !this.isLeaderboardShow;
    }
    toggleTeamLeaderboard() {
        this.isTeamLeaderboardShow = !this.isTeamLeaderboardShow;
    }
    get isTeamGame() {
        return this.game?.config().gameConfig().gameMode === GameMode.Team;
    }
    render() {
        return html `
      <aside
        class=${`fixed top-0 min-[1200px]:top-4 left-0 min-[1200px]:left-4 z-900 flex flex-col max-h-[calc(100vh-80px)] overflow-y-auto p-2 bg-gray-800/70 backdrop-blur-xs shadow-xs min-[1200px]:rounded-lg rounded-br-lg ${this.isLeaderboardShow || this.isTeamLeaderboardShow ? "max-[400px]:w-full max-[400px]:rounded-none" : ""} transition-all duration-300 ease-out transform ${this.isVisible ? "translate-x-0" : "hidden"}`}
        style="margin-top: ${this.barOffset}px;"
      >
        <div class="flex items-center gap-4 xl:gap-6 text-white">
          <div
            class="cursor-pointer p-0.5 bg-gray-700/50 hover:bg-gray-600 border rounded-md border-slate-500 transition-colors"
            @click=${this.toggleLeaderboard}
            role="button"
            tabindex="0"
            @keydown=${(e) => {
            if (e.key === "Enter" || e.key === " " || e.code === "Space") {
                e.preventDefault();
                this.toggleLeaderboard();
            }
        }}
          >
            <img
              src=${this.isLeaderboardShow
            ? leaderboardSolidIcon
            : leaderboardRegularIcon}
              alt=${translateText("help_modal.icon_alt_player_leaderboard") ||
            "Player Leaderboard Icon"}
              width="20"
              height="20"
            />
          </div>
          ${this.isTeamGame
            ? html `
                <div
                  class="cursor-pointer p-0.5 bg-gray-700/50 hover:bg-gray-600 border rounded-md border-slate-500 transition-colors"
                  @click=${this.toggleTeamLeaderboard}
                  role="button"
                  tabindex="0"
                  @keydown=${(e) => {
                if (e.key === "Enter" ||
                    e.key === " " ||
                    e.code === "Space") {
                    e.preventDefault();
                    this.toggleTeamLeaderboard();
                }
            }}
                >
                  <img
                    src=${this.isTeamLeaderboardShow
                ? teamSolidIcon
                : teamRegularIcon}
                    alt=${translateText("help_modal.icon_alt_team_leaderboard") || "Team Leaderboard Icon"}
                    width="20"
                    height="20"
                  />
                </div>
              `
            : null}
        </div>
        ${this.isPlayerTeamLabelVisible
            ? html `
              <div
                class="flex items-center w-full text-white mt-2"
                @contextmenu=${(e) => e.preventDefault()}
              >
                ${translateText("help_modal.ui_your_team")}
                <span
                  style="--color: ${this.playerColor.toRgbString()}"
                  class="text-(--color)"
                >
                  &nbsp;${getTranslatedPlayerTeamLabel(this.playerTeam)}
                  &#10687;
                </span>
              </div>
            `
            : null}
        <div
          class=${`block lg:flex flex-wrap overflow-x-auto min-w-0 w-full ${this.isLeaderboardShow && this.isTeamLeaderboardShow ? "gap-2" : ""}`}
        >
          <leader-board .visible=${this.isLeaderboardShow}></leader-board>
          <team-stats
            class="flex-1"
            .visible=${this.isTeamLeaderboardShow && this.isTeamGame}
          ></team-stats>
        </div>
        <slot></slot>
      </aside>
    `;
    }
};
__decorate([
    state()
], GameLeftSidebar.prototype, "isLeaderboardShow", void 0);
__decorate([
    state()
], GameLeftSidebar.prototype, "isTeamLeaderboardShow", void 0);
__decorate([
    state()
], GameLeftSidebar.prototype, "isVisible", void 0);
__decorate([
    state()
], GameLeftSidebar.prototype, "isPlayerTeamLabelVisible", void 0);
__decorate([
    state()
], GameLeftSidebar.prototype, "playerTeam", void 0);
__decorate([
    state()
], GameLeftSidebar.prototype, "spawnBarVisible", void 0);
__decorate([
    state()
], GameLeftSidebar.prototype, "immunityBarVisible", void 0);
GameLeftSidebar = __decorate([
    customElement("game-left-sidebar")
], GameLeftSidebar);
export { GameLeftSidebar };
//# sourceMappingURL=GameLeftSidebar.js.map