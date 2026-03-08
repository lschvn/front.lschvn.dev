import { GOLD_INDEX_STEAL, GOLD_INDEX_TRADE, GOLD_INDEX_TRAIN_OTHER, GOLD_INDEX_TRAIN_SELF, GOLD_INDEX_WAR, PLAYER_INDEX_BOT, PLAYER_INDEX_HUMAN, PLAYER_INDEX_NATION, } from "../../../../core/StatsSchemas";
export var RankType;
(function (RankType) {
    RankType["ConquestHumans"] = "ConquestHumans";
    RankType["ConquestBots"] = "ConquestBots";
    RankType["Atoms"] = "Atoms";
    RankType["Hydros"] = "Hydros";
    RankType["MIRV"] = "MIRV";
    RankType["TotalGold"] = "TotalGold";
    RankType["StolenGold"] = "StolenGold";
    RankType["NavalTrade"] = "NavalTrade";
    RankType["TrainTrade"] = "TrainTrade";
    RankType["ConqueredGold"] = "ConqueredGold";
    RankType["Lifetime"] = "Lifetime";
})(RankType || (RankType = {}));
function hasPlayed(player) {
    return (player.stats !== undefined &&
        (player.stats.units !== undefined ||
            player.stats.killedAt !== undefined ||
            player.stats.conquests !== undefined));
}
export class Ranking {
    constructor(session) {
        this.duration = session.info.duration;
        this.players = this.summarizePlayers(session);
    }
    get allPlayers() {
        return this.players;
    }
    sortedBy(type) {
        return [...this.players].sort((a, b) => this.getAdjustedScore(b, type) - this.getAdjustedScore(a, type));
    }
    score(player, type) {
        return this.getScore(player, type);
    }
    summarizePlayers(session) {
        const players = {};
        for (const player of session.info.players) {
            if (player === undefined || !hasPlayed(player))
                continue;
            const stats = player.stats;
            const match = player.username.match(/^\[(.*?)\]\s*(.*)$/);
            let username = player.username;
            if (player.clanTag && match) {
                username = match[2];
            }
            const gold = (stats.gold ?? []).map((v) => BigInt(v ?? 0));
            const conquests = (stats.conquests ?? []).map((v) => BigInt(v ?? 0));
            players[player.clientID] = {
                id: player.clientID,
                rawUsername: player.username,
                username,
                tag: player.clanTag,
                conquests,
                flag: player.cosmetics?.flag ?? undefined,
                killedAt: stats.killedAt !== null ? Number(stats.killedAt) : undefined,
                gold,
                atoms: Number(stats.bombs?.abomb?.[0]) || 0,
                hydros: Number(stats.bombs?.hbomb?.[0]) || 0,
                mirv: Number(stats.bombs?.mirv?.[0]) || 0,
                winner: false,
            };
        }
        const winnerBlock = session.info.winner;
        if (winnerBlock !== undefined &&
            Array.isArray(winnerBlock) &&
            winnerBlock.length > 0) {
            if (winnerBlock[0] === "player") {
                const id = winnerBlock[1];
                if (players[id])
                    players[id].winner = true;
            }
            else if (winnerBlock[0] === "team") {
                // First element is the team color, which we don't care for
                for (let i = 2; i < winnerBlock.length; i++) {
                    const id = winnerBlock[i];
                    if (players[id]) {
                        players[id].winner = true;
                    }
                }
            }
        }
        return Object.values(players);
    }
    getScore(player, type) {
        switch (type) {
            case RankType.Lifetime:
                if (player.killedAt) {
                    return (player.killedAt / Math.max(this.duration, 1)) * 10;
                }
                return 100;
            case RankType.ConquestHumans:
                return Number(player.conquests[PLAYER_INDEX_HUMAN] ?? 0n);
            case RankType.ConquestBots:
                return (Number(player.conquests[PLAYER_INDEX_BOT] ?? 0n) +
                    Number(player.conquests[PLAYER_INDEX_NATION] ?? 0n));
            case RankType.Atoms:
                return player.atoms;
            case RankType.Hydros:
                return player.hydros;
            case RankType.MIRV:
                return player.mirv;
            case RankType.TotalGold:
                return Number(player.gold.reduce((sum, gold) => sum + gold, 0n));
            case RankType.StolenGold:
                return Number(player.gold[GOLD_INDEX_STEAL] ?? 0n);
            case RankType.NavalTrade:
                return Number(player.gold[GOLD_INDEX_TRADE] ?? 0n);
            case RankType.ConqueredGold:
                return Number(player.gold[GOLD_INDEX_WAR] ?? 0n);
            case RankType.TrainTrade: {
                const ownTrains = player.gold[GOLD_INDEX_TRAIN_SELF] ?? 0n;
                const otherTrains = player.gold[GOLD_INDEX_TRAIN_OTHER] ?? 0n;
                return Number(ownTrains + otherTrains);
            }
        }
    }
    getAdjustedScore(player, type) {
        let score = this.getScore(player, type);
        // Other things being equals, winners should be better ranked than other players
        if (player.winner)
            score += 0.1;
        return score;
    }
}
//# sourceMappingURL=GameInfoRanking.js.map