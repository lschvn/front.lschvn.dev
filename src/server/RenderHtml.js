import ejs from "ejs";
import fs from "fs/promises";
export async function renderHtmlContent(htmlPath) {
    const htmlContent = await fs.readFile(htmlPath, "utf-8");
    return ejs.render(htmlContent, {
        gitCommit: JSON.stringify(process.env.GIT_COMMIT ?? "undefined"),
        instanceId: JSON.stringify(process.env.INSTANCE_ID ?? "undefined"),
    });
}
export function setHtmlNoCacheHeaders(res) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("ETag", "");
    res.setHeader("Content-Type", "text/html");
}
export async function renderHtml(res, htmlPath) {
    const rendered = await renderHtmlContent(htmlPath);
    setHtmlNoCacheHeaders(res);
    res.send(rendered);
}
//# sourceMappingURL=RenderHtml.js.map