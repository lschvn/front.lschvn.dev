// Component check transformer - fail fast if src/dst in different components
/**
 * Wraps a PathFinder to fail fast when source and destination
 * are in different components (e.g., disconnected water bodies).
 *
 * Avoids running expensive pathfinding when no path exists.
 */
export class ComponentCheckTransformer {
    constructor(inner, getComponent) {
        this.inner = inner;
        this.getComponent = getComponent;
    }
    findPath(from, to) {
        const toComponent = this.getComponent(to);
        // Check all sources - at least one must match destination component
        const fromArray = Array.isArray(from) ? from : [from];
        const validSources = fromArray.filter((f) => this.getComponent(f) === toComponent);
        if (validSources.length === 0) {
            return null; // No source in same component as destination
        }
        // Delegate with only valid sources
        const delegateFrom = validSources.length === 1 ? validSources[0] : validSources;
        return this.inner.findPath(delegateFrom, to);
    }
}
//# sourceMappingURL=ComponentCheckTransformer.js.map