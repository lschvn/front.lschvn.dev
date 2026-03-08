export class MultiTabDetector {
    constructor() {
        this.tabId = `${Date.now()}-${Math.random()}`;
        this.lockKey = "multi-tab-lock";
        this.heartbeatIntervalMs = 1000;
        this.staleThresholdMs = 3000;
        this.heartbeatTimer = null;
        this.isPunished = false;
        this.punishmentCount = 0;
        this.startPenaltyCallback = () => { };
        window.addEventListener("storage", this.onStorageEvent.bind(this));
        window.addEventListener("beforeunload", this.onBeforeUnload.bind(this));
    }
    startMonitoring(startPenalty) {
        this.startPenaltyCallback = startPenalty;
        this.writeLock();
        this.heartbeatTimer = window.setInterval(() => this.heartbeat(), this.heartbeatIntervalMs);
    }
    stopMonitoring() {
        if (this.heartbeatTimer !== null) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
        const lock = this.readLock();
        if (lock?.owner === this.tabId) {
            localStorage.removeItem(this.lockKey);
        }
        window.removeEventListener("storage", this.onStorageEvent.bind(this));
        window.removeEventListener("beforeunload", this.onBeforeUnload.bind(this));
    }
    heartbeat() {
        const now = Date.now();
        const lock = this.readLock();
        if (!lock ||
            lock.owner === this.tabId ||
            now - lock.timestamp > this.staleThresholdMs) {
            this.writeLock();
            this.isPunished = false;
            return;
        }
        if (!this.isPunished) {
            this.applyPunishment();
        }
    }
    onStorageEvent(e) {
        if (e.key === this.lockKey && e.newValue) {
            let other;
            try {
                other = JSON.parse(e.newValue);
            }
            catch (e) {
                console.error("Failed to parse lock", e);
                return;
            }
            if (other.owner !== this.tabId && !this.isPunished) {
                this.applyPunishment();
            }
        }
    }
    onBeforeUnload() {
        const lock = this.readLock();
        if (lock?.owner === this.tabId) {
            localStorage.removeItem(this.lockKey);
        }
    }
    applyPunishment() {
        this.isPunished = true;
        this.punishmentCount++;
        const delay = 10000;
        this.startPenaltyCallback(delay);
        setTimeout(() => {
            this.isPunished = false;
        }, delay);
    }
    writeLock() {
        localStorage.setItem(this.lockKey, JSON.stringify({ owner: this.tabId, timestamp: Date.now() }));
    }
    readLock() {
        const raw = localStorage.getItem(this.lockKey);
        if (!raw)
            return null;
        try {
            return JSON.parse(raw);
        }
        catch (e) {
            console.error("Failed to parse lock", raw, e);
            return null;
        }
    }
}
//# sourceMappingURL=MultiTabDetector.js.map