var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { GOLD_INDEX_TRADE, GOLD_INDEX_TRAIN_OTHER, GOLD_INDEX_TRAIN_SELF, } from "src/core/StatsSchemas";
import { renderNumber } from "../../../Utils";
import { RankType } from "./GameInfoRanking";
let PlayerRow = class PlayerRow extends LitElement {
    constructor() {
        super(...arguments);
        this.bestScore = 1;
        this.rank = 1;
        this.score = 0;
        this.currentPlayer = false;
    }
    createRenderRoot() {
        return this;
    }
    render() {
        if (!this.player)
            return html ``;
        const { player } = this;
        const visibleBorder = player.winner || this.currentPlayer;
        return html `
      <li
        class="${player.winner ? "bg-black/20" : "bg-black/20"} border-b-1
          ${player.winner
            ? "border-yellow-500 border-1 box-content"
            : visibleBorder
                ? "border-white/5"
                : "border-transparent"}
           relative pt-1 pb-1 pr-2 pl-2 sm:pl-5 sm:pr-5 flex justify-between items-center hover:bg-white/[0.07] transition-colors duration-150 ease-in-out"
      >
        <div
          class="font-bold text-right w-7.5 text-lg text-white absolute -left-10"
        >
          ${this.rank}
        </div>
        ${this.renderPlayerInfo()}
      </li>
    `;
    }
    renderPlayerIcon() {
        return html `
      ${this.renderIcon()} ${this.player.winner ? this.renderCrownIcon() : ""}
    `;
    }
    renderCrownIcon() {
        return html `
      <img
        src="/images/CrownIcon.svg"
        class="absolute -top-0.75 left-4 size-3.75 sm:-top-1.75 sm:left-7.5 sm:size-5"
      />
    `;
    }
    renderPlayerInfo() {
        switch (this.rankType) {
            case RankType.Lifetime:
            case RankType.ConquestHumans:
            case RankType.ConquestBots:
                return this.renderScoreAsBar();
            case RankType.Atoms:
            case RankType.Hydros:
            case RankType.MIRV:
                return this.renderBombScore();
            case RankType.TotalGold:
            case RankType.ConqueredGold:
            case RankType.StolenGold:
                return this.renderGoldScore();
            case RankType.NavalTrade:
            case RankType.TrainTrade:
                return this.renderTradeScore();
            default:
                return html ``;
        }
    }
    renderScoreAsBar() {
        return html `
      <div class="flex gap-3 items-center w-full">
        ${this.renderPlayerIcon()}
        <div class="flex flex-col sm:flex-row gap-1 text-left w-full">
          ${this.renderPlayerName()} ${this.renderScoreBar()}
        </div>
      </div>
      <div>
        <div
          class="font-bold rounded-[50%] size-7.5 leading-[1.6rem] border border-white/10 text-center bg-white/5 text-white/80"
        >
          ${Number(this.score).toFixed(0)}
        </div>
      </div>
    `;
    }
    renderScoreBar() {
        const bestScore = Math.max(this.bestScore, 1);
        const width = Math.min(Math.max((this.score / bestScore) * 100, 0), 100);
        return html `
      <div class="w-full pr-2.5 m-auto">
        <div class="h-1.75 bg-white/10 w-full">
          <!-- bar background -->
          <div
            class="h-1.75 bg-blue-500/50 w-(--width)"
            style="--width: ${width}%;"
          ></div>
        </div>
      </div>
    `;
    }
    renderMultiScoreType(value, highlight) {
        return html `
      <div
        class="${highlight
            ? "font-bold text-[18px] text-white/80"
            : "leading-[24px] text-white/40"} min-w-7.5 sm:min-w-15 inline-block text-center"
      >
        ${renderNumber(value)}
      </div>
    `;
    }
    renderAllBombs() {
        return html `
      <div class="flex justify-between text-sm sm:pr-20">
        ${this.renderMultiScoreType(this.player.atoms, this.rankType === RankType.Atoms)}
        /
        ${this.renderMultiScoreType(this.player.hydros, this.rankType === RankType.Hydros)}
        /
        ${this.renderMultiScoreType(this.player.mirv, this.rankType === RankType.MIRV)}
      </div>
    `;
    }
    renderAllTrades() {
        const navalTrade = this.player.gold[GOLD_INDEX_TRADE] ?? 0n;
        const ownTrainTrade = this.player.gold[GOLD_INDEX_TRAIN_SELF] ?? 0n;
        const otherTrainTrade = this.player.gold[GOLD_INDEX_TRAIN_OTHER] ?? 0n;
        return html `
      <div class="flex justify-between text-sm align-baseline">
        ${this.renderMultiScoreType(Number(ownTrainTrade + otherTrainTrade), this.rankType === RankType.TrainTrade)}
        /
        ${this.renderMultiScoreType(Number(navalTrade), this.rankType === RankType.NavalTrade)}
      </div>
    `;
    }
    renderBombScore() {
        return html `
      <div class="flex gap-3 items-center align-baseline w-full">
        ${this.renderPlayerIcon()}
        <div class="flex flex-col sm:flex-row gap-1 text-left w-full">
          ${this.renderPlayerName()} ${this.renderAllBombs()}
        </div>
      </div>
    `;
    }
    renderGoldScore() {
        return html `
      <div class="flex gap-3 items-center">
        ${this.renderPlayerIcon()}
        <div class="text-left w-31.25 sm:w-50">${this.renderPlayerName()}</div>
      </div>

      <div class="flex gap-2">
        <div
          class="font-bold rounded-md w-15 text-white/80 text-sm sm:w-25 leading-[1.9rem] text-center"
        >
          ${renderNumber(this.score)}
        </div>
        <img src="/images/GoldCoinIcon.svg" class="size-3.5 sm:size-5 m-auto" />
      </div>
    `;
    }
    renderTradeScore() {
        return html `
      <div class="flex flex-col sm:flex-row gap-1 text-left w-full">
        <div class="flex gap-3 items-center">
          ${this.renderPlayerIcon()}
          <div class="text-left w-31.25 sm:w-50">
            ${this.renderPlayerName()}
          </div>
        </div>

        <div class="flex gap-2 justify-between items-center w-full">
          <div class="rounded-md text-sm leading-[1.9rem] text-center w-full">
            ${this.renderAllTrades()}
          </div>
          <img src="/images/GoldCoinIcon.svg" class="w-5 size-3.5 sm:size-5" />
        </div>
      </div>
    `;
    }
    renderPlayerName() {
        return html `
      <div class="flex gap-1 items-center w-50 shrink-0">
        ${this.player.tag ? this.renderTag(this.player.tag) : ""}
        <div
          class="text-xs sm:text-sm font-bold tracking-wide text-white/80 text-ellipsis w-37.5 shrink-0 overflow-hidden whitespace-nowrap"
        >
          ${this.player.username}
        </div>
      </div>
    `;
    }
    renderTag(tag) {
        return html `
      <div
        class="px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 font-bold text-xs tracking-wide group-hover:bg-blue-500/20 transition-colors"
      >
        ${tag}
      </div>
    `;
    }
    renderIcon() {
        if (this.player.killedAt) {
            return html ` <div
        class="size-7.5 leading-1.25 shrink-0 text-lg sm:size-10 pt-3 sm:leading-3.75 sm:rounded-[50%] sm:border sm:border-gray-200 text-center sm:bg-slate-500 sm:text-2xl"
      >
        💀
      </div>`;
        }
        else if (this.player.flag) {
            return html `<img
        src="/flags/${this.player.flag}.svg"
        class="min-w-7.5 h-7.5 sm:min-w-10 sm:h-10 shrink-0"
      />`;
        }
        return html `
      <div
        class="size-7.5 leading-1.25 shrink-0 rounded-[50%] sm:size-10 sm:pt-2.5 sm:leading-3.5 border border-gray-200 text-center bg-slate-500"
      >
        <img
          src="/images/ProfileIcon.svg"
          class="size-5 mt-0.5 sm:size-6.25 sm:-mt-1.25 m-auto"
        />
      </div>
    `;
    }
};
__decorate([
    property({ type: Object })
], PlayerRow.prototype, "player", void 0);
__decorate([
    property({ type: String })
], PlayerRow.prototype, "rankType", void 0);
__decorate([
    property({ type: Number })
], PlayerRow.prototype, "bestScore", void 0);
__decorate([
    property({ type: Number })
], PlayerRow.prototype, "rank", void 0);
__decorate([
    property({ type: Number })
], PlayerRow.prototype, "score", void 0);
__decorate([
    property({ type: Boolean })
], PlayerRow.prototype, "currentPlayer", void 0);
PlayerRow = __decorate([
    customElement("player-row")
], PlayerRow);
export { PlayerRow };
//# sourceMappingURL=PlayerRow.js.map