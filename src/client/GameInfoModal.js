var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { fetchGameById } from "./Api";
import { terrainMapFileLoader } from "./TerrainMapFileLoader";
import { renderDuration, translateText } from "./Utils";
import { Ranking, RankType, } from "./components/baseComponents/ranking/GameInfoRanking";
import "./components/baseComponents/ranking/PlayerRow";
import "./components/baseComponents/ranking/RankingControls";
import "./components/baseComponents/ranking/RankingHeader";
let GameInfoModal = class GameInfoModal extends LitElement {
    constructor() {
        super(...arguments);
        this.mapImage = null;
        this.gameInfo = null;
        this.rankedPlayers = [];
        this.gameId = null;
        this.rankType = RankType.Lifetime;
        this.username = null;
        this.isLoadingGame = true;
        this.ranking = null;
    }
    connectedCallback() {
        super.connectedCallback();
        this.updateRanking();
    }
    createRenderRoot() {
        return this;
    }
    render() {
        return html `
      <o-modal
        id="gameInfoModal"
        title="${translateText("game_info_modal.title")}"
        translationKey="main.game_info"
      >
        <div
          class="h-full flex flex-col items-center px-25 text-center mb-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
        >
          <div class="w-75 sm:w-125">
            ${this.isLoadingGame
            ? this.renderLoadingAnimation()
            : this.renderRanking()}
          </div>
        </div>
      </o-modal>
    `;
    }
    renderRanking() {
        if (this.rankedPlayers.length === 0) {
            return html `
        <div class="flex flex-col items-center justify-center p-6 text-white">
          <p class="mb-2">❌ ${translateText("game_info_modal.no_winner")}</p>
        </div>
      `;
        }
        return html `
      ${this.renderGameInfo()}
      <ranking-controls
        .rankType=${this.rankType}
        @sort=${this.sort}
      ></ranking-controls>
      ${this.renderSummaryTable()}
    `;
    }
    renderLoadingAnimation() {
        return html ` <div
      class="flex flex-col items-center justify-center p-6 text-white"
    >
      <p class="mb-2">${translateText("game_info_modal.loading_game_info")}</p>
      <div
        class="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"
      ></div>
    </div>`;
    }
    sort(e) {
        this.rankType = e.detail;
        this.updateRanking();
    }
    updateRanking() {
        if (this.ranking) {
            this.rankedPlayers = this.ranking.sortedBy(this.rankType);
        }
    }
    renderGameInfo() {
        const info = this.gameInfo;
        if (!info) {
            return html ``;
        }
        return html `
      <div
        class="h-37.5 flex relative justify-between rounded-xl bg-black/20 items-center"
      >
        ${this.mapImage
            ? html `<img
              src="${this.mapImage}"
              class="absolute place-self-start col-span-full row-span-full h-full rounded-xl mask-[linear-gradient(to_left,transparent,#fff)] object-cover object-center"
            />`
            : html `<div
              class="place-self-start col-span-full row-span-full h-full rounded-xl bg-gray-300"
            ></div>`}
        <div class="text-right p-3 w-full">
          <div class="font-normal pl-1 pr-1">
            <span class="bg-white text-blue-800 font-normal pl-1 pr-1"
              >${info.config.gameMode}</span
            >
            <span class="font-bold">${info.config.gameMap}</span>
          </div>
          <div>${renderDuration(info.duration)}</div>
          <div>
            ${info.players.length} ${translateText("game_info_modal.players")}
          </div>
        </div>
      </div>
    `;
    }
    renderSummaryTable() {
        const bestScore = this.rankedPlayers.length > 0 ? this.score(this.rankedPlayers[0]) : 0;
        return html `
      <ul>
        <ranking-header
          .rankType=${this.rankType}
          @sort=${this.sort}
        ></ranking-header>
        ${this.rankedPlayers.map((player, index) => html `
            <player-row
              .player=${player}
              .rank=${index + 1}
              .score=${this.ranking?.score(player, this.rankType) ?? 0}
              .rankType=${this.rankType}
              .bestScore=${bestScore}
              .currentPlayer=${this.username === player.rawUsername}
            ></player-row>
          `)}
      </ul>
    `;
    }
    open() {
        this.modalEl?.open();
    }
    close() {
        this.modalEl?.close();
    }
    score(player) {
        if (!this.ranking)
            return 0;
        return this.ranking.score(player, this.rankType);
    }
    async loadMapImage(gameMap) {
        try {
            const mapType = gameMap;
            const data = terrainMapFileLoader.getMapData(mapType);
            this.mapImage = data.webpPath;
        }
        catch (error) {
            console.error("Failed to load map image:", error);
        }
    }
    loadUserName() {
        const usernameInput = document.querySelector("username-input");
        if (usernameInput) {
            this.username = usernameInput.getCurrentUsername();
        }
    }
    async loadGame(gameId) {
        try {
            this.isLoadingGame = true;
            this.loadUserName();
            const session = await fetchGameById(gameId);
            if (!session)
                return;
            this.gameInfo = session.info;
            this.ranking = new Ranking(session);
            this.updateRanking();
            this.isLoadingGame = false;
            await this.loadMapImage(session.info.config.gameMap);
        }
        catch (err) {
            console.error("Failed to load game:", err);
        }
        finally {
            this.isLoadingGame = false;
        }
    }
};
__decorate([
    query("o-modal")
], GameInfoModal.prototype, "modalEl", void 0);
__decorate([
    state()
], GameInfoModal.prototype, "mapImage", void 0);
__decorate([
    state()
], GameInfoModal.prototype, "gameInfo", void 0);
__decorate([
    state()
], GameInfoModal.prototype, "rankedPlayers", void 0);
__decorate([
    property({ type: String })
], GameInfoModal.prototype, "gameId", void 0);
__decorate([
    property({ type: String })
], GameInfoModal.prototype, "rankType", void 0);
__decorate([
    state()
], GameInfoModal.prototype, "username", void 0);
__decorate([
    state()
], GameInfoModal.prototype, "isLoadingGame", void 0);
GameInfoModal = __decorate([
    customElement("game-info-modal")
], GameInfoModal);
export { GameInfoModal };
//# sourceMappingURL=GameInfoModal.js.map