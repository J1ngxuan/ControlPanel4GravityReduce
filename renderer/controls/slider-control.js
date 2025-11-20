/**
 * Slider Control Manager
 * Handles Z-axis slider control
 */

import stateManager from '../core/state-manager.js';
import eventBus, { Events } from '../core/event-bus.js';
import logger from '../core/logger.js';
import { COMMANDS } from './joystick-control.js';

class SliderControl {
    constructor() {
        this.slider = null;
        this.statusElement = null;
        this.isActive = false;
    }

    /**
     * Initialize slider control
     */
    init() {
        this.slider = document.getElementById('z-slider');
        this.statusElement = document.getElementById('slider-status');

        // Only initialize if slider exists (may not exist in settings window)
        if (!this.slider) {
            return;
        }

        this.attachEventListeners();

        // Disable initially (will be enabled on connection)
        this.slider.disabled = true;

        // Listen for language changes to update status text
        window.addEventListener('languageChanged', () => {
            const currentCmd = stateManager.get('currentCommand');
            if (currentCmd !== undefined) {
                this.updateStatus(currentCmd);
            }
        });

        // Listen for reset events from joystick
        eventBus.on('slider:reset', () => this.reset());
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        this.slider.addEventListener('input', (e) => this.handleInput(e));
        this.slider.addEventListener('change', (e) => this.handleChange(e));
    }

    /**
     * Handle slider input (while dragging)
     * @param {Event} e - Input event
     */
    handleInput(e) {
        if (!stateManager.get('isConnected')) return;

        // Prevent joystick from being active
        eventBus.emit('joystick:mouseup');

        const value = parseInt(e.target.value);
        let command = 0;

        if (value > 0) {
            command = COMMANDS.Z_PLUS;
            this.isActive = true;
            stateManager.set('isSliderActive', true);
        } else if (value < 0) {
            command = COMMANDS.Z_MINUS;
            this.isActive = true;
            stateManager.set('isSliderActive', true);
        } else {
            this.isActive = false;
            stateManager.set('isSliderActive', false);
        }

        const currentCommand = stateManager.get('currentCommand');

        // Clear acknowledgment if command changed
        if (currentCommand !== command) {
            stateManager.set('acknowledgedCommand', 0);
        }

        stateManager.set('currentCommand', command);
        this.updateStatus(command);

        if (command !== 0) {
            eventBus.emit(Events.SLIDER_ACTIVE, { command });
        }
    }

    /**
     * Handle slider change (when released)
     * @param {Event} e - Change event
     */
    handleChange(e) {
        // Reset slider to center when released
        setTimeout(() => {
            this.reset();
        }, 100);
    }

    /**
     * Update status display
     * @param {number} command - Command ID
     */
    updateStatus(command) {
        if (!this.statusElement) return;

        // Use translation system for status text
        const t = (key) => {
            return typeof window.t === 'function' ? window.t(key) : key;
        };

        let statusText = t('inactive');

        if (command === COMMANDS.Z_PLUS) {
            statusText = `Z+ ${t('active')}`;
        } else if (command === COMMANDS.Z_MINUS) {
            statusText = `Z- ${t('active')}`;
        }

        this.statusElement.textContent = statusText;
        const statusContainer = this.statusElement.parentElement;

        // Only show active state (green) if command is acknowledged
        const acknowledgedCommand = stateManager.get('acknowledgedCommand');
        const isAcknowledged = (command !== 0) && (command === acknowledgedCommand);

        if (isAcknowledged) {
            statusContainer?.classList.add('active');
            // Add acknowledged class to slider for styling
            if (this.slider) {
                this.slider.classList.add('slider-acknowledged');
            }
        } else {
            statusContainer?.classList.remove('active');
            // Remove acknowledged class from slider
            if (this.slider) {
                this.slider.classList.remove('slider-acknowledged');
            }
        }
    }

    /**
     * Reset slider to center position
     */
    reset() {
        if (!this.slider) return;

        this.isActive = false;
        stateManager.set('isSliderActive', false);
        this.slider.value = 0;
        stateManager.set('currentCommand', 0);
        stateManager.set('acknowledgedCommand', 0);

        this.updateStatus(0);

        eventBus.emit(Events.SLIDER_RELEASED);
    }

    /**
     * Handle connection status change
     * @param {boolean} connected - Connection status
     */
    handleConnectionStatus(connected) {
        if (!this.slider) return;

        this.slider.disabled = !connected;

        // Reset if disconnected and active
        if (!connected && this.isActive) {
            this.reset();
        }
    }

    /**
     * Handle command acknowledgment
     * @param {number} acknowledgedCmd - Acknowledged command ID
     */
    handleAcknowledgment(acknowledgedCmd) {
        if (this.isActive) {
            this.updateStatus(acknowledgedCmd);
        }
    }
}

// Export singleton instance
const sliderControl = new SliderControl();

// For debugging in browser console
if (typeof window !== 'undefined') {
    window.__sliderControl = sliderControl;
}

export default sliderControl;
