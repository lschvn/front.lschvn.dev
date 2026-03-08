var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { Difficulty, GameMapType } from "../../../core/game/Game";
import { terrainMapFileLoader } from "../../TerrainMapFileLoader";
import { translateText } from "../../Utils";
let MapDisplay = class MapDisplay extends LitElement {
    constructor() {
        super(...arguments);
        this.mapKey = "";
        this.selected = false;
        this.translation = "";
        this.showMedals = false;
        this.wins = new Set();
        this.mapWebpPath = null;
        this.mapName = null;
        this.isLoading = true;
        this.hasNations = true;
        this.observer = null;
        this.dataLoaded = false;
    }
    createRenderRoot() {
        return this;
    }
    connectedCallback() {
        super.connectedCallback();
        this.observer = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting) && !this.dataLoaded) {
                this.dataLoaded = true;
                this.loadMapData();
                this.observer?.disconnect();
            }
        }, { rootMargin: "200px" });
        this.observer.observe(this);
    }
    disconnectedCallback() {
        this.observer?.disconnect();
        this.observer = null;
        super.disconnectedCallback();
    }
    async loadMapData() {
        if (!this.mapKey)
            return;
        try {
            this.isLoading = true;
            const mapValue = GameMapType[this.mapKey];
            const data = terrainMapFileLoader.getMapData(mapValue);
            this.mapWebpPath = data.webpPath;
            const manifest = await data.manifest();
            this.mapName = manifest.name;
            this.hasNations =
                Array.isArray(manifest.nations) && manifest.nations.length > 0;
        }
        catch (error) {
            console.error("Failed to load map data:", error);
        }
        finally {
            this.isLoading = false;
        }
    }
    handleKeydown(event) {
        // Trigger the same activation logic as click when Enter or Space is pressed
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            // Dispatch a click event to maintain compatibility with parent click handlers
            event.target.click();
        }
    }
    preventImageDrag(event) {
        event.preventDefault();
    }
    render() {
        return html `
      <div
        role="button"
        tabindex="0"
        aria-selected="${this.selected}"
        aria-label="${this.translation ?? this.mapName ?? this.mapKey}"
        @keydown="${this.handleKeydown}"
        class="w-full h-full p-3 flex flex-col items-center justify-between rounded-xl border cursor-pointer transition-all duration-200 active:scale-95 gap-3 group ${this
            .selected
            ? "bg-blue-500/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1"}"
      >
        ${this.isLoading
            ? html `<div
              class="w-full aspect-[2/1] text-white/40 transition-transform duration-200 rounded-lg bg-black/20 text-xs font-bold uppercase tracking-wider flex items-center justify-center animate-pulse"
            >
              ${translateText("map_component.loading")}
            </div>`
            : this.mapWebpPath
                ? html `<div
                class="w-full aspect-[2/1] relative overflow-hidden rounded-lg bg-black/20"
              >
                <img
                  src="${this.mapWebpPath}"
                  alt="${this.translation || this.mapName}"
                  draggable="false"
                  @dragstart=${this.preventImageDrag}
                  class="w-full h-full object-cover ${this.selected
                    ? "opacity-100"
                    : "opacity-80"} group-hover:opacity-100 transition-opacity duration-200"
                />
              </div>`
                : html `<div
                class="w-full aspect-[2/1] text-red-400 transition-transform duration-200 rounded-lg bg-red-500/10 text-xs font-bold uppercase tracking-wider flex items-center justify-center"
              >
                ${translateText("map_component.error")}
              </div>`}
        ${this.showMedals && this.hasNations
            ? html `<div class="flex gap-1 justify-center w-full">
              ${this.renderMedals()}
            </div>`
            : null}
        <div
          class="text-xs font-bold text-white uppercase tracking-wider text-center leading-tight break-words hyphens-auto"
        >
          ${this.translation || this.mapName}
        </div>
      </div>
    `;
    }
    renderMedals() {
        const medalOrder = [
            Difficulty.Easy,
            Difficulty.Medium,
            Difficulty.Hard,
            Difficulty.Impossible,
        ];
        const colors = {
            [Difficulty.Easy]: "var(--medal-easy)",
            [Difficulty.Medium]: "var(--medal-medium)",
            [Difficulty.Hard]: "var(--medal-hard)",
            [Difficulty.Impossible]: "var(--medal-impossible)",
        };
        const wins = this.readWins();
        return medalOrder.map((medal) => {
            const earned = wins.has(medal);
            const mask = "url('/images/MedalIconWhite.svg') no-repeat center / contain";
            return html `<div
        class="w-5 h-5 ${earned ? "opacity-100" : "opacity-25"}"
        style="background-color:${colors[medal]}; mask: ${mask}; -webkit-mask: ${mask};"
        title=${translateText(`difficulty.${medal.toLowerCase()}`)}
      ></div>`;
        });
    }
    readWins() {
        return this.wins ?? new Set();
    }
};
__decorate([
    property({ type: String })
], MapDisplay.prototype, "mapKey", void 0);
__decorate([
    property({ type: Boolean })
], MapDisplay.prototype, "selected", void 0);
__decorate([
    property({ type: String })
], MapDisplay.prototype, "translation", void 0);
__decorate([
    property({ type: Boolean })
], MapDisplay.prototype, "showMedals", void 0);
__decorate([
    property({ attribute: false })
], MapDisplay.prototype, "wins", void 0);
__decorate([
    state()
], MapDisplay.prototype, "mapWebpPath", void 0);
__decorate([
    state()
], MapDisplay.prototype, "mapName", void 0);
__decorate([
    state()
], MapDisplay.prototype, "isLoading", void 0);
__decorate([
    state()
], MapDisplay.prototype, "hasNations", void 0);
MapDisplay = __decorate([
    customElement("map-display")
], MapDisplay);
export { MapDisplay };
//# sourceMappingURL=MapDisplay.js.map