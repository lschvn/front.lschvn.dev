import { GameEnv } from "./Config";
import { DefaultConfig } from "./DefaultConfig";
import { DevConfig, DevServerConfig } from "./DevConfig";
import { Env } from "./Env";
import { preprodConfig } from "./PreprodConfig";
import { prodConfig } from "./ProdConfig";
export let cachedSC = null;
export async function getConfig(gameConfig, userSettings, isReplay = false) {
    const sc = await getServerConfigFromClient();
    switch (sc.env()) {
        case GameEnv.Dev:
            return new DevConfig(sc, gameConfig, userSettings, isReplay);
        case GameEnv.Preprod:
        case GameEnv.Prod:
            console.log("using prod config");
            return new DefaultConfig(sc, gameConfig, userSettings, isReplay);
        default:
            throw Error(`unsupported server configuration: ${Env.GAME_ENV}`);
    }
}
export async function getServerConfigFromClient() {
    if (cachedSC) {
        return cachedSC;
    }
    const response = await fetch("/api/env");
    if (!response.ok) {
        throw new Error(`Failed to fetch server config: ${response.status} ${response.statusText}`);
    }
    const config = await response.json();
    // Log the retrieved configuration
    console.log("Server config loaded:", config);
    cachedSC = getServerConfig(config.game_env);
    return cachedSC;
}
export function getServerConfigFromServer() {
    const gameEnv = Env.GAME_ENV;
    return getServerConfig(gameEnv);
}
export function getServerConfig(gameEnv) {
    switch (gameEnv) {
        case "dev":
            console.log("using dev server config");
            return new DevServerConfig();
        case "staging":
            console.log("using preprod server config");
            return preprodConfig;
        case "prod":
            console.log("using prod server config");
            return prodConfig;
        default:
            throw Error(`unsupported server configuration: ${gameEnv}`);
    }
}
//# sourceMappingURL=ConfigLoader.js.map