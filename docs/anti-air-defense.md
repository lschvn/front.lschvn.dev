# Anti-Air Defense

OpenFront anti-air defense is layered around local area denial rather than hard immunity.

## Structures

- `AA Battery`: automatic short-to-medium range anti-air that prioritizes strike bombers, then patrol/intercept fighters.
- `Radar Station`: wide early-warning coverage that warns about hostile aircraft and improves nearby anti-air and fighter interception quality.

## Rules

- AA Batteries only engage hostile airborne aircraft.
- Radar coverage does not stack into immunity; it acts as a binary support bonus.
- Overlapping AA Batteries use diminishing returns so stacking stays useful without making a core region untouchable.
- Existing SAM behavior against missiles and nukes is unchanged.

## Player Readability

- Build ghosts and selected defenses show their coverage radius.
- Radar contacts generate inbound warnings for detected hostile aircraft.
- Aircraft still have travel time, visible health, and destruction FX so defended airspace remains readable.
