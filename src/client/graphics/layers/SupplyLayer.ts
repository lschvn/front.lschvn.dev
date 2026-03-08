import { SupplyState } from "../../../core/game/Game";
import { TileRef } from "../../../core/game/GameMap";
import { GameView } from "../../../core/game/GameView";
import { UserSettings } from "../../../core/game/UserSettings";
import { Layer } from "./Layer";

export class SupplyLayer implements Layer {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private needsFullRepaint = true;
  private wasVisible = false;

  constructor(
    private readonly game: GameView,
    private readonly userSettings: UserSettings,
  ) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.game.width();
    this.canvas.height = this.game.height();
    const context = this.canvas.getContext("2d", { alpha: true });
    if (context === null) {
      throw new Error("2d context not supported");
    }
    this.context = context;
  }

  shouldTransform(): boolean {
    return true;
  }

  init(): void {
    this.repaintAll();
  }

  tick(): void {
    const visible = this.userSettings.supplyOverlay();
    if (visible && !this.wasVisible) {
      this.needsFullRepaint = true;
    }
    this.wasVisible = visible;

    if (!visible) {
      return;
    }
    if (this.needsFullRepaint) {
      this.repaintAll();
      return;
    }
    for (const tile of this.game.recentlyUpdatedSupplyTiles()) {
      this.paintTile(tile);
    }
  }

  redraw(): void {
    this.needsFullRepaint = true;
  }

  renderLayer(context: CanvasRenderingContext2D): void {
    if (!this.userSettings.supplyOverlay()) {
      return;
    }
    if (this.needsFullRepaint) {
      this.repaintAll();
    }

    context.save();
    const previousSmoothing = context.imageSmoothingEnabled;
    context.imageSmoothingEnabled = false;
    context.drawImage(this.canvas, 0, 0, this.game.width(), this.game.height());
    context.imageSmoothingEnabled = previousSmoothing;
    context.restore();
  }

  private repaintAll(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (let tile = 0; tile < this.game.width() * this.game.height(); tile++) {
      this.paintTile(tile as TileRef);
    }
    this.needsFullRepaint = false;
  }

  private paintTile(tile: TileRef): void {
    const x = this.game.x(tile);
    const y = this.game.y(tile);
    const color = this.colorForTile(tile);
    this.context.clearRect(x, y, 1, 1);
    if (color === null) {
      return;
    }
    this.context.fillStyle = color;
    this.context.fillRect(x, y, 1, 1);
  }

  private colorForTile(tile: TileRef): string | null {
    switch (this.game.supplyState(tile)) {
      case SupplyState.Supplied:
        return "rgba(44, 138, 88, 0.18)";
      case SupplyState.Strained:
        return "rgba(214, 158, 46, 0.28)";
      case SupplyState.Isolated:
        return this.game.isSupplyReserveDepleted(tile)
          ? "rgba(185, 28, 28, 0.48)"
          : "rgba(220, 38, 38, 0.32)";
      case SupplyState.None:
      default:
        return null;
    }
  }
}
