import { LaunchAirMissionExecution } from "../../../src/core/execution/LaunchAirMissionExecution";
import { ProduceAirSquadronExecution } from "../../../src/core/execution/ProduceAirSquadronExecution";
import { AirMissionPhase, AirMissionType, PlayerInfo, PlayerType, UnitType, } from "../../../src/core/game/Game";
import { setup } from "../../util/Setup";
import { TestConfig } from "../../util/TestConfig";
class ShortRangeAirConfig extends TestConfig {
    airbaseOperationalRange() {
        return 12;
    }
}
function executeTicks(game, ticks) {
    for (let i = 0; i < ticks; i++) {
        game.executeNextTick();
    }
}
function seedTerritory(game, player, centerX, centerY, radius) {
    for (let x = centerX - radius; x <= centerX + radius; x++) {
        for (let y = centerY - radius; y <= centerY + radius; y++) {
            if (!game.isValidCoord(x, y)) {
                continue;
            }
            const tile = game.ref(x, y);
            if (game.isLand(tile)) {
                player.conquer(tile);
            }
        }
    }
    const spawnTile = game.ref(centerX, centerY);
    player.setSpawnTile(spawnTile);
    return spawnTile;
}
function buildOwnedStructure(player, type, tile) {
    const spawnTile = player.canBuild(type, tile);
    if (spawnTile === false) {
        throw new Error(`unable to build ${type}`);
    }
    return player.buildUnit(type, spawnTile, {});
}
describe("AirMissionExecution", () => {
    test("rejects bomber launch outside configured airbase range", async () => {
        const game = await setup("big_plains", {
            infiniteGold: true,
            infiniteTroops: true,
            instantBuild: true,
        }, [], __dirname, ShortRangeAirConfig);
        const attackerInfo = new PlayerInfo("attacker", PlayerType.Human, null, "a");
        const defenderInfo = new PlayerInfo("defender", PlayerType.Human, null, "d");
        const attacker = game.addPlayer(attackerInfo);
        const defender = game.addPlayer(defenderInfo);
        const y = Math.floor(game.height() / 2);
        const attackerTile = seedTerritory(game, attacker, 20, y, 8);
        const defenderTile = seedTerritory(game, defender, game.width() - 20, y, 8);
        executeTicks(game, 12);
        const airbase = buildOwnedStructure(attacker, UnitType.Airbase, attackerTile);
        game.addExecution(new ProduceAirSquadronExecution(attacker, airbase.id(), UnitType.BomberSquadron));
        executeTicks(game, 3);
        const bomber = attacker.units(UnitType.BomberSquadron)[0];
        expect(bomber).toBeDefined();
        expect(game.manhattanDist(airbase.tile(), defenderTile)).toBeGreaterThan(12);
        game.addExecution(new LaunchAirMissionExecution(attacker, airbase.id(), UnitType.BomberSquadron, AirMissionType.StrategicBombing, defenderTile));
        executeTicks(game, 2);
        expect(bomber.airMissionPhase()).toBe(AirMissionPhase.Ready);
        expect(bomber.tile()).toBe(airbase.tile());
    });
    test("fighters enter rearming and recover to ready after mission completion", async () => {
        const game = await setup("big_plains", {
            infiniteGold: true,
            infiniteTroops: true,
            instantBuild: true,
        });
        const attacker = game.addPlayer(new PlayerInfo("attacker", PlayerType.Human, null, "a"));
        const attackerTile = seedTerritory(game, attacker, 25, Math.floor(game.height() / 2), 8);
        executeTicks(game, 12);
        const airbase = buildOwnedStructure(attacker, UnitType.Airbase, attackerTile);
        game.addExecution(new ProduceAirSquadronExecution(attacker, airbase.id(), UnitType.FighterSquadron));
        executeTicks(game, 3);
        const fighter = attacker.units(UnitType.FighterSquadron)[0];
        game.addExecution(new LaunchAirMissionExecution(attacker, airbase.id(), UnitType.FighterSquadron, AirMissionType.PatrolArea, airbase.tile()));
        executeTicks(game, 60);
        expect(fighter.airMissionPhase()).toBe(AirMissionPhase.Rearming);
        const readyAt = fighter.rearmCompleteTick();
        expect(readyAt).toBeDefined();
        executeTicks(game, (readyAt ?? game.ticks()) - game.ticks() + 1);
        expect(fighter.airMissionPhase()).toBe(AirMissionPhase.Ready);
        expect(fighter.rearmCompleteTick()).toBeUndefined();
    });
    test("fighter patrols intercept bombers near the defended target", async () => {
        const game = await setup("big_plains", {
            infiniteGold: true,
            infiniteTroops: true,
            instantBuild: true,
        });
        const attacker = game.addPlayer(new PlayerInfo("attacker", PlayerType.Human, null, "a"));
        const defender = game.addPlayer(new PlayerInfo("defender", PlayerType.Human, null, "d"));
        const y = Math.floor(game.height() / 2);
        const attackerTile = seedTerritory(game, attacker, 30, y, 8);
        const defenderTile = seedTerritory(game, defender, 60, y, 8);
        executeTicks(game, 12);
        const attackerAirbase = buildOwnedStructure(attacker, UnitType.Airbase, attackerTile);
        const defenderAirbase = buildOwnedStructure(defender, UnitType.Airbase, defenderTile);
        game.addExecution(new ProduceAirSquadronExecution(attacker, attackerAirbase.id(), UnitType.BomberSquadron), new ProduceAirSquadronExecution(defender, defenderAirbase.id(), UnitType.FighterSquadron));
        executeTicks(game, 4);
        const bomber = attacker.units(UnitType.BomberSquadron)[0];
        const startingHealth = bomber.health();
        game.addExecution(new LaunchAirMissionExecution(attacker, attackerAirbase.id(), UnitType.BomberSquadron, AirMissionType.StrategicBombing, defenderAirbase.tile()), new LaunchAirMissionExecution(defender, defenderAirbase.id(), UnitType.FighterSquadron, AirMissionType.PatrolArea, defenderAirbase.tile()));
        executeTicks(game, 35);
        expect(bomber.isActive() === false || bomber.health() < startingHealth).toBe(true);
    });
    test("strategic bombing removes a high value structure at the target", async () => {
        const game = await setup("big_plains", {
            infiniteGold: true,
            infiniteTroops: true,
            instantBuild: true,
        });
        const attacker = game.addPlayer(new PlayerInfo("attacker", PlayerType.Human, null, "a"));
        const defender = game.addPlayer(new PlayerInfo("defender", PlayerType.Human, null, "d"));
        const y = Math.floor(game.height() / 2);
        const attackerTile = seedTerritory(game, attacker, 30, y, 8);
        const defenderTile = seedTerritory(game, defender, 70, y, 8);
        executeTicks(game, 12);
        const attackerAirbase = buildOwnedStructure(attacker, UnitType.Airbase, attackerTile);
        const targetFactory = buildOwnedStructure(defender, UnitType.Factory, defenderTile);
        game.addExecution(new ProduceAirSquadronExecution(attacker, attackerAirbase.id(), UnitType.BomberSquadron));
        executeTicks(game, 3);
        game.addExecution(new LaunchAirMissionExecution(attacker, attackerAirbase.id(), UnitType.BomberSquadron, AirMissionType.StrategicBombing, targetFactory.tile()));
        executeTicks(game, 30);
        expect(targetFactory.isActive()).toBe(false);
    });
});
//# sourceMappingURL=AirMissionExecution.test.js.map