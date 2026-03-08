export class TestServerConfig {
    turnstileSiteKey() {
        throw new Error("Method not implemented.");
    }
    turnstileSecretKey() {
        throw new Error("Method not implemented.");
    }
    apiKey() {
        throw new Error("Method not implemented.");
    }
    allowedFlares() {
        throw new Error("Method not implemented.");
    }
    stripePublishableKey() {
        throw new Error("Method not implemented.");
    }
    domain() {
        throw new Error("Method not implemented.");
    }
    subdomain() {
        throw new Error("Method not implemented.");
    }
    jwtAudience() {
        throw new Error("Method not implemented.");
    }
    jwtIssuer() {
        throw new Error("Method not implemented.");
    }
    jwkPublicKey() {
        throw new Error("Method not implemented.");
    }
    otelEnabled() {
        throw new Error("Method not implemented.");
    }
    otelEndpoint() {
        throw new Error("Method not implemented.");
    }
    otelAuthHeader() {
        throw new Error("Method not implemented.");
    }
    turnIntervalMs() {
        throw new Error("Method not implemented.");
    }
    gameCreationRate() {
        throw new Error("Method not implemented.");
    }
    async lobbyMaxPlayers() {
        throw new Error("Method not implemented.");
    }
    numWorkers() {
        throw new Error("Method not implemented.");
    }
    workerIndex(gameID) {
        throw new Error("Method not implemented.");
    }
    workerPath(gameID) {
        throw new Error("Method not implemented.");
    }
    workerPort(gameID) {
        throw new Error("Method not implemented.");
    }
    workerPortByIndex(workerID) {
        throw new Error("Method not implemented.");
    }
    env() {
        throw new Error("Method not implemented.");
    }
    adminToken() {
        throw new Error("Method not implemented.");
    }
    adminHeader() {
        throw new Error("Method not implemented.");
    }
    gitCommit() {
        throw new Error("Method not implemented.");
    }
    getRandomPublicGameModifiers() {
        return {
            isCompact: false,
            isRandomSpawn: false,
            isCrowded: false,
            isHardNations: false,
        };
    }
    async supportsCompactMapForTeams() {
        throw new Error("Method not implemented.");
    }
}
//# sourceMappingURL=TestServerConfig.js.map