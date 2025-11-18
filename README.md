# Equipment Control Panel

An Electron-based Windows desktop application for equipment control and monitoring via TCP communication. Features automatic 50Hz data transmission with 67 communication variables.

## Features

- **50Hz Auto-Send (MAIN FUNCTION)**: Automatic continuous transmission of 16 control parameters at 50Hz (20ms interval)
- **Control Parameters**: 16 integers including Speed Mode, Target Speed, Position (X/Y/Z), Operation Mode, and Control Commands
- **24 Command Buttons**: Comprehensive equipment control (Start/Stop, Power, Servo, Axis Movement, Emergency Stops, etc.)
- **Status Monitoring**: 40 boolean indicators and 10 integer status values for real-time system monitoring
- **TCP Connection Management**: Connect/disconnect to TCP server with configurable host and port
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
- Big-endian format (MSB first)

### Received Data (60 bytes expected)
- **Bytes 0-39**: 40 boolean values (1 byte each, 0 = false, non-zero = true)
- **Bytes 40-59**: 10 integers (2 bytes each, big-endian format)

## Installation

```bash
npm install
```

## Running the Application

```bash
npm start
```

## Usage

1. **Connect to Server**:
   - Enter the host address (default: localhost)
   - Enter the port number (default: 8080)
   - Click "Connect"
   - Auto-Send at 50Hz starts automatically (if enabled)

2. **Control Parameters** (sent automatically at 50Hz):
   - **Speed Mode** (0-4): Select speed profile
   - **Target Speed** (mm/s): Set movement speed
   - **Target X/Y/Z** (mm): Set position coordinates
   - **Operation Mode**: Select PID parameter set
   - **Control Command**: Automatically updated when command buttons are pressed

3. **Command Buttons**:
   - Press any command button to set the Control Command value
   - The command is automatically sent in the next 50Hz transmission cycle
   - Examples: Start Experiment, Stop, Emergency Stop, Axis Movement, etc.

4. **Status Monitoring**:
   - 40 boolean indicators show system status (green = active)
   - 10 integer values display current positions, speed, force, tension, etc.

5. **Auto-Send Control**:
   - Enabled by default when connected
   - Toggle "Auto-Send (50Hz)" checkbox to enable/disable
   - "Send Data (Debug)" button available for manual single transmissions

6. **Monitor Activity**:
   - Check the log section for all operations and status updates

## Testing the Application

A test TCP server is included (`test-server.js`) that echoes back test data:

```bash
node test-server.js
```

Then connect the Electron app to `localhost:8080`.

## File Structure

```
├── main.js         # Main Electron process with TCP client
├── preload.js      # IPC communication bridge
├── renderer.js     # UI logic and event handlers
├── index.html      # Application UI structure
├── styles.css      # Styling and layout
├── package.json    # Project configuration
└── README.md       # This file
```

## Key Implementation Details

### 50Hz Auto-Send
- Main operational mode for real-time equipment control
- Sends all 16 control parameters every 20ms
- Control Command (int-9) is automatically updated when command buttons are pressed
- Parameters can be adjusted in real-time; changes are sent in the next cycle

### Control Command Integration
- Command buttons update the 10th integer (int-9)
- No separate command transmission required
- Commands are integrated into the continuous 50Hz data stream
- This ensures synchronized control parameter and command transmission

### Customization
- Boolean/Integer labels can be modified in `initializeDisplays()` function in `renderer.js`
- Data protocol can be adjusted in `parseReceivedData()` in `main.js`
- Command mappings can be updated in the HTML `data-cmd` attributes

## Security Notes

- The application runs with `contextIsolation: true` for security
- Node.js integration is disabled in the renderer process
- All IPC communication goes through the secure preload script

## Troubleshooting

**Connection Timeout**:
- Verify the server is running and accessible
- Check firewall settings
- Ensure correct host and port

**Data Not Displaying**:
- Check the log for error messages
- Verify the server is sending data in the expected format (60 bytes)
- Open DevTools (automatically opened) to check console errors

**Values Out of Range**:
- Integer inputs are automatically clamped to 0-65535 range
- Check logs for clamping notifications
