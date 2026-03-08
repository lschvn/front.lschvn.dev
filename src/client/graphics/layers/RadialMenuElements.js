import { AllPlayers, BuildableAttacks, Structures, UnitType, } from "../../../core/game/Game";
import { flattenedEmojiTable } from "../../../core/Util";
import { renderNumber, translateText } from "../../Utils";
import { flattenedBuildTable } from "./BuildMenu";
import allianceIcon from "/images/AllianceIconWhite.svg?url";
import boatIcon from "/images/BoatIconWhite.svg?url";
import buildIcon from "/images/BuildIconWhite.svg?url";
import chatIcon from "/images/ChatIconWhite.svg?url";
import donateGoldIcon from "/images/DonateGoldIconWhite.svg?url";
import donateTroopIcon from "/images/DonateTroopIconWhite.svg?url";
import emojiIcon from "/images/EmojiIconWhite.svg?url";
import infoIcon from "/images/InfoIcon.svg?url";
import swordIcon from "/images/SwordIconWhite.svg?url";
import targetIcon from "/images/TargetIconWhite.svg?url";
import traitorIcon from "/images/TraitorIconWhite.svg?url";
import xIcon from "/images/XIcon.svg?url";
export const COLORS = {
    build: "#ebe250",
    building: "#2c2c2c",
    boat: "#3f6ab1",
    ally: "#53ac75",
    breakAlly: "#c74848",
    breakAllyNoDebuff: "#d4882b",
    delete: "#ff0000",
    info: "#64748B",
    target: "#ff0000",
    attack: "#ff0000",
    infoDetails: "#7f8c8d",
    infoEmoji: "#f1c40f",
    trade: "#008080",
    embargo: "#6600cc",
    tooltip: {
        cost: "#ffd700",
        count: "#aaa",
    },
    chat: {
        default: "#66c",
        help: "#4caf50",
        attack: "#f44336",
        defend: "#2196f3",
        greet: "#ff9800",
        misc: "#9c27b0",
        warnings: "#e3c532",
    },
};
export var Slot;
(function (Slot) {
    Slot["Info"] = "info";
    Slot["Boat"] = "boat";
    Slot["Build"] = "build";
    Slot["Attack"] = "attack";
    Slot["Ally"] = "ally";
    Slot["Back"] = "back";
    Slot["Delete"] = "delete";
})(Slot || (Slot = {}));
function isFriendlyTarget(params) {
    const selectedPlayer = params.selected;
    if (selectedPlayer === null)
        return false;
    const isFriendly = selectedPlayer.isFriendly;
    if (typeof isFriendly !== "function")
        return false;
    return isFriendly.call(selectedPlayer, params.myPlayer);
}
function isDisconnectedTarget(params) {
    const selectedPlayer = params.selected;
    if (selectedPlayer === null)
        return false;
    const isDisconnected = selectedPlayer.isDisconnected;
    if (typeof isDisconnected !== "function")
        return false;
    return isDisconnected.call(selectedPlayer);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const infoChatElement = {
    id: "info_chat",
    name: "chat",
    disabled: () => false,
    color: COLORS.chat.default,
    icon: chatIcon,
    subMenu: (params) => params.chatIntegration
        .createQuickChatMenu(params.selected)
        .map((item) => ({
        ...item,
        action: item.action
            ? (_params) => item.action(params)
            : undefined,
    })),
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const allyTargetElement = {
    id: "ally_target",
    name: "target",
    disabled: (params) => {
        if (params.selected === null)
            return true;
        return !params.playerActions.interaction?.canTarget;
    },
    color: COLORS.target,
    icon: targetIcon,
    action: (params) => {
        params.playerActionHandler.handleTargetPlayer(params.selected.id());
        params.closeMenu();
    },
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const allyTradeElement = {
    id: "ally_trade",
    name: "trade",
    disabled: (params) => !!params.playerActions?.interaction?.canEmbargo,
    displayed: (params) => !params.playerActions?.interaction?.canEmbargo,
    color: COLORS.trade,
    text: translateText("player_panel.start_trade"),
    action: (params) => {
        params.playerActionHandler.handleEmbargo(params.selected, "stop");
        params.closeMenu();
    },
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const allyEmbargoElement = {
    id: "ally_embargo",
    name: "embargo",
    disabled: (params) => !params.playerActions?.interaction?.canEmbargo,
    displayed: (params) => !!params.playerActions?.interaction?.canEmbargo,
    color: COLORS.embargo,
    text: translateText("player_panel.stop_trade"),
    action: (params) => {
        params.playerActionHandler.handleEmbargo(params.selected, "start");
        params.closeMenu();
    },
};
const allyRequestElement = {
    id: "ally_request",
    name: "request",
    disabled: (params) => !params.playerActions?.interaction?.canSendAllianceRequest,
    displayed: (params) => !params.playerActions?.interaction?.canBreakAlliance,
    color: COLORS.ally,
    icon: allianceIcon,
    action: (params) => {
        params.playerActionHandler.handleAllianceRequest(params.myPlayer, params.selected);
        params.closeMenu();
    },
};
const allyExtendElement = {
    id: "ally_extend",
    name: "extend",
    displayed: (params) => !!params.playerActions?.interaction?.allianceInfo?.inExtensionWindow,
    disabled: (params) => !params.playerActions?.interaction?.allianceInfo?.canExtend,
    color: COLORS.ally,
    icon: allianceIcon,
    action: (params) => {
        if (!params.playerActions?.interaction?.allianceInfo?.canExtend)
            return;
        params.playerActionHandler.handleExtendAlliance(params.selected);
        params.closeMenu();
    },
    timerFraction: (params) => {
        const interaction = params.playerActions?.interaction;
        if (!interaction?.allianceInfo)
            return 1;
        const remaining = Math.max(0, interaction.allianceInfo.expiresAt - params.game.ticks());
        const extensionWindow = Math.max(1, params.game.config().allianceExtensionPromptOffset());
        return Math.max(0, Math.min(1, remaining / extensionWindow));
    },
    renderType: "allyExtend",
};
const allyBreakElement = {
    id: "ally_break",
    name: "break",
    disabled: (params) => !params.playerActions?.interaction?.canBreakAlliance,
    displayed: (params) => !!params.playerActions?.interaction?.canBreakAlliance,
    color: (params) => params.selected?.isTraitor() || params.selected?.isDisconnected()
        ? COLORS.breakAllyNoDebuff
        : COLORS.breakAlly,
    icon: traitorIcon,
    action: (params) => {
        params.playerActionHandler.handleBreakAlliance(params.myPlayer, params.selected);
        params.closeMenu();
    },
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const allyDonateGoldElement = {
    id: "ally_donate_gold",
    name: "donate gold",
    disabled: (params) => !params.playerActions?.interaction?.canDonateGold,
    color: COLORS.ally,
    icon: donateGoldIcon,
    action: (params) => {
        params.playerActionHandler.handleDonateGold(params.selected);
        params.closeMenu();
    },
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const allyDonateTroopsElement = {
    id: "ally_donate_troops",
    name: "donate troops",
    disabled: (params) => !params.playerActions?.interaction?.canDonateTroops,
    color: COLORS.ally,
    icon: donateTroopIcon,
    action: (params) => {
        params.playerActionHandler.handleDonateTroops(params.selected);
        params.closeMenu();
    },
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const infoPlayerElement = {
    id: "info_player",
    name: "player",
    disabled: () => false,
    color: COLORS.info,
    icon: infoIcon,
    action: (params) => {
        params.playerPanel.show(params.playerActions, params.tile);
    },
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const infoEmojiElement = {
    id: "info_emoji",
    name: "emoji",
    disabled: () => false,
    color: COLORS.infoEmoji,
    icon: emojiIcon,
    subMenu: (params) => {
        const emojiElements = [
            {
                id: "emoji_more",
                name: "more",
                disabled: () => false,
                color: COLORS.infoEmoji,
                icon: emojiIcon,
                action: (params) => {
                    params.emojiTable.showTable((emoji) => {
                        const targetPlayer = params.selected === params.game.myPlayer()
                            ? AllPlayers
                            : params.selected;
                        params.playerActionHandler.handleEmoji(targetPlayer, flattenedEmojiTable.indexOf(emoji));
                        params.emojiTable.hideTable();
                    });
                },
            },
        ];
        const emojiCount = 8;
        for (let i = 0; i < emojiCount; i++) {
            emojiElements.push({
                id: `emoji_${i}`,
                name: flattenedEmojiTable[i],
                text: flattenedEmojiTable[i],
                disabled: () => false,
                fontSize: "25px",
                action: (params) => {
                    const targetPlayer = params.selected === params.game.myPlayer()
                        ? AllPlayers
                        : params.selected;
                    params.playerActionHandler.handleEmoji(targetPlayer, i);
                    params.closeMenu();
                },
            });
        }
        return emojiElements;
    },
};
export const infoMenuElement = {
    id: Slot.Info,
    name: "info",
    disabled: (params) => !params.selected || params.game.inSpawnPhase(),
    icon: infoIcon,
    color: COLORS.info,
    action: (params) => {
        params.playerPanel.show(params.playerActions, params.tile);
    },
};
function getAllEnabledUnits(myPlayer, config) {
    const units = new Set();
    const addIfEnabled = (unitType) => {
        if (!config.isUnitDisabled(unitType)) {
            units.add(unitType);
        }
    };
    if (myPlayer) {
        Structures.types.forEach(addIfEnabled);
    }
    else {
        BuildableAttacks.types.forEach(addIfEnabled);
    }
    return units;
}
function createMenuElements(params, filterType, elementIdPrefix) {
    const unitTypes = getAllEnabledUnits(params.selected === params.myPlayer, params.game.config());
    return flattenedBuildTable
        .filter((item) => unitTypes.has(item.unitType) &&
        (filterType === "attack"
            ? BuildableAttacks.has(item.unitType)
            : !BuildableAttacks.has(item.unitType)))
        .map((item) => {
        const canBuildOrUpgrade = params.buildMenu.canBuildOrUpgrade(item);
        return {
            id: `${elementIdPrefix}_${item.unitType}`,
            name: item.key
                ? item.key.replace("unit_type.", "")
                : item.unitType.toString(),
            disabled: () => !canBuildOrUpgrade,
            color: canBuildOrUpgrade
                ? filterType === "attack"
                    ? COLORS.attack
                    : COLORS.building
                : undefined,
            icon: item.icon,
            tooltipItems: [
                { text: translateText(item.key ?? ""), className: "title" },
                {
                    text: translateText(item.description ?? ""),
                    className: "description",
                },
                {
                    text: `${renderNumber(params.buildMenu.cost(item))} ${translateText("player_panel.gold")}`,
                    className: "cost",
                },
                item.countable
                    ? { text: `${params.buildMenu.count(item)}x`, className: "count" }
                    : null,
            ].filter((tooltipItem) => tooltipItem !== null),
            action: (params) => {
                const buildableUnit = params.playerActions.buildableUnits.find((bu) => bu.type === item.unitType);
                if (buildableUnit === undefined) {
                    return;
                }
                if (canBuildOrUpgrade) {
                    params.buildMenu.sendBuildOrUpgrade(buildableUnit, params.tile);
                }
                params.closeMenu();
            },
        };
    });
}
export const attackMenuElement = {
    id: Slot.Attack,
    name: "radial_attack",
    disabled: (params) => params.game.inSpawnPhase(),
    icon: swordIcon,
    color: COLORS.attack,
    subMenu: (params) => {
        if (params === undefined)
            return [];
        return createMenuElements(params, "attack", "attack");
    },
};
const donateGoldRadialElement = {
    id: Slot.Attack,
    name: "radial_donate_gold",
    disabled: (params) => params.game.inSpawnPhase() ||
        !params.playerActions?.interaction?.canDonateGold,
    icon: donateGoldIcon,
    color: "#EAB308",
    action: (params) => {
        if (!params.selected)
            return;
        params.playerPanel.openSendGoldModal(params.playerActions, params.tile, params.selected);
    },
};
export const deleteUnitElement = {
    id: Slot.Delete,
    name: "delete",
    cooldown: (params) => params.myPlayer.deleteUnitCooldown(),
    disabled: (params) => {
        const tileOwner = params.game.owner(params.tile);
        const isLand = params.game.isLand(params.tile);
        if (!tileOwner.isPlayer() || tileOwner.id() !== params.myPlayer.id()) {
            return true;
        }
        if (!isLand) {
            return true;
        }
        if (params.game.inSpawnPhase()) {
            return true;
        }
        if (params.myPlayer.deleteUnitCooldown() > 0) {
            return true;
        }
        const DELETE_SELECTION_RADIUS = 5;
        const myUnits = params.myPlayer
            .units()
            .filter((unit) => !unit.isUnderConstruction() &&
            unit.markedForDeletion() === false &&
            params.game.manhattanDist(unit.tile(), params.tile) <=
                DELETE_SELECTION_RADIUS);
        return myUnits.length === 0;
    },
    icon: xIcon,
    color: COLORS.delete,
    tooltipKeys: [
        {
            key: "radial_menu.delete_unit_title",
            className: "title",
        },
        {
            key: "radial_menu.delete_unit_description",
            className: "description",
        },
    ],
    action: (params) => {
        const DELETE_SELECTION_RADIUS = 5;
        const myUnits = params.myPlayer
            .units()
            .filter((unit) => params.game.manhattanDist(unit.tile(), params.tile) <=
            DELETE_SELECTION_RADIUS);
        if (myUnits.length > 0) {
            myUnits.sort((a, b) => params.game.manhattanDist(a.tile(), params.tile) -
                params.game.manhattanDist(b.tile(), params.tile));
            params.playerActionHandler.handleDeleteUnit(myUnits[0].id());
        }
        params.closeMenu();
    },
};
export const buildMenuElement = {
    id: Slot.Build,
    name: "build",
    disabled: (params) => params.game.inSpawnPhase(),
    icon: buildIcon,
    color: COLORS.build,
    subMenu: (params) => {
        if (params === undefined)
            return [];
        return createMenuElements(params, "build", "build");
    },
};
export const boatMenuElement = {
    id: Slot.Boat,
    name: "boat",
    disabled: (params) => !params.playerActions.buildableUnits.some((unit) => unit.type === UnitType.TransportShip && unit.canBuild),
    icon: boatIcon,
    color: COLORS.boat,
    action: async (params) => {
        params.playerActionHandler.handleBoatAttack(params.myPlayer, params.tile);
        params.closeMenu();
    },
};
export const centerButtonElement = {
    disabled: (params) => {
        const tileOwner = params.game.owner(params.tile);
        const isLand = params.game.isLand(params.tile);
        if (!isLand) {
            return true;
        }
        if (params.game.inSpawnPhase()) {
            if (params.game.config().isRandomSpawn()) {
                return true;
            }
            if (tileOwner.isPlayer()) {
                return true;
            }
            return false;
        }
        if (isFriendlyTarget(params) && !isDisconnectedTarget(params)) {
            return !params.playerActions.interaction?.canDonateTroops;
        }
        return !params.playerActions.canAttack;
    },
    action: (params) => {
        if (params.game.inSpawnPhase()) {
            params.playerActionHandler.handleSpawn(params.tile);
        }
        else {
            if (isFriendlyTarget(params) && !isDisconnectedTarget(params)) {
                const selectedPlayer = params.selected;
                const ratio = params.uiState?.attackRatio ?? 1;
                const troopsToDonate = Math.floor(ratio * params.myPlayer.troops());
                if (troopsToDonate > 0) {
                    params.playerActionHandler.handleDonateTroops(selectedPlayer, troopsToDonate);
                }
            }
            else {
                params.playerActionHandler.handleAttack(params.myPlayer, params.selected?.id() ?? null);
            }
        }
        params.closeMenu();
    },
};
export const rootMenuElement = {
    id: "root",
    name: "root",
    disabled: () => false,
    icon: infoIcon,
    color: COLORS.info,
    subMenu: (params) => {
        const isAllied = params.selected?.isAlliedWith(params.myPlayer);
        const isDisconnected = isDisconnectedTarget(params);
        const tileOwner = params.game.owner(params.tile);
        const isOwnTerritory = tileOwner.isPlayer() &&
            tileOwner.id() === params.myPlayer.id();
        const inExtensionWindow = params.playerActions.interaction?.allianceInfo?.inExtensionWindow;
        const menuItems = [
            infoMenuElement,
            ...(isOwnTerritory
                ? [deleteUnitElement, allyRequestElement, buildMenuElement]
                : [
                    isAllied && !isDisconnected ? allyBreakElement : boatMenuElement,
                    inExtensionWindow ? allyExtendElement : allyRequestElement,
                    isFriendlyTarget(params) && !isDisconnected
                        ? donateGoldRadialElement
                        : attackMenuElement,
                ]),
        ];
        return menuItems.filter((item) => item !== null);
    },
};
//# sourceMappingURL=RadialMenuElements.js.map