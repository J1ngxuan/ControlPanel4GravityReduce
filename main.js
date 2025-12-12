//This is a multi-window Electron app. Any settings/state changes must sync across all windows via IPC.
// Check for existing windows and implement synchronization from the start.
const { app, BrowserWindow, ipcMain } = require('electron');
const net = require('net');
const dgram = require('dgram');
const path = require('path');

// Import NokovReceiver for motion capture
let NokovReceiver;
try {
    NokovReceiver = require('nokov-mocap-reader').NokovReceiver;
} catch (err) {
    console.warn('nokov-mocap-reader not installed. Motion capture features will be unavailable.');
    NokovReceiver = null;
}

let mainWindow;
let settingsWindow = null;
let tcpClient = null;
let udpSocket = null;
let mocapReceiver = null;

// ========== UNIFIED STATE MANAGEMENT ==========
// Centralized application state - single source of truth
const appState = {
    connection: {
        connected: false,
        error: null
    },
    protocol: 'tcp', // 'tcp' or 'udp'
    tcpSettings: {
        host: 'localhost',
        port: 8080,
        clientPort: 0
    },
    udpSettings: {
        listeningPort: 8081,
        targetHost: 'localhost',
        targetPort: 8080
    },
    theme: 'dark',
    language: 'en',
    tcpData: {
        bools: [],
        ints: []
    },
    autoSend: {
        enabled: false,
        latencyMs: 20
    },
    debugMode: false
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

    // Load saved settings from localStorage after window is created
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

        // Load protocol and connection settings
        mainWindow.webContents.executeJavaScript('localStorage.getItem("protocol")')
            .then(savedProtocol => {
                if (savedProtocol === 'tcp' || savedProtocol === 'udp') {
                    appState.protocol = savedProtocol;
                }
            })
            .catch(err => console.error('Failed to load protocol:', err));

        // Load auto-send settings
        mainWindow.webContents.executeJavaScript('localStorage.getItem("autoSend")')
            .then(savedAutoSend => {
                if (savedAutoSend === 'true') {
                    appState.autoSend.enabled = true;
                }
            })
            .catch(err => console.error('Failed to load autoSend:', err));

        mainWindow.webContents.executeJavaScript('localStorage.getItem("send-latency-ms")')
            .then(savedLatency => {
                const latency = parseInt(savedLatency);
                if (latency && latency >= 1 && latency <= 10000) {
                    appState.autoSend.latencyMs = latency;
                }
            })
            .catch(err => console.error('Failed to load send-latency-ms:', err));

        // Load debug mode setting
        mainWindow.webContents.executeJavaScript('localStorage.getItem("debugMode")')
            .then(savedDebugMode => {
                if (savedDebugMode === 'true') {
                    appState.debugMode = true;
                }
            })
            .catch(err => console.error('Failed to load debugMode:', err));
    });

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    // Clean up connections on app shutdown
    if (tcpClient) {
        tcpClient.removeAllListeners();
        tcpClient.destroy();
        tcpClient = null;
    }
    if (udpSocket) {
        udpSocket.removeAllListeners();
        udpSocket.close();
        udpSocket = null;
    }
    // Clean up mocap receiver
    if (mocapReceiver) {
        mocapReceiver.stop().catch(err => console.error('Error stopping mocap:', err));
        mocapReceiver = null;
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

// TCP Disconnect handler
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

// ========== UDP HANDLERS ==========
// UDP Connection Handler (bind to listening port)
ipcMain.handle('udp-connect', async (event, listeningPort, targetHost, targetPort) => {
    return new Promise((resolve, reject) => {
        // Clean up existing UDP socket if any
        if (udpSocket) {
            udpSocket.removeAllListeners();
            udpSocket.close();
            udpSocket = null;
        }

        udpSocket = dgram.createSocket('udp4');

        // Bind to listening port to receive data
        udpSocket.bind(listeningPort, () => {
            console.log(`UDP socket bound to port ${listeningPort}`);
            console.log(`UDP target: ${targetHost}:${targetPort}`);

            // Update state and broadcast
            broadcastStateChange('connection', { connected: true, error: null });

            resolve({ success: true, message: 'UDP socket ready' });
        });

        // Listen for incoming UDP messages
        udpSocket.on('message', (data, rinfo) => {
            console.log(`Received UDP data from ${rinfo.address}:${rinfo.port}:`, data);
            parseReceivedData(data);
        });

        // Handle errors
        udpSocket.on('error', (err) => {
            console.error('UDP Error:', err);

            // Provide user-friendly error message for port conflicts
            let errorMessage = err.message;
            if (err.code === 'EADDRINUSE') {
                errorMessage = `UDP port ${listeningPort} is already in use. Please choose a different port.`;
            }

            // Update state and broadcast
            broadcastStateChange('connection', { connected: false, error: errorMessage });

            // Clean up on error
            if (udpSocket) {
                udpSocket.removeAllListeners();
                udpSocket.close();
                udpSocket = null;
            }

            reject({ success: false, message: errorMessage });
        });

        // Handle socket close
        udpSocket.on('close', () => {
            console.log('UDP socket closed');

            // Update state and broadcast
            broadcastStateChange('connection', { connected: false, error: null });
        });
    });
});

// UDP Disconnect handler
ipcMain.handle('udp-disconnect', async () => {
    if (udpSocket) {
        try {
            udpSocket.removeAllListeners();
            udpSocket.close();
            udpSocket = null;

            return { success: true, message: 'UDP socket closed' };
        } catch (error) {
            console.error('Error during UDP disconnect:', error);
            // Force cleanup on error
            if (udpSocket) {
                udpSocket.removeAllListeners();
                udpSocket.close();
                udpSocket = null;
            }
            return { success: true, message: 'UDP socket closed with errors' };
        }
    }
    return { success: false, message: 'No active UDP socket' };
});

// UDP Send handler
ipcMain.handle('udp-send', async (event, integers, targetHost, targetPort) => {
    if (!udpSocket) {
        return { success: false, message: 'UDP socket not initialized' };
    }

    try {
        // Convert 16 integers to bytes (32 bytes total)
        const buffers = integers.map(int => Int2Byte(int));
        const dataToSend = Buffer.concat(buffers);

        // Send UDP datagram
        udpSocket.send(dataToSend, targetPort, targetHost, (err) => {
            if (err) {
                console.error('Error sending UDP data:', err);
            } else {
                console.log(`Sent UDP data to ${targetHost}:${targetPort}:`, dataToSend);
            }
        });

        return { success: true, message: 'UDP data sent' };
    } catch (error) {
        console.error('Error sending UDP data:', error);
        return { success: false, message: error.message };
    }
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

// Switch protocol (auto-disconnects if connected)
ipcMain.handle('set-protocol', async (event, protocol) => {
    if (protocol !== 'tcp' && protocol !== 'udp') {
        return { success: false, message: 'Invalid protocol. Must be "tcp" or "udp"' };
    }

    // Auto-disconnect if connected
    if (appState.connection.connected) {
        if (appState.protocol === 'tcp' && tcpClient) {
            tcpClient.removeAllListeners();
            tcpClient.destroy();
            tcpClient = null;
        } else if (appState.protocol === 'udp' && udpSocket) {
            udpSocket.removeAllListeners();
            udpSocket.close();
            udpSocket = null;
        }

        // Update connection state
        broadcastStateChange('connection', { connected: false, error: null });
    }

    // Update protocol
    broadcastStateChange('protocol', protocol);

    return { success: true, message: `Protocol switched to ${protocol.toUpperCase()}` };
});

// Update auto-send state
ipcMain.handle('set-auto-send', async (event, autoSendState) => {
    broadcastStateChange('autoSend', autoSendState);
    return { success: true };
});

// Update debug mode state
ipcMain.handle('set-debug-mode', async (event, enabled) => {
    broadcastStateChange('debugMode', enabled);
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

// ========== MOTION CAPTURE HANDLERS ==========
// Start motion capture receiver
ipcMain.handle('mocap-start', async (event, config) => {
    if (!NokovReceiver) {
        return { success: false, message: 'nokov-mocap-reader package not installed' };
    }

    // Stop existing receiver if any
    if (mocapReceiver) {
        try {
            await mocapReceiver.stop();
        } catch (err) {
            console.warn('Error stopping existing mocap receiver:', err);
        }
        mocapReceiver = null;
    }

    try {
        mocapReceiver = new NokovReceiver({
            port: config.port || 5231,
            multicastGroup: config.multicastGroup || '239.239.239.52',
            frameTimeout: config.frameTimeout || 50
        });

        // Handle frame events
        mocapReceiver.on('frame', (frame) => {
            // Send frame data to renderer
            BrowserWindow.getAllWindows().forEach(win => {
                win.webContents.send('mocap-frame', {
                    frameId: frame.frameId,
                    timestamp: frame.timestamp ? frame.timestamp.toString() : null,
                    markerCount: frame.markerCount || 0,
                    rigidBodyCount: frame.rigidBodyCount || 0,
                    rigidBodies: (frame.rigidBodies || []).map(rb => ({
                        id: rb.id,
                        name: rb.name,
                        position: rb.position,
                        rotation: rb.rotation,
                        trackingValid: rb.trackingValid,
                        meanError: rb.meanError
                    }))
                });
            });
        });

        // Handle partial frames
        mocapReceiver.on('partialFrame', (frame) => {
            console.log('Partial frame received:', frame.frameId);
        });

        // Handle errors
        mocapReceiver.on('error', (err) => {
            console.error('Mocap error:', err);
            BrowserWindow.getAllWindows().forEach(win => {
                win.webContents.send('mocap-error', { message: err.message });
            });
        });

        // Start receiving
        const addressInfo = await mocapReceiver.start();
        console.log(`Mocap receiver started on ${config.multicastGroup}:${config.port}`);

        return { success: true, message: 'Mocap receiver started', address: addressInfo };
    } catch (error) {
        console.error('Failed to start mocap receiver:', error);
        mocapReceiver = null;
        return { success: false, message: error.message };
    }
});

// Stop motion capture receiver
ipcMain.handle('mocap-stop', async () => {
    if (!mocapReceiver) {
        return { success: false, message: 'Mocap receiver not running' };
    }

    try {
        await mocapReceiver.stop();
        mocapReceiver = null;
        console.log('Mocap receiver stopped');
        return { success: true, message: 'Mocap receiver stopped' };
    } catch (error) {
        console.error('Error stopping mocap receiver:', error);
        mocapReceiver = null;
        return { success: false, message: error.message };
    }
});
