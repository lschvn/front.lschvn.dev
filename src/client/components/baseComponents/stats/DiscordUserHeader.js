var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { getDiscordAvatarUrl, translateText } from "../../../Utils";
let DiscordUserHeader = class DiscordUserHeader extends LitElement {
    constructor() {
        super(...arguments);
        this._data = null;
    }
    createRenderRoot() {
        return this;
    }
    get data() {
        return this._data;
    }
    set data(v) {
        this._data = v;
        this.requestUpdate();
    }
    get avatarUrl() {
        const u = this._data;
        if (!u)
            return null;
        return getDiscordAvatarUrl(u);
    }
    get discordDisplayName() {
        return this._data?.username ?? "";
    }
    render() {
        return html `
      <div class="flex items-center gap-2">
        ${this.avatarUrl
            ? html `
              <div class="p-[3px] rounded-full bg-gray-500">
                <img
                  class="w-12 h-12 rounded-full block"
                  src="${this.avatarUrl}"
                  alt="${translateText("discord_user_header.avatar_alt")}"
                />
              </div>
            `
            : null}
        <span class="font-semibold text-white">${this.discordDisplayName}</span>
      </div>
    `;
    }
};
__decorate([
    state()
], DiscordUserHeader.prototype, "_data", void 0);
__decorate([
    property({ attribute: false })
], DiscordUserHeader.prototype, "data", null);
DiscordUserHeader = __decorate([
    customElement("discord-user-header")
], DiscordUserHeader);
export { DiscordUserHeader };
//# sourceMappingURL=DiscordUserHeader.js.map