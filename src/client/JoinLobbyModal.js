var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { getActiveModifiers, getGameModeLabel, getMapName, renderDuration, renderNumber, translateText, } from "../client/Utils";
import { GAME_ID_REGEX, GameRecordSchema, LobbyInfoEvent, } from "../core/Schemas";
import { getServerConfigFromClient } from "../core/configuration/ConfigLoader";
import { GameMode, GameType, HumansVsNations } from "../core/game/Game";
import { getApiBase } from "./Api";
import { crazyGamesSDK } from "./CrazyGamesSDK";
import { terrainMapFileLoader } from "./TerrainMapFileLoader";
import { BaseModal } from "./components/BaseModal";
import "./components/CopyButton";
import "./components/LobbyConfigItem";
import "./components/LobbyPlayerView";
import { modalHeader } from "./components/ui/ModalHeader";
import { nationsConfigToSlider } from "./utilities/GameConfigHelpers";
let JoinLobbyModal = class JoinLobbyModal extends BaseModal {
    constructor() {
        super(...arguments);
        this.eventBus = null;
        this.players = [];
        this.playerCount = 0;
        this.gameConfig = null;
        this.currentLobbyId = "";
        this.currentClientID = "";
        this.nationCount = 0;
        this.lobbyStartAt = null;
        this.isConnecting = true;
        this.lobbyCreatorClientID = null;
        this.leaveLobbyOnClose = true;
        this.countdownTimerId = null;
        this.handledJoinTimeout = false;
        this.handleLobbyInfo = (event) => {
            const lobby = event.lobby;
            this.currentClientID = event.myClientID;
            // Only stop showing spinner when we have player info
            if (this.isConnecting && lobby.clients) {
                this.isConnecting = false;
            }
            this.updateFromLobby({
                ...lobby,
                startsAt: lobby.startsAt ?? undefined,
            });
        };
    }
    isPrivateLobby() {
        return this.gameConfig?.gameType === GameType.Private;
    }
    render() {
        // Pre-join state: show lobby ID input form
        if (!this.currentLobbyId) {
            return this.renderJoinForm();
        }
        // Post-join state: show lobby info (identical for public & private)
        const secondsRemaining = this.lobbyStartAt !== null
            ? Math.max(0, Math.floor((this.lobbyStartAt - Date.now()) / 1000))
            : null;
        const statusLabel = secondsRemaining === null
            ? translateText("public_lobby.waiting_for_players")
            : secondsRemaining > 0
                ? translateText("public_lobby.starting_in", {
                    time: renderDuration(secondsRemaining),
                })
                : translateText("public_lobby.started");
        const maxPlayers = this.gameConfig?.maxPlayers ?? 0;
        const playerCount = this.players?.length ?? 0;
        const hostClientID = this.isPrivateLobby()
            ? (this.lobbyCreatorClientID ?? "")
            : "";
        const content = html `
      <div class="${this.modalContainerClass}">
        ${modalHeader({
            title: translateText("public_lobby.title"),
            onBack: () => this.closeAndLeave(),
            ariaLabel: translateText("common.close"),
            rightContent: this.currentLobbyId && this.isPrivateLobby()
                ? html `
                  <copy-button .lobbyId=${this.currentLobbyId}></copy-button>
                `
                : undefined,
        })}
        <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 mr-1">
          ${this.isConnecting
            ? html `
                <div
                  class="min-h-[240px] flex flex-col items-center justify-center gap-4"
                >
                  <div
                    class="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"
                  ></div>
                  <p class="text-center text-white/80 text-sm">
                    ${translateText("public_lobby.connecting")}
                  </p>
                </div>
              `
            : html `
                ${this.gameConfig ? this.renderGameConfig() : html ``}
                ${this.players.length > 0
                ? html `
                      <lobby-player-view
                        class="mt-6"
                        .gameMode=${this.gameConfig?.gameMode ?? GameMode.FFA}
                        .clients=${this.players}
                        .lobbyCreatorClientID=${hostClientID}
                        .currentClientID=${this.currentClientID}
                        .teamCount=${this.gameConfig?.playerTeams ?? 2}
                        .isPublicGame=${this.gameConfig?.gameType ===
                    GameType.Public}
                        .nationCount=${nationsConfigToSlider(this.gameConfig?.nations ?? "default", this.nationCount)}
                      ></lobby-player-view>
                    `
                : ""}
              `}
        </div>

        ${this.isPrivateLobby()
            ? html `
              <div
                class="p-6 lg:p-6 border-t border-white/10 bg-black/20 shrink-0"
              >
                <button
                  class="w-full py-4 text-sm font-bold text-white uppercase tracking-widest bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none"
                  disabled
                >
                  ${translateText("private_lobby.joined_waiting")}
                </button>
              </div>
            `
            : html `
              <div
                class="p-6 lg:p-6 border-t border-white/10 bg-black/20 shrink-0"
              >
                <div
                  class="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between gap-3"
                >
                  <div class="flex flex-col">
                    <span
                      class="text-[10px] font-bold uppercase tracking-widest text-white/40"
                      >${translateText("public_lobby.status")}</span
                    >
                    <span class="text-sm font-bold text-white"
                      >${statusLabel}</span
                    >
                  </div>
                  ${maxPlayers > 0
                ? html `
                        <div
                          class="flex items-center gap-2 text-white/80 text-xs font-bold uppercase tracking-widest"
                        >
                          <span>${playerCount}/${maxPlayers}</span>
                          <svg
                            class="w-4 h-4 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.972 0 004 15v3H1v-3a3 3 0 013.75-2.906z"
                            ></path>
                          </svg>
                        </div>
                      `
                : html ``}
                </div>
              </div>
            `}
      </div>
    `;
        if (this.inline) {
            return content;
        }
        return html `
      <o-modal
        ?hideHeader=${true}
        ?hideCloseButton=${true}
        ?inline=${this.inline}
      >
        ${content}
      </o-modal>
    `;
    }
    renderJoinForm() {
        const content = html `
      <div class="${this.modalContainerClass}">
        ${modalHeader({
            title: translateText("private_lobby.title"),
            onBack: () => this.closeAndLeave(),
            ariaLabel: translateText("common.close"),
        })}
        <form @submit=${this.joinLobbyFromInput} class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 mr-1">
          <div class="flex flex-col gap-3">
            <div class="flex gap-2">
              <input
                type="text"
                id="lobbyIdInput"
                placeholder=${translateText("private_lobby.enter_id")}
                @keyup=${this.handleChange}
                class="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm tracking-wider"
              />
              <button
                @click=${this.pasteFromClipboard}
                class="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all group"
                title=${translateText("common.paste")}
              >
                <svg
                  class="text-white/60 group-hover:text-white transition-colors"
                  stroke="currentColor"
                  fill="currentColor"
                  stroke-width="0"
                  viewBox="0 0 32 32"
                  height="18px"
                  width="18px"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M 15 3 C 13.742188 3 12.847656 3.890625 12.40625 5 L 5 5 L 5 28 L 13 28 L 13 30 L 27 30 L 27 14 L 25 14 L 25 5 L 17.59375 5 C 17.152344 3.890625 16.257813 3 15 3 Z M 15 5 C 15.554688 5 16 5.445313 16 6 L 16 7 L 19 7 L 19 9 L 11 9 L 11 7 L 14 7 L 14 6 C 14 5.445313 14.445313 5 15 5 Z M 7 7 L 9 7 L 9 11 L 21 11 L 21 7 L 23 7 L 23 14 L 13 14 L 13 26 L 7 26 Z M 15 16 L 25 16 L 25 28 L 15 28 Z"
                  ></path>
                </svg>
              </button>
            </div>
            <o-button
              title=${translateText("private_lobby.join_lobby")}
              block
              submit
            ></o-button>
          </div>
        </div>
      </div>
    `;
        if (this.inline) {
            return content;
        }
        return html `
      <o-modal
        ?hideHeader=${true}
        ?hideCloseButton=${true}
        ?inline=${this.inline}
      >
        ${content}
      </o-modal>
    `;
    }
    open(lobbyId = "", lobbyInfo) {
        super.open();
        if (lobbyId) {
            this.startTrackingLobby(lobbyId, lobbyInfo);
            // If opened with lobbyId but no lobbyInfo (URL join case), auto-join the lobby
            if (!lobbyInfo) {
                this.handleUrlJoin(lobbyId);
            }
        }
    }
    async handleUrlJoin(lobbyId) {
        try {
            const gameExists = await this.checkActiveLobby(lobbyId);
            if (gameExists)
                return;
            // Active lobby not found, check if it's an archived game
            switch (await this.checkArchivedGame(lobbyId)) {
                case "success":
                    return;
                case "not_found":
                    this.resetTrackingState();
                    this.showMessage(translateText("private_lobby.not_found"), "red");
                    return;
                case "version_mismatch":
                    this.resetTrackingState();
                    this.showMessage(translateText("private_lobby.version_mismatch"), "red");
                    return;
                case "error":
                    this.resetTrackingState();
                    this.showMessage(translateText("private_lobby.error"), "red");
                    return;
            }
        }
        catch (error) {
            console.error("Error checking lobby from URL:", error);
            this.resetTrackingState();
            this.showMessage(translateText("private_lobby.error"), "red");
        }
    }
    startTrackingLobby(lobbyId, lobbyInfo) {
        this.currentLobbyId = lobbyId;
        // clientID will be assigned by server via lobby_info message
        this.currentClientID = "";
        this.gameConfig = null;
        this.players = [];
        this.nationCount = 0;
        this.lobbyStartAt = null;
        this.lobbyCreatorClientID = null;
        this.isConnecting = true;
        this.handledJoinTimeout = false;
        this.startLobbyUpdates();
        if (lobbyInfo) {
            this.updateFromLobby(lobbyInfo);
            // Only stop showing spinner when we have player info
            if ("clients" in lobbyInfo && lobbyInfo.clients) {
                this.isConnecting = false;
            }
        }
    }
    resetTrackingState() {
        this.stopLobbyUpdates();
        this.currentLobbyId = "";
        this.currentClientID = "";
        this.isConnecting = false;
    }
    leaveLobby() {
        if (!this.currentLobbyId) {
            return;
        }
        this.dispatchEvent(new CustomEvent("leave-lobby", {
            detail: { lobby: this.currentLobbyId },
            bubbles: true,
            composed: true,
        }));
    }
    onClose() {
        this.clearCountdownTimer();
        this.stopLobbyUpdates();
        if (this.leaveLobbyOnClose) {
            this.leaveLobby();
            this.updateHistory("/");
        }
        if (this.lobbyIdInput)
            this.lobbyIdInput.value = "";
        this.gameConfig = null;
        this.players = [];
        this.currentLobbyId = "";
        this.currentClientID = "";
        this.nationCount = 0;
        this.lobbyStartAt = null;
        this.lobbyCreatorClientID = null;
        this.isConnecting = true;
        this.leaveLobbyOnClose = true;
    }
    disconnectedCallback() {
        this.clearCountdownTimer();
        this.stopLobbyUpdates();
        super.disconnectedCallback();
    }
    closeAndLeave() {
        this.leaveLobby();
        try {
            this.updateHistory("/");
        }
        catch (error) {
            console.warn("Failed to restore URL on leave:", error);
        }
        this.leaveLobbyOnClose = false;
        this.close();
    }
    closeWithoutLeaving() {
        this.leaveLobbyOnClose = false;
        this.close();
    }
    updateHistory(url) {
        if (!crazyGamesSDK.isOnCrazyGames()) {
            history.replaceState(null, "", url);
        }
    }
    // --- Game config rendering ---
    renderGameConfig() {
        if (!this.gameConfig)
            return html ``;
        const c = this.gameConfig;
        const mapName = getMapName(c.gameMap);
        const modeName = getGameModeLabel(c);
        const modifiers = getActiveModifiers(c.publicGameModifiers);
        return html `
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <lobby-config-item
          .label=${translateText("map.map")}
          .value=${mapName}
        ></lobby-config-item>
        <lobby-config-item
          .label=${translateText("host_modal.mode")}
          .value=${modeName}
        ></lobby-config-item>
        ${modifiers.map((m) => html `
            <lobby-config-item
              .label=${translateText(m.labelKey)}
              .value=${m.formattedValue ??
            (m.value !== undefined
                ? renderNumber(m.value)
                : translateText("common.enabled"))}
            ></lobby-config-item>
          `)}
        ${c.gameMode !== GameMode.FFA &&
            c.playerTeams &&
            c.playerTeams !== HumansVsNations
            ? html `
              <lobby-config-item
                .label=${typeof c.playerTeams === "string"
                ? translateText("host_modal.team_type")
                : translateText("host_modal.team_count")}
                .value=${typeof c.playerTeams === "string"
                ? translateText("host_modal.teams_" + c.playerTeams)
                : c.playerTeams.toString()}
              ></lobby-config-item>
            `
            : html ``}
      </div>
      ${this.renderDisabledUnits()}
    `;
    }
    renderDisabledUnits() {
        if (!this.gameConfig ||
            !this.gameConfig.disabledUnits ||
            this.gameConfig.disabledUnits.length === 0) {
            return html ``;
        }
        const unitKeys = {
            City: "unit_type.city",
            Airbase: "unit_type.airbase",
            "Radar Station": "unit_type.radar_station",
            Port: "unit_type.port",
            "Defense Post": "unit_type.defense_post",
            "AA Battery": "unit_type.aa_battery",
            "Fighter Squadron": "unit_type.fighter_squadron",
            "Bomber Squadron": "unit_type.bomber_squadron",
            "SAM Launcher": "unit_type.sam_launcher",
            "Missile Silo": "unit_type.missile_silo",
            Warship: "unit_type.warship",
            Factory: "unit_type.factory",
            "Atom Bomb": "unit_type.atom_bomb",
            "Hydrogen Bomb": "unit_type.hydrogen_bomb",
            MIRV: "unit_type.mirv",
            "Trade Ship": "player_stats_table.unit.trade",
            Transport: "player_stats_table.unit.trans",
            "MIRV Warhead": "player_stats_table.unit.mirvw",
        };
        return html `
      <div class="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
        <div
          class="text-xs font-bold text-red-400 uppercase tracking-widest mb-2"
        >
          ${translateText("private_lobby.disabled_units")}
        </div>
        <div class="flex flex-wrap gap-2">
          ${this.gameConfig.disabledUnits.map((unit) => {
            const key = unitKeys[unit];
            const name = key ? translateText(key) : unit;
            return html `
              <span
                class="px-2 py-1 bg-red-500/20 text-red-200 text-xs rounded font-bold border border-red-500/30"
              >
                ${name}
              </span>
            `;
        })}
        </div>
      </div>
    `;
    }
    // --- Lobby event handling ---
    updateFromLobby(lobby) {
        this.players = "clients" in lobby ? (lobby.clients ?? []) : [];
        this.lobbyStartAt = lobby.startsAt ?? null;
        this.syncCountdownTimer();
        if (lobby.gameConfig) {
            const mapChanged = this.gameConfig?.gameMap !== lobby.gameConfig.gameMap;
            this.gameConfig = lobby.gameConfig;
            if (mapChanged) {
                this.loadNationCount();
            }
        }
        this.lobbyCreatorClientID =
            "lobbyCreatorClientID" in lobby
                ? (lobby.lobbyCreatorClientID ?? null)
                : null;
    }
    startLobbyUpdates() {
        this.stopLobbyUpdates();
        if (!this.eventBus) {
            console.warn("JoinLobbyModal: eventBus not set, cannot subscribe to lobby updates");
            return;
        }
        this.eventBus.on(LobbyInfoEvent, this.handleLobbyInfo);
    }
    stopLobbyUpdates() {
        this.eventBus?.off(LobbyInfoEvent, this.handleLobbyInfo);
    }
    // --- Countdown timer ---
    syncCountdownTimer() {
        if (this.lobbyStartAt === null) {
            this.clearCountdownTimer();
            return;
        }
        if (this.countdownTimerId !== null) {
            return;
        }
        this.countdownTimerId = window.setInterval(() => {
            this.checkForJoinTimeout();
            this.requestUpdate();
        }, 1000);
    }
    clearCountdownTimer() {
        if (this.countdownTimerId === null) {
            return;
        }
        clearInterval(this.countdownTimerId);
        this.countdownTimerId = null;
    }
    checkForJoinTimeout() {
        if (this.handledJoinTimeout ||
            !this.isConnecting ||
            this.lobbyStartAt === null ||
            !this.isModalOpen) {
            return;
        }
        if (Date.now() < this.lobbyStartAt) {
            return;
        }
        this.handledJoinTimeout = true;
        window.dispatchEvent(new CustomEvent("show-message", {
            detail: {
                message: translateText("public_lobby.join_timeout"),
                color: "red",
                duration: 3500,
            },
        }));
        this.closeAndLeave();
    }
    // --- Nation count ---
    async loadNationCount() {
        if (!this.gameConfig) {
            this.nationCount = 0;
            return;
        }
        const currentMap = this.gameConfig.gameMap;
        try {
            const mapData = terrainMapFileLoader.getMapData(currentMap);
            const manifest = await mapData.manifest();
            if (this.gameConfig?.gameMap === currentMap) {
                this.nationCount = manifest.nations.length;
            }
        }
        catch (error) {
            console.warn("Failed to load nation count", error);
            if (this.gameConfig?.gameMap === currentMap) {
                this.nationCount = 0;
            }
        }
    }
    // --- Private lobby join flow (lobby ID input) ---
    isValidLobbyId(value) {
        return GAME_ID_REGEX.test(value);
    }
    normalizeLobbyId(input) {
        const trimmed = input.trim();
        if (!trimmed)
            return null;
        const extracted = this.extractLobbyIdFromUrl(trimmed).trim();
        if (!this.isValidLobbyId(extracted))
            return null;
        return extracted;
    }
    sanitizeForLog(value) {
        return value.replace(/[\r\n]/g, "");
    }
    extractLobbyIdFromUrl(input) {
        if (!input.startsWith("http")) {
            return input;
        }
        try {
            const url = new URL(input);
            const match = url.pathname.match(/game\/([^/]+)/);
            const candidate = match?.[1];
            if (candidate && GAME_ID_REGEX.test(candidate))
                return candidate;
            return input;
        }
        catch (error) {
            console.warn("Failed to parse lobby URL", error);
            return input;
        }
    }
    setLobbyId(id) {
        if (this.lobbyIdInput) {
            this.lobbyIdInput.value = this.extractLobbyIdFromUrl(id);
        }
    }
    handleChange(e) {
        const value = e.target.value.trim();
        this.setLobbyId(value);
    }
    async pasteFromClipboard() {
        try {
            const clipText = await navigator.clipboard.readText();
            this.setLobbyId(clipText);
        }
        catch (err) {
            console.error("Failed to read clipboard contents: ", err);
        }
    }
    async joinLobbyFromInput(e) {
        e.preventDefault();
        const lobbyId = this.normalizeLobbyId(this.lobbyIdInput.value);
        if (!lobbyId) {
            this.showMessage(translateText("private_lobby.not_found"), "red");
            return;
        }
        this.lobbyIdInput.value = lobbyId;
        console.log(`Joining lobby with ID: ${this.sanitizeForLog(lobbyId)}`);
        // Initialize tracking state before checking/joining
        this.startTrackingLobby(lobbyId);
        try {
            const gameExists = await this.checkActiveLobby(lobbyId);
            if (gameExists)
                return;
            switch (await this.checkArchivedGame(lobbyId)) {
                case "success":
                    return;
                case "not_found":
                    this.resetTrackingState();
                    this.showMessage(translateText("private_lobby.not_found"), "red");
                    return;
                case "version_mismatch":
                    this.resetTrackingState();
                    this.showMessage(translateText("private_lobby.version_mismatch"), "red");
                    return;
                case "error":
                    this.resetTrackingState();
                    this.showMessage(translateText("private_lobby.error"), "red");
                    return;
            }
        }
        catch (error) {
            console.error("Error checking lobby existence:", error);
            this.resetTrackingState();
            this.showMessage(translateText("private_lobby.error"), "red");
        }
    }
    showMessage(message, color = "green") {
        window.dispatchEvent(new CustomEvent("show-message", {
            detail: { message, duration: 3000, color },
        }));
    }
    async checkActiveLobby(lobbyId) {
        const config = await getServerConfigFromClient();
        const url = `/${config.workerPath(lobbyId)}/api/game/${lobbyId}/exists`;
        const response = await fetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
            return false;
        }
        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
            return false;
        }
        let gameInfo;
        try {
            gameInfo = await response.json();
        }
        catch (error) {
            console.warn("Failed to parse active lobby response", error);
            return false;
        }
        if (gameInfo.exists) {
            this.showMessage(translateText("private_lobby.joined_waiting"));
            // Use the clientID that was already set by startTrackingLobby in open()
            this.dispatchEvent(new CustomEvent("join-lobby", {
                detail: {
                    gameID: lobbyId,
                    source: "private",
                },
                bubbles: true,
                composed: true,
            }));
            // Event tracking is already started by open() -> startTrackingLobby()
            // LobbyInfoEvents will update the UI as they arrive
            return true;
        }
        return false;
    }
    async checkArchivedGame(lobbyId) {
        const archiveResponse = await fetch(`${getApiBase()}/game/${lobbyId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });
        if (archiveResponse.status === 404) {
            return "not_found";
        }
        if (archiveResponse.status !== 200) {
            return "error";
        }
        const archiveData = await archiveResponse.json();
        const parsed = GameRecordSchema.safeParse(archiveData);
        if (!parsed.success) {
            return "version_mismatch";
        }
        if (window.GIT_COMMIT !== "DEV" &&
            parsed.data.gitCommit !== window.GIT_COMMIT) {
            const safeLobbyId = this.sanitizeForLog(lobbyId);
            console.warn(`Git commit hash mismatch for game ${safeLobbyId}`, archiveData.details);
            return "version_mismatch";
        }
        // If the modal closes as part of joining the replay, do not leave/reset URL
        this.leaveLobbyOnClose = false;
        this.dispatchEvent(new CustomEvent("join-lobby", {
            detail: {
                gameID: lobbyId,
                gameRecord: parsed.data,
                source: "private",
            },
            bubbles: true,
            composed: true,
        }));
        return "success";
    }
};
__decorate([
    query("#lobbyIdInput")
], JoinLobbyModal.prototype, "lobbyIdInput", void 0);
__decorate([
    property({ attribute: false })
], JoinLobbyModal.prototype, "eventBus", void 0);
__decorate([
    state()
], JoinLobbyModal.prototype, "players", void 0);
__decorate([
    state()
], JoinLobbyModal.prototype, "playerCount", void 0);
__decorate([
    state()
], JoinLobbyModal.prototype, "gameConfig", void 0);
__decorate([
    state()
], JoinLobbyModal.prototype, "currentLobbyId", void 0);
__decorate([
    state()
], JoinLobbyModal.prototype, "currentClientID", void 0);
__decorate([
    state()
], JoinLobbyModal.prototype, "nationCount", void 0);
__decorate([
    state()
], JoinLobbyModal.prototype, "lobbyStartAt", void 0);
__decorate([
    state()
], JoinLobbyModal.prototype, "isConnecting", void 0);
__decorate([
    state()
], JoinLobbyModal.prototype, "lobbyCreatorClientID", void 0);
JoinLobbyModal = __decorate([
    customElement("join-lobby-modal")
], JoinLobbyModal);
export { JoinLobbyModal };
//# sourceMappingURL=JoinLobbyModal.js.map