/**
 * Motion Capture Receiver
 * Handles receiving Nokov motion capture data via UDP multicast
 * Uses nokov-mocap-reader npm package
 */

import stateManager from '../core/state-manager.js';
import eventBus, { Events } from '../core/event-bus.js';
import logger from '../core/logger.js';

class MocapReceiver {
    constructor() {
        this.electronAPI = null;
        this.isReceiving = false;
        this.selectedRigidBodyId = null;
        this.lastFrameTime = null;
        this.frameCount = 0;
        this.fps = 0;
        this.fpsUpdateInterval = null;
    }

    /**
     * Initialize the mocap receiver
     * @param {Object} electronAPI - The Electron API from preload
     */
    init(electronAPI) {
        this.electronAPI = electronAPI;

        // Listen for mocap frame data from main process
        if (this.electronAPI && this.electronAPI.onMocapFrame) {
            this.electronAPI.onMocapFrame((frameData) => {
                this.handleFrame(frameData);
            });
        }

        // Listen for mocap status updates
        if (this.electronAPI && this.electronAPI.onMocapStatus) {
            this.electronAPI.onMocapStatus((status) => {
                this.handleStatusUpdate(status);
            });
        }

        // Listen for mocap errors
        if (this.electronAPI && this.electronAPI.onMocapError) {
            this.electronAPI.onMocapError((error) => {
                this.handleError(error);
            });
        }

        // Start FPS counter
        this.startFpsCounter();

        logger.info('MocapReceiver initialized');
    }

    /**
     * Start receiving mocap data
     * @param {Object} options - Connection options
     * @returns {Promise<Object>} Result with success/error
     */
    async start(options = {}) {
        if (this.isReceiving) {
            return { success: false, message: 'Already receiving mocap data' };
        }

        const config = {
            port: options.port || 5231,
            multicastGroup: options.multicastGroup || '239.239.239.52',
            frameTimeout: options.frameTimeout || 50
        };

        try {
            const result = await this.electronAPI.mocapStart(config);

            if (result.success) {
                this.isReceiving = true;
                stateManager.set('mocapReceiving', true);
                eventBus.emit(Events.MOCAP_STARTED, config);
                logger.success(`Mocap receiver started on ${config.multicastGroup}:${config.port}`);
            } else {
                logger.error(`Failed to start mocap receiver: ${result.message}`);
            }

            return result;
        } catch (error) {
            logger.error(`Mocap start error: ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    /**
     * Stop receiving mocap data
     * @returns {Promise<Object>} Result with success/error
     */
    async stop() {
        if (!this.isReceiving) {
            return { success: false, message: 'Not receiving mocap data' };
        }

        try {
            const result = await this.electronAPI.mocapStop();

            if (result.success) {
                this.isReceiving = false;
                stateManager.set('mocapReceiving', false);
                stateManager.set('mocapFps', 0);
                this.fps = 0;
                this.frameCount = 0;
                eventBus.emit(Events.MOCAP_STOPPED);
                logger.info('Mocap receiver stopped');
            }

            return result;
        } catch (error) {
            logger.error(`Mocap stop error: ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    /**
     * Handle incoming mocap frame data
     * @param {Object} frameData - Frame data from Nokov system
     */
    handleFrame(frameData) {
        if (!frameData) return;

        this.frameCount++;
        const now = Date.now();

        // Update last frame time
        this.lastFrameTime = now;

        // Find the selected rigid body
        const selectedId = stateManager.get('mocapSelectedRigidBody');
        let selectedBody = null;

        if (frameData.rigidBodies && frameData.rigidBodies.length > 0) {
            // Update available rigid bodies list
            const rigidBodyList = frameData.rigidBodies.map(rb => ({
                id: rb.id,
                name: rb.name,
                trackingValid: rb.trackingValid
            }));

            // Only update if changed
            const currentList = stateManager.get('mocapRigidBodies');
            if (JSON.stringify(currentList) !== JSON.stringify(rigidBodyList)) {
                stateManager.set('mocapRigidBodies', rigidBodyList);
                eventBus.emit(Events.MOCAP_RIGID_BODIES_UPDATED, rigidBodyList);
            }

            // Find selected rigid body
            if (selectedId !== null && selectedId !== undefined) {
                selectedBody = frameData.rigidBodies.find(rb => rb.id === selectedId);
            }

            // Auto-select first valid rigid body if none selected
            if (!selectedBody && selectedId === null) {
                const firstValid = frameData.rigidBodies.find(rb => rb.trackingValid);
                if (firstValid) {
                    stateManager.set('mocapSelectedRigidBody', firstValid.id);
                    selectedBody = firstValid;
                }
            }
        }

        // Emit frame data for processing
        eventBus.emit(Events.MOCAP_FRAME_RECEIVED, {
            frameId: frameData.frameId,
            timestamp: frameData.timestamp,
            rigidBody: selectedBody,
            rigidBodyCount: frameData.rigidBodyCount || 0,
            markerCount: frameData.markerCount || 0
        });
    }

    /**
     * Handle status updates from main process
     * @param {Object} status - Status update data
     */
    handleStatusUpdate(status) {
        if (status.fps !== undefined) {
            stateManager.set('mocapFps', status.fps);
        }
        if (status.framesReceived !== undefined) {
            stateManager.set('mocapFramesReceived', status.framesReceived);
        }
    }

    /**
     * Handle errors from main process
     * @param {Object} error - Error data
     */
    handleError(error) {
        logger.error(`Mocap error: ${error.message}`);
        eventBus.emit(Events.MOCAP_ERROR, error);
    }

    /**
     * Start FPS counter interval
     */
    startFpsCounter() {
        if (this.fpsUpdateInterval) {
            clearInterval(this.fpsUpdateInterval);
        }

        let lastFrameCount = 0;
        this.fpsUpdateInterval = setInterval(() => {
            if (this.isReceiving) {
                this.fps = this.frameCount - lastFrameCount;
                lastFrameCount = this.frameCount;
                stateManager.set('mocapFps', this.fps);
            }
        }, 1000);
    }

    /**
     * Stop FPS counter interval
     */
    stopFpsCounter() {
        if (this.fpsUpdateInterval) {
            clearInterval(this.fpsUpdateInterval);
            this.fpsUpdateInterval = null;
        }
    }

    /**
     * Set the selected rigid body ID
     * @param {number} id - Rigid body ID to track
     */
    setSelectedRigidBody(id) {
        stateManager.set('mocapSelectedRigidBody', id);
        logger.info(`Selected rigid body ID: ${id}`);
    }

    /**
     * Check if mocap is currently receiving
     * @returns {boolean} True if receiving
     */
    isActive() {
        return this.isReceiving;
    }

    /**
     * Get current FPS
     * @returns {number} Current frames per second
     */
    getFps() {
        return this.fps;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopFpsCounter();
        if (this.isReceiving) {
            this.stop();
        }
    }
}

// Export singleton instance
const mocapReceiver = new MocapReceiver();

// For debugging in browser console
if (typeof window !== 'undefined') {
    window.__mocapReceiver = mocapReceiver;
}

export default mocapReceiver;
