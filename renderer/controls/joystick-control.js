/**
 * Joystick Control Manager
 * Handles XY-axis joystick control with canvas drawing
 */

import stateManager from '../core/state-manager.js';
import eventBus, { Events } from '../core/event-bus.js';
import logger from '../core/logger.js';

// Constants
const JOYSTICK_RADIUS = 80;
const JOYSTICK_HANDLE_RADIUS = 24;
const JOYSTICK_DEADZONE = 0.3; // 30% deadzone in center

// Command mappings
export const COMMANDS = {
    X_PLUS: 7,
    X_MINUS: 8,
    Y_PLUS: 9,
    Y_MINUS: 10,
    Z_PLUS: 11,
    Z_MINUS: 12
};

class JoystickControl {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.statusElement = null;
        this.position = { x: 0, y: 0 }; // Normalized: -1 to 1
        this.isActive = false;
    }

    /**
     * Initialize joystick control
     */
    init() {
        this.canvas = document.getElementById('joystick-canvas');
        this.statusElement = document.getElementById('joystick-status');

        // Only initialize if canvas exists (may not exist in settings window)
        if (!this.canvas) {
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        this.draw();

        this.attachEventListeners();

        // Disable initially (will be enabled on connection)
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.opacity = '0.5';

        // Listen for theme changes to redraw canvas
        window.addEventListener('themeChanged', () => this.draw());

        // Listen for language changes to update status text
        window.addEventListener('languageChanged', () => {
            const currentCmd = stateManager.get('currentCommand');
            if (currentCmd !== undefined) {
                this.updateStatus(currentCmd);
            }
        });

        // Listen for events from other controls
        eventBus.on('joystick:mouseup', () => {
            if (this.isActive) {
                this.handleMouseUp();
            }
        });
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseup', () => this.handleMouseUp());

        // Touch events (for mobile)
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleMouseDown(touch);
        });

        window.addEventListener('touchmove', (e) => {
            if (this.isActive) {
                e.preventDefault();
                const touch = e.touches[0];
                this.handleMouseMove(touch);
            }
        });

        window.addEventListener('touchend', (e) => {
            if (this.isActive) {
                e.preventDefault();
                this.handleMouseUp();
            }
        });
    }

    /**
     * Draw joystick on canvas
     */
    draw() {
        if (!this.ctx || !this.canvas) return;

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Get CSS variable colors for theme support
        const getCSSVar = (varName) => {
            return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        };

        // Draw outer circle (base)
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, JOYSTICK_RADIUS, 0, 2 * Math.PI);
        this.ctx.fillStyle = getCSSVar('--bg-primary');
        this.ctx.fill();
        this.ctx.strokeStyle = getCSSVar('--border-primary');
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Draw deadzone circle
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, JOYSTICK_RADIUS * JOYSTICK_DEADZONE, 0, 2 * Math.PI);
        this.ctx.fillStyle = getCSSVar('--bg-tertiary');
        this.ctx.fill();
        this.ctx.strokeStyle = getCSSVar('--border-secondary');
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Draw crosshair
        this.ctx.strokeStyle = getCSSVar('--border-secondary');
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY - JOYSTICK_RADIUS);
        this.ctx.lineTo(centerX, centerY + JOYSTICK_RADIUS);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - JOYSTICK_RADIUS, centerY);
        this.ctx.lineTo(centerX + JOYSTICK_RADIUS, centerY);
        this.ctx.stroke();

        // Calculate handle position
        const handleX = centerX + this.position.x * (JOYSTICK_RADIUS - JOYSTICK_HANDLE_RADIUS);
        const handleY = centerY - this.position.y * (JOYSTICK_RADIUS - JOYSTICK_HANDLE_RADIUS); // Invert Y for canvas

        // Check if current command is acknowledged
        const currentCommand = stateManager.get('currentCommand');
        const acknowledgedCommand = stateManager.get('acknowledgedCommand');
        const isAcknowledged = this.isActive && (currentCommand === acknowledgedCommand) && (acknowledgedCommand !== 0);

        // Draw line from center to handle if active
        if (this.isActive) {
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.lineTo(handleX, handleY);
            this.ctx.strokeStyle = getCSSVar('--accent-primary');
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }

        // Draw handle (joystick knob) - only show green if acknowledged
        this.ctx.beginPath();
        this.ctx.arc(handleX, handleY, JOYSTICK_HANDLE_RADIUS, 0, 2 * Math.PI);
        this.ctx.fillStyle = isAcknowledged ? getCSSVar('--success-button') : getCSSVar('--accent-primary-dark');
        this.ctx.fill();
        this.ctx.strokeStyle = isAcknowledged ? getCSSVar('--success-border') : getCSSVar('--accent-primary');
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    /**
     * Get joystick position from mouse/touch coordinates
     * @param {number} clientX - Client X coordinate
     * @param {number} clientY - Client Y coordinate
     * @returns {Object} Normalized position {x, y}
     */
    getPosition(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Calculate offset from center
        const offsetX = clientX - centerX;
        const offsetY = -(clientY - centerY); // Invert Y

        // Normalize to -1 to 1 range
        const maxOffset = JOYSTICK_RADIUS - JOYSTICK_HANDLE_RADIUS;
        let normalizedX = offsetX / maxOffset;
        let normalizedY = offsetY / maxOffset;

        // Clamp to circle boundary
        const magnitude = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
        if (magnitude > 1) {
            normalizedX /= magnitude;
            normalizedY /= magnitude;
        }

        return { x: normalizedX, y: normalizedY };
    }

    /**
     * Determine command from joystick position
     * @returns {number} Command ID
     */
    getCommand() {
        const absX = Math.abs(this.position.x);
        const absY = Math.abs(this.position.y);

        // Check if in deadzone
        const magnitude = Math.sqrt(absX * absX + absY * absY);
        if (magnitude < JOYSTICK_DEADZONE) {
            return 0; // No command
        }

        // Determine primary direction (X or Y has larger magnitude)
        if (absX > absY) {
            // X direction is primary
            return this.position.x > 0 ? COMMANDS.X_PLUS : COMMANDS.X_MINUS;
        } else {
            // Y direction is primary
            return this.position.y > 0 ? COMMANDS.Y_PLUS : COMMANDS.Y_MINUS;
        }
    }

    /**
     * Update status display
     * @param {number} command - Command ID
     */
    updateStatus(command) {
        if (!this.statusElement) return;

        // Use translation system for status text
        const t = (key) => {
            return typeof window.t === 'function' ? window.t(key) : key;
        };

        let statusText = t('inactive');

        if (command === COMMANDS.X_PLUS) {
            statusText = `X+ ${t('active')}`;
        } else if (command === COMMANDS.X_MINUS) {
            statusText = `X- ${t('active')}`;
        } else if (command === COMMANDS.Y_PLUS) {
            statusText = `Y+ ${t('active')}`;
        } else if (command === COMMANDS.Y_MINUS) {
            statusText = `Y- ${t('active')}`;
        }

        this.statusElement.textContent = statusText;
        const statusContainer = this.statusElement.parentElement;

        // Only show active state (green) if command is acknowledged
        const acknowledgedCommand = stateManager.get('acknowledgedCommand');
        const isAcknowledged = (command !== 0) && (command === acknowledgedCommand);

        if (isAcknowledged) {
            statusContainer?.classList.add('active');
        } else {
            statusContainer?.classList.remove('active');
        }
    }

    /**
     * Handle mouse/touch down
     * @param {Event} e - Mouse or touch event
     */
    handleMouseDown(e) {
        if (!stateManager.get('isConnected')) return;

        // Prevent slider from being active
        eventBus.emit('slider:reset');

        this.isActive = true;
        stateManager.set('isJoystickActive', true);

        this.position = this.getPosition(e.clientX, e.clientY);
        stateManager.set('joystickPosition', this.position);

        const command = this.getCommand();
        stateManager.set('currentCommand', command);

        this.updateStatus(command);
        this.draw();

        if (command !== 0) {
            eventBus.emit(Events.JOYSTICK_ACTIVE, { command });
        }
    }

    /**
     * Handle mouse/touch move
     * @param {Event} e - Mouse or touch event
     */
    handleMouseMove(e) {
        if (!this.isActive) return;

        this.position = this.getPosition(e.clientX, e.clientY);
        stateManager.set('joystickPosition', this.position);

        const command = this.getCommand();
        const currentCommand = stateManager.get('currentCommand');

        // Only update if command changed
        if (currentCommand !== command) {
            stateManager.set('currentCommand', command);
            stateManager.set('acknowledgedCommand', 0); // Clear acknowledgment for new command

            this.updateStatus(command);

            if (command !== 0) {
                eventBus.emit(Events.JOYSTICK_ACTIVE, { command });
            }
        }

        this.draw();
    }

    /**
     * Handle mouse/touch up
     */
    handleMouseUp() {
        if (!this.isActive) return;

        this.isActive = false;
        stateManager.set('isJoystickActive', false);

        this.position = { x: 0, y: 0 };
        stateManager.set('joystickPosition', { x: 0, y: 0 });
        stateManager.set('currentCommand', 0);
        stateManager.set('acknowledgedCommand', 0);

        this.updateStatus(0);
        this.draw();

        eventBus.emit(Events.JOYSTICK_RELEASED);
    }

    /**
     * Handle connection status change
     * @param {boolean} connected - Connection status
     */
    handleConnectionStatus(connected) {
        if (!this.canvas) return;

        if (connected) {
            this.canvas.style.pointerEvents = 'auto';
            this.canvas.style.opacity = '1';
        } else {
            this.canvas.style.pointerEvents = 'none';
            this.canvas.style.opacity = '0.5';

            // Reset if active
            if (this.isActive) {
                this.handleMouseUp();
            }
        }
    }

    /**
     * Handle command acknowledgment
     * @param {number} acknowledgedCmd - Acknowledged command ID
     */
    handleAcknowledgment(acknowledgedCmd) {
        if (this.isActive) {
            this.updateStatus(acknowledgedCmd);
            this.draw();
        }
    }
}

// Export singleton instance
const joystickControl = new JoystickControl();

// For debugging in browser console
if (typeof window !== 'undefined') {
    window.__joystickControl = joystickControl;
}

export default joystickControl;
