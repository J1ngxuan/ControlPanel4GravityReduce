/**
 * Speed Mode Handler Module
 * Manages the conditional logic for Speed Mode and Target Speed
 *
 * Speed Mode Logic:
 * - 0: Low Speed (Preset) - Target Speed disabled
 * - 1: Med Speed (Preset) - Target Speed disabled
 * - 2: High Speed (Preset) - Target Speed disabled
 * - 3: Custom 2D Speed - Target Speed enabled, label changes
 * - 4: Custom Force Speed - Target Speed enabled, label changes
 */

class SpeedModeHandler {
    constructor() {
        this.speedModeSelect = null;
        this.targetSpeedInput = null;
        this.targetSpeedLabel = null;
        this.presetNote = null;
        this.initialized = false;
    }

    /**
     * Initialize the speed mode handler
     */
    init() {
        // Get DOM elements
        this.speedModeSelect = document.getElementById('int-0');
        this.targetSpeedInput = document.getElementById('int-1');
        this.targetSpeedLabel = document.getElementById('target-speed-label');
        this.presetNote = document.getElementById('speed-preset-note');

        // Check if we're on the settings page
        if (!this.speedModeSelect || !this.targetSpeedInput || !this.targetSpeedLabel) {
            // Not on settings page, skip initialization
            return;
        }

        this.initialized = true;

        // Update option text based on current language
        this.updateOptionsText();

        // Set initial state based on current Speed Mode value
        this.updateTargetSpeedState();

        // Listen for Speed Mode changes
        this.speedModeSelect.addEventListener('change', () => {
            this.updateTargetSpeedState();
        });

        // Listen for language changes to update labels and options
        window.addEventListener('languageChanged', () => {
            this.updateOptionsText();
            this.updateTargetSpeedState();
        });
    }

    /**
     * Update option text based on current language
     */
    updateOptionsText() {
        if (!this.initialized) return;

        const t = (key) => typeof window.t === 'function' ? window.t(key) : key;
        const options = this.speedModeSelect.options;

        if (options[0]) options[0].textContent = t('speedModeLow');
        if (options[1]) options[1].textContent = t('speedModeMed');
        if (options[2]) options[2].textContent = t('speedModeHigh');
        if (options[3]) options[3].textContent = t('speedModeCustom2D');
        if (options[4]) options[4].textContent = t('speedModeCustomForce');
    }

    /**
     * Update Target Speed input state based on Speed Mode
     */
    updateTargetSpeedState() {
        if (!this.initialized) return;

        const speedMode = parseInt(this.speedModeSelect.value);
        const t = (key) => typeof window.t === 'function' ? window.t(key) : key;

        if (speedMode === 0 || speedMode === 1 || speedMode === 2) {
            // Preset modes: Disable Target Speed
            this.targetSpeedInput.disabled = true;
            this.targetSpeedLabel.textContent = t('targetSpeed');
            this.targetSpeedLabel.setAttribute('data-i18n', 'targetSpeed');
            if (this.presetNote) {
                this.presetNote.style.display = 'block';
            }
        } else if (speedMode === 3) {
            // Custom 2D Speed mode: Enable Target Speed
            this.targetSpeedInput.disabled = false;
            this.targetSpeedLabel.textContent = t('custom2DSpeed');
            this.targetSpeedLabel.setAttribute('data-i18n', 'custom2DSpeed');
            if (this.presetNote) {
                this.presetNote.style.display = 'none';
            }
        } else if (speedMode === 4) {
            // Custom Force Speed mode: Enable Target Speed
            this.targetSpeedInput.disabled = false;
            this.targetSpeedLabel.textContent = t('customForceSpeed');
            this.targetSpeedLabel.setAttribute('data-i18n', 'customForceSpeed');
            if (this.presetNote) {
                this.presetNote.style.display = 'none';
            }
        }
    }

    /**
     * Get current Speed Mode value
     * @returns {number} Speed Mode (0-4)
     */
    getSpeedMode() {
        if (!this.initialized) return 0;
        return parseInt(this.speedModeSelect.value);
    }

    /**
     * Set Speed Mode value
     * @param {number} mode - Speed Mode (0-4)
     */
    setSpeedMode(mode) {
        if (!this.initialized) return;
        this.speedModeSelect.value = mode;
        this.updateTargetSpeedState();
    }
}

// Export singleton instance
const speedModeHandler = new SpeedModeHandler();
export default speedModeHandler;
