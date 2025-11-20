/**
 * Helper Utilities
 * Common utility functions used throughout the renderer
 */

import logger from '../core/logger.js';
import { COMMANDS } from '../controls/joystick-control.js';

/**
 * Log a message (wrapper for logger.log)
 * @param {string} message - The message to log
 * @param {string} type - Log type ('info', 'success', 'error', 'warn')
 */
export function addLog(message, type = 'info') {
    logger.log(message, type);
}

/**
 * Check if the current window is the main window
 * Main window has tab navigation, settings window does not
 * @returns {boolean} True if this is the main window
 */
export function isMainWindow() {
    return document.querySelector('.tab-navigation') !== null;
}

/**
 * Get human-readable command name from command ID
 * @param {number} command - The command ID
 * @returns {string} Human-readable command name
 */
export function getCommandName(command) {
    // Use the translation system if available
    if (typeof window !== 'undefined' && window.t) {
        const translatedName = window.t(`commands.${command}`);
        // If translation exists and is not the key itself, return it
        if (translatedName && translatedName !== `commands.${command}`) {
            return translatedName;
        }
    }

    // Fallback to English if translation not available
    const fallbackNames = {
        1: 'Start Experiment',
        2: 'Stop Experiment',
        3: 'Driver Power ON',
        4: 'Driver Power OFF',
        5: 'Servo Module ON',
        6: 'Servo Module OFF',
        [COMMANDS.X_PLUS]: 'X+ Move',
        [COMMANDS.X_MINUS]: 'X- Move',
        [COMMANDS.Y_PLUS]: 'Y+ Move',
        [COMMANDS.Y_MINUS]: 'Y- Move',
        [COMMANDS.Z_PLUS]: 'Z+ Move',
        [COMMANDS.Z_MINUS]: 'Z- Move',
        18: 'Stop Z-axis',
        19: 'STOP XYZ',
        20: 'XY Position Move',
        21: 'Precision Align',
        22: 'Tension Setting',
        23: 'Emergency Stop',
        30: 'Clear Faults',
        0: 'None'
    };
    return fallbackNames[command] || 'Unknown';
}

// Export all helpers as default object for convenience
export default {
    addLog,
    isMainWindow,
    getCommandName
};
