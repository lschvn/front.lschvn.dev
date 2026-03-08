import { renderTroops } from "../../client/Utils";
import {
  CLOSE_AIR_SUPPORT_CAPTURE_MULTIPLIER,
  CLOSE_AIR_SUPPORT_CASUALTY_MULTIPLIER,
} from "../configuration/AirBalance";
import {
  ATTACK_MODE_BALANCE,
  DEFAULT_ATTACK_MODE,
  RAID_PRIORITY_UNIT_TYPES,
  RAID_TARGET_PRIORITY,
  SIEGE_DAMAGEABLE_UNIT_TYPES,
} from "../configuration/AttackModeBalance";
import {
  DEPLETED_ISOLATION_BALANCE,
  SUPPLY_STATE_BALANCE,
  type SupplyStateBalance,
} from "../configuration/SupplyBalance";
import {
  Attack,
  AttackMode,
  Difficulty,
  Execution,
  Game,
  MessageType,
  Player,
  PlayerID,
  PlayerType,
  SupplyState,
  TerrainType,
  TerraNullius,
  Unit,
  UnitType,
} from "../game/Game";
import { TileRef } from "../game/GameMap";
import { PseudoRandom } from "../PseudoRandom";
import { assertNever, simpleHash } from "../Util";
import { FlatBinaryHeap } from "./utils/FlatBinaryHeap"; // adjust path if needed

const malusForRetreat = 25;
export class AttackExecution implements Execution {
  private active: boolean = true;
  private toConquer = new FlatBinaryHeap();

  private random = new PseudoRandom(123);

  private target: Player | TerraNullius;

  private mg: Game;

  private attack: Attack | null = null;
  private lastModePulseTick = -1;

  constructor(
    private startTroops: number | null = null,
    private _owner: Player,
    private _targetID: PlayerID | null,
    private sourceTile: TileRef | null = null,
    private removeTroops: boolean = true,
    private mode: AttackMode = DEFAULT_ATTACK_MODE,
  ) {}

  public targetID(): PlayerID | null {
    return this._targetID;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  init(mg: Game, ticks: number) {
    if (!this.active) {
      return;
    }
    this.mg = mg;

    if (this._targetID !== null && !mg.hasPlayer(this._targetID)) {
      console.warn(`target ${this._targetID} not found`);
      this.active = false;
      return;
    }

    this.target =
      this._targetID === this.mg.terraNullius().id()
        ? mg.terraNullius()
        : mg.player(this._targetID);

    if (this._owner === this.target) {
      console.error(`Player ${this._owner} cannot attack itself`);
      this.active = false;
      return;
    }

    // ALLIANCE CHECK — block attacks on friendly (ally or same team)
    if (this.target.isPlayer()) {
      const targetPlayer = this.target as Player;
      if (this._owner.isFriendly(targetPlayer)) {
        console.warn(
          `${this._owner.displayName()} cannot attack ${targetPlayer.displayName()} because they are friendly (allied or same team)`,
        );
        this.active = false;
        return;
      }
    }

    if (this.target && this.target.isPlayer()) {
      const targetPlayer = this.target as Player;
      if (
        targetPlayer.type() !== PlayerType.Bot &&
        this._owner.type() !== PlayerType.Bot
      ) {
        // Don't let bots embargo since they can't trade anyway.
        targetPlayer.addEmbargo(this._owner, true);
        this.rejectIncomingAllianceRequests(targetPlayer);
      }
    }

    if (this.target.isPlayer() && !this._owner.canAttackPlayer(this.target)) {
      this.active = false;
      return;
    }

    this.startTroops ??= Math.floor(
      this.mg.config().attackAmount(this._owner, this.target) *
        ATTACK_MODE_BALANCE[this.mode].troopCommitmentMultiplier,
    );
    if (this.removeTroops) {
      this.startTroops = Math.min(this._owner.troops(), this.startTroops);
      this._owner.removeTroops(this.startTroops);
    }
    this.attack = this._owner.createAttack(
      this.target,
      this.startTroops,
      this.sourceTile,
      new Set<TileRef>(),
      this.mode,
    );

    if (this.sourceTile !== null) {
      this.addNeighbors(this.sourceTile);
    } else {
      this.refreshToConquer();
    }

    // Record stats
    this.mg.stats().attack(this._owner, this.target, this.startTroops);

    for (const incoming of this._owner.incomingAttacks()) {
      if (incoming.attacker() === this.target) {
        // Target has opposing attack, cancel them out
        if (incoming.troops() > this.attack.troops()) {
          incoming.setTroops(incoming.troops() - this.attack.troops());
          this.attack.delete();
          this.active = false;
          return;
        } else {
          this.attack.setTroops(this.attack.troops() - incoming.troops());
          incoming.delete();
        }
      }
    }
    for (const outgoing of this._owner.outgoingAttacks()) {
      if (
        outgoing !== this.attack &&
        outgoing.target() === this.attack.target() &&
        outgoing.mode() === this.attack.mode() &&
        // Boat attacks (sourceTile is not null) are not combined with other attacks
        this.attack.sourceTile() === null
      ) {
        this.attack.setTroops(this.attack.troops() + outgoing.troops());
        outgoing.delete();
      }
    }

    if (this.target.isPlayer()) {
      const difficulty = this.mg.config().gameConfig().difficulty;
      let relationChange: number;
      switch (difficulty) {
        case Difficulty.Easy:
          relationChange = -60;
          break;
        case Difficulty.Medium:
          relationChange = -70;
          break;
        case Difficulty.Hard:
          relationChange = -80;
          break;
        case Difficulty.Impossible:
          relationChange = -100;
          break;
        default:
          assertNever(difficulty);
      }
      this.target.updateRelation(this._owner, relationChange);
    }
  }

  private refreshToConquer() {
    if (this.attack === null) {
      throw new Error("Attack not initialized");
    }

    this.toConquer.clear();
    this.attack.clearBorder();
    for (const tile of this._owner.borderTiles()) {
      this.addNeighbors(tile);
    }
  }

  private retreat(malusPercent = 0) {
    if (this.attack === null) {
      throw new Error("Attack not initialized");
    }

    const deaths = this.attack.troops() * (malusPercent / 100);
    if (deaths) {
      this.mg.displayMessage(
        "events_display.attack_cancelled_retreat",
        MessageType.ATTACK_CANCELLED,
        this._owner.id(),
        undefined,
        { troops: renderTroops(deaths) },
      );
    }
    if (this.removeTroops === false && this.sourceTile === null) {
      // startTroops are always added to attack troops at init but not always removed from owner troops
      // subtract startTroops from attack troops so we don't give back startTroops to owner that were never removed
      // boat attacks (sourceTile !== null) are the exception: troops were removed at departure and must be returned after attack still
      this.attack.setTroops(this.attack.troops() - (this.startTroops ?? 0));
    }

    const survivors = this.attack.troops() - deaths;
    this._owner.addTroops(survivors);
    this.attack.delete();
    this.active = false;

    // Not all retreats are canceled attacks
    if (this.attack.retreated()) {
      // Record stats
      this.mg.stats().attackCancel(this._owner, this.target, survivors);
    }
  }

  tick(ticks: number) {
    if (this.attack === null) {
      throw new Error("Attack not initialized");
    }
    let troopCount = this.attack.troops(); // cache troop count
    const targetIsPlayer = this.target.isPlayer(); // cache target type
    const targetPlayer = targetIsPlayer ? (this.target as Player) : null; // cache target player

    if (this.attack.retreated()) {
      if (targetIsPlayer) {
        this.retreat(malusForRetreat);
      } else {
        this.retreat();
      }
      this.active = false;
      return;
    }

    if (this.attack.retreating()) {
      return;
    }

    if (!this.attack.isActive()) {
      this.active = false;
      return;
    }

    if (targetPlayer && this._owner.isFriendly(targetPlayer)) {
      // In this case a new alliance was created AFTER the attack started.
      this.retreat();
      return;
    }

    let numTilesPerTick = this.mg
      .config()
      .attackTilesPerTick(
        troopCount,
        this._owner,
        this.target,
        this.attack.borderSize() + this.random.nextInt(0, 5),
      );

    while (numTilesPerTick > 0) {
      if (troopCount < 1) {
        this.attack.delete();
        this.active = false;
        return;
      }

      if (this.toConquer.size() === 0) {
        this.refreshToConquer();
        this.retreat();
        return;
      }

      const [tileToConquer] = this.toConquer.dequeue();
      this.attack.removeBorderTile(tileToConquer);

      let onBorder = false;
      for (const n of this.mg.neighbors(tileToConquer)) {
        if (this.mg.owner(n) === this._owner) {
          onBorder = true;
          break;
        }
      }
      if (this.mg.owner(tileToConquer) !== this.target || !onBorder) {
        continue;
      }
      this.addNeighbors(tileToConquer);
      const { attackerTroopLoss, defenderTroopLoss, tilesPerTickUsed } = this.mg
        .config()
        .attackLogic(
          this.mg,
          troopCount,
          this._owner,
          this.target,
          tileToConquer,
        );
      const attackerSupplyTile = this.resolveAttackingSupplyTile(tileToConquer);
      const attackerSupply = this.supplyBalance(attackerSupplyTile);
      const defenderSupply = this.supplyBalance(tileToConquer);
      let effectiveTilesPerTickUsed =
        tilesPerTickUsed /
        (ATTACK_MODE_BALANCE[this.mode].captureSpeedMultiplier *
          attackerSupply.attackCaptureMultiplier *
          defenderSupply.defenderCaptureVulnerability);
      if (this.isFortifiedTile(tileToConquer, targetPlayer)) {
        effectiveTilesPerTickUsed /=
          ATTACK_MODE_BALANCE[this.mode].fortifiedCaptureMultiplier;
      }
      let effectiveAttackerTroopLoss =
        attackerTroopLoss *
        ATTACK_MODE_BALANCE[this.mode].attackerCasualtyMultiplier *
        attackerSupply.attackCasualtyMultiplier;
      const effectiveDefenderTroopLoss =
        defenderTroopLoss * defenderSupply.defenderCasualtyMultiplier;

      if (this.mg.hasAirSupport(tileToConquer, this._owner)) {
        effectiveTilesPerTickUsed /= CLOSE_AIR_SUPPORT_CAPTURE_MULTIPLIER;
        effectiveAttackerTroopLoss *= CLOSE_AIR_SUPPORT_CASUALTY_MULTIPLIER;
      }

      numTilesPerTick -= effectiveTilesPerTickUsed;
      troopCount -= effectiveAttackerTroopLoss;
      this.attack.setTroops(troopCount);
      if (targetPlayer) {
        targetPlayer.removeTroops(effectiveDefenderTroopLoss);
      }
      this._owner.conquer(tileToConquer);
      this.applyModeEffects(tileToConquer, ticks, targetPlayer);
      this.handleDeadDefender();
    }
  }

  private rejectIncomingAllianceRequests(target: Player) {
    const request = this._owner
      .incomingAllianceRequests()
      .find((ar) => ar.requestor() === target);
    if (request !== undefined) {
      request.reject();
    }
  }

  private addNeighbors(tile: TileRef) {
    if (this.attack === null) {
      throw new Error("Attack not initialized");
    }

    const tickNow = this.mg.ticks(); // cache tick

    for (const neighbor of this.mg.neighbors(tile)) {
      if (
        this.mg.isWater(neighbor) ||
        this.mg.owner(neighbor) !== this.target
      ) {
        continue;
      }
      this.attack.addBorderTile(neighbor);
      let numOwnedByMe = 0;
      for (const n of this.mg.neighbors(neighbor)) {
        if (this.mg.owner(n) === this._owner) {
          numOwnedByMe++;
        }
      }

      let mag = 0;
      switch (this.mg.terrainType(neighbor)) {
        case TerrainType.Plains:
          mag = 1;
          break;
        case TerrainType.Highland:
          mag = 1.5;
          break;
        case TerrainType.Mountain:
          mag = 2;
          break;
      }

      const priority =
        (this.random.nextInt(0, 7) + 10) * (1 - numOwnedByMe * 0.5 + mag / 2) +
        tickNow -
        this.attackPriorityBias(neighbor);

      this.toConquer.enqueue(neighbor, priority);
    }
  }

  private attackPriorityBias(tile: TileRef): number {
    let bias = this.supplyScore(tile);

    if (!this.target.isPlayer() || this.mode !== AttackMode.Raid) {
      return bias;
    }

    const nearbyTargets = this.mg.nearbyUnits(
      tile,
      ATTACK_MODE_BALANCE[this.mode].targetPriorityRadius,
      RAID_PRIORITY_UNIT_TYPES,
      ({ unit }) => unit.owner() === this.target,
      true,
    );
    if (nearbyTargets.length === 0) {
      return bias;
    }

    const best = nearbyTargets.reduce(
      (currentBest, candidate) => {
        if (currentBest === null) {
          return candidate;
        }
        const currentPriority = RAID_TARGET_PRIORITY[currentBest.unit.type()];
        const candidatePriority = RAID_TARGET_PRIORITY[candidate.unit.type()];
        if (candidatePriority < currentPriority) {
          return candidate;
        }
        if (
          candidatePriority === currentPriority &&
          candidate.distSquared < currentBest.distSquared
        ) {
          return candidate;
        }
        return currentBest;
      },
      null as { unit: Unit; distSquared: number } | null,
    );

    if (best === null) {
      return bias;
    }

    bias +=
      ATTACK_MODE_BALANCE[this.mode].targetPriorityBias /
      Math.max(1, Math.sqrt(best.distSquared));
    return bias;
  }

  private resolveAttackingSupplyTile(tileToConquer: TileRef): TileRef | null {
    if (this.sourceTile !== null) {
      return this.sourceTile;
    }

    let bestTile: TileRef | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const neighbor of this.mg.neighbors(tileToConquer)) {
      if (this.mg.owner(neighbor) !== this._owner) {
        continue;
      }
      const score = this.supplyScore(neighbor);
      if (score > bestScore) {
        bestScore = score;
        bestTile = neighbor;
      }
    }
    return bestTile;
  }

  private supplyScore(tile: TileRef): number {
    const state = this.mg.supplyState(tile);
    switch (state) {
      case SupplyState.Supplied:
        return 18;
      case SupplyState.Strained:
        return 9;
      case SupplyState.Isolated:
        return this.mg.isSupplyReserveDepleted(tile) ? -10 : 4;
      case SupplyState.None:
      default:
        return 0;
    }
  }

  private supplyBalance(tile: TileRef | null): SupplyStateBalance {
    if (tile === null) {
      return SUPPLY_STATE_BALANCE[SupplyState.Supplied];
    }

    const state = this.mg.supplyState(tile);
    if (state === SupplyState.Strained) {
      return SUPPLY_STATE_BALANCE[SupplyState.Strained];
    }
    if (state === SupplyState.Isolated) {
      return this.mg.isSupplyReserveDepleted(tile)
        ? DEPLETED_ISOLATION_BALANCE
        : SUPPLY_STATE_BALANCE[SupplyState.Isolated];
    }
    return SUPPLY_STATE_BALANCE[SupplyState.Supplied];
  }

  private isFortifiedTile(tile: TileRef, defender: Player | null): boolean {
    if (defender === null) {
      return false;
    }
    if (this.mg.hasSuppression(tile)) {
      return false;
    }
    return this.mg.hasUnitNearby(
      tile,
      this.mg.config().defensePostRange(),
      UnitType.DefensePost,
      defender.id(),
    );
  }

  private applyModeEffects(
    tile: TileRef,
    ticks: number,
    targetPlayer: Player | null,
  ) {
    if (targetPlayer === null) {
      return;
    }

    switch (this.mode) {
      case AttackMode.Blitz:
        return;
      case AttackMode.Siege:
        this.applySiegeSuppression(tile);
        this.maybePulseBuildingDamage(
          tile,
          ticks,
          targetPlayer,
          SIEGE_DAMAGEABLE_UNIT_TYPES,
        );
        return;
      case AttackMode.Raid:
        this.maybePulseBuildingDamage(
          tile,
          ticks,
          targetPlayer,
          RAID_PRIORITY_UNIT_TYPES,
        );
        return;
      default:
        assertNever(this.mode);
    }
  }

  private applySiegeSuppression(tile: TileRef) {
    const { frontlineSuppressionDuration, frontlineSuppressionRadius } =
      ATTACK_MODE_BALANCE[AttackMode.Siege];

    this.mg.suppressTile(tile, frontlineSuppressionDuration);
    for (const nearbyTile of this.mg.circleSearch(
      tile,
      frontlineSuppressionRadius,
    )) {
      if (!this.mg.isLand(nearbyTile)) {
        continue;
      }
      if (nearbyTile !== tile && this.mg.owner(nearbyTile) !== this.target) {
        continue;
      }
      this.mg.suppressTile(nearbyTile, frontlineSuppressionDuration);
    }
  }

  private maybePulseBuildingDamage(
    tile: TileRef,
    ticks: number,
    targetPlayer: Player,
    types: readonly UnitType[],
  ) {
    const interval = ATTACK_MODE_BALANCE[this.mode].buildingDamageIntervalTicks;
    if (interval <= 0 || ticks === this.lastModePulseTick) {
      return;
    }

    const pulseOffset = simpleHash(this.attack!.id()) % interval;
    if (ticks % interval !== pulseOffset) {
      return;
    }

    this.lastModePulseTick = ticks;
    const target = this.selectNearbyPriorityTarget(tile, targetPlayer, types);
    if (target === null) {
      return;
    }

    this.damageModeTarget(target, targetPlayer);
  }

  private selectNearbyPriorityTarget(
    tile: TileRef,
    targetPlayer: Player,
    types: readonly UnitType[],
  ): Unit | null {
    const targets = this.mg.nearbyUnits(
      tile,
      ATTACK_MODE_BALANCE[this.mode].targetPriorityRadius,
      types,
      ({ unit }) => unit.owner() === targetPlayer,
      true,
    );
    if (targets.length === 0) {
      return null;
    }

    targets.sort((a, b) => {
      const priorityA = RAID_TARGET_PRIORITY[a.unit.type()] ?? 50;
      const priorityB = RAID_TARGET_PRIORITY[b.unit.type()] ?? 50;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      if (a.distSquared !== b.distSquared) {
        return a.distSquared - b.distSquared;
      }
      return a.unit.id() - b.unit.id();
    });

    return targets[0].unit;
  }

  private damageModeTarget(targetUnit: Unit, targetPlayer: Player) {
    const pulseDamage = ATTACK_MODE_BALANCE[this.mode].buildingDamagePerPulse;
    switch (targetUnit.type()) {
      case UnitType.TransportShip: {
        const remainingTroops = Math.max(
          0,
          targetUnit.troops() - pulseDamage * 15,
        );
        targetUnit.setTroops(remainingTroops);
        if (remainingTroops === 0) {
          targetUnit.delete(true, this._owner);
        } else {
          targetUnit.touch();
        }
        return;
      }
      case UnitType.TradeShip:
        targetUnit.delete(true, this._owner);
        this.applyEconomicDisruption(targetPlayer);
        return;
      case UnitType.Port:
      case UnitType.Factory:
      case UnitType.City:
      case UnitType.DefensePost:
        if (targetUnit.level() > pulseDamage) {
          for (let i = 0; i < pulseDamage; i++) {
            targetUnit.decreaseLevel(this._owner);
          }
        } else {
          targetUnit.delete(true, this._owner);
        }
        if (this.mode === AttackMode.Raid) {
          this.applyEconomicDisruption(targetPlayer);
        }
        return;
      default:
        return;
    }
  }

  private applyEconomicDisruption(targetPlayer: Player) {
    const {
      economicDisruptionRatio,
      economicDisruptionMin,
      economicDisruptionMax,
    } = ATTACK_MODE_BALANCE[AttackMode.Raid];
    if (economicDisruptionRatio <= 0) {
      return;
    }

    const availableGold = targetPlayer.gold();
    const boundedGold =
      availableGold > 9_000_000_000_000_000n
        ? 9_000_000_000_000_000n
        : availableGold;
    const proportionalLoss = BigInt(
      Math.floor(Number(boundedGold) * economicDisruptionRatio),
    );
    const disruption =
      proportionalLoss < economicDisruptionMin
        ? economicDisruptionMin
        : proportionalLoss > economicDisruptionMax
          ? economicDisruptionMax
          : proportionalLoss;
    targetPlayer.removeGold(disruption);
  }

  private handleDeadDefender() {
    if (!(this.target.isPlayer() && this.target.numTilesOwned() < 100)) return;

    this.mg.conquerPlayer(this._owner, this.target);

    for (let i = 0; i < 10; i++) {
      for (const tile of this.target.tiles()) {
        const borders = this.mg
          .neighbors(tile)
          .some((t) => this.mg.owner(t) === this._owner);
        if (borders) {
          this._owner.conquer(tile);
        } else {
          for (const neighbor of this.mg.neighbors(tile)) {
            const no = this.mg.owner(neighbor);
            if (
              no.isPlayer() &&
              no !== this.target &&
              !no.isFriendly(this.target)
            ) {
              this.mg.player(no.id()).conquer(tile);
              break;
            }
          }
        }
      }
    }
  }

  owner(): Player {
    return this._owner;
  }

  isActive(): boolean {
    return this.active;
  }
}
