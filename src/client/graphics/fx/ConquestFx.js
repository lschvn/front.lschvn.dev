import { FxType } from "./Fx";
import { FadeFx, SpriteFx } from "./SpriteFx";
/**
 * Conquest FX:
 * - conquest sprite
 */
export function conquestFxFactory(animatedSpriteLoader, conquest, game) {
    const conquered = game.player(conquest.conqueredId);
    const x = conquered.nameLocation().x;
    const y = conquered.nameLocation().y;
    const swordAnimation = new SpriteFx(animatedSpriteLoader, x, y, FxType.Conquest, 2500);
    return new FadeFx(swordAnimation, 0.1, 0.6);
}
//# sourceMappingURL=ConquestFx.js.map