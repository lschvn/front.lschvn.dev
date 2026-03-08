/**
 * Basic timeline to chain actions
 */
export class Timeline {
    constructor() {
        this.tasks = [];
        this.timeElapsed = 0;
    }
    add(delay, action) {
        this.tasks.push({ delay, action, triggered: false });
        return this;
    }
    update(dt) {
        this.timeElapsed += dt;
        for (const task of this.tasks) {
            if (!task.triggered && this.timeElapsed >= task.delay) {
                task.action();
                task.triggered = true;
            }
        }
    }
    isComplete() {
        return this.tasks.every((t) => t.triggered);
    }
}
//# sourceMappingURL=Timeline.js.map