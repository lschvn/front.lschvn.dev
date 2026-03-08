import fs from "fs";
import { globSync } from "glob";
import path from "path";
describe("Map manifests: nation flags exist", () => {
    test("All nations' flags reference existing SVG files", () => {
        const manifestPaths = globSync("resources/maps/**/manifest.json");
        expect(manifestPaths.length).toBeGreaterThan(0);
        const flagDir = path.join(__dirname, "../resources/flags");
        const errors = [];
        for (const manifestPath of manifestPaths) {
            try {
                const raw = fs.readFileSync(manifestPath, "utf8");
                const manifest = JSON.parse(raw);
                (manifest.nations ?? []).forEach((nation, idx) => {
                    const flag = nation?.flag;
                    if (flag === undefined || flag === null)
                        return;
                    if (typeof flag !== "string") {
                        errors.push(`${manifestPath} -> nations[${idx}].flag is not a string`);
                        return;
                    }
                    if (flag.trim().length === 0)
                        return;
                    if (flag.startsWith("!"))
                        return;
                    const svgFile = flag.endsWith(".svg") ? flag : `${flag}.svg`;
                    const flagPath = path.join(flagDir, svgFile);
                    if (!fs.existsSync(flagPath)) {
                        errors.push(`${manifestPath} -> nations[${idx}].flag "${flag}" does not exist in resources/flags`);
                    }
                });
            }
            catch (err) {
                errors.push(`Failed to parse ${manifestPath}: ${err.message}`);
            }
        }
        if (errors.length > 0) {
            throw new Error("Map manifest flag file violations:\n" + errors.join("\n"));
        }
    });
});
//# sourceMappingURL=MapManifestFlags.test.js.map