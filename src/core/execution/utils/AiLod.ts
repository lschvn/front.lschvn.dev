import { Config } from "../../configuration/Config";
import { Player, Tick } from "../../game/Game";
import { ProceduralPerformancePreset } from "../../game/Game";
import { PROCEDURAL_AI_LOD_INTERVALS } from "../../game/ProceduralMegaWorldConstants";

export enum AiLodTier {
  Active = "active",
  Strategic = "strategic",
  Remote = "remote",
}

type AiLodRunMetrics = {
  runs: number;
  durationMs: number;
};

export type AiLodMetricsSnapshot = {
  bot: Record<AiLodTier, AiLodRunMetrics>;
  nation: Record<AiLodTier, AiLodRunMetrics>;
};

const emptyTierMetrics = (): Record<AiLodTier, AiLodRunMetrics> => ({
  [AiLodTier.Active]: { runs: 0, durationMs: 0 },
  [AiLodTier.Strategic]: { runs: 0, durationMs: 0 },
  [AiLodTier.Remote]: { runs: 0, durationMs: 0 },
});

class AiLodTelemetryImpl {
  private bot = emptyTierMetrics();
  private nation = emptyTierMetrics();
  private tick = -1;

  beginTick(tick: number): void {
    if (tick === this.tick) {
      return;
    }
    this.tick = tick;
    this.bot = emptyTierMetrics();
    this.nation = emptyTierMetrics();
  }

  record(entity: "bot" | "nation", tier: AiLodTier, durationMs: number): void {
    const bucket = entity === "bot" ? this.bot : this.nation;
    bucket[tier].runs += 1;
    bucket[tier].durationMs += durationMs;
  }

  snapshot(): AiLodMetricsSnapshot {
    const copyTier = (
      tiers: Record<AiLodTier, AiLodRunMetrics>,
    ): Record<AiLodTier, AiLodRunMetrics> => ({
      [AiLodTier.Active]: { ...tiers[AiLodTier.Active] },
      [AiLodTier.Strategic]: { ...tiers[AiLodTier.Strategic] },
      [AiLodTier.Remote]: { ...tiers[AiLodTier.Remote] },
    });
    return {
      bot: copyTier(this.bot),
      nation: copyTier(this.nation),
    };
  }
}

const telemetry = new AiLodTelemetryImpl();

export const AiLodTelemetry = {
  beginTick: (tick: number) => telemetry.beginTick(tick),
  record: (entity: "bot" | "nation", tier: AiLodTier, durationMs: number) =>
    telemetry.record(entity, tier, durationMs),
  snapshot: () => telemetry.snapshot(),
};

export function shouldRunAiTier(
  ticks: Tick,
  tier: AiLodTier,
  config: Config,
  phase: number,
): boolean {
  const preset =
    config.gameConfig().proceduralWorld?.performancePreset ??
    ProceduralPerformancePreset.Balanced;
  const intervals = PROCEDURAL_AI_LOD_INTERVALS[preset];
  const interval =
    tier === AiLodTier.Active
      ? intervals.active
      : tier === AiLodTier.Strategic
        ? intervals.strategic
        : intervals.remote;
  return interval <= 1 || ticks % interval === phase % interval;
}

export function determineAiLodTier(player: Player, ticks: Tick): AiLodTier {
  if (!player.isAlive()) {
    return AiLodTier.Remote;
  }
  if (player.incomingAttacks().length > 0 || player.outgoingAttacks().length > 0) {
    return AiLodTier.Active;
  }
  if (ticks - player.lastTileChange() < 45) {
    return AiLodTier.Active;
  }
  const hostileNeighbor = player
    .neighbors()
    .some((n) => n.isPlayer() && !player.isFriendly(n, true));
  if (hostileNeighbor || player.borderTiles().size > 120) {
    return AiLodTier.Strategic;
  }
  return AiLodTier.Remote;
}
