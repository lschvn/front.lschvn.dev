import { AABatteryExecution } from "../../../src/core/execution/AABatteryExecution";
import { RadarStationExecution } from "../../../src/core/execution/RadarStationExecution";
import {
  AirMissionPhase,
  AirMissionType,
  Game,
  Player,
  PlayerInfo,
  PlayerType,
  Unit,
  UnitType,
} from "../../../src/core/game/Game";
import { TileRef } from "../../../src/core/game/GameMap";
import { GameUpdateType } from "../../../src/core/game/GameUpdates";
import { setup } from "../../util/Setup";
import { TestConfig } from "../../util/TestConfig";

class AntiAirTestConfig extends TestConfig {
  airbaseOperationalRange(): number {
    return 40;
  }

  aaBatteryRange(): number {
    return 18;
  }

  aaBatteryCooldown(): number {
    return 4;
  }

  radarStationRange(): number {
    return 36;
  }
}

function executeTicks(game: Game, ticks: number) {
  let updates = game.executeNextTick();
  for (let i = 1; i < ticks; i++) {
    updates = game.executeNextTick();
  }
  return updates;
}

function seedTerritory(
  game: Game,
  player: Player,
  centerX: number,
  centerY: number,
  radius: number,
): TileRef {
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

function buildOwnedStructure(
  player: Player,
  type:
    | UnitType.Airbase
    | UnitType.AABattery
    | UnitType.RadarStation
    | UnitType.City,
  tile: TileRef,
): Unit {
  const spawnTile = player.canBuild(type, tile);
  if (spawnTile === false) {
    throw new Error(`unable to build ${type}`);
  }
  return player.buildUnit(type, spawnTile, {});
}

function buildAirborneBomber(
  player: Player,
  airbase: Unit,
  tile: TileRef,
  targetTile: TileRef,
): Unit {
  return player.buildUnit(UnitType.BomberSquadron, tile, {
    airbaseId: airbase.id(),
    missionType: AirMissionType.StrategicBombing,
    missionPhase: AirMissionPhase.OnStation,
    missionTicksRemaining: 20,
    targetTile,
  });
}

async function createScenario() {
  const game = await setup(
    "big_plains",
    {
      infiniteGold: true,
      infiniteTroops: true,
      instantBuild: true,
    },
    [],
    __dirname,
    AntiAirTestConfig,
  );
  const attacker = game.addPlayer(
    new PlayerInfo("attacker", PlayerType.Human, null, "a"),
  );
  const defender = game.addPlayer(
    new PlayerInfo("defender", PlayerType.Human, null, "d"),
  );
  const y = Math.floor(game.height() / 2);
  const attackerTile = seedTerritory(game, attacker, 30, y, 8);
  const defenderTile = seedTerritory(game, defender, 50, y, 8);
  executeTicks(game, 12);
  const airbase = buildOwnedStructure(attacker, UnitType.Airbase, attackerTile);
  return { game, attacker, defender, airbase, defenderTile, y };
}

describe("AABatteryExecution", () => {
  test("radar station emits an incoming warning for hostile bombers", async () => {
    const { game, attacker, defender, airbase, defenderTile, y } =
      await createScenario();
    const radar = buildOwnedStructure(
      defender,
      UnitType.RadarStation,
      game.ref(48, y),
    );
    game.addExecution(new RadarStationExecution(radar));
    const bomber = buildAirborneBomber(
      attacker,
      airbase,
      game.ref(44, y),
      defenderTile,
    );

    const updates = game.executeNextTick();
    const radarWarnings = updates[GameUpdateType.UnitIncoming] ?? [];

    expect(radarWarnings.some((event) => event.unitID === bomber.id())).toBe(
      true,
    );
  });

  test("radar support improves local anti-air reaction speed", async () => {
    const baseScenario = await createScenario();
    const baseBattery = buildOwnedStructure(
      baseScenario.defender,
      UnitType.AABattery,
      baseScenario.game.ref(48, baseScenario.y),
    );
    baseScenario.game.addExecution(new AABatteryExecution(baseBattery));
    const baseBomber = buildAirborneBomber(
      baseScenario.attacker,
      baseScenario.airbase,
      baseScenario.game.ref(47, baseScenario.y),
      baseScenario.defenderTile,
    );
    executeTicks(baseScenario.game, 2);
    const unsupportedHealth = baseBomber.health();

    const radarScenario = await createScenario();
    const radar = buildOwnedStructure(
      radarScenario.defender,
      UnitType.RadarStation,
      radarScenario.game.ref(48, radarScenario.y),
    );
    const radarBattery = buildOwnedStructure(
      radarScenario.defender,
      UnitType.AABattery,
      radarScenario.game.ref(49, radarScenario.y),
    );
    radarScenario.game.addExecution(
      new RadarStationExecution(radar),
      new AABatteryExecution(radarBattery),
    );
    const supportedBomber = buildAirborneBomber(
      radarScenario.attacker,
      radarScenario.airbase,
      radarScenario.game.ref(47, radarScenario.y),
      radarScenario.defenderTile,
    );
    executeTicks(radarScenario.game, 2);

    expect(supportedBomber.health()).toBeLessThan(unsupportedHealth);
  });

  test("overlapping AA batteries have diminishing returns", async () => {
    const oneBatteryScenario = await createScenario();
    const oneBattery = buildOwnedStructure(
      oneBatteryScenario.defender,
      UnitType.AABattery,
      oneBatteryScenario.game.ref(48, oneBatteryScenario.y),
    );
    oneBatteryScenario.game.addExecution(new AABatteryExecution(oneBattery));
    const bomberOne = buildAirborneBomber(
      oneBatteryScenario.attacker,
      oneBatteryScenario.airbase,
      oneBatteryScenario.game.ref(47, oneBatteryScenario.y),
      oneBatteryScenario.defenderTile,
    );
    const oneBatteryHealth = bomberOne.health();
    executeTicks(oneBatteryScenario.game, 4);
    const oneBatteryDamage = oneBatteryHealth - bomberOne.health();

    const threeBatteryScenario = await createScenario();
    const batteries = [
      buildOwnedStructure(
        threeBatteryScenario.defender,
        UnitType.AABattery,
        threeBatteryScenario.game.ref(48, threeBatteryScenario.y),
      ),
      buildOwnedStructure(
        threeBatteryScenario.defender,
        UnitType.AABattery,
        threeBatteryScenario.game.ref(49, threeBatteryScenario.y),
      ),
      buildOwnedStructure(
        threeBatteryScenario.defender,
        UnitType.AABattery,
        threeBatteryScenario.game.ref(48, threeBatteryScenario.y + 1),
      ),
    ];
    threeBatteryScenario.game.addExecution(
      ...batteries.map((battery) => new AABatteryExecution(battery)),
    );
    const bomberThree = buildAirborneBomber(
      threeBatteryScenario.attacker,
      threeBatteryScenario.airbase,
      threeBatteryScenario.game.ref(47, threeBatteryScenario.y),
      threeBatteryScenario.defenderTile,
    );
    const threeBatteryHealth = bomberThree.health();
    executeTicks(threeBatteryScenario.game, 4);
    const threeBatteryDamage = threeBatteryHealth - bomberThree.health();

    expect(threeBatteryDamage).toBeGreaterThan(oneBatteryDamage);
    expect(threeBatteryDamage).toBeLessThan(oneBatteryDamage * 3);
  });

  test("AA batteries can shoot down bombers that linger in range", async () => {
    const { game, attacker, defender, airbase, defenderTile, y } =
      await createScenario();
    const batteries = [
      buildOwnedStructure(defender, UnitType.AABattery, game.ref(48, y)),
      buildOwnedStructure(defender, UnitType.AABattery, game.ref(49, y)),
      buildOwnedStructure(defender, UnitType.AABattery, game.ref(48, y + 1)),
    ];
    game.addExecution(
      ...batteries.map((battery) => new AABatteryExecution(battery)),
    );
    const bomber = buildAirborneBomber(
      attacker,
      airbase,
      game.ref(47, y),
      defenderTile,
    );

    executeTicks(game, 12);

    expect(bomber.isActive()).toBe(false);
  });
});
