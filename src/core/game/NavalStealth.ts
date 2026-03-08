import { SONAR_STATION_REVEAL_RADIUS } from "../configuration/NavalStealthBalance";
import { Tick, UnitType } from "./Game";
import { TileRef } from "./GameMap";

type StealthPlayerLike = {
  isFriendly(other: StealthPlayerLike): boolean;
};

type StealthUnitLike = {
  type(): UnitType;
  tile(): TileRef;
  owner(): StealthPlayerLike;
  revealedUntilTick(): Tick | undefined;
};

type StealthGameLike<TUnit extends StealthUnitLike> = {
  ticks(): Tick;
  nearbyUnits(
    tile: TileRef,
    searchRange: number,
    types: UnitType | readonly UnitType[],
    predicate?: (value: { unit: TUnit; distSquared: number }) => boolean,
  ): Array<{ unit: TUnit; distSquared: number }>;
};

export function isSubmarineVisibleToPlayer<TUnit extends StealthUnitLike>(
  game: StealthGameLike<TUnit>,
  submarine: TUnit,
  viewer: StealthPlayerLike | null | undefined,
): boolean {
  if (submarine.type() !== UnitType.Submarine) {
    return true;
  }
  if (viewer === null || viewer === undefined) {
    return true;
  }

  const owner = submarine.owner();
  if (viewer === owner || viewer.isFriendly(owner)) {
    return true;
  }

  const revealedUntilTick = submarine.revealedUntilTick();
  if (
    revealedUntilTick !== undefined &&
    revealedUntilTick >= game.ticks()
  ) {
    return true;
  }

  return (
    game.nearbyUnits(
      submarine.tile(),
      SONAR_STATION_REVEAL_RADIUS,
      UnitType.SonarStation,
      ({ unit }) => {
        const sonarOwner = unit.owner();
        return sonarOwner === viewer || viewer.isFriendly(sonarOwner);
      },
    ).length > 0
  );
}
