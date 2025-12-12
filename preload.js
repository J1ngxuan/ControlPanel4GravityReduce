const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // TCP connection methods
    tcpConnect: (host, port, clientPort) => ipcRenderer.invoke('tcp-connect', host, port, clientPort),
    tcpDisconnect: () => ipcRenderer.invoke('tcp-disconnect'),
    tcpSend: (integers) => ipcRenderer.invoke('tcp-send', integers),
    tcpSendCommand: (commandId) => ipcRenderer.invoke('tcp-send-command', commandId),

    // UDP connection methods
    udpConnect: (listeningPort, targetHost, targetPort) => ipcRenderer.invoke('udp-connect', listeningPort, targetHost, targetPort),
    udpDisconnect: () => ipcRenderer.invoke('udp-disconnect'),
    udpSend: (integers, targetHost, targetPort) => ipcRenderer.invoke('udp-send', integers, targetHost, targetPort),

    // Protocol management
    setProtocol: (protocol) => ipcRenderer.invoke('set-protocol', protocol),

    // Window management
    openSettings: () => ipcRenderer.invoke('open-settings'),
    windowMinimize: () => ipcRenderer.invoke('window-minimize'),
    windowMaximize: () => ipcRenderer.invoke('window-maximize'),
    windowClose: () => ipcRenderer.invoke('window-close'),

    // ========== MOTION CAPTURE ==========
    mocapStart: (config) => ipcRenderer.invoke('mocap-start', config),
    mocapStop: () => ipcRenderer.invoke('mocap-stop'),
    onMocapFrame: (callback) => {
        ipcRenderer.on('mocap-frame', (event, frameData) => callback(frameData));
    },
    onMocapStatus: (callback) => {
        ipcRenderer.on('mocap-status', (event, status) => callback(status));
    },
    onMocapError: (callback) => {
        ipcRenderer.on('mocap-error', (event, error) => callback(error));
    },

    // ========== UNIFIED STATE MANAGEMENT ==========
    // Get entire app state (for initialization)
    getAppState: () => ipcRenderer.invoke('get-app-state'),

    // Update specific state values
    setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
    setLanguage: (language) => ipcRenderer.invoke('set-language', language),
    setAutoSend: (autoSendState) => ipcRenderer.invoke('set-auto-send', autoSendState),
    setDebugMode: (enabled) => ipcRenderer.invoke('set-debug-mode', enabled),

    // Single unified state change listener
    onStateChanged: (callback) => {
        ipcRenderer.on('app-state-changed', (event, { key, value }) => callback(key, value));
    },

    // Backward compatibility - these will be deprecated
    // Keep for now to avoid breaking existing code
    connect: (host, port, clientPort) => ipcRenderer.invoke('tcp-connect', host, port, clientPort),
    disconnect: () => ipcRenderer.invoke('tcp-disconnect'),
    send: (integers) => ipcRenderer.invoke('tcp-send', integers),
    sendCommand: (commandId) => ipcRenderer.invoke('tcp-send-command', commandId),
    getConnectionStatus: () => ipcRenderer.invoke('get-app-state').then(state => state.connection),
    getTheme: () => ipcRenderer.invoke('get-app-state').then(state => state.theme),
    getLanguage: () => ipcRenderer.invoke('get-app-state').then(state => state.language),
    onConnectionStatus: (callback) => {
        ipcRenderer.on('app-state-changed', (event, { key, value }) => {
            if (key === 'connection') callback(value);
        });
    },
    onDataReceived: (callback) => {
        ipcRenderer.on('app-state-changed', (event, { key, value }) => {
            if (key === 'tcpData') callback(value);
        });
    },
    onThemeChanged: (callback) => {
        ipcRenderer.on('app-state-changed', (event, { key, value }) => {
            if (key === 'theme') callback(value);
        });
    },
    onLanguageChanged: (callback) => {
        ipcRenderer.on('app-state-changed', (event, { key, value }) => {
            if (key === 'language') callback(value);
        });
    },
    onAutoSendChanged: (callback) => {
        ipcRenderer.on('app-state-changed', (event, { key, value }) => {
            if (key === 'autoSend') callback(value);
        });
    },
    onDebugModeChanged: (callback) => {
        ipcRenderer.on('app-state-changed', (event, { key, value }) => {
            if (key === 'debugMode') callback(value);
        });
    }
});
