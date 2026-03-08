var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { translateText } from "../client/Utils";
import { Difficulty, GameMapSize, GameMapType, GameMode, GameType, UnitType, } from "../core/game/Game";
import { generateID } from "../core/Util";
import { hasLinkedAccount } from "./Api";
import "./components/baseComponents/Button";
import "./components/baseComponents/Modal";
import { BaseModal } from "./components/BaseModal";
import "./components/GameConfigSettings";
import "./components/ToggleInputCard";
import { modalHeader } from "./components/ui/ModalHeader";
import { getPlayerCosmetics } from "./Cosmetics";
import { crazyGamesSDK } from "./CrazyGamesSDK";
import { getBotsForCompactMap, getNationsForCompactMap, getRandomMapType, getUpdatedDisabledUnits, parseBoundedFloatFromInput, parseBoundedIntegerFromInput, preventDisallowedKeys, sliderToNationsConfig, toOptionalNumber, } from "./utilities/GameConfigHelpers";
import { terrainMapFileLoader } from "./TerrainMapFileLoader";
const DEFAULT_OPTIONS = {
    selectedMap: GameMapType.World,
    selectedDifficulty: Difficulty.Easy,
    bots: 400,
    infiniteGold: false,
    infiniteTroops: false,
    compactMap: false,
    maxTimer: false,
    maxTimerValue: undefined,
    instantBuild: false,
    randomSpawn: false,
    useRandomMap: false,
    gameMode: GameMode.FFA,
    teamCount: 2,
    goldMultiplier: false,
    goldMultiplierValue: undefined,
    startingGold: false,
    startingGoldValue: undefined,
    disabledUnits: [],
};
let SinglePlayerModal = class SinglePlayerModal extends BaseModal {
    constructor() {
        super(...arguments);
        this.selectedMap = DEFAULT_OPTIONS.selectedMap;
        this.selectedDifficulty = DEFAULT_OPTIONS.selectedDifficulty;
        this.nations = 0;
        this.defaultNationCount = 0;
        this.bots = DEFAULT_OPTIONS.bots;
        this.infiniteGold = DEFAULT_OPTIONS.infiniteGold;
        this.infiniteTroops = DEFAULT_OPTIONS.infiniteTroops;
        this.compactMap = DEFAULT_OPTIONS.compactMap;
        this.maxTimer = DEFAULT_OPTIONS.maxTimer;
        this.maxTimerValue = DEFAULT_OPTIONS.maxTimerValue;
        this.instantBuild = DEFAULT_OPTIONS.instantBuild;
        this.randomSpawn = DEFAULT_OPTIONS.randomSpawn;
        this.useRandomMap = DEFAULT_OPTIONS.useRandomMap;
        this.gameMode = DEFAULT_OPTIONS.gameMode;
        this.teamCount = DEFAULT_OPTIONS.teamCount;
        this.showAchievements = false;
        this.mapWins = new Map();
        this.userMeResponse = false;
        this.goldMultiplier = DEFAULT_OPTIONS.goldMultiplier;
        this.goldMultiplierValue = DEFAULT_OPTIONS.goldMultiplierValue;
        this.startingGold = DEFAULT_OPTIONS.startingGold;
        this.startingGoldValue = DEFAULT_OPTIONS.startingGoldValue;
        this.disabledUnits = [
            ...DEFAULT_OPTIONS.disabledUnits,
        ];
        this.mapLoader = terrainMapFileLoader;
        this.toggleAchievements = () => {
            this.showAchievements = !this.showAchievements;
        };
        this.handleUserMeResponse = (event) => {
            this.userMeResponse = event.detail;
            this.applyAchievements(event.detail);
        };
        this.handleConfigRandomMapSelected = () => {
            this.handleSelectRandomMap();
        };
        this.handleConfigMapSelected = (e) => {
            const customEvent = e;
            this.handleMapSelection(customEvent.detail.map);
        };
        this.handleConfigDifficultySelected = (e) => {
            const customEvent = e;
            this.handleDifficultySelection(customEvent.detail.difficulty);
        };
        this.handleConfigGameModeSelected = (e) => {
            const customEvent = e;
            this.handleGameModeSelection(customEvent.detail.mode);
        };
        this.handleConfigTeamCountSelected = (e) => {
            const customEvent = e;
            this.handleTeamCountSelection(customEvent.detail.count);
        };
        this.handleConfigOptionToggleChanged = (e) => {
            const customEvent = e;
            const { labelKey, checked } = customEvent.detail;
            switch (labelKey) {
                case "single_modal.instant_build":
                    this.instantBuild = checked;
                    break;
                case "single_modal.random_spawn":
                    this.randomSpawn = checked;
                    break;
                case "single_modal.infinite_gold":
                    this.infiniteGold = checked;
                    break;
                case "single_modal.infinite_troops":
                    this.infiniteTroops = checked;
                    break;
                case "single_modal.compact_map":
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
        };
        this.handleBotsChange = (e) => {
            const customEvent = e;
            const value = customEvent.detail.value;
            if (isNaN(value) || value < 0 || value > 400) {
                return;
            }
            this.bots = value;
        };
        this.handleNationsChange = (e) => {
            const customEvent = e;
            const value = customEvent.detail.value;
            if (isNaN(value) || value < 0 || value > 400) {
                return;
            }
            this.nations = value;
        };
        this.handleMaxTimerToggle = (checked, value) => {
            this.maxTimer = checked;
            this.maxTimerValue = toOptionalNumber(value);
        };
        this.handleGoldMultiplierToggle = (checked, value) => {
            this.goldMultiplier = checked;
            this.goldMultiplierValue = toOptionalNumber(value);
        };
        this.handleStartingGoldToggle = (checked, value) => {
            this.startingGold = checked;
            this.startingGoldValue = toOptionalNumber(value);
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
            this.maxTimerValue = value;
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
        };
    }
    connectedCallback() {
        super.connectedCallback();
        document.addEventListener("userMeResponse", this.handleUserMeResponse);
        void this.loadNationCount();
    }
    disconnectedCallback() {
        document.removeEventListener("userMeResponse", this.handleUserMeResponse);
        super.disconnectedCallback();
    }
    renderNotLoggedInBanner() {
        if (crazyGamesSDK.isOnCrazyGames()) {
            return html ``;
        }
        return html `<button
      class="px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors duration-200 rounded-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 whitespace-nowrap shrink-0 cursor-pointer hover:bg-yellow-500/30"
      @click=${() => {
            this.close();
            window.showPage?.("page-account");
        }}
    >
      ${translateText("single_modal.sign_in_for_achievements")}
    </button>`;
    }
    applyAchievements(userMe) {
        if (!userMe) {
            this.mapWins = new Map();
            return;
        }
        const achievements = Array.isArray(userMe.player.achievements)
            ? userMe.player.achievements
            : [];
        const completions = achievements.find((achievement) => achievement?.type === "singleplayer-map")?.data ?? [];
        const winsMap = new Map();
        for (const entry of completions) {
            const { mapName, difficulty } = entry ?? {};
            const isValidMap = typeof mapName === "string" &&
                Object.values(GameMapType).includes(mapName);
            const isValidDifficulty = typeof difficulty === "string" &&
                Object.values(Difficulty).includes(difficulty);
            if (!isValidMap || !isValidDifficulty)
                continue;
            const map = mapName;
            const set = winsMap.get(map) ?? new Set();
            set.add(difficulty);
            winsMap.set(map, set);
        }
        this.mapWins = winsMap;
    }
    render() {
        const inputCards = [
            html `<toggle-input-card
        .labelKey=${"single_modal.max_timer"}
        .checked=${this.maxTimer}
        .inputId=${"end-timer-value"}
        .inputMin=${1}
        .inputMax=${120}
        .inputValue=${this.maxTimerValue}
        .inputAriaLabel=${translateText("single_modal.max_timer")}
        .inputPlaceholder=${translateText("single_modal.max_timer_placeholder")}
        .defaultInputValue=${30}
        .minValidOnEnable=${1}
        .onToggle=${this.handleMaxTimerToggle}
        .onInput=${this.handleMaxTimerValueChanges}
        .onKeyDown=${this.handleMaxTimerValueKeyDown}
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
            title: translateText("main.solo") || "Solo",
            onBack: () => this.close(),
            ariaLabel: translateText("common.back"),
            rightContent: hasLinkedAccount(this.userMeResponse)
                ? html `<button
                @click=${this.toggleAchievements}
                class="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all shrink-0 ${this
                    .showAchievements
                    ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                    : "text-white/60"}"
              >
                <img
                  src="/images/MedalIconWhite.svg"
                  class="w-4 h-4 opacity-80 shrink-0"
                  style="${this.showAchievements
                    ? ""
                    : "filter: grayscale(1);"}"
                />
                <span
                  class="text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                  >${translateText("single_modal.toggle_achievements")}</span
                >
              </button>`
                : this.renderNotLoggedInBanner(),
        })}

        <div
          class="flex-1 overflow-y-auto custom-scrollbar px-6 pt-4 pb-6 mr-1 mx-auto w-full max-w-5xl"
        >
          <game-config-settings
            class="block"
            .sectionGapClass=${"space-y-6"}
            .settings=${{
            map: {
                selected: this.selectedMap,
                useRandom: this.useRandomMap,
                showMedals: this.showAchievements,
                mapWins: this.mapWins,
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
                titleKey: "single_modal.options_title",
                bots: {
                    value: this.bots,
                    labelKey: "single_modal.bots",
                    disabledKey: "single_modal.bots_disabled",
                },
                nations: {
                    value: this.nations,
                    defaultValue: this.defaultNationCount,
                    labelKey: "single_modal.nations",
                    disabledKey: "single_modal.nations_disabled",
                },
                toggles: [
                    {
                        labelKey: "single_modal.instant_build",
                        checked: this.instantBuild,
                    },
                    {
                        labelKey: "single_modal.random_spawn",
                        checked: this.randomSpawn,
                    },
                    {
                        labelKey: "single_modal.infinite_gold",
                        checked: this.infiniteGold,
                    },
                    {
                        labelKey: "single_modal.infinite_troops",
                        checked: this.infiniteTroops,
                    },
                    {
                        labelKey: "single_modal.compact_map",
                        checked: this.compactMap,
                    },
                ],
                inputCards,
            },
            unitTypes: {
                titleKey: "single_modal.enables_title",
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
        </div>

        <!-- Footer Action -->
        <div class="p-6 border-t border-white/10 bg-black/20">
          ${hasLinkedAccount(this.userMeResponse) && this.hasOptionsChanged()
            ? html `<div
                class="mb-4 px-4 py-3 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-bold uppercase tracking-wider text-center"
              >
                ${translateText("single_modal.options_changed_no_achievements")}
              </div>`
            : null}
          <button
            @click=${this.startGame}
            class="w-full py-4 text-sm font-bold text-white uppercase tracking-widest bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 hover:-translate-y-0.5 active:translate-y-0"
          >
            ${translateText("single_modal.start")}
          </button>
        </div>
      </div>
    `;
        if (this.inline) {
            return content;
        }
        return html `
      <o-modal
        id="singlePlayerModal"
        title="${translateText("main.solo") || "Solo"}"
        ?inline=${this.inline}
        hideHeader
        hideCloseButton
      >
        ${content}
      </o-modal>
    `;
    }
    // Check if any options other than map and difficulty have been changed from defaults
    hasOptionsChanged() {
        return (this.nations !== this.defaultNationCount ||
            this.bots !== DEFAULT_OPTIONS.bots ||
            this.infiniteGold !== DEFAULT_OPTIONS.infiniteGold ||
            this.infiniteTroops !== DEFAULT_OPTIONS.infiniteTroops ||
            this.compactMap !== DEFAULT_OPTIONS.compactMap ||
            this.maxTimer !== DEFAULT_OPTIONS.maxTimer ||
            this.instantBuild !== DEFAULT_OPTIONS.instantBuild ||
            this.randomSpawn !== DEFAULT_OPTIONS.randomSpawn ||
            this.gameMode !== DEFAULT_OPTIONS.gameMode ||
            this.goldMultiplier !== DEFAULT_OPTIONS.goldMultiplier ||
            this.startingGold !== DEFAULT_OPTIONS.startingGold ||
            this.disabledUnits.length > 0);
    }
    onClose() {
        // Reset all transient form state to ensure clean slate
        this.selectedMap = DEFAULT_OPTIONS.selectedMap;
        this.selectedDifficulty = DEFAULT_OPTIONS.selectedDifficulty;
        this.gameMode = DEFAULT_OPTIONS.gameMode;
        this.useRandomMap = DEFAULT_OPTIONS.useRandomMap;
        this.bots = DEFAULT_OPTIONS.bots;
        this.nations = 0;
        this.defaultNationCount = 0;
        this.infiniteGold = DEFAULT_OPTIONS.infiniteGold;
        this.infiniteTroops = DEFAULT_OPTIONS.infiniteTroops;
        this.compactMap = DEFAULT_OPTIONS.compactMap;
        this.maxTimer = DEFAULT_OPTIONS.maxTimer;
        this.maxTimerValue = DEFAULT_OPTIONS.maxTimerValue;
        this.instantBuild = DEFAULT_OPTIONS.instantBuild;
        this.randomSpawn = DEFAULT_OPTIONS.randomSpawn;
        this.teamCount = DEFAULT_OPTIONS.teamCount;
        this.disabledUnits = [...DEFAULT_OPTIONS.disabledUnits];
        this.goldMultiplier = DEFAULT_OPTIONS.goldMultiplier;
        this.goldMultiplierValue = DEFAULT_OPTIONS.goldMultiplierValue;
        this.startingGold = DEFAULT_OPTIONS.startingGold;
        this.startingGoldValue = DEFAULT_OPTIONS.startingGoldValue;
    }
    onOpen() {
        void this.loadNationCount();
    }
    handleSelectRandomMap() {
        this.useRandomMap = true;
        this.selectedMap = getRandomMapType();
        void this.loadNationCount();
    }
    handleMapSelection(value) {
        this.selectedMap = value;
        this.useRandomMap = false;
        void this.loadNationCount();
    }
    handleDifficultySelection(value) {
        this.selectedDifficulty = value;
    }
    handleCompactMapChange(val) {
        this.compactMap = val;
        this.bots = getBotsForCompactMap(this.bots, val);
        this.nations = getNationsForCompactMap(this.nations, this.defaultNationCount, val);
    }
    getEndTimerInput() {
        return (this.renderRoot.querySelector("#end-timer-value") ??
            this.querySelector("#end-timer-value"));
    }
    handleGameModeSelection(value) {
        this.gameMode = value;
    }
    handleTeamCountSelection(value) {
        this.teamCount = value;
    }
    async startGame() {
        // Validate and clamp maxTimer setting before starting
        let finalMaxTimerValue = undefined;
        if (this.maxTimer) {
            if (!this.maxTimerValue || this.maxTimerValue <= 0) {
                console.error("Max timer is enabled but no valid value is set");
                alert(translateText("single_modal.max_timer_invalid") ||
                    "Please enter a valid max timer value (1-120 minutes)");
                // Focus the input
                const input = this.getEndTimerInput();
                if (input) {
                    input.focus();
                    input.select();
                }
                return;
            }
            // Clamp value to valid range
            finalMaxTimerValue = Math.max(1, Math.min(120, this.maxTimerValue));
        }
        console.log(`Starting single player game with map: ${GameMapType[this.selectedMap]}${this.useRandomMap ? " (Randomly selected)" : ""}`);
        const clientID = generateID();
        const gameID = generateID();
        const usernameInput = document.querySelector("username-input");
        if (!usernameInput) {
            console.warn("Username input element not found");
        }
        await crazyGamesSDK.requestMidgameAd();
        this.dispatchEvent(new CustomEvent("join-lobby", {
            detail: {
                gameID: gameID,
                gameStartInfo: {
                    gameID: gameID,
                    players: [
                        {
                            clientID,
                            username: usernameInput.getCurrentUsername(),
                            cosmetics: await getPlayerCosmetics(),
                        },
                    ],
                    config: {
                        gameMap: this.selectedMap,
                        gameMapSize: this.compactMap
                            ? GameMapSize.Compact
                            : GameMapSize.Normal,
                        gameType: GameType.Singleplayer,
                        gameMode: this.gameMode,
                        playerTeams: this.teamCount,
                        difficulty: this.selectedDifficulty,
                        maxTimerValue: finalMaxTimerValue,
                        bots: this.bots,
                        infiniteGold: this.infiniteGold,
                        donateGold: this.gameMode === GameMode.Team,
                        donateTroops: this.gameMode === GameMode.Team,
                        infiniteTroops: this.infiniteTroops,
                        instantBuild: this.instantBuild,
                        randomSpawn: this.randomSpawn,
                        disabledUnits: this.disabledUnits
                            .map((u) => Object.values(UnitType).find((ut) => ut === u))
                            .filter((ut) => ut !== undefined),
                        nations: sliderToNationsConfig(this.nations, this.defaultNationCount),
                        ...(this.goldMultiplier && this.goldMultiplierValue
                            ? { goldMultiplier: this.goldMultiplierValue }
                            : {}),
                        ...(this.startingGold && this.startingGoldValue !== undefined
                            ? {
                                startingGold: Math.round(this.startingGoldValue * 1000000),
                            }
                            : {}),
                    },
                    lobbyCreatedAt: Date.now(), // ms; server should be authoritative in MP
                },
                source: "singleplayer",
            },
            bubbles: true,
            composed: true,
        }));
        this.close();
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
], SinglePlayerModal.prototype, "selectedMap", void 0);
__decorate([
    state()
], SinglePlayerModal.prototype, "selectedDifficulty", void 0);
__decorate([
    state()
], SinglePlayerModal.prototype, "nations", void 0);
__decorate([
    state()
], SinglePlayerModal.prototype, "defaultNationCount", void 0);
__decorate([
    state()
], SinglePlayerModal.prototype, "bots", void 0);
__decorate([
    state()
], SinglePlayerModal.prototype, "infiniteGold", void 0);
__decorate([
    state()
], SinglePlayerModal.prototype, "infiniteTroops", void 0);
__decorate([
    state()
], SinglePlayerModal.prototype, "compactMap", void 0);
__decorate([
    state()
], SinglePlayerModal.prototype, "maxTimer", void 0);
__decorate([
    state()
], SinglePlayerModal.prototype, "maxTimerValue", void 0);
__decorate([
    state()
], SinglePlayerModal.prototype, "instantBuild", void 0);
__decorate([
    state()
], SinglePlayerModal.prototype, "randomSpawn", void 0);
__decorate([
    state()
], SinglePlayerModal.prototype, "useRandomMap", void 0);
__decorate([
    state()
], SinglePlayerModal.prototype, "gameMode", void 0);
__decorate([
    state()
], SinglePlayerModal.prototype, "teamCount", void 0);
__decorate([
    state()
], SinglePlayerModal.prototype, "showAchievements", void 0);
__decorate([
    state()
], SinglePlayerModal.prototype, "mapWins", void 0);
__decorate([
    state()
], SinglePlayerModal.prototype, "userMeResponse", void 0);
__decorate([
    state()
], SinglePlayerModal.prototype, "goldMultiplier", void 0);
__decorate([
    state()
], SinglePlayerModal.prototype, "goldMultiplierValue", void 0);
__decorate([
    state()
], SinglePlayerModal.prototype, "startingGold", void 0);
__decorate([
    state()
], SinglePlayerModal.prototype, "startingGoldValue", void 0);
__decorate([
    state()
], SinglePlayerModal.prototype, "disabledUnits", void 0);
SinglePlayerModal = __decorate([
    customElement("single-player-modal")
], SinglePlayerModal);
export { SinglePlayerModal };
//# sourceMappingURL=SinglePlayerModal.js.map