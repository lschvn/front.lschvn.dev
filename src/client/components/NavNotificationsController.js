import version from "resources/version.txt?raw";
import { getCosmeticsHash } from "../Cosmetics";
import { getGamesPlayed } from "../Utils";
const HELP_SEEN_KEY = "helpSeen";
const STORE_SEEN_HASH_KEY = "storeSeenHash";
const NEWS_SEEN_VERSION_KEY = "newsSeenVersion";
export class NavNotificationsController {
    get normalizedVersion() {
        const trimmed = version.trim();
        return trimmed.startsWith("v") ? trimmed : `v${trimmed}`;
    }
    constructor(host) {
        this._helpSeen = localStorage.getItem(HELP_SEEN_KEY) === "true";
        this._hasNewCosmetics = false;
        this._hasNewVersion = false;
        this.onNewsClick = () => {
            this._hasNewVersion = false;
            localStorage.setItem(NEWS_SEEN_VERSION_KEY, this.normalizedVersion);
            this.host.requestUpdate();
        };
        this.onStoreClick = () => {
            this._hasNewCosmetics = false;
            getCosmeticsHash()
                .then((hash) => {
                if (hash !== null) {
                    localStorage.setItem(STORE_SEEN_HASH_KEY, hash);
                }
            })
                .catch(() => { });
            this.host.requestUpdate();
        };
        this.onHelpClick = () => {
            localStorage.setItem(HELP_SEEN_KEY, "true");
            this._helpSeen = true;
            this.host.requestUpdate();
        };
        this.host = host;
        host.addController(this);
    }
    hostConnected() {
        // Check if cosmetics have changed
        getCosmeticsHash()
            .then((hash) => {
            const seenHash = localStorage.getItem(STORE_SEEN_HASH_KEY);
            this._hasNewCosmetics = hash !== null && hash !== seenHash;
            this.host.requestUpdate();
        })
            .catch(() => { });
        // Check if version has changed
        const currentVersion = this.normalizedVersion;
        const seenVersion = localStorage.getItem(NEWS_SEEN_VERSION_KEY);
        this._hasNewVersion =
            seenVersion !== null && seenVersion !== currentVersion;
        if (seenVersion === null) {
            localStorage.setItem(NEWS_SEEN_VERSION_KEY, currentVersion);
        }
    }
    hostDisconnected() { }
    // Only show one dot at a time to prevent
    // overwhelming users. Priority: News > Store > Help.
    showNewsDot() {
        return this._hasNewVersion;
    }
    showStoreDot() {
        return this._hasNewCosmetics && !this.showNewsDot();
    }
    showHelpDot() {
        return (getGamesPlayed() < 10 &&
            !this._helpSeen &&
            !this.showNewsDot() &&
            !this.showStoreDot());
    }
}
//# sourceMappingURL=NavNotificationsController.js.map