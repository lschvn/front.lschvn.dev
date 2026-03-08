var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { Difficulty, GameMode, GameType, isDifficulty, isGameMode, isGameType, } from "../../../../core/game/Game";
import { renderNumber, translateText } from "../../../Utils";
import "./PlayerStatsGrid";
import "./PlayerStatsTable";
let PlayerStatsTreeView = class PlayerStatsTreeView extends LitElement {
    constructor() {
        super(...arguments);
        this.selectedType = GameType.Public;
        this.selectedMode = GameMode.FFA;
        this.selectedDifficulty = Difficulty.Medium;
    }
    get typeNode() {
        return this.statsTree?.[this.selectedType];
    }
    get modeNode() {
        return this.typeNode?.[this.selectedMode];
    }
    get shouldMergeDifficulties() {
        return this.selectedType === GameType.Public;
    }
    get availableTypes() {
        if (!this.statsTree)
            return [];
        return Object.keys(this.statsTree).filter(isGameType);
    }
    get availableModes() {
        if (!this.typeNode)
            return [];
        return Object.keys(this.typeNode).filter(isGameMode);
    }
    get availableDifficulties() {
        if (!this.modeNode)
            return [];
        return Object.keys(this.modeNode).filter(isDifficulty);
    }
    labelForMode(m) {
        return m === GameMode.FFA
            ? translateText("game_mode.ffa")
            : translateText("game_mode.teams");
    }
    createRenderRoot() {
        return this;
    }
    getSelectedLeaf() {
        const modeNode = this.modeNode;
        if (!modeNode)
            return null;
        if (!this.shouldMergeDifficulties) {
            return modeNode[this.selectedDifficulty] ?? null;
        }
        const diffKeys = Object.keys(modeNode).filter(isDifficulty);
        if (!diffKeys.length)
            return null;
        return diffKeys.reduce((merged, diffKey) => {
            const leaf = modeNode[diffKey];
            if (!leaf)
                return merged;
            if (!merged) {
                return {
                    wins: leaf.wins,
                    losses: leaf.losses,
                    total: leaf.total,
                    stats: this.cloneStats(leaf.stats),
                };
            }
            return {
                wins: merged.wins + leaf.wins,
                losses: merged.losses + leaf.losses,
                total: merged.total + leaf.total,
                stats: this.mergeStats(merged.stats, leaf.stats),
            };
        }, null);
    }
    syncSelection() {
        const types = this.availableTypes;
        if (types.length && !types.includes(this.selectedType)) {
            this.selectedType = types[0];
        }
        const modes = this.availableModes;
        if (modes.length && !modes.includes(this.selectedMode)) {
            this.selectedMode = modes[0];
        }
        const diffs = this.availableDifficulties;
        if (!this.shouldMergeDifficulties &&
            diffs.length &&
            !diffs.includes(this.selectedDifficulty)) {
            this.selectedDifficulty = diffs[0];
        }
    }
    willUpdate(changedProperties) {
        if (changedProperties.has("statsTree") ||
            changedProperties.has("selectedType") ||
            changedProperties.has("selectedMode") ||
            changedProperties.has("selectedDifficulty")) {
            this.syncSelection();
        }
    }
    setGameType(t) {
        if (this.selectedType === t)
            return;
        this.selectedType = t;
        this.requestUpdate();
    }
    setMode(m) {
        if (this.selectedMode === m)
            return;
        this.selectedMode = m;
        this.requestUpdate();
    }
    setDifficulty(d) {
        if (this.selectedDifficulty === d)
            return;
        this.selectedDifficulty = d;
        this.requestUpdate();
    }
    mergeStats(base, next) {
        if (!base && !next)
            return undefined;
        if (!base)
            return this.cloneStats(next);
        if (!next)
            return this.cloneStats(base);
        return {
            attacks: this.mergeStatArrays(base.attacks, next.attacks),
            betrayals: this.mergeStatValue(base.betrayals, next.betrayals),
            killedAt: this.mergeStatValue(base.killedAt, next.killedAt),
            conquests: this.mergeStatArrays(base.conquests, next.conquests),
            boats: this.mergeStatRecord(base.boats, next.boats),
            bombs: this.mergeStatRecord(base.bombs, next.bombs),
            gold: this.mergeStatArrays(base.gold, next.gold),
            units: this.mergeStatRecord(base.units, next.units),
        };
    }
    mergeStatValue(base, next) {
        if (base === undefined && next === undefined)
            return undefined;
        return (base ?? 0n) + (next ?? 0n);
    }
    mergeStatArrays(base, next) {
        if (!base && !next)
            return undefined;
        const maxLen = Math.max(base?.length ?? 0, next?.length ?? 0);
        const merged = [];
        for (let i = 0; i < maxLen; i += 1) {
            merged[i] = (base?.[i] ?? 0n) + (next?.[i] ?? 0n);
        }
        return merged;
    }
    mergeStatRecord(base, next) {
        if (!base && !next)
            return undefined;
        const merged = {};
        const keys = new Set([
            ...Object.keys(base ?? {}),
            ...Object.keys(next ?? {}),
        ]);
        keys.forEach((key) => {
            const mergedArray = this.mergeStatArrays(base?.[key], next?.[key]);
            if (mergedArray) {
                merged[key] = mergedArray;
            }
        });
        return Object.keys(merged).length ? merged : undefined;
    }
    cloneStats(stats) {
        if (!stats)
            return undefined;
        return {
            attacks: stats.attacks ? [...stats.attacks] : undefined,
            betrayals: stats.betrayals,
            killedAt: stats.killedAt,
            conquests: stats.conquests ? [...stats.conquests] : undefined,
            boats: stats.boats ? { ...stats.boats } : undefined,
            bombs: stats.bombs ? { ...stats.bombs } : undefined,
            gold: stats.gold ? [...stats.gold] : undefined,
            units: stats.units ? { ...stats.units } : undefined,
        };
    }
    render() {
        const types = this.availableTypes;
        const modes = this.availableModes;
        const diffs = this.availableDifficulties;
        const leaf = this.getSelectedLeaf();
        const wlr = leaf
            ? leaf.losses === 0n
                ? Number(leaf.wins)
                : Number(leaf.wins) / Number(leaf.losses)
            : 0;
        return html `
      <div class="flex flex-col gap-4">
        <!-- Filters -->
        <div
          class="flex flex-wrap gap-2 items-center justify-between p-2 bg-black/20 rounded-lg border border-white/5"
        >
          <!-- Type selector -->
          <div class="flex gap-1">
            ${types.map((t) => html `
                <button
                  class="text-xs px-3 py-1.5 rounded-md border font-bold uppercase tracking-wider transition-all duration-200 ${this
            .selectedType === t
            ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40"
            : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"}"
                  @click=${() => this.setGameType(t)}
                >
                  ${t === GameType.Public
            ? translateText("player_stats_tree.public")
            : t === GameType.Private
                ? translateText("player_stats_tree.private")
                : translateText("player_stats_tree.solo")}
                </button>
              `)}
          </div>

          <div class="flex gap-2">
            <!-- Mode selector -->
            ${modes.length
            ? html `<div
                  class="flex gap-1 bg-black/20 rounded-md p-1 border border-white/5"
                >
                  ${modes.map((m) => html `
                      <button
                        class="text-xs px-3 py-1 rounded-sm transition-colors ${this
                .selectedMode === m
                ? "bg-white/20 text-white font-bold"
                : "text-gray-400 hover:text-white"}"
                        @click=${() => this.setMode(m)}
                        title=${translateText("player_stats_tree.mode")}
                      >
                        ${this.labelForMode(m)}
                      </button>
                    `)}
                </div>`
            : html ``}

            <!-- Difficulty selector -->
            ${!this.shouldMergeDifficulties && diffs.length
            ? html `<div
                  class="flex gap-1 bg-black/20 rounded-md p-1 border border-white/5"
                >
                  ${diffs.map((d) => html ` <button
                        class="text-xs px-3 py-1 rounded-sm transition-colors ${this
                .selectedDifficulty === d
                ? "bg-white/20 text-white font-bold"
                : "text-gray-400 hover:text-white"}"
                        @click=${() => this.setDifficulty(d)}
                        title=${translateText("difficulty.difficulty")}
                      >
                        ${translateText(`difficulty.${d.toLowerCase()}`)}
                      </button>`)}
                </div>`
            : html ``}
          </div>
        </div>

        ${leaf
            ? html `
              <div class="space-y-6 mt-2">
                <player-stats-grid
                  .titles=${[
                translateText("player_stats_tree.stats_wins"),
                translateText("player_stats_tree.stats_losses"),
                translateText("player_stats_tree.stats_wlr"),
                translateText("player_stats_tree.stats_games_played"),
            ]}
                  .values=${[
                renderNumber(leaf.wins),
                renderNumber(leaf.losses),
                wlr.toFixed(2),
                renderNumber(leaf.total),
            ]}
                ></player-stats-grid>

                <div class="border-t border-white/10 pt-6">
                  <player-stats-table
                    .stats=${leaf?.stats ?? null}
                  ></player-stats-table>
                </div>
              </div>
            `
            : html `
              <div
                class="py-12 text-center text-white/30 italic border border-white/5 rounded-xl bg-white/5"
              >
                ${translateText("player_stats_tree.no_stats")}
              </div>
            `}
      </div>
    `;
    }
};
__decorate([
    property({ type: Object })
], PlayerStatsTreeView.prototype, "statsTree", void 0);
__decorate([
    state()
], PlayerStatsTreeView.prototype, "selectedType", void 0);
__decorate([
    state()
], PlayerStatsTreeView.prototype, "selectedMode", void 0);
__decorate([
    state()
], PlayerStatsTreeView.prototype, "selectedDifficulty", void 0);
PlayerStatsTreeView = __decorate([
    customElement("player-stats-tree-view")
], PlayerStatsTreeView);
export { PlayerStatsTreeView };
//# sourceMappingURL=PlayerStatsTree.js.map