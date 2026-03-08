import { renderNumber, renderTroops } from "../../client/Utils";
import { EMPTY_SUPPLY_SUMMARY } from "../configuration/SupplyBalance";
import { PseudoRandom } from "../PseudoRandom";
import { assertNever, distSortUnit, minInt, simpleHash, toInt, within, } from "../Util";
import { AttackImpl } from "./AttackImpl";
import { AllPlayers, ColoredTeams, GameMode, MessageType, PlayerBuildable, PlayerType, Relation, Structures, UnitType, } from "./Game";
import { andFN, manhattanDistFN } from "./GameMap";
import { GameUpdateType, } from "./GameUpdates";
import { bestShoreDeploymentSource, canBuildTransportShip, } from "./TransportShipUtils";
import { UnitImpl } from "./UnitImpl";
class Donation {
    constructor(recipient, tick) {
        this.recipient = recipient;
        this.tick = tick;
    }
}
export class PlayerImpl {
    constructor(mg, _smallID, playerInfo, startTroops, _team) {
        this.mg = mg;
        this._smallID = _smallID;
        this.playerInfo = playerInfo;
        this._team = _team;
        this._lastTileChange = 0;
        this.markedTraitorTick = -1;
        this._betrayalCount = 0;
        this.embargoes = new Map();
        this._borderTiles = new Set();
        this._units = [];
        this._tiles = new Set();
        this.pastOutgoingAllianceRequests = [];
        this._expiredAlliances = [];
        this.targets_ = [];
        this.outgoingEmojis_ = [];
        this.sentDonations = [];
        this.relations = new Map();
        this.lastDeleteUnitTick = -1;
        this.lastEmbargoAllTick = -1;
        this._incomingAttacks = [];
        this._outgoingAttacks = [];
        this._outgoingLandAttacks = [];
        this._isDisconnected = false;
        this._supplySummary = EMPTY_SUPPLY_SUMMARY;
        this.numUnitsConstructed = {};
        this._name = playerInfo.name;
        this._troops = toInt(startTroops);
        this._gold = mg.config().startingGold(playerInfo);
        this._displayName = this._name;
        this._pseudo_random = new PseudoRandom(simpleHash(this.playerInfo.id));
    }
    toUpdate() {
        const outgoingAllianceRequests = this.outgoingAllianceRequests().map((ar) => ar.recipient().id());
        return {
            type: GameUpdateType.Player,
            clientID: this.clientID(),
            name: this.name(),
            displayName: this.displayName(),
            id: this.id(),
            team: this.team() ?? undefined,
            smallID: this.smallID(),
            playerType: this.type(),
            isAlive: this.isAlive(),
            isDisconnected: this.isDisconnected(),
            tilesOwned: this.numTilesOwned(),
            gold: this._gold,
            troops: this.troops(),
            allies: this.alliances().map((a) => a.other(this).smallID()),
            embargoes: new Set([...this.embargoes.keys()].map((p) => p.toString())),
            isTraitor: this.isTraitor(),
            traitorRemainingTicks: this.getTraitorRemainingTicks(),
            targets: this.targets().map((p) => p.smallID()),
            outgoingEmojis: this.outgoingEmojis(),
            outgoingAttacks: this._outgoingAttacks.map((a) => {
                return {
                    attackerID: a.attacker().smallID(),
                    targetID: a.target().smallID(),
                    troops: a.troops(),
                    id: a.id(),
                    mode: a.mode(),
                    retreating: a.retreating(),
                };
            }),
            incomingAttacks: this._incomingAttacks.map((a) => {
                return {
                    attackerID: a.attacker().smallID(),
                    targetID: a.target().smallID(),
                    troops: a.troops(),
                    id: a.id(),
                    mode: a.mode(),
                    retreating: a.retreating(),
                };
            }),
            outgoingAllianceRequests: outgoingAllianceRequests,
            alliances: this.alliances().map((a) => ({
                id: a.id(),
                other: a.other(this).id(),
                createdAt: a.createdAt(),
                expiresAt: a.expiresAt(),
                hasExtensionRequest: a.expiresAt() <=
                    this.mg.ticks() +
                        this.mg.config().allianceExtensionPromptOffset(),
            })),
            hasSpawned: this.hasSpawned(),
            betrayals: this._betrayalCount,
            lastDeleteUnitTick: this.lastDeleteUnitTick,
            isLobbyCreator: this.isLobbyCreator(),
            supplySummary: this.supplySummary(),
        };
    }
    smallID() {
        return this._smallID;
    }
    name() {
        return this._name;
    }
    displayName() {
        return this._displayName;
    }
    clientID() {
        return this.playerInfo.clientID;
    }
    id() {
        return this.playerInfo.id;
    }
    type() {
        return this.playerInfo.playerType;
    }
    clan() {
        return this.playerInfo.clan;
    }
    units(...types) {
        const len = types.length;
        if (len === 0) {
            return this._units;
        }
        // Fast paths for common small arity calls to avoid Set allocation.
        if (len === 1) {
            const t0 = types[0];
            const out = [];
            for (const u of this._units) {
                if (u.type() === t0)
                    out.push(u);
            }
            return out;
        }
        if (len === 2) {
            const t0 = types[0];
            const t1 = types[1];
            if (t0 === t1) {
                const out = [];
                for (const u of this._units) {
                    if (u.type() === t0)
                        out.push(u);
                }
                return out;
            }
            const out = [];
            for (const u of this._units) {
                const t = u.type();
                if (t === t0 || t === t1)
                    out.push(u);
            }
            return out;
        }
        if (len === 3) {
            const t0 = types[0];
            const t1 = types[1];
            const t2 = types[2];
            // Keep semantics identical for duplicates in types by using direct comparisons.
            const out = [];
            for (const u of this._units) {
                const t = u.type();
                if (t === t0 || t === t1 || t === t2)
                    out.push(u);
            }
            return out;
        }
        const ts = new Set(types);
        const out = [];
        for (const u of this._units) {
            if (ts.has(u.type()))
                out.push(u);
        }
        return out;
    }
    recordUnitConstructed(type) {
        if (this.numUnitsConstructed[type] !== undefined) {
            this.numUnitsConstructed[type]++;
        }
        else {
            this.numUnitsConstructed[type] = 1;
        }
    }
    // Count of units built by the player, including construction
    unitsConstructed(type) {
        const built = this.numUnitsConstructed[type] ?? 0;
        let constructing = 0;
        for (const unit of this._units) {
            if (unit.type() !== type)
                continue;
            if (!unit.isUnderConstruction())
                continue;
            constructing++;
        }
        const total = constructing + built;
        return total;
    }
    // Count of units owned by the player, not including construction
    unitCount(type) {
        let total = 0;
        for (const unit of this._units) {
            if (unit.type() === type) {
                total += unit.level();
            }
        }
        return total;
    }
    // Count of units owned by the player, including construction
    unitsOwned(type) {
        let total = 0;
        for (const unit of this._units) {
            if (unit.type() === type) {
                if (unit.isUnderConstruction()) {
                    total++;
                }
                else {
                    total += unit.level();
                }
            }
        }
        return total;
    }
    sharesBorderWith(other) {
        for (const border of this._borderTiles) {
            for (const neighbor of this.mg.map().neighbors(border)) {
                if (this.mg.map().ownerID(neighbor) === other.smallID()) {
                    return true;
                }
            }
        }
        return false;
    }
    numTilesOwned() {
        return this._tiles.size;
    }
    tiles() {
        return new Set(this._tiles.values());
    }
    borderTiles() {
        return this._borderTiles;
    }
    neighbors() {
        const ns = new Set();
        for (const border of this.borderTiles()) {
            for (const neighbor of this.mg.map().neighbors(border)) {
                if (this.mg.map().isLand(neighbor)) {
                    const owner = this.mg.map().ownerID(neighbor);
                    if (owner !== this.smallID()) {
                        ns.add(this.mg.playerBySmallID(owner));
                    }
                }
            }
        }
        return Array.from(ns);
    }
    isPlayer() {
        return true;
    }
    setTroops(troops) {
        this._troops = toInt(troops);
    }
    conquer(tile) {
        this.mg.conquer(this, tile);
    }
    orderRetreat(id) {
        const attack = this._outgoingAttacks.find((attack) => attack.id() === id);
        if (!attack) {
            console.warn(`Didn't find outgoing attack with id ${id}`);
            return;
        }
        attack.orderRetreat();
    }
    executeRetreat(id) {
        const attack = this._outgoingAttacks.find((attack) => attack.id() === id);
        // Execution is delayed so it's not an error that the attack does not exist.
        if (!attack) {
            return;
        }
        attack.executeRetreat();
    }
    relinquish(tile) {
        if (this.mg.owner(tile) !== this) {
            throw new Error(`Cannot relinquish tile not owned by this player`);
        }
        this.mg.relinquish(tile);
    }
    info() {
        return this.playerInfo;
    }
    isLobbyCreator() {
        return this.playerInfo.isLobbyCreator;
    }
    isAlive() {
        return this._tiles.size > 0;
    }
    hasSpawned() {
        return this._spawnTile !== undefined;
    }
    setSpawnTile(spawnTile) {
        this._spawnTile = spawnTile;
    }
    spawnTile() {
        return this._spawnTile;
    }
    supplySummary() {
        return this._supplySummary;
    }
    setSupplySummary(summary) {
        this._supplySummary = summary;
    }
    incomingAllianceRequests() {
        return this.mg.allianceRequests.filter((ar) => ar.recipient() === this);
    }
    outgoingAllianceRequests() {
        return this.mg.allianceRequests.filter((ar) => ar.requestor() === this);
    }
    alliances() {
        return this.mg.alliances_.filter((a) => a.requestor() === this || a.recipient() === this);
    }
    expiredAlliances() {
        return [...this._expiredAlliances];
    }
    allies() {
        return this.alliances().map((a) => a.other(this));
    }
    isAlliedWith(other) {
        if (other === this) {
            return false;
        }
        return this.allianceWith(other) !== null;
    }
    allianceWith(other) {
        if (other === this) {
            return null;
        }
        return (this.alliances().find((a) => a.recipient() === other || a.requestor() === other) ?? null);
    }
    allianceInfo(other) {
        const alliance = this.allianceWith(other);
        if (!alliance) {
            return null;
        }
        const inExtensionWindow = alliance.expiresAt() <=
            this.mg.ticks() + this.mg.config().allianceExtensionPromptOffset();
        const canExtend = !this.isDisconnected() &&
            !other.isDisconnected() &&
            this.isAlive() &&
            other.isAlive() &&
            inExtensionWindow &&
            !alliance.agreedToExtend(this);
        return {
            expiresAt: alliance.expiresAt(),
            inExtensionWindow,
            myPlayerAgreedToExtend: alliance.agreedToExtend(this),
            otherAgreedToExtend: alliance.agreedToExtend(other),
            canExtend,
        };
    }
    canSendAllianceRequest(other) {
        if (other === this) {
            return false;
        }
        if (this.isDisconnected() || other.isDisconnected()) {
            // Disconnected players are marked as not-friendly even if they are allies,
            // so we need to return early if either player is disconnected.
            // Otherwise we could end up sending an alliance request to someone
            // we are already allied with.
            return false;
        }
        if (this.isFriendly(other) || !this.isAlive()) {
            return false;
        }
        const hasPending = this.outgoingAllianceRequests().some((ar) => ar.recipient() === other);
        if (hasPending) {
            return false;
        }
        const hasIncoming = this.incomingAllianceRequests().some((ar) => ar.requestor() === other);
        if (hasIncoming) {
            return true;
        }
        const recent = this.pastOutgoingAllianceRequests
            .filter((ar) => ar.recipient() === other)
            .sort((a, b) => b.createdAt() - a.createdAt());
        if (recent.length === 0) {
            return true;
        }
        const delta = this.mg.ticks() - recent[0].createdAt();
        return delta >= this.mg.config().allianceRequestCooldown();
    }
    breakAlliance(alliance) {
        this.mg.breakAlliance(this, alliance);
    }
    removeAllAlliances() {
        this.mg.removeAlliancesByPlayerSilently(this);
    }
    isTraitor() {
        return this.getTraitorRemainingTicks() > 0;
    }
    getTraitorRemainingTicks() {
        if (this.markedTraitorTick < 0)
            return 0;
        const elapsed = this.mg.ticks() - this.markedTraitorTick;
        const duration = this.mg.config().traitorDuration();
        const remaining = duration - elapsed;
        return remaining > 0 ? remaining : 0;
    }
    markTraitor() {
        this.markedTraitorTick = this.mg.ticks();
        this._betrayalCount++; // Keep count for Nations too
        // Record stats (only for real Humans)
        this.mg.stats().betray(this);
    }
    betrayals() {
        return this._betrayalCount;
    }
    createAllianceRequest(recipient) {
        if (this.isAlliedWith(recipient)) {
            throw new Error(`cannot create alliance request, already allies`);
        }
        return this.mg.createAllianceRequest(this, recipient);
    }
    relation(other) {
        if (other === this) {
            throw new Error(`cannot get relation with self: ${this}`);
        }
        const relation = this.relations.get(other) ?? 0;
        return this.relationFromValue(relation);
    }
    relationFromValue(relationValue) {
        if (relationValue < -50) {
            return Relation.Hostile;
        }
        if (relationValue < 0) {
            return Relation.Distrustful;
        }
        if (relationValue < 50) {
            return Relation.Neutral;
        }
        return Relation.Friendly;
    }
    allRelationsSorted() {
        return Array.from(this.relations, ([k, v]) => ({ player: k, relation: v }))
            .filter((r) => r.player.isAlive())
            .sort((a, b) => a.relation - b.relation)
            .map((r) => ({
            player: r.player,
            relation: this.relationFromValue(r.relation),
        }));
    }
    updateRelation(other, delta) {
        if (other === this) {
            throw new Error(`cannot update relation with self: ${this}`);
        }
        const relation = this.relations.get(other) ?? 0;
        const newRelation = within(relation + delta, -100, 100);
        this.relations.set(other, newRelation);
    }
    decayRelations() {
        this.relations.forEach((r, p) => {
            const sign = -1 * Math.sign(r);
            const delta = 0.05;
            r += sign * delta;
            if (Math.abs(r) < delta * 2) {
                r = 0;
            }
            this.relations.set(p, r);
        });
    }
    canTarget(other) {
        if (this === other) {
            return false;
        }
        if (this.isFriendly(other)) {
            return false;
        }
        for (const t of this.targets_) {
            if (this.mg.ticks() - t.tick < this.mg.config().targetCooldown()) {
                return false;
            }
        }
        return true;
    }
    target(other) {
        this.targets_.push({ tick: this.mg.ticks(), target: other });
        this.mg.target(this, other);
    }
    targets() {
        return this.targets_
            .filter((t) => this.mg.ticks() - t.tick < this.mg.config().targetDuration())
            .map((t) => t.target);
    }
    transitiveTargets() {
        const ts = this.alliances()
            .map((a) => a.other(this))
            .flatMap((ally) => ally.targets());
        ts.push(...this.targets());
        return [...new Set(ts)];
    }
    sendEmoji(recipient, emoji) {
        if (recipient === this) {
            throw Error(`Cannot send emoji to oneself: ${this}`);
        }
        const msg = {
            message: emoji,
            senderID: this.smallID(),
            recipientID: recipient === AllPlayers ? recipient : recipient.smallID(),
            createdAt: this.mg.ticks(),
        };
        this.outgoingEmojis_.push(msg);
        this.mg.sendEmojiUpdate(msg);
    }
    outgoingEmojis() {
        return this.outgoingEmojis_
            .filter((e) => this.mg.ticks() - e.createdAt <
            this.mg.config().emojiMessageDuration())
            .sort((a, b) => b.createdAt - a.createdAt);
    }
    canSendEmoji(recipient) {
        if (recipient === this) {
            return false;
        }
        const recipientID = recipient === AllPlayers ? AllPlayers : recipient.smallID();
        const prevMsgs = this.outgoingEmojis_.filter((msg) => msg.recipientID === recipientID);
        for (const msg of prevMsgs) {
            if (this.mg.ticks() - msg.createdAt <
                this.mg.config().emojiMessageCooldown()) {
                return false;
            }
        }
        return true;
    }
    canDonateGold(recipient) {
        if (!this.isAlive() ||
            !recipient.isAlive() ||
            !this.isFriendly(recipient)) {
            return false;
        }
        if (recipient.type() === PlayerType.Human &&
            this.mg.config().donateGold() === false) {
            return false;
        }
        for (const donation of this.sentDonations) {
            if (donation.recipient === recipient) {
                if (this.mg.ticks() - donation.tick <
                    this.mg.config().donateCooldown()) {
                    return false;
                }
            }
        }
        return true;
    }
    canDonateTroops(recipient) {
        if (!this.isAlive() ||
            !recipient.isAlive() ||
            !this.isFriendly(recipient)) {
            return false;
        }
        if (recipient.type() === PlayerType.Human &&
            this.mg.config().donateTroops() === false) {
            return false;
        }
        for (const donation of this.sentDonations) {
            if (donation.recipient === recipient) {
                if (this.mg.ticks() - donation.tick <
                    this.mg.config().donateCooldown()) {
                    return false;
                }
            }
        }
        return true;
    }
    donateTroops(recipient, troops) {
        if (troops <= 0)
            return false;
        const removed = this.removeTroops(troops);
        if (removed === 0)
            return false;
        recipient.addTroops(removed);
        this.sentDonations.push(new Donation(recipient, this.mg.ticks()));
        this.mg.displayMessage("events_display.sent_troops_to_player", MessageType.SENT_TROOPS_TO_PLAYER, this.id(), undefined, { troops: renderTroops(troops), name: recipient.name() });
        this.mg.displayMessage("events_display.received_troops_from_player", MessageType.RECEIVED_TROOPS_FROM_PLAYER, recipient.id(), undefined, { troops: renderTroops(troops), name: this.name() });
        return true;
    }
    donateGold(recipient, gold) {
        if (gold <= 0n)
            return false;
        const removed = this.removeGold(gold);
        if (removed === 0n)
            return false;
        recipient.addGold(removed);
        this.sentDonations.push(new Donation(recipient, this.mg.ticks()));
        this.mg.displayMessage("events_display.sent_gold_to_player", MessageType.SENT_GOLD_TO_PLAYER, this.id(), undefined, { gold: renderNumber(gold), name: recipient.name() });
        this.mg.displayMessage("events_display.received_gold_from_player", MessageType.RECEIVED_GOLD_FROM_PLAYER, recipient.id(), gold, { gold: renderNumber(gold), name: this.name() });
        return true;
    }
    canDeleteUnit() {
        return (this.mg.ticks() - this.lastDeleteUnitTick >=
            this.mg.config().deleteUnitCooldown());
    }
    recordDeleteUnit() {
        this.lastDeleteUnitTick = this.mg.ticks();
    }
    canEmbargoAll() {
        // Cooldown gate
        if (this.mg.ticks() - this.lastEmbargoAllTick <
            this.mg.config().embargoAllCooldown()) {
            return false;
        }
        // At least one eligible player exists
        for (const p of this.mg.players()) {
            if (p.id() === this.id())
                continue;
            if (p.type() === PlayerType.Bot)
                continue;
            if (this.isOnSameTeam(p))
                continue;
            return true;
        }
        return false;
    }
    recordEmbargoAll() {
        this.lastEmbargoAllTick = this.mg.ticks();
    }
    hasEmbargoAgainst(other) {
        return this.embargoes.has(other.id());
    }
    canTrade(other) {
        const embargo = other.hasEmbargoAgainst(this) || this.hasEmbargoAgainst(other);
        return !embargo && other.id() !== this.id();
    }
    getEmbargoes() {
        return [...this.embargoes.values()];
    }
    addEmbargo(other, isTemporary) {
        const embargo = this.embargoes.get(other.id());
        if (embargo !== undefined && !embargo.isTemporary)
            return;
        this.mg.addUpdate({
            type: GameUpdateType.EmbargoEvent,
            event: "start",
            playerID: this.smallID(),
            embargoedID: other.smallID(),
        });
        this.embargoes.set(other.id(), {
            createdAt: this.mg.ticks(),
            isTemporary: isTemporary,
            target: other,
        });
    }
    stopEmbargo(other) {
        this.embargoes.delete(other.id());
        this.mg.addUpdate({
            type: GameUpdateType.EmbargoEvent,
            event: "stop",
            playerID: this.smallID(),
            embargoedID: other.smallID(),
        });
    }
    endTemporaryEmbargo(other) {
        const embargo = this.embargoes.get(other.id());
        if (embargo !== undefined && !embargo.isTemporary)
            return;
        this.stopEmbargo(other);
    }
    tradingPartners() {
        return this.mg
            .players()
            .filter((other) => other !== this && this.canTrade(other));
    }
    team() {
        return this._team;
    }
    isOnSameTeam(other) {
        if (other === this) {
            return false;
        }
        if (this.team() === null || other.team() === null) {
            return false;
        }
        if (this.team() === ColoredTeams.Bot || other.team() === ColoredTeams.Bot) {
            return false;
        }
        return this._team === other.team();
    }
    isFriendly(other, treatAFKFriendly = false) {
        if (other.isDisconnected() && !treatAFKFriendly) {
            return false;
        }
        return this.isOnSameTeam(other) || this.isAlliedWith(other);
    }
    gold() {
        return this._gold;
    }
    addGold(toAdd, tile) {
        this._gold += toAdd;
        if (tile) {
            this.mg.addUpdate({
                type: GameUpdateType.BonusEvent,
                player: this.id(),
                tile,
                gold: Number(toAdd),
                troops: 0,
            });
        }
    }
    removeGold(toRemove) {
        if (toRemove <= 0n) {
            return 0n;
        }
        const actualRemoved = minInt(this._gold, toRemove);
        this._gold -= actualRemoved;
        return actualRemoved;
    }
    troops() {
        return Number(this._troops);
    }
    addTroops(troops) {
        if (troops < 0) {
            this.removeTroops(-1 * troops);
            return;
        }
        this._troops += toInt(troops);
    }
    removeTroops(troops) {
        if (troops <= 0) {
            return 0;
        }
        const toRemove = minInt(this._troops, toInt(troops));
        this._troops -= toRemove;
        return Number(toRemove);
    }
    captureUnit(unit) {
        if (unit.owner() === this) {
            throw new Error(`Cannot capture unit, ${this} already owns ${unit}`);
        }
        unit.setOwner(this);
    }
    buildUnit(type, spawnTile, params) {
        if (this.mg.config().isUnitDisabled(type)) {
            throw new Error(`Attempted to build disabled unit ${type} at tile ${spawnTile} by player ${this.name()}`);
        }
        const cost = this.mg.unitInfo(type).cost(this.mg, this);
        const b = new UnitImpl(type, this.mg, spawnTile, this.mg.nextUnitID(), this, params);
        this._units.push(b);
        this.recordUnitConstructed(type);
        this.removeGold(cost);
        this.removeTroops("troops" in params ? (params.troops ?? 0) : 0);
        this.mg.addUpdate(b.toUpdate());
        this.mg.addUnit(b);
        return b;
    }
    findUnitToUpgrade(type, targetTile) {
        const unit = this.findExistingUnitToUpgrade(type, targetTile);
        if (unit === false || !this.canUpgradeUnit(unit)) {
            return false;
        }
        return unit;
    }
    findExistingUnitToUpgrade(type, targetTile) {
        const range = this.mg.config().structureMinDist();
        const existing = this.mg
            .nearbyUnits(targetTile, range, type, undefined, true)
            .sort((a, b) => a.distSquared - b.distSquared);
        if (existing.length === 0) {
            return false;
        }
        return existing[0].unit;
    }
    canBuildUnitType(unitType, knownCost = null) {
        if (this.mg.config().isUnitDisabled(unitType)) {
            return false;
        }
        const cost = knownCost ?? this.mg.unitInfo(unitType).cost(this.mg, this);
        if (this._gold < cost) {
            return false;
        }
        if (unitType !== UnitType.MIRVWarhead && !this.isAlive()) {
            return false;
        }
        return true;
    }
    canUpgradeUnitType(unitType) {
        return Boolean(this.mg.config().unitInfo(unitType).upgradable);
    }
    isUnitValidToUpgrade(unit) {
        if (unit.isUnderConstruction()) {
            return false;
        }
        if (unit.isMarkedForDeletion()) {
            return false;
        }
        if (unit.owner() !== this) {
            return false;
        }
        return true;
    }
    canUpgradeUnit(unit) {
        if (!this.canUpgradeUnitType(unit.type())) {
            return false;
        }
        if (!this.canBuildUnitType(unit.type())) {
            return false;
        }
        if (!this.isUnitValidToUpgrade(unit)) {
            return false;
        }
        return true;
    }
    upgradeUnit(unit) {
        const cost = this.mg.unitInfo(unit.type()).cost(this.mg, this);
        this.removeGold(cost);
        unit.increaseLevel();
        this.recordUnitConstructed(unit.type());
    }
    buildableUnits(tile, units = PlayerBuildable.types) {
        const mg = this.mg;
        const config = mg.config();
        const rail = mg.railNetwork();
        const inSpawnPhase = mg.inSpawnPhase();
        const validTiles = tile !== null && units.some((u) => Structures.has(u))
            ? this.validStructureSpawnTiles(tile)
            : [];
        const len = units.length;
        const result = new Array(len);
        for (let i = 0; i < len; i++) {
            const u = units[i];
            const cost = config.unitInfo(u).cost(mg, this);
            let canUpgrade = false;
            let canBuild = false;
            if (tile !== null && this.canBuildUnitType(u, cost) && !inSpawnPhase) {
                if (this.canUpgradeUnitType(u)) {
                    const existingUnit = this.findExistingUnitToUpgrade(u, tile);
                    if (existingUnit !== false &&
                        this.isUnitValidToUpgrade(existingUnit)) {
                        canUpgrade = existingUnit.id();
                    }
                }
                canBuild = this.canSpawnUnitType(u, tile, validTiles);
            }
            const buildNew = canBuild !== false && canUpgrade === false;
            result[i] = {
                type: u,
                canBuild,
                canUpgrade,
                cost,
                overlappingRailroads: buildNew
                    ? rail.overlappingRailroads(canBuild)
                    : [],
                ghostRailPaths: buildNew
                    ? rail.computeGhostRailPaths(u, canBuild)
                    : [],
            };
        }
        return result;
    }
    canBuild(unitType, targetTile, validTiles = null) {
        if (!this.canBuildUnitType(unitType)) {
            return false;
        }
        return this.canSpawnUnitType(unitType, targetTile, validTiles);
    }
    canSpawnUnitType(unitType, targetTile, validTiles) {
        switch (unitType) {
            case UnitType.MIRV:
                if (!this.mg.hasOwner(targetTile)) {
                    return false;
                }
                return this.nukeSpawn(targetTile, unitType);
            case UnitType.AtomBomb:
            case UnitType.HydrogenBomb:
                return this.nukeSpawn(targetTile, unitType);
            case UnitType.MIRVWarhead:
                return targetTile;
            case UnitType.Port:
                return this.portSpawn(targetTile, validTiles);
            case UnitType.Warship:
            case UnitType.Submarine:
                return this.navalPatrolSpawn(targetTile);
            case UnitType.Shell:
            case UnitType.SAMMissile:
                return targetTile;
            case UnitType.FighterSquadron:
            case UnitType.BomberSquadron:
                return this.airSquadronSpawn(unitType, targetTile);
            case UnitType.TransportShip:
                return canBuildTransportShip(this.mg, this, targetTile);
            case UnitType.TradeShip:
                return this.tradeShipSpawn(targetTile);
            case UnitType.Train:
                return this.landBasedUnitSpawn(targetTile);
            case UnitType.MissileSilo:
            case UnitType.DefensePost:
            case UnitType.SAMLauncher:
            case UnitType.AABattery:
            case UnitType.RadarStation:
            case UnitType.Airbase:
            case UnitType.City:
            case UnitType.Factory:
                return this.landBasedStructureSpawn(targetTile, validTiles);
            case UnitType.SonarStation:
                return this.coastalStructureSpawn(targetTile, validTiles);
            default:
                assertNever(unitType);
        }
    }
    nukeSpawn(tile, nukeType) {
        if (this.mg.isSpawnImmunityActive()) {
            return false;
        }
        const owner = this.mg.owner(tile);
        if (owner.isPlayer()) {
            if (this.isOnSameTeam(owner)) {
                return false;
            }
        }
        // Prevent launching nukes that would hit teammate structures (only in team games)
        if (this.mg.config().gameConfig().gameMode === GameMode.Team &&
            nukeType !== UnitType.MIRV) {
            const magnitude = this.mg.config().nukeMagnitudes(nukeType);
            const wouldHitTeammate = this.mg.anyUnitNearby(tile, magnitude.outer, Structures.types, (unit) => unit.owner().isPlayer() && this.isOnSameTeam(unit.owner()));
            if (wouldHitTeammate) {
                return false;
            }
        }
        // only get missilesilos that are not on cooldown and not under construction
        const spawns = this.units(UnitType.MissileSilo)
            .filter((silo) => {
            return !silo.isInCooldown() && !silo.isUnderConstruction();
        })
            .sort(distSortUnit(this.mg, tile));
        if (spawns.length === 0) {
            return false;
        }
        return spawns[0].tile();
    }
    portSpawn(tile, validTiles) {
        const spawns = Array.from(this.mg.bfs(tile, manhattanDistFN(tile, this.mg.config().radiusPortSpawn())))
            .filter((t) => this.mg.owner(t) === this && this.mg.isOceanShore(t))
            .sort((a, b) => this.mg.manhattanDist(a, tile) - this.mg.manhattanDist(b, tile));
        const validTileSet = new Set(validTiles ?? this.validStructureSpawnTiles(tile));
        for (const t of spawns) {
            if (validTileSet.has(t)) {
                return t;
            }
        }
        return false;
    }
    navalPatrolSpawn(tile) {
        if (!this.mg.isOcean(tile)) {
            return false;
        }
        const spawns = this.units(UnitType.Port).sort((a, b) => this.mg.manhattanDist(a.tile(), tile) -
            this.mg.manhattanDist(b.tile(), tile));
        if (spawns.length === 0) {
            return false;
        }
        return spawns[0].tile();
    }
    airSquadronSpawn(unitType, tile) {
        const airbase = this.units(UnitType.Airbase).find((unit) => unit.tile() === tile &&
            !unit.isUnderConstruction() &&
            !unit.isMarkedForDeletion());
        if (!airbase) {
            return false;
        }
        const stationedSquadrons = this.units(UnitType.FighterSquadron, UnitType.BomberSquadron).filter((unit) => unit.airbaseId() === airbase.id() && unit.isActive()).length;
        if (stationedSquadrons >= this.mg.config().airbaseSquadronCapacity()) {
            return false;
        }
        // keep unitType in the signature so squadron-specific gates can be added without changing callers
        switch (unitType) {
            case UnitType.FighterSquadron:
            case UnitType.BomberSquadron:
                return airbase.tile();
            default:
                return false;
        }
    }
    landBasedUnitSpawn(tile) {
        return this.mg.isLand(tile) ? tile : false;
    }
    landBasedStructureSpawn(tile, validTiles = null) {
        const tiles = validTiles ?? this.validStructureSpawnTiles(tile);
        if (tiles.length === 0) {
            return false;
        }
        return tiles[0];
    }
    coastalStructureSpawn(tile, validTiles = null) {
        const tiles = (validTiles ?? this.validStructureSpawnTiles(tile)).filter((t) => this.mg.isOceanShore(t));
        if (tiles.length === 0) {
            return false;
        }
        return tiles[0];
    }
    validStructureSpawnTiles(tile) {
        if (this.mg.owner(tile) !== this) {
            return [];
        }
        const searchRadius = 15;
        const searchRadiusSquared = searchRadius ** 2;
        const nearbyUnits = this.mg.nearbyUnits(tile, searchRadius * 2, Structures.types, undefined, true);
        const nearbyTiles = this.mg.bfs(tile, (gm, t) => {
            return (this.mg.euclideanDistSquared(tile, t) < searchRadiusSquared &&
                gm.ownerID(t) === this.smallID());
        });
        const validSet = new Set(nearbyTiles);
        const minDistSquared = this.mg.config().structureMinDist() ** 2;
        for (const t of nearbyTiles) {
            for (const { unit } of nearbyUnits) {
                if (this.mg.euclideanDistSquared(unit.tile(), t) < minDistSquared) {
                    validSet.delete(t);
                    break;
                }
            }
        }
        const valid = Array.from(validSet);
        valid.sort((a, b) => this.mg.euclideanDistSquared(a, tile) -
            this.mg.euclideanDistSquared(b, tile));
        return valid;
    }
    tradeShipSpawn(targetTile) {
        return this.units(UnitType.Port).find((u) => u.tile() === targetTile)
            ? targetTile
            : false;
    }
    lastTileChange() {
        return this._lastTileChange;
    }
    isDisconnected() {
        return this._isDisconnected;
    }
    markDisconnected(isDisconnected) {
        this._isDisconnected = isDisconnected;
    }
    hash() {
        return (simpleHash(this.id()) * (this.troops() + this.numTilesOwned()) +
            this._units.reduce((acc, unit) => acc + unit.hash(), 0));
    }
    toString() {
        return `Player:{name:${this.info().name},clientID:${this.info().clientID},isAlive:${this.isAlive()},troops:${this._troops},numTileOwned:${this.numTilesOwned()}}]`;
    }
    playerProfile() {
        const rel = {
            relations: Object.fromEntries(this.allRelationsSorted().map(({ player, relation }) => [
                player.smallID(),
                relation,
            ])),
            alliances: this.alliances().map((a) => a.other(this).smallID()),
        };
        return rel;
    }
    createAttack(target, troops, sourceTile, border, mode) {
        const attack = new AttackImpl(this._pseudo_random.nextID(), target, this, troops, sourceTile, border, mode, this.mg);
        this._outgoingAttacks.push(attack);
        if (target.isPlayer()) {
            target._incomingAttacks.push(attack);
        }
        return attack;
    }
    outgoingAttacks() {
        return this._outgoingAttacks;
    }
    incomingAttacks() {
        return this._incomingAttacks;
    }
    isImmune() {
        if (this.type() === PlayerType.Human) {
            return this.mg.isSpawnImmunityActive();
        }
        if (this.type() === PlayerType.Nation) {
            return this.mg.isNationSpawnImmunityActive();
        }
        return false;
    }
    canAttackPlayer(player, treatAFKFriendly = false) {
        if (this.type() === PlayerType.Bot) {
            // Bots are not affected by immunity
            return !this.isFriendly(player, treatAFKFriendly);
        }
        // Humans and Nations respect immunity
        return !player.isImmune() && !this.isFriendly(player, treatAFKFriendly);
    }
    canAttack(tile) {
        const owner = this.mg.owner(tile);
        if (owner === this) {
            return false;
        }
        if (owner.isPlayer() && !this.canAttackPlayer(owner)) {
            return false;
        }
        if (!this.mg.isLand(tile)) {
            return false;
        }
        if (this.mg.hasOwner(tile)) {
            return this.sharesBorderWith(owner);
        }
        else {
            for (const t of this.mg.bfs(tile, andFN((gm, t) => !gm.hasOwner(t) && gm.isLand(t), manhattanDistFN(tile, 200)))) {
                for (const n of this.mg.neighbors(t)) {
                    if (this.mg.owner(n) === this) {
                        return true;
                    }
                }
            }
            return false;
        }
    }
    bestTransportShipSpawn(targetTile) {
        return bestShoreDeploymentSource(this.mg, this, targetTile) ?? false;
    }
}
//# sourceMappingURL=PlayerImpl.js.map