function fadeInOut(t, fadeIn = 0.3, fadeOut = 0.7) {
    if (t < fadeIn) {
        const f = t / fadeIn; // Map to [0, 1]
        return f * f;
    }
    else if (t < fadeOut) {
        return 1;
    }
    else {
        const f = (t - fadeOut) / (1 - fadeOut); // Map to [0, 1]
        return 1 - f * f;
    }
}
/**
 * Fade in/out another FX
 */
export class FadeFx {
    constructor(fxToFade, fadeIn, fadeOut) {
        this.fxToFade = fxToFade;
        this.fadeIn = fadeIn;
        this.fadeOut = fadeOut;
    }
    renderTick(duration, ctx) {
        const t = this.fxToFade.getElapsedTime() / this.fxToFade.getDuration();
        ctx.save();
        ctx.globalAlpha = fadeInOut(t, this.fadeIn, this.fadeOut);
        const result = this.fxToFade.renderTick(duration, ctx);
        ctx.restore();
        return result;
    }
}
/**
 * Animated sprite. Can be colored if provided an owner/theme
 */
export class SpriteFx {
    constructor(animatedSpriteLoader, x, y, fxType, duration, owner, theme) {
        this.x = x;
        this.y = y;
        this.elapsedTime = 0;
        this.waitToTheEnd = false;
        this.animatedSprite = animatedSpriteLoader.createAnimatedSprite(fxType, owner, theme);
        if (!this.animatedSprite) {
            console.error("Could not load animated sprite", fxType);
        }
        else {
            this.waitToTheEnd = duration ? true : false;
            this.duration = duration ?? this.animatedSprite.lifeTime() ?? 1000;
        }
    }
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
    renderTick(frameTime, ctx) {
        if (!this.animatedSprite)
            return false;
        this.elapsedTime += frameTime;
        if (this.elapsedTime >= this.duration)
            return false;
        if (!this.animatedSprite.isActive() && !this.waitToTheEnd)
            return false;
        this.animatedSprite.update(frameTime);
        this.animatedSprite.draw(ctx, this.x, this.y);
        return true;
    }
    getElapsedTime() {
        return this.elapsedTime;
    }
    getDuration() {
        return this.duration;
    }
}
//# sourceMappingURL=SpriteFx.js.map