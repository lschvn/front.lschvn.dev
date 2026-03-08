import { colord } from "colord";
import { PseudoRandom } from "../PseudoRandom";
import { PlayerType, TerrainType } from "../game/Game";
import { ColorAllocator } from "./ColorAllocator";
import { botColors, fallbackColors, humanColors, nationColors } from "./Colors";
export class PastelTheme {
    constructor() {
        this.rand = new PseudoRandom(123);
        this.humanColorAllocator = new ColorAllocator(humanColors, fallbackColors);
        this.botColorAllocator = new ColorAllocator(botColors, botColors);
        this.teamColorAllocator = new ColorAllocator(humanColors, fallbackColors);
        this.nationColorAllocator = new ColorAllocator(nationColors, nationColors);
        this.background = colord("rgb(60,60,60)");
        this.shore = colord("rgb(204,203,158)");
        this.falloutColors = [
            colord("rgb(120,255,71)"), // Original color
            colord("rgb(130,255,85)"), // Slightly lighter
            colord("rgb(110,245,65)"), // Slightly darker
            colord("rgb(125,255,75)"), // Warmer tint
            colord("rgb(115,250,68)"), // Cooler tint
        ];
        this.water = colord("rgb(70,132,180)");
        this.shorelineWater = colord("rgb(100,143,255)");
        /** Alternate View colors for self, green */
        this._selfColor = colord("rgb(0,255,0)");
        /** Alternate View colors for allies, yellow */
        this._allyColor = colord("rgb(255,255,0)");
        /** Alternate View colors for neutral, gray */
        this._neutralColor = colord("rgb(128,128,128)");
        /** Alternate View colors for enemies, red */
        this._enemyColor = colord("rgb(255,0,0)");
        /** Default spawn highlight colors for other players in FFA, yellow */
        this._spawnHighlightColor = colord("rgb(255,213,79)");
        /** Added non-default spawn highlight colors for self, full white */
        this._spawnHighlightSelfColor = colord("rgb(255,255,255)");
        /** Added non-default spawn highlight colors for teammates, green */
        this._spawnHighlightTeamColor = colord("rgb(0,255,0)");
        /** Added non-default spawn highlight colors for enemies, red */
        this._spawnHighlightEnemyColor = colord("rgb(255,0,0)");
    }
    teamColor(team) {
        return this.teamColorAllocator.assignTeamColor(team);
    }
    territoryColor(player) {
        const team = player.team();
        if (team !== null) {
            return this.teamColorAllocator.assignTeamPlayerColor(team, player.id());
        }
        if (player.type() === PlayerType.Human) {
            return this.humanColorAllocator.assignColor(player.id());
        }
        if (player.type() === PlayerType.Bot) {
            return this.botColorAllocator.assignColor(player.id());
        }
        return this.nationColorAllocator.assignColor(player.id());
    }
    structureColors(territoryColor) {
        // Convert territory color to LAB color space. Territory color is rendered in game with alpha = 150/255, use that here.
        const lightLAB = territoryColor.alpha(150 / 255).toLab();
        // Get "border color" from territory color & convert to LAB color space
        const darkLAB = this.borderColor(territoryColor).toLab();
        // Calculate the contrast of the two provided colors
        let contrast = this.contrast(lightLAB, darkLAB);
        // Don't want excessive contrast, so incrementally increase contrast within a loop.
        // Define target values, looping limits, and loop counter
        const loopLimit = 10; // Switch from darkening border to lightening fill if loopLimit is reached
        const maxIterations = 50; // maximum number of loops allowed, throw error above this limit
        const contrastTarget = 0.5;
        let loopCount = 0;
        // Adjust luminance by 5 in each iteration. This is a balance between speed and not overdoing contrast changes.
        const luminanceChange = 5;
        while (contrast < contrastTarget) {
            if (loopCount > maxIterations) {
                // Prevent runaway loops
                console.warn(`Infinite loop detected during structure color calculation. 
          Light color: ${colord(lightLAB).toRgbString()}, 
          Dark color: ${colord(darkLAB).toRgbString()}, 
          Contrast: ${contrast}`);
                break;
                // Increase the light color if the "loop limit" has been reach
                // (probably due to the dark color already being as dark as it can be)
            }
            else if (loopCount > loopLimit) {
                lightLAB.l = this.clamp(lightLAB.l + luminanceChange);
                // Decrease the dark color first to keep the light color as close
                // to the territory color as possible
            }
            else {
                darkLAB.l = this.clamp(darkLAB.l - luminanceChange);
            }
            // re-calculate contrast and increment loop counter
            contrast = this.contrast(lightLAB, darkLAB);
            loopCount++;
        }
        return { light: colord(lightLAB), dark: colord(darkLAB) };
    }
    contrast(first, second) {
        return colord(first).delta(colord(second));
    }
    clamp(num, low = 0, high = 100) {
        return Math.min(Math.max(low, num), high);
    }
    // Don't call directly, use PlayerView
    borderColor(territoryColor) {
        return territoryColor.darken(0.125);
    }
    defendedBorderColors(territoryColor) {
        return {
            light: territoryColor.darken(0.2),
            dark: territoryColor.darken(0.4),
        };
    }
    focusedBorderColor() {
        return colord("rgb(230,230,230)");
    }
    textColor(player) {
        return player.type() === PlayerType.Human ? "#000000" : "#4D4D4D";
    }
    // | Terrain Type      | Magnitude | Base Color Logic                                | Visual Description                                                   |
    // | :---------------- | :-------- | :---------------------------------------------- | :------------------------------------------------------------------- |
    // | **Shore (Land)**  | N/A       | Fixed: `rgb(204, 203, 158)`                   | Sandy beige. Overrides other land types if adjacent to water.        |
    // | **Plains**        | 0 - 9     | `rgb(190, 220, 138)` - `rgb(190, 202, 138)` | Light green. Gets slightly darker/less green as magnitude increases. |
    // | **Highland**      | 10 - 19   | `rgb(220, 203, 158)` - `rgb(238, 221, 176)` | Tan/Beige. Gets lighter as magnitude increases.                      |
    // | **Mountain**      | 20 - 30   | `rgb(240, 240, 240)` - `rgb(245, 245, 245)` | Grayscale (White/Grey). Represents snow caps or rocky peaks.         |
    // | **Water (Shore)** | 0         | Fixed: `rgb(100, 143, 255)`                   | Light blue near land.                                                |
    // | **Water (Deep)**  | 1 - 10+   | `rgb(70, 132, 180)` - `rgb(61, 123, 171)`   | Darker blue, adjusted slightly by distance to land.                  |
    terrainColor(gm, tile) {
        const mag = gm.magnitude(tile);
        if (gm.isShore(tile)) {
            return this.shore;
        }
        switch (gm.terrainType(tile)) {
            case TerrainType.Ocean:
            case TerrainType.Lake: {
                const w = this.water.rgba;
                if (gm.isShoreline(tile) && gm.isWater(tile)) {
                    return this.shorelineWater;
                }
                return colord({
                    r: Math.max(w.r - 10 + (11 - Math.min(mag, 10)), 0),
                    g: Math.max(w.g - 10 + (11 - Math.min(mag, 10)), 0),
                    b: Math.max(w.b - 10 + (11 - Math.min(mag, 10)), 0),
                });
            }
            case TerrainType.Plains:
                return colord({
                    r: 190,
                    g: 220 - 2 * mag,
                    b: 138,
                });
            case TerrainType.Highland:
                return colord({
                    r: 200 + 2 * mag,
                    g: 183 + 2 * mag,
                    b: 138 + 2 * mag,
                });
            case TerrainType.Mountain:
                return colord({
                    r: 230 + mag / 2,
                    g: 230 + mag / 2,
                    b: 230 + mag / 2,
                });
        }
    }
    backgroundColor() {
        return this.background;
    }
    falloutColor() {
        return this.rand.randElement(this.falloutColors);
    }
    font() {
        return "Overpass, sans-serif";
    }
    selfColor() {
        return this._selfColor;
    }
    allyColor() {
        return this._allyColor;
    }
    neutralColor() {
        return this._neutralColor;
    }
    enemyColor() {
        return this._enemyColor;
    }
    spawnHighlightColor() {
        return this._spawnHighlightColor;
    }
    /** Return spawn highlight color for self */
    spawnHighlightSelfColor() {
        return this._spawnHighlightSelfColor;
    }
    /** Return spawn highlight color for teammates */
    spawnHighlightTeamColor() {
        return this._spawnHighlightTeamColor;
    }
    /** Return spawn highlight color for enemies */
    spawnHighlightEnemyColor() {
        return this._spawnHighlightEnemyColor;
    }
}
//# sourceMappingURL=PastelTheme.js.map