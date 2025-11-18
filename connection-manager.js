// Connection Manager - Handles TCP connection and auto-send functionality

class ConnectionManager {
    constructor(config, uiManager, dataHandler) {
        this.config = config;
        this.uiManager = uiManager;
        this.dataHandler = dataHandler;
        this.isConnected = false;
        this.autoSendInterval = null;
        this.commandButtons = null;
    }

    // Get connection status
    getConnectionStatus() {
        return this.isConnected;
    }

    // Connect to TCP server
    async connect(host, port) {
        if (!host || !port) {
            this.uiManager.addLog('Please enter valid host and port', 'error');
            return { success: false, message: 'Invalid host or port' };
        }

        this.uiManager.addLog(`Connecting to ${host}:${port}...`, 'info');

        try {
            const result = await window.electronAPI.connect(host, port);
            if (result.success) {
                this.isConnected = true;
                this.updateConnectionUI(true);
                return result;
            } else {
                this.uiManager.addLog(`Connection failed: ${result.message}`, 'error');
                return result;
            }
        } catch (error) {
            this.uiManager.addLog(`Connection error: ${error.message || 'Unknown error'}`, 'error');
            return { success: false, message: error.message };
        }
    }

    // Disconnect from TCP server
    async disconnect() {
        try {
            await window.electronAPI.disconnect();
            this.isConnected = false;
            this.updateConnectionUI(false);
            return { success: true };
        } catch (error) {
            this.uiManager.addLog(`Disconnect error: ${error.message}`, 'error');
            return { success: false, message: error.message };
        }
    }

    // Update connection UI
    updateConnectionUI(connected) {
        this.uiManager.updateConnectionStatus(connected, this.commandButtons);

        if (connected) {
            this.uiManager.addLog('Successfully connected to server', 'success');

            // Auto-start 50Hz sending if toggle is checked (only in main window)
            const autoSendToggle = document.getElementById('auto-send-toggle');
            if (this.uiManager.isMainWindow() && autoSendToggle && autoSendToggle.checked && !this.autoSendInterval) {
                this.startAutoSend();
            }
        } else {
            this.uiManager.addLog('Disconnected from server', 'info');

            // Stop auto-send on disconnect
            if (this.autoSendInterval) {
                this.stopAutoSend();
            }
        }
    }

    // Handle connection status events from main process
    handleConnectionStatus(data) {
        if (data.connected) {
            this.isConnected = true;
            this.updateConnectionUI(true);
        } else {
            this.isConnected = false;
            this.updateConnectionUI(false);
            if (data.error) {
                this.uiManager.addLog(`Connection error: ${data.error}`, 'error');
            }
        }
    }

    // Send integer data
    async sendData() {
        if (!this.isConnected) {
            this.uiManager.addLog('Not connected to server', 'error');
            return { success: false, message: 'Not connected' };
        }

        const integers = this.dataHandler.collectIntegerData();

        try {
            const result = await window.electronAPI.send(integers);
            if (!result.success && !this.autoSendInterval) {
                this.uiManager.addLog(`Send failed: ${result.message}`, 'error');
            }
            return result;
        } catch (error) {
            if (!this.autoSendInterval) {
                this.uiManager.addLog(`Send error: ${error.message}`, 'error');
            }
            return { success: false, message: error.message };
        }
    }

    // Start auto-send at configured rate
    startAutoSend() {
        if (this.autoSendInterval) return; // Already running

        this.autoSendInterval = setInterval(async () => {
            await this.sendData();
        }, this.config.AUTO_SEND_INTERVAL_MS);

        this.uiManager.updateAutoSendIndicator(true);
        this.uiManager.addLog(`Auto-send started at ${this.config.AUTO_SEND_RATE_HZ}Hz (${this.config.AUTO_SEND_INTERVAL_MS}ms interval)`, 'success');
    }

    // Stop auto-send
    stopAutoSend() {
        if (this.autoSendInterval) {
            clearInterval(this.autoSendInterval);
            this.autoSendInterval = null;
        }

        this.uiManager.updateAutoSendIndicator(false);
        this.uiManager.addLog('Auto-send stopped', 'info');
    }

    // Toggle auto-send
    toggleAutoSend(enabled) {
        if (this.uiManager.isMainWindow()) {
            if (enabled && this.isConnected) {
                this.startAutoSend();
            } else {
                this.stopAutoSend();
            }
        }
    }

    // Set command buttons reference
    setCommandButtons(buttons) {
        this.commandButtons = buttons;
    }

    // Send command and update UI
    sendCommand(commandId, commandName) {
        if (!this.isConnected) {
            this.uiManager.addLog('Not connected to server', 'error');
            return;
        }

        // Update data handler and UI
        this.dataHandler.updateCommandDisplay(commandId, commandName);

        // Highlight active button
        if (this.commandButtons) {
            this.uiManager.highlightCommandButton(this.commandButtons, commandId);
        }

        this.uiManager.addLog(`Command set: ${commandName} (ID: ${commandId}) - will send at ${this.config.AUTO_SEND_RATE_HZ}Hz`, 'success');
    }
}

// Export singleton instance (will be initialized with dependencies)
let connectionManager = null;

function initializeConnectionManager(config, uiManager, dataHandler) {
    if (!connectionManager) {
        connectionManager = new ConnectionManager(config, uiManager, dataHandler);
    }
    return connectionManager;
}

function getConnectionManager() {
    if (!connectionManager) {
        throw new Error('ConnectionManager not initialized. Call initializeConnectionManager first.');
    }
    return connectionManager;
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.initializeConnectionManager = initializeConnectionManager;
    window.getConnectionManager = getConnectionManager;
}
