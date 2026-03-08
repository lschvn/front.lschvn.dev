var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { translateText } from "../client/Utils";
import { getServerConfigFromClient } from "../core/configuration/ConfigLoader";
import { Difficulty, GameMapSize, GameMapType, GameMode, } from "../core/game/Game";
import { LobbyInfoEvent, isValidGameID, } from "../core/Schemas";
import { generateID } from "../core/Util";
import { getPlayToken } from "./Auth";
import "./components/baseComponents/Modal";
import { BaseModal } from "./components/BaseModal";
import "./components/CopyButton";
import "./components/GameConfigSettings";
import "./components/LobbyPlayerView";
import "./components/ToggleInputCard";
import { modalHeader } from "./components/ui/ModalHeader";
import { crazyGamesSDK } from "./CrazyGamesSDK";
import { terrainMapFileLoader } from "./TerrainMapFileLoader";
import { getBotsForCompactMap, getNationsForCompactMap, getRandomMapType, getUpdatedDisabledUnits, parseBoundedFloatFromInput, parseBoundedIntegerFromInput, preventDisallowedKeys, sliderToNationsConfig, toOptionalNumber, } from "./utilities/GameConfigHelpers";
let HostLobbyModal = class HostLobbyModal extends BaseModal {
    constructor() {
        super();
        this.selectedMap = GameMapType.World;
        this.selectedDifficulty = Difficulty.Easy;
        this.nations = 0;
        this.defaultNationCount = 0;
        this.gameMode = GameMode.FFA;
        this.teamCount = 2;
        this.bots = 400;
        this.spawnImmunity = false;
        this.spawnImmunityDurationMinutes = undefined;
        this.infiniteGold = false;
        this.donateGold = false;
        this.infiniteTroops = false;
        this.donateTroops = false;
        this.maxTimer = false;
        this.maxTimerValue = undefined;
        this.instantBuild = false;
        this.randomSpawn = false;
        this.compactMap = false;
        this.goldMultiplier = false;
        this.goldMultiplierValue = undefined;
        this.startingGold = false;
        this.startingGoldValue = undefined;
        this.lobbyId = "";
        this.lobbyUrlSuffix = "";
        this.clients = [];
        this.useRandomMap = false;
        this.disabledUnits = [];
        this.lobbyCreatorClientID = "";
        this.eventBus = null;
        // Timers for debouncing slider changes
        this.botsUpdateTimer = null;
        this.nationsUpdateTimer = null;
        this.mapLoader = terrainMapFileLoader;
        this.leaveLobbyOnClose = true;
        this.handleLobbyInfo = (event) => {
            const lobby = event.lobby;
            if (!this.lobbyId || lobby.gameID !== this.lobbyId) {
                return;
            }
            this.lobbyCreatorClientID = lobby.lobbyCreatorClientID ?? "";
            if (lobby.clients) {
                this.clients = lobby.clients;
            }
        };
        this.handleConfigRandomMapSelected = () => {
            void this.handleSelectRandomMap();
        };
        this.handleConfigMapSelected = (e) => {
            const customEvent = e;
            void this.handleMapSelection(customEvent.detail.map);
        };
        this.handleConfigDifficultySelected = (e) => {
            const customEvent = e;
            void this.handleDifficultySelection(customEvent.detail.difficulty);
        };
        this.handleConfigGameModeSelected = (e) => {
            const customEvent = e;
            void this.handleGameModeSelection(customEvent.detail.mode);
        };
        this.handleConfigTeamCountSelected = (e) => {
            const customEvent = e;
            void this.handleTeamCountSelection(customEvent.detail.count);
        };
        this.handleConfigOptionToggleChanged = (e) => {
            const customEvent = e;
            const { labelKey, checked } = customEvent.detail;
            switch (labelKey) {
                case "host_modal.instant_build":
                    this.handleInstantBuildChange(checked);
                    break;
                case "host_modal.random_spawn":
                    this.handleRandomSpawnChange(checked);
                    break;
                case "host_modal.donate_gold":
                    this.handleDonateGoldChange(checked);
                    break;
                case "host_modal.donate_troops":
                    this.handleDonateTroopsChange(checked);
                    break;
                case "host_modal.infinite_gold":
                    this.handleInfiniteGoldChange(checked);
                    break;
                case "host_modal.infinite_troops":
                    this.handleInfiniteTroopsChange(checked);
                    break;
                case "host_modal.compact_map":
                    this.handleCompactMapChange(checked);
                    break;
                default:
                    break;
            }
        };
        this.handleConfigUnitToggleChanged = (e) => {
            const customEvent = e;
            const { unit, checked } = customEvent.detail;
            this.disabledUnits = getUpdatedDisabledUnits(this.disabledUnits, unit, checked);
            this.putGameConfig();
        };
        // Modified to include debouncing
        this.handleBotsChange = (e) => {
            const customEvent = e;
            const value = customEvent.detail.value;
            if (isNaN(value) || value < 0 || value > 400) {
                return;
            }
            // Update the display value immediately
            this.bots = value;
            // Clear any existing timer
            if (this.botsUpdateTimer !== null) {
                clearTimeout(this.botsUpdateTimer);
            }
            // Set a new timer to call putGameConfig after 300ms of inactivity
            this.botsUpdateTimer = window.setTimeout(() => {
                this.putGameConfig();
                this.botsUpdateTimer = null;
            }, 300);
        };
        this.handleInstantBuildChange = (val) => {
            this.instantBuild = val;
            this.putGameConfig();
        };
        this.handleMaxTimerToggle = (checked, value) => {
            this.maxTimer = checked;
            this.maxTimerValue = toOptionalNumber(value);
            this.putGameConfig();
        };
        this.handleSpawnImmunityToggle = (checked, value) => {
            this.spawnImmunity = checked;
            this.spawnImmunityDurationMinutes = toOptionalNumber(value);
            this.putGameConfig();
        };
        this.handleGoldMultiplierToggle = (checked, value) => {
            this.goldMultiplier = checked;
            this.goldMultiplierValue = toOptionalNumber(value);
            this.putGameConfig();
        };
        this.handleStartingGoldToggle = (checked, value) => {
            this.startingGold = checked;
            this.startingGoldValue = toOptionalNumber(value);
            this.putGameConfig();
        };
        this.handleSpawnImmunityDurationKeyDown = (e) => {
            preventDisallowedKeys(e, ["-", "+", "e", "E"]);
        };
        this.handleSpawnImmunityDurationInput = (e) => {
            const input = e.target;
            const value = parseBoundedIntegerFromInput(input, { min: 0, max: 120 });
            if (value === undefined) {
                return;
            }
            this.spawnImmunityDurationMinutes = value;
            this.putGameConfig();
        };
        this.handleGoldMultiplierValueKeyDown = (e) => {
            preventDisallowedKeys(e, ["+", "-", "e", "E"]);
        };
        this.handleGoldMultiplierValueChanges = (e) => {
            const input = e.target;
            const value = parseBoundedFloatFromInput(input, { min: 0.1, max: 1000 });
            if (value === undefined) {
                this.goldMultiplierValue = undefined;
                input.value = "";
            }
            else {
                this.goldMultiplierValue = value;
            }
            this.putGameConfig();
        };
        this.handleStartingGoldValueKeyDown = (e) => {
            preventDisallowedKeys(e, ["-", "+", "e", "E"]);
        };
        this.handleStartingGoldValueChanges = (e) => {
            const input = e.target;
            const value = parseBoundedFloatFromInput(input, {
                min: 0.1,
                max: 1000,
            });
            if (value === undefined) {
                this.startingGoldValue = undefined;
                input.value = "";
            }
            else {
                this.startingGoldValue = value;
            }
            this.putGameConfig();
        };
        this.handleRandomSpawnChange = (val) => {
            this.randomSpawn = val;
            this.putGameConfig();
        };
        this.handleInfiniteGoldChange = (val) => {
            this.infiniteGold = val;
            this.putGameConfig();
        };
        this.handleDonateGoldChange = (val) => {
            this.donateGold = val;
            this.putGameConfig();
        };
        this.handleInfiniteTroopsChange = (val) => {
            this.infiniteTroops = val;
            this.putGameConfig();
        };
        this.handleCompactMapChange = (val) => {
            this.compactMap = val;
            this.bots = getBotsForCompactMap(this.bots, val);
            this.nations = getNationsForCompactMap(this.nations, this.defaultNationCount, val);
            this.putGameConfig();
        };
        this.handleDonateTroopsChange = (val) => {
            this.donateTroops = val;
            this.putGameConfig();
        };
        this.handleMaxTimerValueKeyDown = (e) => {
            preventDisallowedKeys(e, ["-", "+", "e"]);
        };
        this.handleMaxTimerValueChanges = (e) => {
            const input = e.target;
            const value = parseBoundedIntegerFromInput(input, {
                min: 1,
                max: 120,
                stripPattern: /[e+-]/gi,
            });
            if (value === undefined) {
                return;
            }
            this.maxTimerValue = value;
            this.putGameConfig();
        };
        this.handleNationsChange = (e) => {
            const customEvent = e;
            const value = customEvent.detail.value;
            if (isNaN(value) || value < 0 || value > 400) {
                return;
            }
            this.nations = value;
            if (this.nationsUpdateTimer !== null) {
                clearTimeout(this.nationsUpdateTimer);
            }
            this.nationsUpdateTimer = window.setTimeout(() => {
                this.putGameConfig();
                this.nationsUpdateTimer = null;
            }, 300);
        };
        this.id = "page-host-lobby";
    }
    getRandomString() {
        const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    }
    async buildLobbyUrl() {
        if (crazyGamesSDK.isOnCrazyGames()) {
            const link = crazyGamesSDK.createInviteLink(this.lobbyId);
            if (link !== null) {
                return link;
            }
        }
        const config = await getServerConfigFromClient();
        return `${window.location.origin}/${config.workerPath(this.lobbyId)}/game/${this.lobbyId}?lobby&s=${encodeURIComponent(this.lobbyUrlSuffix)}`;
    }
    async constructUrl() {
        this.lobbyUrlSuffix = this.getRandomString();
        return await this.buildLobbyUrl();
    }
    updateHistory(url) {
        if (!crazyGamesSDK.isOnCrazyGames()) {
            history.replaceState(null, "", url);
        }
    }
    startLobbyUpdates() {
        this.stopLobbyUpdates();
        if (!this.eventBus) {
            console.warn("HostLobbyModal: eventBus not set, cannot subscribe to lobby updates");
            return;
        }
        this.eventBus.on(LobbyInfoEvent, this.handleLobbyInfo);
    }
    stopLobbyUpdates() {
        this.eventBus?.off(LobbyInfoEvent, this.handleLobbyInfo);
    }
    render() {
        const inputCards = [
            html `<toggle-input-card
        .labelKey=${"host_modal.max_timer"}
        .checked=${this.maxTimer}
        .inputMin=${1}
        .inputMax=${120}
        .inputValue=${this.maxTimerValue}
        .inputAriaLabel=${translateText("host_modal.max_timer")}
        .inputPlaceholder=${translateText("host_modal.mins_placeholder")}
        .defaultInputValue=${30}
        .minValidOnEnable=${1}
        .onToggle=${this.handleMaxTimerToggle}
        .onInput=${this.handleMaxTimerValueChanges}
        .onKeyDown=${this.handleMaxTimerValueKeyDown}
      ></toggle-input-card>`,
            html `<toggle-input-card
        .labelKey=${"host_modal.player_immunity_duration"}
        .checked=${this.spawnImmunity}
        .inputMin=${0}
        .inputMax=${120}
        .inputStep=${1}
        .inputValue=${this.spawnImmunityDurationMinutes}
        .inputAriaLabel=${translateText("host_modal.player_immunity_duration")}
        .inputPlaceholder=${translateText("host_modal.mins_placeholder")}
        .defaultInputValue=${5}
        .minValidOnEnable=${0}
        .onToggle=${this.handleSpawnImmunityToggle}
        .onInput=${this.handleSpawnImmunityDurationInput}
        .onKeyDown=${this.handleSpawnImmunityDurationKeyDown}
      ></toggle-input-card>`,
            html `<toggle-input-card
        .labelKey=${"single_modal.gold_multiplier"}
        .checked=${this.goldMultiplier}
        .inputId=${"gold-multiplier-value"}
        .inputMin=${0.1}
        .inputMax=${1000}
        .inputStep=${"any"}
        .inputValue=${this.goldMultiplierValue}
        .inputAriaLabel=${translateText("single_modal.gold_multiplier")}
        .inputPlaceholder=${translateText("single_modal.gold_multiplier_placeholder")}
        .defaultInputValue=${2}
        .minValidOnEnable=${0.1}
        .onToggle=${this.handleGoldMultiplierToggle}
        .onChange=${this.handleGoldMultiplierValueChanges}
        .onKeyDown=${this.handleGoldMultiplierValueKeyDown}
      ></toggle-input-card>`,
            html `<toggle-input-card
        .labelKey=${"single_modal.starting_gold"}
        .checked=${this.startingGold}
        .inputId=${"starting-gold-value"}
        .inputMin=${0.1}
        .inputMax=${1000}
        .inputStep=${"any"}
        .inputValue=${this.startingGoldValue}
        .inputAriaLabel=${translateText("single_modal.starting_gold")}
        .inputPlaceholder=${translateText("single_modal.starting_gold_placeholder")}
        .defaultInputValue=${5}
        .minValidOnEnable=${0.1}
        .onToggle=${this.handleStartingGoldToggle}
        .onChange=${this.handleStartingGoldValueChanges}
        .onKeyDown=${this.handleStartingGoldValueKeyDown}
      ></toggle-input-card>`,
        ];
        const content = html `
      <div class="${this.modalContainerClass}">
        <!-- Header -->
        ${modalHeader({
            title: translateText("host_modal.title"),
            onBack: () => {
                this.leaveLobbyOnClose = true;
                this.close();
            },
            ariaLabel: translateText("common.back"),
            rightContent: html `
            <copy-button
              .lobbyId=${this.lobbyId}
              .lobbySuffix=${this.lobbyUrlSuffix}
              include-lobby-query
            ></copy-button>
          `,
        })}

        <div
          class="flex-1 overflow-y-auto custom-scrollbar p-6 mr-1 mx-auto w-full max-w-5xl"
        >
          <game-config-settings
            class="block"
            .sectionGapClass=${"space-y-10"}
            .settings=${{
            map: {
                selected: this.selectedMap,
                useRandom: this.useRandomMap,
                randomMapDivider: true,
            },
            difficulty: {
                selected: this.selectedDifficulty,
                disabled: this.nations === 0,
            },
            gameMode: {
                selected: this.gameMode,
            },
            teamCount: {
                selected: this.teamCount,
            },
            options: {
                titleKey: "host_modal.options_title",
                bots: {
                    value: this.bots,
                    labelKey: "host_modal.bots",
                    disabledKey: "host_modal.bots_disabled",
                },
                nations: {
                    value: this.nations,
                    defaultValue: this.defaultNationCount,
                    labelKey: "host_modal.nations",
                    disabledKey: "host_modal.nations_disabled",
                },
                toggles: [
                    {
                        labelKey: "host_modal.instant_build",
                        checked: this.instantBuild,
                    },
                    {
                        labelKey: "host_modal.random_spawn",
                        checked: this.randomSpawn,
                    },
                    {
                        labelKey: "host_modal.donate_gold",
                        checked: this.donateGold,
                    },
                    {
                        labelKey: "host_modal.donate_troops",
                        checked: this.donateTroops,
                    },
                    {
                        labelKey: "host_modal.infinite_gold",
                        checked: this.infiniteGold,
                    },
                    {
                        labelKey: "host_modal.infinite_troops",
                        checked: this.infiniteTroops,
                    },
                    {
                        labelKey: "host_modal.compact_map",
                        checked: this.compactMap,
                    },
                ],
                inputCards,
            },
            unitTypes: {
                titleKey: "host_modal.enables_title",
                disabledUnits: this.disabledUnits,
            },
        }}
            @map-selected=${this.handleConfigMapSelected}
            @random-map-selected=${this.handleConfigRandomMapSelected}
            @difficulty-selected=${this.handleConfigDifficultySelected}
            @game-mode-selected=${this.handleConfigGameModeSelected}
            @team-count-selected=${this.handleConfigTeamCountSelected}
            @bots-changed=${this.handleBotsChange}
            @nations-changed=${this.handleNationsChange}
            @option-toggle-changed=${this.handleConfigOptionToggleChanged}
            @unit-toggle-changed=${this.handleConfigUnitToggleChanged}
          ></game-config-settings>

          <lobby-player-view
            class="mt-10"
            .gameMode=${this.gameMode}
            .clients=${this.clients}
            .lobbyCreatorClientID=${this.lobbyCreatorClientID}
            .currentClientID=${this.lobbyCreatorClientID}
            .teamCount=${this.teamCount}
            .nationCount=${this.nations}
            .onKickPlayer=${(clientID) => this.kickPlayer(clientID)}
          ></lobby-player-view>
        </div>

        <!-- Player List / footer -->
        <div class="p-6 pt-4 border-t border-white/10 bg-black/20 shrink-0">
          <button
            class="w-full py-4 text-sm font-bold text-white uppercase tracking-widest bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none"
            @click=${this.startGame}
            ?disabled=${this.clients.length < 2}
          >
            ${this.clients.length === 1
            ? translateText("host_modal.waiting")
            : translateText("host_modal.start")}
          </button>
        </div>
      </div>
    `;
        if (this.inline) {
            return content;
        }
        return html `
      <o-modal
        title=""
        ?hideCloseButton=${true}
        ?inline=${this.inline}
        hideHeader
      >
        ${content}
      </o-modal>
    `;
    }
    onOpen() {
        this.startLobbyUpdates();
        this.lobbyId = generateID();
        // Note: clientID will be assigned by server when we join the lobby
        // lobbyCreatorClientID stays empty until then
        // Pass auth token for creator identification (server extracts persistentID from it)
        createLobby(this.lobbyId)
            .then(async (lobby) => {
            this.lobbyId = lobby.gameID;
            if (!isValidGameID(this.lobbyId)) {
                throw new Error(`Invalid lobby ID format: ${this.lobbyId}`);
            }
            crazyGamesSDK.showInviteButton(this.lobbyId);
            const url = await this.constructUrl();
            this.updateHistory(url);
        })
            .then(() => {
            this.dispatchEvent(new CustomEvent("join-lobby", {
                detail: {
                    gameID: this.lobbyId,
                    source: "host",
                },
                bubbles: true,
                composed: true,
            }));
        });
        if (this.modalEl) {
            this.modalEl.onClose = () => {
                this.close();
            };
        }
        this.loadNationCount();
    }
    leaveLobby() {
        if (!this.lobbyId) {
            return;
        }
        this.dispatchEvent(new CustomEvent("leave-lobby", {
            detail: { lobby: this.lobbyId },
            bubbles: true,
            composed: true,
        }));
    }
    confirmBeforeClose() {
        return confirm(translateText("host_modal.leave_confirmation"));
    }
    onClose() {
        console.log("Closing host lobby modal");
        this.stopLobbyUpdates();
        if (this.leaveLobbyOnClose) {
            this.leaveLobby();
            this.updateHistory("/"); // Reset URL to base
        }
        crazyGamesSDK.hideInviteButton();
        // Clean up timers and resources
        if (this.botsUpdateTimer !== null) {
            clearTimeout(this.botsUpdateTimer);
            this.botsUpdateTimer = null;
        }
        if (this.nationsUpdateTimer !== null) {
            clearTimeout(this.nationsUpdateTimer);
            this.nationsUpdateTimer = null;
        }
        // Reset all transient form state to ensure clean slate
        this.selectedMap = GameMapType.World;
        this.selectedDifficulty = Difficulty.Easy;
        this.nations = 0;
        this.defaultNationCount = 0;
        this.gameMode = GameMode.FFA;
        this.teamCount = 2;
        this.bots = 400;
        this.spawnImmunity = false;
        this.spawnImmunityDurationMinutes = undefined;
        this.infiniteGold = false;
        this.donateGold = false;
        this.infiniteTroops = false;
        this.donateTroops = false;
        this.maxTimer = false;
        this.maxTimerValue = undefined;
        this.instantBuild = false;
        this.randomSpawn = false;
        this.compactMap = false;
        this.useRandomMap = false;
        this.disabledUnits = [];
        this.lobbyId = "";
        this.clients = [];
        this.lobbyCreatorClientID = "";
        this.goldMultiplier = false;
        this.goldMultiplierValue = undefined;
        this.startingGold = false;
        this.startingGoldValue = undefined;
        this.leaveLobbyOnClose = true;
    }
    async handleSelectRandomMap() {
        this.useRandomMap = true;
        this.selectedMap = getRandomMapType();
        await this.loadNationCount();
        this.putGameConfig();
    }
    async handleMapSelection(value) {
        this.selectedMap = value;
        this.useRandomMap = false;
        await this.loadNationCount();
        this.putGameConfig();
    }
    async handleDifficultySelection(value) {
        this.selectedDifficulty = value;
        this.putGameConfig();
    }
    async handleGameModeSelection(value) {
        this.gameMode = value;
        if (this.gameMode === GameMode.Team) {
            this.donateGold = true;
            this.donateTroops = true;
        }
        else {
            this.donateGold = false;
            this.donateTroops = false;
        }
        this.putGameConfig();
    }
    async handleTeamCountSelection(value) {
        this.teamCount = value;
        this.putGameConfig();
    }
    async putGameConfig() {
        const spawnImmunityTicks = this.spawnImmunityDurationMinutes
            ? this.spawnImmunityDurationMinutes * 60 * 10
            : 0;
        const url = await this.constructUrl();
        this.updateHistory(url);
        this.dispatchEvent(new CustomEvent("update-game-config", {
            detail: {
                config: {
                    gameMap: this.selectedMap,
                    gameMapSize: this.compactMap
                        ? GameMapSize.Compact
                        : GameMapSize.Normal,
                    difficulty: this.selectedDifficulty,
                    bots: this.bots,
                    infiniteGold: this.infiniteGold,
                    donateGold: this.donateGold,
                    infiniteTroops: this.infiniteTroops,
                    donateTroops: this.donateTroops,
                    instantBuild: this.instantBuild,
                    randomSpawn: this.randomSpawn,
                    gameMode: this.gameMode,
                    disabledUnits: this.disabledUnits,
                    spawnImmunityDuration: this.spawnImmunity
                        ? spawnImmunityTicks
                        : undefined,
                    playerTeams: this.teamCount,
                    nations: sliderToNationsConfig(this.nations, this.defaultNationCount),
                    maxTimerValue: this.maxTimer === true ? this.maxTimerValue : undefined,
                    goldMultiplier: this.goldMultiplier === true
                        ? this.goldMultiplierValue
                        : undefined,
                    startingGold: this.startingGold === true && this.startingGoldValue !== undefined
                        ? Math.round(this.startingGoldValue * 1000000)
                        : undefined,
                },
            },
            bubbles: true,
            composed: true,
        }));
    }
    async startGame() {
        await this.putGameConfig();
        console.log(`Starting private game with map: ${GameMapType[this.selectedMap]} ${this.useRandomMap ? " (Randomly selected)" : ""}`);
        // If the modal closes as part of starting the game, do not leave the lobby
        this.leaveLobbyOnClose = false;
        const config = await getServerConfigFromClient();
        const response = await fetch(`${window.location.origin}/${config.workerPath(this.lobbyId)}/api/start_game/${this.lobbyId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });
        if (!response.ok) {
            this.leaveLobbyOnClose = true;
        }
        return response;
    }
    kickPlayer(clientID) {
        // Dispatch event to be handled by WebSocket instead of HTTP
        this.dispatchEvent(new CustomEvent("kick-player", {
            detail: { target: clientID },
            bubbles: true,
            composed: true,
        }));
    }
    async loadNationCount() {
        const currentMap = this.selectedMap;
        try {
            const mapData = this.mapLoader.getMapData(currentMap);
            const manifest = await mapData.manifest();
            // Only update if the map hasn't changed
            if (this.selectedMap === currentMap) {
                this.defaultNationCount = manifest.nations.length;
                this.nations = this.compactMap
                    ? Math.max(0, Math.floor(manifest.nations.length * 0.25))
                    : manifest.nations.length;
            }
        }
        catch (error) {
            console.warn("Failed to load nation count", error);
            // Leave existing values unchanged so the UI stays consistent
        }
    }
};
__decorate([
    state()
], HostLobbyModal.prototype, "selectedMap", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "selectedDifficulty", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "nations", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "defaultNationCount", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "gameMode", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "teamCount", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "bots", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "spawnImmunity", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "spawnImmunityDurationMinutes", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "infiniteGold", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "donateGold", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "infiniteTroops", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "donateTroops", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "maxTimer", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "maxTimerValue", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "instantBuild", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "randomSpawn", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "compactMap", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "goldMultiplier", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "goldMultiplierValue", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "startingGold", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "startingGoldValue", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "lobbyId", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "lobbyUrlSuffix", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "clients", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "useRandomMap", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "disabledUnits", void 0);
__decorate([
    state()
], HostLobbyModal.prototype, "lobbyCreatorClientID", void 0);
__decorate([
    property({ attribute: false })
], HostLobbyModal.prototype, "eventBus", void 0);
HostLobbyModal = __decorate([
    customElement("host-lobby-modal")
], HostLobbyModal);
export { HostLobbyModal };
async function createLobby(gameID) {
    const config = await getServerConfigFromClient();
    // Send JWT token for creator identification - server extracts persistentID from it
    // persistentID should never be exposed to other clients
    const token = await getPlayToken();
    try {
        const response = await fetch(`/${config.workerPath(gameID)}/api/create_game/${gameID}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Server error response:", errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Success:", data);
        return data;
    }
    catch (error) {
        console.error("Error creating lobby:", error);
        throw error;
    }
}
//# sourceMappingURL=HostLobbyModal.js.map