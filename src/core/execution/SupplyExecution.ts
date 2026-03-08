import { Execution, Game } from "../game/Game";

export class SupplyExecution implements Execution {
  private mg: Game | null = null;

  init(mg: Game): void {
    this.mg = mg;
  }

  tick(ticks: number): void {
    this.mg?.recomputeSupplyIfNeeded(ticks);
  }

  isActive(): boolean {
    return true;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
