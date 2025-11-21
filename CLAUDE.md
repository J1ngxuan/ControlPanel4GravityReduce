# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Electron-based Windows desktop application for controlling gravity reducing equipment via TCP/UDP communication with a SIEMENS S7-1200 PLC. Features automatic 50Hz (20ms interval) transmission of 16 control parameters with real-time monitoring of 40 boolean and 10 integer status values.

### Recent Refactoring (2025)

**CRITICAL**: renderer.js refactored from 1,658 lines to ~500 lines (70% reduction) using modular ES6 architecture with 15 specialized modules across 7 categories. All global variables eliminated, replaced with `stateManager` and `eventBus` patterns.

## Common Commands

```bash
npm install          # Install dependencies
npm start           # Run the application
node test-server.js # Run TCP test server (simulates PLC)
npm run build       # Build Windows installer
```

## Architecture Overview

### Multi-Window State Management (CRITICAL)

All state managed centrally in main.js:

```javascript
const appState = {
    connection: { connected: false, error: null },
    protocol: 'tcp', // 'tcp' or 'udp'
    tcpSettings: { host: 'localhost', port: 8080, clientPort: 0 },
    udpSettings: { listeningPort: 8081, targetHost: 'localhost', targetPort: 8080 },
    theme: 'dark',     // 'dark' or 'bright'
    language: 'en',    // 'en' or 'cn'
    tcpData: { bools: [], ints: [] }
};
```

**State sync pattern**: `broadcastStateChange(key, value)` updates state and notifies all windows via IPC event `app-state-changed`. Settings persist to localStorage but sync via IPC only.

### Modular Architecture

```
renderer/
├── core/                  # state-manager.js, event-bus.js, logger.js
├── connection/            # connection-manager.js, protocol-handler.js, data-sender.js
├── data/                  # data-receiver.js
├── controls/              # command-buttons.js, power-switches.js, joystick-control.js, slider-control.js
├── settings/              # settings-manager.js
├── ui/                    # ui-initializers.js
└── utils/                 # helpers.js
```

**Key patterns**:
- **State**: `stateManager.get(key)` / `stateManager.set(key, value)` - single source of truth
- **Events**: `eventBus.on(Events.X, callback)` / `eventBus.emit(Events.X, data)` - decoupled communication
- **Singleton**: All modules export singleton instances, import and use directly

### Core Files

- **main.js**: Electron main process, TCP/UDP handlers, state management, IPC handlers
- **renderer.js**: Orchestration layer (~500 lines), delegates to specialized modules
- **preload.js**: Security bridge, exposes electronAPI via contextBridge
- **theme-manager.js**: Dark/bright mode switching with cross-window sync
- **language-manager.js**: EN/CN language switching with cross-window sync
- **locales.js**: Translation strings for all UI elements

## Protocol Details

### TCP/UDP Support

**TCP**: Reliable, connection-oriented. Port 0 (recommended) = auto-assign. Fixed port has 30-120s TIME_WAIT delay.
**UDP**: Fast, connectionless. No TIME_WAIT issues.

Both use same data format:
- **Send**: 32 bytes (16 integers × 2 bytes, big-endian), int-9 is Control Command
- **Receive**: 26 bytes (bytes 0-4: 40 bools bit-packed, byte 5: padding, bytes 6-25: 10 ints)

Parsing: main.js:150-192 (parseReceivedData), main.js:13-18 (Int2Byte)

### Command Acknowledgment

PLC echoes commands in 10th received integer (index 9):
- Buttons disable on send, re-enable after PLC acknowledgment
- Button commands auto-clear on acknowledgment
- Axis movement commands stay highlighted during movement
- Prevents command spam, ensures PLC processing

## Key Features

### Configurable Auto-Send Loop

- Default 20ms (50Hz), adjustable 1-10000ms
- Managed by `data-sender.js`: `startAutoSend()`, `stopAutoSend()`, `updateAutoSendInterval()`
- Persisted to localStorage as 'send-latency-ms'
- Protocol-aware routing (TCP or UDP)
- TX/RX debug counters visible in main window

### localStorage Fallback Pattern (CRITICAL)

Settings may only exist in settings window. Always use:

```javascript
const host = hostInput ? hostInput.value.trim() : (localStorage.getItem('tcpHost') || 'localhost');
const port = portInput ? parseInt(portInput.value) : (parseInt(localStorage.getItem('tcpPort')) || 8080);
```

Required for operations triggered from main window that need settings from settings window.

## Localization (CRITICAL)

**All new UI text MUST be localized.** Never add hardcoded English strings.

### Adding Translations

1. **Add to locales.js** (both 'en' and 'zh'):
   ```javascript
   'en': { myLabel: 'My Feature' },
   'zh': { myLabel: '我的功能' }
   ```

2. **HTML elements**: Add `data-i18n` attribute:
   ```html
   <button data-i18n="myLabel">My Feature</button>
   ```

3. **JavaScript**: Use `window.t()` function:
   ```javascript
   statusElement.textContent = window.t('connected');
   ```

4. **Listen for language changes** if displaying dynamic text:
   ```javascript
   window.addEventListener('languageChanged', () => {
       this.updateStatus(stateManager.get('currentCommand'));
   });
   ```

### Translation Key Naming

- UI Elements: camelCase (e.g., `connectionSettings`, `tcpHost`)
- Status: state-based (e.g., `connected`, `disconnected`, `active`, `inactive`)
- Commands: Nested (e.g., `commands.1`, `commands.7`)
- Units: Prefix with `unit` (e.g., `unitMm`, `unitMmS`)
- Arrays: Plural (e.g., `boolLabels`, `intLabels`)
- Tooltips/Hints: Suffix with `Tooltip`/`Hint`

### Checklist for New Features

- [ ] All text added to locales.js (both 'en' and 'zh')
- [ ] HTML uses `data-i18n` attributes
- [ ] JavaScript uses `window.t()`
- [ ] Components listen for `languageChanged` if dynamic
- [ ] Tested EN ↔ CN toggle in both windows

## Common Tasks

### Adding New Modules

1. Create file in appropriate `renderer/` subdirectory
2. Use ES6 singleton pattern:
   ```javascript
   import stateManager from '../core/state-manager.js';
   import eventBus, { Events } from '../core/event-bus.js';

   class MyModule {
       init(deps) { /* setup */ }
   }
   const myModule = new MyModule();
   export default myModule;
   ```
3. Import in renderer.js and call `myModule.init()` in DOMContentLoaded

### Adding Commands

1. Add button to index.html: `<button class="btn-command" data-cmd="25">My Command</button>`
2. Add translation to locales.js: `commands: { 25: 'My Command' }`
3. Command flow: button click → `command-buttons.js` → `stateManager` → `data-sender.js` → PLC → acknowledgment → `data-receiver.js` → re-enable buttons

### Adding State Properties

**Renderer-only**: Add to `state-manager.js` defaultState
**Cross-window**: Add to main.js appState + broadcast with `broadcastStateChange()`
**Persistent**: Add to `settingsManager` + localStorage

### Adding Status Indicators

- **Booleans** (40 available): Update `boolLabels` in locales.js
- **Integers** (10 available): Update `intLabels` in locales.js
- Display auto-generated by `ui-initializers.js`, updates by `data-receiver.js`

## Testing

Run test-server.js to simulate PLC:
- Listens on localhost:8080
- Echoes commands in 10th int after ~200ms
- Generates bit-packed boolean responses

## File Organization

**Core**: main.js, renderer.js, preload.js, config.js, index.html, settings.html, styles.css
**Global Utils**: theme-manager.js, language-manager.js, locales.js
**Renderer Modules**: See "Modular Architecture" section above
