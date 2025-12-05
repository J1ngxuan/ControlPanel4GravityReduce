/**
 * Motion Capture Processor
 * Processes mocap position data, calculates velocity, applies offsets,
 * and prepares data for sending to PLC (int-10 to int-15)
 */

import stateManager from '../core/state-manager.js';
import eventBus, { Events } from '../core/event-bus.js';
import logger from '../core/logger.js';

class MocapProcessor {
    constructor() {
        // Last processed values
        this.lastPosition = { x: 0, y: 0, z: 0 };
        this.lastVelocity = { x: 0, y: 0, z: 0 };
        this.lastTimestamp = null;

        // Offset values (user-defined)
        this.offsets = { x: 0, y: 0, z: 0 };

        // Enable/disable flag
        this.enabled = false;
    }

    /**
     * Initialize the processor
     */
    init() {
        // Subscribe to mocap frame events
        eventBus.on(Events.MOCAP_FRAME_RECEIVED, (data) => {
            this.processFrame(data);
        });

        // Load saved offsets from localStorage
        this.loadOffsets();

        // Load enabled state
        const savedEnabled = localStorage.getItem('mocap-enabled');
        this.enabled = savedEnabled === 'true';
        stateManager.set('mocapEnabled', this.enabled);

        logger.info('MocapProcessor initialized');
    }

    /**
     * Process incoming mocap frame
     * @param {Object} data - Frame data with rigidBody info
     */
    processFrame(data) {
        if (!this.enabled || !data.rigidBody) {
            return;
        }

        const rigidBody = data.rigidBody;

        // Skip if tracking is not valid
        if (!rigidBody.trackingValid) {
            return;
        }

        const now = performance.now();
        const position = rigidBody.position; // { x, y, z } in mm

        // Calculate time delta in seconds
        let deltaTime = 0;
        if (this.lastTimestamp !== null) {
            deltaTime = (now - this.lastTimestamp) / 1000; // Convert to seconds
        }

        // Calculate velocity (mm/s) - signed values
        let velocity = { x: 0, y: 0, z: 0 };
        if (deltaTime > 0 && this.lastTimestamp !== null) {
            velocity.x = (position.x - this.lastPosition.x) / deltaTime;
            velocity.y = (position.y - this.lastPosition.y) / deltaTime;
            velocity.z = (position.z - this.lastPosition.z) / deltaTime;
        }

        // Store current values
        this.lastPosition = { ...position };
        this.lastVelocity = { ...velocity };
        this.lastTimestamp = now;

        // Apply offsets to position
        const offsetPosition = {
            x: position.x + this.offsets.x,
            y: position.y + this.offsets.y,
            z: position.z + this.offsets.z
        };

        // Store signed integer values for display (before unsigned conversion)
        const signedPosition = {
            x: Math.round(offsetPosition.x),
            y: Math.round(offsetPosition.y),
            z: Math.round(offsetPosition.z)
        };

        const signedVelocity = {
            x: Math.round(velocity.x),
            y: Math.round(velocity.y),
            z: Math.round(velocity.z)
        };

        // Convert to unsigned 16-bit for PLC transmission
        const unsignedPosition = {
            x: this.toUnsignedInt16(signedPosition.x),
            y: this.toUnsignedInt16(signedPosition.y),
            z: this.toUnsignedInt16(signedPosition.z)
        };

        const unsignedVelocity = {
            x: this.toUnsignedInt16(signedVelocity.x),
            y: this.toUnsignedInt16(signedVelocity.y),
            z: this.toUnsignedInt16(signedVelocity.z)
        };

        // Update state with processed values
        // Store signed values for display
        stateManager.set('mocapPosition', signedPosition);
        stateManager.set('mocapVelocity', signedVelocity);
        // Store unsigned values for sending
        stateManager.set('mocapPositionUnsigned', unsignedPosition);
        stateManager.set('mocapVelocityUnsigned', unsignedVelocity);
        // Store raw floating point values
        stateManager.set('mocapRawPosition', position);
        stateManager.set('mocapRawVelocity', velocity);

        // Emit processed data event
        eventBus.emit(Events.MOCAP_DATA_PROCESSED, {
            position: signedPosition,
            velocity: signedVelocity,
            positionUnsigned: unsignedPosition,
            velocityUnsigned: unsignedVelocity,
            rawPosition: position,
            rawVelocity: velocity,
            deltaTime: deltaTime,
            frameId: data.frameId
        });
    }

    /**
     * Convert a signed number to unsigned 16-bit integer for PLC transmission
     * Values are clamped to -32768 to 32767 range, then converted to 0-65535
     * @param {number} value - Input signed value
     * @returns {number} Unsigned 16-bit representation (0-65535)
     */
    toUnsignedInt16(value) {
        // Clamp to signed 16-bit range
        const clamped = Math.max(-32768, Math.min(32767, value));

        // Convert to unsigned 16-bit (for PLC transmission)
        // Negative values wrap: -1 becomes 65535, -32768 becomes 32768
        if (clamped < 0) {
            return 65536 + clamped;
        }
        return clamped;
    }

    /**
     * Get the values for int-10 to int-15 for data sender
     * Returns unsigned 16-bit values for PLC transmission
     * @returns {Object} Object with int10-int15 values
     */
    getIntegerValues() {
        if (!this.enabled) {
            return {
                int10: 0, int11: 0, int12: 0,
                int13: 0, int14: 0, int15: 0
            };
        }

        // Use unsigned values for sending to PLC
        const position = stateManager.get('mocapPositionUnsigned') || { x: 0, y: 0, z: 0 };
        const velocity = stateManager.get('mocapVelocityUnsigned') || { x: 0, y: 0, z: 0 };

        return {
            int10: position.x,  // Position X (unsigned)
            int11: position.y,  // Position Y (unsigned)
            int12: position.z,  // Position Z (unsigned)
            int13: velocity.x,  // Velocity X (unsigned)
            int14: velocity.y,  // Velocity Y (unsigned)
            int15: velocity.z   // Velocity Z (unsigned)
        };
    }

    /**
     * Set X offset
     * @param {number} value - Offset value in mm
     */
    setOffsetX(value) {
        this.offsets.x = parseFloat(value) || 0;
        this.saveOffsets();
        stateManager.set('mocapOffsets', { ...this.offsets });
    }

    /**
     * Set Y offset
     * @param {number} value - Offset value in mm
     */
    setOffsetY(value) {
        this.offsets.y = parseFloat(value) || 0;
        this.saveOffsets();
        stateManager.set('mocapOffsets', { ...this.offsets });
    }

    /**
     * Set Z offset
     * @param {number} value - Offset value in mm
     */
    setOffsetZ(value) {
        this.offsets.z = parseFloat(value) || 0;
        this.saveOffsets();
        stateManager.set('mocapOffsets', { ...this.offsets });
    }

    /**
     * Set all offsets at once
     * @param {Object} offsets - { x, y, z } offset values
     */
    setOffsets(offsets) {
        this.offsets = {
            x: parseFloat(offsets.x) || 0,
            y: parseFloat(offsets.y) || 0,
            z: parseFloat(offsets.z) || 0
        };
        this.saveOffsets();
        stateManager.set('mocapOffsets', { ...this.offsets });
    }

    /**
     * Get current offsets
     * @returns {Object} Current offsets { x, y, z }
     */
    getOffsets() {
        return { ...this.offsets };
    }

    /**
     * Save offsets to localStorage
     */
    saveOffsets() {
        localStorage.setItem('mocap-offset-x', this.offsets.x.toString());
        localStorage.setItem('mocap-offset-y', this.offsets.y.toString());
        localStorage.setItem('mocap-offset-z', this.offsets.z.toString());
    }

    /**
     * Load offsets from localStorage
     */
    loadOffsets() {
        const x = parseFloat(localStorage.getItem('mocap-offset-x')) || 0;
        const y = parseFloat(localStorage.getItem('mocap-offset-y')) || 0;
        const z = parseFloat(localStorage.getItem('mocap-offset-z')) || 0;

        this.offsets = { x, y, z };
        stateManager.set('mocapOffsets', { ...this.offsets });
    }

    /**
     * Enable mocap data sending
     */
    enable() {
        this.enabled = true;
        localStorage.setItem('mocap-enabled', 'true');
        stateManager.set('mocapEnabled', true);
        logger.info('Mocap data sending enabled');
    }

    /**
     * Disable mocap data sending
     */
    disable() {
        this.enabled = false;
        localStorage.setItem('mocap-enabled', 'false');
        stateManager.set('mocapEnabled', false);

        // Reset state
        this.lastTimestamp = null;
        this.lastVelocity = { x: 0, y: 0, z: 0 };

        logger.info('Mocap data sending disabled');
    }

    /**
     * Check if mocap processing is enabled
     * @returns {boolean} True if enabled
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Reset processor state
     */
    reset() {
        this.lastPosition = { x: 0, y: 0, z: 0 };
        this.lastVelocity = { x: 0, y: 0, z: 0 };
        this.lastTimestamp = null;

        stateManager.set('mocapPosition', { x: 0, y: 0, z: 0 });
        stateManager.set('mocapVelocity', { x: 0, y: 0, z: 0 });
        stateManager.set('mocapPositionUnsigned', { x: 0, y: 0, z: 0 });
        stateManager.set('mocapVelocityUnsigned', { x: 0, y: 0, z: 0 });
        stateManager.set('mocapRawPosition', { x: 0, y: 0, z: 0 });
        stateManager.set('mocapRawVelocity', { x: 0, y: 0, z: 0 });
    }
}

// Export singleton instance
const mocapProcessor = new MocapProcessor();

// For debugging in browser console
if (typeof window !== 'undefined') {
    window.__mocapProcessor = mocapProcessor;
}

export default mocapProcessor;
