export class ProgressBar {
    constructor(colors = [], ctx, x, y, w, h, progress = 0) {
        this.colors = colors;
        this.ctx = ctx;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.progress = progress;
        this.setProgress(progress);
    }
    setProgress(progress) {
        progress = Math.max(0, Math.min(1, progress));
        this.clear();
        // Draw the loading bar background
        this.ctx.fillStyle = "rgba(0, 0, 0, 1)";
        this.ctx.fillRect(this.x - 1, this.y - 1, this.w, this.h);
        // Draw the loading progress
        if (this.colors.length === 0) {
            this.ctx.fillStyle = "#808080"; // default gray
        }
        else {
            const idx = Math.min(this.colors.length - 1, Math.floor(progress * this.colors.length));
            this.ctx.fillStyle = this.colors[idx];
        }
        this.ctx.fillRect(this.x, this.y, Math.max(1, Math.floor(progress * (this.w - 2))), this.h - 2);
        this.progress = progress;
    }
    clear() {
        this.ctx.clearRect(this.x - ProgressBar.CLEAR_PADDING, this.y - ProgressBar.CLEAR_PADDING, this.w + ProgressBar.CLEAR_PADDING, this.h + ProgressBar.CLEAR_PADDING);
    }
    getX() {
        return this.x;
    }
    getY() {
        return this.y;
    }
    getProgress() {
        return this.progress;
    }
}
ProgressBar.CLEAR_PADDING = 2;
//# sourceMappingURL=ProgressBar.js.map