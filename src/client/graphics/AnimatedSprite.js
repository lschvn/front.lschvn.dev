export class AnimatedSprite {
    constructor(image, frameCount, frameDuration, // in milliseconds
    looping = false, originX, originY) {
        this.image = image;
        this.frameCount = frameCount;
        this.frameDuration = frameDuration;
        this.looping = looping;
        this.originX = originX;
        this.originY = originY;
        this.currentFrame = 0;
        this.elapsedTime = 0;
        this.active = true;
        if (frameCount <= 0) {
            throw new Error("Animated sprite should at least have one frame");
        }
        if ("height" in image && "width" in image) {
            this.frameHeight = image.height;
            this.frameWidth = Math.floor(image.width / frameCount);
        }
        else {
            throw new Error("Image source must have 'width' and 'height' properties.");
        }
    }
    update(deltaTime) {
        if (!this.active)
            return;
        this.elapsedTime += deltaTime;
        if (this.elapsedTime >= this.frameDuration) {
            this.elapsedTime -= this.frameDuration;
            this.currentFrame++;
            if (this.currentFrame >= this.frameCount) {
                if (this.looping) {
                    this.currentFrame = 0;
                }
                else {
                    this.currentFrame = this.frameCount - 1;
                    this.active = false;
                }
            }
        }
    }
    isActive() {
        return this.active;
    }
    lifeTime() {
        if (this.looping) {
            return undefined;
        }
        return this.frameDuration * this.frameCount;
    }
    draw(ctx, x, y) {
        const drawX = x - this.originX;
        const drawY = y - this.originY;
        ctx.drawImage(this.image, this.currentFrame * this.frameWidth, 0, this.frameWidth, this.frameHeight, drawX, drawY, this.frameWidth, this.frameHeight);
    }
    reset() {
        this.currentFrame = 0;
        this.elapsedTime = 0;
    }
    setOrigin(xRatio, yRatio) {
        this.originX = xRatio;
        this.originY = yRatio;
    }
}
//# sourceMappingURL=AnimatedSprite.js.map