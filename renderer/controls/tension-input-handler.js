/**
 * Tension Input Handler
 * Converts user-friendly Newton (N) input to int-6 value (×100)
 * e.g., 100 N input → int-6 = 10000
 * Also displays tension reading (int[8]) converted to N
 */

import eventBus, { Events } from '../core/event-bus.js';
import logger from '../core/logger.js';

class TensionInputHandler {
    constructor() {
        this.tensionInputN = null;
        this.int6Hidden = null;
        this.tensionReadingDisplay = null;
        this.CONVERSION_FACTOR = 100; // int value = N × 100
        this.TENSION_READING_INDEX = 8; // int[8] is tension reading
    }

    /**
     * Initialize the tension input handler
     */
    init() {
        this.tensionInputN = document.getElementById('tension-input-n');
        this.int6Hidden = document.getElementById('int-6');
        this.tensionReadingDisplay = document.getElementById('tension-reading-n');

        // Check if we have at least the target input (main window)
        if (!this.tensionInputN || !this.int6Hidden) {
            // Check if we only have the reading display (could be on a different page)
            if (this.tensionReadingDisplay) {
                this.setupDataListener();
                logger.info('Tension reading display initialized');
            }
            return;
        }

        this.setupEventListeners();
        this.setupDataListener();

        // Initial sync from localStorage/int-6 to N display
        this.loadAndDisplayN();

        logger.info('Tension input handler initialized');
    }

    /**
     * Set up event listeners for target input
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
     * Set up listener for received data to update tension reading
     */
    setupDataListener() {
        eventBus.on(Events.DATA_RECEIVED, (eventData) => {
            // Event passes { data: { bools, ints } }
            const data = eventData?.data;
            if (data && data.ints && data.ints.length > this.TENSION_READING_INDEX) {
                this.updateTensionReading(data.ints[this.TENSION_READING_INDEX]);
            }
        });
    }

    /**
     * Update the tension reading display
     * @param {number} rawValue - Raw int value from PLC (×100)
     */
    updateTensionReading(rawValue) {
        if (!this.tensionReadingDisplay) return;

        const nValue = rawValue / this.CONVERSION_FACTOR;
        // Display with 2 decimal places, or whole number if no decimals
        this.tensionReadingDisplay.textContent = nValue % 1 === 0 ? nValue : nValue.toFixed(2);
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
