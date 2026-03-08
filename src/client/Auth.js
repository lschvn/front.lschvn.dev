import { decodeJwt } from "jose";
import { z } from "zod";
import { TokenPayloadSchema } from "../core/ApiSchemas";
import { base64urlToUuid } from "../core/Base64";
import { getApiBase, getAudience } from "./Api";
import { generateCryptoRandomUUID } from "./Utils";
const PERSISTENT_ID_KEY = "player_persistent_id";
let __jwt = null;
let __refreshPromise = null;
export function discordLogin() {
    const redirectUri = encodeURIComponent(window.location.href);
    window.location.href = `${getApiBase()}/auth/login/discord?redirect_uri=${redirectUri}`;
}
export async function tempTokenLogin(token) {
    const response = await fetch(`${getApiBase()}/auth/login/token?login-token=${token}`, {
        credentials: "include",
    });
    if (response.status !== 200) {
        console.error("Token login failed", response);
        return null;
    }
    const json = await response.json();
    const { email } = json;
    return email;
}
export async function getAuthHeader() {
    const userAuthResult = await userAuth();
    if (!userAuthResult)
        return "";
    const { jwt } = userAuthResult;
    return `Bearer ${jwt}`;
}
export async function logOut(allSessions = false) {
    try {
        const response = await fetch(getApiBase() + (allSessions ? "/auth/revoke" : "/auth/logout"), {
            method: "POST",
            credentials: "include",
        });
        if (response.ok === false) {
            console.error("Logout failed", response);
            return false;
        }
        return true;
    }
    catch (e) {
        console.error("Logout failed", e);
        return false;
    }
    finally {
        __jwt = null;
        localStorage.removeItem(PERSISTENT_ID_KEY);
    }
}
export async function isLoggedIn() {
    const userAuthResult = await userAuth();
    return userAuthResult !== false;
}
export async function userAuth(shouldRefresh = true) {
    try {
        const jwt = __jwt;
        if (!jwt) {
            if (!shouldRefresh) {
                console.warn("No JWT found and shouldRefresh is false");
                return false;
            }
            console.log("No JWT found");
            await refreshJwt();
            return userAuth(false);
        }
        // Verify the JWT (requires browser support)
        // const jwks = createRemoteJWKSet(
        //   new URL(getApiBase() + "/.well-known/jwks.json"),
        // );
        // const { payload, protectedHeader } = await jwtVerify(token, jwks, {
        //   issuer: getApiBase(),
        //   audience: getAudience(),
        // });
        const payload = decodeJwt(jwt);
        const { iss, aud, exp } = payload;
        if (iss !== getApiBase()) {
            // JWT was not issued by the correct server
            console.error('unexpected "iss" claim value');
            logOut();
            return false;
        }
        const myAud = getAudience();
        if (myAud !== "localhost" && aud !== myAud) {
            // JWT was not issued for this website
            console.error('unexpected "aud" claim value');
            logOut();
            return false;
        }
        const now = Math.floor(Date.now() / 1000);
        if (exp !== undefined && now >= exp - 3 * 60) {
            console.log("jwt expired or about to expire");
            if (!shouldRefresh) {
                console.error("jwt expired and shouldRefresh is false");
                return false;
            }
            await refreshJwt();
            // Try to get login info again after refreshing
            return userAuth(false);
        }
        const result = TokenPayloadSchema.safeParse(payload);
        if (!result.success) {
            const error = z.prettifyError(result.error);
            console.error("Invalid payload", error);
            return false;
        }
        const claims = result.data;
        return { jwt, claims };
    }
    catch (e) {
        console.error("isLoggedIn failed", e);
        return false;
    }
}
async function refreshJwt() {
    if (__refreshPromise) {
        return __refreshPromise;
    }
    __refreshPromise = doRefreshJwt();
    try {
        await __refreshPromise;
    }
    finally {
        __refreshPromise = null;
    }
}
async function doRefreshJwt() {
    try {
        console.log("Refreshing jwt");
        const response = await fetch(getApiBase() + "/auth/refresh", {
            method: "POST",
            credentials: "include",
        });
        if (response.status !== 200) {
            console.error("Refresh failed", response);
            logOut();
            return;
        }
        const json = await response.json();
        const { jwt } = json;
        console.log("Refresh succeeded");
        __jwt = jwt;
    }
    catch (e) {
        console.error("Refresh failed", e);
        // if server unreachable, just clear jwt
        __jwt = null;
        return;
    }
}
export async function sendMagicLink(email) {
    try {
        const apiBase = getApiBase();
        const response = await fetch(`${apiBase}/auth/magic-link`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
                redirectDomain: window.location.origin,
                email: email,
            }),
        });
        if (response.ok) {
            return true;
        }
        else {
            console.error("Failed to send recovery email:", response.status, response.statusText);
            return false;
        }
    }
    catch (error) {
        console.error("Error sending recovery email:", error);
        return false;
    }
}
// WARNING: DO NOT EXPOSE THIS ID
export async function getPlayToken() {
    const result = await userAuth();
    if (result !== false)
        return result.jwt;
    return getPersistentIDFromLocalStorage();
}
// WARNING: DO NOT EXPOSE THIS ID
export function getPersistentID() {
    const jwt = __jwt;
    if (!jwt)
        return getPersistentIDFromLocalStorage();
    const payload = decodeJwt(jwt);
    const sub = payload.sub;
    if (!sub)
        return getPersistentIDFromLocalStorage();
    return base64urlToUuid(sub);
}
// WARNING: DO NOT EXPOSE THIS ID
function getPersistentIDFromLocalStorage() {
    // Try to get existing localStorage
    const value = localStorage.getItem(PERSISTENT_ID_KEY);
    if (value)
        return value;
    // If no localStorage exists, create new ID and set localStorage
    const newID = generateCryptoRandomUUID();
    localStorage.setItem(PERSISTENT_ID_KEY, newID);
    return newID;
}
//# sourceMappingURL=Auth.js.map