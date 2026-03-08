import { vi } from "vitest";
import { UnitType } from "../../../src/core/game/Game";
import { Cluster } from "../../../src/core/game/TrainStation";
const createMockStation = (id) => {
    return {
        id,
        unit: {
            type: vi.fn(() => UnitType.City),
        },
        setCluster: vi.fn(),
        getCluster: vi.fn(() => null),
    };
};
describe("Cluster tests", () => {
    let cluster;
    let stationA;
    let stationB;
    let stationC;
    beforeEach(() => {
        cluster = new Cluster();
        stationA = createMockStation("A");
        stationB = createMockStation("B");
        stationC = createMockStation("C");
    });
    test("addStation adds a station and sets cluster", () => {
        cluster.addStation(stationA);
        expect(cluster.has(stationA)).toBe(true);
        expect(stationA.setCluster).toHaveBeenCalledWith(cluster);
    });
    test("removeStation removes station from cluster", () => {
        cluster.addStation(stationA);
        cluster.removeStation(stationA);
        expect(cluster.has(stationA)).toBe(false);
    });
    test("addStations adds multiple stations and sets cluster", () => {
        const set = new Set([stationA, stationB]);
        cluster.addStations(set);
        expect(cluster.has(stationA)).toBe(true);
        expect(cluster.has(stationB)).toBe(true);
        expect(stationA.setCluster).toHaveBeenCalledWith(cluster);
        expect(stationB.setCluster).toHaveBeenCalledWith(cluster);
    });
    test("merge combines stations from another cluster", () => {
        const otherCluster = new Cluster();
        otherCluster.addStation(stationB);
        otherCluster.addStation(stationC);
        cluster.addStation(stationA);
        cluster.merge(otherCluster);
        expect(cluster.has(stationA)).toBe(true);
        expect(cluster.has(stationB)).toBe(true);
        expect(cluster.has(stationC)).toBe(true);
    });
    test("has returns false for non-member stations", () => {
        expect(cluster.has(stationA)).toBe(false);
    });
});
//# sourceMappingURL=Cluster.test.js.map