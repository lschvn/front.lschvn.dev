import { PlayerType, } from "../game/Game";
import { PseudoRandom } from "../PseudoRandom";
import { simpleHash } from "../Util";
import { BotExecution } from "./BotExecution";
import { PlayerExecution } from "./PlayerExecution";
import { getSpawnTiles } from "./Util";
export class SpawnExecution {
    constructor(gameID, playerInfo, tile) {
        this.playerInfo = playerInfo;
        this.tile = tile;
        this.active = true;
        this.random = new PseudoRandom(simpleHash(playerInfo.id) + simpleHash(gameID));
    }
    init(mg, ticks) {
        this.mg = mg;
    }
    tick(ticks) {
        this.active = false;
        if (!this.mg.inSpawnPhase()) {
            this.active = false;
            return;
        }
        let player = null;
        if (this.mg.hasPlayer(this.playerInfo.id)) {
            player = this.mg.player(this.playerInfo.id);
        }
        else {
            player = this.mg.addPlayer(this.playerInfo);
        }
        // Security: If random spawn is enabled, prevent players from re-rolling their spawn location
        if (this.mg.config().isRandomSpawn() && player.hasSpawned()) {
            return;
        }
        player.tiles().forEach((t) => player.relinquish(t));
        const spawn = this.getSpawn(this.tile);
        if (!spawn) {
            console.warn(`SpawnExecution: cannot spawn ${this.playerInfo.name}`);
            return;
        }
        spawn.tiles.forEach((t) => {
            player.conquer(t);
        });
        if (!player.hasSpawned()) {
            this.mg.addExecution(new PlayerExecution(player));
            if (player.type() === PlayerType.Bot) {
                this.mg.addExecution(new BotExecution(player));
            }
        }
        player.setSpawnTile(spawn.center);
    }
    isActive() {
        return this.active;
    }
    activeDuringSpawnPhase() {
        return true;
    }
    getSpawn(center) {
        if (center !== undefined) {
            const tiles = getSpawnTiles(this.mg, center, false);
            if (!tiles.length) {
                return;
            }
            return { center, tiles };
        }
        const spawnArea = this.getTeamSpawnArea();
        let tries = 0;
        while (tries < SpawnExecution.MAX_SPAWN_TRIES) {
            tries++;
            const center = this.randTile(spawnArea);
            if (!this.mg.isLand(center) ||
                this.mg.hasOwner(center) ||
                this.mg.isBorder(center)) {
                continue;
            }
            const isOtherPlayerSpawnedNearby = this.mg
                .allPlayers()
                .filter((player) => player.id() !== this.playerInfo.id)
                .some((player) => {
                const spawnTile = player.spawnTile();
                if (spawnTile === undefined) {
                    return false;
                }
                return (this.mg.manhattanDist(spawnTile, center) <
                    this.mg.config().minDistanceBetweenPlayers());
            });
            if (isOtherPlayerSpawnedNearby) {
                continue;
            }
            const tiles = getSpawnTiles(this.mg, center, true);
            if (!tiles) {
                // if some of the spawn tile is outside of the land, we want to find another spawn tile
                continue;
            }
            return { center, tiles };
        }
        return;
    }
    randTile(area) {
        if (area) {
            const x = this.random.nextInt(area.x, area.x + area.width);
            const y = this.random.nextInt(area.y, area.y + area.height);
            return this.mg.ref(x, y);
        }
        const x = this.random.nextInt(0, this.mg.width());
        const y = this.random.nextInt(0, this.mg.height());
        return this.mg.ref(x, y);
    }
    getTeamSpawnArea() {
        const player = this.mg.player(this.playerInfo.id);
        const team = player.team();
        if (team === null) {
            return undefined;
        }
        return this.mg.teamSpawnArea(team);
    }
}
SpawnExecution.MAX_SPAWN_TRIES = 1000;
//# sourceMappingURL=SpawnExecution.js.map