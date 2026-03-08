export class FrameProfiler {
    /**
     * Enable or disable profiling.
     */
    static setEnabled(enabled) {
        this.enabled = enabled;
    }
    /**
     * Check if profiling is enabled.
     */
    static isEnabled() {
        return this.enabled;
    }
    /**
     * Clear all accumulated timings for the current frame.
     */
    static clear() {
        if (!this.enabled)
            return;
        this.timings = {};
    }
    /**
     * Record a duration (in ms) for a named span.
     */
    static record(name, duration) {
        if (!this.enabled || !Number.isFinite(duration))
            return;
        this.timings[name] = (this.timings[name] ?? 0) + duration;
    }
    /**
     * Convenience helper to start a span.
     * Returns a high-resolution timestamp to be passed into end().
     */
    static start() {
        if (!this.enabled)
            return 0;
        return performance.now();
    }
    /**
     * Convenience helper to end a span started with start().
     */
    static end(name, startTime) {
        if (!this.enabled || startTime === 0)
            return;
        const duration = performance.now() - startTime;
        this.record(name, duration);
    }
    /**
     * Consume and reset all timings collected so far.
     */
    static consume() {
        if (!this.enabled)
            return {};
        const copy = { ...this.timings };
        this.timings = {};
        return copy;
    }
}
FrameProfiler.timings = {};
FrameProfiler.enabled = false;
//# sourceMappingURL=FrameProfiler.js.map