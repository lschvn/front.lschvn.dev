import { DEFAULT_ATTACK_MODE } from "../../core/configuration/AttackModeBalance";
import { UserSettings } from "../../core/game/UserSettings";
import { RefreshGraphicsEvent as RedrawGraphicsEvent } from "../InputHandler";
import { FrameProfiler } from "./FrameProfiler";
import { TransformHandler } from "./TransformHandler";
import { AirMissionLayer } from "./layers/AirMissionLayer";
import { AirMissionPanel } from "./layers/AirMissionPanel";
import { AlertFrame } from "./layers/AlertFrame";
import { AttacksDisplay } from "./layers/AttacksDisplay";
import { BuildMenu } from "./layers/BuildMenu";
import { ChatDisplay } from "./layers/ChatDisplay";
import { ChatModal } from "./layers/ChatModal";
import { ControlPanel } from "./layers/ControlPanel";
import { CoordinateGridLayer } from "./layers/CoordinateGridLayer";
import { DynamicUILayer } from "./layers/DynamicUILayer";
import { EmojiTable } from "./layers/EmojiTable";
import { EventsDisplay } from "./layers/EventsDisplay";
import { FxLayer } from "./layers/FxLayer";
import { GameLeftSidebar } from "./layers/GameLeftSidebar";
import { GameRightSidebar } from "./layers/GameRightSidebar";
import { HeadsUpMessage } from "./layers/HeadsUpMessage";
import { ImmunityTimer } from "./layers/ImmunityTimer";
import { InGameHeaderAd } from "./layers/InGameHeaderAd";
import { Leaderboard } from "./layers/Leaderboard";
import { MainRadialMenu } from "./layers/MainRadialMenu";
import { MultiTabModal } from "./layers/MultiTabModal";
import { NameLayer } from "./layers/NameLayer";
import { NukeTrajectoryPreviewLayer } from "./layers/NukeTrajectoryPreviewLayer";
import { PerformanceOverlay } from "./layers/PerformanceOverlay";
import { PlayerInfoOverlay } from "./layers/PlayerInfoOverlay";
import { PlayerPanel } from "./layers/PlayerPanel";
import { RailroadLayer } from "./layers/RailroadLayer";
import { ReplayPanel } from "./layers/ReplayPanel";
import { SAMRadiusLayer } from "./layers/SAMRadiusLayer";
import { SettingsModal } from "./layers/SettingsModal";
import { SpawnTimer } from "./layers/SpawnTimer";
import { SpawnVideoAd } from "./layers/SpawnVideoReward";
import { StructureIconsLayer } from "./layers/StructureIconsLayer";
import { StructureLayer } from "./layers/StructureLayer";
import { SupplyLayer } from "./layers/SupplyLayer";
import { TeamStats } from "./layers/TeamStats";
import { TerrainLayer } from "./layers/TerrainLayer";
import { TerritoryLayer } from "./layers/TerritoryLayer";
import { UILayer } from "./layers/UILayer";
import { UnitDisplay } from "./layers/UnitDisplay";
import { UnitLayer } from "./layers/UnitLayer";
import { WinModal } from "./layers/WinModal";
export function createRenderer(canvas, game, eventBus) {
    const transformHandler = new TransformHandler(game, eventBus, canvas);
    const userSettings = new UserSettings();
    const uiState = {
        attackRatio: 20,
        attackMode: DEFAULT_ATTACK_MODE,
        ghostStructure: null,
        overlappingRailroads: [],
        ghostRailPaths: [],
        rocketDirectionUp: true,
        selectedAirbaseId: null,
        pendingAirMission: null,
    };
    //hide when the game renders
    const startingModal = document.querySelector("game-starting-modal");
    startingModal.hide();
    // TODO maybe append this to document instead of querying for them?
    const emojiTable = document.querySelector("emoji-table");
    if (!emojiTable || !(emojiTable instanceof EmojiTable)) {
        console.error("EmojiTable element not found in the DOM");
    }
    emojiTable.transformHandler = transformHandler;
    emojiTable.game = game;
    emojiTable.initEventBus(eventBus);
    const buildMenu = document.querySelector("build-menu");
    if (!buildMenu || !(buildMenu instanceof BuildMenu)) {
        console.error("BuildMenu element not found in the DOM");
    }
    buildMenu.game = game;
    buildMenu.eventBus = eventBus;
    buildMenu.uiState = uiState;
    buildMenu.transformHandler = transformHandler;
    const leaderboard = document.querySelector("leader-board");
    if (!leaderboard || !(leaderboard instanceof Leaderboard)) {
        console.error("LeaderBoard element not found in the DOM");
    }
    leaderboard.eventBus = eventBus;
    leaderboard.game = game;
    const gameLeftSidebar = document.querySelector("game-left-sidebar");
    if (!gameLeftSidebar || !(gameLeftSidebar instanceof GameLeftSidebar)) {
        console.error("GameLeftSidebar element not found in the DOM");
    }
    gameLeftSidebar.game = game;
    gameLeftSidebar.eventBus = eventBus;
    const teamStats = document.querySelector("team-stats");
    if (!teamStats || !(teamStats instanceof TeamStats)) {
        console.error("TeamStats element not found in the DOM");
    }
    teamStats.eventBus = eventBus;
    teamStats.game = game;
    const controlPanel = document.querySelector("control-panel");
    if (!(controlPanel instanceof ControlPanel)) {
        console.error("ControlPanel element not found in the DOM");
    }
    controlPanel.eventBus = eventBus;
    controlPanel.uiState = uiState;
    controlPanel.game = game;
    const eventsDisplay = document.querySelector("events-display");
    if (!(eventsDisplay instanceof EventsDisplay)) {
        console.error("events display not found");
    }
    eventsDisplay.eventBus = eventBus;
    eventsDisplay.game = game;
    eventsDisplay.uiState = uiState;
    const attacksDisplay = document.querySelector("attacks-display");
    if (!(attacksDisplay instanceof AttacksDisplay)) {
        console.error("attacks display not found");
    }
    attacksDisplay.eventBus = eventBus;
    attacksDisplay.game = game;
    attacksDisplay.uiState = uiState;
    const chatDisplay = document.querySelector("chat-display");
    if (!(chatDisplay instanceof ChatDisplay)) {
        console.error("chat display not found");
    }
    chatDisplay.eventBus = eventBus;
    chatDisplay.game = game;
    const playerInfo = document.querySelector("player-info-overlay");
    if (!(playerInfo instanceof PlayerInfoOverlay)) {
        console.error("player info overlay not found");
    }
    playerInfo.eventBus = eventBus;
    playerInfo.transform = transformHandler;
    playerInfo.game = game;
    const winModal = document.querySelector("win-modal");
    if (!(winModal instanceof WinModal)) {
        console.error("win modal not found");
    }
    winModal.eventBus = eventBus;
    winModal.game = game;
    const replayPanel = document.querySelector("replay-panel");
    if (!(replayPanel instanceof ReplayPanel)) {
        console.error("replay panel not found");
    }
    replayPanel.eventBus = eventBus;
    replayPanel.game = game;
    const gameRightSidebar = document.querySelector("game-right-sidebar");
    if (!(gameRightSidebar instanceof GameRightSidebar)) {
        console.error("Game Right bar not found");
    }
    gameRightSidebar.game = game;
    gameRightSidebar.eventBus = eventBus;
    const settingsModal = document.querySelector("settings-modal");
    if (!(settingsModal instanceof SettingsModal)) {
        console.error("settings modal not found");
    }
    settingsModal.userSettings = userSettings;
    settingsModal.eventBus = eventBus;
    const unitDisplay = document.querySelector("unit-display");
    if (!(unitDisplay instanceof UnitDisplay)) {
        console.error("unit display not found");
    }
    unitDisplay.game = game;
    unitDisplay.eventBus = eventBus;
    unitDisplay.uiState = uiState;
    const airMissionPanel = document.querySelector("air-mission-panel");
    if (!(airMissionPanel instanceof AirMissionPanel)) {
        console.error("air mission panel not found");
    }
    airMissionPanel.game = game;
    airMissionPanel.eventBus = eventBus;
    airMissionPanel.uiState = uiState;
    const playerPanel = document.querySelector("player-panel");
    if (!(playerPanel instanceof PlayerPanel)) {
        console.error("player panel not found");
    }
    playerPanel.g = game;
    playerPanel.initEventBus(eventBus);
    playerPanel.emojiTable = emojiTable;
    playerPanel.uiState = uiState;
    const chatModal = document.querySelector("chat-modal");
    if (!(chatModal instanceof ChatModal)) {
        console.error("chat modal not found");
    }
    chatModal.g = game;
    chatModal.initEventBus(eventBus);
    const multiTabModal = document.querySelector("multi-tab-modal");
    if (!(multiTabModal instanceof MultiTabModal)) {
        console.error("multi-tab modal not found");
    }
    multiTabModal.game = game;
    const headsUpMessage = document.querySelector("heads-up-message");
    if (!(headsUpMessage instanceof HeadsUpMessage)) {
        console.error("heads-up message not found");
    }
    headsUpMessage.game = game;
    const structureLayer = new StructureLayer(game, eventBus, transformHandler);
    const samRadiusLayer = new SAMRadiusLayer(game, eventBus, uiState);
    const performanceOverlay = document.querySelector("performance-overlay");
    if (!(performanceOverlay instanceof PerformanceOverlay)) {
        console.error("performance overlay not found");
    }
    performanceOverlay.eventBus = eventBus;
    performanceOverlay.userSettings = userSettings;
    const alertFrame = document.querySelector("alert-frame");
    if (!(alertFrame instanceof AlertFrame)) {
        console.error("alert frame not found");
    }
    alertFrame.game = game;
    const spawnTimer = document.querySelector("spawn-timer");
    if (!(spawnTimer instanceof SpawnTimer)) {
        console.error("spawn timer not found");
    }
    spawnTimer.game = game;
    spawnTimer.eventBus = eventBus;
    spawnTimer.transformHandler = transformHandler;
    const immunityTimer = document.querySelector("immunity-timer");
    if (!(immunityTimer instanceof ImmunityTimer)) {
        console.error("immunity timer not found");
    }
    immunityTimer.game = game;
    immunityTimer.eventBus = eventBus;
    const inGameHeaderAd = document.querySelector("in-game-header-ad");
    if (!(inGameHeaderAd instanceof InGameHeaderAd)) {
        console.error("in-game header ad not found");
    }
    inGameHeaderAd.game = game;
    const spawnVideoAd = document.querySelector("spawn-video-ad");
    if (!(spawnVideoAd instanceof SpawnVideoAd)) {
        console.error("spawn video ad not found");
    }
    spawnVideoAd.game = game;
    // When updating these layers please be mindful of the order.
    // Try to group layers by the return value of shouldTransform.
    // Not grouping the layers may cause excessive calls to context.save() and context.restore().
    const layers = [
        new TerrainLayer(game, transformHandler),
        new TerritoryLayer(game, eventBus, transformHandler, userSettings),
        new SupplyLayer(game, userSettings),
        new RailroadLayer(game, eventBus, transformHandler, uiState),
        new CoordinateGridLayer(game, eventBus, transformHandler),
        structureLayer,
        samRadiusLayer,
        new AirMissionLayer(game, eventBus, transformHandler, uiState),
        new UnitLayer(game, eventBus, transformHandler),
        new FxLayer(game, eventBus, transformHandler),
        new UILayer(game, eventBus, transformHandler),
        new NukeTrajectoryPreviewLayer(game, eventBus, transformHandler, uiState),
        new StructureIconsLayer(game, eventBus, uiState, transformHandler),
        new DynamicUILayer(game, transformHandler, eventBus),
        new NameLayer(game, transformHandler, eventBus),
        eventsDisplay,
        attacksDisplay,
        chatDisplay,
        buildMenu,
        new MainRadialMenu(eventBus, game, transformHandler, emojiTable, buildMenu, uiState, playerPanel),
        spawnTimer,
        immunityTimer,
        leaderboard,
        gameLeftSidebar,
        unitDisplay,
        airMissionPanel,
        gameRightSidebar,
        controlPanel,
        playerInfo,
        winModal,
        replayPanel,
        settingsModal,
        teamStats,
        playerPanel,
        headsUpMessage,
        multiTabModal,
        inGameHeaderAd,
        spawnVideoAd,
        alertFrame,
        performanceOverlay,
    ];
    return new GameRenderer(game, eventBus, canvas, transformHandler, uiState, layers, performanceOverlay);
}
export class GameRenderer {
    constructor(game, eventBus, canvas, transformHandler, uiState, layers, performanceOverlay) {
        this.game = game;
        this.eventBus = eventBus;
        this.canvas = canvas;
        this.transformHandler = transformHandler;
        this.uiState = uiState;
        this.layers = layers;
        this.performanceOverlay = performanceOverlay;
        this.layerTickState = new Map();
        this.renderFramesSinceLastTick = 0;
        this.renderLayerDurationsSinceLastTick = {};
        const context = canvas.getContext("2d", { alpha: false });
        if (context === null)
            throw new Error("2d context not supported");
        this.context = context;
    }
    initialize() {
        this.eventBus.on(RedrawGraphicsEvent, () => this.redraw());
        this.layers.forEach((l) => l.init?.());
        // only append the canvas if it's not already in the document to avoid reparenting side-effects
        if (!document.body.contains(this.canvas)) {
            document.body.appendChild(this.canvas);
        }
        window.addEventListener("resize", () => this.resizeCanvas());
        this.resizeCanvas();
        //show whole map on startup
        this.transformHandler.centerAll(0.9);
        let rafId = requestAnimationFrame(() => this.renderGame());
        this.canvas.addEventListener("contextlost", () => {
            cancelAnimationFrame(rafId);
        });
        this.canvas.addEventListener("contextrestored", () => {
            this.redraw();
            rafId = requestAnimationFrame(() => this.renderGame());
        });
    }
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.transformHandler.updateCanvasBoundingRect();
        //this.redraw()
    }
    redraw() {
        this.layers.forEach((l) => {
            if (l.redraw) {
                l.redraw();
            }
        });
    }
    renderGame() {
        const shouldProfileFrame = FrameProfiler.isEnabled();
        if (shouldProfileFrame) {
            FrameProfiler.clear();
        }
        const start = performance.now();
        // Set background
        this.context.fillStyle = this.game
            .config()
            .theme()
            .backgroundColor()
            .toHex();
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        const handleTransformState = (needsTransform, active) => {
            if (needsTransform && !active) {
                this.context.save();
                this.transformHandler.handleTransform(this.context);
                return true;
            }
            else if (!needsTransform && active) {
                this.context.restore();
                return false;
            }
            return active;
        };
        let isTransformActive = false;
        for (const layer of this.layers) {
            const needsTransform = layer.shouldTransform?.() ?? false;
            isTransformActive = handleTransformState(needsTransform, isTransformActive);
            if (shouldProfileFrame) {
                const layerStart = FrameProfiler.start();
                layer.renderLayer?.(this.context);
                FrameProfiler.end(layer.constructor?.name ?? "UnknownLayer", layerStart);
            }
            else {
                layer.renderLayer?.(this.context);
            }
        }
        handleTransformState(false, isTransformActive); // Ensure context is clean after rendering
        this.transformHandler.resetChanged();
        requestAnimationFrame(() => this.renderGame());
        const duration = performance.now() - start;
        if (shouldProfileFrame) {
            const layerDurations = FrameProfiler.consume();
            this.renderFramesSinceLastTick++;
            for (const [name, ms] of Object.entries(layerDurations)) {
                this.renderLayerDurationsSinceLastTick[name] =
                    (this.renderLayerDurationsSinceLastTick[name] ?? 0) + ms;
            }
            this.performanceOverlay.updateFrameMetrics(duration, layerDurations);
        }
        if (duration > 50) {
            console.warn(`tick ${this.game.ticks()} took ${duration}ms to render frame`);
        }
    }
    tick() {
        const nowMs = performance.now();
        const shouldProfileTick = FrameProfiler.isEnabled();
        if (shouldProfileTick) {
            this.performanceOverlay.updateRenderPerTickMetrics(this.renderFramesSinceLastTick, this.renderLayerDurationsSinceLastTick);
            this.renderFramesSinceLastTick = 0;
            this.renderLayerDurationsSinceLastTick = {};
        }
        const tickLayerDurations = {};
        for (const layer of this.layers) {
            if (!layer.tick) {
                continue;
            }
            const state = this.layerTickState.get(layer) ?? {
                lastTickAtMs: -Infinity,
            };
            const intervalMs = layer.getTickIntervalMs?.() ?? 0;
            if (intervalMs > 0 && nowMs - state.lastTickAtMs < intervalMs) {
                this.layerTickState.set(layer, state);
                continue;
            }
            state.lastTickAtMs = nowMs;
            this.layerTickState.set(layer, state);
            const tickStart = shouldProfileTick ? performance.now() : 0;
            layer.tick();
            if (shouldProfileTick && tickStart !== 0) {
                const duration = performance.now() - tickStart;
                const label = layer.constructor?.name ?? "UnknownLayer";
                tickLayerDurations[label] = (tickLayerDurations[label] ?? 0) + duration;
            }
        }
        if (shouldProfileTick) {
            this.performanceOverlay.updateTickLayerMetrics(tickLayerDurations);
        }
    }
    resize(width, height) {
        this.canvas.width = Math.ceil(width / window.devicePixelRatio);
        this.canvas.height = Math.ceil(height / window.devicePixelRatio);
    }
}
//# sourceMappingURL=GameRenderer.js.map