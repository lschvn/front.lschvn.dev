export class Client {
    constructor(clientID, persistentID, claims, roles, flares, ip, username, uncensoredUsername, ws, cosmetics) {
        this.clientID = clientID;
        this.persistentID = persistentID;
        this.claims = claims;
        this.roles = roles;
        this.flares = flares;
        this.ip = ip;
        this.username = username;
        this.uncensoredUsername = uncensoredUsername;
        this.ws = ws;
        this.cosmetics = cosmetics;
        this.lastPing = Date.now();
        this.hashes = new Map();
        this.reportedWinner = null;
    }
}
//# sourceMappingURL=Client.js.map