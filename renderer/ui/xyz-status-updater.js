/**
 * XYZ Status Updater
 * Updates the XYZ Motion Control panel indicators from received PLC data
 */

import eventBus, { Events } from '../core/event-bus.js';

/**
 * Boolean index mappings from locales.js boolLabels array:
 * Index 2-7: Translate X+/X-/Y+/Y-/Z+/Z-
 * Index 8-10: Pos Move Start X/Y/Z
 * Index 11-13: Pos Complete X/Y/Z
 * Index 14-15: Calibrated X/Y
 * Index 16-18: Power X/Y/Z (2D Power X, 2D Power Y, Force Power Z)
 * Index 19-21: Servo X/Y/Z (2D Servo X, 2D Servo Y, Force Servo Z)
 * Index 22-25: Hard Limits X+/X-/Y+/Y-
 * Index 33-36: Soft Limits X+/X-/Y+/Y-
 * Index 37-38: Force Soft Limit Z+/Z-
 */
const BOOL_INDICES = {
    // Translate status
    TRANSLATE_XP: 2,
    TRANSLATE_XM: 3,
    TRANSLATE_YP: 4,
    TRANSLATE_YM: 5,
    TRANSLATE_ZP: 6,
    TRANSLATE_ZM: 7,
    // Position move
    POS_MOVE_X_START: 8,
    POS_MOVE_Y_START: 9,
    POS_MOVE_Z_START: 10,
    POS_MOVE_X_COMPLETE: 11,
    POS_MOVE_Y_COMPLETE: 12,
    POS_MOVE_Z_COMPLETE: 13,
    // Calibration
    CALIBRATED_X: 14,
    CALIBRATED_Y: 15,
    // Power
    POWER_X: 16,
    POWER_Y: 17,
    POWER_Z: 18,
    // Servo
    SERVO_X: 19,
    SERVO_Y: 20,
    SERVO_Z: 21,
    // Hard limits
    HARD_LIMIT_XP: 22,
    HARD_LIMIT_XM: 23,
    HARD_LIMIT_YP: 24,
    HARD_LIMIT_YM: 25,
    // Soft limits
    SOFT_LIMIT_XP: 33,
    SOFT_LIMIT_XM: 34,
    SOFT_LIMIT_YP: 35,
    SOFT_LIMIT_YM: 36,
    SOFT_LIMIT_ZP: 37,
    SOFT_LIMIT_ZM: 38
};

/**
 * Integer index mappings from locales.js intLabels array:
 * Index 0: 2D Position X
 * Index 1: 2D Position Y
 * Index 2: Force Position Z
 * Index 5: 2D Velocity X
 * Index 6: 2D Velocity Y
 * Index 7: Force Velocity Z
 */
const INT_INDICES = {
    POS_X: 0,
    POS_Y: 1,
    POS_Z: 2,
    VEL_X: 5,
    VEL_Y: 6,
    VEL_Z: 7
};

class XYZStatusUpdater {
    constructor() {
        this.initialized = false;
        // Track previous state to detect transitions
        this.prevMoveState = { x: null, y: null, z: null };
    }

    /**
     * Initialize the XYZ status updater
     */
    init() {
        // Subscribe to data events
        eventBus.on(Events.BOOLEANS_UPDATED, ({ bools }) => {
            this.updateBooleanIndicators(bools);
        });

        eventBus.on(Events.INTEGERS_UPDATED, ({ ints }) => {
            this.updateIntegerDisplays(ints);
        });

        this.initialized = true;
    }

    /**
     * Update boolean-based indicators
     * @param {boolean[]} bools - Array of 40 booleans
     */
    updateBooleanIndicators(bools) {
        if (!bools || bools.length < 40) return;

        // Update Power indicators
        this.setIndicatorActive('xyz-power-x', bools[BOOL_INDICES.POWER_X]);
        this.setIndicatorActive('xyz-power-y', bools[BOOL_INDICES.POWER_Y]);
        this.setIndicatorActive('xyz-power-z', bools[BOOL_INDICES.POWER_Z]);

        // Update Servo indicators
        this.setIndicatorActive('xyz-servo-x', bools[BOOL_INDICES.SERVO_X]);
        this.setIndicatorActive('xyz-servo-y', bools[BOOL_INDICES.SERVO_Y]);
        this.setIndicatorActive('xyz-servo-z', bools[BOOL_INDICES.SERVO_Z]);

        // Update Calibration indicators
        this.setIndicatorActive('xyz-cal-x', bools[BOOL_INDICES.CALIBRATED_X]);
        this.setIndicatorActive('xyz-cal-y', bools[BOOL_INDICES.CALIBRATED_Y]);

        // Update Soft Limit indicators
        this.setLimitActive('xyz-soft-xp', bools[BOOL_INDICES.SOFT_LIMIT_XP]);
        this.setLimitActive('xyz-soft-xm', bools[BOOL_INDICES.SOFT_LIMIT_XM]);
        this.setLimitActive('xyz-soft-yp', bools[BOOL_INDICES.SOFT_LIMIT_YP]);
        this.setLimitActive('xyz-soft-ym', bools[BOOL_INDICES.SOFT_LIMIT_YM]);
        this.setLimitActive('xyz-soft-zp', bools[BOOL_INDICES.SOFT_LIMIT_ZP]);
        this.setLimitActive('xyz-soft-zm', bools[BOOL_INDICES.SOFT_LIMIT_ZM]);

        // Update Hard Limit indicators
        this.setLimitActive('xyz-hard-xp', bools[BOOL_INDICES.HARD_LIMIT_XP]);
        this.setLimitActive('xyz-hard-xm', bools[BOOL_INDICES.HARD_LIMIT_XM]);
        this.setLimitActive('xyz-hard-yp', bools[BOOL_INDICES.HARD_LIMIT_YP]);
        this.setLimitActive('xyz-hard-ym', bools[BOOL_INDICES.HARD_LIMIT_YM]);

        // Update Translate indicators
        this.setTranslateActive('xyz-trans-xp', bools[BOOL_INDICES.TRANSLATE_XP]);
        this.setTranslateActive('xyz-trans-xm', bools[BOOL_INDICES.TRANSLATE_XM]);
        this.setTranslateActive('xyz-trans-yp', bools[BOOL_INDICES.TRANSLATE_YP]);
        this.setTranslateActive('xyz-trans-ym', bools[BOOL_INDICES.TRANSLATE_YM]);
        this.setTranslateActive('xyz-trans-zp', bools[BOOL_INDICES.TRANSLATE_ZP]);
        this.setTranslateActive('xyz-trans-zm', bools[BOOL_INDICES.TRANSLATE_ZM]);

        // Update Position Move Status with single animated indicator
        this.updatePositionMoveStatus('xyz-status-x',
            bools[BOOL_INDICES.POS_MOVE_X_START],
            bools[BOOL_INDICES.POS_MOVE_X_COMPLETE],
            'x'
        );
        this.updatePositionMoveStatus('xyz-status-y',
            bools[BOOL_INDICES.POS_MOVE_Y_START],
            bools[BOOL_INDICES.POS_MOVE_Y_COMPLETE],
            'y'
        );
        this.updatePositionMoveStatus('xyz-status-z',
            bools[BOOL_INDICES.POS_MOVE_Z_START],
            bools[BOOL_INDICES.POS_MOVE_Z_COMPLETE],
            'z'
        );
    }

    /**
     * Update integer-based displays
     * @param {number[]} ints - Array of 10 integers
     */
    updateIntegerDisplays(ints) {
        if (!ints || ints.length < 10) return;

        // Update Position displays
        this.setTextContent('xyz-pos-x', ints[INT_INDICES.POS_X]);
        this.setTextContent('xyz-pos-y', ints[INT_INDICES.POS_Y]);
        this.setTextContent('xyz-pos-z', ints[INT_INDICES.POS_Z]);

        // Update Velocity displays
        this.setTextContent('xyz-vel-x', ints[INT_INDICES.VEL_X]);
        this.setTextContent('xyz-vel-y', ints[INT_INDICES.VEL_Y]);
        this.setTextContent('xyz-vel-z', ints[INT_INDICES.VEL_Z]);
    }

    /**
     * Set indicator active state (for Power, Servo, Calibration)
     * @param {string} id - Element ID
     * @param {boolean} isActive - Whether indicator should be active
     */
    setIndicatorActive(id, isActive) {
        const element = document.getElementById(id);
        if (!element) return;

        if (isActive) {
            element.classList.add('active');
        } else {
            element.classList.remove('active');
        }
    }

    /**
     * Set limit indicator active state (for soft/hard limits)
     * Uses same method as setIndicatorActive - CSS handles different colors
     * @param {string} id - Element ID
     * @param {boolean} isActive - Whether limit is triggered
     */
    setLimitActive(id, isActive) {
        this.setIndicatorActive(id, isActive);
    }

    /**
     * Set translate indicator active state
     * Uses same method as setIndicatorActive - CSS handles colors
     * @param {string} id - Element ID
     * @param {boolean} isActive - Whether translating in this direction
     */
    setTranslateActive(id, isActive) {
        this.setIndicatorActive(id, isActive);
    }

    /**
     * Update single position move status indicator with animation
     * States: idle (●), moving (pulsing ●), complete (● green glow)
     * @param {string} id - Element ID
     * @param {boolean} isMoving - Whether position move is in progress
     * @param {boolean} isComplete - Whether position move is complete
     * @param {string} axis - Axis identifier ('x', 'y', 'z') for state tracking
     */
    updatePositionMoveStatus(id, isMoving, isComplete, axis) {
        const element = document.getElementById(id);
        if (!element) return;

        // Determine current state
        let currentState = 'idle';
        if (isMoving && !isComplete) {
            currentState = 'moving';
        } else if (isComplete) {
            currentState = 'complete';
        }

        // Check if state changed
        const prevState = this.prevMoveState[axis];

        // Remove all state classes
        element.classList.remove('moving', 'complete');

        // Apply new state
        if (currentState === 'moving') {
            element.classList.add('moving');
        } else if (currentState === 'complete') {
            element.classList.add('complete');
        }

        // Update previous state
        this.prevMoveState[axis] = currentState;
    }

    /**
     * Set text content of an element
     * @param {string} id - Element ID
     * @param {number|string} value - Value to display
     */
    setTextContent(id, value) {
        const element = document.getElementById(id);
        if (!element) return;

        element.textContent = value;
    }
}

// Export singleton instance
const xyzStatusUpdater = new XYZStatusUpdater();

// For debugging in browser console
if (typeof window !== 'undefined') {
    window.__xyzStatusUpdater = xyzStatusUpdater;
}

export default xyzStatusUpdater;
