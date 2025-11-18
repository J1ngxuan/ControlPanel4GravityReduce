// Refactored Renderer - Main application logic using modular architecture
// This file orchestrates all modules to create the application functionality

// Global instances
let uiManager;
let dataHandler;
let connectionManager;

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all managers
    uiManager = initializeUIManager(CONFIG);
    dataHandler = initializeDataHandler(CONFIG, settingsManager);
    connectionManager = initializeConnectionManager(CONFIG, uiManager, dataHandler);

    // Load saved settings
    loadApplicationSettings();

    // Initialize displays
    uiManager.initializeBooleanDisplay();
    uiManager.initializeIntegerDisplay();
    uiManager.initializeTabs();

    // Setup event listeners
    setupConnectionControls();
    setupAutoSendControls();
    setupCommandButtons();
    setupWindowControls();
    setupInputListeners();
    setupElectronListeners();
    setupStorageListener();

    // Initialize UI state
    const commandButtons = document.querySelectorAll('.btn-command');
    connectionManager.setCommandButtons(commandButtons);
    connectionManager.updateConnectionUI(false);

    // Log application ready
    if (uiManager.logContainer) {
        uiManager.addLog('Application started', 'info');
        uiManager.addLog('Equipment Control Panel ready', 'success');
    }
});

// Load application settings from localStorage
function loadApplicationSettings() {
    const hostInput = document.getElementById('host');
    const portInput = document.getElementById('port');
    const autoSendToggle = document.getElementById('auto-send-toggle');

    // Load connection settings
    const connSettings = settingsManager.loadConnectionSettings();
    if (hostInput && connSettings.host) hostInput.value = connSettings.host;
    if (portInput && connSettings.port) portInput.value = connSettings.port;

    // Load integer parameters (excluding command int-9)
    for (let i = 0; i < CONFIG.INT_SEND_COUNT; i++) {
        if (i !== CONFIG.COMMAND_INT_INDEX) {
            const input = document.getElementById(`int-${i}`);
            if (input) {
                input.value = settingsManager.loadIntParameter(i);
            }
        }
    }

    // Load auto-send toggle state
    if (autoSendToggle) {
        autoSendToggle.checked = settingsManager.loadAutoSendEnabled();
    }
}

// Save application settings to localStorage
function saveApplicationSettings() {
    const hostInput = document.getElementById('host');
    const portInput = document.getElementById('port');
    const autoSendToggle = document.getElementById('auto-send-toggle');

    // Save connection settings
    if (hostInput && portInput) {
        settingsManager.saveConnectionSettings(hostInput.value, portInput.value);
    }

    // Save integer parameters (excluding command int-9)
    for (let i = 0; i < CONFIG.INT_SEND_COUNT; i++) {
        if (i !== CONFIG.COMMAND_INT_INDEX) {
            const input = document.getElementById(`int-${i}`);
            if (input) {
                settingsManager.saveIntParameter(i, parseInt(input.value, 10) || 0);
            }
        }
    }

    // Save auto-send toggle state
    if (autoSendToggle) {
        settingsManager.saveAutoSendEnabled(autoSendToggle.checked);
    }
}

// Setup connection control buttons
function setupConnectionControls() {
    const connectBtn = document.getElementById('connect-btn');
    const disconnectBtn = document.getElementById('disconnect-btn');
    const sendBtn = document.getElementById('send-btn');
    const settingsBtn = document.getElementById('settings-btn');

    // Connect button
    if (connectBtn) {
        connectBtn.addEventListener('click', async () => {
            const hostInput = document.getElementById('host');
            const portInput = document.getElementById('port');

            const host = hostInput.value.trim();
            const port = parseInt(portInput.value, 10);

            // Validate input
            const hostValidation = validateHost(host);
            const portValidation = validatePort(port);

            if (!hostValidation.valid) {
                uiManager.addLog(hostValidation.error, 'error');
                return;
            }

            if (!portValidation.valid) {
                uiManager.addLog(portValidation.error, 'error');
                return;
            }

            // Save settings before connecting
            saveApplicationSettings();

            // Disable button during connection attempt
            connectBtn.disabled = true;

            const result = await connectionManager.connect(hostValidation.value, portValidation.value);
            if (!result.success) {
                connectBtn.disabled = false;
            }
        });
    }

    // Disconnect button
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', async () => {
            await connectionManager.disconnect();
        });
    }

    // Manual send button
    if (sendBtn) {
        sendBtn.addEventListener('click', async () => {
            uiManager.addLog('Sending data...', 'info');
            const result = await connectionManager.sendData();
            if (result && result.success) {
                uiManager.addLog('Data sent successfully', 'success');
            }
        });
    }

    // Settings button
    if (settingsBtn) {
        settingsBtn.addEventListener('click', async () => {
            await window.electronAPI.openSettings();
        });
    }
}

// Setup auto-send controls
function setupAutoSendControls() {
    const autoSendToggle = document.getElementById('auto-send-toggle');

    if (autoSendToggle) {
        autoSendToggle.addEventListener('change', () => {
            saveApplicationSettings();
            connectionManager.toggleAutoSend(autoSendToggle.checked);
        });
    }
}

// Setup command buttons
function setupCommandButtons() {
    const commandButtons = document.querySelectorAll('.btn-command');

    if (commandButtons.length === 0) return;

    commandButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const commandId = parseInt(btn.dataset.cmd, 10);
            const commandName = btn.dataset.name || btn.textContent;
            connectionManager.sendCommand(commandId, commandName);
        });
    });
}

// Setup window controls
function setupWindowControls() {
    const minBtn = document.getElementById('min-btn');
    const maxBtn = document.getElementById('max-btn');
    const closeBtn = document.getElementById('close-btn');

    if (minBtn) {
        minBtn.addEventListener('click', () => {
            window.electronAPI.windowMinimize();
        });
    }

    if (maxBtn) {
        maxBtn.addEventListener('click', () => {
            window.electronAPI.windowMaximize();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            window.electronAPI.windowClose();
        });
    }
}

// Setup input change listeners for auto-save
function setupInputListeners() {
    const hostInput = document.getElementById('host');
    const portInput = document.getElementById('port');

    if (hostInput) hostInput.addEventListener('change', saveApplicationSettings);
    if (portInput) portInput.addEventListener('change', saveApplicationSettings);

    // Listen to integer input changes
    for (let i = 0; i < CONFIG.INT_SEND_COUNT; i++) {
        if (i !== CONFIG.COMMAND_INT_INDEX) {
            const input = document.getElementById(`int-${i}`);
            if (input) {
                input.addEventListener('change', saveApplicationSettings);
            }
        }
    }
}

// Setup Electron IPC listeners
function setupElectronListeners() {
    // Listen for connection status updates
    window.electronAPI.onConnectionStatus((data) => {
        connectionManager.handleConnectionStatus(data);
    });

    // Listen for received data
    window.electronAPI.onDataReceived((data) => {
        const formattedData = dataHandler.formatReceivedData(data);
        if (formattedData) {
            uiManager.updateBooleanDisplay(formattedData.bools);
            uiManager.updateIntegerDisplay(formattedData.ints);

            if (formattedData.trueCount > 0) {
                uiManager.addLog(`Status update: ${formattedData.trueCount} indicators active`, 'info');
            }
        }
    });
}

// Setup storage change listener (for multi-window sync)
function setupStorageListener() {
    settingsManager.onStorageChange((change) => {
        // Update UI elements when settings change in other windows
        if (change.key.startsWith('int-')) {
            const input = document.getElementById(change.key);
            if (input && change.newValue !== null) {
                input.value = change.newValue;
            }
        } else if (change.key === 'tcp-host') {
            const hostInput = document.getElementById('host');
            if (hostInput && change.newValue) {
                hostInput.value = change.newValue;
            }
        } else if (change.key === 'tcp-port') {
            const portInput = document.getElementById('port');
            if (portInput && change.newValue) {
                portInput.value = change.newValue;
            }
        } else if (change.key === 'auto-send-enabled') {
            const autoSendToggle = document.getElementById('auto-send-toggle');
            if (autoSendToggle && change.newValue) {
                const newCheckedState = change.newValue === 'true';
                autoSendToggle.checked = newCheckedState;

                // Update auto-send state if this is the main window
                if (uiManager.isMainWindow()) {
                    connectionManager.toggleAutoSend(newCheckedState);
                }
            }
        }
    });
}
