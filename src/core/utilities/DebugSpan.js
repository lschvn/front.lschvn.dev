const stack = [];
function isEnabled() {
    return globalThis.__DEBUG_SPAN_ENABLED__ === true;
}
export const DebugSpan = {
    isEnabled,
    enable() {
        globalThis.__DEBUG_SPAN_ENABLED__ = true;
    },
    disable() {
        globalThis.__DEBUG_SPAN_ENABLED__ = false;
    },
    start(name) {
        if (!isEnabled())
            return;
        const span = {
            name,
            timeStart: performance.now(),
            data: {},
            children: [],
        };
        const parent = stack[stack.length - 1];
        parent?.children.push(span);
        stack.push(span);
    },
    end(name) {
        if (!isEnabled())
            return;
        if (stack.length === 0) {
            const payload = name ? `"${name}"` : "";
            throw new Error(`DebugSpan.end(${payload}): no open span`);
        }
        // If name provided, close all spans up to and including the named one
        if (name) {
            while (stack.length > 0) {
                const span = stack.pop();
                span.timeEnd = performance.now();
                span.duration = span.timeEnd - span.timeStart;
                if (stack.length === 0) {
                    DebugSpan.storeSpan(span);
                }
                if (span.name === name)
                    break;
            }
            return;
        }
        // Default: close just the current span
        const span = stack.pop();
        span.timeEnd = performance.now();
        span.duration = span.timeEnd - span.timeStart;
        if (stack.length === 0) {
            DebugSpan.storeSpan(span);
        }
    },
    storeSpan(span) {
        if (!isEnabled())
            return;
        globalThis.__DEBUG_SPANS__ = globalThis.__DEBUG_SPANS__ ?? [];
        globalThis.__DEBUG_SPANS__.push(span);
        const extractData = (span) => {
            return Object.fromEntries(Object.entries(span.data).filter(([key]) => typeof key === "string" && key.startsWith("$")));
        };
        const properties = {
            timings: { total: span.duration },
            data: extractData(span),
        };
        if (span.children.length > 0) {
            const getChildren = (span) => span.children.flatMap((child) => [child, ...getChildren(child)]);
            const children = getChildren(span);
            for (const childSpan of children) {
                properties.timings[childSpan.name] = childSpan.duration;
                const childData = extractData(childSpan);
                for (const key of Object.keys(childData)) {
                    properties.data[key] = childData[key];
                }
            }
        }
        try {
            performance.measure(span.name, {
                start: span.timeStart,
                end: span.timeEnd,
                detail: properties,
            });
        }
        catch (err) {
            console.error("DebugSpan.storeSpan: performance.measure failed", err);
            console.error("Span:", span);
        }
        while (globalThis.__DEBUG_SPANS__.length > 100) {
            globalThis.__DEBUG_SPANS__.shift();
        }
    },
    wrap(name, fn) {
        this.start(name);
        try {
            return fn();
        }
        finally {
            this.end(name);
        }
    },
    set(key, valueFn, root = true) {
        if (!isEnabled())
            return;
        if (stack.length === 0) {
            throw new Error(`DebugSpan.set("${key}"): no open span`);
        }
        const span = root ? stack[0] : stack[stack.length - 1];
        span.data[key] = valueFn(span.data[key]);
    },
    getLastSpan(name) {
        if (!isEnabled())
            return;
        globalThis.__DEBUG_SPANS__ = globalThis.__DEBUG_SPANS__ ?? [];
        if (name) {
            for (let i = globalThis.__DEBUG_SPANS__.length - 1 || 0; i >= 0; i--) {
                const span = globalThis.__DEBUG_SPANS__[i];
                if (span.name === name) {
                    return span;
                }
            }
            return undefined;
        }
        return globalThis.__DEBUG_SPANS__[globalThis.__DEBUG_SPANS__.length - 1];
    },
};
//# sourceMappingURL=DebugSpan.js.map