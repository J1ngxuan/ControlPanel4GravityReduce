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

    // Theme management
    setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
    getTheme: () => ipcRenderer.invoke('get-theme'),

    // Language management
    setLanguage: (language) => ipcRenderer.invoke('set-language', language),
    getLanguage: () => ipcRenderer.invoke('get-language'),

    // Event listeners
    onConnectionStatus: (callback) => {
        ipcRenderer.on('connection-status', (event, data) => callback(data));
    },
    onDataReceived: (callback) => {
        ipcRenderer.on('tcp-data-received', (event, data) => callback(data));
    },
    onThemeChanged: (callback) => {
        ipcRenderer.on('theme-changed', (event, theme) => callback(theme));
    },
    onLanguageChanged: (callback) => {
        ipcRenderer.on('language-changed', (event, language) => callback(language));
    }
});
