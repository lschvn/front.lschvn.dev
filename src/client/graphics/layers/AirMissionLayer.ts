import { EventBus } from "../../../core/EventBus";
import { UnitType } from "../../../core/game/Game";
import { GameView, UnitView } from "../../../core/game/GameView";
import {
  CloseViewEvent,
  MouseMoveEvent,
  MouseUpEvent,
  UnitSelectionEvent,
} from "../../InputHandler";
import { LaunchAirMissionIntentEvent } from "../../Transport";
import { TransformHandler } from "../TransformHandler";
import { UIState } from "../UIState";
import { Layer } from "./Layer";
import { TileRef } from "../../../core/game/GameMap";

export class AirMissionLayer implements Layer {
  private selectedAirbase: UnitView | null = null;
  private mouseScreen = { x: 0, y: 0 };
  private readonly selectionRadius = 8;

  constructor(
    private readonly game: GameView,
    private readonly eventBus: EventBus,
    private readonly transformHandler: TransformHandler,
    private readonly uiState: UIState,
  ) {}

  init() {
    this.eventBus.on(UnitSelectionEvent, (event) => {
      if (
        event.isSelected &&
        event.unit &&
        event.unit.type() === UnitType.Airbase &&
        event.unit.owner() === this.game.myPlayer()
      ) {
        this.selectedAirbase = event.unit;
        this.uiState.selectedAirbaseId = event.unit.id();
        return;
      }

      if (!event.isSelected && this.selectedAirbase === event.unit) {
        this.selectedAirbase = null;
        this.uiState.selectedAirbaseId = null;
        this.uiState.pendingAirMission = null;
      }
    });
    this.eventBus.on(MouseMoveEvent, (event) => {
      this.mouseScreen.x = event.x;
      this.mouseScreen.y = event.y;
    });
    this.eventBus.on(MouseUpEvent, (event) => this.handleMouseUp(event));
    this.eventBus.on(CloseViewEvent, () => {
      if (this.selectedAirbase) {
        this.eventBus.emit(new UnitSelectionEvent(this.selectedAirbase, false));
      }
    });
  }

  shouldTransform(): boolean {
    return true;
  }

  tick() {
    if (!this.selectedAirbase) {
      return;
    }
    const unit = this.game.unit(this.selectedAirbase.id());
    if (
      !unit ||
      !unit.isActive() ||
      unit.owner() !== this.game.myPlayer() ||
      unit.type() !== UnitType.Airbase
    ) {
      this.selectedAirbase = null;
      this.uiState.selectedAirbaseId = null;
      this.uiState.pendingAirMission = null;
    } else {
      this.selectedAirbase = unit;
    }
  }

  renderLayer(context: CanvasRenderingContext2D) {
    if (!this.selectedAirbase || !this.selectedAirbase.isActive()) {
      return;
    }

    const centerX = this.game.x(this.selectedAirbase.tile());
    const centerY = this.game.y(this.selectedAirbase.tile());

    context.save();
    context.strokeStyle = "rgba(178, 222, 255, 0.8)";
    context.fillStyle = "rgba(128, 196, 255, 0.12)";
    context.lineWidth = 1.25;
    context.setLineDash([6, 4]);
    context.beginPath();
    context.arc(
      centerX,
      centerY,
      this.game.config().airbaseOperationalRange(),
      0,
      Math.PI * 2,
    );
    context.fill();
    context.stroke();
    context.setLineDash([]);

    context.strokeStyle = "rgba(255, 255, 255, 0.9)";
    context.strokeRect(centerX - 6, centerY - 6, 12, 12);

    if (this.uiState.pendingAirMission !== null) {
      const hoveredTile = this.hoveredTile();
      if (hoveredTile !== null) {
        const x = this.game.x(hoveredTile);
        const y = this.game.y(hoveredTile);
        context.strokeStyle = "rgba(255, 230, 130, 0.9)";
        context.beginPath();
        context.moveTo(centerX, centerY);
        context.lineTo(x, y);
        context.stroke();
        context.strokeRect(x - 4, y - 4, 8, 8);
      }
    }
    context.restore();
  }

  private handleMouseUp(event: MouseUpEvent) {
    if (this.uiState.ghostStructure !== null) {
      return;
    }

    const tile = this.screenEventToTile(event);
    if (tile === null) {
      return;
    }

    if (this.uiState.pendingAirMission !== null && this.selectedAirbase) {
      this.eventBus.emit(
        new LaunchAirMissionIntentEvent(
          this.uiState.pendingAirMission.airbaseId,
          this.uiState.pendingAirMission.squadronType,
          this.uiState.pendingAirMission.missionType,
          tile,
        ),
      );
      this.uiState.pendingAirMission = null;
      return;
    }

    if (this.game.isOcean(tile)) {
      return;
    }

    const airbase = this.game
      .units(UnitType.Airbase)
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

    if (!airbase) {
      if (this.selectedAirbase) {
        this.eventBus.emit(new UnitSelectionEvent(this.selectedAirbase, false));
      }
      return;
    }

    if (this.selectedAirbase?.id() === airbase.id()) {
      this.eventBus.emit(new UnitSelectionEvent(airbase, false));
      return;
    }

    if (this.selectedAirbase) {
      this.eventBus.emit(new UnitSelectionEvent(this.selectedAirbase, false));
    }
    this.eventBus.emit(new UnitSelectionEvent(airbase, true));
  }

  private screenEventToTile(event: MouseUpEvent): TileRef | null {
    const rect = this.transformHandler.boundingRect();
    if (!rect) {
      return null;
    }
    const localX = event.x - rect.left;
    const localY = event.y - rect.top;
    const cell = this.transformHandler.screenToWorldCoordinates(localX, localY);
    if (!this.game.isValidCoord(cell.x, cell.y)) {
      return null;
    }
    return this.game.ref(cell.x, cell.y);
  }

  private hoveredTile(): TileRef | null {
    const rect = this.transformHandler.boundingRect();
    if (!rect) {
      return null;
    }
    const cell = this.transformHandler.screenToWorldCoordinates(
      this.mouseScreen.x - rect.left,
      this.mouseScreen.y - rect.top,
    );
    if (!this.game.isValidCoord(cell.x, cell.y)) {
      return null;
    }
    return this.game.ref(cell.x, cell.y);
  }
}
