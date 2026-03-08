import { describe, expect, it } from "vitest";
import {
  SUPPLY_ISOLATED_RESERVE_TICKS,
  SUPPLY_RECALC_INTERVAL_TICKS,
} from "../src/core/configuration/SupplyBalance";
import {
  Player,
  PlayerInfo,
  PlayerType,
  SupplyState,
  Unit,
  UnitType,
} from "../src/core/game/Game";
import { TileRef } from "../src/core/game/GameMap";
import { TrainStation } from "../src/core/game/TrainStation";
import { createGame, L, W } from "./core/pathfinding/_fixtures";

function addPlayer(game: ReturnType<typeof createGame>, name: string): Player {
  const info = new PlayerInfo(name, PlayerType.Human, null, `${name}_id`);
  return game.addPlayer(info);
}

function grantTerritory(
  player: Player,
  game: ReturnType<typeof createGame>,
  tiles: TileRef[],
): void {
  for (const tile of tiles) {
    player.conquer(tile);
  }
}

function recomputeSupply(
  game: ReturnType<typeof createGame>,
  tick: number,
): void {
  game.recomputeSupplyIfNeeded(tick);
}

function connectStations(
  game: ReturnType<typeof createGame>,
  ...units: Unit[]
): void {
  for (const unit of units) {
    unit.setTrainStation(true);
    game.railNetwork().connectStation(new TrainStation(game, unit));
  }
}

describe("SupplySystem", () => {
  it("propagates supply and extends logistics through factory rail relays", () => {
    const game = createGame({
      width: 110,
      height: 3,
      grid: new Array(110 * 3).fill(L),
    });
    const player = addPlayer(game, "relay");
    player.addGold(10_000_000n);

    const ownedTiles: TileRef[] = [];
    for (let x = 0; x < 110; x++) {
      ownedTiles.push(game.ref(x, 1));
    }
    grantTerritory(player, game, ownedTiles);

    const city = player.buildUnit(UnitType.City, game.ref(4, 1), {});
    recomputeSupply(game, 100);

    expect(game.supplyState(game.ref(12, 1))).toBe(SupplyState.Supplied);
    expect(game.supplyState(game.ref(52, 1))).toBe(SupplyState.Strained);
    expect(game.supplyState(game.ref(100, 1))).toBe(SupplyState.Isolated);

    const factory = player.buildUnit(UnitType.Factory, game.ref(72, 1), {});
    connectStations(game, city, factory);
    recomputeSupply(game, 200);

    expect(game.supplyState(game.ref(100, 1))).toBe(SupplyState.Supplied);
  });

  it("detects isolation, depletes reserves over time, and recovers after reconnection", () => {
    const game = createGame({
      width: 30,
      height: 3,
      grid: new Array(30 * 3).fill(L),
    });
    const player = addPlayer(game, "encircled");
    player.addGold(10_000_000n);

    const corridor: TileRef[] = [];
    for (let x = 0; x < 30; x++) {
      corridor.push(game.ref(x, 1));
    }
    grantTerritory(player, game, corridor);
    player.buildUnit(UnitType.City, game.ref(1, 1), {});

    recomputeSupply(game, 100);
    expect(game.supplyState(game.ref(20, 1))).toBe(SupplyState.Supplied);

    player.relinquish(game.ref(10, 1));
    recomputeSupply(game, 120);

    expect(game.supplyState(game.ref(20, 1))).toBe(SupplyState.Isolated);
    expect(game.isSupplyReserveDepleted(game.ref(20, 1))).toBe(false);

    recomputeSupply(
      game,
      120 + SUPPLY_ISOLATED_RESERVE_TICKS + SUPPLY_RECALC_INTERVAL_TICKS,
    );

    expect(game.supplyState(game.ref(20, 1))).toBe(SupplyState.Isolated);
    expect(game.isSupplyReserveDepleted(game.ref(20, 1))).toBe(true);

    player.conquer(game.ref(10, 1));
    recomputeSupply(
      game,
      120 + SUPPLY_ISOLATED_RESERVE_TICKS + SUPPLY_RECALC_INTERVAL_TICKS * 2,
    );

    expect(game.supplyState(game.ref(20, 1))).toBe(SupplyState.Supplied);
    expect(game.isSupplyReserveDepleted(game.ref(20, 1))).toBe(false);
  });

  it("blockades port-based overseas supply with enemy warships and restores it when the blockade is broken", () => {
    const game = createGame({
      width: 14,
      height: 7,
      grid: [
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        L,
        L,
        L,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        L,
        L,
        L,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        L,
        L,
        L,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
      ],
    });
    const owner = addPlayer(game, "owner");
    const raider = addPlayer(game, "raider");
    owner.addGold(10_000_000n);
    raider.addGold(10_000_000n);

    grantTerritory(owner, game, [
      game.ref(3, 1),
      game.ref(4, 1),
      game.ref(5, 1),
      game.ref(3, 2),
      game.ref(4, 2),
      game.ref(5, 2),
      game.ref(3, 3),
      game.ref(4, 3),
      game.ref(5, 3),
    ]);

    const portTile = game.ref(3, 2);
    owner.buildUnit(UnitType.Port, portTile, {});

    recomputeSupply(game, 100);
    expect(game.supplyState(game.ref(5, 3))).toBe(SupplyState.Supplied);

    raider.buildUnit(UnitType.Warship, game.ref(2, 2), {
      patrolTile: game.ref(2, 2),
    });
    raider.buildUnit(UnitType.Warship, game.ref(2, 3), {
      patrolTile: game.ref(2, 3),
    });
    recomputeSupply(game, 120);

    expect(game.supplyState(game.ref(5, 3))).toBe(SupplyState.Isolated);

    owner.buildUnit(UnitType.Warship, game.ref(2, 1), {
      patrolTile: game.ref(2, 1),
    });
    owner.buildUnit(UnitType.Warship, game.ref(2, 4), {
      patrolTile: game.ref(2, 4),
    });
    recomputeSupply(game, 140);

    expect(game.supplyState(game.ref(5, 3))).toBe(SupplyState.Supplied);
  });
});
