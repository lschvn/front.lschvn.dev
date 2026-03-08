var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
let PlayerStatsGrid = class PlayerStatsGrid extends LitElement {
    constructor() {
        super(...arguments);
        this.titles = [];
        this.values = [];
        // Currently fixed to display 4 stats (can be changed if needed)
        this.VISIBLE_STATS_COUNT = 4;
    }
    createRenderRoot() {
        return this;
    }
    render() {
        return html `
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        ${Array(this.VISIBLE_STATS_COUNT)
            .fill(0)
            .map((_, i) => html `
              <div
                class="flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
              >
                <div class="text-2xl font-bold text-white mb-1">
                  ${this.values[i] ?? ""}
                </div>
                <div
                  class="text-blue-200/60 text-xs font-bold uppercase tracking-widest"
                >
                  ${this.titles[i] ?? ""}
                </div>
              </div>
            `)}
      </div>
    `;
    }
};
__decorate([
    property({ type: Array })
], PlayerStatsGrid.prototype, "titles", void 0);
__decorate([
    property({ type: Array })
], PlayerStatsGrid.prototype, "values", void 0);
PlayerStatsGrid = __decorate([
    customElement("player-stats-grid")
], PlayerStatsGrid);
export { PlayerStatsGrid };
//# sourceMappingURL=PlayerStatsGrid.js.map