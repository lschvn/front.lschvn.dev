var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { crazyGamesSDK } from "src/client/CrazyGamesSDK";
import { PauseGameIntentEvent } from "src/client/Transport";
import { AlternateViewEvent, RefreshGraphicsEvent } from "../../InputHandler";
import { translateText } from "../../Utils";
import SoundManager from "../../sound/SoundManager";
import structureIcon from "/images/CityIconWhite.svg?url";
import cursorPriceIcon from "/images/CursorPriceIconWhite.svg?url";
import darkModeIcon from "/images/DarkModeIconWhite.svg?url";
import emojiIcon from "/images/EmojiIconWhite.svg?url";
import exitIcon from "/images/ExitIconWhite.svg?url";
import explosionIcon from "/images/ExplosionIconWhite.svg?url";
import mouseIcon from "/images/MouseIconWhite.svg?url";
import ninjaIcon from "/images/NinjaIconWhite.svg?url";
import settingsIcon from "/images/SettingIconWhite.svg?url";
import shieldIcon from "/images/ShieldIconWhite.svg?url";
import sirenIcon from "/images/SirenIconWhite.svg?url";
import treeIcon from "/images/TreeIconWhite.svg?url";
import musicIcon from "/images/music.svg?url";
export class ShowSettingsModalEvent {
    constructor(isVisible = true, shouldPause = false, isPaused = false) {
        this.isVisible = isVisible;
        this.shouldPause = shouldPause;
        this.isPaused = isPaused;
    }
}
let SettingsModal = class SettingsModal extends LitElement {
    constructor() {
        super(...arguments);
        this.isVisible = false;
        this.alternateView = false;
        this.shouldPause = false;
        this.wasPausedWhenOpened = false;
        this.handleOutsideClick = (event) => {
            if (this.isVisible &&
                this.modalOverlay &&
                event.target === this.modalOverlay) {
                this.closeModal();
            }
        };
        this.handleKeyDown = (event) => {
            if (this.isVisible && event.key === "Escape") {
                this.closeModal();
            }
        };
    }
    init() {
        SoundManager.setBackgroundMusicVolume(this.userSettings.backgroundMusicVolume());
        SoundManager.setSoundEffectsVolume(this.userSettings.soundEffectsVolume());
        this.eventBus.on(ShowSettingsModalEvent, (event) => {
            this.isVisible = event.isVisible;
            this.shouldPause = event.shouldPause;
            this.wasPausedWhenOpened = event.isPaused;
            this.pauseGame(true);
        });
    }
    createRenderRoot() {
        return this;
    }
    connectedCallback() {
        super.connectedCallback();
        window.addEventListener("click", this.handleOutsideClick, true);
        window.addEventListener("keydown", this.handleKeyDown);
    }
    disconnectedCallback() {
        window.removeEventListener("click", this.handleOutsideClick, true);
        window.removeEventListener("keydown", this.handleKeyDown);
        super.disconnectedCallback();
    }
    openModal() {
        this.isVisible = true;
        this.requestUpdate();
    }
    closeModal() {
        this.isVisible = false;
        this.requestUpdate();
        this.pauseGame(false);
    }
    pauseGame(pause) {
        if (this.shouldPause && !this.wasPausedWhenOpened) {
            if (pause) {
                crazyGamesSDK.gameplayStop();
            }
            else {
                crazyGamesSDK.gameplayStart();
            }
            this.eventBus.emit(new PauseGameIntentEvent(pause));
        }
    }
    onTerrainButtonClick() {
        this.alternateView = !this.alternateView;
        this.eventBus.emit(new AlternateViewEvent(this.alternateView));
        this.requestUpdate();
    }
    onToggleEmojisButtonClick() {
        this.userSettings.toggleEmojis();
        this.requestUpdate();
    }
    onToggleStructureSpritesButtonClick() {
        this.userSettings.toggleStructureSprites();
        this.requestUpdate();
    }
    onToggleSpecialEffectsButtonClick() {
        this.userSettings.toggleFxLayer();
        this.requestUpdate();
    }
    onToggleAlertFrameButtonClick() {
        this.userSettings.toggleAlertFrame();
        this.requestUpdate();
    }
    onToggleDarkModeButtonClick() {
        this.userSettings.toggleDarkMode();
        this.eventBus.emit(new RefreshGraphicsEvent());
        this.requestUpdate();
    }
    onToggleRandomNameModeButtonClick() {
        this.userSettings.toggleRandomName();
        this.requestUpdate();
    }
    onToggleLeftClickOpensMenu() {
        this.userSettings.toggleLeftClickOpenMenu();
        this.requestUpdate();
    }
    onToggleCursorCostLabelButtonClick() {
        this.userSettings.toggleCursorCostLabel();
        this.requestUpdate();
    }
    onTogglePerformanceOverlayButtonClick() {
        this.userSettings.togglePerformanceOverlay();
        this.requestUpdate();
    }
    onToggleSupplyOverlayButtonClick() {
        this.userSettings.toggleSupplyOverlay();
        this.requestUpdate();
    }
    onExitButtonClick() {
        // redirect to the home page
        window.location.href = "/";
    }
    onVolumeChange(event) {
        const volume = parseFloat(event.target.value) / 100;
        this.userSettings.setBackgroundMusicVolume(volume);
        SoundManager.setBackgroundMusicVolume(volume);
        this.requestUpdate();
    }
    onSoundEffectsVolumeChange(event) {
        const volume = parseFloat(event.target.value) / 100;
        this.userSettings.setSoundEffectsVolume(volume);
        SoundManager.setSoundEffectsVolume(volume);
        this.requestUpdate();
    }
    render() {
        if (!this.isVisible) {
            return null;
        }
        return html `
      <div
        class="modal-overlay fixed inset-0 bg-black/60 backdrop-blur-xs z-2000 flex items-center justify-center p-4"
        @contextmenu=${(e) => e.preventDefault()}
      >
        <div
          class="bg-slate-800 border border-slate-600 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto"
        >
          <div
            class="flex items-center justify-between p-4 border-b border-slate-600"
          >
            <div class="flex items-center gap-2">
              <img
                src=${settingsIcon}
                alt="settings"
                width="24"
                height="24"
                class="align-middle"
              />
              <h2 class="text-xl font-semibold text-white">
                ${translateText("user_setting.tab_basic")}
              </h2>
            </div>
            <button
              class="text-slate-400 hover:text-white text-2xl font-bold leading-none"
              @click=${this.closeModal}
            >
              ×
            </button>
          </div>

          <div class="p-4 flex flex-col gap-3">
            <div
              class="flex gap-3 items-center w-full text-left p-3 hover:bg-slate-700 rounded-sm text-white transition-colors"
            >
              <img src=${musicIcon} alt="musicIcon" width="20" height="20" />
              <div class="flex-1">
                <div class="font-medium">
                  ${translateText("user_setting.background_music_volume")}
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  .value=${this.userSettings.backgroundMusicVolume() * 100}
                  @input=${this.onVolumeChange}
                  class="w-full border border-slate-500 rounded-lg"
                />
              </div>
              <div class="text-sm text-slate-400">
                ${Math.round(this.userSettings.backgroundMusicVolume() * 100)}%
              </div>
            </div>

            <div
              class="flex gap-3 items-center w-full text-left p-3 hover:bg-slate-700 rounded-sm text-white transition-colors"
            >
              <img
                src=${musicIcon}
                alt="soundEffectsIcon"
                width="20"
                height="20"
              />
              <div class="flex-1">
                <div class="font-medium">
                  ${translateText("user_setting.sound_effects_volume")}
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  .value=${this.userSettings.soundEffectsVolume() * 100}
                  @input=${this.onSoundEffectsVolumeChange}
                  class="w-full border border-slate-500 rounded-lg"
                />
              </div>
              <div class="text-sm text-slate-400">
                ${Math.round(this.userSettings.soundEffectsVolume() * 100)}%
              </div>
            </div>

            <button
              class="flex gap-3 items-center w-full text-left p-3 hover:bg-slate-700 rounded-sm text-white transition-colors"
              @click="${this.onTerrainButtonClick}"
            >
              <img src=${treeIcon} alt="treeIcon" width="20" height="20" />
              <div class="flex-1">
                <div class="font-medium">
                  ${translateText("user_setting.toggle_terrain")}
                </div>
                <div class="text-sm text-slate-400">
                  ${translateText("user_setting.toggle_view_desc")}
                </div>
              </div>
              <div class="text-sm text-slate-400">
                ${this.alternateView
            ? translateText("user_setting.on")
            : translateText("user_setting.off")}
              </div>
            </button>

            <button
              class="flex gap-3 items-center w-full text-left p-3 hover:bg-slate-700 rounded-sm text-white transition-colors"
              @click="${this.onToggleEmojisButtonClick}"
            >
              <img src=${emojiIcon} alt="emojiIcon" width="20" height="20" />
              <div class="flex-1">
                <div class="font-medium">
                  ${translateText("user_setting.emojis_label")}
                </div>
                <div class="text-sm text-slate-400">
                  ${translateText("user_setting.emojis_desc")}
                </div>
              </div>
              <div class="text-sm text-slate-400">
                ${this.userSettings.emojis()
            ? translateText("user_setting.on")
            : translateText("user_setting.off")}
              </div>
            </button>

            <button
              class="flex gap-3 items-center w-full text-left p-3 hover:bg-slate-700 rounded-sm text-white transition-colors"
              @click="${this.onToggleDarkModeButtonClick}"
            >
              <img
                src=${darkModeIcon}
                alt="darkModeIcon"
                width="20"
                height="20"
              />
              <div class="flex-1">
                <div class="font-medium">
                  ${translateText("user_setting.dark_mode_label")}
                </div>
                <div class="text-sm text-slate-400">
                  ${translateText("user_setting.dark_mode_desc")}
                </div>
              </div>
              <div class="text-sm text-slate-400">
                ${this.userSettings.darkMode()
            ? translateText("user_setting.on")
            : translateText("user_setting.off")}
              </div>
            </button>

            <button
              class="flex gap-3 items-center w-full text-left p-3 hover:bg-slate-700 rounded-sm text-white transition-colors"
              @click="${this.onToggleSpecialEffectsButtonClick}"
            >
              <img
                src=${explosionIcon}
                alt="specialEffects"
                width="20"
                height="20"
              />
              <div class="flex-1">
                <div class="font-medium">
                  ${translateText("user_setting.special_effects_label")}
                </div>
                <div class="text-sm text-slate-400">
                  ${translateText("user_setting.special_effects_desc")}
                </div>
              </div>
              <div class="text-sm text-slate-400">
                ${this.userSettings.fxLayer()
            ? translateText("user_setting.on")
            : translateText("user_setting.off")}
              </div>
            </button>

            <button
              class="flex gap-3 items-center w-full text-left p-3 hover:bg-slate-700 rounded-sm text-white transition-colors"
              @click="${this.onToggleAlertFrameButtonClick}"
            >
              <img src=${sirenIcon} alt="alertFrame" width="20" height="20" />
              <div class="flex-1">
                <div class="font-medium">
                  ${translateText("user_setting.alert_frame_label")}
                </div>
                <div class="text-sm text-slate-400">
                  ${translateText("user_setting.alert_frame_desc")}
                </div>
              </div>
              <div class="text-sm text-slate-400">
                ${this.userSettings.alertFrame()
            ? translateText("user_setting.on")
            : translateText("user_setting.off")}
              </div>
            </button>

            <button
              class="flex gap-3 items-center w-full text-left p-3 hover:bg-slate-700 rounded-sm text-white transition-colors"
              @click="${this.onToggleStructureSpritesButtonClick}"
            >
              <img
                src=${structureIcon}
                alt="structureSprites"
                width="20"
                height="20"
              />
              <div class="flex-1">
                <div class="font-medium">
                  ${translateText("user_setting.structure_sprites_label")}
                </div>
                <div class="text-sm text-slate-400">
                  ${translateText("user_setting.structure_sprites_desc")}
                </div>
              </div>
              <div class="text-sm text-slate-400">
                ${this.userSettings.structureSprites()
            ? translateText("user_setting.on")
            : translateText("user_setting.off")}
              </div>
            </button>

            <button
              class="flex gap-3 items-center w-full text-left p-3 hover:bg-slate-700 rounded-sm text-white transition-colors"
              @click="${this.onToggleCursorCostLabelButtonClick}"
            >
              <img
                src=${cursorPriceIcon}
                alt="cursorCostLabel"
                width="20"
                height="20"
              />
              <div class="flex-1">
                <div class="font-medium">
                  ${translateText("user_setting.cursor_cost_label_label")}
                </div>
                <div class="text-sm text-slate-400">
                  ${translateText("user_setting.cursor_cost_label_desc")}
                </div>
              </div>
              <div class="text-sm text-slate-400">
                ${this.userSettings.cursorCostLabel()
            ? translateText("user_setting.on")
            : translateText("user_setting.off")}
              </div>
            </button>

            <button
              class="flex gap-3 items-center w-full text-left p-3 hover:bg-slate-700 rounded-sm text-white transition-colors"
              @click="${this.onToggleRandomNameModeButtonClick}"
            >
              <img src=${ninjaIcon} alt="ninjaIcon" width="20" height="20" />
              <div class="flex-1">
                <div class="font-medium">
                  ${translateText("user_setting.anonymous_names_label")}
                </div>
                <div class="text-sm text-slate-400">
                  ${translateText("user_setting.anonymous_names_desc")}
                </div>
              </div>
              <div class="text-sm text-slate-400">
                ${this.userSettings.anonymousNames()
            ? translateText("user_setting.on")
            : translateText("user_setting.off")}
              </div>
            </button>

            <button
              class="flex gap-3 items-center w-full text-left p-3 hover:bg-slate-700 rounded-sm text-white transition-colors"
              @click="${this.onToggleLeftClickOpensMenu}"
            >
              <img src=${mouseIcon} alt="mouseIcon" width="20" height="20" />
              <div class="flex-1">
                <div class="font-medium">
                  ${translateText("user_setting.left_click_menu")}
                </div>
                <div class="text-sm text-slate-400">
                  ${translateText("user_setting.left_click_desc")}
                </div>
              </div>
              <div class="text-sm text-slate-400">
                ${this.userSettings.leftClickOpensMenu()
            ? translateText("user_setting.on")
            : translateText("user_setting.off")}
              </div>
            </button>

            <button
              class="flex gap-3 items-center w-full text-left p-3 hover:bg-slate-700 rounded-sm text-white transition-colors"
              @click="${this.onToggleSupplyOverlayButtonClick}"
            >
              <img
                src=${shieldIcon}
                alt="supplyOverlay"
                width="20"
                height="20"
              />
              <div class="flex-1">
                <div class="font-medium">
                  ${translateText("user_setting.supply_overlay_label")}
                </div>
                <div class="text-sm text-slate-400">
                  ${translateText("user_setting.supply_overlay_desc")}
                </div>
              </div>
              <div class="text-sm text-slate-400">
                ${this.userSettings.supplyOverlay()
            ? translateText("user_setting.on")
            : translateText("user_setting.off")}
              </div>
            </button>

            <button
              class="flex gap-3 items-center w-full text-left p-3 hover:bg-slate-700 rounded-sm text-white transition-colors"
              @click="${this.onTogglePerformanceOverlayButtonClick}"
            >
              <img
                src=${settingsIcon}
                alt="performanceIcon"
                width="20"
                height="20"
              />
              <div class="flex-1">
                <div class="font-medium">
                  ${translateText("user_setting.performance_overlay_label")}
                </div>
                <div class="text-sm text-slate-400">
                  ${translateText("user_setting.performance_overlay_desc")}
                </div>
              </div>
              <div class="text-sm text-slate-400">
                ${this.userSettings.performanceOverlay()
            ? translateText("user_setting.on")
            : translateText("user_setting.off")}
              </div>
            </button>

            <div class="border-t border-slate-600 pt-3 mt-4">
              <button
                class="flex gap-3 items-center w-full text-left p-3 hover:bg-red-600/20 rounded-sm text-red-400 transition-colors"
                @click="${this.onExitButtonClick}"
              >
                <img src=${exitIcon} alt="exitIcon" width="20" height="20" />
                <div class="flex-1">
                  <div class="font-medium">
                    ${translateText("user_setting.exit_game_label")}
                  </div>
                  <div class="text-sm text-slate-400">
                    ${translateText("user_setting.exit_game_info")}
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    }
};
__decorate([
    state()
], SettingsModal.prototype, "isVisible", void 0);
__decorate([
    state()
], SettingsModal.prototype, "alternateView", void 0);
__decorate([
    query(".modal-overlay")
], SettingsModal.prototype, "modalOverlay", void 0);
__decorate([
    property({ type: Boolean })
], SettingsModal.prototype, "shouldPause", void 0);
__decorate([
    property({ type: Boolean })
], SettingsModal.prototype, "wasPausedWhenOpened", void 0);
SettingsModal = __decorate([
    customElement("settings-modal")
], SettingsModal);
export { SettingsModal };
//# sourceMappingURL=SettingsModal.js.map