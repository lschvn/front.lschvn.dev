import { AStar } from "./algorithms/AStar";
export class StationPathFinder {
    constructor(game) {
        this.manager = game.railNetwork().stationManager();
        const adapter = new StationGraphAdapter(game, this.manager);
        this.aStar = new AStar({ adapter });
    }
    findPath(from, to) {
        const toCluster = to.getCluster();
        const fromArray = Array.isArray(from) ? from : [from];
        const sameCluster = fromArray.filter((s) => s.getCluster() === toCluster);
        if (sameCluster.length === 0)
            return null;
        const fromIds = sameCluster.map((s) => s.id);
        const path = this.aStar.findPath(fromIds, to.id);
        if (!path)
            return null;
        return path.map((id) => this.manager.getById(id));
    }
}
class StationGraphAdapter {
    constructor(game, manager) {
        this.game = game;
        this.manager = manager;
    }
    numNodes() {
        return this.manager.count();
    }
    maxNeighbors() {
        return 32;
    }
    maxPriority() {
        return this.game.map().width() + this.game.map().height();
    }
    neighbors(node, buffer) {
        const station = this.manager.getById(node);
        if (!station)
            return 0;
        let count = 0;
        for (const n of station.neighbors()) {
            buffer[count++] = n.id;
        }
        return count;
    }
    cost() {
        return 1;
    }
    heuristic(node, goal) {
        const a = this.manager.getById(node);
        const b = this.manager.getById(goal);
        if (!a || !b)
            return 0;
        const ax = this.game.x(a.tile());
        const ay = this.game.y(a.tile());
        const bx = this.game.x(b.tile());
        const by = this.game.y(b.tile());
        return Math.abs(ax - bx) + Math.abs(ay - by);
    }
}
//# sourceMappingURL=PathFinder.Station.js.map