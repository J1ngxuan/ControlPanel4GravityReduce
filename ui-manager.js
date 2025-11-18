// UI Manager - Handles all DOM updates and UI interactions

class UIManager {
    constructor(config) {
        this.config = config;
        this.logContainer = document.getElementById('log');
        this.statusIndicator = document.getElementById('status-indicator');
        this.boolDisplay = document.getElementById('bool-display');
        this.intDisplay = document.getElementById('int-display');
        this.autoSendIndicator = document.getElementById('auto-send-indicator');
    }

    // Check if this is the main window
    isMainWindow() {
        return document.querySelector('.tab-navigation') !== null;
    }

    // Initialize boolean display
    initializeBooleanDisplay() {
        if (!this.boolDisplay) return;

        this.boolDisplay.innerHTML = '';
        for (let i = 0; i < this.config.BOOL_COUNT; i++) {
            const boolItem = document.createElement('div');
            boolItem.className = 'bool-item bool-false';
            boolItem.id = `bool-${i}`;
            boolItem.innerHTML = `
                <div class="bool-label">${this.config.BOOL_LABELS[i]}</div>
                <div class="bool-value">FALSE</div>
            `;
            this.boolDisplay.appendChild(boolItem);
        }
    }

    // Initialize integer display
    initializeIntegerDisplay() {
        if (!this.intDisplay) return;

        this.intDisplay.innerHTML = '';
        for (let i = 0; i < this.config.INT_RECEIVE_COUNT; i++) {
            const intItem = document.createElement('div');
            intItem.className = 'int-item';
            intItem.id = `int-display-${i}`;
            intItem.innerHTML = `
                <div class="int-item-label">${this.config.INT_LABELS[i]}</div>
                <div class="int-item-value">0</div>
            `;
            this.intDisplay.appendChild(intItem);
        }
    }

    // Update boolean display with received data
    updateBooleanDisplay(bools) {
        if (!bools || bools.length !== this.config.BOOL_COUNT) return;

        bools.forEach((value, index) => {
            const boolItem = document.getElementById(`bool-${index}`);
            if (boolItem) {
                const className = value ? 'bool-item bool-true' : 'bool-item bool-false';
                const valueText = value ? 'TRUE' : 'FALSE';

                // Only update if changed (performance optimization)
                if (boolItem.className !== className) {
                    boolItem.className = className;
                    const valueElement = boolItem.querySelector('.bool-value');
                    if (valueElement) {
                        valueElement.textContent = valueText;
                    }
                }
            }
        });
    }

    // Update integer display with received data
    updateIntegerDisplay(ints) {
        if (!ints || ints.length !== this.config.INT_RECEIVE_COUNT) return;

        ints.forEach((value, index) => {
            const intItem = document.getElementById(`int-display-${index}`);
            if (intItem) {
                const valueElement = intItem.querySelector('.int-item-value');
                if (valueElement && valueElement.textContent !== value.toString()) {
                    valueElement.textContent = value;
                }
            }
        });
    }

    // Add log entry
    addLog(message, type = 'info') {
        if (!this.logContainer) {
            console.log(`[${type}] ${message}`);
            return;
        }

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        const timestamp = new Date().toLocaleTimeString();
        logEntry.textContent = `[${timestamp}] ${message}`;
        this.logContainer.appendChild(logEntry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;

        // Keep only last MAX_LOG_ENTRIES
        while (this.logContainer.children.length > this.config.MAX_LOG_ENTRIES) {
            this.logContainer.removeChild(this.logContainer.firstChild);
        }
    }

    // Update connection status UI
    updateConnectionStatus(connected, commandButtons) {
        if (this.statusIndicator) {
            this.statusIndicator.textContent = connected ? 'Connected' : 'Disconnected';
            this.statusIndicator.className = connected ? 'status-connected' : 'status-disconnected';
        }

        // Update button states
        const connectBtn = document.getElementById('connect-btn');
        const disconnectBtn = document.getElementById('disconnect-btn');
        const sendBtn = document.getElementById('send-btn');

        if (connectBtn) connectBtn.disabled = connected;
        if (disconnectBtn) disconnectBtn.disabled = !connected;
        if (sendBtn) sendBtn.disabled = !connected;

        if (commandButtons) {
            commandButtons.forEach(btn => btn.disabled = !connected);
        }
    }

    // Update auto-send indicator
    updateAutoSendIndicator(active) {
        if (!this.autoSendIndicator) return;

        this.autoSendIndicator.textContent = active ? 'ON' : 'OFF';
        this.autoSendIndicator.className = active ? 'auto-send-indicator active' : 'auto-send-indicator';
    }

    // Initialize tabs
    initializeTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        if (tabButtons.length === 0) return;

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;

                // Remove active class from all
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                // Add active class to clicked button and content
                button.classList.add('active');
                const targetContent = document.getElementById(`tab-${targetTab}`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }

                this.addLog(`Switched to ${button.textContent} tab`, 'info');
            });
        });
    }

    // Highlight active command button
    highlightCommandButton(commandButtons, activeCommandId) {
        commandButtons.forEach(btn => {
            const btnCommandId = parseInt(btn.dataset.cmd, 10);
            if (btnCommandId === activeCommandId) {
                btn.classList.add('active-command');
            } else {
                btn.classList.remove('active-command');
            }
        });
    }
}

// Export singleton instance (will be initialized with config)
let uiManager = null;

function initializeUIManager(config) {
    if (!uiManager) {
        uiManager = new UIManager(config);
    }
    return uiManager;
}

function getUIManager() {
    if (!uiManager) {
        throw new Error('UIManager not initialized. Call initializeUIManager first.');
    }
    return uiManager;
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.initializeUIManager = initializeUIManager;
    window.getUIManager = getUIManager;
}
