var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { attackModeTroopCommitment } from "../../../core/configuration/AttackModeBalance";
import { MessageType, PlayerType, UnitType, } from "../../../core/game/Game";
import { GameUpdateType, } from "../../../core/game/GameUpdates";
import { PlayerView } from "../../../core/game/GameView";
import { CancelAttackIntentEvent, CancelBoatIntentEvent, SendAttackIntentEvent, } from "../../Transport";
import { renderTroops, translateText } from "../../Utils";
import { getColoredSprite } from "../SpriteLoader";
import { GoToPlayerEvent, GoToPositionEvent, GoToUnitEvent, } from "./Leaderboard";
import swordIcon from "/images/SwordIcon.svg?url";
let AttacksDisplay = class AttacksDisplay extends LitElement {
    constructor() {
        super(...arguments);
        this.active = false;
        this.incomingBoatIDs = new Set();
        this.spriteDataURLCache = new Map();
        this._isVisible = false;
        this.incomingAttacks = [];
        this.outgoingAttacks = [];
        this.outgoingLandAttacks = [];
        this.outgoingBoats = [];
        this.incomingBoats = [];
    }
    createRenderRoot() {
        return this;
    }
    init() { }
    tick() {
        this.active = true;
        if (!this._isVisible && !this.game.inSpawnPhase()) {
            this._isVisible = true;
        }
        const myPlayer = this.game.myPlayer();
        if (!myPlayer || !myPlayer.isAlive()) {
            if (this._isVisible) {
                this._isVisible = false;
            }
            return;
        }
        // Track incoming boat unit IDs from UnitIncoming events
        const updates = this.game.updatesSinceLastTick();
        if (updates) {
            for (const event of updates[GameUpdateType.UnitIncoming]) {
                if (event.playerID === myPlayer.smallID() &&
                    event.messageType === MessageType.NAVAL_INVASION_INBOUND) {
                    this.incomingBoatIDs.add(event.unitID);
                }
            }
        }
        // Resolve incoming boats from tracked IDs, remove inactive ones
        const resolvedIncomingBoats = [];
        for (const unitID of this.incomingBoatIDs) {
            const unit = this.game.unit(unitID);
            if (unit && unit.isActive() && unit.type() === UnitType.TransportShip) {
                resolvedIncomingBoats.push(unit);
            }
            else {
                this.incomingBoatIDs.delete(unitID);
            }
        }
        this.incomingBoats = resolvedIncomingBoats;
        this.incomingAttacks = myPlayer.incomingAttacks().filter((a) => {
            const t = this.game.playerBySmallID(a.attackerID).type();
            return t !== PlayerType.Bot;
        });
        this.outgoingAttacks = myPlayer
            .outgoingAttacks()
            .filter((a) => a.targetID !== 0);
        this.outgoingLandAttacks = myPlayer
            .outgoingAttacks()
            .filter((a) => a.targetID === 0);
        this.outgoingBoats = myPlayer
            .units()
            .filter((u) => u.type() === UnitType.TransportShip);
        this.requestUpdate();
    }
    shouldTransform() {
        return false;
    }
    renderLayer() { }
    renderButton(options) {
        const { content, onClick, className = "", disabled = false, translate = true, hidden = false, } = options;
        if (hidden) {
            return html ``;
        }
        return html `
      <button
        class="${className}"
        @click=${onClick}
        ?disabled=${disabled}
        ?translate=${translate}
      >
        ${content}
      </button>
    `;
    }
    emitCancelAttackIntent(id) {
        const myPlayer = this.game.myPlayer();
        if (!myPlayer)
            return;
        this.eventBus.emit(new CancelAttackIntentEvent(id));
    }
    emitBoatCancelIntent(id) {
        const myPlayer = this.game.myPlayer();
        if (!myPlayer)
            return;
        this.eventBus.emit(new CancelBoatIntentEvent(id));
    }
    emitGoToPlayerEvent(attackerID) {
        const attacker = this.game.playerBySmallID(attackerID);
        this.eventBus.emit(new GoToPlayerEvent(attacker));
    }
    getBoatSpriteDataURL(unit) {
        const owner = unit.owner();
        const key = `boat-${owner.id()}`;
        const cached = this.spriteDataURLCache.get(key);
        if (cached)
            return cached;
        try {
            const canvas = getColoredSprite(unit, this.game.config().theme());
            const dataURL = canvas.toDataURL();
            this.spriteDataURLCache.set(key, dataURL);
            return dataURL;
        }
        catch {
            return "";
        }
    }
    async attackWarningOnClick(attack) {
        const playerView = this.game.playerBySmallID(attack.attackerID);
        if (playerView !== undefined) {
            if (playerView instanceof PlayerView) {
                const averagePosition = await playerView.attackAveragePosition(attack.attackerID, attack.id);
                if (averagePosition === null) {
                    this.emitGoToPlayerEvent(attack.attackerID);
                }
                else {
                    this.eventBus.emit(new GoToPositionEvent(averagePosition.x, averagePosition.y));
                }
            }
        }
        else {
            this.emitGoToPlayerEvent(attack.attackerID);
        }
    }
    handleRetaliate(attack) {
        const attacker = this.game.playerBySmallID(attack.attackerID);
        if (!attacker)
            return;
        const myPlayer = this.game.myPlayer();
        if (!myPlayer)
            return;
        const counterTroops = Math.min(attack.troops, attackModeTroopCommitment(myPlayer.troops(), this.uiState.attackRatio, this.uiState.attackMode));
        this.eventBus.emit(new SendAttackIntentEvent(attacker.id(), counterTroops, this.uiState.attackMode));
    }
    renderAttackMode(mode) {
        return html `<span
      class="rounded bg-white/10 px-1 py-0.5 text-[9px] font-bold tracking-wide text-white/80"
      >${mode}</span
    >`;
    }
    renderIncomingAttacks() {
        if (this.incomingAttacks.length === 0)
            return html ``;
        return this.incomingAttacks.map((attack) => html `
        <div
          class="flex items-center gap-0.5 w-full bg-gray-800/70 backdrop-blur-xs sm:rounded-lg px-1.5 py-0.5 overflow-hidden"
        >
          ${this.renderButton({
            content: html `<img
                src="${swordIcon}"
                class="h-4 w-4 inline-block"
                style="filter: brightness(0) saturate(100%) invert(27%) sepia(91%) saturate(4551%) hue-rotate(348deg) brightness(89%) contrast(97%)"
              />
              <span class="inline-block min-w-[3rem] text-right"
                >${renderTroops(attack.troops)}</span
              >
              <span class="truncate ml-1"
                >${this.game.playerBySmallID(attack.attackerID)?.name()}</span
              >
              ${this.renderAttackMode(attack.mode)}
              ${attack.retreating
                ? `(${translateText("events_display.retreating")}...)`
                : ""} `,
            onClick: () => this.attackWarningOnClick(attack),
            className: "text-left text-red-400 inline-flex items-center gap-0.5 lg:gap-1 min-w-0",
            translate: false,
        })}
          ${!attack.retreating
            ? this.renderButton({
                content: html `<img
                  src="${swordIcon}"
                  class="h-4 w-4"
                  style="filter: brightness(0) saturate(100%) invert(27%) sepia(91%) saturate(4551%) hue-rotate(348deg) brightness(89%) contrast(97%)"
                />`,
                onClick: () => this.handleRetaliate(attack),
                className: "ml-auto inline-flex items-center justify-center cursor-pointer bg-red-900/50 hover:bg-red-800/70 sm:rounded-lg px-1.5 py-1 border border-red-700/50",
                translate: false,
            })
            : ""}
        </div>
      `);
    }
    renderOutgoingAttacks() {
        if (this.outgoingAttacks.length === 0)
            return html ``;
        return this.outgoingAttacks.map((attack) => html `
        <div
          class="flex items-center gap-0.5 w-full bg-gray-800/70 backdrop-blur-xs sm:rounded-lg px-1.5 py-0.5 overflow-hidden"
        >
          ${this.renderButton({
            content: html `<img
                src="${swordIcon}"
                class="h-4 w-4 inline-block"
                style="filter: invert(1)"
              />
              <span class="inline-block min-w-[3rem] text-right"
                >${renderTroops(attack.troops)}</span
              >
              <span class="truncate ml-1"
                >${this.game.playerBySmallID(attack.targetID)?.name()}</span
              >
              ${this.renderAttackMode(attack.mode)} `,
            onClick: async () => this.attackWarningOnClick(attack),
            className: "text-left text-blue-400 inline-flex items-center gap-0.5 lg:gap-1 min-w-0",
            translate: false,
        })}
          ${!attack.retreating
            ? this.renderButton({
                content: "❌",
                onClick: () => this.emitCancelAttackIntent(attack.id),
                className: "ml-auto text-left shrink-0",
                disabled: attack.retreating,
            })
            : html `<span class="ml-auto truncate text-blue-400"
                >(${translateText("events_display.retreating")}...)</span
              >`}
        </div>
      `);
    }
    renderOutgoingLandAttacks() {
        if (this.outgoingLandAttacks.length === 0)
            return html ``;
        return this.outgoingLandAttacks.map((landAttack) => html `
        <div
          class="flex items-center gap-0.5 w-full bg-gray-800/70 backdrop-blur-xs sm:rounded-lg px-1.5 py-0.5 overflow-hidden"
        >
          ${this.renderButton({
            content: html `<img
                src="${swordIcon}"
                class="h-4 w-4 inline-block"
                style="filter: invert(1)"
              />
              <span class="inline-block min-w-[3rem] text-right"
                >${renderTroops(landAttack.troops)}</span
              >
              ${translateText("help_modal.ui_wilderness")}
              ${this.renderAttackMode(landAttack.mode)}`,
            className: "text-left text-gray-400 inline-flex items-center gap-0.5 lg:gap-1 min-w-0",
            translate: false,
        })}
          ${!landAttack.retreating
            ? this.renderButton({
                content: "❌",
                onClick: () => this.emitCancelAttackIntent(landAttack.id),
                className: "ml-auto text-left shrink-0",
                disabled: landAttack.retreating,
            })
            : html `<span class="ml-auto truncate text-blue-400"
                >(${translateText("events_display.retreating")}...)</span
              >`}
        </div>
      `);
    }
    getBoatTargetName(boat) {
        const target = boat.targetTile();
        if (target === undefined)
            return "";
        const ownerID = this.game.ownerID(target);
        if (ownerID === 0)
            return "";
        const player = this.game.playerBySmallID(ownerID);
        return player?.name() ?? "";
    }
    renderBoatIcon(boat) {
        const dataURL = this.getBoatSpriteDataURL(boat);
        if (!dataURL)
            return html ``;
        return html `<img
      src="${dataURL}"
      class="h-5 w-5 inline-block"
      style="image-rendering: pixelated"
    />`;
    }
    renderBoats() {
        if (this.outgoingBoats.length === 0)
            return html ``;
        return this.outgoingBoats.map((boat) => html `
        <div
          class="flex items-center gap-0.5 w-full bg-gray-800/70 backdrop-blur-xs sm:rounded-lg px-1.5 py-0.5 overflow-hidden"
        >
          ${this.renderButton({
            content: html `${this.renderBoatIcon(boat)}
              <span class="inline-block min-w-[3rem] text-right"
                >${renderTroops(boat.troops())}</span
              >
              <span class="truncate text-xs ml-1"
                >${this.getBoatTargetName(boat)}</span
              >`,
            onClick: () => this.eventBus.emit(new GoToUnitEvent(boat)),
            className: "text-left text-blue-400 inline-flex items-center gap-0.5 lg:gap-1 min-w-0",
            translate: false,
        })}
          ${!boat.retreating()
            ? this.renderButton({
                content: "❌",
                onClick: () => this.emitBoatCancelIntent(boat.id()),
                className: "ml-auto text-left shrink-0",
                disabled: boat.retreating(),
            })
            : html `<span class="ml-auto truncate text-blue-400"
                >(${translateText("events_display.retreating")}...)</span
              >`}
        </div>
      `);
    }
    renderIncomingBoats() {
        if (this.incomingBoats.length === 0)
            return html ``;
        return this.incomingBoats.map((boat) => html `
        <div
          class="flex items-center gap-0.5 w-full bg-gray-800/70 backdrop-blur-xs sm:rounded-lg px-1.5 py-0.5 overflow-hidden"
        >
          ${this.renderButton({
            content: html `${this.renderBoatIcon(boat)}
              <span class="inline-block min-w-[3rem] text-right"
                >${renderTroops(boat.troops())}</span
              >
              <span class="truncate text-xs ml-1"
                >${boat.owner()?.name()}</span
              >`,
            onClick: () => this.eventBus.emit(new GoToUnitEvent(boat)),
            className: "text-left text-red-400 inline-flex items-center gap-0.5 lg:gap-1 min-w-0",
            translate: false,
        })}
        </div>
      `);
    }
    render() {
        if (!this.active || !this._isVisible) {
            return html ``;
        }
        const hasAnything = this.outgoingAttacks.length > 0 ||
            this.outgoingLandAttacks.length > 0 ||
            this.outgoingBoats.length > 0 ||
            this.incomingAttacks.length > 0 ||
            this.incomingBoats.length > 0;
        if (!hasAnything) {
            return html ``;
        }
        return html `
      <div
        class="w-full mb-1 mt-1 sm:mt-0 pointer-events-auto grid grid-cols-2 gap-1 text-white text-sm lg:text-base"
      >
        ${this.renderOutgoingAttacks()} ${this.renderOutgoingLandAttacks()}
        ${this.renderBoats()} ${this.renderIncomingAttacks()}
        ${this.renderIncomingBoats()}
      </div>
    `;
    }
};
__decorate([
    state()
], AttacksDisplay.prototype, "_isVisible", void 0);
__decorate([
    state()
], AttacksDisplay.prototype, "incomingAttacks", void 0);
__decorate([
    state()
], AttacksDisplay.prototype, "outgoingAttacks", void 0);
__decorate([
    state()
], AttacksDisplay.prototype, "outgoingLandAttacks", void 0);
__decorate([
    state()
], AttacksDisplay.prototype, "outgoingBoats", void 0);
__decorate([
    state()
], AttacksDisplay.prototype, "incomingBoats", void 0);
AttacksDisplay = __decorate([
    customElement("attacks-display")
], AttacksDisplay);
export { AttacksDisplay };
//# sourceMappingURL=AttacksDisplay.js.map