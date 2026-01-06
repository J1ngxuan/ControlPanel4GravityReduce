/**
 * State Manager
 * Centralized state management with reactive updates
 * Replaces scattered module-level variables with a single source of truth
 */

class StateManager {
    constructor() {
        // Initialize all application state
        this.state = {
            // Connection state
            isConnected: false,
            currentProtocol: 'tcp', // 'tcp' or 'udp'

            // Auto-send state
            autoSendEnabled: false, // Whether auto-send is enabled
            autoSendInterval: null,
            sendLatencyMs: 20, // Default 20ms interval

            // Command state
            currentCommand: 0,
            waitingForAcknowledgment: false,
            acknowledgedCommand: 0,

            // Debug mode state
            debugModeEnabled: false,
            lastReceivedDebugInt: null,
            lastSentDebugInt: null,

            // Joystick control state
            joystickCanvas: null,
            joystickCtx: null,
            joystickStatus: null,
            isJoystickActive: false,
            joystickPosition: { x: 0, y: 0 }, // Normalized: -1 to 1

            // Slider control state
            zSlider: null,
            sliderStatus: null,
            isSliderActive: false,

            // Motion Capture state
            mocapReceiving: false,
            mocapEnabled: false,
            mocapFps: 0,
            mocapFramesReceived: 0,
            mocapSelectedRigidBody: null,
            mocapRigidBodies: [],
            mocapOffsets: { x: 0, y: 0, z: 0 },
            mocapPosition: { x: 0, y: 0, z: 0 },           // Signed values for display
            mocapVelocity: { x: 0, y: 0, z: 0 },           // Signed values for display
            mocapPositionUnsigned: { x: 0, y: 0, z: 0 },   // Unsigned values for PLC
            mocapVelocityUnsigned: { x: 0, y: 0, z: 0 },   // Unsigned values for PLC
            mocapRawPosition: { x: 0, y: 0, z: 0 },
            mocapRawVelocity: { x: 0, y: 0, z: 0 }
        };

        // Event listeners for state changes
        // Map<key, Set<callback>>
        this.listeners = new Map();

        // Wildcard listeners that listen to all state changes
        this.wildcardListeners = new Set();
    }

    /**
     * Get a state value
     * @param {string} key - The state key
     * @returns {*} The state value
     */
    get(key) {
        if (!(key in this.state)) {
            console.warn(`StateManager: Unknown state key "${key}"`);
            return undefined;
        }
        return this.state[key];
    }

    /**
     * Set a state value and notify listeners
     * @param {string} key - The state key
     * @param {*} value - The new value
     * @param {boolean} silent - If true, don't notify listeners
     */
    set(key, value, silent = false) {
        if (!(key in this.state)) {
            console.warn(`StateManager: Unknown state key "${key}"`);
            return;
        }

        const oldValue = this.state[key];
        this.state[key] = value;

        // Don't notify if value hasn't changed or silent mode
        if (!silent && oldValue !== value) {
            this.notify(key, value, oldValue);
        }
    }

    /**
     * Update multiple state values at once
     * @param {Object} updates - Object with key-value pairs to update
     * @param {boolean} silent - If true, don't notify listeners
     */
    update(updates, silent = false) {
        const changes = [];

        for (const [key, value] of Object.entries(updates)) {
            if (!(key in this.state)) {
                console.warn(`StateManager: Unknown state key "${key}"`);
                continue;
            }

            const oldValue = this.state[key];
            if (oldValue !== value) {
                this.state[key] = value;
                changes.push({ key, value, oldValue });
            }
        }

        // Notify all changes
        if (!silent) {
            changes.forEach(({ key, value, oldValue }) => {
                this.notify(key, value, oldValue);
            });
        }
    }

    /**
     * Get the entire state object (read-only)
     * @returns {Object} A copy of the state
     */
    getAll() {
        return { ...this.state };
    }

    /**
     * Subscribe to state changes for a specific key
     * @param {string} key - The state key to watch
     * @param {Function} callback - Function called when state changes: (value, oldValue) => {}
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }

        this.listeners.get(key).add(callback);

        // Return unsubscribe function
        return () => {
            const keyListeners = this.listeners.get(key);
            if (keyListeners) {
                keyListeners.delete(callback);
            }
        };
    }

    /**
     * Subscribe to all state changes
     * @param {Function} callback - Function called on any state change: (key, value, oldValue) => {}
     * @returns {Function} Unsubscribe function
     */
    subscribeAll(callback) {
        this.wildcardListeners.add(callback);

        // Return unsubscribe function
        return () => {
            this.wildcardListeners.delete(callback);
        };
    }

    /**
     * Notify listeners of a state change
     * @param {string} key - The state key that changed
     * @param {*} value - The new value
     * @param {*} oldValue - The previous value
     */
    notify(key, value, oldValue) {
        // Notify key-specific listeners
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            keyListeners.forEach(callback => {
                try {
                    callback(value, oldValue);
                } catch (error) {
                    console.error(`StateManager: Error in listener for "${key}":`, error);
                }
            });
        }

        // Notify wildcard listeners
        this.wildcardListeners.forEach(callback => {
            try {
                callback(key, value, oldValue);
            } catch (error) {
                console.error(`StateManager: Error in wildcard listener:`, error);
            }
        });
    }

    /**
     * Reset state to initial values
     */
    reset() {
        this.update({
            isConnected: false,
            currentProtocol: 'tcp',
            autoSendEnabled: false,
            autoSendInterval: null,
            sendLatencyMs: 20,
            currentCommand: 0,
            waitingForAcknowledgment: false,
            acknowledgedCommand: 0,
            debugModeEnabled: false,
            lastReceivedDebugInt: null,
            lastSentDebugInt: null,
            isJoystickActive: false,
            joystickPosition: { x: 0, y: 0 },
            isSliderActive: false,
            // Mocap state reset
            mocapReceiving: false,
            mocapFps: 0,
            mocapFramesReceived: 0,
            mocapPosition: { x: 0, y: 0, z: 0 },
            mocapVelocity: { x: 0, y: 0, z: 0 },
            mocapPositionUnsigned: { x: 0, y: 0, z: 0 },
            mocapVelocityUnsigned: { x: 0, y: 0, z: 0 },
            mocapRawPosition: { x: 0, y: 0, z: 0 },
            mocapRawVelocity: { x: 0, y: 0, z: 0 }
        });
    }

    /**
     * Helper: Check if connected
     */
    isConnected() {
        return this.state.isConnected;
    }

    /**
     * Helper: Get current protocol
     */
    getProtocol() {
        return this.state.currentProtocol;
    }

    /**
     * Helper: Set connection status
     */
    setConnected(connected) {
        this.set('isConnected', connected);
    }

    /**
     * Helper: Set current command
     */
    setCommand(command) {
        this.set('currentCommand', command);
    }

    /**
     * Helper: Get current command
     */
    getCommand() {
        return this.state.currentCommand;
    }
}

// Export singleton instance
const stateManager = new StateManager();

// For debugging in browser console
if (typeof window !== 'undefined') {
    window.__stateManager = stateManager;
}

export default stateManager;
