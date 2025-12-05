/**
 * Event Bus
 * Decoupled pub/sub event system for component communication
 * Allows components to communicate without direct dependencies
 */

class EventBus {
    constructor() {
        // Map<eventName, Set<callback>>
        this.events = new Map();

        // For debugging
        this.debugMode = false;
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - The event name
     * @param {Function} callback - Function called when event is emitted
     * @returns {Function} Unsubscribe function
     */
    on(eventName, callback) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, new Set());
        }

        this.events.get(eventName).add(callback);

        if (this.debugMode) {
            console.log(`EventBus: Subscribed to "${eventName}"`);
        }

        // Return unsubscribe function
        return () => {
            this.off(eventName, callback);
        };
    }

    /**
     * Subscribe to an event that will only fire once
     * @param {string} eventName - The event name
     * @param {Function} callback - Function called when event is emitted
     * @returns {Function} Unsubscribe function
     */
    once(eventName, callback) {
        const wrappedCallback = (...args) => {
            this.off(eventName, wrappedCallback);
            callback(...args);
        };

        return this.on(eventName, wrappedCallback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} eventName - The event name
     * @param {Function} callback - The callback to remove
     */
    off(eventName, callback) {
        const callbacks = this.events.get(eventName);
        if (callbacks) {
            callbacks.delete(callback);

            if (this.debugMode) {
                console.log(`EventBus: Unsubscribed from "${eventName}"`);
            }

            // Clean up empty event sets
            if (callbacks.size === 0) {
                this.events.delete(eventName);
            }
        }
    }

    /**
     * Emit an event
     * @param {string} eventName - The event name
     * @param {...*} args - Arguments to pass to callbacks
     */
    emit(eventName, ...args) {
        const callbacks = this.events.get(eventName);

        if (this.debugMode) {
            console.log(`EventBus: Emitting "${eventName}"`, args);
        }

        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`EventBus: Error in listener for "${eventName}":`, error);
                }
            });
        }
    }

    /**
     * Remove all listeners for an event, or all events if no name provided
     * @param {string} [eventName] - Optional event name to clear
     */
    clear(eventName) {
        if (eventName) {
            this.events.delete(eventName);
            if (this.debugMode) {
                console.log(`EventBus: Cleared all listeners for "${eventName}"`);
            }
        } else {
            this.events.clear();
            if (this.debugMode) {
                console.log('EventBus: Cleared all listeners');
            }
        }
    }

    /**
     * Get the number of listeners for an event
     * @param {string} eventName - The event name
     * @returns {number} Number of listeners
     */
    listenerCount(eventName) {
        const callbacks = this.events.get(eventName);
        return callbacks ? callbacks.size : 0;
    }

    /**
     * Get all registered event names
     * @returns {string[]} Array of event names
     */
    eventNames() {
        return Array.from(this.events.keys());
    }

    /**
     * Enable or disable debug mode
     * @param {boolean} enabled - Whether to enable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`EventBus: Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// Export singleton instance
const eventBus = new EventBus();

// For debugging in browser console
if (typeof window !== 'undefined') {
    window.__eventBus = eventBus;
}

export default eventBus;

/**
 * Common event names (constants for type safety)
 */
export const Events = {
    // Connection events
    CONNECTION_STATUS: 'connection:status',
    CONNECTION_ERROR: 'connection:error',
    PROTOCOL_CHANGED: 'protocol:changed',

    // Data events
    DATA_SEND: 'data:send',
    DATA_RECEIVED: 'data:received',
    DATA_SEND_ERROR: 'data:send-error',
    BOOLEANS_UPDATED: 'data:booleans-updated',
    INTEGERS_UPDATED: 'data:integers-updated',
    DEBUG_DATA_UPDATED: 'data:debug-updated',

    // Command events
    COMMAND_SET: 'command:set',
    COMMAND_ACKNOWLEDGED: 'command:acknowledged',
    COMMAND_CLEARED: 'command:cleared',

    // UI events
    TAB_CHANGED: 'ui:tab-changed',
    SETTINGS_OPENED: 'ui:settings-opened',
    LOG_MESSAGE: 'ui:log',

    // Auto-send events
    AUTO_SEND_STARTED: 'autosend:started',
    AUTO_SEND_STOPPED: 'autosend:stopped',
    AUTO_SEND_INTERVAL_CHANGED: 'autosend:interval-changed',

    // Control events
    JOYSTICK_ACTIVE: 'control:joystick-active',
    JOYSTICK_RELEASED: 'control:joystick-released',
    SLIDER_ACTIVE: 'control:slider-active',
    SLIDER_RELEASED: 'control:slider-released',

    // Settings events
    SETTINGS_LOADED: 'settings:loaded',
    SETTINGS_SAVED: 'settings:saved',

    // Motion Capture events
    MOCAP_STARTED: 'mocap:started',
    MOCAP_STOPPED: 'mocap:stopped',
    MOCAP_ERROR: 'mocap:error',
    MOCAP_FRAME_RECEIVED: 'mocap:frame-received',
    MOCAP_DATA_PROCESSED: 'mocap:data-processed',
    MOCAP_RIGID_BODIES_UPDATED: 'mocap:rigid-bodies-updated'
};
