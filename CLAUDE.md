# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An Electron-based Windows desktop application for controlling gravity reducing equipment via TCP/UDP communication with a SIEMENS S7-1200 PLC. The main feature is automatic 50Hz (20ms interval) transmission of 16 control parameters with real-time monitoring of 40 boolean and 10 integer status values.

### Protocol Support
- **TCP Mode**: Reliable, connection-oriented communication with automatic reconnection handling
- **UDP Mode**: Fast, connectionless communication for low-latency control
- **Protocol Switching**: Users can switch between protocols; syncs across all windows via unified state management

## Multi-Window Architecture

**CRITICAL**: This is a multi-window Electron app with unified state management:

### Centralized State Management (CRITICAL - Commit edeebfa)
All application state is managed centrally in main.js using a single source of truth. This was refactored in commit edeebfa to eliminate sync issues between windows:

```javascript
const appState = {
    connection: { connected: false, error: null },
    protocol: 'tcp', // 'tcp' or 'udp'
    tcpSettings: {
        host: 'localhost',
        port: 8080,
        clientPort: 0  // 0 = auto-assign (added in cdc68f9)
    },
    udpSettings: {
        listeningPort: 8081,
        targetHost: 'localhost',
        targetPort: 8080
    },
    theme: 'dark',     // 'dark' or 'bright' (added in 8bf7183)
    language: 'en',    // 'en' or 'cn' (added in ef47cd5)
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
- theme-manager.js: Dedicated theme management (dark/bright mode switching)
- language-manager.js: Dedicated language management (EN/CN switching)
- locales.js: Translation strings for all UI elements

## Common Commands

```bash
# Development
npm install          # Install dependencies
npm start           # Run the application
node test-server.js # Run TCP test server (simulates PLC on localhost:8080)

# Building
npm run build       # Build Windows installer (NSIS + portable)
npm run build:dir   # Build unpacked for testing

# Testing
# 1. Start test server: node test-server.js
# 2. Start app: npm start
# 3. Connect to localhost:8080 (TCP) or configure UDP ports
# 4. Test latency using debug TX/RX counters and adjustable interval
```

## TCP Connection Notes

### Client Port Binding
- **Port 0 (recommended)**: Let the OS auto-assign an available port. No reconnection delays.
- **Specific Port**: When using a fixed client port, Windows keeps it in TIME_WAIT state for 30-120 seconds after disconnect.
  - A 1-second delay is automatically added before reconnection attempts
  - If reconnection fails immediately, wait 30 seconds or use port 0
  - This is standard TCP/IP behavior and cannot be bypassed in Node.js client sockets

### TCP Connection Lifecycle
- `tcp-connect`: Establishes TCP connection with optional client port binding
- `tcp-disconnect`: Graceful shutdown using `end()` + 500ms timeout before `destroy()`
- Socket cleanup includes `removeAllListeners()` to prevent memory leaks
- Connection status syncs across all windows via IPC broadcasts

## UDP Connection Notes

### Port Configuration
- **Listening Port**: Local port bound to receive incoming UDP datagrams (default: 8081)
- **Target Host/Port**: Remote endpoint where UDP datagrams are sent (default: localhost:8080)
- **No TIME_WAIT Issues**: UDP is connectionless, so no wait time required between reconnections

### UDP Socket Lifecycle
- `udp-connect`: Binds UDP socket to listening port, configures target endpoint
- `udp-disconnect`: Closes UDP socket and cleans up listeners
- Socket cleanup includes `removeAllListeners()` to prevent memory leaks
- Connection status syncs across all windows via IPC broadcasts

### UDP vs TCP Behavior
- **UDP**: Fire-and-forget, no acknowledgment of packet delivery at protocol level
- **TCP**: Connection-oriented, guaranteed delivery with automatic retransmission
- Both use the same 32-byte send format and 26-byte receive format
- Application-level acknowledgment (command echo in 10th integer) works for both protocols

## Data Protocol Details (TCP & UDP)

### Data Format (Critical for Development)
**Sent to PLC**: 32 bytes (16 integers × 2 bytes each, big-endian)
- int-9 is the Control Command parameter
- Big-endian conversion in main.js:13-18 (Int2Byte function)
- Same format for both TCP and UDP

**Received from PLC**: 26 bytes
- Bytes 0-4: 40 booleans bit-packed (8 per byte, LSB to MSB)
- Byte 5: Padding (automatically added by PLC)
- Bytes 6-25: 10 integers (2 bytes each, big-endian)
- Same format for both TCP and UDP

Parsing logic is in main.js:150-192 (parseReceivedData function).

### Command Acknowledgment Pattern (Commit 1ff18fe)
The PLC echoes received commands back in the 10th received integer (index 9):
- **Smart Auto-Disable**: Buttons disable when command sent, re-enable only after PLC acknowledgment
- **Button commands**: Auto-clear when PLC acknowledges (renderer.js handles this)
- **Axis movement commands** (X+/X-/Y+/Y-/Z+/Z-): Stay highlighted during movement
- **Joystick/Slider**: Only highlight after position command recall from PLC
- This prevents command spam and ensures PLC processing before allowing new commands
- See renderer.js for acknowledgment handling logic (waitingForAcknowledgment state)

## Architecture

### Main Process (main.js)
- Window management and lifecycle
- TCP connection handling (net.Socket)
- UDP socket handling (dgram.createSocket)
- Data protocol parsing/formatting (Int2Byte, parseReceivedData)
- IPC handlers for all renderer requests:
  - TCP: `tcp-connect`, `tcp-disconnect`, `tcp-send`
  - UDP: `udp-connect`, `udp-disconnect`, `udp-send`
  - Protocol: `set-protocol` (switches protocol, auto-disconnects)
  - State: `get-app-state` (returns complete appState)
- Multi-window state synchronization

### Preload (preload.js)
- Security bridge between main and renderer processes
- Exposes electronAPI via contextBridge
- All IPC communication goes through this layer

### Renderer Process (renderer.js)
- Main UI logic and event handling
- Protocol selection UI (radio buttons for TCP/UDP)
- 50Hz auto-send timer management (20ms setInterval)
- Command button handling and acknowledgment logic
- Joystick/slider control for manual positioning
- Settings persistence via localStorage with fallback pattern
- Real-time status display updates
- Protocol-aware connection and send operations

### Configuration (config.js)
- Centralized constants (byte sizes, timings, labels)
- Used by both main and renderer processes
- Modify BOOL_LABELS and INT_LABELS arrays to change display labels

## Key Implementation Details

### Configurable Auto-Send Loop (Commit cdc68f9)
- Critical feature for real-time equipment control
- **Configurable Interval**: Default 20ms (50Hz), adjustable from 1ms to 1000ms
- Located in renderer.js (`sendLatencyMs` variable, default 20)
- Setting persisted to localStorage as 'send-latency-ms'
- Collects all 16 integer parameters and sends via IPC
- int-9 (COMMAND_INT_INDEX) is automatically updated when command buttons pressed
- Must handle network back-pressure to avoid buffer overflow
- Protocol-aware: Automatically routes to TCP or UDP based on `currentProtocol`
- Uses localStorage fallback pattern when sending from main window

### Debug Latency Feature (Commit cdc68f9)
- **TX Counter**: Increments each time data is sent (displayed in UI)
- **RX Counter**: Increments each time data is received (displayed in UI)
- Located in index.html as `debug-tx-value` and `debug-rx-value`
- Helps measure actual communication latency and optimize transmission interval
- Counters visible in main window status bar for real-time monitoring

### Settings Synchronization
Settings are persisted to localStorage and must sync between windows:
- Protocol selection ('tcp' or 'udp')
- TCP connection settings (host, port, clientPort)
- UDP connection settings (listeningPort, targetHost, targetPort)
- Integer parameter values (int-0 through int-15, excluding int-9)
- Auto-send toggle state
- Theme preference

When modifying settings, ensure:
1. Save to localStorage in the current window
2. Broadcast via IPC to main process (if needed globally)
3. Main process sends to all windows via `BrowserWindow.getAllWindows()`

### localStorage Fallback Pattern (CRITICAL)
When reading settings that may only exist in the settings window, always use this pattern:

```javascript
// CORRECT: Read from input if exists, fallback to localStorage
const host = hostInput ? hostInput.value.trim() :
    (localStorage.getItem('tcpHost') || 'localhost');
const port = portInput ? parseInt(portInput.value) :
    (parseInt(localStorage.getItem('tcpPort')) || 8080);
```

This pattern is essential for:
- UDP send operations in main window (main.js:463)
- TCP connect operations when called from main window
- Any operation that needs settings from another window

**Why this is necessary**: Settings input elements only exist in settings.html, but operations (like connect/send) can be triggered from index.html (main window). Without the fallback, operations from the main window would fail or use incorrect default values.

### Theme Management (Commit 8bf7183)
Two themes: 'dark' and 'bright' (not 'light')
- **Global state** stored in appState.theme
- **Syncs across all windows** via unified state management (app-state-changed IPC event)
- **Theme toggle buttons** in both index.html and settings.html (sun/moon icon)
- **Dedicated manager**: theme-manager.js handles theme switching logic
- **CSS variables**: styles.css defines theme-specific colors
- **Persistence**: Saved to localStorage, restored on app restart
- **Implementation**:
  - Click theme button → calls setTheme() in theme-manager.js
  - theme-manager.js sends IPC to main.js
  - main.js broadcasts to all windows via broadcastStateChange('theme', newTheme)
  - All windows apply new theme by updating body classList

### Language Management (Commit ef47cd5)
Full internationalization support for English and Chinese
- **Supported languages**: 'en' (English), 'cn' (Chinese)
- **Global state** stored in appState.language
- **Syncs across all windows** via unified state management
- **Language toggle button** in both index.html and settings.html titlebar
- **Dedicated manager**: language-manager.js handles language switching
- **Translation strings**: locales.js contains all UI text in both languages
- **i18n pattern**: Elements with `data-i18n` attribute are automatically translated
- **Persistence**: Saved to localStorage, restored on app restart
- **Implementation**:
  - Click language button → calls setLanguage() in language-manager.js
  - language-manager.js sends IPC to main.js
  - main.js broadcasts to all windows via broadcastStateChange('language', newLang)
  - All windows update text by iterating `[data-i18n]` elements and applying LOCALES[lang][key]

### Driver Power & Servo Module Switches (Commit a1f4cca)
Replaced buttons with toggle switches for better UX
- **Location**: index.html Power & Servo Control section
- **Element type**: `<input type="checkbox">` with custom CSS slider
- **Attributes**:
  - `data-cmd-on`: Command to send when switched ON (e.g., "3" for Driver Power ON)
  - `data-cmd-off`: Command to send when switched OFF (e.g., "4" for Driver Power OFF)
  - `data-name`: Display name for logging
- **Behavior**:
  - Disabled until connected
  - Auto-disable while waiting for PLC acknowledgment
  - Re-enable after acknowledgment received
  - Visual ON/OFF state labels
- **Styling**: Custom .toggle-switch and .slider-switch classes in styles.css

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
- main.js - Main Electron process, TCP/UDP handlers, unified state management
- renderer.js - UI logic, control, protocol switching, command acknowledgment
- preload.js - IPC security bridge
- config.js - Shared configuration
- index.html - Main control interface
- settings.html - Configuration interface (protocol, connection, theme, language)
- styles.css - Application styling, theme variables

Active utility modules:
- theme-manager.js - Theme switching (dark/bright) with cross-window sync
- language-manager.js - Language switching (EN/CN) with cross-window sync
- locales.js - Translation strings for English and Chinese

Modular alternatives (not currently used):
- renderer-refactored.js - Modular version of renderer
- connection-manager.js, data-handler.js, ui-manager.js - Separated concerns
- validation.js, settings-manager.js - Utility modules

## Important Patterns

### Protocol Switching Implementation (Commit f1ceb66)
The commit f1ceb66 fixed critical protocol switching bugs. When working with protocol features:

1. **Variable Naming**: After UDP support was added, connection input IDs were renamed:
   - Old: `hostInput`, `portInput`
   - New: `tcpHostInput`, `tcpPortInput` (TCP), `udpListeningPort`, `udpTargetHost`, `udpTargetPort` (UDP)
   - Always use the current variable names in setupInputListeners()

2. **Protocol Radio Buttons**: Located in settings.html (line 47-52)
   - IDs: `protocol-tcp`, `protocol-udp`
   - Event listeners must be attached in setupInputListeners()
   - Updates `currentProtocol` variable and calls `handleProtocolSwitch()`

3. **Settings Sync Between Windows**:
   - Settings input elements only exist in settings.html
   - Main window (index.html) operations must read from localStorage as fallback
   - Both windows must update localStorage when settings change
   - Example fix from commit: renderer.js UDP send handler (line ~640)

### Smart Command Acknowledgment Implementation (Commit 1ff18fe)
Prevents command spam and ensures PLC has processed commands before allowing new ones:

1. **State Variable**: `waitingForAcknowledgment` (boolean) in renderer.js
   - Set to `true` when command button pressed
   - Set to `false` when PLC echoes command back (10th received integer matches currentCommand)

2. **Button Auto-Disable**:
   - All command buttons disabled when `waitingForAcknowledgment === true`
   - Prevents users from spamming commands
   - Implemented in tcp-data-received event listener

3. **Joystick/Slider Activation**:
   - Only activate/highlight AFTER position command acknowledged by PLC
   - Ensures PLC is ready for manual position control
   - Check acknowledgment in tcp-data-received before enabling controls

4. **Driver/Servo Switches**:
   - Same auto-disable logic applies
   - Switch disabled while waiting for ON/OFF command acknowledgment
   - Prevents toggling mid-command

### Configurable Transmission Interval Implementation (Commit cdc68f9)
Allows users to test and optimize communication latency:

1. **UI Control**: Input field `send-latency` in main window
   - Default: 20 (ms)
   - Range: 1-1000 ms
   - Updates `sendLatencyMs` variable in renderer.js

2. **Auto-Send Interval**:
   - Uses `setInterval(sendData, sendLatencyMs)` for auto-send
   - Interval dynamically adjustable (clear old interval, create new with updated delay)
   - Persisted to localStorage as 'send-latency-ms'

3. **Debug Counters**:
   - TX counter: Incremented in send handler
   - RX counter: Incremented in tcp-data-received/udp message handler
   - Displayed in UI for real-time latency measurement

### Adding Translation for New UI Elements (Commit ef47cd5)
When adding new UI text that needs translation:

1. **Add translation strings** to locales.js:
   ```javascript
   'en': {
       myNewLabel: 'My New Feature',
       ...
   },
   'cn': {
       myNewLabel: '我的新功能',
       ...
   }
   ```

2. **Add data-i18n attribute** to HTML element:
   ```html
   <button data-i18n="myNewLabel">My New Feature</button>
   ```

3. **Automatic translation**: language-manager.js will automatically translate on:
   - Language switch
   - App startup
   - Window creation

4. **Manual translation** (if needed):
   ```javascript
   element.textContent = LOCALES[currentLanguage].myNewLabel;
   ```

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
