import { GameEnv } from "./Config";
import { DefaultConfig, DefaultServerConfig } from "./DefaultConfig";
export class DevServerConfig extends DefaultServerConfig {
    turnstileSiteKey() {
        return "1x00000000000000000000AA";
    }
    turnstileSecretKey() {
        return "1x0000000000000000000000000000000AA";
    }
    adminToken() {
        return "WARNING_DEV_ADMIN_KEY_DO_NOT_USE_IN_PRODUCTION";
    }
    apiKey() {
        return "WARNING_DEV_API_KEY_DO_NOT_USE_IN_PRODUCTION";
    }
    env() {
        return GameEnv.Dev;
    }
    gameCreationRate() {
        return 5 * 1000;
    }
    numWorkers() {
        return 2;
    }
    jwtAudience() {
        return "localhost";
    }
    gitCommit() {
        return "DEV";
    }
    domain() {
        return "localhost";
    }
    subdomain() {
        return "";
    }
}
export class DevConfig extends DefaultConfig {
    constructor(sc, gc, us, isReplay) {
        super(sc, gc, us, isReplay);
    }
}
//# sourceMappingURL=DevConfig.js.map