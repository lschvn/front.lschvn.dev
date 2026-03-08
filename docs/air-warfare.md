# Air Warfare

OpenFront air power is mission-based. Aircraft are launched from an `Airbase`, complete a mission, then return to rearm. They do not capture territory directly and they do not replace ground or naval conquest.

## Buildings and Units

- `Airbase`: buildable structure that unlocks aircraft production and mission launching.
- `Fighter Squadron`: air-superiority unit for patrol, escort, and interception.
- `Bomber Squadron`: strike unit for strategic bombing, close air support, and port strikes.

## Mission Rules

- Missions can only launch from a live, completed Airbase.
- Targets must be inside the Airbase operational radius.
- Squadrons travel to the target, execute the mission, then return to the same Airbase.
- After landing, squadrons enter a rearming state before they can launch again.

## Combat Behavior

- Fighters intercept bombers while airborne and inside interception range.
- Escort fighters reduce incoming interception damage against nearby friendly bombers.
- Strategic bombing prioritizes high-value structures such as Airbases, Factories, Ports, Cities, SAMs, Defense Posts, and Missile Silos.
- Close air support creates a temporary local attack bonus for the owning player.
- Port strike damages ports first, then nearby naval traffic.
- AA Batteries and Radar Stations add local counterplay: radar warns early and improves reactions, while overlapping AA fire falls off instead of stacking linearly.

## Bot Usage

- Nations add Airbases only after their economy reaches a stable structure threshold.
- Nations produce a small fighter screen first, then bomber pressure.
- Nations use fighters defensively against incoming bombers and escort their own bomber strikes when possible.
