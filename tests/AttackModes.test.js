import { ATTACK_MODE_BALANCE, DEFAULT_ATTACK_MODE, } from "../src/core/configuration/AttackModeBalance";
import { AttackExecution } from "../src/core/execution/AttackExecution";
import { AttackMode, PlayerInfo, PlayerType, UnitType, } from "../src/core/game/Game";
import { setup } from "./util/Setup";
import { executeTicks } from "./util/utils";
describe("Attack modes", () => {
    let game;
    let attacker;
    let defender;
    const attackerInfo = new PlayerInfo("attacker", PlayerType.Human, null, "attacker_id");
    const defenderInfo = new PlayerInfo("defender", PlayerType.Human, null, "defender_id");
    function claimRectangle(player, startX, endX, startY, endY) {
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                player.conquer(game.ref(x, y));
            }
        }
    }
    beforeEach(async () => {
        game = await setup("plains", {
            infiniteGold: true,
            instantBuild: true,
            infiniteTroops: true,
        });
        game.addPlayer(attackerInfo);
        game.addPlayer(defenderInfo);
        while (game.inSpawnPhase()) {
            game.executeNextTick();
        }
        attacker = game.player(attackerInfo.id);
        defender = game.player(defenderInfo.id);
        attacker.addTroops(20000);
        defender.addTroops(20000);
    });
    test("uses the default attack mode when none is provided", () => {
        attacker.conquer(game.ref(50, 50));
        defender.conquer(game.ref(51, 50));
        game.addExecution(new AttackExecution(100, attacker, defender.id()));
        game.executeNextTick();
        expect(attacker.outgoingAttacks()).toHaveLength(1);
        expect(attacker.outgoingAttacks()[0].mode()).toBe(DEFAULT_ATTACK_MODE);
    });
    test("keeps simultaneous attacks with different modes separate", () => {
        attacker.conquer(game.ref(50, 50));
        defender.conquer(game.ref(51, 50));
        game.addExecution(new AttackExecution(50, attacker, defender.id(), null, true, AttackMode.Blitz), new AttackExecution(50, attacker, defender.id(), null, true, AttackMode.Siege));
        game.executeNextTick();
        expect(attacker.outgoingAttacks()).toHaveLength(2);
        expect(attacker.outgoingAttacks().map((attack) => attack.mode())).toEqual(expect.arrayContaining([AttackMode.Blitz, AttackMode.Siege]));
    });
    test("siege suppression expires automatically after the configured duration", () => {
        const sourceTile = game.ref(50, 50);
        const frontlineTile = game.ref(51, 50);
        attacker.conquer(sourceTile);
        defender.conquer(frontlineTile);
        claimRectangle(defender, 70, 80, 40, 50);
        game.addExecution(new AttackExecution(30, attacker, defender.id(), sourceTile, true, AttackMode.Siege));
        game.executeNextTick();
        game.executeNextTick();
        expect(game.owner(frontlineTile)).toBe(attacker);
        expect(game.hasSuppression(frontlineTile)).toBe(true);
        executeTicks(game, ATTACK_MODE_BALANCE[AttackMode.Siege].frontlineSuppressionDuration + 2);
        expect(game.hasSuppression(frontlineTile)).toBe(false);
    });
    test("raid damages nearby economic targets and removes defender gold", () => {
        const sourceTile = game.ref(50, 50);
        const cityTile = game.ref(56, 50);
        attacker.conquer(sourceTile);
        for (let x = 51; x <= 60; x++) {
            defender.conquer(game.ref(x, 50));
        }
        claimRectangle(defender, 70, 80, 40, 50);
        const city = defender.buildUnit(UnitType.City, cityTile, {});
        defender.addGold(500000n);
        const startingGold = defender.gold();
        game.addExecution(new AttackExecution(60, attacker, defender.id(), sourceTile, true, AttackMode.Raid));
        game.executeNextTick();
        executeTicks(game, ATTACK_MODE_BALANCE[AttackMode.Raid].buildingDamageIntervalTicks * 5);
        expect(city.isActive()).toBe(false);
        expect(defender.gold()).toBeLessThan(startingGold);
    });
});
//# sourceMappingURL=AttackModes.test.js.map