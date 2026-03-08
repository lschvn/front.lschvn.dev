var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { ChatIntegration } from "./ChatIntegration";
import { PlayerActionHandler } from "./PlayerActionHandler";
import { RadialMenu } from "./RadialMenu";
import { centerButtonElement, COLORS, rootMenuElement, } from "./RadialMenuElements";
import donateTroopIcon from "/images/DonateTroopIconWhite.svg?url";
import swordIcon from "/images/SwordIconWhite.svg?url";
import { ContextMenuEvent } from "../../InputHandler";
let MainRadialMenu = class MainRadialMenu extends LitElement {
    getTickIntervalMs() {
        return 500;
    }
    constructor(eventBus, game, transformHandler, emojiTable, buildMenu, uiState, playerPanel) {
        super();
        this.eventBus = eventBus;
        this.game = game;
        this.transformHandler = transformHandler;
        this.emojiTable = emojiTable;
        this.buildMenu = buildMenu;
        this.uiState = uiState;
        this.playerPanel = playerPanel;
        this.clickedTile = null;
        const menuConfig = {
            centerButtonIcon: swordIcon,
            tooltipStyle: `
        .radial-tooltip .cost {
          margin-top: 4px;
          color: ${COLORS.tooltip.cost};
        }
        .radial-tooltip .count {
          color: ${COLORS.tooltip.count};
        }
      `,
        };
        this.radialMenu = new RadialMenu(this.eventBus, rootMenuElement, centerButtonElement, menuConfig);
        this.playerActionHandler = new PlayerActionHandler(this.eventBus, this.uiState);
        this.chatIntegration = new ChatIntegration(this.game, this.eventBus);
    }
    init() {
        this.radialMenu.init();
        this.eventBus.on(ContextMenuEvent, (event) => {
            const worldCoords = this.transformHandler.screenToWorldCoordinates(event.x, event.y);
            if (!this.game.isValidCoord(worldCoords.x, worldCoords.y)) {
                return;
            }
            if (this.game.myPlayer() === null) {
                return;
            }
            this.clickedTile = this.game.ref(worldCoords.x, worldCoords.y);
            this.game
                .myPlayer()
                .actions(this.clickedTile)
                .then((actions) => {
                this.updatePlayerActions(this.game.myPlayer(), actions, this.clickedTile, event.x, event.y);
            });
        });
    }
    async updatePlayerActions(myPlayer, actions, tile, screenX = null, screenY = null) {
        this.buildMenu.playerBuildables = actions.buildableUnits;
        const tileOwner = this.game.owner(tile);
        const recipient = tileOwner.isPlayer() ? tileOwner : null;
        if (myPlayer && recipient) {
            this.chatIntegration.setupChatModal(myPlayer, recipient);
        }
        const params = {
            myPlayer,
            selected: recipient,
            tile,
            playerActions: actions,
            game: this.game,
            buildMenu: this.buildMenu,
            emojiTable: this.emojiTable,
            playerActionHandler: this.playerActionHandler,
            playerPanel: this.playerPanel,
            chatIntegration: this.chatIntegration,
            uiState: this.uiState,
            closeMenu: () => this.closeMenu(),
            eventBus: this.eventBus,
        };
        const isFriendlyTarget = recipient !== null &&
            recipient.isFriendly(myPlayer) &&
            !recipient.isDisconnected();
        this.radialMenu.setCenterButtonAppearance(isFriendlyTarget ? donateTroopIcon : swordIcon, isFriendlyTarget ? "#34D399" : "#2c3e50", isFriendlyTarget
            ? this.radialMenu.getDefaultCenterIconSize() * 0.75
            : this.radialMenu.getDefaultCenterIconSize());
        this.radialMenu.setParams(params);
        if (screenX !== null && screenY !== null) {
            this.radialMenu.showRadialMenu(screenX, screenY);
        }
        else {
            this.radialMenu.refresh();
        }
    }
    async tick() {
        if (!this.radialMenu.isMenuVisible() || this.clickedTile === null)
            return;
        this.game
            .myPlayer()
            .actions(this.clickedTile)
            .then((actions) => {
            this.updatePlayerActions(this.game.myPlayer(), actions, this.clickedTile);
        });
    }
    renderLayer(context) {
        this.radialMenu.renderLayer(context);
    }
    shouldTransform() {
        return this.radialMenu.shouldTransform();
    }
    closeMenu() {
        if (this.radialMenu.isMenuVisible()) {
            this.radialMenu.hideRadialMenu();
        }
        if (this.buildMenu.isVisible) {
            this.buildMenu.hideMenu();
        }
        if (this.emojiTable.isVisible) {
            this.emojiTable.hideTable();
        }
        if (this.playerPanel.isVisible) {
            this.playerPanel.hide();
        }
    }
};
MainRadialMenu = __decorate([
    customElement("main-radial-menu")
], MainRadialMenu);
export { MainRadialMenu };
//# sourceMappingURL=MainRadialMenu.js.map