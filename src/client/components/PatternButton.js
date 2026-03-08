var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Colord } from "colord";
import { base64url } from "jose";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { DefaultPattern, } from "../../core/CosmeticSchemas";
import { PatternDecoder } from "../../core/PatternDecoder";
import { translateText } from "../Utils";
export const BUTTON_WIDTH = 150;
let PatternButton = class PatternButton extends LitElement {
    constructor() {
        super(...arguments);
        this.selected = false;
        this.pattern = null;
        this.colorPalette = null;
        this.requiresPurchase = false;
    }
    createRenderRoot() {
        return this;
    }
    translateCosmetic(prefix, patternName) {
        const translation = translateText(`${prefix}.${patternName}`);
        if (translation.startsWith(prefix)) {
            return patternName
                .split("_")
                .filter((word) => word.length > 0)
                .map((word) => word[0].toUpperCase() + word.substring(1))
                .join(" ");
        }
        return translation;
    }
    handleClick() {
        if (this.pattern === null) {
            this.onSelect?.(null);
            return;
        }
        this.onSelect?.({
            name: this.pattern.name,
            patternData: this.pattern.pattern,
            colorPalette: this.colorPalette ?? undefined,
        });
    }
    handlePurchase(e) {
        e.stopPropagation();
        if (this.pattern?.product) {
            this.onPurchase?.(this.pattern, this.colorPalette ?? null);
        }
    }
    render() {
        const isDefaultPattern = this.pattern === null;
        return html `
      <div
        class="no-crazygames flex flex-col items-center justify-between gap-2 p-3 bg-white/5 backdrop-blur-sm border rounded-xl w-48 h-full transition-all duration-200 ${this
            .selected
            ? "border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]"
            : "hover:bg-white/10 hover:border-white/20 hover:shadow-xl border-white/10"}"
      >
        <button
          class="group relative flex flex-col items-center w-full gap-2 rounded-lg cursor-pointer transition-all duration-200
                 disabled:cursor-not-allowed flex-1"
          ?disabled=${this.requiresPurchase}
          @click=${this.handleClick}
        >
          <div class="flex flex-col items-center w-full">
            <div
              class="text-xs font-bold text-white uppercase tracking-wider mb-1 text-center truncate w-full ${this
            .requiresPurchase
            ? "opacity-50"
            : ""}"
              title="${isDefaultPattern
            ? translateText("territory_patterns.pattern.default")
            : this.translateCosmetic("territory_patterns.pattern", this.pattern.name)}"
            >
              ${isDefaultPattern
            ? translateText("territory_patterns.pattern.default")
            : this.translateCosmetic("territory_patterns.pattern", this.pattern.name)}
            </div>
            ${this.colorPalette !== null
            ? html `
                  <div
                    class="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 text-center truncate w-full ${this
                .requiresPurchase
                ? "opacity-50"
                : ""}"
                  >
                    ${this.translateCosmetic("territory_patterns.color_palette", this.colorPalette.name)}
                  </div>
                `
            : html `<div class="h-[22px] mb-2 w-full"></div>`}
          </div>

          <div
            class="w-full aspect-square flex items-center justify-center bg-white/5 rounded-lg p-2 border border-white/10 group-hover:border-white/20 transition-colors duration-200 overflow-hidden"
          >
            ${renderPatternPreview(this.pattern !== null
            ? {
                name: this.pattern.name,
                patternData: this.pattern.pattern,
                colorPalette: this.colorPalette ?? undefined,
            }
            : DefaultPattern, BUTTON_WIDTH, BUTTON_WIDTH)}
          </div>
        </button>

        ${this.requiresPurchase && this.pattern?.product
            ? html `
              <div class="w-full mt-2">
                <button
                  class="w-full px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-all duration-200
                   hover:bg-green-500/30 hover:shadow-[0_0_15px_rgba(74,222,128,0.2)]"
                  @click=${this.handlePurchase}
                >
                  ${translateText("territory_patterns.purchase")}
                  <span class="ml-1 text-white/60"
                    >(${this.pattern.product.price})</span
                  >
                </button>
              </div>
            `
            : null}
      </div>
    `;
    }
};
__decorate([
    property({ type: Boolean })
], PatternButton.prototype, "selected", void 0);
__decorate([
    property({ type: Object })
], PatternButton.prototype, "pattern", void 0);
__decorate([
    property({ type: Object })
], PatternButton.prototype, "colorPalette", void 0);
__decorate([
    property({ type: Boolean })
], PatternButton.prototype, "requiresPurchase", void 0);
__decorate([
    property({ type: Function })
], PatternButton.prototype, "onSelect", void 0);
__decorate([
    property({ type: Function })
], PatternButton.prototype, "onPurchase", void 0);
PatternButton = __decorate([
    customElement("pattern-button")
], PatternButton);
export { PatternButton };
export function renderPatternPreview(pattern, width, height) {
    if (pattern === null) {
        return renderBlankPreview(width, height);
    }
    return html `<img
    src="${generatePreviewDataUrl(pattern, width, height)}"
    alt="Pattern preview"
    class="w-full h-full object-contain [image-rendering:pixelated] pointer-events-none"
    draggable="false"
  />`;
}
function renderBlankPreview(width, height) {
    return html `
    <div
      class="md:hidden flex items-center justify-center h-full w-full bg-white rounded overflow-hidden relative border border-[#ccc] box-border"
    >
      <div
        class="grid grid-cols-2 grid-rows-2 gap-0 w-[calc(100%-1px)] h-[calc(100%-2px)] box-border"
      >
        <div class="bg-white border border-black/10 box-border"></div>
        <div class="bg-white border border-black/10 box-border"></div>
        <div class="bg-white border border-black/10 box-border"></div>
        <div class="bg-white border border-black/10 box-border"></div>
      </div>
    </div>
    <div
      class="hidden md:flex items-center justify-center h-full w-full rounded overflow-hidden relative text-center p-1"
    >
      <span
        class="text-[10px] font-black text-white/40 uppercase leading-none break-words w-full"
      >
        ${translateText("territory_patterns.select_skin")}
      </span>
    </div>
  `;
}
const patternCache = new Map();
const DEFAULT_PRIMARY = new Colord("#ffffff").toRgb(); // White
const DEFAULT_SECONDARY = new Colord("#000000").toRgb(); // Black
function generatePreviewDataUrl(pattern, width, height) {
    pattern ?? (pattern = DefaultPattern);
    const patternLookupKey = [
        pattern.name,
        pattern.colorPalette?.primaryColor ?? "undefined",
        pattern.colorPalette?.secondaryColor ?? "undefined",
        width,
        height,
    ].join("-");
    if (patternCache.has(patternLookupKey)) {
        return patternCache.get(patternLookupKey);
    }
    // Calculate canvas size
    let decoder;
    try {
        decoder = new PatternDecoder({
            name: pattern.name,
            patternData: pattern.patternData,
            colorPalette: pattern.colorPalette,
        }, base64url.decode);
    }
    catch (e) {
        console.error("Error decoding pattern", e);
        return "";
    }
    const scaledWidth = decoder.scaledWidth();
    const scaledHeight = decoder.scaledHeight();
    width =
        width === undefined
            ? scaledWidth
            : Math.max(1, Math.floor(width / scaledWidth)) * scaledWidth;
    height =
        height === undefined
            ? scaledHeight
            : Math.max(1, Math.floor(height / scaledHeight)) * scaledHeight;
    // Create the canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx)
        throw new Error("2D context not supported");
    // Create an image
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    const primary = pattern.colorPalette?.primaryColor
        ? new Colord(pattern.colorPalette.primaryColor).toRgb()
        : DEFAULT_PRIMARY;
    const secondary = pattern.colorPalette?.secondaryColor
        ? new Colord(pattern.colorPalette.secondaryColor).toRgb()
        : DEFAULT_SECONDARY;
    let i = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const rgba = decoder.isPrimary(x, y) ? primary : secondary;
            data[i++] = rgba.r;
            data[i++] = rgba.g;
            data[i++] = rgba.b;
            data[i++] = 255; // Alpha
        }
    }
    // Create a data URL
    ctx.putImageData(imageData, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    patternCache.set(patternLookupKey, dataUrl);
    return dataUrl;
}
//# sourceMappingURL=PatternButton.js.map