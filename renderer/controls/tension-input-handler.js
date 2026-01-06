/**
 * Tension Input Handler
 * Converts user-friendly Newton (N) input to int-6 value (×100)
 * e.g., 100 N input → int-6 = 10000
 */

import eventBus, { Events } from '../core/event-bus.js';
import logger from '../core/logger.js';

class TensionInputHandler {
    constructor() {
        this.tensionInputN = null;
        this.int6Hidden = null;
        this.CONVERSION_FACTOR = 100; // int-6 = N × 100
    }

    /**
     * Initialize the tension input handler
     */
    init() {
        this.tensionInputN = document.getElementById('tension-input-n');
        this.int6Hidden = document.getElementById('int-6');

        if (!this.tensionInputN || !this.int6Hidden) {
            return; // Not on a page with tension input
        }

        this.setupEventListeners();

        // Initial sync from localStorage/int-6 to N display
        this.loadAndDisplayN();

        logger.info('Tension input handler initialized');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // When user changes the N input, update hidden int-6
        this.tensionInputN.addEventListener('input', () => {
            this.syncNToInt6();
        });

        this.tensionInputN.addEventListener('change', () => {
            this.syncNToInt6();
            // Trigger settings save (int-6 will be picked up by settings-manager)
            eventBus.emit(Events.SETTINGS_SAVED);
        });

        // Listen for settings loaded to refresh N display from int-6
        eventBus.on(Events.SETTINGS_LOADED, () => {
            this.loadAndDisplayN();
        });
    }

    /**
     * Load int-6 from localStorage and display as N
     */
    loadAndDisplayN() {
        const savedInt6 = localStorage.getItem('int-6');
        if (savedInt6 !== null) {
            this.int6Hidden.value = savedInt6;
        }
        this.syncInt6ToN();
    }

    /**
     * Convert N input to int-6 value (×100)
     */
    syncNToInt6() {
        const nValue = parseFloat(this.tensionInputN.value) || 0;
        const int6Value = Math.round(nValue * this.CONVERSION_FACTOR);

        // Clamp to valid range (0-65535)
        const clampedValue = Math.max(0, Math.min(65535, int6Value));
        this.int6Hidden.value = clampedValue;

        // If clamped, update N input to reflect actual value
        if (int6Value !== clampedValue) {
            this.tensionInputN.value = (clampedValue / this.CONVERSION_FACTOR).toFixed(2);
        }
    }

    /**
     * Convert int-6 value to N for display
     */
    syncInt6ToN() {
        const int6Value = parseInt(this.int6Hidden.value) || 0;
        const nValue = int6Value / this.CONVERSION_FACTOR;
        // Display without trailing zeros if it's a whole number
        this.tensionInputN.value = nValue % 1 === 0 ? nValue : nValue.toFixed(2);
    }

    /**
     * Get current tension in Newtons
     * @returns {number} Tension in N
     */
    getTensionN() {
        return parseFloat(this.tensionInputN?.value) || 0;
    }

    /**
     * Set tension in Newtons
     * @param {number} nValue - Tension in N
     */
    setTensionN(nValue) {
        if (this.tensionInputN) {
            this.tensionInputN.value = nValue;
            this.syncNToInt6();
        }
    }
}

const tensionInputHandler = new TensionInputHandler();
export default tensionInputHandler;
