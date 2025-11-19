//This is a multi-window Electron app. Any settings/state changes must sync across all windows via IPC. 
// Check for existing windows and implement synchronization from the start.
const { app, BrowserWindow, ipcMain } = require('electron');
const net = require('net');
const path = require('path');
let mainWindow;
let settingsWindow = null;
let tcpClient = null;

// ========== UNIFIED STATE MANAGEMENT ==========
// Centralized application state - single source of truth
const appState = {
    connection: {
        connected: false,
        error: null
    },
    theme: 'dark',
    language: 'en',
    tcpData: {
        bools: [],
        ints: []
    }
};

// Broadcast state changes to all windows
function broadcastStateChange(stateKey, value) {
    // Update the central state
    if (stateKey.includes('.')) {
        // Handle nested keys like 'connection.connected'
        const keys = stateKey.split('.');
        let target = appState;
        for (let i = 0; i < keys.length - 1; i++) {
            target = target[keys[i]];
        }
        target[keys[keys.length - 1]] = value;
    } else {
        appState[stateKey] = value;
    }

    // Broadcast to all windows
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('app-state-changed', { key: stateKey, value });
    });
}

// Get current state (for new windows)
function getAppState() {
    return appState;
}

// Int2Byte conversion function
function Int2Byte(i) {
    const bytes = Buffer.allocUnsafe(2);
    bytes[0] = (0xff00 & i) >> 8;  // High byte
    bytes[1] = 0xff & i;            // Low byte
    return bytes;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1600,
        height: 900,
        minWidth: 1280,
        minHeight: 720,
        frame: false, // Remove default titlebar for custom chrome
        backgroundColor: '#1e1e1e', // Dark background like VS Code
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile('index.html');
    mainWindow.webContents.openDevTools(); // For debugging
}

function createSettingsWindow() {
    // If settings window already exists, focus it
    if (settingsWindow) {
        settingsWindow.focus();
        return;
    }

    settingsWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        parent: mainWindow,
        modal: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    settingsWindow.loadFile('settings.html');
    settingsWindow.webContents.openDevTools(); // For debugging

    // Clean up the reference when window is closed
    settingsWindow.on('closed', () => {
        settingsWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    // Load saved theme and language from localStorage after window is created
    mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.executeJavaScript('localStorage.getItem("theme")')
            .then(savedTheme => {
                if (savedTheme) {
                    appState.theme = savedTheme;
                }
            })
            .catch(err => console.error('Failed to load theme:', err));

        mainWindow.webContents.executeJavaScript('localStorage.getItem("language")')
            .then(savedLanguage => {
                if (savedLanguage) {
                    appState.language = savedLanguage;
                }
            })
            .catch(err => console.error('Failed to load language:', err));
    });

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    // Clean up TCP connection on app shutdown
    if (tcpClient) {
        tcpClient.removeAllListeners();
        tcpClient.destroy();
        tcpClient = null;
    }
    if (process.platform !== 'darwin') app.quit();
});

// TCP Connection Handler
ipcMain.handle('tcp-connect', async (event, host, port, clientPort) => {
    return new Promise((resolve, reject) => {
        // Clean up existing connection if any
        if (tcpClient) {
            tcpClient.removeAllListeners();
            tcpClient.destroy();
            tcpClient = null;
        }

        // Add a small delay if reconnecting to allow port to be released
        // This helps with TIME_WAIT state when using specific client ports
        const reconnectDelay = (clientPort && clientPort > 0) ? 1000 : 0;

        setTimeout(() => {
            tcpClient = new net.Socket();

            // Enable address/port reuse to avoid TIME_WAIT issues
            tcpClient.setNoDelay(true); // Disable Nagle's algorithm for real-time data

            // Set up connection options
            const connectionOptions = {
                port: port,
                host: host
            };

            // Only set localPort if clientPort is specified (non-zero)
            if (clientPort && clientPort > 0) {
                connectionOptions.localPort = clientPort;
                console.log('Binding to client port:', clientPort);
            }

            tcpClient.connect(connectionOptions, () => {
                const clientPortMsg = clientPort > 0 ? ` (client port: ${clientPort})` : '';
                console.log(`Connected to TCP server: ${host}:${port}${clientPortMsg}`);

                // Update state and broadcast
                broadcastStateChange('connection', { connected: true, error: null });

                resolve({ success: true, message: 'Connected successfully' });
            });

            tcpClient.on('data', (data) => {
                console.log('Received data:', data);
                parseReceivedData(data);
            });

            tcpClient.on('error', (err) => {
                console.error('TCP Error:', err);

                // Provide user-friendly error message for port conflicts
                let errorMessage = err.message;
                if (err.code === 'EADDRINUSE' && clientPort > 0) {
                    errorMessage = `Client port ${clientPort} is still in use from previous connection. Please wait 30 seconds or set client port to 0 (auto-assign).`;
                }

                // Update state and broadcast
                broadcastStateChange('connection', { connected: false, error: errorMessage });

                // Clean up on error
                if (tcpClient) {
                    tcpClient.removeAllListeners();
                    tcpClient.destroy();
                    tcpClient = null;
                }

                reject({ success: false, message: errorMessage });
            });

            tcpClient.on('close', () => {
                console.log('Connection closed');

                // Update state and broadcast
                broadcastStateChange('connection', { connected: false, error: null });
            });

            // Connection timeout
            setTimeout(() => {
                if (!appState.connection.connected) {
                    if (tcpClient) {
                        tcpClient.removeAllListeners();
                        tcpClient.destroy();
                        tcpClient = null;
                    }
                    reject({ success: false, message: 'Connection timeout' });
                }
            }, 5000);
        }, reconnectDelay);
    });
});

// Parse received data: 40 bools + 10 ints
function parseReceivedData(data) {
    try {
        // Expected data format (PLC specific):
        // Bytes 0-4:   40 bools packed into 5 bytes (8 bits per byte)
        // Byte 5:      Padding/unused byte (PLC specific)
        // Bytes 6-25:  10 ints (20 bytes with Int2Byte format)
        // Total expected: 5 + 1 + 20 = 26 bytes

        if (data.length >= 26) {
            // Unpack 40 bools from first 5 bytes
            const bools = [];
            for (let byteIndex = 0; byteIndex < 5; byteIndex++) {
                const byte = data[byteIndex];
                // Extract 8 bits from each byte (LSB to MSB)
                for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
                    const boolValue = (byte & (1 << bitIndex)) !== 0;
                    bools.push(boolValue);
                }
            }

            // Skip byte 5 (padding/unused byte)
            // Parse 10 integers from bytes 6-25 (20 bytes total)
            const ints = [];
            for (let i = 0; i < 10; i++) {
                const offset = 6 + (i * 2);  // Start from byte 6 (7th byte)
                // Big-endian format: high byte first, then low byte
                const value = (data[offset] << 8) | data[offset + 1];
                ints.push(value);
            }

            // Update state and broadcast
            broadcastStateChange('tcpData', { bools, ints });

            console.log('Parsed data - Bools:', bools.length, 'Ints:', ints.length);
        } else {
            console.warn(`Received insufficient data: ${data.length} bytes (expected 26)`);
        }
    } catch (error) {
        console.error('Error parsing data:', error);
    }
}

// Send 16 integers
ipcMain.handle('tcp-send', async (event, integers) => {
    if (!tcpClient || !appState.connection.connected) {
        return { success: false, message: 'Not connected to server' };
    }

    try {
        // Convert 16 integers to bytes (32 bytes total)
        const buffers = integers.map(int => Int2Byte(int));
        const dataToSend = Buffer.concat(buffers);

        tcpClient.write(dataToSend);
        console.log('Sent data:', dataToSend);
        return { success: true, message: 'Data sent successfully' };
    } catch (error) {
        console.error('Error sending data:', error);
        return { success: false, message: error.message };
    }
});

// Send command
ipcMain.handle('tcp-send-command', async (event, commandId) => {
    if (!tcpClient || !appState.connection.connected) {
        return { success: false, message: 'Not connected to server' };
    }

    try {
        // Send command as a 16-bit integer
        const commandBuffer = Int2Byte(commandId);
        tcpClient.write(commandBuffer);
        console.log('Sent command:', commandId);
        return { success: true, message: `Command ${commandId} sent successfully` };
    } catch (error) {
        console.error('Error sending command:', error);
        return { success: false, message: error.message };
    }
});

// Disconnect handler
ipcMain.handle('tcp-disconnect', async () => {
    if (tcpClient) {
        try {
            // Gracefully close the connection
            tcpClient.end();

            // Force destroy after a short timeout if not closed gracefully
            setTimeout(() => {
                if (tcpClient) {
                    tcpClient.removeAllListeners();
                    tcpClient.destroy();
                    tcpClient = null;
                }
            }, 500);

            return { success: true, message: 'Disconnected' };
        } catch (error) {
            console.error('Error during disconnect:', error);
            // Force cleanup on error
            if (tcpClient) {
                tcpClient.removeAllListeners();
                tcpClient.destroy();
                tcpClient = null;
            }
            return { success: true, message: 'Disconnected with errors' };
        }
    }
    return { success: false, message: 'No active connection' };
});

// ========== UNIFIED STATE HANDLERS ==========
// Get entire app state (for new windows)
ipcMain.handle('get-app-state', async () => {
    return getAppState();
});

// Update theme
ipcMain.handle('set-theme', async (event, theme) => {
    broadcastStateChange('theme', theme);
    return { success: true };
});

// Update language
ipcMain.handle('set-language', async (event, language) => {
    broadcastStateChange('language', language);
    return { success: true };
});

// Open settings window handler
ipcMain.handle('open-settings', async () => {
    createSettingsWindow();
    return { success: true };
});

// Window control handlers
ipcMain.handle('window-minimize', () => {
    mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});

ipcMain.handle('window-close', () => {
    mainWindow.close();
});
