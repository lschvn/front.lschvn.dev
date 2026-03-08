import { GameEnv } from "./Config";
import { DefaultServerConfig } from "./DefaultConfig";
export const prodConfig = new (class extends DefaultServerConfig {
    numWorkers() {
        return 20;
    }
    env() {
        return GameEnv.Prod;
    }
    jwtAudience() {
        return "openfront.io";
    }
    turnstileSiteKey() {
        return "0x4AAAAAACFLkaecN39lS8sk";
    }
})();
//# sourceMappingURL=ProdConfig.js.map