/**
 * UI Initializers
 * Handles initialization of UI components (tabs, windows controls, displays)
 */

import logger from '../core/logger.js';
import eventBus, { Events } from '../core/event-bus.js';

class UIInitializers {
    constructor() {
        this.electronAPI = null;
    }

    /**
     * Initialize UI components
     * @param {Object} electronAPI - The Electron API from preload
     */
    init(electronAPI) {
        this.electronAPI = electronAPI;

        // Listen for language changes to update displays
        window.addEventListener('languageChanged', () => {
            this.updateDisplayLabels();
        });
    }

    /**
     * Initialize tab switching functionality
     */
    initializeTabs() {
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

                logger.info(`Switched to ${button.textContent} tab`);
                eventBus.emit(Events.TAB_CHANGED, { tab: targetTab });
            });
        });

        logger.info('Tabs initialized');
    }

    /**
     * Initialize settings button
     */
    initializeSettingsButton() {
        const settingsBtn = document.getElementById('settings-btn');

        // Only initialize if settings button exists (doesn't exist in settings window)
        if (settingsBtn) {
            settingsBtn.addEventListener('click', async () => {
                await this.electronAPI.openSettings();
                eventBus.emit(Events.SETTINGS_OPENED);
            });
        }
    }

    /**
     * Initialize window controls (minimize, maximize, close)
     */
    initializeWindowControls() {
        const minBtn = document.getElementById('min-btn');
        const maxBtn = document.getElementById('max-btn');
        const closeBtn = document.getElementById('close-btn');

        // Only initialize if window controls exist (may not exist in settings window)
        if (minBtn) {
            minBtn.addEventListener('click', () => {
                this.electronAPI.windowMinimize();
            });
        }

        if (maxBtn) {
            maxBtn.addEventListener('click', () => {
                this.electronAPI.windowMaximize();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.electronAPI.windowClose();
            });
        }
    }

    /**
     * Initialize boolean and integer displays
     */
    initializeDisplays() {
        const boolDisplay = document.getElementById('bool-display');
        const intDisplay = document.getElementById('int-display');

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

        logger.info('Displays initialized (40 bools, 10 ints)');
    }

    /**
     * Update display labels when language changes (without reinitializing)
     */
    updateDisplayLabels() {
        // Get current language labels
        const currentLang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'en';
        const locales = window.LOCALES || {};
        const labels = locales[currentLang] || locales['en'] || {};
        const boolLabels = labels.boolLabels || [];
        const intLabels = labels.intLabels || [];

        // Update boolean labels
        for (let i = 0; i < 40; i++) {
            const boolItem = document.getElementById(`bool-${i}`);
            if (boolItem) {
                const labelElement = boolItem.querySelector('.bool-label');
                if (labelElement) {
                    labelElement.textContent = boolLabels[i] || `Status ${i+1}`;
                }
            }
        }

        // Update integer labels
        for (let i = 0; i < 10; i++) {
            const intItem = document.getElementById(`int-display-${i}`);
            if (intItem) {
                const labelElement = intItem.querySelector('.int-item-label');
                if (labelElement) {
                    labelElement.textContent = intLabels[i] || `Int ${i}`;
                }
            }
        }

        logger.info('Display labels updated for language change');
    }

    /**
     * Setup input change listeners for auto-save
     * @param {Function} saveCallback - Callback function to call when inputs change
     */
    setupInputListeners(saveCallback) {
        // TCP settings
        const tcpHostInput = document.getElementById('tcp-host');
        const tcpPortInput = document.getElementById('tcp-port');
        const tcpClientPortInput = document.getElementById('tcp-client-port');

        if (tcpHostInput) {
            tcpHostInput.addEventListener('change', saveCallback);
        }
        if (tcpPortInput) {
            tcpPortInput.addEventListener('change', saveCallback);
        }
        if (tcpClientPortInput) {
            tcpClientPortInput.addEventListener('change', saveCallback);
        }

        // UDP settings
        const udpListeningPortInput = document.getElementById('udp-listening-port');
        const udpTargetHostInput = document.getElementById('udp-target-host');
        const udpTargetPortInput = document.getElementById('udp-target-port');

        if (udpListeningPortInput) {
            udpListeningPortInput.addEventListener('change', saveCallback);
        }
        if (udpTargetHostInput) {
            udpTargetHostInput.addEventListener('change', saveCallback);
        }
        if (udpTargetPortInput) {
            udpTargetPortInput.addEventListener('change', saveCallback);
        }

        // Integer inputs (int-0 through int-15)
        for (let i = 0; i < 16; i++) {
            const input = document.getElementById(`int-${i}`);
            if (input && i !== 9) { // Don't listen to int-9 as it's the command
                input.addEventListener('change', saveCallback);
            }
        }

        logger.info('Input listeners set up for auto-save');
    }
}

// Export singleton instance
const uiInitializers = new UIInitializers();

// For debugging in browser console
if (typeof window !== 'undefined') {
    window.__uiInitializers = uiInitializers;
}

export default uiInitializers;
