var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { GameMode } from "../../../core/game/Game";
export class SpawnBarVisibleEvent {
    constructor(visible) {
        this.visible = visible;
    }
}
let SpawnTimer = class SpawnTimer extends LitElement {
    constructor() {
        super(...arguments);
        this.ratios = [0];
        this._barVisible = false;
        this.colors = ["rgba(0, 128, 255, 0.7)", "rgba(0, 0, 0, 0.5)"];
        this.isVisible = false;
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
        if (this.game.inSpawnPhase()) {
            // During spawn phase, only one segment filling full width
            this.ratios = [
                this.game.ticks() / this.game.config().numSpawnPhaseTurns(),
            ];
            this.colors = ["rgba(0, 128, 255, 0.7)"];
        }
        else {
            this.ratios = [];
            this.colors = [];
            if (this.game.config().gameConfig().gameMode === GameMode.Team) {
                const teamTiles = new Map();
                for (const player of this.game.players()) {
                    const team = player.team();
                    if (team === null)
                        continue;
                    const tiles = teamTiles.get(team) ?? 0;
                    teamTiles.set(team, tiles + player.numTilesOwned());
                }
                const theme = this.game.config().theme();
                const total = sumIterator(teamTiles.values());
                if (total > 0) {
                    for (const [team, count] of teamTiles) {
                        const ratio = count / total;
                        this.ratios.push(ratio);
                        this.colors.push(theme.teamColor(team).toRgbString());
                    }
                }
            }
        }
        this.requestUpdate();
        this.emitBarVisibility();
    }
    emitBarVisibility() {
        const nowVisible = this.isVisible && this.ratios.length > 0;
        if (nowVisible !== this._barVisible) {
            this._barVisible = nowVisible;
            this.eventBus?.emit(new SpawnBarVisibleEvent(this._barVisible));
        }
    }
    shouldTransform() {
        return false;
    }
    render() {
        if (!this.isVisible) {
            return html ``;
        }
        if (this.ratios.length === 0 || this.colors.length === 0) {
            return html ``;
        }
        if (!this.game.inSpawnPhase() &&
            this.game.config().gameConfig().gameMode !== GameMode.Team) {
            return html ``;
        }
        return html `
      <div class="w-full h-full flex z-999">
        ${this.ratios.map((ratio, i) => {
            const color = this.colors[i] || "rgba(0, 0, 0, 0.5)";
            return html `
            <div
              class="h-full transition-all duration-100 ease-in-out w-(--width) bg-(--bg)"
              style="--width: ${ratio * 100}%; --bg: ${color};"
            ></div>
          `;
        })}
      </div>
    `;
    }
};
SpawnTimer = __decorate([
    customElement("spawn-timer")
], SpawnTimer);
export { SpawnTimer };
function sumIterator(values) {
    let total = 0;
    for (const value of values) {
        total += value;
    }
    return total;
}
//# sourceMappingURL=SpawnTimer.js.map