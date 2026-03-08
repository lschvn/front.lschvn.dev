import { Platform } from "../Platform";
export async function collectGraphicsDiagnostics(canvas) {
    /* ---------- Browser / OS ---------- */
    const uaData = navigator.userAgentData;
    const os = Platform.os;
    const browser = {
        engine: uaData?.brands
            ? uaData.brands.map((b) => b.brand).join(", ")
            : navigator.userAgent,
        platform: navigator.platform,
        os,
        dpr: window.devicePixelRatio,
    };
    /* ---------- Rendering ---------- */
    let gl = null;
    let type = "Canvas2D";
    gl =
        canvas.getContext("webgl2", { antialias: true }) ??
            canvas.getContext("webgl", { antialias: true });
    if (gl) {
        const isWebGL2 = typeof WebGL2RenderingContext !== "undefined" &&
            gl instanceof WebGL2RenderingContext;
        type = isWebGL2 ? "WebGL2" : "WebGL1";
    }
    const rendering = { type };
    if (gl) {
        rendering.antialias = gl.getContextAttributes()?.antialias ?? false;
        rendering.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
        rendering.shaderHighp = precision !== null && precision.precision > 0;
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
            rendering.gpu = {
                vendor,
                renderer,
                software: /swiftshader|llvmpipe|software/i.test(renderer),
            };
        }
        else {
            rendering.gpu = { unavailable: true };
        }
    }
    /* ---------- Power ---------- */
    let power = {};
    if ("getBattery" in navigator) {
        try {
            const battery = await navigator.getBattery();
            power = {
                charging: battery.charging,
                level: Math.round(battery.level * 100) + "%",
            };
        }
        catch {
            power = { unavailable: true };
        }
    }
    else {
        power = { unavailable: true };
    }
    return {
        browser,
        rendering,
        power,
    };
}
//# sourceMappingURL=Diagnostic.js.map