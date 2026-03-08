import version from "resources/version.txt?raw";
import { EventBus } from "../core/EventBus";
import { GAME_ID_REGEX, } from "../core/Schemas";
import { GameEnv } from "../core/configuration/Config";
import { getServerConfigFromClient } from "../core/configuration/ConfigLoader";
import { GameType } from "../core/game/Game";
import { UserSettings } from "../core/game/UserSettings";
import "./AccountModal";
import { getUserMe } from "./Api";
import { userAuth } from "./Auth";
import { joinLobby } from "./ClientGameRunner";
import { getPlayerCosmeticsRefs } from "./Cosmetics";
import { crazyGamesSDK } from "./CrazyGamesSDK";
import "./FlagInput";
import "./FlagInputModal";
import { FlagInputModal } from "./FlagInputModal";
import { GameInfoModal } from "./GameInfoModal";
import "./GameModeSelector";
import { GameStartingModal } from "./GameStartingModal";
import "./GoogleAdElement";
import { GutterAds } from "./GutterAds";
import { HelpModal } from "./HelpModal";
import { HostLobbyModal as HostPrivateLobbyModal } from "./HostLobbyModal";
import { JoinLobbyModal } from "./JoinLobbyModal";
import "./LangSelector";
import { initLayout } from "./Layout";
import "./LeaderboardModal";
import "./Matchmaking";
import { MatchmakingModal } from "./Matchmaking";
import { initNavigation } from "./Navigation";
import "./NewsModal";
import "./PatternInput";
import "./SinglePlayerModal";
import { TerritoryPatternsModal } from "./TerritoryPatternsModal";
import { TokenLoginModal } from "./TokenLoginModal";
import { SendKickPlayerIntentEvent, SendUpdateGameConfigIntentEvent, } from "./Transport";
import { UserSettingModal } from "./UserSettingModal";
import "./UsernameInput";
import { genAnonUsername } from "./UsernameInput";
import { getDiscordAvatarUrl, incrementGamesPlayed, isInIframe, translateText, } from "./Utils";
import "./components/DesktopNavBar";
import "./components/Footer";
import "./components/MainLayout";
import "./components/MobileNavBar";
import "./components/PlayPage";
import "./components/RankedModal";
import "./components/baseComponents/Button";
import "./components/baseComponents/Modal";
import "./styles.css";
import "./styles/core/typography.css";
import "./styles/core/variables.css";
import "./styles/layout/container.css";
import "./styles/layout/header.css";
import "./styles/modal/chat.css";
function updateAccountNavButton(userMeResponse) {
    const button = document.getElementById("nav-account-button");
    if (!button)
        return;
    const avatarEl = document.getElementById("nav-account-avatar");
    const personIconEl = document.getElementById("nav-account-person-icon");
    const emailBadgeEl = document.getElementById("nav-account-email-badge");
    const signInTextEl = document.getElementById("nav-account-signin-text");
    // Unique token for this update call
    const navToken = Symbol();
    if (avatarEl)
        avatarEl._navToken = navToken;
    const showAvatar = (src, alt) => {
        if (avatarEl) {
            avatarEl.alt = alt ?? translateText("main.discord_avatar_alt");
            // If the avatar fails to load (bad URL / CDN issue / offline), fall back
            // to the default sign-in UI instead of leaving a broken image.
            avatarEl.onerror = () => {
                // Only handle if this is the latest update
                if (avatarEl._navToken !== navToken)
                    return;
                avatarEl.src = "";
                // If the user is still logged in via email, show the email badge state.
                const email = userMeResponse !== false ? userMeResponse.user.email : undefined;
                if (email) {
                    showEmailLoggedIn();
                }
                else {
                    showSignIn();
                }
            };
            avatarEl.onload = () => {
                // Only handle if this is the latest update
                if (avatarEl._navToken !== navToken)
                    return;
                // Clear error handler after a successful load.
                avatarEl.onerror = null;
            };
            avatarEl.src = src;
            avatarEl.classList.remove("hidden");
        }
        personIconEl?.classList.add("hidden");
        emailBadgeEl?.classList.add("hidden");
        signInTextEl?.classList.add("hidden");
        button?.classList.remove("border", "border-white/20");
    };
    const showSignIn = () => {
        avatarEl?.classList.add("hidden");
        personIconEl?.classList.remove("hidden");
        emailBadgeEl?.classList.add("hidden");
        signInTextEl?.classList.remove("hidden");
        // Restore border when showing signin state
        button?.classList.add("border", "border-white/20");
    };
    const showEmailLoggedIn = () => {
        avatarEl?.classList.add("hidden");
        personIconEl?.classList.remove("hidden");
        emailBadgeEl?.classList.remove("hidden");
        signInTextEl?.classList.add("hidden");
        button?.classList.add("border", "border-white/20");
    };
    const discord = userMeResponse !== false ? userMeResponse.user.discord : undefined;
    if (discord && avatarEl) {
        const avatarAlt = translateText("main.user_avatar_alt", {
            username: discord.username,
        });
        const url = getDiscordAvatarUrl(discord);
        if (url) {
            showAvatar(url, avatarAlt);
            return;
        }
    }
    const email = userMeResponse !== false ? userMeResponse.user.email : undefined;
    if (email) {
        showEmailLoggedIn();
        return;
    }
    showSignIn();
}
class Client {
    constructor() {
        this.gameStop = null;
        this.eventBus = new EventBus();
        this.currentUrl = null;
        this.usernameInput = null;
        this.flagInput = null;
        this.userSettings = new UserSettings();
        this.turnstileTokenPromise = null;
    }
    async initialize() {
        crazyGamesSDK.maybeInit();
        // Prefetch turnstile token so it is available when
        // the user joins a lobby.
        this.turnstileTokenPromise = getTurnstileToken();
        // Wait for components to render before setting version
        await customElements.whenDefined("mobile-nav-bar");
        await customElements.whenDefined("desktop-nav-bar");
        const versionElements = document.querySelectorAll("#game-version, .game-version-display");
        if (versionElements.length === 0) {
            console.warn("Game version element not found");
        }
        else {
            const trimmed = version.trim();
            const displayVersion = trimmed.startsWith("v") ? trimmed : `v${trimmed}`;
            versionElements.forEach((el) => {
                el.textContent = displayVersion;
            });
        }
        const langSelector = document.querySelector("lang-selector");
        if (!langSelector) {
            console.warn("Lang selector element not found");
        }
        this.flagInput = document.querySelector("flag-input");
        if (!this.flagInput) {
            console.warn("Flag input element not found");
        }
        this.usernameInput = document.querySelector("username-input");
        if (!this.usernameInput) {
            console.warn("Username input element not found");
        }
        this.gameModeSelector = document.querySelector("game-mode-selector");
        window.addEventListener("beforeunload", async () => {
            console.log("Browser is closing");
            if (this.gameStop !== null) {
                this.gameStop(true);
                await crazyGamesSDK.gameplayStop();
            }
        });
        const gutterAds = document.querySelector("gutter-ads");
        if (!(gutterAds instanceof GutterAds))
            throw new Error("Missing gutter-ads");
        this.gutterAds = gutterAds;
        document.addEventListener("join-lobby", this.handleJoinLobby.bind(this));
        document.addEventListener("leave-lobby", this.handleLeaveLobby.bind(this));
        document.addEventListener("kick-player", this.handleKickPlayer.bind(this));
        document.addEventListener("update-game-config", this.handleUpdateGameConfig.bind(this));
        document.addEventListener("open-matchmaking", this.handleOpenMatchmaking.bind(this));
        const hlpModal = document.querySelector("help-modal");
        if (!hlpModal || !(hlpModal instanceof HelpModal)) {
            console.warn("Help modal element not found");
        }
        const giModal = document.querySelector("game-info-modal");
        if (!giModal || !(giModal instanceof GameInfoModal)) {
            console.warn("Game info modal element not found");
        }
        const helpButton = document.getElementById("help-button");
        if (helpButton) {
            helpButton.addEventListener("click", () => {
                if (hlpModal && hlpModal instanceof HelpModal) {
                    hlpModal.open();
                }
            });
        }
        const flagInputModal = document.querySelector("flag-input-modal");
        if (!flagInputModal || !(flagInputModal instanceof FlagInputModal)) {
            console.warn("Flag input modal element not found");
        }
        // Attach listener to any flag-input component (desktop or potentially others)
        document.querySelectorAll("flag-input").forEach((flagInput) => {
            flagInput.addEventListener("flag-input-click", () => {
                if (flagInputModal && flagInputModal instanceof FlagInputModal) {
                    flagInputModal.open();
                }
            });
        });
        this.patternsModal = document.getElementById("territory-patterns-modal");
        if (!this.patternsModal ||
            !(this.patternsModal instanceof TerritoryPatternsModal)) {
            console.warn("Territory patterns modal element not found");
        }
        // Attach listener to any pattern-input component
        document.querySelectorAll("pattern-input").forEach((patternInput) => {
            patternInput.addEventListener("pattern-input-click", () => {
                // Open the Store page which contains the patterns UI
                window.showPage?.("page-item-store");
                const skinStoreModal = document.getElementById("page-item-store");
                if (skinStoreModal) {
                    skinStoreModal.classList.remove("hidden");
                    if (typeof skinStoreModal.open === "function") {
                        skinStoreModal.open({ showOnlyOwned: true });
                    }
                }
            });
        });
        if (isInIframe()) {
            const mobilePat = document.getElementById("pattern-input-mobile");
            if (mobilePat)
                mobilePat.style.display = "none";
        }
        if (!this.patternsModal ||
            !(this.patternsModal instanceof TerritoryPatternsModal)) {
            console.warn("Territory patterns modal element not found");
        }
        // We no longer need to manually manage the preview button as PatternInput handles it component-side.
        // However, we still want to ensure the modal can be opened.
        // The setupPatternInput above handles the click event for the new buttons.
        this.patternsModal.refresh();
        // Listen for pattern selection to update any other listeners if needed,
        // though PatternInput handles its own updates via window event.
        this.patternsModal.addEventListener("pattern-selected", () => {
            // PatternInput components will update themselves.
        });
        window.addEventListener("showPage", (e) => {
            if (typeof e?.detail === "string" && e.detail === "page-play") {
                setTimeout(() => {
                    this.patternsModal.refresh();
                }, 50);
            }
        });
        this.tokenLoginModal = document.querySelector("token-login");
        if (!this.tokenLoginModal ||
            !(this.tokenLoginModal instanceof TokenLoginModal)) {
            console.warn("Token login modal element not found");
        }
        this.matchmakingModal = document.querySelector("matchmaking-modal");
        if (!this.matchmakingModal ||
            !(this.matchmakingModal instanceof MatchmakingModal)) {
            console.warn("Matchmaking modal element not found");
        }
        const onUserMe = async (userMeResponse) => {
            updateAccountNavButton(userMeResponse);
            const hasLinkedAccount = !crazyGamesSDK.isOnCrazyGames() &&
                ((userMeResponse || null)?.player?.flares?.length ?? 0) > 0;
            console.log("ads enabled: ", hasLinkedAccount);
            window.adsEnabled = !hasLinkedAccount && !crazyGamesSDK.isOnCrazyGames();
            document.dispatchEvent(new CustomEvent("userMeResponse", {
                detail: userMeResponse,
                bubbles: true,
                cancelable: true,
            }));
            if (userMeResponse !== false) {
                // Authorized
                console.log(`Your player ID is ${userMeResponse.player.publicId}\n` +
                    "Sharing this ID will allow others to view your game history and stats.");
            }
        };
        if ((await userAuth()) === false) {
            // Not logged in
            onUserMe(false);
        }
        else {
            // JWT appears to be valid
            // TODO: Add caching
            getUserMe().then(onUserMe);
        }
        const settingsModal = document.querySelector("user-setting");
        if (!settingsModal || !(settingsModal instanceof UserSettingModal)) {
            console.warn("User settings modal element not found");
        }
        document
            .getElementById("settings-button")
            ?.addEventListener("click", () => {
            if (settingsModal && settingsModal instanceof UserSettingModal) {
                settingsModal.open();
            }
        });
        this.hostModal = document.querySelector("host-lobby-modal");
        if (!this.hostModal || !(this.hostModal instanceof HostPrivateLobbyModal)) {
            console.warn("Host private lobby modal element not found");
        }
        else {
            this.hostModal.eventBus = this.eventBus;
        }
        this.joinModal = document.querySelector("join-lobby-modal");
        if (!this.joinModal || !(this.joinModal instanceof JoinLobbyModal)) {
            console.warn("Join lobby modal element not found");
        }
        else {
            this.joinModal.eventBus = this.eventBus;
        }
        if (this.userSettings.darkMode()) {
            document.documentElement.classList.add("dark");
        }
        else {
            document.documentElement.classList.remove("dark");
        }
        // Attempt to join lobby
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => this.handleUrl());
        }
        else {
            this.handleUrl();
        }
        const onHashUpdate = () => {
            // Reset the UI to its initial state
            this.joinModal?.close();
            onJoinChanged();
        };
        const onPopState = () => {
            if (this.currentUrl !== null && this.gameStop !== null) {
                console.info("Game is active");
                if (!this.gameStop()) {
                    console.info("Player is active, ask before leaving game");
                    const isConfirmed = confirm(translateText("help_modal.exit_confirmation"));
                    if (!isConfirmed) {
                        // Rollback navigator history
                        history.pushState(null, "", this.currentUrl);
                        return;
                    }
                }
                console.info("Player is not active, leave the game immediately");
                crazyGamesSDK.gameplayStop().then(() => {
                    // redirect to the home page
                    window.location.href = "/";
                });
            }
            else {
                console.info("Game not active, handle hash update");
                onHashUpdate();
            }
        };
        const onJoinChanged = () => {
            if (this.gameStop !== null) {
                this.handleLeaveLobby();
            }
            // Attempt to join lobby
            this.handleUrl();
        };
        // Handle browser navigation & manual hash edits
        window.addEventListener("popstate", onPopState);
        window.addEventListener("hashchange", onHashUpdate);
        window.addEventListener("join-changed", onJoinChanged);
        function updateSliderProgress(slider) {
            const percent = ((Number(slider.value) - Number(slider.min)) /
                (Number(slider.max) - Number(slider.min))) *
                100;
            slider.style.setProperty("--progress", `${percent}%`);
        }
        document
            .querySelectorAll("#bots-count, #private-lobby-bots-count")
            .forEach((slider) => {
            updateSliderProgress(slider);
            slider.addEventListener("input", () => updateSliderProgress(slider));
        });
    }
    async handleUrl() {
        // Wait for modal custom elements to be defined
        await Promise.all([
            customElements.whenDefined("join-lobby-modal"),
            customElements.whenDefined("host-lobby-modal"),
        ]);
        // Check if CrazyGames SDK is enabled first (no hash needed in CrazyGames)
        if (crazyGamesSDK.isOnCrazyGames()) {
            const lobbyId = await crazyGamesSDK.getInviteGameId();
            console.log("got game id", lobbyId);
            if (lobbyId && GAME_ID_REGEX.test(lobbyId)) {
                console.log("game parsed successfully");
                // Wait 2 seconds to ensure all elements are actually loaded,
                // On low end-chromebooks the join modal was not registered in time.
                await new Promise((resolve) => setTimeout(resolve, 2000));
                window.showPage?.("page-join-lobby");
                this.joinModal?.open(lobbyId);
                console.log(`CrazyGames: joining lobby ${lobbyId} from invite param`);
                return;
            }
        }
        crazyGamesSDK.isInstantMultiplayer().then((isInstant) => {
            if (isInstant) {
                console.log(`CrazyGames: joining instant multiplayer lobby from CrazyGames`);
                this.hostModal.open();
            }
        });
        const strip = () => history.replaceState(null, "", window.location.pathname + window.location.search);
        const alertAndStrip = (message) => {
            alert(message);
            strip();
        };
        const hash = window.location.hash;
        // Decode the hash first to handle encoded characters
        const decodedHash = decodeURIComponent(hash);
        const params = new URLSearchParams(decodedHash.split("?")[1] || "");
        // Handle different hash sections
        if (decodedHash.startsWith("#purchase-completed")) {
            // Parse params after the ?
            const status = params.get("status");
            if (status !== "true") {
                alertAndStrip("purchase failed");
                return;
            }
            const patternName = params.get("pattern");
            if (!patternName) {
                alert("Something went wrong. Please contact support.");
                console.error("purchase-completed but no pattern name");
                return;
            }
            this.userSettings.setSelectedPatternName(patternName);
            const token = params.get("login-token");
            if (token) {
                strip();
                window.addEventListener("beforeunload", () => {
                    // The page reloads after token login, so we need to save the pattern name
                    // in case it is unset during reload.
                    this.userSettings.setSelectedPatternName(patternName);
                });
                this.tokenLoginModal.openWithToken(token);
            }
            else {
                alertAndStrip(`purchase succeeded: ${patternName}`);
                this.patternsModal.refresh();
            }
            return;
        }
        if (decodedHash.startsWith("#token-login")) {
            const token = params.get("token-login");
            if (!token) {
                alertAndStrip(`login failed! Please try again later or contact support.`);
                return;
            }
            strip();
            this.tokenLoginModal.openWithToken(token);
            return;
        }
        const pathMatch = window.location.pathname.match(/^\/(?:w\d+\/)?game\/([^/]+)/);
        const lobbyId = pathMatch && GAME_ID_REGEX.test(pathMatch[1]) ? pathMatch[1] : null;
        if (lobbyId) {
            window.showPage?.("page-join-lobby");
            this.joinModal.open(lobbyId);
            console.log(`joining lobby ${lobbyId}`);
            return;
        }
        if (decodedHash.startsWith("#affiliate=")) {
            const affiliateCode = decodedHash.replace("#affiliate=", "");
            strip();
            if (affiliateCode) {
                this.patternsModal?.open(affiliateCode);
            }
        }
        if (decodedHash.startsWith("#refresh")) {
            window.location.href = "/";
        }
        // Handle requeue parameter for ranked matchmaking
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.has("requeue")) {
            // Remove only the requeue parameter, preserving other params and hash
            searchParams.delete("requeue");
            const newUrl = window.location.pathname +
                (searchParams.toString() ? "?" + searchParams.toString() : "") +
                window.location.hash;
            history.replaceState(null, "", newUrl);
            // Wait for matchmaking button to be defined, then trigger its click handler.
            customElements.whenDefined("matchmaking-button").then(() => {
                const matchmakingButton = document.querySelector("matchmaking-button button");
                if (matchmakingButton) {
                    matchmakingButton.click();
                }
                else {
                    console.warn("Requeue requested, but matchmaking button not found in DOM.");
                }
            });
        }
    }
    async handleJoinLobby(event) {
        const lobby = event.detail;
        console.log(`joining lobby ${lobby.gameID}`);
        if (this.gameStop !== null) {
            console.log("joining lobby, stopping existing game");
            this.gameStop(true);
            document.body.classList.remove("in-game");
        }
        if (lobby.source === "public") {
            this.joinModal?.open(lobby.gameID, lobby.publicLobbyInfo);
        }
        const config = await getServerConfigFromClient();
        // Only update URL immediately for private lobbies, not public ones
        if (lobby.source !== "public") {
            this.updateJoinUrlForShare(lobby.gameID, config);
        }
        this.gameStop = joinLobby(this.eventBus, {
            gameID: lobby.gameID,
            serverConfig: config,
            cosmetics: await getPlayerCosmeticsRefs(),
            turnstileToken: await this.getTurnstileToken(lobby),
            playerName: this.usernameInput?.getCurrentUsername() ?? genAnonUsername(),
            gameStartInfo: lobby.gameStartInfo ?? lobby.gameRecord?.info,
            gameRecord: lobby.gameRecord,
        }, () => {
            console.log("Closing modals");
            document.getElementById("settings-button")?.classList.add("hidden");
            if (this.usernameInput) {
                // fix edge case where username-validation-error is re-rendered and hidden tag removed
                this.usernameInput.validationError = "";
            }
            document
                .getElementById("username-validation-error")
                ?.classList.add("hidden");
            this.joinModal?.closeWithoutLeaving();
            [
                "single-player-modal",
                "host-lobby-modal",
                "game-starting-modal",
                "game-top-bar",
                "help-modal",
                "user-setting",
                "troubleshooting-modal",
                "territory-patterns-modal",
                "language-modal",
                "news-modal",
                "flag-input-modal",
                "account-button",
                "leaderboard-button",
                "token-login",
                "matchmaking-modal",
                "lang-selector",
                "gutter-ads",
            ].forEach((tag) => {
                const modal = document.querySelector(tag);
                if (modal?.close) {
                    modal.close();
                }
                else if (modal && "isModalOpen" in modal) {
                    modal.isModalOpen = false;
                }
            });
            this.gameModeSelector.stop();
            document.querySelectorAll(".ad").forEach((ad) => {
                ad.style.display = "none";
            });
            crazyGamesSDK.loadingStart();
            // show when the game loads
            const startingModal = document.querySelector("game-starting-modal");
            if (startingModal && startingModal instanceof GameStartingModal) {
                startingModal.show();
            }
        }, () => {
            this.joinModal?.closeWithoutLeaving();
            this.gameModeSelector.stop();
            incrementGamesPlayed();
            document.querySelectorAll(".ad").forEach((ad) => {
                ad.style.display = "none";
            });
            if (window.PageOS?.session?.newPageView) {
                window.PageOS.session.newPageView();
            }
            crazyGamesSDK.loadingStop();
            crazyGamesSDK.gameplayStart();
            document.body.classList.add("in-game");
            // Ensure there's a homepage entry in history before adding the lobby entry
            if (window.location.hash === "" || window.location.hash === "#") {
                history.replaceState(null, "", window.location.origin + "#refresh");
            }
            const lobbyIdHidden = !this.userSettings.lobbyIdVisibility();
            history.pushState(null, "", lobbyIdHidden
                ? "/streamer-mode"
                : `/${config.workerPath(lobby.gameID)}/game/${lobby.gameID}?live`);
            // Store current URL for popstate confirmation
            this.currentUrl = window.location.href;
        });
    }
    updateJoinUrlForShare(lobbyId, config) {
        const lobbyIdHidden = !this.userSettings.lobbyIdVisibility();
        const targetUrl = lobbyIdHidden
            ? "/streamer-mode"
            : `/${config.workerPath(lobbyId)}/game/${lobbyId}`;
        const currentUrl = window.location.pathname;
        if (currentUrl !== targetUrl) {
            history.replaceState(null, "", targetUrl);
        }
    }
    async handleLeaveLobby( /* event: CustomEvent */) {
        if (this.gameStop === null) {
            return;
        }
        console.log("leaving lobby, cancelling game");
        this.gameStop(true);
        this.gameStop = null;
        this.currentUrl = null;
        try {
            history.replaceState(null, "", "/");
        }
        catch (e) {
            console.warn("Failed to restore URL on leave:", e);
        }
        document.body.classList.remove("in-game");
        crazyGamesSDK.gameplayStop();
    }
    handleOpenMatchmaking(_event) {
        this.matchmakingModal?.open();
    }
    handleKickPlayer(event) {
        const { target } = event.detail;
        // Forward to eventBus if available
        if (this.eventBus) {
            this.eventBus.emit(new SendKickPlayerIntentEvent(target));
        }
    }
    handleUpdateGameConfig(event) {
        const { config } = event.detail;
        // Forward to eventBus if available
        if (this.eventBus) {
            this.eventBus.emit(new SendUpdateGameConfigIntentEvent(config));
        }
    }
    async getTurnstileToken(lobby) {
        const config = await getServerConfigFromClient();
        if (config.env() === GameEnv.Dev ||
            lobby.gameStartInfo?.config.gameType === GameType.Singleplayer) {
            return null;
        }
        // Always request a new token on crazygames.
        if (this.turnstileTokenPromise === null || crazyGamesSDK.isOnCrazyGames()) {
            console.log("No prefetched turnstile token, getting new token");
            return (await getTurnstileToken())?.token ?? null;
        }
        const token = await this.turnstileTokenPromise;
        // Clear promise so a new token is fetched next time
        this.turnstileTokenPromise = null;
        if (!token) {
            console.log("No turnstile token");
            return null;
        }
        const tokenTTL = 3 * 60 * 1000;
        if (Date.now() < token.createdAt + tokenTTL) {
            console.log("Prefetched turnstile token is valid");
            return token.token;
        }
        else {
            console.log("Turnstile token expired, getting new token");
            return (await getTurnstileToken())?.token ?? null;
        }
    }
}
// Hide elements with no-crazygames class if on CrazyGames
const hideCrazyGamesElements = () => {
    if (crazyGamesSDK.isOnCrazyGames()) {
        document.querySelectorAll(".no-crazygames").forEach((el) => {
            el.style.display = "none";
        });
    }
};
// Initialize the client when the DOM is loaded
const bootstrap = () => {
    initLayout();
    new Client().initialize();
    initNavigation();
    // Hide elements immediately
    hideCrazyGamesElements();
    // Also hide elements after a short delay to catch late-rendered components
    setTimeout(hideCrazyGamesElements, 100);
    setTimeout(hideCrazyGamesElements, 500);
};
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
}
else {
    bootstrap();
}
async function getTurnstileToken() {
    // Wait for Turnstile script to load (handles slow connections)
    let attempts = 0;
    while (typeof window.turnstile === "undefined" && attempts < 100) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
    }
    if (typeof window.turnstile === "undefined") {
        throw new Error("Failed to load Turnstile script");
    }
    const config = await getServerConfigFromClient();
    const widgetId = window.turnstile.render("#turnstile-container", {
        sitekey: config.turnstileSiteKey(),
        size: "normal",
        appearance: "interaction-only",
        theme: "light",
    });
    return new Promise((resolve, reject) => {
        window.turnstile.execute(widgetId, {
            callback: (token) => {
                window.turnstile.remove(widgetId);
                console.log(`Turnstile token received: ${token}`);
                resolve({ token, createdAt: Date.now() });
            },
            "error-callback": (errorCode) => {
                window.turnstile.remove(widgetId);
                console.error(`Turnstile error: ${errorCode}`);
                alert(`Turnstile error: ${errorCode}. Please refresh and try again.`);
                reject(new Error(`Turnstile failed: ${errorCode}`));
            },
        });
    });
}
//# sourceMappingURL=Main.js.map