var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html } from "lit";
import { customElement, query } from "lit/decorators.js";
import { PlayerType } from "../../../core/game/Game";
import quickChatData from "resources/QuickChat.json" with { type: "json" };
import { CloseViewEvent } from "../../InputHandler";
import { SendQuickChatEvent } from "../../Transport";
import { translateText } from "../../Utils";
export const quickChatPhrases = quickChatData;
let ChatModal = class ChatModal extends LitElement {
    constructor() {
        super(...arguments);
        this.players = [];
        this.playerSearchQuery = "";
        this.previewText = null;
        this.requiresPlayerSelection = false;
        this.selectedCategory = null;
        this.selectedPhraseText = null;
        this.selectedPhraseTemplate = null;
        this.selectedQuickChatKey = null;
        this.selectedPlayer = null;
        this.quickChatPhrases = {
            help: [{ text: "Please give me troops!", requiresPlayer: false }],
            attack: [{ text: "Attack [P1]!", requiresPlayer: true }],
            defend: [{ text: "Defend [P1]!", requiresPlayer: true }],
            greet: [{ text: "Hello!", requiresPlayer: false }],
            misc: [{ text: "Let's go!", requiresPlayer: false }],
        };
        this.categories = [
            { id: "help" },
            { id: "attack" },
            { id: "defend" },
            { id: "greet" },
            { id: "misc" },
            { id: "warnings" },
        ];
    }
    createRenderRoot() {
        return this;
    }
    getPhrasesForCategory(categoryId) {
        return quickChatPhrases[categoryId] ?? [];
    }
    render() {
        return html `
      <o-modal title="${translateText("chat.title")}">
        <div class="chat-columns">
          <div class="chat-column">
            <div class="column-title">${translateText("chat.category")}</div>
            ${this.categories.map((category) => html `
                <button
                  class="chat-option-button ${this.selectedCategory ===
            category.id
            ? "selected"
            : ""}"
                  @click=${() => this.selectCategory(category.id)}
                >
                  ${translateText(`chat.cat.${category.id}`)}
                </button>
              `)}
          </div>

          ${this.selectedCategory
            ? html `
                <div class="chat-column">
                  <div class="column-title">
                    ${translateText("chat.phrase")}
                  </div>
                  <div class="phrase-scroll-area">
                    ${this.getPhrasesForCategory(this.selectedCategory).map((phrase) => html `
                        <button
                          class="chat-option-button ${this
                .selectedPhraseText ===
                translateText(`chat.${this.selectedCategory}.${phrase.key}`)
                ? "selected"
                : ""}"
                          @click=${() => this.selectPhrase(phrase)}
                        >
                          ${this.renderPhrasePreview(phrase)}
                        </button>
                      `)}
                  </div>
                </div>
              `
            : null}
          ${this.requiresPlayerSelection || this.selectedPlayer
            ? html `
                <div class="chat-column">
                  <div class="column-title">
                    ${translateText("chat.player")}
                  </div>

                  <input
                    class="player-search-input"
                    type="text"
                    placeholder="${translateText("chat.search")}"
                    .value=${this.playerSearchQuery}
                    @input=${this.onPlayerSearchInput}
                  />

                  <div class="player-scroll-area">
                    ${this.getSortedFilteredPlayers().map((player) => html `
                        <button
                          class="chat-option-button ${this.selectedPlayer ===
                player
                ? "selected"
                : ""}"
                          style="border: 2px solid ${player
                .territoryColor()
                .toHex()};"
                          @click=${() => this.selectPlayer(player)}
                        >
                          ${player.name()}
                        </button>
                      `)}
                  </div>
                </div>
              `
            : null}
        </div>

        <div class="chat-preview">
          ${this.previewText
            ? translateText(this.previewText)
            : translateText("chat.build")}
        </div>
        <div class="chat-send">
          <button
            class="chat-send-button"
            @click=${this.sendChatMessage}
            ?disabled=${!this.previewText ||
            (this.requiresPlayerSelection && !this.selectedPlayer)}
          >
            ${translateText("chat.send")}
          </button>
        </div>
      </o-modal>
    `;
    }
    initEventBus(eventBus) {
        this.eventBus = eventBus;
        eventBus.on(CloseViewEvent, (e) => {
            if (!this.hidden) {
                this.close();
            }
        });
    }
    selectCategory(categoryId) {
        this.selectedCategory = categoryId;
        this.selectedPhraseText = null;
        this.previewText = null;
        this.requiresPlayerSelection = false;
        this.requestUpdate();
    }
    selectPhrase(phrase) {
        this.selectedQuickChatKey = this.getFullQuickChatKey(this.selectedCategory, phrase.key);
        this.selectedPhraseTemplate = translateText(`chat.${this.selectedCategory}.${phrase.key}`);
        this.selectedPhraseText = translateText(`chat.${this.selectedCategory}.${phrase.key}`);
        this.previewText = `chat.${this.selectedCategory}.${phrase.key}`;
        this.requiresPlayerSelection = phrase.requiresPlayer;
        this.requestUpdate();
    }
    renderPhrasePreview(phrase) {
        return translateText(`chat.${this.selectedCategory}.${phrase.key}`);
    }
    selectPlayer(player) {
        if (this.previewText) {
            this.previewText =
                this.selectedPhraseTemplate?.replace("[P1]", player.name()) ?? null;
            this.selectedPlayer = player;
            this.requiresPlayerSelection = false;
            this.requestUpdate();
        }
    }
    sendChatMessage() {
        console.log("Sent message:", this.previewText);
        console.log("Sender:", this.sender);
        console.log("Recipient:", this.recipient);
        console.log("Key:", this.selectedQuickChatKey);
        if (this.sender && this.recipient && this.selectedQuickChatKey) {
            this.eventBus.emit(new SendQuickChatEvent(this.recipient, this.selectedQuickChatKey, this.selectedPlayer?.id()));
        }
        this.previewText = null;
        this.selectedCategory = null;
        this.requiresPlayerSelection = false;
        this.close();
        this.requestUpdate();
    }
    onPlayerSearchInput(e) {
        const target = e.target;
        this.playerSearchQuery = target.value.toLowerCase();
        this.requestUpdate();
    }
    getSortedFilteredPlayers() {
        const sorted = [...this.players].sort((a, b) => a.name().localeCompare(b.name()));
        const filtered = sorted.filter((p) => p.name().toLowerCase().includes(this.playerSearchQuery));
        const others = sorted.filter((p) => !p.name().toLowerCase().includes(this.playerSearchQuery));
        return [...filtered, ...others];
    }
    getFullQuickChatKey(category, phraseKey) {
        return `${category}.${phraseKey}`;
    }
    open(sender, recipient) {
        if (sender && recipient) {
            console.log("Sent message:", recipient);
            console.log("Sent message:", sender);
            this.players = this.g
                .players()
                .filter((p) => p.isAlive() && p.data.playerType !== PlayerType.Bot);
            this.recipient = recipient;
            this.sender = sender;
        }
        this.requestUpdate();
        this.modalEl?.open();
    }
    close() {
        this.selectedCategory = null;
        this.selectedPhraseText = null;
        this.previewText = null;
        this.requiresPlayerSelection = false;
        this.modalEl?.close();
    }
    setRecipient(value) {
        this.recipient = value;
    }
    setSender(value) {
        this.sender = value;
    }
    openWithSelection(categoryId, phraseKey, sender, recipient) {
        if (sender && recipient) {
            this.players = this.g
                .players()
                .filter((p) => p.isAlive() && p.data.playerType !== PlayerType.Bot);
            this.recipient = recipient;
            this.sender = sender;
        }
        this.selectCategory(categoryId);
        const phrase = this.getPhrasesForCategory(categoryId).find((p) => p.key === phraseKey);
        if (phrase) {
            this.selectPhrase(phrase);
        }
        this.requestUpdate();
        this.modalEl?.open();
    }
};
__decorate([
    query("o-modal")
], ChatModal.prototype, "modalEl", void 0);
ChatModal = __decorate([
    customElement("chat-modal")
], ChatModal);
export { ChatModal };
//# sourceMappingURL=ChatModal.js.map