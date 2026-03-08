var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { translateText } from "../../../Utils";
import { RankType } from "./GameInfoRanking";
let RankingHeader = class RankingHeader extends LitElement {
    constructor() {
        super(...arguments);
        this.rankType = RankType.Lifetime;
    }
    onSort(type) {
        this.dispatchEvent(new CustomEvent("sort", { detail: type }));
    }
    render() {
        return html `
      <li
        class="h-[30px] text-lg border-white/5 bg-white/[0.02] text-white/60 text-xs uppercase tracking-wider relative pt-2 pb-2 pr-5 pl-5 flex justify-between items-center"
      >
        ${this.renderHeaderContent()}
      </li>
    `;
    }
    renderHeaderContent() {
        switch (this.rankType) {
            case RankType.Lifetime:
                return html `<div class="w-full">
          ${translateText("game_info_modal.survival_time")}
        </div>`;
            case RankType.ConquestHumans:
            case RankType.ConquestBots:
                return html `
          <div class="flex justify-between sm:px-17.5 w-full">
            ${this.renderMultipleChoiceHeaderButton(translateText("game_info_modal.num_of_conquests_humans"), RankType.ConquestHumans)}
            /
            ${this.renderMultipleChoiceHeaderButton(translateText("game_info_modal.num_of_conquests_bots"), RankType.ConquestBots)}
          </div>
        `;
            case RankType.Atoms:
            case RankType.Hydros:
            case RankType.MIRV:
                return html `
          <div class="flex justify-between sm:px-17.5 w-full">
            ${this.renderMultipleChoiceHeaderButton(translateText("game_info_modal.atoms"), RankType.Atoms)}
            /
            ${this.renderMultipleChoiceHeaderButton(translateText("game_info_modal.hydros"), RankType.Hydros)}
            /
            ${this.renderMultipleChoiceHeaderButton(translateText("game_info_modal.mirv"), RankType.MIRV)}
          </div>
        `;
            case RankType.TotalGold:
                return html `<div class="w-full">
          ${translateText("game_info_modal.all_gold")}
        </div>`;
            case RankType.NavalTrade:
            case RankType.TrainTrade:
                return html `
          <div class="flex justify-between sm:px-17.5 w-full">
            ${this.renderMultipleChoiceHeaderButton(translateText("game_info_modal.train_trade"), RankType.TrainTrade)}
            /
            ${this.renderMultipleChoiceHeaderButton(translateText("game_info_modal.naval_trade"), RankType.NavalTrade)}
          </div>
        `;
            case RankType.ConqueredGold:
                return html `<div class="w-full">
          ${translateText("game_info_modal.conquest_gold")}
        </div>`;
            case RankType.StolenGold:
                return html `<div class="w-full">
          ${translateText("game_info_modal.stolen_gold")}
        </div>`;
            default:
                console.warn("Unhandled RankType", this.rankType);
                return null;
        }
    }
    renderMultipleChoiceHeaderButton(label, type) {
        return html `
      <button
        @click=${() => this.onSort(type)}
        class="${this.rankType === type
            ? "border-b-2 border-b-white"
            : nothing}"
      >
        ${label}
      </button>
    `;
    }
    createRenderRoot() {
        return this;
    }
};
__decorate([
    property({ type: String })
], RankingHeader.prototype, "rankType", void 0);
RankingHeader = __decorate([
    customElement("ranking-header")
], RankingHeader);
export { RankingHeader };
//# sourceMappingURL=RankingHeader.js.map