import { GameEnv } from "./Config";
import { DefaultServerConfig } from "./DefaultConfig";
export const preprodConfig = new (class extends DefaultServerConfig {
    env() {
        return GameEnv.Preprod;
    }
    numWorkers() {
        return 2;
    }
    turnstileSiteKey() {
        return "0x4AAAAAAB7QetxHwRCKw-aP";
    }
    jwtAudience() {
        return "openfront.dev";
    }
    allowedFlares() {
        return undefined;
        // TODO: Uncomment this after testing.
        // Allow access without login for now to test
        // the new login flow.
        // return [
        //   // "access:openfront.dev"
        // ];
    }
})();
//# sourceMappingURL=PreprodConfig.js.map