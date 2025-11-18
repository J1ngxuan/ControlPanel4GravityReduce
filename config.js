// Application Configuration Constants

const CONFIG = {
    // Data structure constants
    BOOL_COUNT: 40,
    INT_SEND_COUNT: 16,
    INT_RECEIVE_COUNT: 10,

    // Byte sizes
    EXPECTED_RECEIVE_SIZE: 26, // 5 bytes (40 packed bools) + 1 byte (padding) + 20 bytes (10 ints)
    EXPECTED_SEND_SIZE: 32,    // 16 ints * 2 bytes

    // Communication settings
    AUTO_SEND_RATE_HZ: 50,
    AUTO_SEND_INTERVAL_MS: 20, // 1000ms / 50Hz
    CONNECTION_TIMEOUT_MS: 5000,

    // Integer value constraints
    INT_MIN_VALUE: 0,
    INT_MAX_VALUE: 65535, // 16-bit unsigned max

    // Command parameter index
    COMMAND_INT_INDEX: 9, // int-9 is the command parameter

    // UI constants
    MAX_LOG_ENTRIES: 100,

    // Window dimensions
    MAIN_WINDOW: {
        width: 1600,
        height: 900,
        minWidth: 1280,
        minHeight: 720
    },

    SETTINGS_WINDOW: {
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600
    },

    // Boolean status labels
    BOOL_LABELS: [
        'X Pos Complete', 'Y Pos Complete', 'Z Pos Complete',  // 0-2
        'X Calibrated', 'Y Calibrated', 'Z Status',  // 3-5
        'X Servo Active', 'Y Servo Active', 'Z Servo Active',  // 6-8
        'X+ Hard Limit', 'X- Hard Limit', 'Y+ Hard Limit', 'Y- Hard Limit',  // 9-12
        'X+ Soft Limit', 'X- Soft Limit', 'Y Soft Status', 'Z Soft Status',  // 13-16
        'Force Exp Active', 'Precision Align', 'Abs Pos Move', 'Emergency Stop',  // 17-20
        'Status 21', 'Status 22', 'Status 23', 'Status 24',  // 21-24
        'Status 25', 'Status 26', 'Status 27', 'Status 28',  // 25-28
        'Status 29', 'Status 30', 'Status 31', 'Status 32',  // 29-32
        'Status 33', 'Status 34', 'Status 35', 'Status 36',  // 33-36
        'Status 37', 'Status 38', 'Status 39', 'Status 40'   // 37-39
    ],

    // Integer status labels
    INT_LABELS: [
        'Current X Pos', 'Current Y Pos', 'Current Z Pos',  // 0-2
        'Current Speed', 'Force Value', 'Tension Value',    // 3-5
        'Status Int 6', 'Status Int 7', 'Status Int 8', 'Status Int 9'  // 6-9
    ]
};

// Export for both Node.js (main process) and browser (renderer)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}
