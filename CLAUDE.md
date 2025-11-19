# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An Electron-based Windows desktop application for controlling gravity reducing equipment via TCP communication with a SIEMENS S7-1200 PLC. The main feature is automatic 50Hz (20ms interval) transmission of 16 control parameters with real-time monitoring of 40 boolean and 10 integer status values.

## Multi-Window Architecture

**CRITICAL**: This is a multi-window Electron app with unified state management:

### Centralized State Management
All application state is managed centrally in main.js using a single source of truth:
```javascript
const appState = {
    connection: { connected: false, error: null },
    theme: 'dark',
    language: 'en',
    tcpData: { bools: [], ints: [] }
};
```

### State Synchronization Pattern
- **Single broadcast function**: `broadcastStateChange(key, value)` updates state and notifies all windows
- **Single query function**: `getAppState()` returns complete state for new windows
- **Single IPC event**: `app-state-changed` with `{ key, value }` payload
- **No localStorage sync**: Settings persist to localStorage but sync via IPC only

### Windows
- Main window (index.html) - primary control interface with commands and controls
- Settings window (settings.html) - configuration interface for parameters

### Implementation
- main.js: Lines 10-49 define state management (appState, broadcastStateChange, getAppState)
- preload.js: Lines 16-53 expose unified API (getAppState, onStateChanged) + backward compatibility
- renderer.js: Lines 1417-1439 query initial state on load
- theme-manager.js & language-manager.js: Use backward-compatible API

## Common Commands

```bash
# Development
npm install          # Install dependencies
npm start           # Run the application
node test-server.js # Run TCP test server (simulates PLC)

# Building
npm run build       # Build Windows installer (NSIS + portable)
npm run build:dir   # Build unpacked for testing
```

## TCP Connection Notes

### Client Port Binding
- **Port 0 (recommended)**: Let the OS auto-assign an available port. No reconnection delays.
- **Specific Port**: When using a fixed client port, Windows keeps it in TIME_WAIT state for 30-120 seconds after disconnect.
  - A 1-second delay is automatically added before reconnection attempts
  - If reconnection fails immediately, wait 30 seconds or use port 0
  - This is standard TCP/IP behavior and cannot be bypassed in Node.js client sockets

### Connection Lifecycle
- `connect()`: Establishes TCP connection with optional client port binding
- `disconnect()`: Graceful shutdown using `end()` + 500ms timeout before `destroy()`
- Socket cleanup includes `removeAllListeners()` to prevent memory leaks
- Connection status syncs across all windows via IPC broadcasts

## TCP Protocol Details

### Data Format (Critical for Development)
**Sent to PLC**: 32 bytes (16 integers × 2 bytes each, big-endian)
- int-9 is the Control Command parameter
- Big-endian conversion in main.js:13-18 (Int2Byte function)

**Received from PLC**: 26 bytes
- Bytes 0-4: 40 booleans bit-packed (8 per byte, LSB to MSB)
- Byte 5: Padding (automatically added by PLC)
- Bytes 6-25: 10 integers (2 bytes each, big-endian)

Parsing logic is in main.js:150-192 (parseReceivedData function).

### Command Acknowledgment Pattern
The PLC echoes received commands back in the 10th received integer (index 9):
- Button commands: Auto-clear when PLC acknowledges (renderer.js handles this)
- Axis movement commands (X+/X-/Y+/Y-/Z+/Z-): Stay highlighted during movement
- See renderer.js for acknowledgment handling logic

## Architecture

### Main Process (main.js)
- Window management and lifecycle
- TCP connection handling (net.Socket)
- Data protocol parsing/formatting (Int2Byte, parseReceivedData)
- IPC handlers for all renderer requests
- Multi-window state synchronization

### Preload (preload.js)
- Security bridge between main and renderer processes
- Exposes electronAPI via contextBridge
- All IPC communication goes through this layer

### Renderer Process (renderer.js)
- Main UI logic and event handling
- 50Hz auto-send timer management (20ms setInterval)
- Command button handling and acknowledgment logic
- Joystick/slider control for manual positioning
- Settings persistence via localStorage
- Real-time status display updates

### Configuration (config.js)
- Centralized constants (byte sizes, timings, labels)
- Used by both main and renderer processes
- Modify BOOL_LABELS and INT_LABELS arrays to change display labels

## Key Implementation Details

### 50Hz Auto-Send Loop
- Critical feature for real-time equipment control
- Located in renderer.js (AUTO_SEND_RATE constant)
- Collects all 16 integer parameters and sends via IPC
- int-9 (COMMAND_INT_INDEX) is automatically updated when command buttons pressed
- Must handle network back-pressure to avoid buffer overflow

### Settings Synchronization
Settings are persisted to localStorage and must sync between windows:
- Connection settings (host, port)
- Integer parameter values (int-0 through int-15, excluding int-9)
- Auto-send toggle state
- Theme preference

When modifying settings, ensure:
1. Save to localStorage in the current window
2. Broadcast via IPC to main process (if needed globally)
3. Main process sends to all windows via `BrowserWindow.getAllWindows()`

### Theme Management
Two themes: 'dark' and 'bright' (not 'light')
- Global state stored in main.js:10
- Syncs across all windows via 'theme-changed' IPC event
- Theme toggle buttons in both index.html and settings.html
- CSS classes applied to body element

### Custom Window Controls
Main window uses frameless design (frame: false):
- Custom titlebar in index.html
- Window control handlers in main.js:249-263
- Theme toggle integrated into titlebar

## Testing

Use test-server.js to simulate PLC behavior:
- Listens on localhost:8080
- Echoes commands back in 10th integer after ~200ms delay (10 cycles at 50Hz)
- Generates bit-packed boolean responses
- Useful for testing command acknowledgment logic

## File Organization

Core application files:
- main.js - Main Electron process
- renderer.js - UI logic and control
- preload.js - IPC security bridge
- config.js - Shared configuration
- index.html - Main control interface
- settings.html - Configuration interface
- styles.css - Application styling

Modular alternatives (not currently used):
- renderer-refactored.js - Modular version of renderer
- connection-manager.js, data-handler.js, ui-manager.js - Separated concerns
- validation.js, settings-manager.js, theme-manager.js - Utility modules

## Important Patterns

### Adding New State Properties
To add a new state property that syncs across windows:
1. Add to `appState` object in main.js (line 12-23)
2. Update state: Call `broadcastStateChange('propertyName', value)` anywhere in main.js
3. Listen in renderer: Use `window.electronAPI.onStateChanged((key, value) => {...})`
4. Optional: Add specific setter in main.js IPC handlers
5. Optional: Add backward-compatible accessor in preload.js

Example:
```javascript
// main.js: Add to appState
const appState = {
    // ... existing state
    myNewProperty: 'default value'
};

// main.js: Update when needed
broadcastStateChange('myNewProperty', newValue);

// renderer.js: Listen for changes
window.electronAPI.onStateChanged((key, value) => {
    if (key === 'myNewProperty') {
        console.log('New value:', value);
    }
});
```

### Adding New Commands
1. Add button to index.html with data-cmd attribute
2. Command automatically integrates into 50Hz stream via int-9
3. No separate command transmission needed
4. PLC echoes back command for acknowledgment

### Adding Status Indicators
1. Update CONFIG.BOOL_LABELS or CONFIG.INT_LABELS in config.js
2. Display automatically generated in renderer.js:initializeDisplays()
3. Updates handled in tcp-data-received event listener

### Modifying Data Protocol
1. Update byte structure constants in config.js
2. Modify parseReceivedData() in main.js for receive format
3. Modify Int2Byte usage in tcp-send handler for send format
4. Update test-server.js to match new protocol
