# Control Panel for Gravity Reduce

An Electron-based Windows desktop application for gravity reducing equipment control and monitoring via TCP/UDP communication. Features automatic 50Hz data transmission with 67 communication variables with a SIEMENS S7-1200 PLC

## Features

### Core Functionality
- **50Hz Auto-Send (MAIN FUNCTION)**: Automatic continuous transmission of 16 control parameters at configurable intervals (default 20ms)
- **Configurable Transmission Interval**: Adjust send rate from 1ms to 1000ms for latency testing and optimization
- **Control Parameters**: 16 integers including Speed Mode, Target Speed, Position (X/Y/Z), Operation Mode, and Control Commands
- **24 Command Buttons**: Comprehensive equipment control (Start/Stop, Power, Servo, Axis Movement, Emergency Stops, etc.)
- **Smart Command Acknowledgment**: Auto-disable buttons when waiting for PLC recall; joystick/slider highlight only after recall
- **Status Monitoring**: 40 boolean indicators and 10 integer status values for real-time system monitoring

### Connection & Communication
- **Dual Protocol Support**: Choose between TCP (reliable, connection-oriented) or UDP (fast, connectionless)
- **TCP Connection Management**: Connect/disconnect with configurable host, server port, and optional client port binding (0=auto-assigned)
- **UDP Socket Management**: Bind to listening port and send data to configurable target host/port
- **Latency Debug Feature**: Real-time TX/RX counter display to measure communication latency

### User Interface
- **Multi-Window Architecture**: Main control panel and separate settings window with unified state synchronization
- **Theme Switching**: Toggle between dark mode and bright mode with instant synchronization across all windows
- **Internationalization (i18n)**: Full support for English and Chinese languages with instant switching
- **Driver/Servo Toggle Switches**: Intuitive ON/OFF switches for Driver Power and Servo Module control
- **Real-time Logging**: Monitor all operations, commands, and status updates
- **16:9 Optimized UI**: Professional control panel layout designed for Windows monitors

## Int2Byte Conversion

The application uses big-endian format to convert integers to bytes:

```javascript
bytes[0] = (0xff00 & i) >> 8;  // High byte
bytes[1] = 0xff & i;            // Low byte
```

Each integer (0-65535) is converted to 2 bytes, so 16 integers = 32 bytes sent.

## Data Protocol

### Sent Data (32 bytes)
- 16 integers × 2 bytes each = 32 bytes total
- Big-endian format ( MSB first )
- Same format for both TCP and UDP

### Received Data (26 bytes expected)
- **Bytes 0-4**: 40 boolean values ( 8 bools in 1 byte, `0xe = false, false, false, true` )
- **Bytes 5**: undefined Byte spared automatically by Siemens PLC.
- **Bytes 6-25**: 10 integers ( 2 bytes each, big-endian format )
- Same format for both TCP and UDP

### Protocol Selection
- **TCP**: Reliable, connection-oriented protocol. Ensures ordered delivery and error correction. Recommended for critical operations.
- **UDP**: Fast, connectionless protocol. Lower latency but no guaranteed delivery. Suitable for real-time control where speed is priority.

## Installation

```bash
npm install
```

## Running the Application

- **If you need a test server**:
  
```bash
node test-server.js
```

```bash
npm start
```

- If you **DON'T** need a test server:

```bash
npm start
```

## Build

```bash
npm run build
```

## Usage

### Initial Setup

1. **Language Selection**:
   - Click the language toggle button in titlebar to switch between English (EN) and Chinese (CN)
   - Language preference syncs across all windows and persists on restart

2. **Theme Selection**:
   - Click the theme toggle button (sun/moon icon) to switch between Bright and Dark mode
   - Theme preference syncs across all windows and persists on restart

3. **Select Protocol** (in Settings window):
   - Choose **TCP** for reliable, connection-oriented communication
   - Choose **UDP** for fast, connectionless communication

4. **Configure Connection Settings**:

   **For TCP**:
   - TCP Host: Server address (default: localhost)
   - TCP Server Port: Server listening port (default: 8080)
   - TCP Client Port: Local port binding (default: 0 = auto-assigned, recommended)
     - Note: Using a specific client port may require 30s wait after disconnect due to TIME_WAIT state

   **For UDP**:
   - UDP Listening Port: Local port to receive data (default: 8081)
   - UDP Target Host: Remote host to send data (default: localhost)
   - UDP Target Port: Remote port to send data (default: 8080)

5. **Configure Transmission Interval** (optional):
   - Default: 20ms (50Hz)
   - Adjustable range: 1ms to 1000ms
   - Use debug TX/RX counters to measure actual communication latency

### Operation

1. **Connect to Server**:
   - Click "Connect" in main window or settings window
   - Auto-Send starts automatically at configured interval (if enabled)

2. **Driver Power & Servo Module**:
   - Use toggle switches to control Driver Power and Servo Module
   - ON position sends command to activate, OFF sends deactivate command
   - Switches are disabled until connected and only enabled after PLC acknowledgment

3. **Control Parameters** (sent automatically at configured interval):
   - **Speed Mode** (0-4): Select speed profile
   - **Target Speed** (mm/s): Set movement speed
   - **Target X/Y/Z** (mm): Set position coordinates
   - **Operation Mode**: Select PID parameter set
   - **Control Command**: Automatically updated when command buttons are pressed

4. **Command Buttons**:
   - Press any command button to set the Control Command value
   - Buttons auto-disable while waiting for PLC acknowledgment
   - Button re-enables only after PLC echoes back the command (10th received integer)
   - The command is automatically sent in the next transmission cycle
   - Examples: Start Experiment, Stop, Emergency Stop, Axis Movement, etc.

5. **Joystick & Position Control**:
   - Manual X/Y position control via on-screen joystick
   - Z-axis slider control
   - Controls only highlight/activate after PLC recalls the position command

6. **Status Monitoring**:
   - 40 boolean indicators show system status (green = active)
   - 10 integer values display current positions, speed, force, tension, etc.
   - Debug TX/RX counters show communication activity for latency measurement

7. **Auto-Send Control**:
   - Enabled by default when connected
   - Toggle "Auto-Send" checkbox to enable/disable
   - Transmission interval adjustable (default 20ms = 50Hz)
   - "Send Data (Debug)" button available for manual single transmissions

8. **Monitor Activity**:
   - Check the log section for all operations and status updates
   - TX/RX debug counters increment with each transmission/reception

## Testing the Application

A test TCP server is included (`test-server.js`) that simulates PLC behavior:
- Generates realistic 40 boolean and 10 integer responses
- Simulates command processing delay (~200ms at 50Hz)
- Echoes back control commands in the 10th integer to test acknowledgment logic
- Uses proper bit-packed boolean format (5 bytes + 1 padding byte)

**Testing TCP Mode:**
```bash
node test-server.js
```
Then connect the Electron app to `localhost:8080` using TCP protocol.

**Testing UDP Mode:**
For UDP testing, you would need a UDP server that:
- Listens on the target port (default: 8080)
- Responds to the listening port (default: 8081)
- Follows the same 26-byte response format

## File Structure

```
├── main.js                    # Main Electron process, TCP/UDP handlers, unified state management
├── preload.js                 # IPC communication bridge (secure context isolation)
├── renderer.js                # Main UI logic, event handlers, command management, protocol switching
├── renderer-refactored.js     # Refactored modular renderer (alternative implementation)
├── index.html                 # Main application UI structure
├── settings.html              # Settings window UI (protocol, connection, theme, language)
├── styles.css                 # Application styling, 16:9 layout, theme support
├── config.js                  # Application configuration and constants
├── theme-manager.js           # Theme management (dark/bright mode switching)
├── language-manager.js        # Language/localization management (EN/CN switching)
├── locales.js                 # Localization strings for English and Chinese
├── connection-manager.js      # TCP connection management module
├── data-handler.js            # Data collection and formatting module
├── ui-manager.js              # UI updates and display management module
├── settings-manager.js        # Settings persistence (localStorage) module
├── validation.js              # Input validation module
├── test-server.js             # TCP test server (simulates PLC with command acknowledgment)
├── package.json               # Project configuration and dependencies
├── README.md                  # This file
├── CLAUDE.md                  # Developer guidance for Claude Code
└── REFACTORING_SUMMARY.md     # Modular architecture documentation
```

## Key Implementation Details

### Configurable Auto-Send
- Main operational mode for real-time equipment control
- Default: 50Hz (20ms interval), configurable from 1ms to 1000ms
- Sends all 16 control parameters at configured interval
- Control Command (int-9) is automatically updated when command buttons are pressed
- Parameters can be adjusted in real-time; changes are sent in the next cycle
- Debug TX/RX counters help measure actual latency and optimize interval

### Control Command Integration
- Command buttons update the 10th integer (int-9)
- No separate command transmission required
- Commands are integrated into the continuous 50Hz data stream
- This ensures synchronized control parameter and command transmission

### PLC Command Acknowledgment
- The PLC echoes back the control command in the 10th received integer (index 9)
- **Button Commands**: Automatically cleared when PLC acknowledges (button highlight removed, command reset to 0)
- **Axis Movement Commands** (X+/X-/Y+/Y-/Z+/Z-): Keep control highlighted while active
- Provides visual feedback that commands have been received and executed by the PLC
- Works identically for both TCP and UDP protocols

### Protocol Switching
- Protocol selection syncs across all windows via unified state management
- Switching protocols automatically disconnects active connections
- Settings are persisted to localStorage and survive app restarts
- Protocol-specific settings (TCP/UDP) are independently maintained

### Unified State Management
- All application state centralized in main.js (connection, protocol, settings, theme, language, TCP data)
- `broadcastStateChange(key, value)` updates state and notifies all windows
- `getAppState()` provides complete state snapshot for new windows
- Single IPC event `app-state-changed` with `{ key, value }` payload
- localStorage used for persistence, IPC for real-time sync between windows

### Smart Command Acknowledgment
- Buttons auto-disable when command is sent
- PLC echoes command back in 10th received integer (index 9)
- Button re-enables only after acknowledgment received
- Prevents command spam and ensures PLC has processed the command
- Axis movement commands (X+/X-/Y+/Y-/Z+/Z-) stay highlighted during movement
- Joystick and sliders only activate/highlight after position command recall

### Theme & Language Management
- **Themes**: Dark mode (default) and Bright mode
- **Languages**: English (EN) and Chinese (CN) with full UI translation
- Both preferences sync across all windows in real-time via IPC
- Persisted to localStorage and restored on app restart
- Dedicated managers: `theme-manager.js`, `language-manager.js`, `locales.js`

### Customization
- Boolean/Integer labels can be modified in `initializeDisplays()` function in `renderer.js`
- Data protocol can be adjusted in `parseReceivedData()` in `main.js`
- Command mappings can be updated in the HTML `data-cmd` attributes
