var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { GameType } from "../../../core/game/Game";
import { crazyGamesSDK } from "../../CrazyGamesSDK";
import { PauseGameIntentEvent, SendWinnerEvent } from "../../Transport";
import { translateText } from "../../Utils";
import { ImmunityBarVisibleEvent } from "./ImmunityTimer";
import { ShowReplayPanelEvent } from "./ReplayPanel";
import { ShowSettingsModalEvent } from "./SettingsModal";
import { SpawnBarVisibleEvent } from "./SpawnTimer";
import exitIcon from "/images/ExitIconWhite.svg?url";
import FastForwardIconSolid from "/images/FastForwardIconSolidWhite.svg?url";
import pauseIcon from "/images/PauseIconWhite.svg?url";
import playIcon from "/images/PlayIconWhite.svg?url";
import settingsIcon from "/images/SettingIconWhite.svg?url";
let GameRightSidebar = class GameRightSidebar extends LitElement {
    constructor() {
        super(...arguments);
        this._isSinglePlayer = false;
        this._isReplayVisible = false;
        this._isVisible = true;
        this.isPaused = false;
        this.timer = 0;
        this.hasWinner = false;
        this.isLobbyCreator = false;
        this.spawnBarVisible = false;
        this.immunityBarVisible = false;
        this.secondsToHms = (d) => {
            const pad = (n) => (n < 10 ? `0${n}` : n);
            const h = Math.floor(d / 3600);
            const m = Math.floor((d % 3600) / 60);
            const s = Math.floor((d % 3600) % 60);
            if (h !== 0) {
                return `${pad(h)}:${pad(m)}:${pad(s)}`;
            }
            else {
                return `${pad(m)}:${pad(s)}`;
            }
        };
    }
    createRenderRoot() {
        return this;
    }
    init() {
        this._isSinglePlayer =
            this.game?.config()?.gameConfig()?.gameType === GameType.Singleplayer ||
                this.game.config().isReplay();
        this._isVisible = true;
        this.game.inSpawnPhase();
        this.eventBus.on(SpawnBarVisibleEvent, (e) => {
            this.spawnBarVisible = e.visible;
            this.updateParentOffset();
        });
        this.eventBus.on(ImmunityBarVisibleEvent, (e) => {
            this.immunityBarVisible = e.visible;
            this.updateParentOffset();
        });
        this.eventBus.on(SendWinnerEvent, () => {
            this.hasWinner = true;
            this.requestUpdate();
        });
        this.requestUpdate();
    }
    getTickIntervalMs() {
        return 250;
    }
    tick() {
        // Timer logic
        // Check if the player is the lobby creator
        if (!this.isLobbyCreator && this.game.myPlayer()?.isLobbyCreator()) {
            this.isLobbyCreator = true;
            this.requestUpdate();
        }
        const maxTimerValue = this.game.config().gameConfig().maxTimerValue;
        const spawnPhaseTurns = this.game.config().numSpawnPhaseTurns();
        const ticks = this.game.ticks();
        const gameTicks = Math.max(0, ticks - spawnPhaseTurns);
        const elapsedSeconds = Math.floor(gameTicks / 10); // 10 ticks per second
        if (this.game.inSpawnPhase()) {
            this.timer = maxTimerValue !== undefined ? maxTimerValue * 60 : 0;
            return;
        }
        if (this.hasWinner) {
            return;
        }
        if (maxTimerValue !== undefined) {
            this.timer = Math.max(0, maxTimerValue * 60 - elapsedSeconds);
        }
        else {
            this.timer = elapsedSeconds;
        }
    }
    updateParentOffset() {
        const offset = (this.spawnBarVisible ? 7 : 0) + (this.immunityBarVisible ? 7 : 0);
        const parent = this.parentElement;
        if (parent) {
            parent.style.marginTop = `${offset}px`;
        }
    }
    toggleReplayPanel() {
        this._isReplayVisible = !this._isReplayVisible;
        this.eventBus.emit(new ShowReplayPanelEvent(this._isReplayVisible, this._isSinglePlayer));
    }
    onPauseButtonClick() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            crazyGamesSDK.gameplayStop();
        }
        else {
            crazyGamesSDK.gameplayStart();
        }
        this.eventBus.emit(new PauseGameIntentEvent(this.isPaused));
    }
    async onExitButtonClick() {
        const isAlive = this.game.myPlayer()?.isAlive();
        if (isAlive) {
            const isConfirmed = confirm(translateText("help_modal.exit_confirmation"));
            if (!isConfirmed)
                return;
        }
        await crazyGamesSDK.requestMidgameAd();
        await crazyGamesSDK.gameplayStop();
        // redirect to the home page
        window.location.href = "/";
    }
    onSettingsButtonClick() {
        this.eventBus.emit(new ShowSettingsModalEvent(true, this._isSinglePlayer, this.isPaused));
    }
    render() {
        if (this.game === undefined)
            return html ``;
        const timerColor = this.game.config().gameConfig().maxTimerValue !== undefined &&
            this.timer < 60
            ? "text-red-400"
            : "";
        return html `
      <aside
        class=${`w-fit flex flex-row items-center gap-3 py-2 px-3 bg-gray-800/70 backdrop-blur-xs shadow-xs min-[1200px]:rounded-lg rounded-bl-lg transition-transform duration-300 ease-out transform text-white ${this._isVisible ? "translate-x-0" : "translate-x-full"}`}
        @contextmenu=${(e) => e.preventDefault()}
      >
        <!-- In-game time -->
        <div class=${timerColor}>${this.secondsToHms(this.timer)}</div>

        <!-- Buttons -->
        ${this.maybeRenderReplayButtons()}

        <div class="cursor-pointer" @click=${this.onSettingsButtonClick}>
          <img src=${settingsIcon} alt="settings" width="20" height="20" />
        </div>

        <div class="cursor-pointer" @click=${this.onExitButtonClick}>
          <img src=${exitIcon} alt="exit" width="20" height="20" />
        </div>
      </aside>
    `;
    }
    maybeRenderReplayButtons() {
        const isReplayOrSingleplayer = this._isSinglePlayer || this.game?.config()?.isReplay();
        const showPauseButton = isReplayOrSingleplayer || this.isLobbyCreator;
        return html `
      ${isReplayOrSingleplayer
            ? html `
            <div class="cursor-pointer" @click=${this.toggleReplayPanel}>
              <img
                src=${FastForwardIconSolid}
                alt="replay"
                width="20"
                height="20"
              />
            </div>
          `
            : ""}
      ${showPauseButton
            ? html `
            <div class="cursor-pointer" @click=${this.onPauseButtonClick}>
              <img
                src=${this.isPaused ? playIcon : pauseIcon}
                alt="play/pause"
                width="20"
                height="20"
              />
            </div>
          `
            : ""}
    `;
    }
};
__decorate([
    state()
], GameRightSidebar.prototype, "_isSinglePlayer", void 0);
__decorate([
    state()
], GameRightSidebar.prototype, "_isReplayVisible", void 0);
__decorate([
    state()
], GameRightSidebar.prototype, "_isVisible", void 0);
__decorate([
    state()
], GameRightSidebar.prototype, "isPaused", void 0);
__decorate([
    state()
], GameRightSidebar.prototype, "timer", void 0);
GameRightSidebar = __decorate([
    customElement("game-right-sidebar")
], GameRightSidebar);
export { GameRightSidebar };
//# sourceMappingURL=GameRightSidebar.js.map