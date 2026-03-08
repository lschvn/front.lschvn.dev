import { SpatialQuery } from "../pathfinding/spatial/SpatialQuery";
import { UnitType } from "./Game";
export function canBuildTransportShip(game, player, tile) {
    if (player.unitCount(UnitType.TransportShip) >= game.config().boatMaxNumber()) {
        return false;
    }
    const dst = targetTransportTile(game, tile);
    if (dst === null) {
        return false;
    }
    const other = game.owner(tile);
    if (other === player) {
        return false;
    }
    if (other.isPlayer() && !player.canAttackPlayer(other)) {
        return false;
    }
    const spatial = new SpatialQuery(game);
    return spatial.closestShoreByWater(player, dst) ?? false;
}
export function targetTransportTile(gm, tile) {
    const spatial = new SpatialQuery(gm);
    return spatial.closestShore(gm.owner(tile), tile);
}
export function bestShoreDeploymentSource(gm, player, dst) {
    const spatial = new SpatialQuery(gm);
    return spatial.closestShoreByWater(player, dst);
}
//# sourceMappingURL=TransportShipUtils.js.map