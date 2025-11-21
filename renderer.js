// Import core modules
import stateManager from './renderer/core/state-manager.js';
import eventBus, { Events } from './renderer/core/event-bus.js';
import logger from './renderer/core/logger.js';

// Import connection modules
import connectionManager from './renderer/connection/connection-manager.js';
import protocolHandler from './renderer/connection/protocol-handler.js';
import dataSender from './renderer/connection/data-sender.js';

// Import data modules
import dataReceiver from './renderer/data/data-receiver.js';

// Import control modules
import commandButtonsManager from './renderer/controls/command-buttons.js';
import powerSwitchesManager from './renderer/controls/power-switches.js';
import joystickControl, { COMMANDS } from './renderer/controls/joystick-control.js';
import sliderControl from './renderer/controls/slider-control.js';

// Import settings and UI modules
import settingsManager from './renderer/settings/settings-manager.js';
import speedModeHandler from './renderer/settings/speed-mode-handler.js';
import uiInitializers from './renderer/ui/ui-initializers.js';

// Import utility helpers
import { addLog, isMainWindow, getCommandName } from './renderer/utils/helpers.js';

// DOM Elements - Protocol Selection
const protocolTcpRadio = document.getElementById('protocol-tcp');
const protocolUdpRadio = document.getElementById('protocol-udp');
const tcpSettingsSection = document.getElementById('tcp-settings');
const udpSettingsSection = document.getElementById('udp-settings');

// DOM Elements - TCP Settings
const tcpHostInput = document.getElementById('tcp-host');
const tcpPortInput = document.getElementById('tcp-port');
const tcpClientPortInput = document.getElementById('tcp-client-port');

// DOM Elements - UDP Settings
const udpListeningPortInput = document.getElementById('udp-listening-port');
const udpTargetHostInput = document.getElementById('udp-target-host');
const udpTargetPortInput = document.getElementById('udp-target-port');

// DOM Elements - Common Controls
const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const sendBtn = document.getElementById('send-btn');
const autoSendToggle = document.getElementById('auto-send-toggle');
const autoSendIndicator = document.getElementById('auto-send-indicator');
const statusIndicator = document.getElementById('status-indicator');
const boolDisplay = document.getElementById('bool-display');
const intDisplay = document.getElementById('int-display');
const logContainer = document.getElementById('log');
const debugModeToggle = document.getElementById('debug-mode-toggle');
const debugRxValue = document.getElementById('debug-rx-value');
const debugTxValue = document.getElementById('debug-tx-value');
const sendLatencyInput = document.getElementById('send-latency');

// State - Now managed by StateManager
// Access via: stateManager.get('key') and stateManager.set('key', value)
// All state variables are now in renderer/core/state-manager.js

// Load settings from localStorage (wrapper for settings manager)
function loadSettings() {
    settingsManager.loadSettings({
        protocolTcpRadio,
        protocolUdpRadio,
        tcpHostInput,
        tcpPortInput,
        tcpClientPortInput,
        udpListeningPortInput,
        udpTargetHostInput,
        udpTargetPortInput,
        autoSendToggle,
        debugModeToggle,
        sendLatencyInput,
        updateProtocolUI
    });
}

// Save settings to localStorage (wrapper for settings manager)
function saveSettings() {
    settingsManager.saveSettings({
        tcpHostInput,
        tcpPortInput,
        tcpClientPortInput,
        udpListeningPortInput,
        udpTargetHostInput,
        udpTargetPortInput,
        autoSendToggle,
        debugModeToggle,
        sendLatencyInput
    });
}

// Update protocol UI (show/hide TCP or UDP settings)
function updateProtocolUI() {
    protocolHandler.updateProtocolUI({
        tcpSettingsSection,
        udpSettingsSection,
        protocolTcpRadio,
        protocolUdpRadio
    });
}

// Handle protocol switch
async function handleProtocolSwitch(newProtocol) {
    const result = await protocolHandler.switchProtocol(newProtocol);

    if (result.success) {
        settingsManager.setCurrentProtocol(newProtocol);
        saveSettings();
        updateProtocolUI();
    }
}

// Initialize displays (delegate to uiInitializers module)
function initializeDisplays() {
    uiInitializers.initializeDisplays();
}

// Update connection status
function updateConnectionStatus(connected) {
    stateManager.set('isConnected', connected);

    // Emit connection status event
    eventBus.emit(Events.CONNECTION_STATUS, { connected });

    const commandButtons = document.querySelectorAll('.btn-command');
    const driverSwitch = document.getElementById('driver-power-switch');
    const servoSwitch = document.getElementById('servo-module-switch');

    if (connected) {
        if (statusIndicator) {
            statusIndicator.textContent = window.t('connected');
            statusIndicator.className = 'status-connected';
        }
        if (connectBtn) connectBtn.disabled = true;
        if (disconnectBtn) disconnectBtn.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        commandButtons.forEach(btn => btn.disabled = false);

        // Enable controls via modules
        powerSwitchesManager.handleConnectionStatus(true);
        joystickControl.handleConnectionStatus(true);
        sliderControl.handleConnectionStatus(true);

        addLog('Successfully connected to server', 'success');

        // Auto-start 50Hz sending ONLY in main window if toggle is checked
        if (isMainWindow() && autoSendToggle && autoSendToggle.checked && !dataSender.isAutoSendActive()) {
            startAutoSend();
        }
    } else {
        if (statusIndicator) {
            statusIndicator.textContent = window.t('disconnected');
            statusIndicator.className = 'status-disconnected';
        }
        if (connectBtn) connectBtn.disabled = false;
        if (disconnectBtn) disconnectBtn.disabled = true;
        if (sendBtn) sendBtn.disabled = true;
        commandButtons.forEach(btn => btn.disabled = true);

        // Disable controls via modules
        powerSwitchesManager.handleConnectionStatus(false);
        joystickControl.handleConnectionStatus(false);
        sliderControl.handleConnectionStatus(false);

        addLog('Disconnected from server', 'info');

        // Stop auto-send on disconnect (only matters for main window)
        if (dataSender.isAutoSendActive()) {
            stopAutoSend();
        }
    }
}

// Connect to server (TCP or UDP based on protocol)
if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
        connectBtn.disabled = true;

        // Save connection settings
        saveSettings();

        // Get connection settings using connectionManager
        const settings = connectionManager.getConnectionSettings({
            tcpHostInput,
            tcpPortInput,
            tcpClientPortInput,
            udpListeningPortInput,
            udpTargetHostInput,
            udpTargetPortInput
        });

        // Connect using connectionManager
        const result = await connectionManager.connect(settings);

        if (result.success) {
            updateConnectionStatus(true);
        } else {
            connectBtn.disabled = false;
        }
    });
}

// Start auto-send function
function startAutoSend() {
    dataSender.startAutoSend();

    // Update UI
    if (autoSendIndicator) {
        autoSendIndicator.textContent = window.t('on');
        autoSendIndicator.className = 'auto-send-indicator active';
    }
}

// Stop auto-send function
function stopAutoSend() {
    dataSender.stopAutoSend();

    // Update UI
    if (autoSendIndicator) {
        autoSendIndicator.textContent = window.t('off');
        autoSendIndicator.className = 'auto-send-indicator';
    }
}

// Disconnect from server (TCP or UDP)
if (disconnectBtn) {
    disconnectBtn.addEventListener('click', async () => {
        await connectionManager.disconnect();
        updateConnectionStatus(false);
    });
}

// Auto-send toggle - only functional in main window
if (autoSendToggle) {
    autoSendToggle.addEventListener('change', () => {
        saveSettings(); // Save the toggle state

        // Only control auto-send in main window
        if (isMainWindow()) {
            if (autoSendToggle.checked && stateManager.get('isConnected')) {
                startAutoSend();
            } else {
                stopAutoSend();
            }
        }
    });
}

// Debug mode toggle
if (debugModeToggle) {
    debugModeToggle.addEventListener('change', () => {
        stateManager.set('debugModeEnabled', debugModeToggle.checked);
        saveSettings(); // Save the toggle state

        if (debugModeToggle.checked) {
            addLog('Debug echo mode enabled: RX[9] → TX[6]', 'info');
        } else {
            addLog('Debug echo mode disabled', 'info');
            // Clear debug display values
            if (debugRxValue) debugRxValue.textContent = '--';
            if (debugTxValue) debugTxValue.textContent = '--';
        }
    });
}

// Send latency input handler
if (sendLatencyInput) {
    sendLatencyInput.addEventListener('change', () => {
        const newLatency = parseInt(sendLatencyInput.value);

        // Validate latency value
        if (isNaN(newLatency) || newLatency < 1 || newLatency > 10000) {
            addLog('Invalid latency value. Must be between 1-10000 ms', 'error');
            sendLatencyInput.value = stateManager.get('sendLatencyMs'); // Restore previous value
            return;
        }

        // Update using dataSender module and settings manager
        dataSender.updateAutoSendInterval(newLatency);
        settingsManager.setSendLatencyMs(newLatency);
        saveSettings(); // Save the latency setting
    });

    // Also handle on blur to update when user clicks away
    sendLatencyInput.addEventListener('blur', () => {
        sendLatencyInput.dispatchEvent(new Event('change'));
    });
}

// Function to collect and send integer data
async function sendIntegerData() {
    // Delegate to dataSender module
    return await dataSender.sendIntegerData();
}

// Send data to TCP server
if (sendBtn) {
    sendBtn.addEventListener('click', async () => {
        if (!stateManager.get('isConnected')) {
            addLog('Not connected to server', 'error');
            return;
        }

        addLog('Sending data...', 'info');
        const result = await sendIntegerData();
        if (result && result.success) {
            addLog('Data sent successfully', 'success');
        }
    });
}

// Handle PLC command acknowledgment
function handleCommandAcknowledgment(acknowledgedCmd) {
    // Axis movement commands (joystick/slider): 7-12
    const isAxisMovementCommand = acknowledgedCmd >= COMMANDS.X_PLUS &&
                                   acknowledgedCmd <= COMMANDS.Z_MINUS;

    if (isAxisMovementCommand) {
        // For axis movement, just log the acknowledgment and update the acknowledged command
        stateManager.set('acknowledgedCommand', acknowledgedCmd);
        logger.info(`PLC acknowledged: ${getCommandName(acknowledgedCmd)}`);

        // Delegate to control modules
        joystickControl.handleAcknowledgment(acknowledgedCmd);
        sliderControl.handleAcknowledgment(acknowledgedCmd);
    } else {
        // For button commands and power switches, clear the highlight and reset command
        commandButtonsManager.handleAcknowledgment();
        logger.success(`PLC acknowledged and completed: ${getCommandName(acknowledgedCmd)}`);
    }
}

// Listen for connection status updates
window.electronAPI.onConnectionStatus((data) => {
    if (data.connected) {
        updateConnectionStatus(true);
    } else {
        updateConnectionStatus(false);
        if (data.error) {
            addLog(`Connection error: ${data.error}`, 'error');
        }
    }
});

// Tab switching functionality (delegate to uiInitializers module)
function initializeTabs() {
    uiInitializers.initializeTabs();
}

// Settings button handler (delegate to uiInitializers module)
function initializeSettingsButton() {
    uiInitializers.initializeSettingsButton();
}

// Window controls handler (delegate to uiInitializers module)
function initializeWindowControls() {
    uiInitializers.initializeWindowControls();
}

// Setup input change listeners for auto-save (delegate to uiInitializers module)
function setupInputListeners() {
    uiInitializers.setupInputListeners(saveSettings);
}

// ========== REMOVED: localStorage cross-window sync ==========
// The old localStorage 'storage' event listener has been removed.
// All cross-window synchronization now uses unified IPC state management.
// Settings still persist to localStorage, but sync happens via IPC broadcasts.

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize logger with log container
    if (logContainer) {
        logger.init(logContainer);
    }

    // Initialize connection modules
    connectionManager.init(window.electronAPI);
    protocolHandler.init(window.electronAPI);
    dataSender.init(window.electronAPI);

    // Initialize data receiver with acknowledgment handler
    dataReceiver.init(window.electronAPI, handleCommandAcknowledgment);

    // Initialize UI initializers module
    uiInitializers.init(window.electronAPI);

    // Load saved settings first
    loadSettings();

    // Initialize speed mode handler (after settings are loaded)
    speedModeHandler.init();

    // Initialize only the components that exist in this window
    initializeDisplays();
    commandButtonsManager.init();
    powerSwitchesManager.init();
    initializeTabs();
    initializeSettingsButton();
    initializeWindowControls();
    setupInputListeners();
    joystickControl.init();
    sliderControl.init();

    // ========== UNIFIED STATE INITIALIZATION ==========
    // Get entire app state from main process
    try {
        const appState = await window.electronAPI.getAppState();

        // Apply protocol state
        if (appState.protocol) {
            settingsManager.setCurrentProtocol(appState.protocol);
            if (protocolTcpRadio && protocolUdpRadio) {
                if (appState.protocol === 'tcp') {
                    protocolTcpRadio.checked = true;
                } else {
                    protocolUdpRadio.checked = true;
                }
            }
            updateProtocolUI();
        }

        // Apply connection state
        if (appState.connection) {
            updateConnectionStatus(appState.connection.connected);
            if (appState.connection.error && logContainer) {
                addLog(`Connection error: ${appState.connection.error}`, 'error');
            }
        }

        // Apply theme state (theme-manager.js will handle this)
        // Apply language state (language-manager.js will handle this)

        console.log('App state loaded:', appState);
    } catch (error) {
        console.error('Failed to get app state:', error);
        if (connectBtn || disconnectBtn) {
            updateConnectionStatus(false);
        }
    }

    // Protocol radio button event listeners
    if (protocolTcpRadio) {
        protocolTcpRadio.addEventListener('change', () => {
            if (protocolTcpRadio.checked) {
                handleProtocolSwitch('tcp');
            }
        });
    }

    if (protocolUdpRadio) {
        protocolUdpRadio.addEventListener('change', () => {
            if (protocolUdpRadio.checked) {
                handleProtocolSwitch('udp');
            }
        });
    }

    // Only log if log container exists
    if (logContainer) {
        addLog('Application started', 'info');
        addLog('Equipment Control Panel ready', 'success');
    }

    // Listen for language changes from other windows (via IPC)
    if (window.electronAPI && window.electronAPI.onLanguageChanged) {
        window.electronAPI.onLanguageChanged(() => {
            // Reinitialize displays with new language
            initializeDisplays();
        });
    }

    // Listen for language changes in the same window (via custom event)
    window.addEventListener('languageChanged', () => {
        // Reinitialize displays with new language
        initializeDisplays();
    });

    // Listen for protocol changes from other windows (via unified state)
    if (window.electronAPI && window.electronAPI.onStateChanged) {
        window.electronAPI.onStateChanged((key, value) => {
            if (key === 'protocol' && value !== settingsManager.getCurrentProtocol()) {
                settingsManager.setCurrentProtocol(value);
                if (protocolTcpRadio && protocolUdpRadio) {
                    if (value === 'tcp') {
                        protocolTcpRadio.checked = true;
                    } else {
                        protocolUdpRadio.checked = true;
                    }
                }
                updateProtocolUI();
                if (logContainer) {
                    addLog(`Protocol changed to ${value.toUpperCase()} by another window`, 'info');
                }
            }
        });
    }
});
