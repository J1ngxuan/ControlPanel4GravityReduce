// DOM Elements
const hostInput = document.getElementById('host');
const portInput = document.getElementById('port');
const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const sendBtn = document.getElementById('send-btn');
const autoSendToggle = document.getElementById('auto-send-toggle');
const autoSendIndicator = document.getElementById('auto-send-indicator');
const statusIndicator = document.getElementById('status-indicator');
const boolDisplay = document.getElementById('bool-display');
const intDisplay = document.getElementById('int-display');
const logContainer = document.getElementById('log');

let isConnected = false;
let autoSendInterval = null;
const AUTO_SEND_RATE = 50; // 50Hz = 20ms interval
let currentCommand = 0; // Track current command value for int-9
let waitingForAcknowledgment = false; // Track if we're waiting for PLC acknowledgment
let acknowledgedCommand = 0; // Track the last acknowledged command for joystick/slider

// Joystick and slider control variables
let joystickCanvas = null;
let joystickCtx = null;
let zSlider = null;
let joystickStatus = null;
let sliderStatus = null;
let isJoystickActive = false;
let isSliderActive = false;
let joystickPosition = { x: 0, y: 0 }; // Normalized: -1 to 1

// Load settings from localStorage
function loadSettings() {
    // Load connection settings
    if (hostInput) {
        const savedHost = localStorage.getItem('tcp-host');
        if (savedHost) hostInput.value = savedHost;
    }

    if (portInput) {
        const savedPort = localStorage.getItem('tcp-port');
        if (savedPort) portInput.value = savedPort;
    }

    // Load integer parameters (int-0 through int-15)
    for (let i = 0; i < 16; i++) {
        const input = document.getElementById(`int-${i}`);
        if (input && i !== 9) { // Don't load int-9 as it's the command
            const savedValue = localStorage.getItem(`int-${i}`);
            if (savedValue !== null) {
                input.value = savedValue;
            }
        }
    }

    // Load auto-send toggle state
    if (autoSendToggle) {
        const savedAutoSend = localStorage.getItem('auto-send-enabled');
        if (savedAutoSend !== null) {
            autoSendToggle.checked = savedAutoSend === 'true';
        }
    }
}

// Save settings to localStorage
function saveSettings() {
    // Save connection settings
    if (hostInput) {
        localStorage.setItem('tcp-host', hostInput.value);
    }

    if (portInput) {
        localStorage.setItem('tcp-port', portInput.value);
    }

    // Save integer parameters (int-0 through int-15)
    for (let i = 0; i < 16; i++) {
        const input = document.getElementById(`int-${i}`);
        if (input && i !== 9) { // Don't save int-9 as it's the command
            localStorage.setItem(`int-${i}`, input.value);
        }
    }

    // Save auto-send toggle state
    if (autoSendToggle) {
        localStorage.setItem('auto-send-enabled', autoSendToggle.checked.toString());
    }
}

// Initialize displays
function initializeDisplays() {
    // Only initialize if displays exist (may not exist in settings window)
    if (!boolDisplay || !intDisplay) {
        return;
    }

    // Get current language labels or use English as fallback
    const currentLang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'en';
    const locales = window.LOCALES || {};
    const labels = locales[currentLang] || locales['en'] || {};
    const boolLabels = labels.boolLabels || [];
    const intLabels = labels.intLabels || [];

    // Create 40 boolean display items
    boolDisplay.innerHTML = '';
    for (let i = 0; i < 40; i++) {
        const boolItem = document.createElement('div');
        boolItem.className = 'bool-item bool-false';
        boolItem.id = `bool-${i}`;
        boolItem.innerHTML = `
            <div class="bool-label">${boolLabels[i] || `Status ${i+1}`}</div>
            <div class="bool-value">FALSE</div>
        `;
        boolDisplay.appendChild(boolItem);
    }

    // Create 10 integer display items
    intDisplay.innerHTML = '';
    for (let i = 0; i < 10; i++) {
        const intItem = document.createElement('div');
        intItem.className = 'int-item';
        intItem.id = `int-display-${i}`;
        intItem.innerHTML = `
            <div class="int-item-label">${intLabels[i] || `Int ${i}`}</div>
            <div class="int-item-value">0</div>
        `;
        intDisplay.appendChild(intItem);
    }
}

// Logging function
function addLog(message, type = 'info') {
    // Only log if log container exists (may not exist in settings window)
    if (!logContainer) {
        console.log(`[${type}] ${message}`);
        return;
    }

    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    const timestamp = new Date().toLocaleTimeString();
    logEntry.textContent = `[${timestamp}] ${message}`;
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;

    // Keep only last 100 log entries
    while (logContainer.children.length > 100) {
        logContainer.removeChild(logContainer.firstChild);
    }
}

// Check if this is the main window (has tabs and command buttons)
function isMainWindow() {
    return document.querySelector('.tab-navigation') !== null;
}

// Update connection status
function updateConnectionStatus(connected) {
    isConnected = connected;
    const commandButtons = document.querySelectorAll('.btn-command');
    const driverSwitch = document.getElementById('driver-power-switch');
    const servoSwitch = document.getElementById('servo-module-switch');

    if (connected) {
        if (statusIndicator) {
            statusIndicator.textContent = 'Connected';
            statusIndicator.className = 'status-connected';
        }
        if (connectBtn) connectBtn.disabled = true;
        if (disconnectBtn) disconnectBtn.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        commandButtons.forEach(btn => btn.disabled = false);

        // Enable power switches
        enablePowerSwitches();

        // Enable joystick and slider controls
        if (joystickCanvas) {
            joystickCanvas.style.pointerEvents = 'auto';
            joystickCanvas.style.opacity = '1';
        }
        if (zSlider) {
            zSlider.disabled = false;
        }

        addLog('Successfully connected to server', 'success');

        // Auto-start 50Hz sending ONLY in main window if toggle is checked
        if (isMainWindow() && autoSendToggle && autoSendToggle.checked && !autoSendInterval) {
            startAutoSend();
        }
    } else {
        if (statusIndicator) {
            statusIndicator.textContent = 'Disconnected';
            statusIndicator.className = 'status-disconnected';
        }
        if (connectBtn) connectBtn.disabled = false;
        if (disconnectBtn) disconnectBtn.disabled = true;
        if (sendBtn) sendBtn.disabled = true;
        commandButtons.forEach(btn => btn.disabled = true);

        // Disable power switches
        if (driverSwitch) driverSwitch.disabled = true;
        if (servoSwitch) servoSwitch.disabled = true;
        const driverGroup = document.getElementById('driver-power-switch-group');
        const servoGroup = document.getElementById('servo-module-switch-group');
        if (driverGroup) {
            driverGroup.classList.add('disabled');
            driverGroup.classList.remove('waiting-ack');
        }
        if (servoGroup) {
            servoGroup.classList.add('disabled');
            servoGroup.classList.remove('waiting-ack');
        }

        // Disable joystick and slider controls
        if (joystickCanvas) {
            joystickCanvas.style.pointerEvents = 'none';
            joystickCanvas.style.opacity = '0.5';
        }
        if (zSlider) {
            zSlider.disabled = true;
        }

        // Reset controls when disconnected
        if (isJoystickActive) {
            handleJoystickMouseUp();
        }
        if (isSliderActive) {
            resetSlider();
        }

        addLog('Disconnected from server', 'info');

        // Stop auto-send on disconnect (only matters for main window)
        if (autoSendInterval) {
            stopAutoSend();
        }
    }
}

// Connect to TCP server
if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
        const host = hostInput.value.trim();
        const port = parseInt(portInput.value);

        if (!host || !port) {
            addLog('Please enter valid host and port', 'error');
            return;
        }

        addLog(`Connecting to ${host}:${port}...`, 'info');
        connectBtn.disabled = true;

        // Save connection settings
        saveSettings();

        try {
            const result = await window.electronAPI.connect(host, port);
            if (result.success) {
                updateConnectionStatus(true);
            } else {
                addLog(`Connection failed: ${result.message}`, 'error');
                connectBtn.disabled = false;
            }
        } catch (error) {
            addLog(`Connection error: ${error.message || 'Unknown error'}`, 'error');
            connectBtn.disabled = false;
        }
    });
}

// Start auto-send function
function startAutoSend() {
    if (autoSendInterval) return; // Already running

    autoSendInterval = setInterval(async () => {
        await sendIntegerData();
    }, 1000 / AUTO_SEND_RATE);

    if (autoSendIndicator) {
        autoSendIndicator.textContent = 'ON';
        autoSendIndicator.className = 'auto-send-indicator active';
    }
    addLog('Auto-send started at 50Hz (20ms interval)', 'success');
}

// Stop auto-send function
function stopAutoSend() {
    if (autoSendInterval) {
        clearInterval(autoSendInterval);
        autoSendInterval = null;
    }

    if (autoSendIndicator) {
        autoSendIndicator.textContent = 'OFF';
        autoSendIndicator.className = 'auto-send-indicator';
    }
    addLog('Auto-send stopped', 'info');
}

// Disconnect from TCP server
if (disconnectBtn) {
    disconnectBtn.addEventListener('click', async () => {
        try {
            await window.electronAPI.disconnect();
            updateConnectionStatus(false);
        } catch (error) {
            addLog(`Disconnect error: ${error.message}`, 'error');
        }
    });
}

// Auto-send toggle - only functional in main window
if (autoSendToggle) {
    autoSendToggle.addEventListener('change', () => {
        saveSettings(); // Save the toggle state

        // Only control auto-send in main window
        if (isMainWindow()) {
            if (autoSendToggle.checked && isConnected) {
                startAutoSend();
            } else {
                stopAutoSend();
            }
        }
    });
}

// Function to collect and send integer data
async function sendIntegerData() {
    if (!isConnected) {
        return;
    }

    // Collect 16 integer values
    const integers = [];
    for (let i = 0; i < 16; i++) {
        let value;

        if (i === 9) {
            // Int-9 is the Control Command - use currentCommand value
            value = currentCommand;
            const input = document.getElementById(`int-${i}`);
            if (input) {
                input.value = currentCommand; // Update display if element exists
            }
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

        if (value !== clampedValue && i !== 9) {
            const input = document.getElementById(`int-${i}`);
            if (input) {
                input.value = clampedValue;
            }
        }
    }

    try {
        const result = await window.electronAPI.send(integers);
        if (!result.success && !autoSendInterval) {
            addLog(`Send failed: ${result.message}`, 'error');
        }
        return result;
    } catch (error) {
        if (!autoSendInterval) {
            addLog(`Send error: ${error.message}`, 'error');
        }
        return { success: false, message: error.message };
    }
}

// Send data to TCP server
if (sendBtn) {
    sendBtn.addEventListener('click', async () => {
        if (!isConnected) {
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

// Command button handlers - will be initialized on DOMContentLoaded
function initializeCommandButtons() {
    const commandButtons = document.querySelectorAll('.btn-command');
    // Only initialize if command buttons exist (may not exist in settings window)
    if (commandButtons.length === 0) {
        return;
    }

    commandButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!isConnected) {
                addLog('Not connected to server', 'error');
                return;
            }

            const commandId = parseInt(btn.dataset.cmd);
            const commandName = btn.dataset.name || btn.textContent;

            // Remove active class from all command buttons
            commandButtons.forEach(b => b.classList.remove('active-command'));

            // Add active class to clicked button
            btn.classList.add('active-command');

            // Disable all command buttons except the clicked one while waiting for acknowledgment
            commandButtons.forEach(b => {
                if (b !== btn) {
                    b.disabled = true;
                }
            });

            // Disable power switches while waiting for acknowledgment
            disablePowerSwitches();

            // Set waiting state and show loading icon
            waitingForAcknowledgment = true;
            const loadingIcon = document.getElementById('cmd-loading-icon');
            if (loadingIcon) {
                loadingIcon.style.display = 'inline-block';
            }

            // Update the current command value (will be sent in next 50Hz cycle)
            currentCommand = commandId;

            // Update int-9 display immediately
            const commandInput = document.getElementById('int-9');
            if (commandInput) {
                commandInput.value = commandId;
            }

            // Update current command display
            const cmdDisplay = document.getElementById('current-cmd-display');
            if (cmdDisplay) {
                cmdDisplay.textContent = `${commandId} - ${commandName}`;
            }

            addLog(`Command set: ${commandName} (ID: ${commandId}) - waiting for acknowledgment...`, 'success');
        });
    });
}

// Power switch handlers - will be initialized on DOMContentLoaded
function initializePowerSwitches() {
    const driverSwitch = document.getElementById('driver-power-switch');
    const servoSwitch = document.getElementById('servo-module-switch');

    // Only initialize if switches exist (may not exist in settings window)
    if (!driverSwitch || !servoSwitch) {
        return;
    }

    // Driver Power Switch handler
    driverSwitch.addEventListener('change', (e) => {
        if (!isConnected) {
            addLog('Not connected to server', 'error');
            // Revert the switch
            e.target.checked = !e.target.checked;
            return;
        }

        const isOn = e.target.checked;
        const commandId = parseInt(isOn ? e.target.dataset.cmdOn : e.target.dataset.cmdOff);
        const commandName = `${e.target.dataset.name} ${isOn ? 'ON' : 'OFF'}`;

        // Disable all command buttons while waiting for acknowledgment
        const commandButtons = document.querySelectorAll('.btn-command');
        commandButtons.forEach(btn => btn.disabled = true);

        // Disable the other switch
        servoSwitch.disabled = true;
        const servoGroup = document.getElementById('servo-module-switch-group');
        if (servoGroup) {
            servoGroup.classList.add('disabled');
        }

        // Mark this switch group as waiting for acknowledgment
        const driverGroup = document.getElementById('driver-power-switch-group');
        if (driverGroup) {
            driverGroup.classList.add('waiting-ack');
        }

        // Set waiting state and show loading icon
        waitingForAcknowledgment = true;
        const loadingIcon = document.getElementById('cmd-loading-icon');
        if (loadingIcon) {
            loadingIcon.style.display = 'inline-block';
        }

        // Update the current command value (will be sent in next 50Hz cycle)
        currentCommand = commandId;

        // Update int-9 display immediately
        const commandInput = document.getElementById('int-9');
        if (commandInput) {
            commandInput.value = commandId;
        }

        // Update current command display
        const cmdDisplay = document.getElementById('current-cmd-display');
        if (cmdDisplay) {
            cmdDisplay.textContent = `${commandId} - ${commandName}`;
        }

        addLog(`Command set: ${commandName} (ID: ${commandId}) - waiting for acknowledgment...`, 'success');
    });

    // Servo Module Switch handler
    servoSwitch.addEventListener('change', (e) => {
        if (!isConnected) {
            addLog('Not connected to server', 'error');
            // Revert the switch
            e.target.checked = !e.target.checked;
            return;
        }

        const isOn = e.target.checked;
        const commandId = parseInt(isOn ? e.target.dataset.cmdOn : e.target.dataset.cmdOff);
        const commandName = `${e.target.dataset.name} ${isOn ? 'ON' : 'OFF'}`;

        // Disable all command buttons while waiting for acknowledgment
        const commandButtons = document.querySelectorAll('.btn-command');
        commandButtons.forEach(btn => btn.disabled = true);

        // Disable the other switch
        driverSwitch.disabled = true;
        const driverGroup = document.getElementById('driver-power-switch-group');
        if (driverGroup) {
            driverGroup.classList.add('disabled');
        }

        // Mark this switch group as waiting for acknowledgment
        const servoGroup = document.getElementById('servo-module-switch-group');
        if (servoGroup) {
            servoGroup.classList.add('waiting-ack');
        }

        // Set waiting state and show loading icon
        waitingForAcknowledgment = true;
        const loadingIcon = document.getElementById('cmd-loading-icon');
        if (loadingIcon) {
            loadingIcon.style.display = 'inline-block';
        }

        // Update the current command value (will be sent in next 50Hz cycle)
        currentCommand = commandId;

        // Update int-9 display immediately
        const commandInput = document.getElementById('int-9');
        if (commandInput) {
            commandInput.value = commandId;
        }

        // Update current command display
        const cmdDisplay = document.getElementById('current-cmd-display');
        if (cmdDisplay) {
            cmdDisplay.textContent = `${commandId} - ${commandName}`;
        }

        addLog(`Command set: ${commandName} (ID: ${commandId}) - waiting for acknowledgment...`, 'success');
    });
}

// Helper function to disable power switches
function disablePowerSwitches() {
    const driverSwitch = document.getElementById('driver-power-switch');
    const servoSwitch = document.getElementById('servo-module-switch');
    const driverGroup = document.getElementById('driver-power-switch-group');
    const servoGroup = document.getElementById('servo-module-switch-group');

    if (driverSwitch) {
        driverSwitch.disabled = true;
        if (driverGroup) driverGroup.classList.add('disabled');
    }
    if (servoSwitch) {
        servoSwitch.disabled = true;
        if (servoGroup) servoGroup.classList.add('disabled');
    }
}

// Helper function to enable power switches
function enablePowerSwitches() {
    const driverSwitch = document.getElementById('driver-power-switch');
    const servoSwitch = document.getElementById('servo-module-switch');
    const driverGroup = document.getElementById('driver-power-switch-group');
    const servoGroup = document.getElementById('servo-module-switch-group');

    if (driverSwitch && isConnected) {
        driverSwitch.disabled = false;
        if (driverGroup) {
            driverGroup.classList.remove('disabled');
            driverGroup.classList.remove('waiting-ack');
        }
    }
    if (servoSwitch && isConnected) {
        servoSwitch.disabled = false;
        if (servoGroup) {
            servoGroup.classList.remove('disabled');
            servoGroup.classList.remove('waiting-ack');
        }
    }
}

// Handle PLC command acknowledgment
function handleCommandAcknowledgment(acknowledgedCmd) {
    // Axis movement commands (joystick/slider): 7-12
    const isAxisMovementCommand = acknowledgedCmd >= COMMANDS.X_PLUS &&
                                   acknowledgedCmd <= COMMANDS.Z_MINUS;

    if (isAxisMovementCommand) {
        // For axis movement, just log the acknowledgment and update the acknowledged command
        // This will trigger the visual highlighting in joystick/slider
        acknowledgedCommand = acknowledgedCmd;
        addLog(`PLC acknowledged: ${getCommandName(acknowledgedCmd)}`, 'info');

        // Update joystick status highlighting and redraw
        if (isJoystickActive) {
            updateJoystickStatus(acknowledgedCmd);
            if (joystickCtx && joystickCanvas) {
                drawJoystick();
            }
        }

        // Update slider status highlighting
        if (isSliderActive) {
            updateSliderStatus(acknowledgedCmd);
        }
    } else {
        // For button commands and power switches, clear the highlight and reset command
        const commandButtons = document.querySelectorAll('.btn-command');
        commandButtons.forEach(btn => btn.classList.remove('active-command'));

        // Re-enable all command buttons
        commandButtons.forEach(btn => btn.disabled = false);

        // Re-enable power switches
        enablePowerSwitches();

        // Hide loading icon
        const loadingIcon = document.getElementById('cmd-loading-icon');
        if (loadingIcon) {
            loadingIcon.style.display = 'none';
        }

        // Clear waiting state
        waitingForAcknowledgment = false;

        // Reset current command to zero
        currentCommand = 0;

        // Update int-9 display
        const commandInput = document.getElementById('int-9');
        if (commandInput) {
            commandInput.value = 0;
        }

        // Update current command display
        const cmdDisplay = document.getElementById('current-cmd-display');
        if (cmdDisplay) {
            cmdDisplay.textContent = '0 - None';
        }

        addLog(`PLC acknowledged and completed: ${getCommandName(acknowledgedCmd)}`, 'success');
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

// Listen for received data
window.electronAPI.onDataReceived((data) => {
    // Update boolean display
    if (data.bools && data.bools.length === 40) {
        const boolLabels = [
            'X Pos Complete', 'Y Pos Complete', 'Z Pos Complete',
            'X Calibrated', 'Y Calibrated', 'Z Status',
            'X Servo Active', 'Y Servo Active', 'Z Servo Active',
            'X+ Hard Limit', 'X- Hard Limit', 'Y+ Hard Limit', 'Y- Hard Limit',
            'X+ Soft Limit', 'X- Soft Limit', 'Y Soft Status', 'Z Soft Status',
            'Force Exp Active', 'Precision Align', 'Abs Pos Move', 'Emergency Stop',
            'Status 21', 'Status 22', 'Status 23', 'Status 24',
            'Status 25', 'Status 26', 'Status 27', 'Status 28',
            'Status 29', 'Status 30', 'Status 31', 'Status 32',
            'Status 33', 'Status 34', 'Status 35', 'Status 36',
            'Status 37', 'Status 38', 'Status 39', 'Status 40'
        ];

        data.bools.forEach((value, index) => {
            const boolItem = document.getElementById(`bool-${index}`);
            if (boolItem) {
                if (value) {
                    boolItem.className = 'bool-item bool-true';
                    boolItem.innerHTML = `
                        <div class="bool-label">${boolLabels[index]}</div>
                        <div class="bool-value">TRUE</div>
                    `;
                } else {
                    boolItem.className = 'bool-item bool-false';
                    boolItem.innerHTML = `
                        <div class="bool-label">${boolLabels[index]}</div>
                        <div class="bool-value">FALSE</div>
                    `;
                }
            }
        });
        const trueCount = data.bools.filter(b => b).length;
        if (trueCount > 0) {
            addLog(`Status update: ${trueCount} indicators active`, 'info');
        }
    }

    // Update integer display
    if (data.ints && data.ints.length === 10) {
        data.ints.forEach((value, index) => {
            const intItem = document.getElementById(`int-display-${index}`);
            if (intItem) {
                const valueElement = intItem.querySelector('.int-item-value');
                if (valueElement) {
                    valueElement.textContent = value;
                }
            }
        });

        // Handle PLC command acknowledgment (10th int, index 9)
        const plcAcknowledgedCommand = data.ints[9];
        if (plcAcknowledgedCommand !== 0 && plcAcknowledgedCommand === currentCommand) {
            handleCommandAcknowledgment(plcAcknowledgedCommand);
        }
    }
});

// Tab switching functionality
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    // Only initialize if tabs exist (may not exist in settings window)
    if (tabButtons.length === 0) {
        return;
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;

            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const targetContent = document.getElementById(`tab-${targetTab}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            addLog(`Switched to ${button.textContent} tab`, 'info');
        });
    });
}

// Settings button handler
function initializeSettingsButton() {
    const settingsBtn = document.getElementById('settings-btn');
    // Only initialize if settings button exists (doesn't exist in settings window)
    if (settingsBtn) {
        settingsBtn.addEventListener('click', async () => {
            await window.electronAPI.openSettings();
        });
    }
}

// Window controls handler
function initializeWindowControls() {
    const minBtn = document.getElementById('min-btn');
    const maxBtn = document.getElementById('max-btn');
    const closeBtn = document.getElementById('close-btn');

    // Only initialize if window controls exist (may not exist in settings window)
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
    // Listen to host/port changes
    if (hostInput) {
        hostInput.addEventListener('change', saveSettings);
    }
    if (portInput) {
        portInput.addEventListener('change', saveSettings);
    }

    // Listen to integer input changes (int-0 through int-15)
    for (let i = 0; i < 16; i++) {
        const input = document.getElementById(`int-${i}`);
        if (input && i !== 9) { // Don't listen to int-9 as it's the command
            input.addEventListener('change', saveSettings);
        }
    }
}

// Listen for storage changes from other windows
window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('int-')) {
        const inputId = e.key;
        const input = document.getElementById(inputId);
        if (input && e.newValue !== null) {
            input.value = e.newValue;
        }
    } else if (e.key === 'tcp-host' && hostInput && e.newValue) {
        hostInput.value = e.newValue;
    } else if (e.key === 'tcp-port' && portInput && e.newValue) {
        portInput.value = e.newValue;
    } else if (e.key === 'auto-send-enabled' && autoSendToggle && e.newValue) {
        const newCheckedState = e.newValue === 'true';
        autoSendToggle.checked = newCheckedState;

        // If this is the main window, update auto-send based on the new state
        if (isMainWindow()) {
            if (newCheckedState && isConnected && !autoSendInterval) {
                startAutoSend();
            } else if (!newCheckedState && autoSendInterval) {
                stopAutoSend();
            }
        }
    }
});

// ========== JOYSTICK AND SLIDER CONTROLS ==========

const JOYSTICK_RADIUS = 80;
const JOYSTICK_HANDLE_RADIUS = 24;
const JOYSTICK_DEADZONE = 0.3; // 30% deadzone in center

// Command mappings
const COMMANDS = {
    X_PLUS: 7,
    X_MINUS: 8,
    Y_PLUS: 9,
    Y_MINUS: 10,
    Z_PLUS: 11,
    Z_MINUS: 12
};

// Draw joystick on canvas
function drawJoystick() {
    if (!joystickCtx || !joystickCanvas) return;

    const centerX = joystickCanvas.width / 2;
    const centerY = joystickCanvas.height / 2;

    // Clear canvas
    joystickCtx.clearRect(0, 0, joystickCanvas.width, joystickCanvas.height);

    // Get CSS variable colors for theme support
    const getCSSVar = (varName) => getComputedStyle(document.documentElement).getPropertyValue(varName).trim();

    // Draw outer circle (base)
    joystickCtx.beginPath();
    joystickCtx.arc(centerX, centerY, JOYSTICK_RADIUS, 0, 2 * Math.PI);
    joystickCtx.fillStyle = getCSSVar('--bg-primary');
    joystickCtx.fill();
    joystickCtx.strokeStyle = getCSSVar('--border-primary');
    joystickCtx.lineWidth = 2;
    joystickCtx.stroke();

    // Draw deadzone circle
    joystickCtx.beginPath();
    joystickCtx.arc(centerX, centerY, JOYSTICK_RADIUS * JOYSTICK_DEADZONE, 0, 2 * Math.PI);
    joystickCtx.fillStyle = getCSSVar('--bg-tertiary');
    joystickCtx.fill();
    joystickCtx.strokeStyle = getCSSVar('--border-secondary');
    joystickCtx.lineWidth = 1;
    joystickCtx.stroke();

    // Draw crosshair
    joystickCtx.strokeStyle = getCSSVar('--border-secondary');
    joystickCtx.lineWidth = 1;
    joystickCtx.beginPath();
    joystickCtx.moveTo(centerX, centerY - JOYSTICK_RADIUS);
    joystickCtx.lineTo(centerX, centerY + JOYSTICK_RADIUS);
    joystickCtx.stroke();
    joystickCtx.beginPath();
    joystickCtx.moveTo(centerX - JOYSTICK_RADIUS, centerY);
    joystickCtx.lineTo(centerX + JOYSTICK_RADIUS, centerY);
    joystickCtx.stroke();

    // Calculate handle position
    const handleX = centerX + joystickPosition.x * (JOYSTICK_RADIUS - JOYSTICK_HANDLE_RADIUS);
    const handleY = centerY - joystickPosition.y * (JOYSTICK_RADIUS - JOYSTICK_HANDLE_RADIUS); // Invert Y for canvas

    // Check if current command is acknowledged
    const isAcknowledged = isJoystickActive && (currentCommand === acknowledgedCommand) && (acknowledgedCommand !== 0);

    // Draw line from center to handle if active
    if (isJoystickActive) {
        joystickCtx.beginPath();
        joystickCtx.moveTo(centerX, centerY);
        joystickCtx.lineTo(handleX, handleY);
        joystickCtx.strokeStyle = getCSSVar('--accent-primary');
        joystickCtx.lineWidth = 2;
        joystickCtx.stroke();
    }

    // Draw handle (joystick knob) - only show green if acknowledged
    joystickCtx.beginPath();
    joystickCtx.arc(handleX, handleY, JOYSTICK_HANDLE_RADIUS, 0, 2 * Math.PI);
    joystickCtx.fillStyle = isAcknowledged ? getCSSVar('--success-button') : getCSSVar('--accent-primary-dark');
    joystickCtx.fill();
    joystickCtx.strokeStyle = isAcknowledged ? getCSSVar('--success-border') : getCSSVar('--accent-primary');
    joystickCtx.lineWidth = 2;
    joystickCtx.stroke();
}

// Get joystick position from mouse coordinates
function getJoystickPosition(clientX, clientY) {
    const rect = joystickCanvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate offset from center
    const offsetX = clientX - centerX;
    const offsetY = -(clientY - centerY); // Invert Y

    // Normalize to -1 to 1 range
    const maxOffset = JOYSTICK_RADIUS - JOYSTICK_HANDLE_RADIUS;
    let normalizedX = offsetX / maxOffset;
    let normalizedY = offsetY / maxOffset;

    // Clamp to circle boundary
    const magnitude = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
    if (magnitude > 1) {
        normalizedX /= magnitude;
        normalizedY /= magnitude;
    }

    return { x: normalizedX, y: normalizedY };
}

// Determine command from joystick position
function getJoystickCommand() {
    const absX = Math.abs(joystickPosition.x);
    const absY = Math.abs(joystickPosition.y);

    // Check if in deadzone
    const magnitude = Math.sqrt(absX * absX + absY * absY);
    if (magnitude < JOYSTICK_DEADZONE) {
        return 0; // No command
    }

    // Determine primary direction (X or Y has larger magnitude)
    if (absX > absY) {
        // X direction is primary
        return joystickPosition.x > 0 ? COMMANDS.X_PLUS : COMMANDS.X_MINUS;
    } else {
        // Y direction is primary
        return joystickPosition.y > 0 ? COMMANDS.Y_PLUS : COMMANDS.Y_MINUS;
    }
}

// Update joystick status display
function updateJoystickStatus(command) {
    if (!joystickStatus) return;

    const commandNames = {
        [COMMANDS.X_PLUS]: 'X+ Active',
        [COMMANDS.X_MINUS]: 'X- Active',
        [COMMANDS.Y_PLUS]: 'Y+ Active',
        [COMMANDS.Y_MINUS]: 'Y- Active',
        0: 'Inactive'
    };

    joystickStatus.textContent = commandNames[command] || 'Inactive';
    const statusContainer = joystickStatus.parentElement;

    // Only show active state (green) if command is acknowledged
    const isAcknowledged = (command !== 0) && (command === acknowledgedCommand);
    if (isAcknowledged) {
        statusContainer.classList.add('active');
    } else {
        statusContainer.classList.remove('active');
    }
}

// Update slider status display
function updateSliderStatus(command) {
    if (!sliderStatus) return;

    const commandNames = {
        [COMMANDS.Z_PLUS]: 'Z+ Active',
        [COMMANDS.Z_MINUS]: 'Z- Active',
        0: 'Inactive'
    };

    sliderStatus.textContent = commandNames[command] || 'Inactive';
    const statusContainer = sliderStatus.parentElement;

    // Only show active state (green) if command is acknowledged
    const isAcknowledged = (command !== 0) && (command === acknowledgedCommand);
    if (isAcknowledged) {
        statusContainer.classList.add('active');
        // Add acknowledged class to slider for styling
        if (zSlider) {
            zSlider.classList.add('slider-acknowledged');
        }
    } else {
        statusContainer.classList.remove('active');
        // Remove acknowledged class from slider
        if (zSlider) {
            zSlider.classList.remove('slider-acknowledged');
        }
    }
}

// Handle joystick mouse down
function handleJoystickMouseDown(e) {
    if (!isConnected) return;

    // Prevent slider from being active
    if (isSliderActive) {
        resetSlider();
    }

    isJoystickActive = true;
    const pos = getJoystickPosition(e.clientX, e.clientY);
    joystickPosition = pos;

    const command = getJoystickCommand();
    currentCommand = command;
    updateJoystickStatus(command);
    updateCurrentCommandDisplay(command);
    drawJoystick();

    if (command !== 0) {
        addLog(`Joystick: ${getCommandName(command)}`, 'info');
    }
}

// Handle joystick mouse move
function handleJoystickMouseMove(e) {
    if (!isJoystickActive) return;

    const pos = getJoystickPosition(e.clientX, e.clientY);
    joystickPosition = pos;

    const command = getJoystickCommand();

    // Only update if command changed
    if (currentCommand !== command) {
        currentCommand = command;
        acknowledgedCommand = 0; // Clear acknowledgment for new command
        updateJoystickStatus(command);
        updateCurrentCommandDisplay(command);

        if (command !== 0) {
            addLog(`Joystick: ${getCommandName(command)}`, 'info');
        }
    }

    drawJoystick();
}

// Handle joystick mouse up
function handleJoystickMouseUp() {
    if (!isJoystickActive) return;

    isJoystickActive = false;
    joystickPosition = { x: 0, y: 0 };
    currentCommand = 0;
    acknowledgedCommand = 0; // Clear acknowledged command

    updateJoystickStatus(0);
    updateCurrentCommandDisplay(0);
    drawJoystick();

    addLog('Joystick released', 'info');
}

// Reset slider to center position
function resetSlider() {
    if (!zSlider) return;

    isSliderActive = false;
    zSlider.value = 0;
    currentCommand = 0;
    acknowledgedCommand = 0; // Clear acknowledged command
    updateSliderStatus(0);
    updateCurrentCommandDisplay(0);
}

// Handle slider input
function handleSliderInput(e) {
    if (!isConnected) return;

    // Prevent joystick from being active
    if (isJoystickActive) {
        handleJoystickMouseUp();
    }

    const value = parseInt(e.target.value);
    let command = 0;

    if (value > 0) {
        command = COMMANDS.Z_PLUS;
        isSliderActive = true;
    } else if (value < 0) {
        command = COMMANDS.Z_MINUS;
        isSliderActive = true;
    } else {
        isSliderActive = false;
    }

    // Clear acknowledgment if command changed
    if (currentCommand !== command) {
        acknowledgedCommand = 0;
    }

    currentCommand = command;
    updateSliderStatus(command);
    updateCurrentCommandDisplay(command);

    if (command !== 0) {
        addLog(`Z-Slider: ${getCommandName(command)}`, 'info');
    }
}

// Handle slider change (when released)
function handleSliderChange(e) {
    // Reset slider to center when released
    setTimeout(() => {
        resetSlider();
        addLog('Z-Slider released', 'info');
    }, 100);
}

// Get command name for logging
function getCommandName(command) {
    const names = {
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
    return names[command] || 'Unknown';
}

// Update current command display
function updateCurrentCommandDisplay(command) {
    const cmdDisplay = document.getElementById('current-cmd-display');
    if (cmdDisplay) {
        const commandName = getCommandName(command);
        cmdDisplay.textContent = `${command} - ${commandName}`;
    }
}

// Initialize joystick and slider controls
function initializeAxisControls() {
    joystickCanvas = document.getElementById('joystick-canvas');
    zSlider = document.getElementById('z-slider');
    joystickStatus = document.getElementById('joystick-status');
    sliderStatus = document.getElementById('slider-status');

    // Only initialize if controls exist (may not exist in settings window)
    if (!joystickCanvas || !zSlider) {
        return;
    }

    // Initialize joystick canvas
    joystickCtx = joystickCanvas.getContext('2d');
    drawJoystick();

    // Joystick mouse events
    joystickCanvas.addEventListener('mousedown', handleJoystickMouseDown);
    window.addEventListener('mousemove', handleJoystickMouseMove);
    window.addEventListener('mouseup', handleJoystickMouseUp);

    // Joystick touch events (for mobile)
    joystickCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        handleJoystickMouseDown(touch);
    });

    window.addEventListener('touchmove', (e) => {
        if (isJoystickActive) {
            e.preventDefault();
            const touch = e.touches[0];
            handleJoystickMouseMove(touch);
        }
    });

    window.addEventListener('touchend', (e) => {
        if (isJoystickActive) {
            e.preventDefault();
            handleJoystickMouseUp();
        }
    });

    // Slider events
    zSlider.addEventListener('input', handleSliderInput);
    zSlider.addEventListener('change', handleSliderChange);

    // Disable controls initially (will be enabled on connection)
    joystickCanvas.style.pointerEvents = 'none';
    joystickCanvas.style.opacity = '0.5';
    zSlider.disabled = true;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Load saved settings first
    loadSettings();

    // Initialize only the components that exist in this window
    initializeDisplays();
    initializeCommandButtons();
    initializePowerSwitches(); // Initialize power switches
    initializeTabs();
    initializeSettingsButton();
    initializeWindowControls();
    setupInputListeners();
    initializeAxisControls(); // Initialize joystick and slider

    // Only update connection status if we have the necessary elements
    if (connectBtn || disconnectBtn) {
        updateConnectionStatus(false);
    }

    // Only log if log container exists
    if (logContainer) {
        addLog('Application started', 'info');
        addLog('Equipment Control Panel ready', 'success');
    }

    // Listen for theme changes to redraw canvas
    window.addEventListener('themeChanged', () => {
        if (joystickCanvas && joystickCtx) {
            drawJoystick();
        }
    });

    // Listen for language changes from other windows
    if (window.electronAPI && window.electronAPI.onLanguageChanged) {
        window.electronAPI.onLanguageChanged(() => {
            // Reinitialize displays with new language
            initializeDisplays();
        });
    }
});
