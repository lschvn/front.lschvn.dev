var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html, LitElement } from "lit";
import { property, query, state } from "lit/decorators.js";
/**
 * Base class for modal components that provides unified Escape key handling and common modal patterns.
 *
 * Features:
 * - Visibility tracking with isModalOpen state
 * - Escape key handler with visibility check and target validation
 * - Automatic listener lifecycle management
 * - Common inline/modal element handling
 * - Shared open/close logic with hooks for custom behavior
 * - Standardized loading spinner UI
 * - Consistent modal container styling
 */
export class BaseModal extends LitElement {
    constructor() {
        super(...arguments);
        this.isModalOpen = false;
        this.inline = false;
        /**
         * Standard modal container class string.
         * Provides consistent dark glassmorphic styling across all modals.
         * No rounding on mobile for full-screen appearance.
         */
        this.modalContainerClass = "h-full flex flex-col overflow-hidden bg-black/70 backdrop-blur-xl lg:rounded-2xl lg:border border-white/10";
        /**
         * Handle Escape key press to close the modal.
         * Only closes if the modal is open.
         */
        this.handleKeyDown = (e) => {
            if (e.key === "Escape" && this.isModalOpen) {
                e.preventDefault();
                if (!this.confirmBeforeClose()) {
                    return;
                }
                this.close();
            }
        };
    }
    createRenderRoot() {
        return this;
    }
    firstUpdated() {
        if (this.modalEl) {
            this.modalEl.onClose = () => {
                if (this.isModalOpen) {
                    if (!this.confirmBeforeClose()) {
                        // Re-open the underlying o-modal since it already closed itself
                        this.modalEl?.open();
                        return;
                    }
                    this.close();
                }
            };
        }
    }
    disconnectedCallback() {
        this.unregisterEscapeHandler();
        super.disconnectedCallback();
    }
    /**
     * Register the Escape key handler and mark modal as open.
     */
    registerEscapeHandler() {
        this.isModalOpen = true;
        window.addEventListener("keydown", this.handleKeyDown);
    }
    /**
     * Unregister the Escape key handler and mark modal as closed.
     */
    unregisterEscapeHandler() {
        this.isModalOpen = false;
        window.removeEventListener("keydown", this.handleKeyDown);
    }
    /**
     * Hook for custom logic when modal opens.
     * Override this in subclasses to add custom open behavior.
     */
    onOpen() {
        // Default implementation does nothing
    }
    /**
     * Hook for custom logic when modal closes.
     * Override this in subclasses to add custom close behavior.
     */
    onClose() {
        // Default implementation does nothing
    }
    /**
     * Guard called before closing via Escape key or click-outside.
     * Override in subclasses to show a confirmation dialog.
     * Return false to prevent the modal from closing.
     */
    confirmBeforeClose() {
        return true;
    }
    /**
     * Open the modal. Handles both inline and modal element modes.
     * Subclasses can override onOpen() for custom behavior.
     */
    open() {
        this.registerEscapeHandler();
        this.onOpen();
        if (this.inline) {
            const needsShow = this.classList.contains("hidden") || this.style.display === "none";
            if (needsShow && window.showPage) {
                const pageId = this.id || this.tagName.toLowerCase();
                window.showPage?.(pageId);
            }
            this.style.pointerEvents = "auto";
        }
        else {
            this.modalEl?.open();
        }
    }
    /**
     * Close the modal. Handles both inline and modal element modes.
     * Subclasses can override onClose() for custom behavior.
     */
    close() {
        this.unregisterEscapeHandler();
        this.onClose();
        if (this.inline) {
            this.style.pointerEvents = "none";
            if (window.showPage) {
                window.showPage?.("page-play");
            }
        }
        else {
            this.modalEl?.close();
        }
    }
    /**
     * Renders a standardized loading spinner with optional custom message.
     * Use this for consistent loading states across all modals.
     *
     * @param message - Optional loading message text. Defaults to no message.
     * @param spinnerColor - Optional spinner color. Defaults to 'blue'.
     * @returns TemplateResult of the loading UI
     */
    renderLoadingSpinner(message, spinnerColor = "blue") {
        const colorClasses = {
            blue: "border-blue-500/30 border-t-blue-500",
            green: "border-green-500/30 border-t-green-500",
            yellow: "border-yellow-500/30 border-t-yellow-500",
            white: "border-white/20 border-t-white",
        };
        return html `
      <div
        class="flex flex-col items-center justify-center p-12 text-white h-full min-h-[400px]"
      >
        <div
          class="w-12 h-12 border-4 ${colorClasses[spinnerColor]} rounded-full animate-spin mb-4"
        ></div>
        ${message
            ? html `<p
              class="text-white/60 font-medium tracking-wide animate-pulse"
            >
              ${message}
            </p>`
            : ""}
      </div>
    `;
    }
}
__decorate([
    state()
], BaseModal.prototype, "isModalOpen", void 0);
__decorate([
    property({ type: Boolean })
], BaseModal.prototype, "inline", void 0);
__decorate([
    query("o-modal")
], BaseModal.prototype, "modalEl", void 0);
//# sourceMappingURL=BaseModal.js.map