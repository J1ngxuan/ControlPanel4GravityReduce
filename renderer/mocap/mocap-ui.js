/**
 * Motion Capture UI Controller
 * Handles UI interactions for the Motion Capture tab
 */

import stateManager from '../core/state-manager.js';
import eventBus, { Events } from '../core/event-bus.js';
import logger from '../core/logger.js';
import mocapReceiver from './mocap-receiver.js';
import mocapProcessor from './mocap-processor.js';

class MocapUI {
    constructor() {
        // DOM elements
        this.multicastInput = null;
        this.portInput = null;
        this.connectBtn = null;
        this.disconnectBtn = null;
        this.statusIndicator = null;
        this.fpsValue = null;
        this.enableToggle = null;
        this.enableIndicator = null;
        this.rigidBodySelect = null;
        this.offsetXInput = null;
        this.offsetYInput = null;
        this.offsetZInput = null;

        // Display elements
        this.posX = null;
        this.posY = null;
        this.posZ = null;
        this.velX = null;
        this.velY = null;
        this.velZ = null;
        this.int10 = null;
        this.int11 = null;
        this.int12 = null;
        this.int13 = null;
        this.int14 = null;
        this.int15 = null;
        this.rawPos = null;
        this.rawVel = null;
    }

    /**
     * Initialize the mocap UI
     */
    init() {
        // Get DOM elements
        this.multicastInput = document.getElementById('mocap-multicast');
        this.portInput = document.getElementById('mocap-port');
        this.connectBtn = document.getElementById('mocap-connect-btn');
        this.disconnectBtn = document.getElementById('mocap-disconnect-btn');
        this.statusIndicator = document.getElementById('mocap-status-indicator');
        this.fpsValue = document.getElementById('mocap-fps-value');
        this.enableToggle = document.getElementById('mocap-enable-toggle');
        this.enableIndicator = document.getElementById('mocap-enable-indicator');
        this.rigidBodySelect = document.getElementById('mocap-rigid-body-select');
        this.offsetXInput = document.getElementById('mocap-offset-x');
        this.offsetYInput = document.getElementById('mocap-offset-y');
        this.offsetZInput = document.getElementById('mocap-offset-z');

        // Display elements
        this.posX = document.getElementById('mocap-pos-x');
        this.posY = document.getElementById('mocap-pos-y');
        this.posZ = document.getElementById('mocap-pos-z');
        this.velX = document.getElementById('mocap-vel-x');
        this.velY = document.getElementById('mocap-vel-y');
        this.velZ = document.getElementById('mocap-vel-z');
        this.int10 = document.getElementById('mocap-int-10');
        this.int11 = document.getElementById('mocap-int-11');
        this.int12 = document.getElementById('mocap-int-12');
        this.int13 = document.getElementById('mocap-int-13');
        this.int14 = document.getElementById('mocap-int-14');
        this.int15 = document.getElementById('mocap-int-15');
        this.rawPos = document.getElementById('mocap-raw-pos');
        this.rawVel = document.getElementById('mocap-raw-vel');

        // Load saved settings
        this.loadSettings();

        // Setup event listeners
        this.setupEventListeners();

        // Subscribe to state changes
        this.subscribeToStateChanges();

        // Subscribe to events
        this.subscribeToEvents();

        logger.info('MocapUI initialized');
    }

    /**
     * Load saved settings from localStorage
     */
    loadSettings() {
        // Load connection settings
        const savedMulticast = localStorage.getItem('mocap-multicast');
        const savedPort = localStorage.getItem('mocap-port');

        if (savedMulticast && this.multicastInput) {
            this.multicastInput.value = savedMulticast;
        }
        if (savedPort && this.portInput) {
            this.portInput.value = savedPort;
        }

        // Load offset settings
        const offsets = mocapProcessor.getOffsets();
        if (this.offsetXInput) this.offsetXInput.value = offsets.x;
        if (this.offsetYInput) this.offsetYInput.value = offsets.y;
        if (this.offsetZInput) this.offsetZInput.value = offsets.z;

        // Load enable state
        const enabled = mocapProcessor.isEnabled();
        if (this.enableToggle) {
            this.enableToggle.checked = enabled;
        }
        this.updateEnableIndicator(enabled);

        // Load selected rigid body
        const selectedRigidBody = localStorage.getItem('mocap-selected-rigid-body');
        if (selectedRigidBody !== null) {
            stateManager.set('mocapSelectedRigidBody', parseInt(selectedRigidBody));
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        if (this.multicastInput) {
            localStorage.setItem('mocap-multicast', this.multicastInput.value);
        }
        if (this.portInput) {
            localStorage.setItem('mocap-port', this.portInput.value);
        }
    }

    /**
     * Setup event listeners for UI elements
     */
    setupEventListeners() {
        // Connect button
        if (this.connectBtn) {
            this.connectBtn.addEventListener('click', () => this.handleConnect());
        }

        // Disconnect button
        if (this.disconnectBtn) {
            this.disconnectBtn.addEventListener('click', () => this.handleDisconnect());
        }

        // Enable toggle
        if (this.enableToggle) {
            this.enableToggle.addEventListener('change', () => this.handleEnableToggle());
        }

        // Rigid body select
        if (this.rigidBodySelect) {
            this.rigidBodySelect.addEventListener('change', () => this.handleRigidBodyChange());
        }

        // Offset inputs
        if (this.offsetXInput) {
            this.offsetXInput.addEventListener('change', () => {
                mocapProcessor.setOffsetX(this.offsetXInput.value);
            });
        }
        if (this.offsetYInput) {
            this.offsetYInput.addEventListener('change', () => {
                mocapProcessor.setOffsetY(this.offsetYInput.value);
            });
        }
        if (this.offsetZInput) {
            this.offsetZInput.addEventListener('change', () => {
                mocapProcessor.setOffsetZ(this.offsetZInput.value);
            });
        }

        // Save settings on input change
        if (this.multicastInput) {
            this.multicastInput.addEventListener('change', () => this.saveSettings());
        }
        if (this.portInput) {
            this.portInput.addEventListener('change', () => this.saveSettings());
        }
    }

    /**
     * Subscribe to state changes
     */
    subscribeToStateChanges() {
        // FPS updates
        stateManager.subscribe('mocapFps', (fps) => {
            if (this.fpsValue) {
                this.fpsValue.textContent = fps;
            }
        });

        // Receiving status
        stateManager.subscribe('mocapReceiving', (receiving) => {
            this.updateConnectionStatus(receiving);
        });

        // Position updates
        stateManager.subscribe('mocapPosition', (position) => {
            this.updatePositionDisplay(position);
        });

        // Velocity updates
        stateManager.subscribe('mocapVelocity', (velocity) => {
            this.updateVelocityDisplay(velocity);
        });

        // Raw position
        stateManager.subscribe('mocapRawPosition', (position) => {
            this.updateRawPositionDisplay(position);
        });

        // Raw velocity
        stateManager.subscribe('mocapRawVelocity', (velocity) => {
            this.updateRawVelocityDisplay(velocity);
        });
    }

    /**
     * Subscribe to event bus events
     */
    subscribeToEvents() {
        // Rigid bodies list updated
        eventBus.on(Events.MOCAP_RIGID_BODIES_UPDATED, (rigidBodies) => {
            this.updateRigidBodySelect(rigidBodies);
        });

        // Data processed event - update int displays
        eventBus.on(Events.MOCAP_DATA_PROCESSED, (data) => {
            this.updateIntDisplays(data);
        });
    }

    /**
     * Handle connect button click
     */
    async handleConnect() {
        this.connectBtn.disabled = true;
        this.saveSettings();

        const options = {
            multicastGroup: this.multicastInput ? this.multicastInput.value : '239.239.239.52',
            port: this.portInput ? parseInt(this.portInput.value) : 5231
        };

        const result = await mocapReceiver.start(options);

        if (!result.success) {
            this.connectBtn.disabled = false;
        }
    }

    /**
     * Handle disconnect button click
     */
    async handleDisconnect() {
        await mocapReceiver.stop();
    }

    /**
     * Handle enable toggle change
     */
    handleEnableToggle() {
        const enabled = this.enableToggle.checked;

        if (enabled) {
            mocapProcessor.enable();
        } else {
            mocapProcessor.disable();
        }

        this.updateEnableIndicator(enabled);
    }

    /**
     * Handle rigid body selection change
     */
    handleRigidBodyChange() {
        const value = this.rigidBodySelect.value;

        if (value === '') {
            stateManager.set('mocapSelectedRigidBody', null);
            localStorage.removeItem('mocap-selected-rigid-body');
        } else {
            const id = parseInt(value);
            stateManager.set('mocapSelectedRigidBody', id);
            localStorage.setItem('mocap-selected-rigid-body', id.toString());
        }
    }

    /**
     * Update connection status UI
     * @param {boolean} connected - Whether connected
     */
    updateConnectionStatus(connected) {
        if (this.statusIndicator) {
            if (connected) {
                this.statusIndicator.textContent = window.t('connected');
                this.statusIndicator.className = 'status-connected';
            } else {
                this.statusIndicator.textContent = window.t('disconnected');
                this.statusIndicator.className = 'status-disconnected';
            }
        }

        if (this.connectBtn) {
            this.connectBtn.disabled = connected;
        }
        if (this.disconnectBtn) {
            this.disconnectBtn.disabled = !connected;
        }
    }

    /**
     * Update enable indicator
     * @param {boolean} enabled - Whether enabled
     */
    updateEnableIndicator(enabled) {
        if (this.enableIndicator) {
            this.enableIndicator.textContent = window.t(enabled ? 'on' : 'off');
            this.enableIndicator.className = enabled
                ? 'auto-send-indicator active'
                : 'auto-send-indicator';
        }
    }

    /**
     * Update rigid body select dropdown
     * @param {Array} rigidBodies - List of rigid bodies
     */
    updateRigidBodySelect(rigidBodies) {
        if (!this.rigidBodySelect) return;

        const currentSelection = stateManager.get('mocapSelectedRigidBody');

        // Clear existing options except the first one
        while (this.rigidBodySelect.options.length > 1) {
            this.rigidBodySelect.remove(1);
        }

        // Add new options
        rigidBodies.forEach(rb => {
            const option = document.createElement('option');
            option.value = rb.id;
            option.textContent = `${rb.name} (ID: ${rb.id})${rb.trackingValid ? '' : ' [Invalid]'}`;
            this.rigidBodySelect.appendChild(option);
        });

        // Restore selection
        if (currentSelection !== null) {
            this.rigidBodySelect.value = currentSelection;
        }
    }

    /**
     * Update position display (signed values with +/-)
     * @param {Object} position - { x, y, z }
     */
    updatePositionDisplay(position) {
        if (this.posX) this.posX.textContent = this.formatSigned(position.x);
        if (this.posY) this.posY.textContent = this.formatSigned(position.y);
        if (this.posZ) this.posZ.textContent = this.formatSigned(position.z);
    }

    /**
     * Update velocity display (signed values with +/-)
     * @param {Object} velocity - { x, y, z }
     */
    updateVelocityDisplay(velocity) {
        if (this.velX) this.velX.textContent = this.formatSigned(velocity.x);
        if (this.velY) this.velY.textContent = this.formatSigned(velocity.y);
        if (this.velZ) this.velZ.textContent = this.formatSigned(velocity.z);
    }

    /**
     * Format a number with explicit +/- sign
     * @param {number} value - The value to format
     * @returns {string} Formatted string with sign
     */
    formatSigned(value) {
        if (value > 0) {
            return '+' + value;
        }
        return value.toString();
    }

    /**
     * Update raw position display (with +/- sign)
     * @param {Object} position - { x, y, z }
     */
    updateRawPositionDisplay(position) {
        if (this.rawPos) {
            const x = position.x >= 0 ? '+' + position.x.toFixed(2) : position.x.toFixed(2);
            const y = position.y >= 0 ? '+' + position.y.toFixed(2) : position.y.toFixed(2);
            const z = position.z >= 0 ? '+' + position.z.toFixed(2) : position.z.toFixed(2);
            this.rawPos.textContent = `X: ${x}, Y: ${y}, Z: ${z}`;
        }
    }

    /**
     * Update raw velocity display (with +/- sign)
     * @param {Object} velocity - { x, y, z }
     */
    updateRawVelocityDisplay(velocity) {
        if (this.rawVel) {
            const x = velocity.x >= 0 ? '+' + velocity.x.toFixed(2) : velocity.x.toFixed(2);
            const y = velocity.y >= 0 ? '+' + velocity.y.toFixed(2) : velocity.y.toFixed(2);
            const z = velocity.z >= 0 ? '+' + velocity.z.toFixed(2) : velocity.z.toFixed(2);
            this.rawVel.textContent = `X: ${x}, Y: ${y}, Z: ${z}`;
        }
    }

    /**
     * Update int-10 to int-15 displays (unsigned values for PLC)
     * @param {Object} data - Processed data
     */
    updateIntDisplays(data) {
        const { positionUnsigned, velocityUnsigned } = data;

        if (positionUnsigned && velocityUnsigned) {
            if (this.int10) this.int10.textContent = positionUnsigned.x;
            if (this.int11) this.int11.textContent = positionUnsigned.y;
            if (this.int12) this.int12.textContent = positionUnsigned.z;
            if (this.int13) this.int13.textContent = velocityUnsigned.x;
            if (this.int14) this.int14.textContent = velocityUnsigned.y;
            if (this.int15) this.int15.textContent = velocityUnsigned.z;
        }
    }
}

// Export singleton instance
const mocapUI = new MocapUI();

// For debugging in browser console
if (typeof window !== 'undefined') {
    window.__mocapUI = mocapUI;
}

export default mocapUI;
