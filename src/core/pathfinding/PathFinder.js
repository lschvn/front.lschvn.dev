import { AStarRail } from "./algorithms/AStar.Rail";
import { AStarWater } from "./algorithms/AStar.Water";
import { AirPathFinder } from "./PathFinder.Air";
import { ParabolaUniversalPathFinder, } from "./PathFinder.Parabola";
import { StationPathFinder } from "./PathFinder.Station";
import { PathFinderBuilder } from "./PathFinderBuilder";
import { ComponentCheckTransformer } from "./transformers/ComponentCheckTransformer";
import { MiniMapTransformer } from "./transformers/MiniMapTransformer";
import { ShoreCoercingTransformer } from "./transformers/ShoreCoercingTransformer";
import { SmoothingWaterTransformer } from "./transformers/SmoothingWaterTransformer";
import { PathStatus } from "./types";
/**
 * Pathfinders that work with GameMap - usable in both simulation and UI layers
 */
export class UniversalPathFinding {
    static Parabola(gameMap, options) {
        return new ParabolaUniversalPathFinder(gameMap, options);
    }
}
/**
 * Pathfinders that require Game - simulation layer only
 */
export class PathFinding {
    static Water(game) {
        const pf = game.miniWaterHPA();
        const graph = game.miniWaterGraph();
        if (!pf || !graph || graph.nodeCount < 100) {
            return PathFinding.WaterSimple(game);
        }
        const miniMap = game.miniMap();
        const componentCheckFn = (t) => graph.getComponentId(t);
        return PathFinderBuilder.create(pf)
            .wrap((pf) => new ComponentCheckTransformer(pf, componentCheckFn))
            .wrap((pf) => new SmoothingWaterTransformer(pf, miniMap))
            .wrap((pf) => new ShoreCoercingTransformer(pf, miniMap))
            .wrap((pf) => new MiniMapTransformer(pf, game.map(), miniMap))
            .buildWithStepper(tileStepperConfig(game));
    }
    static WaterSimple(game) {
        const miniMap = game.miniMap();
        const pf = new AStarWater(miniMap);
        return PathFinderBuilder.create(pf)
            .wrap((pf) => new ShoreCoercingTransformer(pf, miniMap))
            .wrap((pf) => new MiniMapTransformer(pf, game.map(), miniMap))
            .buildWithStepper(tileStepperConfig(game));
    }
    static Rail(game) {
        const miniMap = game.miniMap();
        const pf = new AStarRail(miniMap);
        return PathFinderBuilder.create(pf)
            .wrap((pf) => new MiniMapTransformer(pf, game.map(), miniMap))
            .buildWithStepper(tileStepperConfig(game));
    }
    static Stations(game) {
        const pf = new StationPathFinder(game);
        return PathFinderBuilder.create(pf).buildWithStepper({
            equals: (a, b) => a.id === b.id,
            distance: (a, b) => game.manhattanDist(a.tile(), b.tile()),
        });
    }
    static Air(game) {
        const pf = new AirPathFinder(game);
        return PathFinderBuilder.create(pf).buildWithStepper({
            equals: (a, b) => a === b,
        });
    }
}
function tileStepperConfig(game) {
    return {
        equals: (a, b) => a === b,
        distance: (a, b) => game.manhattanDist(a, b),
        preCheck: (from, to) => typeof from !== "number" ||
            typeof to !== "number" ||
            !game.isValidRef(from) ||
            !game.isValidRef(to)
            ? { status: PathStatus.NOT_FOUND }
            : null,
    };
}
//# sourceMappingURL=PathFinder.js.map