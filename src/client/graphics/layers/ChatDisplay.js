var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { MessageType } from "../../../core/game/Game";
import { GameUpdateType, } from "../../../core/game/GameUpdates";
import { onlyImages } from "../../../core/Util";
let ChatDisplay = class ChatDisplay extends LitElement {
    constructor() {
        super(...arguments);
        this.active = false;
        this._hidden = false;
        this.newEvents = 0;
        this.chatEvents = [];
    }
    toggleHidden() {
        this._hidden = !this._hidden;
        if (this._hidden) {
            this.newEvents = 0;
        }
        this.requestUpdate();
    }
    addEvent(event) {
        this.chatEvents = [...this.chatEvents, event];
        if (this._hidden) {
            this.newEvents++;
        }
        this.requestUpdate();
    }
    removeEvent(index) {
        this.chatEvents = [
            ...this.chatEvents.slice(0, index),
            ...this.chatEvents.slice(index + 1),
        ];
    }
    onDisplayMessageEvent(event) {
        if (event.messageType !== MessageType.CHAT)
            return;
        const myPlayer = this.game.myPlayer();
        if (event.playerID !== null &&
            (!myPlayer || myPlayer.smallID() !== event.playerID)) {
            return;
        }
        this.addEvent({
            description: event.message,
            createdAt: this.game.ticks(),
            highlight: true,
            unsafeDescription: true,
        });
    }
    init() { }
    tick() {
        // this.active = true;
        const updates = this.game.updatesSinceLastTick();
        if (updates === null)
            return;
        const messages = updates[GameUpdateType.DisplayEvent];
        if (messages) {
            for (const msg of messages) {
                if (msg.messageType === MessageType.CHAT) {
                    const myPlayer = this.game.myPlayer();
                    if (msg.playerID !== null &&
                        (!myPlayer || myPlayer.smallID() !== msg.playerID)) {
                        continue;
                    }
                    this.chatEvents = [
                        ...this.chatEvents,
                        {
                            description: msg.message,
                            unsafeDescription: true,
                            createdAt: this.game.ticks(),
                        },
                    ];
                }
            }
        }
        if (this.chatEvents.length > 100) {
            this.chatEvents = this.chatEvents.slice(-100);
        }
        this.requestUpdate();
    }
    getChatContent(chat) {
        return chat.unsafeDescription
            ? unsafeHTML(onlyImages(chat.description))
            : chat.description;
    }
    render() {
        if (!this.active) {
            return html ``;
        }
        return html `
      <div
        class="pointer-events-auto ${this._hidden
            ? "w-fit px-2.5 py-1.25"
            : ""} rounded-md bg-black/60 relative max-h-[30vh] flex flex-col-reverse overflow-y-auto w-full lg:bottom-2.5 lg:right-2.5 z-50 lg:max-w-[30vw] lg:w-full lg:w-auto"
      >
        <div>
          <div class="w-full bg-black/80 sticky top-0 px-2.5">
            <button
              class="text-white cursor-pointer pointer-events-auto ${this
            ._hidden
            ? "hidden"
            : ""}"
              @click=${this.toggleHidden}
            >
              Hide
            </button>
          </div>

          <button
            class="text-white cursor-pointer pointer-events-auto ${this._hidden
            ? ""
            : "hidden"}"
            @click=${this.toggleHidden}
          >
            Chat
            <span
              class="${this.newEvents
            ? ""
            : "hidden"} inline-block px-2 bg-red-500 rounded-xs"
              >${this.newEvents}</span
            >
          </button>

          <table
            class="w-full border-collapse text-white shadow-lg lg:text-xl text-xs pointer-events-none ${this
            ._hidden
            ? "hidden"
            : ""}"
          >
            <tbody>
              ${this.chatEvents.map((chat) => html `
                  <tr class="border-b border-gray-200/0">
                    <td class="lg:p-3 p-1 text-left">
                      ${this.getChatContent(chat)}
                    </td>
                  </tr>
                `)}
            </tbody>
          </table>
        </div>
      </div>
    `;
    }
    createRenderRoot() {
        return this;
    }
};
__decorate([
    state()
], ChatDisplay.prototype, "_hidden", void 0);
__decorate([
    state()
], ChatDisplay.prototype, "newEvents", void 0);
__decorate([
    state()
], ChatDisplay.prototype, "chatEvents", void 0);
ChatDisplay = __decorate([
    customElement("chat-display")
], ChatDisplay);
export { ChatDisplay };
//# sourceMappingURL=ChatDisplay.js.map