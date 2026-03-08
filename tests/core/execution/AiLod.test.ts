import { ProceduralPerformancePreset } from "../../../src/core/game/Game";
import {
  AiLodTier,
  determineAiLodTier,
  shouldRunAiTier,
} from "../../../src/core/execution/utils/AiLod";
import { Config } from "../../../src/core/configuration/Config";
import { Player } from "../../../src/core/game/Game";

function mockPlayer(params?: {
  incoming?: number;
  outgoing?: number;
  lastTileChange?: number;
  hostileNeighbor?: boolean;
  borderSize?: number;
}) {
  const hostileNeighbor = params?.hostileNeighbor ?? false;
  return {
    isAlive: () => true,
    incomingAttacks: () => Array.from({ length: params?.incoming ?? 0 }),
    outgoingAttacks: () => Array.from({ length: params?.outgoing ?? 0 }),
    lastTileChange: () => params?.lastTileChange ?? 0,
    neighbors: () =>
      hostileNeighbor
        ? [{ isPlayer: () => true, id: () => "enemy" }]
        : [{ isPlayer: () => false }],
    isFriendly: () => !hostileNeighbor,
    borderTiles: () => new Set(Array.from({ length: params?.borderSize ?? 0 })),
  };
}

describe("AI LOD", () => {
  test("promotes attacked players to active tier", () => {
    const tier = determineAiLodTier(
      mockPlayer({ incoming: 1 }) as unknown as Player,
      100,
    );
    expect(tier).toBe(AiLodTier.Active);
  });

  test("hostile borders use strategic tier", () => {
    const tier = determineAiLodTier(
      mockPlayer({ lastTileChange: 0, hostileNeighbor: true }) as unknown as Player,
      200,
    );
    expect(tier).toBe(AiLodTier.Strategic);
  });

  test("stable remote players are throttled", () => {
    const config = {
      gameConfig: () => ({
        proceduralWorld: {
          performancePreset: ProceduralPerformancePreset.MassiveScale,
        },
      }),
    } as Pick<Config, "gameConfig">;
    expect(
      shouldRunAiTier(10, AiLodTier.Remote, config as Config, 0),
    ).toBe(false);
    expect(
      shouldRunAiTier(24, AiLodTier.Remote, config as Config, 0),
    ).toBe(true);
  });
});
