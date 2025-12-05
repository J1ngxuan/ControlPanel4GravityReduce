/**
 * Data Sender
 * Handles sending integer data to PLC via TCP or UDP
 */

import stateManager from '../core/state-manager.js';
import eventBus, { Events } from '../core/event-bus.js';
import logger from '../core/logger.js';

class DataSender {
    constructor() {
        this.electronAPI = null;
        this.autoSendInterval = null;
        this.mocapProcessor = null;
    }

    /**
     * Initialize the data sender
     * @param {Object} electronAPI - The Electron API from preload
     */
    init(electronAPI) {
        this.electronAPI = electronAPI;
    }

    /**
     * Set the mocap processor reference for getting mocap values
     * @param {Object} processor - The mocap processor instance
     */
    setMocapProcessor(processor) {
        this.mocapProcessor = processor;
    }

    /**
     * Collect and send integer data to PLC
     * @returns {Promise<Object>} Send result
     */
    async sendIntegerData() {
        if (!stateManager.get('isConnected')) {
            return { success: false, message: 'Not connected' };
        }

        // Collect 16 integer values
        const integers = this.collectIntegerValues();

        try {
            let result;
            const protocol = stateManager.get('currentProtocol');

            if (protocol === 'tcp') {
                result = await this.sendViaTCP(integers);
            } else {
                result = await this.sendViaUDP(integers);
            }

            // Only log errors if not in auto-send mode (to avoid spam)
            if (!result.success && !this.autoSendInterval) {
                logger.error(`Send failed: ${result.message}`);
            }

            // Emit data send event
            if (result.success) {
                eventBus.emit(Events.DATA_SEND, { integers });
            } else {
                eventBus.emit(Events.DATA_SEND_ERROR, { error: result.message });
            }

            return result;
        } catch (error) {
            if (!this.autoSendInterval) {
                logger.error(`Send error: ${error.message}`);
            }
            return { success: false, message: error.message };
        }
    }

    /**
     * Collect 16 integer values from inputs or state
     * @returns {number[]} Array of 16 integers
     */
    collectIntegerValues() {
        const integers = [];
        const currentCommand = stateManager.get('currentCommand');
        const debugModeEnabled = stateManager.get('debugModeEnabled');
        const lastReceivedDebugInt = stateManager.get('lastReceivedDebugInt');

        // Get mocap values if processor is available and enabled
        let mocapValues = null;
        if (this.mocapProcessor && this.mocapProcessor.isEnabled()) {
            mocapValues = this.mocapProcessor.getIntegerValues();
        }

        for (let i = 0; i < 16; i++) {
            let value;

            if (i === 9) {
                // Int-9 is the Control Command - use currentCommand value
                value = currentCommand;
                const input = document.getElementById(`int-${i}`);
                if (input) {
                    input.value = currentCommand; // Update display if element exists
                }
            } else if (i === 6 && debugModeEnabled && lastReceivedDebugInt !== null) {
                // Int-6 in debug mode - use the last received debug int (RX[9])
                value = lastReceivedDebugInt;
                const input = document.getElementById(`int-${i}`);
                if (input) {
                    input.value = lastReceivedDebugInt; // Update display if element exists
                }
            } else if (i >= 10 && i <= 15 && mocapValues) {
                // Int-10 to Int-15 are mocap values when enabled
                // int-10: Position X, int-11: Position Y, int-12: Position Z
                // int-13: Velocity X, int-14: Velocity Y, int-15: Velocity Z
                value = mocapValues[`int${i}`];
            } else {
                const input = document.getElementById(`int-${i}`);
                if (input) {
                    // Read from input if it exists (settings window)
                    value = parseInt(input.value) || 0;
                } else {
                    // Read from localStorage if input doesn't exist (main window)
                    value = parseInt(localStorage.getItem(`int-${i}`)) || 0;
                }
            }

            // Ensure value is within 16-bit unsigned range (0-65535)
            const clampedValue = Math.max(0, Math.min(65535, value));
            integers.push(clampedValue);

            // Store the sent debug int value (before we receive the next packet)
            if (i === 6 && debugModeEnabled) {
                stateManager.set('lastSentDebugInt', clampedValue);
            }

            // Update input if value was clamped (except for command int)
            if (value !== clampedValue && i !== 9) {
                const input = document.getElementById(`int-${i}`);
                if (input) {
                    input.value = clampedValue;
                }
            }
        }

        return integers;
    }

    /**
     * Send data via TCP
     * @param {number[]} integers - Array of 16 integers
     * @returns {Promise<Object>} Send result
     */
    async sendViaTCP(integers) {
        return await this.electronAPI.tcpSend(integers);
    }

    /**
     * Send data via UDP
     * @param {number[]} integers - Array of 16 integers
     * @returns {Promise<Object>} Send result
     */
    async sendViaUDP(integers) {
        // Get UDP target settings using localStorage fallback pattern
        const targetHost = this.getUDPTargetHost();
        const targetPort = this.getUDPTargetPort();

        return await this.electronAPI.udpSend(integers, targetHost, targetPort);
    }

    /**
     * Get UDP target host from input or localStorage
     * @returns {string} Target host
     */
    getUDPTargetHost() {
        const udpTargetHostInput = document.getElementById('udp-target-host');
        return udpTargetHostInput
            ? udpTargetHostInput.value.trim()
            : (localStorage.getItem('udp-target-host') || 'localhost');
    }

    /**
     * Get UDP target port from input or localStorage
     * @returns {number} Target port
     */
    getUDPTargetPort() {
        const udpTargetPortInput = document.getElementById('udp-target-port');
        return udpTargetPortInput
            ? parseInt(udpTargetPortInput.value)
            : (parseInt(localStorage.getItem('udp-target-port')) || 8080);
    }

    /**
     * Start auto-send interval
     * @param {Function} callback - Optional callback to run after each send
     */
    startAutoSend(callback) {
        if (this.autoSendInterval) {
            return; // Already running
        }

        const sendLatencyMs = stateManager.get('sendLatencyMs');

        this.autoSendInterval = setInterval(async () => {
            await this.sendIntegerData();
            if (callback) callback();
        }, sendLatencyMs);

        stateManager.set('autoSendInterval', this.autoSendInterval);

        const frequency = (1000 / sendLatencyMs).toFixed(1);
        logger.success(`Auto-send started at ${sendLatencyMs}ms interval (~${frequency}Hz)`);

        eventBus.emit(Events.AUTO_SEND_STARTED, { interval: sendLatencyMs, frequency });
    }

    /**
     * Stop auto-send interval
     */
    stopAutoSend() {
        if (this.autoSendInterval) {
            clearInterval(this.autoSendInterval);
            this.autoSendInterval = null;
            stateManager.set('autoSendInterval', null);

            logger.info('Auto-send stopped');
            eventBus.emit(Events.AUTO_SEND_STOPPED);
        }
    }

    /**
     * Check if auto-send is running
     * @returns {boolean} True if auto-send is active
     */
    isAutoSendActive() {
        return this.autoSendInterval !== null;
    }

    /**
     * Update auto-send interval
     * @param {number} newLatencyMs - New interval in milliseconds
     * @param {Function} callback - Optional callback to run after each send
     */
    updateAutoSendInterval(newLatencyMs, callback) {
        const wasRunning = this.isAutoSendActive();

        if (wasRunning) {
            this.stopAutoSend();
        }

        stateManager.set('sendLatencyMs', newLatencyMs);

        if (wasRunning && stateManager.get('isConnected')) {
            this.startAutoSend(callback);
        }

        const frequency = (1000 / newLatencyMs).toFixed(1);
        logger.info(`Send latency changed to ${newLatencyMs}ms (~${frequency}Hz)`);

        eventBus.emit(Events.AUTO_SEND_INTERVAL_CHANGED, { interval: newLatencyMs, frequency });
    }
}

// Export singleton instance
const dataSender = new DataSender();

// For debugging in browser console
if (typeof window !== 'undefined') {
    window.__dataSender = dataSender;
}

export default dataSender;
