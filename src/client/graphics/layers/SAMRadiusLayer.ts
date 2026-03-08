import type { EventBus } from "../../../core/EventBus";
import { UnitType } from "../../../core/game/Game";
import { TileRef } from "../../../core/game/GameMap";
import { GameUpdateType } from "../../../core/game/GameUpdates";
import type {
  GameView,
  PlayerView,
  UnitView,
} from "../../../core/game/GameView";
import {
  CloseViewEvent,
  MouseUpEvent,
  ToggleStructureEvent,
} from "../../InputHandler";
import { TransformHandler } from "../TransformHandler";
import { UIState } from "../UIState";
import { Layer } from "./Layer";

type Interval = [number, number];
interface CoverageRadius {
  x: number;
  y: number;
  r: number;
  owner: PlayerView;
  type: UnitType;
  arcs: Interval[];
}

interface CoverageInfo {
  ownerId: number;
  level: number;
  type: UnitType;
}
/**
 * Layer responsible for rendering anti-air coverage radii while placing or inspecting defenses.
 */
export class SAMRadiusLayer implements Layer {
  private readonly structures: Map<number, CoverageInfo> = new Map();
  // track whether the stroke should be shown due to hover or due to an active build ghost
  private hoveredShow: boolean = false;
  private ghostShow: boolean = false;
  private visible: boolean = false;
  private coverageRanges: CoverageRadius[] = [];
  private activeTypes: UnitType[] = [];
  private dashOffset = 0;
  private rotationSpeed = 14; // px per second
  private lastRefresh = Date.now();
  private needsRedraw = false;
  private selectedStructureId: number | null = null;
  private readonly selectionRadius = 8;

  private handleToggleStructure(e: ToggleStructureEvent) {
    const types = e.structureTypes;
    this.activeTypes = (types ?? []).filter((type) =>
      [
        UnitType.SAMLauncher,
        UnitType.AABattery,
        UnitType.RadarStation,
      ].includes(type),
    );
    this.hoveredShow = this.activeTypes.length > 0;
    this.updateVisibility();
  }

  constructor(
    private readonly game: GameView,
    private readonly eventBus: EventBus,
    private readonly uiState: UIState,
    private readonly transformHandler: TransformHandler,
  ) {}

  init() {
    // Listen for game updates to detect SAM launcher changes
    // Also listen for UI toggle structure events so we can show borders when
    // the user is hovering the Atom/Hydrogen option (UnitDisplay emits
    // ToggleStructureEvent with SAMLauncher included in the list).
    this.eventBus.on(ToggleStructureEvent, (e) =>
      this.handleToggleStructure(e),
    );
    this.eventBus.on(MouseUpEvent, (e) => this.handleMouseUp(e));
    this.eventBus.on(CloseViewEvent, () => {
      this.selectedStructureId = null;
      this.updateVisibility();
    });
  }

  shouldTransform(): boolean {
    return true;
  }

  tick() {
    // Check for updates to defensive coverage structures
    const unitUpdates = this.game.updatesSinceLastTick()?.[GameUpdateType.Unit];
    if (unitUpdates) {
      for (const update of unitUpdates) {
        const unit = this.game.unit(update.id);
        if (
          unit &&
          [
            UnitType.SAMLauncher,
            UnitType.AABattery,
            UnitType.RadarStation,
          ].includes(unit.type())
        ) {
          if (this.hasChanged(unit)) {
            this.needsRedraw = true;
            break;
          }
        }
      }
    }

    // show when in ghost mode for air-defense structures and related strategic buildings
    this.ghostShow =
      this.uiState.ghostStructure === UnitType.MissileSilo ||
      this.uiState.ghostStructure === UnitType.SAMLauncher ||
      this.uiState.ghostStructure === UnitType.AABattery ||
      this.uiState.ghostStructure === UnitType.RadarStation ||
      this.uiState.ghostStructure === UnitType.City ||
      this.uiState.ghostStructure === UnitType.AtomBomb ||
      this.uiState.ghostStructure === UnitType.HydrogenBomb;
    if (this.ghostShow) {
      this.activeTypes = this.activeGhostTypes();
    }
    if (this.selectedStructureId !== null) {
      const selected = this.game.unit(this.selectedStructureId);
      if (
        !selected ||
        !selected.isActive() ||
        selected.owner() !== this.game.myPlayer()
      ) {
        this.selectedStructureId = null;
      }
    }
    this.updateVisibility();
  }

  renderLayer(context: CanvasRenderingContext2D) {
    if (this.visible) {
      if (this.needsRedraw) {
        // SAM changed: the radiuses needs to be updated
        this.computeCircleUnions();
        this.needsRedraw = false;
      }
      this.updateDashAnimation();
      this.drawCirclesUnion(context);
      if (this.selectedStructureId !== null) {
        const selected = this.game.unit(this.selectedStructureId);
        if (selected) {
          this.drawSelectedStructureRange(context, selected);
        }
      }
    }
  }

  private updateDashAnimation() {
    const now = Date.now();
    const dt = now - this.lastRefresh;
    this.lastRefresh = now;
    this.dashOffset += (this.rotationSpeed * dt) / 1000;
    if (this.dashOffset > 1e6) this.dashOffset = this.dashOffset % 1000000;
  }

  private updateVisibility() {
    const next =
      this.hoveredShow || this.ghostShow || this.selectedStructureId !== null;
    if (next !== this.visible) {
      this.visible = next;
    }
  }

  private hasChanged(unit: UnitView): boolean {
    const info = this.structures.get(unit.id());
    const isNew = info === undefined;
    const active = unit.isActive();
    const ownerId = unit.owner().smallID();
    let hasChanges = isNew || !active; // was built or destroyed
    hasChanges ||= !isNew && info.ownerId !== ownerId;
    hasChanges ||= !isNew && info.level !== unit.level();
    hasChanges ||= !isNew && info.type !== unit.type();
    return hasChanges;
  }

  private getAllCoverageRanges(): CoverageRadius[] {
    const defensiveStructures = this.game
      .units(UnitType.SAMLauncher, UnitType.AABattery, UnitType.RadarStation)
      .filter(
        (unit) =>
          unit.isActive() &&
          this.activeTypes.includes(unit.type()) &&
          !unit.isUnderConstruction(),
      );

    this.structures.clear();
    defensiveStructures.forEach((unit) =>
      this.structures.set(unit.id(), {
        ownerId: unit.owner().smallID(),
        level: unit.level(),
        type: unit.type(),
      }),
    );

    return defensiveStructures.map((unit) => {
      const tile = unit.tile();
      return {
        x: this.game.x(tile),
        y: this.game.y(tile),
        r: this.coverageRadius(unit),
        owner: unit.owner(),
        type: unit.type(),
        arcs: [],
      };
    });
  }

  private computeUncoveredArcIntervals(
    a: CoverageRadius,
    circles: CoverageRadius[],
  ) {
    a.arcs = [];
    const TWO_PI = Math.PI * 2;
    const EPS = 1e-9;
    // helper functions
    const normalize = (a: number) => {
      while (a < 0) a += TWO_PI;
      while (a >= TWO_PI) a -= TWO_PI;
      return a;
    };
    // merge a list of intervals [s,e] (both between 0..2pi), taking wraparound into account
    const mergeIntervals = (
      intervals: Array<[number, number]>,
    ): Array<[number, number]> => {
      if (intervals.length === 0) return [];
      // normalize to non-wrap intervals
      const flat: Array<[number, number]> = [];
      for (const [s, e] of intervals) {
        const ns = normalize(s);
        const ne = normalize(e);
        if (ne < ns) {
          // wraps, split
          flat.push([ns, TWO_PI]);
          flat.push([0, ne]);
        } else {
          flat.push([ns, ne]);
        }
      }
      flat.sort((a, b) => a[0] - b[0]);
      const merged: Array<[number, number]> = [];
      let cur = flat[0].slice() as [number, number];
      for (let i = 1; i < flat.length; i++) {
        const it = flat[i];
        if (it[0] <= cur[1] + EPS) {
          cur[1] = Math.max(cur[1], it[1]);
        } else {
          merged.push([cur[0], cur[1]]);
          cur = it.slice() as [number, number];
        }
      }
      merged.push([cur[0], cur[1]]);
      return merged;
    };
    const covered: Interval[] = [];
    let fullyCovered = false;

    for (const b of circles) {
      if (a === b) continue;

      // Only same-owner coverage
      if (a.owner.smallID() !== b.owner.smallID()) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);

      // a fully inside b
      if (d + a.r <= b.r + EPS) {
        fullyCovered = true;
        break;
      }

      // no overlap
      if (d >= a.r + b.r - EPS) continue;

      // coincident centers
      if (d <= EPS) {
        if (b.r >= a.r) {
          fullyCovered = true;
          break;
        }
        continue;
      }

      // angular span on a covered by b
      const theta = Math.atan2(dy, dx);
      const cosPhi = (a.r * a.r + d * d - b.r * b.r) / (2 * a.r * d);
      const phi = Math.acos(Math.max(-1, Math.min(1, cosPhi)));

      covered.push([theta - phi, theta + phi]);
    }

    if (fullyCovered) return;

    const merged = mergeIntervals(covered);

    // subtract from [0, 2π)
    const uncovered: Interval[] = [];
    if (merged.length === 0) {
      uncovered.push([0, TWO_PI]);
    } else {
      let cursor = 0;
      for (const [s, e] of merged) {
        if (s > cursor + EPS) {
          uncovered.push([cursor, s]);
        }
        cursor = Math.max(cursor, e);
      }
      if (cursor < TWO_PI - EPS) {
        uncovered.push([cursor, TWO_PI]);
      }
    }
    a.arcs = uncovered;
  }

  private drawArcSegments(ctx: CanvasRenderingContext2D, a: CoverageRadius) {
    const outlineColor = "rgba(0, 0, 0, 1)";
    const lineColorSelf = "rgba(0, 255, 0, 1)";
    const lineColorEnemy = "rgba(255, 0, 0, 1)";
    const lineColorFriend = "rgba(255, 255, 0, 1)";
    const extraOutlineWidth = 1; // adds onto below
    const lineWidth = 3;
    const lineDash = [12, 6];

    const offsetX = -this.game.width() / 2;
    const offsetY = -this.game.height() / 2;
    for (const [s, e] of a.arcs) {
      // skip tiny arcs
      if (e - s < 1e-3) continue;
      ctx.beginPath();
      ctx.arc(a.x + offsetX, a.y + offsetY, a.r, s, e);

      // Outline
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = lineWidth + extraOutlineWidth;
      ctx.setLineDash([
        lineDash[0] + extraOutlineWidth,
        Math.max(lineDash[1] - extraOutlineWidth, 0),
      ]);
      ctx.lineDashOffset = this.dashOffset + extraOutlineWidth / 2;
      ctx.stroke();

      // Inline
      if (a.owner.isMe()) {
        ctx.strokeStyle = lineColorSelf;
      } else if (this.game.myPlayer()?.isFriendly(a.owner)) {
        ctx.strokeStyle = lineColorFriend;
      } else {
        ctx.strokeStyle = lineColorEnemy;
      }

      ctx.lineWidth = lineWidth;
      ctx.setLineDash(lineDash);
      ctx.lineDashOffset = this.dashOffset;
      ctx.stroke();
    }
  }

  /**
   * Compute for each circle which angular segments are NOT covered by any other circle
   */
  private computeCircleUnions() {
    this.coverageRanges = this.getAllCoverageRanges();
    for (let i = 0; i < this.coverageRanges.length; i++) {
      const a = this.coverageRanges[i];
      this.computeUncoveredArcIntervals(a, this.coverageRanges);
    }
  }

  /**
   * Draw union of multiple circles: stroke only the outer arcs so overlapping circles appear as one combined shape.
   */
  private drawCirclesUnion(context: CanvasRenderingContext2D) {
    const circles = this.coverageRanges;
    if (circles.length === 0 || !this.visible) return;
    context.save();
    for (let i = 0; i < circles.length; i++) {
      this.drawArcSegments(context, circles[i]);
    }
    context.restore();
  }

  private drawSelectedStructureRange(
    context: CanvasRenderingContext2D,
    unit: UnitView,
  ) {
    const radius = this.coverageRadius(unit);
    if (radius <= 0) {
      return;
    }

    const x = this.game.x(unit.tile()) - this.game.width() / 2;
    const y = this.game.y(unit.tile()) - this.game.height() / 2;
    context.save();
    context.strokeStyle = "rgba(180, 232, 255, 0.95)";
    context.fillStyle = "rgba(110, 195, 255, 0.12)";
    context.lineWidth = 2;
    context.setLineDash([8, 4]);
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.setLineDash([]);
    context.strokeRect(x - 5, y - 5, 10, 10);
    context.restore();
  }

  private activeGhostTypes(): UnitType[] {
    switch (this.uiState.ghostStructure) {
      case UnitType.SAMLauncher:
      case UnitType.AABattery:
      case UnitType.RadarStation:
        return [this.uiState.ghostStructure];
      case UnitType.MissileSilo:
      case UnitType.City:
      case UnitType.AtomBomb:
      case UnitType.HydrogenBomb:
        return [UnitType.SAMLauncher];
      default:
        return this.activeTypes;
    }
  }

  private coverageRadius(unit: UnitView): number {
    switch (unit.type()) {
      case UnitType.SAMLauncher:
        return this.game.config().samRange(unit.level());
      case UnitType.AABattery:
        return this.game.config().aaBatteryRange();
      case UnitType.RadarStation:
        return this.game.config().radarStationRange();
      default:
        return 0;
    }
  }

  private handleMouseUp(event: MouseUpEvent) {
    if (this.uiState.ghostStructure !== null) {
      return;
    }
    const tile = this.screenEventToTile(event);
    if (tile === null) {
      return;
    }

    const selected = this.game
      .units(UnitType.SAMLauncher, UnitType.AABattery, UnitType.RadarStation)
      .filter(
        (unit) =>
          unit.isActive() &&
          unit.owner() === this.game.myPlayer() &&
          this.game.manhattanDist(unit.tile(), tile) <= this.selectionRadius,
      )
      .sort(
        (a, b) =>
          this.game.manhattanDist(a.tile(), tile) -
            this.game.manhattanDist(b.tile(), tile) || a.id() - b.id(),
      )[0];

    if (!selected) {
      this.selectedStructureId = null;
      this.updateVisibility();
      return;
    }

    this.selectedStructureId =
      this.selectedStructureId === selected.id() ? null : selected.id();
    this.needsRedraw = true;
    this.updateVisibility();
  }

  private screenEventToTile(event: MouseUpEvent): TileRef | null {
    const rect = this.transformHandler.boundingRect();
    if (!rect) {
      return null;
    }
    const cell = this.transformHandler.screenToWorldCoordinates(
      event.x - rect.left,
      event.y - rect.top,
    );
    if (!this.game.isValidCoord(cell.x, cell.y)) {
      return null;
    }
    return this.game.ref(cell.x, cell.y);
  }
}
