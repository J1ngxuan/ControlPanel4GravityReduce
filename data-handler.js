// Data Handler - Manages data collection and formatting for TCP communication

class DataHandler {
    constructor(config, settingsManager) {
        this.config = config;
        this.settingsManager = settingsManager;
        this.currentCommand = 0;
    }

    // Set current command value
    setCommand(commandId) {
        this.currentCommand = commandId;
    }

    // Get current command value
    getCommand() {
        return this.currentCommand;
    }

    // Collect integer data for sending (16 integers)
    collectIntegerData() {
        const integers = [];

        for (let i = 0; i < this.config.INT_SEND_COUNT; i++) {
            let value;

            if (i === this.config.COMMAND_INT_INDEX) {
                // Int-9 is the Control Command
                value = this.currentCommand;
            } else {
                // Try to get from DOM input first
                const input = document.getElementById(`int-${i}`);
                if (input) {
                    value = parseInt(input.value, 10) || 0;
                } else {
                    // Fall back to localStorage if input doesn't exist
                    value = this.settingsManager.loadIntParameter(i);
                }
            }

            // Ensure value is within valid range
            const clampedValue = Math.max(
                this.config.INT_MIN_VALUE,
                Math.min(this.config.INT_MAX_VALUE, value)
            );
            integers.push(clampedValue);

            // Update input if value was clamped
            if (value !== clampedValue && i !== this.config.COMMAND_INT_INDEX) {
                const input = document.getElementById(`int-${i}`);
                if (input) {
                    input.value = clampedValue;
                }
            }
        }

        return integers;
    }

    // Update command display in UI
    updateCommandDisplay(commandId, commandName) {
        this.setCommand(commandId);

        // Update int-9 display
        const commandInput = document.getElementById('int-9');
        if (commandInput) {
            commandInput.value = commandId;
        }

        // Update current command display
        const cmdDisplay = document.getElementById('current-cmd-display');
        if (cmdDisplay) {
            cmdDisplay.textContent = `${commandId} - ${commandName}`;
        }
    }

    // Parse boolean data from received data
    parseBooleanData(bools) {
        if (!Array.isArray(bools) || bools.length !== this.config.BOOL_COUNT) {
            console.error(`Invalid boolean data: expected array of ${this.config.BOOL_COUNT}, got ${bools?.length}`);
            return null;
        }
        return bools;
    }

    // Parse integer data from received data
    parseIntegerData(ints) {
        if (!Array.isArray(ints) || ints.length !== this.config.INT_RECEIVE_COUNT) {
            console.error(`Invalid integer data: expected array of ${this.config.INT_RECEIVE_COUNT}, got ${ints?.length}`);
            return null;
        }
        return ints;
    }

    // Format received data for display
    formatReceivedData(data) {
        const bools = this.parseBooleanData(data.bools);
        const ints = this.parseIntegerData(data.ints);

        if (!bools || !ints) {
            return null;
        }

        return {
            bools: bools,
            ints: ints,
            trueCount: bools.filter(b => b).length
        };
    }
}

// Export singleton instance (will be initialized with dependencies)
let dataHandler = null;

function initializeDataHandler(config, settingsManager) {
    if (!dataHandler) {
        dataHandler = new DataHandler(config, settingsManager);
    }
    return dataHandler;
}

function getDataHandler() {
    if (!dataHandler) {
        throw new Error('DataHandler not initialized. Call initializeDataHandler first.');
    }
    return dataHandler;
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.initializeDataHandler = initializeDataHandler;
    window.getDataHandler = getDataHandler;
}
