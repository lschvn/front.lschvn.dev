var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { v4 as uuidv4 } from "uuid";
import { translateText } from "../client/Utils";
import { getClanTagOriginalCase, sanitizeClanTag } from "../core/Util";
import { MAX_USERNAME_LENGTH, MIN_USERNAME_LENGTH, validateUsername, } from "../core/validations/username";
import { crazyGamesSDK } from "./CrazyGamesSDK";
const usernameKey = "username";
let UsernameInput = class UsernameInput extends LitElement {
    constructor() {
        super(...arguments);
        this.baseUsername = "";
        this.clanTag = "";
        this.validationError = "";
        this._isValid = true;
    }
    // Remove static styles since we're using Tailwind
    createRenderRoot() {
        // Disable shadow DOM to allow Tailwind classes to work
        return this;
    }
    getCurrentUsername() {
        return this.constructFullUsername();
    }
    constructFullUsername() {
        if (this.clanTag.length >= 2) {
            return `[${this.clanTag}] ${this.baseUsername}`;
        }
        return this.baseUsername;
    }
    connectedCallback() {
        super.connectedCallback();
        const stored = this.getUsername();
        this.parseAndSetUsername(stored);
        crazyGamesSDK.getUsername().then((username) => {
            if (username) {
                this.parseAndSetUsername(username ?? genAnonUsername());
                this.requestUpdate();
            }
        });
        crazyGamesSDK.addAuthListener((user) => {
            if (user) {
                this.parseAndSetUsername(user?.username);
            }
            this.requestUpdate();
        });
    }
    parseAndSetUsername(fullUsername) {
        const tag = getClanTagOriginalCase(fullUsername);
        if (tag) {
            this.clanTag = tag.toUpperCase();
            this.baseUsername = fullUsername.replace(`[${tag}]`, "").trim();
        }
        else {
            this.clanTag = "";
            this.baseUsername = fullUsername;
        }
        this.validateAndStore();
    }
    render() {
        return html `
      <div class="flex items-center w-full h-full gap-2">
        <input
          type="text"
          .value=${this.clanTag}
          @input=${this.handleClanTagChange}
          placeholder="${translateText("username.tag")}"
          maxlength="5"
          class="w-[6rem] text-xl font-bold text-center uppercase shrink-0 bg-transparent text-white placeholder-white/70 focus:placeholder-transparent border-0 border-b border-white/40 focus:outline-none focus:border-white/60"
        />
        <input
          type="text"
          .value=${this.baseUsername}
          @input=${this.handleUsernameChange}
          placeholder="${translateText("username.enter_username")}"
          maxlength="${MAX_USERNAME_LENGTH}"
          class="flex-1 min-w-0 border-0 text-2xl font-bold text-left text-white placeholder-white/70 focus:outline-none focus:ring-0 overflow-x-auto whitespace-nowrap text-ellipsis pr-2 bg-transparent"
        />
      </div>
      ${this.validationError
            ? html `<div
            id="username-validation-error"
            class="absolute top-full left-0 z-50 w-full mt-1 px-3 py-2 text-sm font-medium border border-red-500/50 rounded-lg bg-red-900/90 text-red-200 backdrop-blur-md shadow-lg"
          >
            ${this.validationError}
          </div>`
            : null}
    `;
    }
    handleClanTagChange(e) {
        const input = e.target;
        const originalValue = input.value;
        const val = sanitizeClanTag(originalValue);
        // Only show toast if characters were actually removed (not just uppercased)
        if (originalValue.toUpperCase() !== val) {
            input.value = val;
            // Show toast when invalid characters are removed
            window.dispatchEvent(new CustomEvent("show-message", {
                detail: {
                    message: translateText("username.tag_invalid_chars"),
                    color: "red",
                    duration: 2000,
                },
            }));
        }
        else if (originalValue !== val) {
            // Just update the input without toast if only case changed
            input.value = val;
        }
        this.clanTag = val;
        this.validateAndStore();
    }
    handleUsernameChange(e) {
        const input = e.target;
        const originalValue = input.value;
        const val = originalValue.replace(/[[\]]/g, "");
        if (originalValue !== val) {
            input.value = val;
            // Show toast when brackets are removed
            window.dispatchEvent(new CustomEvent("show-message", {
                detail: {
                    message: translateText("username.invalid_chars"),
                    color: "red",
                    duration: 2000,
                },
            }));
        }
        this.baseUsername = val;
        this.validateAndStore();
    }
    validateAndStore() {
        // Prevent empty username even if clan tag is present
        const trimmedBase = this.baseUsername.trim();
        if (!trimmedBase || trimmedBase.length < MIN_USERNAME_LENGTH) {
            this._isValid = false;
            this.validationError = translateText("username.too_short", {
                min: MIN_USERNAME_LENGTH,
            });
            return;
        }
        // Validate clan tag if present
        if (this.clanTag.length > 0 && this.clanTag.length < 2) {
            this._isValid = false;
            this.validationError = translateText("username.tag_too_short");
            return;
        }
        const full = this.constructFullUsername();
        const trimmedFull = full.trim();
        const result = validateUsername(trimmedFull);
        this._isValid = result.isValid;
        if (result.isValid) {
            this.storeUsername(trimmedFull);
            this.validationError = "";
        }
        else {
            this.validationError = result.error ?? "";
        }
    }
    getUsername() {
        const storedUsername = localStorage.getItem(usernameKey);
        if (storedUsername) {
            return storedUsername;
        }
        return this.generateNewUsername();
    }
    storeUsername(username) {
        if (username) {
            localStorage.setItem(usernameKey, username);
        }
    }
    generateNewUsername() {
        const newUsername = genAnonUsername();
        this.storeUsername(newUsername);
        return newUsername;
    }
    isValid() {
        return this._isValid;
    }
};
__decorate([
    state()
], UsernameInput.prototype, "baseUsername", void 0);
__decorate([
    state()
], UsernameInput.prototype, "clanTag", void 0);
__decorate([
    property({ type: String })
], UsernameInput.prototype, "validationError", void 0);
UsernameInput = __decorate([
    customElement("username-input")
], UsernameInput);
export { UsernameInput };
export function genAnonUsername() {
    const uuid = uuidv4();
    const cleanUuid = uuid.replace(/-/g, "").toLowerCase();
    const decimal = BigInt(`0x${cleanUuid}`);
    const threeDigits = decimal % 1000n;
    return "Anon" + threeDigits.toString().padStart(3, "0");
}
//# sourceMappingURL=UsernameInput.js.map