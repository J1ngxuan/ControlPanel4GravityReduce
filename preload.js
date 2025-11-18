const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // TCP connection methods
    connect: (host, port) => ipcRenderer.invoke('tcp-connect', host, port),
    disconnect: () => ipcRenderer.invoke('tcp-disconnect'),
    send: (integers) => ipcRenderer.invoke('tcp-send', integers),
    sendCommand: (commandId) => ipcRenderer.invoke('tcp-send-command', commandId),

    // Window management
    openSettings: () => ipcRenderer.invoke('open-settings'),
    windowMinimize: () => ipcRenderer.invoke('window-minimize'),
    windowMaximize: () => ipcRenderer.invoke('window-maximize'),
    windowClose: () => ipcRenderer.invoke('window-close'),

    // Event listeners
    onConnectionStatus: (callback) => {
        ipcRenderer.on('connection-status', (event, data) => callback(data));
    },
    onDataReceived: (callback) => {
        ipcRenderer.on('tcp-data-received', (event, data) => callback(data));
    }
});
