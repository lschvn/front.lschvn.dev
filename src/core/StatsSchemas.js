import { z } from "zod";
import { UnitType } from "./game/Game";
export const bombUnits = ["abomb", "hbomb", "mirv", "mirvw"];
export const BombUnitSchema = z.enum(bombUnits);
export const unitTypeToBombUnit = {
    [UnitType.AtomBomb]: "abomb",
    [UnitType.HydrogenBomb]: "hbomb",
    [UnitType.MIRV]: "mirv",
    [UnitType.MIRVWarhead]: "mirvw",
};
export const boatUnits = ["trade", "trans"];
export const BoatUnitSchema = z.enum(boatUnits);
// export const unitTypeToBoatUnit = {
//   [UnitType.TradeShip]: "trade",
//   [UnitType.TransportShip]: "trans",
// } as const satisfies Record<BoatUnitType, BoatUnit>;
export const otherUnits = [
    "city",
    "defp",
    "port",
    "wshp",
    "silo",
    "saml",
    "aabt",
    "radr",
    "airb",
    "fact",
];
export const OtherUnitSchema = z.enum(otherUnits);
export const unitTypeToOtherUnit = {
    [UnitType.City]: "city",
    [UnitType.DefensePost]: "defp",
    [UnitType.MissileSilo]: "silo",
    [UnitType.Port]: "port",
    [UnitType.SAMLauncher]: "saml",
    [UnitType.AABattery]: "aabt",
    [UnitType.RadarStation]: "radr",
    [UnitType.Airbase]: "airb",
    [UnitType.Warship]: "wshp",
    [UnitType.Factory]: "fact",
};
// Attacks
export const ATTACK_INDEX_SENT = 0; // Outgoing attack troops
export const ATTACK_INDEX_RECV = 1; // Incmoing attack troops
export const ATTACK_INDEX_CANCEL = 2; // Cancelled attack troops
// Player types
export const PLAYER_INDEX_HUMAN = 0;
export const PLAYER_INDEX_NATION = 1;
export const PLAYER_INDEX_BOT = 2;
// Boats
export const BOAT_INDEX_SENT = 0; // Boats launched
export const BOAT_INDEX_ARRIVE = 1; // Boats arrived
export const BOAT_INDEX_CAPTURE = 2; // Boats captured
export const BOAT_INDEX_DESTROY = 3; // Boats destroyed
// Bombs
export const BOMB_INDEX_LAUNCH = 0; // Bombs launched
export const BOMB_INDEX_LAND = 1; // Bombs landed
export const BOMB_INDEX_INTERCEPT = 2; // Bombs intercepted
// Gold
export const GOLD_INDEX_WORK = 0; // Gold earned by workers
export const GOLD_INDEX_WAR = 1; // Gold earned by conquering players
export const GOLD_INDEX_TRADE = 2; // Gold earned by trade ships
export const GOLD_INDEX_STEAL = 3; // Gold earned by capturing trade ships
export const GOLD_INDEX_TRAIN_SELF = 4; // Gold earned by own trains
export const GOLD_INDEX_TRAIN_OTHER = 5; // Gold earned by other players trains
// Other Units
export const OTHER_INDEX_BUILT = 0; // Structures and warships built
export const OTHER_INDEX_DESTROY = 1; // Structures and warships destroyed
export const OTHER_INDEX_CAPTURE = 2; // Structures captured
export const OTHER_INDEX_LOST = 3; // Structures/warships destroyed/captured by others
export const OTHER_INDEX_UPGRADE = 4; // Structures upgraded
export const BigIntStringSchema = z.preprocess((val) => {
    if (typeof val === "string" && /^-?\d+$/.test(val))
        return BigInt(val);
    if (typeof val === "bigint")
        return val;
    return val;
}, z.bigint());
const AtLeastOneNumberSchema = BigIntStringSchema.array().min(1);
export const PlayerStatsSchema = z
    .object({
    attacks: AtLeastOneNumberSchema.optional(),
    betrayals: BigIntStringSchema.optional(),
    killedAt: BigIntStringSchema.optional(),
    conquests: AtLeastOneNumberSchema.optional(),
    boats: z.partialRecord(BoatUnitSchema, AtLeastOneNumberSchema).optional(),
    bombs: z.partialRecord(BombUnitSchema, AtLeastOneNumberSchema).optional(),
    gold: AtLeastOneNumberSchema.optional(),
    units: z.partialRecord(OtherUnitSchema, AtLeastOneNumberSchema).optional(),
})
    .optional();
//# sourceMappingURL=StatsSchemas.js.map