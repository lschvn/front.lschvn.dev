import { GameUpdateType } from "src/core/game/GameUpdates";
import { vi } from "vitest";
import { UnitType } from "../../../src/core/game/Game";
import { TrainStation } from "../../../src/core/game/TrainStation";
vi.mock("../../../src/core/game/Game");
vi.mock("../../../src/core/execution/TrainExecution");
vi.mock("../../../src/core/PseudoRandom");
describe("TrainStation", () => {
    let game;
    let unit;
    let player;
    let trainExecution;
    beforeEach(() => {
        game = {
            ticks: vi.fn().mockReturnValue(123),
            config: vi.fn().mockReturnValue({
                trainGold: (isFriendly) => isFriendly ? BigInt(1000) : BigInt(500),
            }),
            addUpdate: vi.fn(),
            addExecution: vi.fn(),
            stats: vi.fn().mockReturnValue({
                trainExternalTrade: vi.fn(),
                trainSelfTrade: vi.fn(),
            }),
        };
        player = {
            addGold: vi.fn(),
            id: 1,
            canTrade: vi.fn().mockReturnValue(true),
            isFriendly: vi.fn().mockReturnValue(false),
        };
        unit = {
            owner: vi.fn().mockReturnValue(player),
            level: vi.fn().mockReturnValue(1),
            tile: vi.fn().mockReturnValue({ x: 0, y: 0 }),
            type: vi.fn(),
            isActive: vi.fn().mockReturnValue(true),
        };
        trainExecution = {
            loadCargo: vi.fn(),
            owner: vi.fn().mockReturnValue(player),
            level: vi.fn(),
        };
    });
    it("handles City stop", () => {
        unit.type.mockReturnValue(UnitType.City);
        const station = new TrainStation(game, unit);
        station.onTrainStop(trainExecution);
        expect(unit.owner().addGold).toHaveBeenCalledWith(1000n, unit.tile());
    });
    it("handles allied trade", () => {
        unit.type.mockReturnValue(UnitType.City);
        player.isFriendly.mockReturnValue(true);
        const station = new TrainStation(game, unit);
        station.onTrainStop(trainExecution);
        expect(unit.owner().addGold).toHaveBeenCalledWith(1000n, unit.tile());
        expect(trainExecution.owner().addGold).toHaveBeenCalledWith(1000n, unit.tile());
    });
    it("checks trade availability (same owner)", () => {
        const otherUnit = {
            owner: vi.fn().mockReturnValue(unit.owner()),
        };
        const station = new TrainStation(game, unit);
        const otherStation = new TrainStation(game, otherUnit);
        expect(station.tradeAvailable(otherStation.unit.owner())).toBe(true);
    });
    it("adds and retrieves neighbors", () => {
        const stationA = new TrainStation(game, unit);
        const stationB = new TrainStation(game, unit);
        const railRoad = { from: stationA, to: stationB, tiles: [] };
        stationA.addRailroad(railRoad);
        const neighbors = stationA.neighbors();
        expect(neighbors).toContain(stationB);
    });
    it("removes neighboring rail", () => {
        const stationA = new TrainStation(game, unit);
        const stationB = new TrainStation(game, unit);
        const railRoad = {
            from: stationA,
            to: stationB,
            tiles: [{ x: 1, y: 1 }],
        };
        stationA.addRailroad(railRoad);
        expect(stationA.getRailroads().size).toBe(1);
        stationA.removeNeighboringRails(stationB);
        expect(game.addUpdate).toHaveBeenCalledWith(expect.objectContaining({
            type: GameUpdateType.RailroadDestructionEvent,
        }));
        expect(stationA.getRailroads().size).toBe(0);
    });
    it("assigns and retrieves cluster", () => {
        const cluster = {};
        const station = new TrainStation(game, unit);
        station.setCluster(cluster);
        expect(station.getCluster()).toBe(cluster);
    });
    it("returns tile and active status", () => {
        const station = new TrainStation(game, unit);
        expect(station.tile()).toEqual({ x: 0, y: 0 });
        expect(station.isActive()).toBe(true);
    });
});
//# sourceMappingURL=TrainStation.test.js.map