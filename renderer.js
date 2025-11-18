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

    // Boolean status labels (40 status indicators)
    const boolLabels = [
        'X Pos Complete', 'Y Pos Complete', 'Z Pos Complete',  // 0-2
        'X Calibrated', 'Y Calibrated', 'Z Status',  // 3-5
        'X Servo Active', 'Y Servo Active', 'Z Servo Active',  // 6-8
        'X+ Hard Limit', 'X- Hard Limit', 'Y+ Hard Limit', 'Y- Hard Limit',  // 9-12
        'X+ Soft Limit', 'X- Soft Limit', 'Y Soft Status', 'Z Soft Status',  // 13-16
        'Force Exp Active', 'Precision Align', 'Abs Pos Move', 'Emergency Stop',  // 17-20
        'Status 21', 'Status 22', 'Status 23', 'Status 24',  // 21-24
        'Status 25', 'Status 26', 'Status 27', 'Status 28',  // 25-28
        'Status 29', 'Status 30', 'Status 31', 'Status 32',  // 29-32
        'Status 33', 'Status 34', 'Status 35', 'Status 36',  // 33-36
        'Status 37', 'Status 38', 'Status 39', 'Status 40'   // 37-39
    ];

    // Create 40 boolean display items
    boolDisplay.innerHTML = '';
    for (let i = 0; i < 40; i++) {
        const boolItem = document.createElement('div');
        boolItem.className = 'bool-item bool-false';
        boolItem.id = `bool-${i}`;
        boolItem.innerHTML = `
            <div class="bool-label">${boolLabels[i]}</div>
            <div class="bool-value">FALSE</div>
        `;
        boolDisplay.appendChild(boolItem);
    }

    // Integer status labels (10 status values)
    const intLabels = [
        'Current X Pos', 'Current Y Pos', 'Current Z Pos',  // 0-2
        'Current Speed', 'Force Value', 'Tension Value',    // 3-5
        'Status Int 6', 'Status Int 7', 'Status Int 8', 'Status Int 9'  // 6-9
    ];

    // Create 10 integer display items
    intDisplay.innerHTML = '';
    for (let i = 0; i < 10; i++) {
        const intItem = document.createElement('div');
        intItem.className = 'int-item';
        intItem.id = `int-display-${i}`;
        intItem.innerHTML = `
            <div class="int-item-label">${intLabels[i]}</div>
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

    if (connected) {
        if (statusIndicator) {
            statusIndicator.textContent = 'Connected';
            statusIndicator.className = 'status-connected';
        }
        if (connectBtn) connectBtn.disabled = true;
        if (disconnectBtn) disconnectBtn.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        commandButtons.forEach(btn => btn.disabled = false);

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

            addLog(`Command set: ${commandName} (ID: ${commandId}) - will send at 50Hz`, 'success');
        });
    });
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

const JOYSTICK_RADIUS = 100;
const JOYSTICK_HANDLE_RADIUS = 30;
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

    // Draw outer circle (base)
    joystickCtx.beginPath();
    joystickCtx.arc(centerX, centerY, JOYSTICK_RADIUS, 0, 2 * Math.PI);
    joystickCtx.fillStyle = '#1e1e1e';
    joystickCtx.fill();
    joystickCtx.strokeStyle = '#3c3c3c';
    joystickCtx.lineWidth = 2;
    joystickCtx.stroke();

    // Draw deadzone circle
    joystickCtx.beginPath();
    joystickCtx.arc(centerX, centerY, JOYSTICK_RADIUS * JOYSTICK_DEADZONE, 0, 2 * Math.PI);
    joystickCtx.fillStyle = '#2d2d30';
    joystickCtx.fill();
    joystickCtx.strokeStyle = '#454545';
    joystickCtx.lineWidth = 1;
    joystickCtx.stroke();

    // Draw crosshair
    joystickCtx.strokeStyle = '#454545';
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

    // Draw line from center to handle if active
    if (isJoystickActive) {
        joystickCtx.beginPath();
        joystickCtx.moveTo(centerX, centerY);
        joystickCtx.lineTo(handleX, handleY);
        joystickCtx.strokeStyle = '#007acc';
        joystickCtx.lineWidth = 2;
        joystickCtx.stroke();
    }

    // Draw handle (joystick knob)
    joystickCtx.beginPath();
    joystickCtx.arc(handleX, handleY, JOYSTICK_HANDLE_RADIUS, 0, 2 * Math.PI);
    joystickCtx.fillStyle = isJoystickActive ? '#16825d' : '#0e639c';
    joystickCtx.fill();
    joystickCtx.strokeStyle = isJoystickActive ? '#14892c' : '#007acc';
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

    if (command !== 0) {
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

    if (command !== 0) {
        statusContainer.classList.add('active');
    } else {
        statusContainer.classList.remove('active');
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
        [COMMANDS.X_PLUS]: 'X+ Move',
        [COMMANDS.X_MINUS]: 'X- Move',
        [COMMANDS.Y_PLUS]: 'Y+ Move',
        [COMMANDS.Y_MINUS]: 'Y- Move',
        [COMMANDS.Z_PLUS]: 'Z+ Move',
        [COMMANDS.Z_MINUS]: 'Z- Move',
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
});
