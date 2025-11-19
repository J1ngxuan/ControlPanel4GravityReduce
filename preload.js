const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // TCP connection methods
    connect: (host, port, clientPort) => ipcRenderer.invoke('tcp-connect', host, port, clientPort),
    disconnect: () => ipcRenderer.invoke('tcp-disconnect'),
    send: (integers) => ipcRenderer.invoke('tcp-send', integers),
    sendCommand: (commandId) => ipcRenderer.invoke('tcp-send-command', commandId),

    // Window management
    openSettings: () => ipcRenderer.invoke('open-settings'),
    windowMinimize: () => ipcRenderer.invoke('window-minimize'),
    windowMaximize: () => ipcRenderer.invoke('window-maximize'),
    windowClose: () => ipcRenderer.invoke('window-close'),

    // ========== UNIFIED STATE MANAGEMENT ==========
    // Get entire app state (for initialization)
    getAppState: () => ipcRenderer.invoke('get-app-state'),

    // Update specific state values
    setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
    setLanguage: (language) => ipcRenderer.invoke('set-language', language),

    // Single unified state change listener
    onStateChanged: (callback) => {
        ipcRenderer.on('app-state-changed', (event, { key, value }) => callback(key, value));
    },

    // Backward compatibility - these will be deprecated
    // Keep for now to avoid breaking existing code
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
    }
});
