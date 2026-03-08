import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { EventBus } from "../../../core/EventBus";
import {
  AirMissionPhase,
  AirMissionType,
  UnitType,
} from "../../../core/game/Game";
import { GameView, UnitView } from "../../../core/game/GameView";
import { CloseViewEvent, UnitSelectionEvent } from "../../InputHandler";
import { ProduceAirSquadronIntentEvent } from "../../Transport";
import { renderNumber, translateText } from "../../Utils";
import { UIState } from "../UIState";
import { Layer } from "./Layer";

@customElement("air-mission-panel")
export class AirMissionPanel extends LitElement implements Layer {
  public game!: GameView;
  public eventBus!: EventBus;
  public uiState!: UIState;
  private selectedAirbase: UnitView | null = null;

  createRenderRoot() {
    return this;
  }

  init() {
    this.eventBus.on(UnitSelectionEvent, (event) => {
      if (
        event.isSelected &&
        event.unit &&
        event.unit.type() === UnitType.Airbase &&
        event.unit.owner() === this.game.myPlayer()
      ) {
        this.selectedAirbase = event.unit;
      } else if (!event.isSelected && this.selectedAirbase === event.unit) {
        this.selectedAirbase = null;
        this.uiState.pendingAirMission = null;
      }
      this.requestUpdate();
    });
    this.eventBus.on(CloseViewEvent, () => {
      this.selectedAirbase = null;
      this.uiState.pendingAirMission = null;
      this.requestUpdate();
    });
  }

  tick() {
    if (!this.selectedAirbase) {
      return;
    }
    const unit = this.game.unit(this.selectedAirbase.id());
    if (
      !unit ||
      !unit.isActive() ||
      unit.type() !== UnitType.Airbase ||
      unit.owner() !== this.game.myPlayer()
    ) {
      this.selectedAirbase = null;
      this.uiState.pendingAirMission = null;
    } else {
      this.selectedAirbase = unit;
    }
    this.requestUpdate();
  }

  render() {
    const airbase = this.selectedAirbase;
    const myPlayer = this.game?.myPlayer();
    if (!airbase || !myPlayer || airbase.owner() !== myPlayer) {
      return null;
    }

    const fighters = myPlayer
      .units(UnitType.FighterSquadron)
      .filter((unit) => unit.airbaseId() === airbase.id());
    const bombers = myPlayer
      .units(UnitType.BomberSquadron)
      .filter((unit) => unit.airbaseId() === airbase.id());
    const readyFighters = fighters.filter(
      (unit) => unit.airMissionPhase() === AirMissionPhase.Ready,
    ).length;
    const readyBombers = bombers.filter(
      (unit) => unit.airMissionPhase() === AirMissionPhase.Ready,
    ).length;
    const rearmingFighters = fighters.filter(
      (unit) => unit.airMissionPhase() === AirMissionPhase.Rearming,
    ).length;
    const rearmingBombers = bombers.filter(
      (unit) => unit.airMissionPhase() === AirMissionPhase.Rearming,
    ).length;
    const hasCapacity =
      fighters.length + bombers.length <
      this.game.config().airbaseSquadronCapacity();

    return html`
      <div
        class="fixed left-4 bottom-28 z-[110] w-80 rounded-xl border border-slate-500/40 bg-slate-950/90 text-white shadow-2xl backdrop-blur-sm"
      >
        <div class="border-b border-white/10 px-4 py-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-semibold">${translateText("unit_type.airbase")}</div>
              <div class="text-xs text-slate-300">
                Range ${this.game.config().airbaseOperationalRange()} · ${fighters.length + bombers.length}/${this.game.config().airbaseSquadronCapacity()} squadrons
              </div>
            </div>
            <button
              class="text-xs text-slate-300 hover:text-white"
              @click=${() =>
                this.eventBus.emit(new UnitSelectionEvent(airbase, false))}
            >
              Close
            </button>
          </div>
        </div>
        <div class="space-y-3 px-4 py-3">
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="rounded-lg bg-slate-900/80 p-2">
              <div class="font-medium">Fighters</div>
              <div class="text-xs text-slate-300">
                Ready ${readyFighters} · Rearming ${rearmingFighters}
              </div>
            </div>
            <div class="rounded-lg bg-slate-900/80 p-2">
              <div class="font-medium">Bombers</div>
              <div class="text-xs text-slate-300">
                Ready ${readyBombers} · Rearming ${rearmingBombers}
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            ${this.renderProduceButton(
              airbase.id(),
              UnitType.FighterSquadron,
              "Produce Fighter",
              hasCapacity,
            )}
            ${this.renderProduceButton(
              airbase.id(),
              UnitType.BomberSquadron,
              "Produce Bomber",
              hasCapacity,
            )}
          </div>

          <div class="space-y-2">
            <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Fighter Missions
            </div>
            <div class="grid grid-cols-3 gap-2">
              ${this.renderMissionButton(
                airbase.id(),
                UnitType.FighterSquadron,
                AirMissionType.PatrolArea,
                "Patrol",
                readyFighters === 0,
              )}
              ${this.renderMissionButton(
                airbase.id(),
                UnitType.FighterSquadron,
                AirMissionType.EscortBombers,
                "Escort",
                readyFighters === 0,
              )}
              ${this.renderMissionButton(
                airbase.id(),
                UnitType.FighterSquadron,
                AirMissionType.InterceptEnemyAircraft,
                "Intercept",
                readyFighters === 0,
              )}
            </div>
          </div>

          <div class="space-y-2">
            <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Bomber Missions
            </div>
            <div class="grid grid-cols-3 gap-2">
              ${this.renderMissionButton(
                airbase.id(),
                UnitType.BomberSquadron,
                AirMissionType.StrategicBombing,
                "Strategic",
                readyBombers === 0,
              )}
              ${this.renderMissionButton(
                airbase.id(),
                UnitType.BomberSquadron,
                AirMissionType.CloseAirSupport,
                "CAS",
                readyBombers === 0,
              )}
              ${this.renderMissionButton(
                airbase.id(),
                UnitType.BomberSquadron,
                AirMissionType.PortStrike,
                "Port Strike",
                readyBombers === 0,
              )}
            </div>
          </div>

          <div class="rounded-lg bg-slate-900/80 px-3 py-2 text-xs text-slate-300">
            ${this.uiState.pendingAirMission
              ? `Targeting ${this.uiState.pendingAirMission.missionType}. Click a tile on the map to launch.`
              : "Select a mission, then click a target tile inside the Airbase radius."}
          </div>
        </div>
      </div>
    `;
  }

  private renderProduceButton(
    airbaseId: number,
    squadronType: UnitType.FighterSquadron | UnitType.BomberSquadron,
    label: string,
    hasCapacity: boolean,
  ) {
    const canAfford =
      (this.game.myPlayer()?.gold() ?? 0n) >=
      this.game.unitInfo(squadronType).cost(this.game, this.game.myPlayer()!);
    const enabled = canAfford && hasCapacity;
    return html`
      <button
        class="rounded-lg border border-slate-500/40 px-3 py-2 text-sm ${enabled
          ? "bg-slate-900 hover:bg-slate-800"
          : "cursor-not-allowed bg-slate-950/60 text-slate-500"}"
        ?disabled=${!enabled}
        @click=${() =>
          this.eventBus.emit(
            new ProduceAirSquadronIntentEvent(airbaseId, squadronType),
          )}
      >
        <div>${label}</div>
        <div class="text-xs text-slate-300">
          ${renderNumber(this.game.unitInfo(squadronType).cost(this.game, this.game.myPlayer()!))}
        </div>
      </button>
    `;
  }

  private renderMissionButton(
    airbaseId: number,
    squadronType: UnitType.FighterSquadron | UnitType.BomberSquadron,
    missionType: AirMissionType,
    label: string,
    disabled: boolean,
  ) {
    const selected =
      this.uiState.pendingAirMission?.airbaseId === airbaseId &&
      this.uiState.pendingAirMission?.squadronType === squadronType &&
      this.uiState.pendingAirMission?.missionType === missionType;
    return html`
      <button
        class="rounded-lg border px-2 py-2 text-xs ${disabled
          ? "cursor-not-allowed border-slate-700 bg-slate-950/60 text-slate-500"
          : selected
            ? "border-amber-300/70 bg-amber-400/15 text-white"
            : "border-slate-500/40 bg-slate-900 hover:bg-slate-800"}"
        ?disabled=${disabled}
        @click=${() => {
          this.uiState.pendingAirMission = {
            airbaseId,
            squadronType,
            missionType,
          };
          this.requestUpdate();
        }}
      >
        ${label}
      </button>
    `;
  }
}
