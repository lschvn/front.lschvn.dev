export var GameUpdateType;
(function (GameUpdateType) {
    // Tile updates are delivered via `packedTileUpdates` on the outer GameUpdateViewData.
    GameUpdateType[GameUpdateType["Tile"] = 0] = "Tile";
    GameUpdateType[GameUpdateType["Unit"] = 1] = "Unit";
    GameUpdateType[GameUpdateType["Player"] = 2] = "Player";
    GameUpdateType[GameUpdateType["DisplayEvent"] = 3] = "DisplayEvent";
    GameUpdateType[GameUpdateType["DisplayChatEvent"] = 4] = "DisplayChatEvent";
    GameUpdateType[GameUpdateType["AllianceRequest"] = 5] = "AllianceRequest";
    GameUpdateType[GameUpdateType["AllianceRequestReply"] = 6] = "AllianceRequestReply";
    GameUpdateType[GameUpdateType["BrokeAlliance"] = 7] = "BrokeAlliance";
    GameUpdateType[GameUpdateType["AllianceExpired"] = 8] = "AllianceExpired";
    GameUpdateType[GameUpdateType["AllianceExtension"] = 9] = "AllianceExtension";
    GameUpdateType[GameUpdateType["TargetPlayer"] = 10] = "TargetPlayer";
    GameUpdateType[GameUpdateType["Emoji"] = 11] = "Emoji";
    GameUpdateType[GameUpdateType["Win"] = 12] = "Win";
    GameUpdateType[GameUpdateType["Hash"] = 13] = "Hash";
    GameUpdateType[GameUpdateType["UnitIncoming"] = 14] = "UnitIncoming";
    GameUpdateType[GameUpdateType["BonusEvent"] = 15] = "BonusEvent";
    GameUpdateType[GameUpdateType["RailroadDestructionEvent"] = 16] = "RailroadDestructionEvent";
    GameUpdateType[GameUpdateType["RailroadConstructionEvent"] = 17] = "RailroadConstructionEvent";
    GameUpdateType[GameUpdateType["RailroadSnapEvent"] = 18] = "RailroadSnapEvent";
    GameUpdateType[GameUpdateType["ConquestEvent"] = 19] = "ConquestEvent";
    GameUpdateType[GameUpdateType["EmbargoEvent"] = 20] = "EmbargoEvent";
    GameUpdateType[GameUpdateType["GamePaused"] = 21] = "GamePaused";
})(GameUpdateType || (GameUpdateType = {}));
//# sourceMappingURL=GameUpdates.js.map