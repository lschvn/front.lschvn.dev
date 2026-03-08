import { UnitType } from "../core/game/Game";
import { UserSettings } from "../core/game/UserSettings";
import { Platform } from "./Platform";
export class MouseUpEvent {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
export class MouseOverEvent {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
export class TouchEvent {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
/**
 * Event emitted when a unit is selected or deselected
 */
export class UnitSelectionEvent {
    constructor(unit, isSelected) {
        this.unit = unit;
        this.isSelected = isSelected;
    }
}
export class MouseDownEvent {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
export class MouseMoveEvent {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
export class ContextMenuEvent {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
export class ZoomEvent {
    constructor(x, y, delta) {
        this.x = x;
        this.y = y;
        this.delta = delta;
    }
}
export class DragEvent {
    constructor(deltaX, deltaY) {
        this.deltaX = deltaX;
        this.deltaY = deltaY;
    }
}
export class AlternateViewEvent {
    constructor(alternateView) {
        this.alternateView = alternateView;
    }
}
export class CloseViewEvent {
}
export class RefreshGraphicsEvent {
}
export class TogglePerformanceOverlayEvent {
}
export class ToggleStructureEvent {
    constructor(structureTypes) {
        this.structureTypes = structureTypes;
    }
}
export class GhostStructureChangedEvent {
    constructor(ghostStructure) {
        this.ghostStructure = ghostStructure;
    }
}
export class ConfirmGhostStructureEvent {
}
export class SwapRocketDirectionEvent {
    constructor(rocketDirectionUp) {
        this.rocketDirectionUp = rocketDirectionUp;
    }
}
export class ShowBuildMenuEvent {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
export class ShowEmojiMenuEvent {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
export class DoBoatAttackEvent {
}
export class DoGroundAttackEvent {
}
export class AttackRatioEvent {
    constructor(attackRatio) {
        this.attackRatio = attackRatio;
    }
}
export class AttackModeCycleEvent {
}
export class ReplaySpeedChangeEvent {
    constructor(replaySpeedMultiplier) {
        this.replaySpeedMultiplier = replaySpeedMultiplier;
    }
}
export class CenterCameraEvent {
    constructor() { }
}
export class AutoUpgradeEvent {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
export class ToggleCoordinateGridEvent {
    constructor(enabled) {
        this.enabled = enabled;
    }
}
export class TickMetricsEvent {
    constructor(tickExecutionDuration, tickDelay) {
        this.tickExecutionDuration = tickExecutionDuration;
        this.tickDelay = tickDelay;
    }
}
export class InputHandler {
    constructor(uiState, canvas, eventBus) {
        this.uiState = uiState;
        this.canvas = canvas;
        this.eventBus = eventBus;
        this.lastPointerX = 0;
        this.lastPointerY = 0;
        this.lastPointerDownX = 0;
        this.lastPointerDownY = 0;
        this.pointers = new Map();
        this.lastPinchDistance = 0;
        this.pointerDown = false;
        this.alternateView = false;
        this.moveInterval = null;
        this.activeKeys = new Set();
        this.keybinds = {};
        this.coordinateGridEnabled = false;
        this.PAN_SPEED = 5;
        this.ZOOM_SPEED = 10;
        this.userSettings = new UserSettings();
    }
    initialize() {
        let saved = {};
        try {
            const parsed = JSON.parse(localStorage.getItem("settings.keybinds") ?? "{}");
            // flatten { key: {key, value} } → { key: value } and accept legacy string values
            saved = Object.fromEntries(Object.entries(parsed)
                .map(([k, v]) => {
                // Extract value from nested object or plain string
                let val;
                if (v && typeof v === "object" && "value" in v) {
                    val = v.value;
                }
                else {
                    val = v;
                }
                // Map invalid values to undefined (filtered later)
                if (typeof val !== "string") {
                    return [k, undefined];
                }
                return [k, val];
            })
                .filter(([, v]) => typeof v === "string"));
        }
        catch (e) {
            console.warn("Invalid keybinds JSON:", e);
        }
        // Mac users might have different keybinds
        const isMac = Platform.isMac;
        this.keybinds = {
            toggleView: "Space",
            coordinateGrid: "KeyM",
            centerCamera: "KeyC",
            moveUp: "KeyW",
            moveDown: "KeyS",
            moveLeft: "KeyA",
            moveRight: "KeyD",
            zoomOut: "KeyQ",
            zoomIn: "KeyE",
            attackRatioDown: "KeyT",
            attackRatioUp: "KeyY",
            attackModeCycle: "KeyV",
            boatAttack: "KeyB",
            groundAttack: "KeyG",
            swapDirection: "KeyU",
            modifierKey: isMac ? "MetaLeft" : "ControlLeft",
            altKey: "AltLeft",
            buildCity: "Digit1",
            buildFactory: "Digit2",
            buildAirbase: "Minus",
            buildRadarStation: "BracketLeft",
            buildPort: "Digit3",
            buildDefensePost: "Digit4",
            buildAABattery: "Equal",
            buildMissileSilo: "Digit5",
            buildSamLauncher: "Digit6",
            buildWarship: "Digit7",
            buildAtomBomb: "Digit8",
            buildHydrogenBomb: "Digit9",
            buildMIRV: "Digit0",
            ...saved,
        };
        this.canvas.addEventListener("pointerdown", (e) => this.onPointerDown(e));
        window.addEventListener("pointerup", (e) => this.onPointerUp(e));
        this.canvas.addEventListener("wheel", (e) => {
            this.onScroll(e);
            this.onShiftScroll(e);
            e.preventDefault();
        }, { passive: false });
        window.addEventListener("pointermove", this.onPointerMove.bind(this));
        this.canvas.addEventListener("contextmenu", (e) => this.onContextMenu(e));
        window.addEventListener("mousemove", (e) => {
            if (e.movementX || e.movementY) {
                this.eventBus.emit(new MouseMoveEvent(e.clientX, e.clientY));
            }
        });
        this.pointers.clear();
        this.moveInterval = setInterval(() => {
            let deltaX = 0;
            let deltaY = 0;
            // Skip if shift is held down
            if (this.activeKeys.has("ShiftLeft") ||
                this.activeKeys.has("ShiftRight")) {
                return;
            }
            if (this.activeKeys.has(this.keybinds.moveUp) ||
                this.activeKeys.has("ArrowUp"))
                deltaY += this.PAN_SPEED;
            if (this.activeKeys.has(this.keybinds.moveDown) ||
                this.activeKeys.has("ArrowDown"))
                deltaY -= this.PAN_SPEED;
            if (this.activeKeys.has(this.keybinds.moveLeft) ||
                this.activeKeys.has("ArrowLeft"))
                deltaX += this.PAN_SPEED;
            if (this.activeKeys.has(this.keybinds.moveRight) ||
                this.activeKeys.has("ArrowRight"))
                deltaX -= this.PAN_SPEED;
            if (deltaX || deltaY) {
                this.eventBus.emit(new DragEvent(deltaX, deltaY));
            }
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;
            if (this.activeKeys.has(this.keybinds.zoomOut) ||
                this.activeKeys.has("Minus")) {
                this.eventBus.emit(new ZoomEvent(cx, cy, this.ZOOM_SPEED));
            }
            if (this.activeKeys.has(this.keybinds.zoomIn) ||
                this.activeKeys.has("Equal")) {
                this.eventBus.emit(new ZoomEvent(cx, cy, -this.ZOOM_SPEED));
            }
        }, 1);
        window.addEventListener("keydown", (e) => {
            const isTextInput = this.isTextInputTarget(e.target);
            if (isTextInput && e.code !== "Escape") {
                return;
            }
            if (e.code === this.keybinds.toggleView) {
                e.preventDefault();
                if (!this.alternateView) {
                    this.alternateView = true;
                    this.eventBus.emit(new AlternateViewEvent(true));
                }
            }
            if (e.code === this.keybinds.coordinateGrid && !e.repeat) {
                e.preventDefault();
                this.coordinateGridEnabled = !this.coordinateGridEnabled;
                this.eventBus.emit(new ToggleCoordinateGridEvent(this.coordinateGridEnabled));
            }
            if (e.code === "Escape") {
                e.preventDefault();
                this.eventBus.emit(new CloseViewEvent());
                this.setGhostStructure(null);
            }
            if ((e.code === "Enter" || e.code === "NumpadEnter") &&
                this.uiState.ghostStructure !== null) {
                e.preventDefault();
                this.eventBus.emit(new ConfirmGhostStructureEvent());
            }
            if ([
                this.keybinds.moveUp,
                this.keybinds.moveDown,
                this.keybinds.moveLeft,
                this.keybinds.moveRight,
                this.keybinds.zoomOut,
                this.keybinds.zoomIn,
                "ArrowUp",
                "ArrowLeft",
                "ArrowDown",
                "ArrowRight",
                "Minus",
                "Equal",
                this.keybinds.attackRatioDown,
                this.keybinds.attackRatioUp,
                this.keybinds.attackModeCycle,
                this.keybinds.centerCamera,
                "ControlLeft",
                "ControlRight",
                "ShiftLeft",
                "ShiftRight",
            ].includes(e.code)) {
                this.activeKeys.add(e.code);
            }
        });
        window.addEventListener("keyup", (e) => {
            const isTextInput = this.isTextInputTarget(e.target);
            if (isTextInput && !this.activeKeys.has(e.code)) {
                return;
            }
            if (e.code === this.keybinds.toggleView) {
                e.preventDefault();
                this.alternateView = false;
                this.eventBus.emit(new AlternateViewEvent(false));
            }
            const resetKey = this.keybinds.resetGfx ?? "KeyR";
            if (e.code === resetKey && this.isAltKeyHeld(e)) {
                e.preventDefault();
                this.eventBus.emit(new RefreshGraphicsEvent());
            }
            if (e.code === this.keybinds.boatAttack) {
                e.preventDefault();
                this.eventBus.emit(new DoBoatAttackEvent());
            }
            if (e.code === this.keybinds.groundAttack) {
                e.preventDefault();
                this.eventBus.emit(new DoGroundAttackEvent());
            }
            if (e.code === this.keybinds.attackRatioDown) {
                e.preventDefault();
                const increment = this.userSettings.attackRatioIncrement();
                this.eventBus.emit(new AttackRatioEvent(-increment));
            }
            if (e.code === this.keybinds.attackRatioUp) {
                e.preventDefault();
                const increment = this.userSettings.attackRatioIncrement();
                this.eventBus.emit(new AttackRatioEvent(increment));
            }
            if (e.code === this.keybinds.attackModeCycle) {
                e.preventDefault();
                this.eventBus.emit(new AttackModeCycleEvent());
            }
            if (e.code === this.keybinds.centerCamera) {
                e.preventDefault();
                this.eventBus.emit(new CenterCameraEvent());
            }
            // Two-phase build keybind matching: exact code match first, then digit/Numpad alias.
            const matchedBuild = this.resolveBuildKeybind(e.code);
            if (matchedBuild !== null) {
                e.preventDefault();
                this.setGhostStructure(matchedBuild);
            }
            if (e.code === this.keybinds.swapDirection) {
                e.preventDefault();
                const nextDirection = !this.uiState.rocketDirectionUp;
                this.eventBus.emit(new SwapRocketDirectionEvent(nextDirection));
            }
            // Shift-D to toggle performance overlay
            console.log(e.code, e.shiftKey, e.ctrlKey, e.altKey, e.metaKey);
            if (e.code === "KeyD" && e.shiftKey) {
                e.preventDefault();
                console.log("TogglePerformanceOverlayEvent");
                this.eventBus.emit(new TogglePerformanceOverlayEvent());
            }
            this.activeKeys.delete(e.code);
        });
    }
    onPointerDown(event) {
        if (event.button === 1) {
            event.preventDefault();
            this.eventBus.emit(new AutoUpgradeEvent(event.clientX, event.clientY));
            return;
        }
        if (event.button > 0) {
            return;
        }
        this.pointerDown = true;
        this.pointers.set(event.pointerId, event);
        if (this.pointers.size === 1) {
            this.lastPointerX = event.clientX;
            this.lastPointerY = event.clientY;
            this.lastPointerDownX = event.clientX;
            this.lastPointerDownY = event.clientY;
            this.eventBus.emit(new MouseDownEvent(event.clientX, event.clientY));
        }
        else if (this.pointers.size === 2) {
            this.lastPinchDistance = this.getPinchDistance();
        }
    }
    onPointerUp(event) {
        if (event.button === 1) {
            event.preventDefault();
            return;
        }
        if (event.button > 0) {
            return;
        }
        this.pointerDown = false;
        this.pointers.clear();
        if (this.isModifierKeyPressed(event)) {
            this.eventBus.emit(new ShowBuildMenuEvent(event.clientX, event.clientY));
            return;
        }
        if (this.isAltKeyPressed(event)) {
            this.eventBus.emit(new ShowEmojiMenuEvent(event.clientX, event.clientY));
            return;
        }
        const dist = Math.abs(event.x - this.lastPointerDownX) +
            Math.abs(event.y - this.lastPointerDownY);
        if (dist < 10) {
            if (event.pointerType === "touch") {
                this.eventBus.emit(new TouchEvent(event.x, event.y));
                event.preventDefault();
                return;
            }
            if (!this.userSettings.leftClickOpensMenu() || event.shiftKey) {
                this.eventBus.emit(new MouseUpEvent(event.x, event.y));
            }
            else {
                this.eventBus.emit(new ContextMenuEvent(event.clientX, event.clientY));
            }
        }
    }
    onScroll(event) {
        if (!event.shiftKey) {
            const realCtrl = this.activeKeys.has("ControlLeft") ||
                this.activeKeys.has("ControlRight");
            const ratio = event.ctrlKey && !realCtrl ? 10 : 1; // Compensate pinch-zoom low sensitivity
            this.eventBus.emit(new ZoomEvent(event.x, event.y, event.deltaY * ratio));
        }
    }
    onShiftScroll(event) {
        if (event.shiftKey) {
            const scrollValue = event.deltaY === 0 ? event.deltaX : event.deltaY;
            const increment = this.userSettings.attackRatioIncrement();
            const ratio = scrollValue > 0 ? -increment : increment;
            this.eventBus.emit(new AttackRatioEvent(ratio));
        }
    }
    onPointerMove(event) {
        if (event.button === 1) {
            event.preventDefault();
            return;
        }
        if (event.button > 0) {
            return;
        }
        this.pointers.set(event.pointerId, event);
        if (!this.pointerDown) {
            this.eventBus.emit(new MouseOverEvent(event.clientX, event.clientY));
            return;
        }
        if (this.pointers.size === 1) {
            const deltaX = event.clientX - this.lastPointerX;
            const deltaY = event.clientY - this.lastPointerY;
            this.eventBus.emit(new DragEvent(deltaX, deltaY));
            this.lastPointerX = event.clientX;
            this.lastPointerY = event.clientY;
        }
        else if (this.pointers.size === 2) {
            const currentPinchDistance = this.getPinchDistance();
            const pinchDelta = currentPinchDistance - this.lastPinchDistance;
            if (Math.abs(pinchDelta) > 1) {
                const zoomCenter = this.getPinchCenter();
                this.eventBus.emit(new ZoomEvent(zoomCenter.x, zoomCenter.y, -pinchDelta * 2));
                this.lastPinchDistance = currentPinchDistance;
            }
        }
    }
    onContextMenu(event) {
        event.preventDefault();
        if (this.uiState.ghostStructure !== null) {
            this.setGhostStructure(null);
            return;
        }
        this.eventBus.emit(new ContextMenuEvent(event.clientX, event.clientY));
    }
    setGhostStructure(ghostStructure) {
        this.uiState.ghostStructure = ghostStructure;
        this.eventBus.emit(new GhostStructureChangedEvent(ghostStructure));
    }
    /**
     * Extracts the digit character from KeyboardEvent.code.
     * Codes look like "Digit0".."Digit9" (6 chars, digit at index 5) and
     * "Numpad0".."Numpad9" (7 chars, digit at index 6). Returns null if not a digit key.
     */
    digitFromKeyCode(code) {
        if (code?.length === 6 &&
            code.startsWith("Digit") &&
            /^[0-9]$/.test(code[5]))
            return code[5];
        if (code?.length === 7 &&
            code.startsWith("Numpad") &&
            /^[0-9]$/.test(code[6]))
            return code[6];
        return null;
    }
    /** Strict equality only: used for first-pass exact KeyboardEvent.code match. */
    buildKeybindMatches(code, keybindValue) {
        return code === keybindValue;
    }
    /** Digit/Numpad alias match: used only when no exact match was found. */
    buildKeybindMatchesDigit(code, keybindValue) {
        const digit = this.digitFromKeyCode(code);
        const bindDigit = this.digitFromKeyCode(keybindValue);
        return digit !== null && bindDigit !== null && digit === bindDigit;
    }
    /**
     * Resolves a keyup code to a build action: exact code match first, then digit/Numpad alias.
     * Returns the UnitType to set as ghost, or null if no build keybind matched.
     */
    resolveBuildKeybind(code) {
        const buildKeybinds = [
            { key: "buildCity", type: UnitType.City },
            { key: "buildFactory", type: UnitType.Factory },
            { key: "buildAirbase", type: UnitType.Airbase },
            { key: "buildRadarStation", type: UnitType.RadarStation },
            { key: "buildPort", type: UnitType.Port },
            { key: "buildDefensePost", type: UnitType.DefensePost },
            { key: "buildAABattery", type: UnitType.AABattery },
            { key: "buildMissileSilo", type: UnitType.MissileSilo },
            { key: "buildSamLauncher", type: UnitType.SAMLauncher },
            { key: "buildAtomBomb", type: UnitType.AtomBomb },
            { key: "buildHydrogenBomb", type: UnitType.HydrogenBomb },
            { key: "buildWarship", type: UnitType.Warship },
            { key: "buildMIRV", type: UnitType.MIRV },
        ];
        for (const { key, type } of buildKeybinds) {
            if (this.buildKeybindMatches(code, this.keybinds[key]))
                return type;
        }
        for (const { key, type } of buildKeybinds) {
            if (this.buildKeybindMatchesDigit(code, this.keybinds[key]))
                return type;
        }
        return null;
    }
    getPinchDistance() {
        const pointerEvents = Array.from(this.pointers.values());
        const dx = pointerEvents[0].clientX - pointerEvents[1].clientX;
        const dy = pointerEvents[0].clientY - pointerEvents[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    getPinchCenter() {
        const pointerEvents = Array.from(this.pointers.values());
        return {
            x: (pointerEvents[0].clientX + pointerEvents[1].clientX) / 2,
            y: (pointerEvents[0].clientY + pointerEvents[1].clientY) / 2,
        };
    }
    isTextInputTarget(target) {
        const element = target;
        if (!element)
            return false;
        if (element.tagName === "TEXTAREA" || element.isContentEditable) {
            return true;
        }
        if (element.tagName === "INPUT") {
            const input = element;
            if (input.id === "attack-ratio" && input.type === "range") {
                return false;
            }
            return true;
        }
        return false;
    }
    destroy() {
        if (this.moveInterval !== null) {
            clearInterval(this.moveInterval);
        }
        this.activeKeys.clear();
    }
    isModifierKeyPressed(event) {
        return (((this.keybinds.modifierKey === "AltLeft" ||
            this.keybinds.modifierKey === "AltRight") &&
            event.altKey) ||
            ((this.keybinds.modifierKey === "ControlLeft" ||
                this.keybinds.modifierKey === "ControlRight") &&
                event.ctrlKey) ||
            ((this.keybinds.modifierKey === "ShiftLeft" ||
                this.keybinds.modifierKey === "ShiftRight") &&
                event.shiftKey) ||
            ((this.keybinds.modifierKey === "MetaLeft" ||
                this.keybinds.modifierKey === "MetaRight") &&
                event.metaKey));
    }
    isAltKeyHeld(event) {
        if (this.keybinds.altKey === "AltLeft" ||
            this.keybinds.altKey === "AltRight") {
            return event.altKey && !event.ctrlKey;
        }
        if (this.keybinds.altKey === "ControlLeft" ||
            this.keybinds.altKey === "ControlRight") {
            return event.ctrlKey;
        }
        if (this.keybinds.altKey === "ShiftLeft" ||
            this.keybinds.altKey === "ShiftRight") {
            return event.shiftKey;
        }
        if (this.keybinds.altKey === "MetaLeft" ||
            this.keybinds.altKey === "MetaRight") {
            return event.metaKey;
        }
        return false;
    }
    isAltKeyPressed(event) {
        return (((this.keybinds.altKey === "AltLeft" ||
            this.keybinds.altKey === "AltRight") &&
            event.altKey) ||
            ((this.keybinds.altKey === "ControlLeft" ||
                this.keybinds.altKey === "ControlRight") &&
                event.ctrlKey) ||
            ((this.keybinds.altKey === "ShiftLeft" ||
                this.keybinds.altKey === "ShiftRight") &&
                event.shiftKey) ||
            ((this.keybinds.altKey === "MetaLeft" ||
                this.keybinds.altKey === "MetaRight") &&
                event.metaKey));
    }
}
//# sourceMappingURL=InputHandler.js.map