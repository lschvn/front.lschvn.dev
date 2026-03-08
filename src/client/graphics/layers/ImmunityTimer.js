var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { GameMode } from "../../../core/game/Game";
export class ImmunityBarVisibleEvent {
    constructor(visible) {
        this.visible = visible;
    }
}
let ImmunityTimer = class ImmunityTimer extends LitElement {
    constructor() {
        super(...arguments);
        this.isVisible = false;
        this._barVisible = false;
        this.isActive = false;
        this.progressRatio = 0;
    }
    createRenderRoot() {
        this.style.position = "fixed";
        this.style.top = "0";
        this.style.left = "0";
        this.style.width = "100%";
        this.style.height = "7px";
        this.style.zIndex = "1000";
        this.style.pointerEvents = "none";
        return this;
    }
    init() {
        this.isVisible = true;
    }
    tick() {
        if (!this.game || !this.isVisible) {
            return;
        }
        const showTeamOwnershipBar = this.game.config().gameConfig().gameMode === GameMode.Team &&
            !this.game.inSpawnPhase();
        this.style.top = showTeamOwnershipBar ? "7px" : "0px";
        const immunityDuration = this.game.config().spawnImmunityDuration();
        const spawnPhaseTurns = this.game.config().numSpawnPhaseTurns();
        if (!this.game.config().hasExtendedSpawnImmunity() ||
            this.game.inSpawnPhase()) {
            this.setInactive();
        }
        else {
            const immunityEnd = spawnPhaseTurns + immunityDuration;
            const ticks = this.game.ticks();
            if (ticks >= immunityEnd || ticks < spawnPhaseTurns) {
                this.setInactive();
            }
            else {
                const elapsedTicks = Math.max(0, ticks - spawnPhaseTurns);
                this.progressRatio = Math.min(1, Math.max(0, elapsedTicks / immunityDuration));
                this.isActive = true;
                this.requestUpdate();
            }
        }
        this.emitBarVisibility();
    }
    setInactive() {
        if (this.isActive) {
            this.isActive = false;
            this.requestUpdate();
        }
    }
    emitBarVisibility() {
        const nowVisible = this.isVisible && this.isActive;
        if (nowVisible !== this._barVisible) {
            this._barVisible = nowVisible;
            this.eventBus?.emit(new ImmunityBarVisibleEvent(this._barVisible));
        }
    }
    shouldTransform() {
        return false;
    }
    render() {
        if (!this.isVisible || !this.isActive) {
            return html ``;
        }
        const widthPercent = this.progressRatio * 100;
        return html `
      <div class="w-full h-full flex z-999">
        <div
          class="h-full transition-all duration-100 ease-in-out"
          style="width: ${widthPercent}%; background-color: rgba(255, 165, 0, 0.9);"
        ></div>
      </div>
    `;
    }
};
ImmunityTimer = __decorate([
    customElement("immunity-timer")
], ImmunityTimer);
export { ImmunityTimer };
//# sourceMappingURL=ImmunityTimer.js.map