import { DebugSpan } from "../utilities/DebugSpan";
import { PathFinderStepper } from "./PathFinderStepper";
/**
 * PathFinderBuilder - fluent builder for composing PathFinder transformers.
 *
 * Usage:
 *   const finder = PathFinderBuilder.create(corePathFinder)
 *     .wrap((pf) => new SomeTransformer(pf, deps))
 *     .wrap((pf) => new AnotherTransformer(pf, deps))
 *     .build();
 */
export class PathFinderBuilder {
    constructor(core) {
        this.core = core;
        this.wrappers = [];
    }
    static create(core) {
        return new PathFinderBuilder(core);
    }
    wrap(factory) {
        this.wrappers.push(factory);
        return this;
    }
    build() {
        const pathFinder = this.wrappers.reduce((pf, wrapper) => wrapper(pf), this.core);
        const _findPath = pathFinder.findPath;
        pathFinder.findPath = function (from, to) {
            return DebugSpan.wrap("findPath", () => _findPath.call(this, from, to));
        };
        return pathFinder;
    }
    /**
     * Build and wrap with PathFinderStepper for step-by-step traversal.
     */
    buildWithStepper(config) {
        return new PathFinderStepper(this.build(), config);
    }
}
//# sourceMappingURL=PathFinderBuilder.js.map