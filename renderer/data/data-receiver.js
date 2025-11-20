/**
 * Data Receiver
 * Handles receiving and processing data from PLC
 */

import stateManager from '../core/state-manager.js';
import eventBus, { Events } from '../core/event-bus.js';
import logger from '../core/logger.js';
import { COMMANDS } from '../controls/joystick-control.js';

// Boolean labels for display
const BOOL_LABELS = [
    'X Pos Complete', 'Y Pos Complete', 'Z Pos Complete',
    'X Calibrated', 'Y Calibrated', 'Z Status',
    'X Servo Active', 'Y Servo Active', 'Z Servo Active',
    'X+ Hard Limit', 'X- Hard Limit', 'Y+ Hard Limit', 'Y- Hard Limit',
    'X+ Soft Limit', 'X- Soft Limit', 'Y Soft Status', 'Z Soft Status',
    'Force Exp Active', 'Precision Align', 'Abs Pos Move', 'Emergency Stop',
    'Status 21', 'Status 22', 'Status 23', 'Status 24',
    'Status 25', 'Status 26', 'Status 27', 'Status 28',
    'Status 29', 'Status 30', 'Status 31', 'Status 32',
    'Status 33', 'Status 34', 'Status 35', 'Status 36',
    'Status 37', 'Status 38', 'Status 39', 'Status 40'
];

class DataReceiver {
    constructor() {
        this.electronAPI = null;
        this.acknowledgmentHandler = null;
    }

    /**
     * Initialize the data receiver
     * @param {Object} electronAPI - The Electron API from preload
     * @param {Function} acknowledgmentHandler - Callback for command acknowledgment
     */
    init(electronAPI, acknowledgmentHandler) {
        this.electronAPI = electronAPI;
        this.acknowledgmentHandler = acknowledgmentHandler;

        // Listen for received data
        this.electronAPI.onDataReceived((data) => this.handleReceivedData(data));
    }

    /**
     * Handle received data from PLC
     * @param {Object} data - Received data object with bools and ints
     */
    handleReceivedData(data) {
        // Emit data received event
        eventBus.emit(Events.DATA_RECEIVED, { data });

        // Update boolean display
        this.updateBooleanDisplay(data.bools);

        // Update integer display
        this.updateIntegerDisplay(data.ints);

        // Handle command acknowledgment
        this.handleCommandAcknowledgment(data.ints);

        // Handle debug mode
        this.handleDebugMode(data.ints);
    }

    /**
     * Get boolean label (with translation support)
     * @param {number} index - Boolean index (0-39)
     * @returns {string} Translated label
     */
    getBoolLabel(index) {
        // Try to get current language from window
        const currentLang = typeof window.getCurrentLanguage === 'function'
            ? window.getCurrentLanguage()
            : 'en';

        // Try to get translated labels
        if (window.LOCALES && window.LOCALES[currentLang] && window.LOCALES[currentLang].boolLabels) {
            return window.LOCALES[currentLang].boolLabels[index] || BOOL_LABELS[index];
        }

        // Fallback to English
        return BOOL_LABELS[index];
    }

    /**
     * Update boolean display
     * @param {boolean[]} bools - Array of 40 booleans
     */
    updateBooleanDisplay(bools) {
        if (!bools || bools.length !== 40) return;

        bools.forEach((value, index) => {
            const boolItem = document.getElementById(`bool-${index}`);
            if (!boolItem) return;

            const label = this.getBoolLabel(index);

            if (value) {
                boolItem.className = 'bool-item bool-true';
                boolItem.innerHTML = `
                    <div class="bool-label">${label}</div>
                    <div class="bool-value">TRUE</div>
                `;
            } else {
                boolItem.className = 'bool-item bool-false';
                boolItem.innerHTML = `
                    <div class="bool-label">${label}</div>
                    <div class="bool-value">FALSE</div>
                `;
            }
        });

        // Log active indicators
        const trueCount = bools.filter(b => b).length;
        if (trueCount > 0) {
            logger.info(`Status update: ${trueCount} indicators active`);
        }

        // Emit boolean update event
        eventBus.emit(Events.BOOLEANS_UPDATED, { bools, trueCount });
    }

    /**
     * Update integer display
     * @param {number[]} ints - Array of 10 integers
     */
    updateIntegerDisplay(ints) {
        if (!ints || ints.length !== 10) return;

        ints.forEach((value, index) => {
            const intItem = document.getElementById(`int-display-${index}`);
            if (!intItem) return;

            const valueElement = intItem.querySelector('.int-item-value');
            if (valueElement) {
                valueElement.textContent = value;
            }
        });

        // Emit integer update event
        eventBus.emit(Events.INTEGERS_UPDATED, { ints });
    }

    /**
     * Handle PLC command acknowledgment
     * @param {number[]} ints - Array of 10 integers
     */
    handleCommandAcknowledgment(ints) {
        if (!ints || ints.length !== 10) return;

        // Handle PLC command acknowledgment (10th int, index 9)
        const plcAcknowledgedCommand = ints[9];
        const currentCmd = stateManager.get('currentCommand');

        if (plcAcknowledgedCommand !== 0 && plcAcknowledgedCommand === currentCmd) {
            // Store acknowledged command
            stateManager.set('acknowledgedCommand', plcAcknowledgedCommand);

            // Call acknowledgment handler if provided
            if (this.acknowledgmentHandler) {
                this.acknowledgmentHandler(plcAcknowledgedCommand);
            }

            // Emit acknowledgment event
            eventBus.emit(Events.COMMAND_ACKNOWLEDGED, { command: plcAcknowledgedCommand });
        }
    }

    /**
     * Handle debug mode updates
     * @param {number[]} ints - Array of 10 integers
     */
    handleDebugMode(ints) {
        if (!ints || ints.length !== 10) return;

        const debugModeEnabled = stateManager.get('debugModeEnabled');
        if (!debugModeEnabled) return;

        // Debug mode: capture the 10th received int
        const receivedDebugInt = ints[9];
        stateManager.set('lastReceivedDebugInt', receivedDebugInt);

        // Update debug display values
        const debugRxValue = document.getElementById('debug-rx-value');
        const debugTxValue = document.getElementById('debug-tx-value');

        if (debugRxValue) {
            debugRxValue.textContent = receivedDebugInt;
        }

        const lastSentDebugInt = stateManager.get('lastSentDebugInt');
        if (debugTxValue && lastSentDebugInt !== null) {
            debugTxValue.textContent = lastSentDebugInt;
        }

        // Emit debug update event
        eventBus.emit(Events.DEBUG_DATA_UPDATED, {
            rx: receivedDebugInt,
            tx: lastSentDebugInt
        });
    }

    /**
     * Get command name from command ID
     * @param {number} commandId - The command ID
     * @returns {string} Command name
     */
    getCommandName(commandId) {
        const commandNames = {
            [COMMANDS.X_PLUS]: 'X+',
            [COMMANDS.X_MINUS]: 'X-',
            [COMMANDS.Y_PLUS]: 'Y+',
            [COMMANDS.Y_MINUS]: 'Y-',
            [COMMANDS.Z_PLUS]: 'Z+',
            [COMMANDS.Z_MINUS]: 'Z-',
            1: 'Initialize',
            2: 'Start',
            3: 'Driver Power ON',
            4: 'Driver Power OFF',
            5: 'Servo Module ON',
            6: 'Servo Module OFF'
        };

        return commandNames[commandId] || `Command ${commandId}`;
    }
}

// Export singleton instance
const dataReceiver = new DataReceiver();

// For debugging in browser console
if (typeof window !== 'undefined') {
    window.__dataReceiver = dataReceiver;
}

export default dataReceiver;
