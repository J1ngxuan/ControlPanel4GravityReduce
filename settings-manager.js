// Settings Manager - Handles localStorage operations

class SettingsManager {
    constructor() {
        this.STORAGE_KEYS = {
            HOST: 'tcp-host',
            PORT: 'tcp-port',
            AUTO_SEND: 'auto-send-enabled'
        };
    }

    // Get integer parameter key
    getIntKey(index) {
        return `int-${index}`;
    }

    // Load connection settings
    loadConnectionSettings() {
        return {
            host: localStorage.getItem(this.STORAGE_KEYS.HOST) || '',
            port: localStorage.getItem(this.STORAGE_KEYS.PORT) || ''
        };
    }

    // Save connection settings
    saveConnectionSettings(host, port) {
        if (host !== undefined) {
            localStorage.setItem(this.STORAGE_KEYS.HOST, host);
        }
        if (port !== undefined) {
            localStorage.setItem(this.STORAGE_KEYS.PORT, port);
        }
    }

    // Load single integer parameter
    loadIntParameter(index) {
        const key = this.getIntKey(index);
        const value = localStorage.getItem(key);
        return value !== null ? parseInt(value, 10) : 0;
    }

    // Save single integer parameter
    saveIntParameter(index, value) {
        const key = this.getIntKey(index);
        localStorage.setItem(key, value.toString());
    }

    // Load all integer parameters (excluding command int)
    loadAllIntParameters(count, excludeIndex = null) {
        const params = {};
        for (let i = 0; i < count; i++) {
            if (i !== excludeIndex) {
                params[i] = this.loadIntParameter(i);
            }
        }
        return params;
    }

    // Save all integer parameters (excluding command int)
    saveAllIntParameters(params, excludeIndex = null) {
        Object.keys(params).forEach(index => {
            const idx = parseInt(index, 10);
            if (idx !== excludeIndex) {
                this.saveIntParameter(idx, params[index]);
            }
        });
    }

    // Load auto-send setting
    loadAutoSendEnabled() {
        const value = localStorage.getItem(this.STORAGE_KEYS.AUTO_SEND);
        return value === 'true';
    }

    // Save auto-send setting
    saveAutoSendEnabled(enabled) {
        localStorage.setItem(this.STORAGE_KEYS.AUTO_SEND, enabled.toString());
    }

    // Clear all settings
    clearAllSettings() {
        Object.values(this.STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        // Clear integer parameters (assuming max 16)
        for (let i = 0; i < 16; i++) {
            localStorage.removeItem(this.getIntKey(i));
        }
    }

    // Listen for storage changes from other windows
    onStorageChange(callback) {
        window.addEventListener('storage', (event) => {
            if (event.key) {
                callback({
                    key: event.key,
                    oldValue: event.oldValue,
                    newValue: event.newValue
                });
            }
        });
    }
}

// Export singleton instance
const settingsManager = new SettingsManager();

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.settingsManager = settingsManager;
}
