# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Recent Refactoring (2025)

**CRITICAL**: The renderer.js file has been fully refactored from a monolithic 1,658-line file into a clean modular architecture.

### Refactoring Summary
- **renderer.js**: Reduced from 1,658 lines to ~500 lines (70% reduction)
- **Modules created**: 15 specialized modules across 7 categories
- **Architecture**: ES6 modules with clear separation of concerns
- **Patterns**: Singleton pattern, event bus, centralized state management
- **Benefits**: Maintainable, testable, scalable, with zero code duplication

### Key Changes
1. **State Management**: All global variables eliminated, replaced with `stateManager`
2. **Event Communication**: Event bus for decoupled module communication
3. **Connection Logic**: Extracted to `connection-manager.js`, `protocol-handler.js`, `data-sender.js`
4. **Data Processing**: Separated into `data-receiver.js`
5. **UI Controls**: Modularized into `command-buttons.js`, `power-switches.js`, `joystick-control.js`, `slider-control.js`
6. **Settings**: Centralized in `settings-manager.js`
7. **UI Init**: Consolidated in `ui-initializers.js`
8. **Utilities**: Common helpers in `helpers.js`

### Module Categories
- **Core** (3 modules): State, events, logging
- **Connection** (3 modules): Connection management, protocol switching, data sending
- **Data** (1 module): Data reception and parsing
- **Controls** (4 modules): Command buttons, power switches, joystick, slider
- **Settings** (1 module): Settings persistence
- **UI** (1 module): UI initialization
- **Utils** (1 module): Helper functions

**See "Modular Architecture" section below for detailed documentation.**

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
- renderer.js: ~500 lines - Main orchestration layer, delegates to specialized modules
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

## Localization & Internationalization Guide

**CRITICAL**: All new UI text MUST be localized. Never add hardcoded English strings. This section documents the complete localization system and best practices for maintaining multi-language support.

### Localization Architecture

The application uses a centralized translation system with three key components:

1. **locales.js** - Contains all translation strings in a `LOCALES` object with 'en' and 'zh' keys
2. **language-manager.js** - Handles language switching, applies translations, manages state
3. **data-i18n attributes** - HTML elements use `data-i18n="key"` for automatic translation

### Adding New Translatable Text

**Step 1: Add translation keys to locales.js**

Add the key to BOTH English and Chinese sections:

```javascript
// locales.js
const LOCALES = {
    'en': {
        // ... existing keys
        myNewLabel: 'My New Feature',
        myNewButton: 'Click Me',
        myNewHint: 'This is a helpful hint'
    },
    'zh': {
        // ... existing keys
        myNewLabel: '我的新功能',
        myNewButton: '点击我',
        myNewHint: '这是一个有用的提示'
    }
};
```

**Step 2: Use translation in HTML**

For static HTML elements, add `data-i18n` attribute:

```html
<!-- Button with translation -->
<button data-i18n="myNewButton">Click Me</button>

<!-- Label with translation -->
<label data-i18n="myNewLabel">My New Feature</label>

<!-- Span with translation -->
<span class="hint" data-i18n="myNewHint">This is a helpful hint</span>
```

The initial text content serves as a fallback. When the page loads, language-manager.js automatically translates all elements with `data-i18n` attributes.

**Step 3: Use translation in JavaScript**

For dynamic text that changes at runtime, use the `window.t()` function:

```javascript
// Setting text content dynamically
statusElement.textContent = window.t('connected');

// Building composite strings
const message = `${window.t('status')}: ${window.t('active')}`;

// In modules (with fallback)
const t = (key) => typeof window.t === 'function' ? window.t(key) : key;
statusText = t('inactive');
```

### Translation Patterns by Use Case

#### 1. Static Labels (Buttons, Headers, Labels)

**HTML Pattern:**
```html
<h2 data-i18n="connectionSettings">Connection Settings</h2>
<button data-i18n="connect">Connect</button>
<label data-i18n="tcpHost">TCP Host:</label>
```

**locales.js:**
```javascript
'en': {
    connectionSettings: 'Connection Settings',
    connect: 'Connect',
    tcpHost: 'TCP Host:'
},
'zh': {
    connectionSettings: '连接设置',
    connect: '连接',
    tcpHost: 'TCP主机:'
}
```

#### 2. Dynamic Status Text (Connection, Active/Inactive)

**JavaScript Pattern:**
```javascript
// In renderer.js or module
function updateStatus(connected) {
    statusIndicator.textContent = window.t(connected ? 'connected' : 'disconnected');
}

function updateActivity(isActive) {
    activityText.textContent = isActive ? window.t('on') : window.t('off');
}
```

**locales.js:**
```javascript
'en': {
    connected: 'Connected',
    disconnected: 'Disconnected',
    on: 'ON',
    off: 'OFF'
}
```

#### 3. Unit Hints and Helper Text

**HTML Pattern:**
```html
<input type="number" id="speed" value="20">
<span class="unit-hint" data-i18n="unitMmS">mm/s</span>
```

**locales.js:**
```javascript
'en': {
    unitMmS: 'mm/s',
    unitMm: 'mm',
    unitStatus: 'Status'
},
'zh': {
    unitMmS: '毫米/秒',
    unitMm: '毫米',
    unitStatus: '状态'
}
```

#### 4. Command Names (with Nested Keys)

Command names use nested object structure in LOCALES:

**JavaScript Pattern:**
```javascript
// In helpers.js or similar
export function getCommandName(command) {
    if (typeof window.t === 'function') {
        const translatedName = window.t(`commands.${command}`);
        if (translatedName && translatedName !== `commands.${command}`) {
            return translatedName;
        }
    }
    return fallbackNames[command] || 'Unknown';
}
```

**locales.js:**
```javascript
'en': {
    commands: {
        1: 'Start Experiment',
        2: 'Stop Experiment',
        7: 'X+',
        8: 'X-'
    }
},
'zh': {
    commands: {
        1: '开始实验',
        2: '停止实验',
        7: 'X+',
        8: 'X-'
    }
}
```

#### 5. Array-Based Labels (Boolean/Integer Status)

For arrays of labels (like 40 boolean indicators):

**JavaScript Pattern:**
```javascript
// In data-receiver.js
getBoolLabel(index) {
    const currentLang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'en';
    if (window.LOCALES && window.LOCALES[currentLang] && window.LOCALES[currentLang].boolLabels) {
        return window.LOCALES[currentLang].boolLabels[index] || fallbackLabels[index];
    }
    return fallbackLabels[index];
}
```

**locales.js:**
```javascript
'en': {
    boolLabels: [
        'X Pos Complete', 'Y Pos Complete', 'Z Pos Complete',
        // ... 37 more items
    ],
    intLabels: [
        'Current X Pos', 'Current Y Pos', 'Current Z Pos',
        // ... 7 more items
    ]
}
```

### Handling Language Changes at Runtime

Components that display dynamic text must listen for language changes:

**Pattern for Updating Text on Language Change:**

```javascript
// In joystick-control.js, slider-control.js, or similar
init() {
    // ... setup code

    // Listen for language changes to update status text
    window.addEventListener('languageChanged', () => {
        const currentCmd = stateManager.get('currentCommand');
        if (currentCmd !== undefined) {
            this.updateStatus(currentCmd);  // Re-render with new language
        }
    });
}

updateStatus(command) {
    // Use window.t() for translatable strings
    const t = (key) => typeof window.t === 'function' ? window.t(key) : key;

    let statusText = t('inactive');
    if (command === COMMANDS.X_PLUS) {
        statusText = `X+ ${t('active')}`;
    }
    this.statusElement.textContent = statusText;
}
```

**Pattern for Updating Display Labels:**

```javascript
// In ui-initializers.js
init(electronAPI) {
    this.electronAPI = electronAPI;

    // Listen for language changes to update display labels
    window.addEventListener('languageChanged', () => {
        this.updateDisplayLabels();
    });
}

updateDisplayLabels() {
    const currentLang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'en';
    const labels = window.LOCALES[currentLang];

    // Update all display labels
    for (let i = 0; i < 40; i++) {
        const labelElement = document.querySelector(`#bool-${i} .bool-label`);
        if (labelElement) {
            labelElement.textContent = labels.boolLabels[i];
        }
    }
}
```

### Common Pitfalls and Solutions

#### ❌ WRONG: Hardcoded English strings
```javascript
// DON'T DO THIS
statusIndicator.textContent = 'Connected';
button.textContent = 'Click Me';
const message = 'Operation successful';
```

#### ✅ CORRECT: Use translation system
```javascript
// DO THIS
statusIndicator.textContent = window.t('connected');
button.setAttribute('data-i18n', 'clickMe');
const message = window.t('operationSuccessful');
```

#### ❌ WRONG: Creating HTML without translations
```javascript
// DON'T DO THIS
element.innerHTML = `<div class="label">Status</div>`;
```

#### ✅ CORRECT: Use translated labels
```javascript
// DO THIS
const label = this.getBoolLabel(index);  // Gets translated label
element.innerHTML = `<div class="label">${label}</div>`;
```

#### ❌ WRONG: Forgetting language change listeners
```javascript
// DON'T DO THIS - Text won't update when language switches
function updateStatus(command) {
    this.statusElement.textContent = 'Active';  // Hardcoded + no listener
}
```

#### ✅ CORRECT: Handle language changes
```javascript
// DO THIS
init() {
    window.addEventListener('languageChanged', () => {
        this.updateStatus(stateManager.get('currentCommand'));
    });
}

updateStatus(command) {
    this.statusElement.textContent = window.t('active');
}
```

### Translation Key Naming Conventions

Follow these conventions when adding new translation keys:

- **UI Elements**: camelCase, descriptive (e.g., `connectionSettings`, `tcpHost`, `startExperiment`)
- **Status Values**: camelCase, state-based (e.g., `connected`, `disconnected`, `active`, `inactive`)
- **Commands**: Nested under `commands` object with numeric keys (e.g., `commands.1`, `commands.7`)
- **Units**: Prefix with `unit` (e.g., `unitMm`, `unitMmS`, `unitStatus`)
- **Arrays**: Use plural form (e.g., `boolLabels`, `intLabels`)
- **Tooltips**: Suffix with `Tooltip` (e.g., `speedModeTooltip`, `commFlagTooltip`)
- **Hints**: Suffix with `Hint` (e.g., `tcpClientPortHint`, `udpTargetHostHint`)

### Testing Localization

When adding new features, always test:

1. **Initial load**: Does text appear in correct language on app start?
2. **Language toggle**: Does text update immediately when switching EN ↔ CN?
3. **Dynamic updates**: Does text stay translated when PLC data updates or controls activate?
4. **Window sync**: Do both main and settings windows show correct language?
5. **Persistence**: Does language preference survive app restart?

### Checklist for New Features

Before committing code with UI text:

- [ ] All visible text added to locales.js (both 'en' and 'zh')
- [ ] HTML elements use `data-i18n` attributes
- [ ] JavaScript uses `window.t()` for dynamic text
- [ ] Components listen for `languageChanged` event if displaying dynamic text
- [ ] Translation keys follow naming conventions
- [ ] Tested language toggle in both windows
- [ ] No hardcoded English strings remain

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

### Core Application Files
- **main.js** - Main Electron process, TCP/UDP handlers, unified state management
- **renderer.js** - Main orchestration layer (~500 lines, 70% reduction from original 1,658 lines)
- **preload.js** - IPC security bridge between main and renderer processes
- **config.js** - Shared configuration constants
- **index.html** - Main control interface
- **settings.html** - Configuration interface (protocol, connection, theme, language)
- **styles.css** - Application styling with theme variables

### Global Utility Modules
- **theme-manager.js** - Theme switching (dark/bright) with cross-window sync
- **language-manager.js** - Language switching (EN/CN) with cross-window sync
- **locales.js** - Translation strings for English and Chinese

## Modular Architecture

**CRITICAL**: The renderer.js has been fully refactored into a modular architecture with clear separation of concerns. All modules are ES6 modules using import/export syntax.

### Module Structure

```
renderer/
├── core/                  # Core functionality modules
│   ├── state-manager.js   # Centralized state management (single source of truth)
│   ├── event-bus.js       # Pub/sub event system for decoupled communication
│   └── logger.js          # Logging system with log container management
│
├── connection/            # Connection and protocol modules
│   ├── connection-manager.js  # TCP/UDP connection lifecycle management
│   ├── protocol-handler.js    # Protocol switching logic (TCP ↔ UDP)
│   └── data-sender.js         # Data transmission, auto-send loop, TX logic
│
├── data/                  # Data processing modules
│   └── data-receiver.js   # Data reception, parsing, RX logic, display updates
│
├── controls/              # UI control modules
│   ├── command-buttons.js     # Command button handlers and acknowledgment
│   ├── power-switches.js      # Driver/Servo power switch controls
│   ├── joystick-control.js    # XY joystick control with canvas rendering
│   └── slider-control.js      # Z-axis slider control
│
├── settings/              # Settings management
│   └── settings-manager.js    # Load/save settings to localStorage
│
├── ui/                    # UI initialization
│   └── ui-initializers.js     # Tabs, windows controls, displays setup
│
└── utils/                 # Utility helpers
    └── helpers.js         # Common helper functions (logging, window checks)
```

### Module Responsibilities

#### Core Modules

**state-manager.js** (252 lines)
- Single source of truth for application state
- Provides `get(key)` and `set(key, value)` methods
- Manages: connection status, protocol, settings, commands, debug mode
- Replaces all global variables that were scattered in renderer.js

**event-bus.js** (195 lines)
- Decoupled pub/sub event system
- Methods: `on()`, `off()`, `once()`, `emit()`, `clear()`
- Event constants exported for type safety (Events.CONNECTION_STATUS, Events.DATA_SEND, etc.)
- Enables components to communicate without direct dependencies

**logger.js** (127 lines)
- Centralized logging with types: info, success, error, warn
- Auto-scrolling log container
- Color-coded log messages
- Timestamp tracking

#### Connection Modules

**connection-manager.js** (169 lines)
- Manages TCP and UDP connection lifecycle
- Methods: `connect()`, `disconnect()`, `isConnected()`
- Handles connection errors and cleanup
- Emits connection status events via event bus

**protocol-handler.js** (132 lines)
- Protocol switching logic (TCP ↔ UDP)
- UI updates for protocol selection
- Auto-disconnect when switching protocols
- Validates protocol state

**data-sender.js** (250 lines)
- Collects 16 integer parameters for transmission
- Auto-send loop management (configurable 1-10000ms interval, default 20ms)
- Methods: `sendIntegerData()`, `startAutoSend()`, `stopAutoSend()`, `updateAutoSendInterval()`
- localStorage fallback pattern for settings
- Protocol-aware sending (routes to TCP or UDP)

#### Data Modules

**data-receiver.js** (213 lines)
- Receives and parses PLC data (26 bytes: 40 bools + 10 ints)
- Updates boolean indicators (TRUE/FALSE display)
- Updates integer displays
- Command acknowledgment detection (10th int, index 9)
- Debug mode RX/TX display updates
- Emits events: DATA_RECEIVED, BOOLEANS_UPDATED, INTEGERS_UPDATED, COMMAND_ACKNOWLEDGED

#### Control Modules

**command-buttons.js** (205 lines)
- Command button event handlers
- Smart acknowledgment logic (auto-disable buttons until PLC responds)
- Methods: `init()`, `setCommand()`, `clearCommand()`, `handleAcknowledgment()`
- Manages button active states and disabled states

**power-switches.js** (142 lines)
- Driver Power and Servo Module toggle switches
- ON/OFF command handling with data attributes (data-cmd-on, data-cmd-off)
- Acknowledgment-based enable/disable
- Connection status handling

**joystick-control.js** (387 lines)
- XY-axis joystick with HTML5 canvas rendering
- Mouse drag and touch support
- Deadzone detection (prevents accidental movement)
- Position-to-command conversion
- Real-time position display
- Exports COMMANDS constant (X_PLUS: 7, X_MINUS: 8, Y_PLUS: 9, Y_MINUS: 10, Z_PLUS: 11, Z_MINUS: 12)

**slider-control.js** (237 lines)
- Z-axis slider control
- Mouse and keyboard support
- Position-to-command conversion
- Status display updates
- Acknowledgment handling

#### Settings Modules

**settings-manager.js** (252 lines)
- Loads settings from localStorage on app start
- Saves settings to localStorage on change
- Manages: protocol, TCP settings, UDP settings, integer parameters, auto-send, debug mode, latency
- Methods: `loadSettings(elements)`, `saveSettings(elements)`, `getCurrentProtocol()`, `setCurrentProtocol()`

#### UI Modules

**ui-initializers.js** (205 lines)
- Initializes tabs, settings button, window controls
- Creates boolean and integer displays (40 bools + 10 ints)
- Sets up input change listeners for auto-save
- Methods: `initializeTabs()`, `initializeSettingsButton()`, `initializeWindowControls()`, `initializeDisplays()`, `setupInputListeners()`

#### Utility Modules

**helpers.js** (64 lines)
- Common helper functions
- `addLog(message, type)` - Logging wrapper
- `isMainWindow()` - Detects if current window is main window (has tabs)
- `getCommandName(command)` - Maps command IDs to human-readable names

### Module Initialization Flow

```javascript
// renderer.js - DOMContentLoaded handler
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize logger
    logger.init(logContainer);

    // 2. Initialize connection modules
    connectionManager.init(window.electronAPI);
    protocolHandler.init(window.electronAPI);
    dataSender.init(window.electronAPI);

    // 3. Initialize data receiver with acknowledgment handler
    dataReceiver.init(window.electronAPI, handleCommandAcknowledgment);

    // 4. Initialize UI initializers
    uiInitializers.init(window.electronAPI);

    // 5. Load saved settings
    loadSettings();  // Wrapper for settingsManager.loadSettings()

    // 6. Initialize UI components
    initializeDisplays();
    commandButtonsManager.init();
    powerSwitchesManager.init();
    initializeTabs();
    initializeSettingsButton();
    initializeWindowControls();
    setupInputListeners();
    joystickControl.init();
    sliderControl.init();

    // 7. Get initial app state from main process
    const appState = await window.electronAPI.getAppState();
    // Apply connection and protocol state...
});
```

### Module Communication Patterns

**1. State Management Pattern**
```javascript
// Set state (triggers change in stateManager)
stateManager.set('isConnected', true);

// Get state (read from stateManager)
const isConnected = stateManager.get('isConnected');

// NO MORE GLOBAL VARIABLES - all state goes through stateManager
```

**2. Event Bus Pattern**
```javascript
// Subscribe to events
eventBus.on(Events.CONNECTION_STATUS, (data) => {
    console.log('Connection status:', data.connected);
});

// Emit events
eventBus.emit(Events.DATA_SEND, { integers });

// Modules communicate without direct dependencies
```

**3. Delegate Pattern**
```javascript
// renderer.js acts as orchestration layer
function startAutoSend() {
    dataSender.startAutoSend();  // Delegate to module
    // Update UI...
}

// renderer.js remains thin, modules do the work
```

**4. Singleton Pattern**
```javascript
// All modules export singleton instances
export default dataSender;  // Already instantiated

// Import and use directly
import dataSender from './renderer/connection/data-sender.js';
dataSender.sendIntegerData();
```

### Adding New Modules

When adding a new module to the architecture:

1. **Create the module file** in appropriate directory:
   - `renderer/core/` - Core functionality
   - `renderer/connection/` - Connection/protocol logic
   - `renderer/data/` - Data processing
   - `renderer/controls/` - UI controls
   - `renderer/settings/` - Settings management
   - `renderer/ui/` - UI initialization
   - `renderer/utils/` - Utility helpers

2. **Use ES6 module syntax**:
```javascript
// Import dependencies
import stateManager from '../core/state-manager.js';
import eventBus, { Events } from '../core/event-bus.js';
import logger from '../core/logger.js';

class MyModule {
    constructor() {
        // Initialization
    }

    init(dependencies) {
        // Setup
    }

    // Methods...
}

// Export singleton
const myModule = new MyModule();
export default myModule;
```

3. **Import in renderer.js**:
```javascript
import myModule from './renderer/category/my-module.js';
```

4. **Initialize in DOMContentLoaded**:
```javascript
myModule.init(/* dependencies */);
```

5. **Emit/listen to events** for cross-module communication:
```javascript
// In your module
eventBus.emit(Events.MY_EVENT, { data });
eventBus.on(Events.OTHER_EVENT, (data) => { /* handle */ });
```

6. **Use stateManager** for state:
```javascript
stateManager.set('myState', value);
const myState = stateManager.get('myState');
```

## Important Patterns

### Protocol Switching Implementation
Protocol switching is handled by the modular architecture:

1. **Protocol State Management**:
   - Protocol stored in `settingsManager.getCurrentProtocol()` / `setCurrentProtocol()`
   - Also synced to `stateManager` for runtime access
   - Persisted to localStorage as 'protocol'

2. **Protocol Radio Buttons**: Located in settings.html
   - IDs: `protocol-tcp`, `protocol-udp`
   - Event listeners handled by `renderer.js` call `handleProtocolSwitch()`
   - `handleProtocolSwitch()` delegates to `protocolHandler.switchProtocol()`

3. **Protocol Handler Module** (`protocol-handler.js`):
   - `switchProtocol(newProtocol)` - Validates and switches protocol
   - `updateProtocolUI()` - Shows/hides TCP or UDP settings sections
   - Auto-disconnects current connection when switching
   - Broadcasts protocol change via IPC

4. **Connection Manager** (`connection-manager.js`):
   - Protocol-aware connection methods
   - Routes to TCP or UDP based on current protocol
   - Handles cleanup when switching protocols

### Smart Command Acknowledgment Implementation
Command acknowledgment is managed by the control modules:

1. **Command Flow**:
   - User clicks button → `command-buttons.js` calls `setCommand(cmdId)`
   - `setCommand()` stores in `stateManager.set('currentCommand', cmdId)`
   - Command auto-disables all buttons via `setWaitingForAcknowledgment(true)`
   - `dataSender.js` includes command in next transmission (int-9)
   - PLC processes and echoes back in received int-9
   - `data-receiver.js` detects match: `plcAcknowledgedCommand === currentCommand`
   - Calls `handleCommandAcknowledgment()` in renderer.js
   - `command-buttons.js` receives `handleAcknowledgment()` call, re-enables buttons

2. **Module Responsibilities**:
   - `command-buttons.js`: Button disable/enable logic, acknowledgment handling
   - `power-switches.js`: Switch disable/enable for Driver/Servo switches
   - `joystick-control.js`: Joystick highlight only after acknowledgment
   - `slider-control.js`: Slider status updates after acknowledgment
   - `data-receiver.js`: Detects acknowledgment in received data
   - `stateManager`: Stores currentCommand and acknowledgment state

3. **No Global Variables**:
   - Old approach used `let waitingForAcknowledgment` in renderer.js
   - New approach: All state in `stateManager` and control modules
   - Modules communicate via event bus

### Configurable Transmission Interval Implementation
Auto-send loop is managed by `data-sender.js`:

1. **UI Control**: Input field `send-latency` in main window
   - Default: 20ms (50Hz)
   - Range: 1-10000ms
   - Managed by `settingsManager.setSendLatencyMs()`

2. **Auto-Send Loop** (`data-sender.js`):
   - `startAutoSend()` - Starts interval with current latency
   - `stopAutoSend()` - Stops interval
   - `updateAutoSendInterval(newLatency)` - Changes interval dynamically
   - `isAutoSendActive()` - Checks if auto-send is running
   - Interval managed internally, exposed via methods only

3. **Debug Counters**:
   - TX/RX counters managed by `data-sender.js` and `data-receiver.js`
   - Debug mode state in `stateManager.get('debugModeEnabled')`
   - Display updates in `data-receiver.js`

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
State management is now handled by the modular architecture:

**1. For renderer-only state** (doesn't need cross-window sync):
```javascript
// Add to state-manager.js defaultState object
defaultState: {
    // ... existing state
    myNewProperty: 'default value'
}

// Use anywhere in renderer modules
stateManager.set('myNewProperty', newValue);
const value = stateManager.get('myNewProperty');
```

**2. For cross-window state** (syncs between main and settings windows):
```javascript
// 1. Add to appState in main.js
const appState = {
    // ... existing state
    myNewProperty: 'default value'
};

// 2. Broadcast changes in main.js
broadcastStateChange('myNewProperty', newValue);

// 3. Listen in renderer.js
window.electronAPI.onStateChanged((key, value) => {
    if (key === 'myNewProperty') {
        stateManager.set('myNewProperty', value);
        // Handle the change...
    }
});

// 4. Optional: Add to state-manager.js for initial state
```

**3. For settings** (persistent across app restarts):
```javascript
// 1. Add to settingsManager.loadSettings() and saveSettings()
// 2. Store in localStorage
localStorage.setItem('my-setting', value);

// 3. Load on startup
const value = localStorage.getItem('my-setting');
```

### Adding New Commands
Commands are handled by the `command-buttons.js` module:

1. **Add button to index.html** with data-cmd attribute:
   ```html
   <button class="btn-command" data-cmd="25">My New Command</button>
   ```

2. **Command flow**:
   - `command-buttons.js` automatically attaches event listener
   - Clicking button calls `setCommand(25)`
   - Command stored in `stateManager.set('currentCommand', 25)`
   - `data-sender.js` includes in next transmission (int-9)
   - PLC echoes back in int-9 for acknowledgment
   - `data-receiver.js` detects acknowledgment
   - `command-buttons.js` re-enables buttons

3. **Add command name** in `helpers.js` getCommandName():
   ```javascript
   const names = {
       // ... existing commands
       25: 'My New Command'
   };
   ```

### Adding Status Indicators
Status displays are handled by the `ui-initializers.js` and `data-receiver.js` modules:

1. **For boolean indicators** (40 available):
   - Update BOOL_LABELS array in `data-receiver.js`
   - Also update in `locales.js` for i18n support
   - Display automatically generated by `ui-initializers.initializeDisplays()`
   - Updates handled by `data-receiver.updateBooleanDisplay()`

2. **For integer displays** (10 available):
   - Update INT_LABELS in `locales.js`
   - Display automatically generated by `ui-initializers.initializeDisplays()`
   - Updates handled by `data-receiver.updateIntegerDisplay()`

3. **Example**:
   ```javascript
   // In data-receiver.js or locales.js
   const BOOL_LABELS = [
       'X Pos Complete', 'Y Pos Complete', 'Z Pos Complete',
       // ... add your new label ...
   ];
   ```

### Modifying Data Protocol
1. Update byte structure constants in config.js
2. Modify parseReceivedData() in main.js for receive format
3. Modify Int2Byte usage in tcp-send handler for send format
4. Update test-server.js to match new protocol
