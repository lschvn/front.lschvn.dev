import { z } from "zod";
import { Difficulty, GameMode, GameType, PlayerType, TerrainType, UnitType, } from "../game/Game";
import { assertNever, sigmoid, simpleHash, within } from "../Util";
import { AIRBASE_CONSTRUCTION_TICKS, AIRBASE_COST, AIRBASE_OPERATIONAL_RANGE, AIRBASE_SQUADRON_CAPACITY, BOMBER_SQUADRON_COST, BOMBER_SQUADRON_HEALTH, FIGHTER_SQUADRON_COST, FIGHTER_SQUADRON_HEALTH, } from "./AirBalance";
import { AA_BATTERY_CONSTRUCTION_TICKS, AA_BATTERY_COST, AA_BATTERY_COOLDOWN, AA_BATTERY_ENGAGEMENT_RANGE, RADAR_STATION_CONSTRUCTION_TICKS, RADAR_STATION_COST, RADAR_STATION_DETECTION_RADIUS, } from "./AntiAirBalance";
import { GameEnv } from "./Config";
import { Env } from "./Env";
import { SONAR_STATION_CONSTRUCTION_TICKS, SONAR_STATION_COST, SONAR_STATION_COST_CAP, SUBMARINE_COST, SUBMARINE_COST_CAP, SUBMARINE_MAX_HEALTH, } from "./NavalStealthBalance";
import { PastelTheme } from "./PastelTheme";
import { PastelThemeDark } from "./PastelThemeDark";
const DEFENSE_DEBUFF_MIDPOINT = 150000;
const DEFENSE_DEBUFF_DECAY_RATE = Math.LN2 / 50000;
const DEFAULT_SPAWN_IMMUNITY_TICKS = 5 * 10;
const JwksSchema = z.object({
    keys: z
        .object({
        alg: z.literal("EdDSA"),
        crv: z.literal("Ed25519"),
        kty: z.literal("OKP"),
        x: z.string(),
    })
        .array()
        .min(1),
});
export class DefaultServerConfig {
    turnstileSecretKey() {
        return Env.TURNSTILE_SECRET_KEY ?? "";
    }
    allowedFlares() {
        return;
    }
    stripePublishableKey() {
        return Env.STRIPE_PUBLISHABLE_KEY ?? "";
    }
    domain() {
        return Env.DOMAIN ?? "";
    }
    subdomain() {
        return Env.SUBDOMAIN ?? "";
    }
    jwtIssuer() {
        const audience = this.jwtAudience();
        return audience === "localhost"
            ? "http://localhost:8787"
            : `https://api.${audience}`;
    }
    async jwkPublicKey() {
        if (this.publicKey)
            return this.publicKey;
        const jwksUrl = this.jwtIssuer() + "/.well-known/jwks.json";
        console.log(`Fetching JWKS from ${jwksUrl}`);
        const response = await fetch(jwksUrl);
        const result = JwksSchema.safeParse(await response.json());
        if (!result.success) {
            const error = z.prettifyError(result.error);
            console.error("Error parsing JWKS", error);
            throw new Error("Invalid JWKS");
        }
        this.publicKey = result.data.keys[0];
        return this.publicKey;
    }
    otelEnabled() {
        return (this.env() !== GameEnv.Dev &&
            Boolean(this.otelEndpoint()) &&
            Boolean(this.otelAuthHeader()));
    }
    otelEndpoint() {
        return Env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "";
    }
    otelAuthHeader() {
        return Env.OTEL_AUTH_HEADER ?? "";
    }
    gitCommit() {
        return Env.GIT_COMMIT ?? "";
    }
    apiKey() {
        return Env.API_KEY ?? "";
    }
    adminHeader() {
        return "x-admin-key";
    }
    adminToken() {
        const token = Env.ADMIN_TOKEN;
        if (!token) {
            throw new Error("ADMIN_TOKEN not set");
        }
        return token;
    }
    turnIntervalMs() {
        return 100;
    }
    gameCreationRate() {
        return 2 * 60 * 1000;
    }
    workerIndex(gameID) {
        return simpleHash(gameID) % this.numWorkers();
    }
    workerPath(gameID) {
        return `w${this.workerIndex(gameID)}`;
    }
    workerPort(gameID) {
        return this.workerPortByIndex(this.workerIndex(gameID));
    }
    workerPortByIndex(index) {
        return 3001 + index;
    }
}
export class DefaultConfig {
    constructor(_serverConfig, _gameConfig, _userSettings, _isReplay) {
        this._serverConfig = _serverConfig;
        this._gameConfig = _gameConfig;
        this._userSettings = _userSettings;
        this._isReplay = _isReplay;
        this.pastelTheme = new PastelTheme();
        this.pastelThemeDark = new PastelThemeDark();
        this.unitInfoCache = new Map();
    }
    stripePublishableKey() {
        return Env.STRIPE_PUBLISHABLE_KEY ?? "";
    }
    isReplay() {
        return this._isReplay;
    }
    traitorDefenseDebuff() {
        return 0.5;
    }
    traitorSpeedDebuff() {
        return 0.8;
    }
    traitorDuration() {
        return 30 * 10; // 30 seconds
    }
    spawnImmunityDuration() {
        return (this._gameConfig.spawnImmunityDuration ?? DEFAULT_SPAWN_IMMUNITY_TICKS);
    }
    nationSpawnImmunityDuration() {
        return DEFAULT_SPAWN_IMMUNITY_TICKS;
    }
    hasExtendedSpawnImmunity() {
        return this.spawnImmunityDuration() > DEFAULT_SPAWN_IMMUNITY_TICKS;
    }
    gameConfig() {
        return this._gameConfig;
    }
    serverConfig() {
        return this._serverConfig;
    }
    userSettings() {
        if (this._userSettings === null) {
            throw new Error("userSettings is null");
        }
        return this._userSettings;
    }
    cityTroopIncrease() {
        return 250000;
    }
    falloutDefenseModifier(falloutRatio) {
        // falloutRatio is between 0 and 1
        // So defense modifier is between [5, 2.5]
        return 5 - falloutRatio * 2;
    }
    SAMCooldown() {
        return 75;
    }
    SiloCooldown() {
        return 75;
    }
    defensePostRange() {
        return 30;
    }
    aaBatteryRange() {
        return AA_BATTERY_ENGAGEMENT_RANGE;
    }
    aaBatteryCooldown() {
        return AA_BATTERY_COOLDOWN;
    }
    radarStationRange() {
        return RADAR_STATION_DETECTION_RADIUS;
    }
    airbaseOperationalRange() {
        return AIRBASE_OPERATIONAL_RANGE;
    }
    airbaseSquadronCapacity() {
        return AIRBASE_SQUADRON_CAPACITY;
    }
    defensePostDefenseBonus() {
        return 5;
    }
    defensePostSpeedBonus() {
        return 3;
    }
    playerTeams() {
        return this._gameConfig.playerTeams ?? 0;
    }
    spawnNations() {
        return this._gameConfig.nations !== "disabled";
    }
    isUnitDisabled(unitType) {
        return this._gameConfig.disabledUnits?.includes(unitType) ?? false;
    }
    bots() {
        return this._gameConfig.bots;
    }
    instantBuild() {
        return this._gameConfig.instantBuild;
    }
    disableNavMesh() {
        return this._gameConfig.disableNavMesh ?? false;
    }
    isRandomSpawn() {
        return this._gameConfig.randomSpawn;
    }
    infiniteGold() {
        return this._gameConfig.infiniteGold;
    }
    donateGold() {
        return this._gameConfig.donateGold;
    }
    infiniteTroops() {
        return this._gameConfig.infiniteTroops;
    }
    donateTroops() {
        return this._gameConfig.donateTroops;
    }
    goldMultiplier() {
        return this._gameConfig.goldMultiplier ?? 1;
    }
    startingGold(playerInfo) {
        if (playerInfo.playerType === PlayerType.Bot) {
            return 0n;
        }
        return BigInt(this._gameConfig.startingGold ?? 0);
    }
    trainSpawnRate(numPlayerFactories) {
        // hyperbolic decay, midpoint at 10 factories
        // expected number of trains = numPlayerFactories  / trainSpawnRate(numPlayerFactories)
        return (numPlayerFactories + 10) * 18;
    }
    trainGold(rel) {
        const multiplier = this.goldMultiplier();
        let baseGold;
        switch (rel) {
            case "ally":
                baseGold = 35000n;
                break;
            case "team":
            case "other":
                baseGold = 25000n;
                break;
            case "self":
                baseGold = 10000n;
                break;
        }
        return BigInt(Math.floor(Number(baseGold) * multiplier));
    }
    trainStationMinRange() {
        return 15;
    }
    trainStationMaxRange() {
        return 100;
    }
    railroadMaxSize() {
        return 120;
    }
    tradeShipGold(dist) {
        // Sigmoid: concave start, sharp S-curve middle, linear end - heavily punishes trades under range debuff.
        const debuff = this.tradeShipShortRangeDebuff();
        const baseGold = 50000 / (1 + Math.exp(-0.03 * (dist - debuff))) + 50 * dist;
        const multiplier = this.goldMultiplier();
        return BigInt(Math.floor(baseGold * multiplier));
    }
    // Probability of trade ship spawn = 1 / tradeShipSpawnRate
    tradeShipSpawnRate(tradeShipSpawnRejections, numTradeShips) {
        const decayRate = Math.LN2 / 50;
        // Approaches 0 as numTradeShips increase
        const baseSpawnRate = 1 - sigmoid(numTradeShips, decayRate, 200);
        // Pity timer: increases spawn chance after consecutive rejections
        const rejectionModifier = 1 / (tradeShipSpawnRejections + 1);
        return Math.floor((100 * rejectionModifier) / baseSpawnRate);
    }
    unitInfo(type) {
        const cached = this.unitInfoCache.get(type);
        if (cached !== undefined) {
            return cached;
        }
        let info;
        switch (type) {
            case UnitType.TransportShip:
                info = {
                    cost: () => 0n,
                };
                break;
            case UnitType.Warship:
                info = {
                    cost: this.costWrapper((numUnits) => Math.min(1000000, (numUnits + 1) * 250000), UnitType.Warship),
                    maxHealth: 1000,
                };
                break;
            case UnitType.Submarine:
                info = {
                    cost: this.costWrapper((numUnits) => Math.min(SUBMARINE_COST_CAP, (numUnits + 1) * SUBMARINE_COST), UnitType.Submarine),
                    maxHealth: SUBMARINE_MAX_HEALTH,
                };
                break;
            case UnitType.Shell:
                info = {
                    cost: () => 0n,
                    damage: 250,
                };
                break;
            case UnitType.SAMMissile:
                info = {
                    cost: () => 0n,
                };
                break;
            case UnitType.FighterSquadron:
                info = {
                    cost: () => BigInt(FIGHTER_SQUADRON_COST),
                    maxHealth: FIGHTER_SQUADRON_HEALTH,
                };
                break;
            case UnitType.BomberSquadron:
                info = {
                    cost: () => BigInt(BOMBER_SQUADRON_COST),
                    maxHealth: BOMBER_SQUADRON_HEALTH,
                };
                break;
            case UnitType.Port:
                info = {
                    cost: this.costWrapper((numUnits) => Math.min(1000000, Math.pow(2, numUnits) * 125000), UnitType.Port, UnitType.Factory),
                    constructionDuration: this.instantBuild() ? 0 : 2 * 10,
                    upgradable: true,
                };
                break;
            case UnitType.AtomBomb:
                info = {
                    cost: this.costWrapper(() => 750000, UnitType.AtomBomb),
                };
                break;
            case UnitType.HydrogenBomb:
                info = {
                    cost: this.costWrapper(() => 5000000, UnitType.HydrogenBomb),
                };
                break;
            case UnitType.MIRV:
                info = {
                    cost: (game, player) => {
                        if (player.type() === PlayerType.Human && this.infiniteGold()) {
                            return 0n;
                        }
                        return 25000000n + game.stats().numMirvsLaunched() * 15000000n;
                    },
                };
                break;
            case UnitType.MIRVWarhead:
                info = {
                    cost: () => 0n,
                };
                break;
            case UnitType.TradeShip:
                info = {
                    cost: () => 0n,
                };
                break;
            case UnitType.MissileSilo:
                info = {
                    cost: this.costWrapper(() => 1000000, UnitType.MissileSilo),
                    constructionDuration: this.instantBuild() ? 0 : 10 * 10,
                    upgradable: true,
                };
                break;
            case UnitType.DefensePost:
                info = {
                    cost: this.costWrapper((numUnits) => Math.min(250000, (numUnits + 1) * 50000), UnitType.DefensePost),
                    constructionDuration: this.instantBuild() ? 0 : 5 * 10,
                };
                break;
            case UnitType.SAMLauncher:
                info = {
                    cost: this.costWrapper((numUnits) => Math.min(3000000, (numUnits + 1) * 1500000), UnitType.SAMLauncher),
                    constructionDuration: this.instantBuild() ? 0 : 30 * 10,
                    upgradable: true,
                };
                break;
            case UnitType.SonarStation:
                info = {
                    cost: this.costWrapper((numUnits) => Math.min(SONAR_STATION_COST_CAP, (numUnits + 1) * SONAR_STATION_COST), UnitType.SonarStation),
                    constructionDuration: this.instantBuild()
                        ? 0
                        : SONAR_STATION_CONSTRUCTION_TICKS,
                };
                break;
            case UnitType.AABattery:
                info = {
                    cost: this.costWrapper(() => AA_BATTERY_COST, UnitType.AABattery),
                    constructionDuration: this.instantBuild()
                        ? 0
                        : AA_BATTERY_CONSTRUCTION_TICKS,
                };
                break;
            case UnitType.RadarStation:
                info = {
                    cost: this.costWrapper(() => RADAR_STATION_COST, UnitType.RadarStation),
                    constructionDuration: this.instantBuild()
                        ? 0
                        : RADAR_STATION_CONSTRUCTION_TICKS,
                };
                break;
            case UnitType.Airbase:
                info = {
                    cost: this.costWrapper(() => AIRBASE_COST, UnitType.Airbase),
                    constructionDuration: this.instantBuild() ? 0 : AIRBASE_CONSTRUCTION_TICKS,
                };
                break;
            case UnitType.City:
                info = {
                    cost: this.costWrapper((numUnits) => Math.min(1000000, Math.pow(2, numUnits) * 125000), UnitType.City),
                    constructionDuration: this.instantBuild() ? 0 : 2 * 10,
                    upgradable: true,
                };
                break;
            case UnitType.Factory:
                info = {
                    cost: this.costWrapper((numUnits) => Math.min(1000000, Math.pow(2, numUnits) * 125000), UnitType.Factory, UnitType.Port),
                    constructionDuration: this.instantBuild() ? 0 : 2 * 10,
                    upgradable: true,
                };
                break;
            case UnitType.Train:
                info = {
                    cost: () => 0n,
                };
                break;
            default:
                assertNever(type);
        }
        this.unitInfoCache.set(type, info);
        return info;
    }
    costWrapper(costFn, ...types) {
        return (game, player) => {
            if (player.type() === PlayerType.Human && this.infiniteGold()) {
                return 0n;
            }
            const numUnits = types.reduce((acc, type) => acc +
                Math.min(player.unitsOwned(type), player.unitsConstructed(type)), 0);
            return BigInt(costFn(numUnits));
        };
    }
    defaultDonationAmount(sender) {
        return Math.floor(sender.troops() / 3);
    }
    donateCooldown() {
        return 10 * 10;
    }
    embargoAllCooldown() {
        return 10 * 10;
    }
    deletionMarkDuration() {
        return 30 * 10;
    }
    deleteUnitCooldown() {
        return 30 * 10;
    }
    emojiMessageDuration() {
        return 5 * 10;
    }
    emojiMessageCooldown() {
        return 5 * 10;
    }
    targetDuration() {
        return 10 * 10;
    }
    targetCooldown() {
        return 15 * 10;
    }
    allianceRequestDuration() {
        return 20 * 10;
    }
    allianceRequestCooldown() {
        return 30 * 10;
    }
    allianceDuration() {
        return 300 * 10; // 5 minutes.
    }
    temporaryEmbargoDuration() {
        return 300 * 10; // 5 minutes.
    }
    minDistanceBetweenPlayers() {
        return 30;
    }
    percentageTilesOwnedToWin() {
        if (this._gameConfig.gameMode === GameMode.Team) {
            return 95;
        }
        return 80;
    }
    boatMaxNumber() {
        if (this.isUnitDisabled(UnitType.TransportShip)) {
            return 0;
        }
        return 3;
    }
    numSpawnPhaseTurns() {
        return this._gameConfig.gameType === GameType.Singleplayer ? 100 : 300;
    }
    numBots() {
        return this.bots();
    }
    theme() {
        return this.userSettings()?.darkMode()
            ? this.pastelThemeDark
            : this.pastelTheme;
    }
    attackLogic(gm, attackTroops, attacker, defender, tileToConquer) {
        let mag = 0;
        let speed = 0;
        const type = gm.terrainType(tileToConquer);
        switch (type) {
            case TerrainType.Plains:
                mag = 80;
                speed = 16.5;
                break;
            case TerrainType.Highland:
                mag = 100;
                speed = 20;
                break;
            case TerrainType.Mountain:
                mag = 120;
                speed = 25;
                break;
            default:
                throw new Error(`terrain type ${type} not supported`);
        }
        if (defender.isPlayer() && !gm.hasSuppression(tileToConquer)) {
            for (const dp of gm.nearbyUnits(tileToConquer, gm.config().defensePostRange(), UnitType.DefensePost)) {
                if (dp.unit.owner() === defender) {
                    mag *= this.defensePostDefenseBonus();
                    speed *= this.defensePostSpeedBonus();
                    break;
                }
            }
        }
        if (gm.hasFallout(tileToConquer)) {
            const falloutRatio = gm.numTilesWithFallout() / gm.numLandTiles();
            mag *= this.falloutDefenseModifier(falloutRatio);
            speed *= this.falloutDefenseModifier(falloutRatio);
        }
        if (attacker.isPlayer() && defender.isPlayer()) {
            if (defender.isDisconnected() && attacker.isOnSameTeam(defender)) {
                // No troop loss if defender is disconnected and on same team
                mag = 0;
            }
            if (attacker.type() === PlayerType.Human &&
                defender.type() === PlayerType.Bot) {
                mag *= 0.8;
            }
            if (attacker.type() === PlayerType.Nation &&
                defender.type() === PlayerType.Bot) {
                mag *= 0.8;
            }
        }
        if (defender.isPlayer()) {
            const defenseSig = 1 -
                sigmoid(defender.numTilesOwned(), DEFENSE_DEBUFF_DECAY_RATE, DEFENSE_DEBUFF_MIDPOINT);
            const largeDefenderSpeedDebuff = 0.7 + 0.3 * defenseSig;
            const largeDefenderAttackDebuff = 0.7 + 0.3 * defenseSig;
            let largeAttackBonus = 1;
            if (attacker.numTilesOwned() > 100000) {
                largeAttackBonus = Math.sqrt(100000 / attacker.numTilesOwned()) ** 0.7;
            }
            let largeAttackerSpeedBonus = 1;
            if (attacker.numTilesOwned() > 100000) {
                largeAttackerSpeedBonus = (100000 / attacker.numTilesOwned()) ** 0.6;
            }
            const defenderTroopLoss = defender.troops() / defender.numTilesOwned();
            const traitorMod = defender.isTraitor() ? this.traitorDefenseDebuff() : 1;
            const currentAttackerLoss = within(defender.troops() / attackTroops, 0.6, 2) *
                mag *
                0.8 *
                largeDefenderAttackDebuff *
                largeAttackBonus *
                traitorMod;
            const altAttackerLoss = 1.3 * defenderTroopLoss * (mag / 100) * traitorMod;
            const attackerTroopLoss = 0.5 * currentAttackerLoss + 0.5 * altAttackerLoss;
            return {
                attackerTroopLoss,
                defenderTroopLoss,
                tilesPerTickUsed: within(defender.troops() / (5 * attackTroops), 0.2, 1.5) *
                    speed *
                    largeDefenderSpeedDebuff *
                    largeAttackerSpeedBonus *
                    (defender.isTraitor() ? this.traitorSpeedDebuff() : 1),
            };
        }
        else {
            return {
                attackerTroopLoss: attacker.type() === PlayerType.Bot ? mag / 10 : mag / 5,
                defenderTroopLoss: 0,
                tilesPerTickUsed: within((2000 * Math.max(10, speed)) / attackTroops, 5, 100),
            };
        }
    }
    attackTilesPerTick(attackTroops, attacker, defender, numAdjacentTilesWithEnemy) {
        if (defender.isPlayer()) {
            return (within(((5 * attackTroops) / defender.troops()) * 2, 0.01, 0.5) *
                numAdjacentTilesWithEnemy *
                3);
        }
        else {
            return numAdjacentTilesWithEnemy * 2;
        }
    }
    boatAttackAmount(attacker, defender) {
        return Math.floor(attacker.troops() / 5);
    }
    warshipShellLifetime() {
        return 20; // in ticks (one tick is 100ms)
    }
    radiusPortSpawn() {
        return 20;
    }
    tradeShipShortRangeDebuff() {
        return 300;
    }
    proximityBonusPortsNb(totalPorts) {
        return within(totalPorts / 3, 4, totalPorts);
    }
    attackAmount(attacker, defender) {
        if (attacker.type() === PlayerType.Bot) {
            return attacker.troops() / 20;
        }
        else {
            return attacker.troops() / 5;
        }
    }
    startManpower(playerInfo) {
        if (playerInfo.playerType === PlayerType.Bot) {
            return 10000;
        }
        if (playerInfo.playerType === PlayerType.Nation) {
            switch (this._gameConfig.difficulty) {
                case Difficulty.Easy:
                    return 12500;
                case Difficulty.Medium:
                    return 18750;
                case Difficulty.Hard:
                    return 25000; // Like humans
                case Difficulty.Impossible:
                    return 31250;
                default:
                    assertNever(this._gameConfig.difficulty);
            }
        }
        return this.infiniteTroops() ? 1000000 : 25000;
    }
    maxTroops(player) {
        const maxTroops = player.type() === PlayerType.Human && this.infiniteTroops()
            ? 1000000000
            : 2 * (Math.pow(player.numTilesOwned(), 0.6) * 1000 + 50000) +
                player
                    .units(UnitType.City)
                    .map((city) => city.level())
                    .reduce((a, b) => a + b, 0) *
                    this.cityTroopIncrease();
        if (player.type() === PlayerType.Bot) {
            return maxTroops / 3;
        }
        if (player.type() === PlayerType.Human) {
            return maxTroops;
        }
        switch (this._gameConfig.difficulty) {
            case Difficulty.Easy:
                return maxTroops * 0.5;
            case Difficulty.Medium:
                return maxTroops * 0.75;
            case Difficulty.Hard:
                return maxTroops * 1; // Like humans
            case Difficulty.Impossible:
                return maxTroops * 1.25;
            default:
                assertNever(this._gameConfig.difficulty);
        }
    }
    troopIncreaseRate(player) {
        const max = this.maxTroops(player);
        let toAdd = 10 + Math.pow(player.troops(), 0.73) / 4;
        const ratio = 1 - player.troops() / max;
        toAdd *= ratio;
        if (player.type() === PlayerType.Bot) {
            toAdd *= 0.6;
        }
        if (player.type() === PlayerType.Nation) {
            switch (this._gameConfig.difficulty) {
                case Difficulty.Easy:
                    toAdd *= 0.9;
                    break;
                case Difficulty.Medium:
                    toAdd *= 0.95;
                    break;
                case Difficulty.Hard:
                    toAdd *= 1; // Like humans
                    break;
                case Difficulty.Impossible:
                    toAdd *= 1.05;
                    break;
                default:
                    assertNever(this._gameConfig.difficulty);
            }
        }
        return Math.min(player.troops() + toAdd, max) - player.troops();
    }
    goldAdditionRate(player) {
        const multiplier = this.goldMultiplier();
        let baseRate;
        if (player.type() === PlayerType.Bot) {
            baseRate = 50n;
        }
        else {
            baseRate = 100n;
        }
        return BigInt(Math.floor(Number(baseRate) * multiplier));
    }
    nukeMagnitudes(unitType) {
        switch (unitType) {
            case UnitType.MIRVWarhead:
                return { inner: 12, outer: 18 };
            case UnitType.AtomBomb:
                return { inner: 12, outer: 30 };
            case UnitType.HydrogenBomb:
                return { inner: 80, outer: 100 };
        }
        throw new Error(`Unknown nuke type: ${unitType}`);
    }
    nukeAllianceBreakThreshold() {
        return 100;
    }
    defaultNukeSpeed() {
        return 6;
    }
    defaultNukeTargetableRange() {
        return 150;
    }
    defaultSamRange() {
        return 70;
    }
    samRange(level) {
        // rational growth function (level 1 = 70, level 5 just above hydro range, asymptotically approaches 150)
        return this.maxSamRange() - 480 / (level + 5);
    }
    maxSamRange() {
        return 150;
    }
    defaultSamMissileSpeed() {
        return 12;
    }
    // Humans can be soldiers, soldiers attacking, soldiers in boat etc.
    nukeDeathFactor(nukeType, humans, tilesOwned, maxTroops) {
        if (nukeType !== UnitType.MIRVWarhead) {
            return (5 * humans) / Math.max(1, tilesOwned);
        }
        const targetTroops = 0.03 * maxTroops;
        const excessTroops = Math.max(0, humans - targetTroops);
        const scalingFactor = 500;
        const steepness = 2;
        const normalizedExcess = excessTroops / maxTroops;
        return scalingFactor * (1 - Math.exp(-steepness * normalizedExcess));
    }
    structureMinDist() {
        return 15;
    }
    shellLifetime() {
        return 50;
    }
    warshipPatrolRange() {
        return 100;
    }
    warshipTargettingRange() {
        return 130;
    }
    warshipShellAttackRate() {
        return 20;
    }
    defensePostShellAttackRate() {
        return 100;
    }
    safeFromPiratesCooldownMax() {
        return 20;
    }
    defensePostTargettingRange() {
        return 75;
    }
    allianceExtensionPromptOffset() {
        return 300; // 30 seconds before expiration
    }
}
//# sourceMappingURL=DefaultConfig.js.map