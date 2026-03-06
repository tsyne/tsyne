# Aranet4 Air Quality Monitor - Tsyne Port

A cross-platform real-time air quality monitoring application for Aranet4 sensors, ported from the macOS menu bar app to the Tsyne GUI framework. Displays CO2 levels, temperature, humidity, pressure, and battery status with color-coded alerts.

## Features

- **Real-time Readings** - CO2 (ppm), temperature (°C), humidity (%), pressure (hPa), battery (%)
- **Connection Management** - Auto-connect, manual connect/disconnect, connection status display
- **Color-Coded Alerts** - Green (< 800 ppm), Yellow (800-1199 ppm), Red (≥ 1200 ppm)
- **Audio Alerts** - Configurable alert sounds (Off, Gentle, Urgent/Fire Alarm)
- **Settings Window** - Adjust alert preferences, auto-connect behavior, and refresh interval
- **Auto-Refresh** - Configurable polling interval (default: 5 minutes)
- **Simulated Bluetooth** - Realistic air quality data simulation for testing (real Bluetooth in future)

## UI Architecture

```
┌─────────────────────────────────────┐
│  Aranet4 Monitor                    │
├─────────────────────────────────────┤
│  🟢 Connected to Aranet4            │
│     Status: Connected               │
├─────────────────────────────────────┤
│  CO2: 650 ppm                       │
│  Temperature: 22.3°C                │
│  Humidity: 45%                      │
│  Pressure: 1013.2 hPa               │
│  Battery: 87%                       │
├─────────────────────────────────────┤
│  [Disconnect] [Refresh] [Settings]  │
└─────────────────────────────────────┘

Settings Window:
┌─────────────────────────────────────┐
│  Settings                           │
├─────────────────────────────────────┤
│  Alert Sound:                       │
│  [Off] [Gentle] [✓Urgent]          │
├─────────────────────────────────────┤
│  Auto-Connect:                      │
│  ☑ Enable auto-connect             │
├─────────────────────────────────────┤
│  Refresh Interval (minutes):        │
│  [-] 5 [+]                         │
├─────────────────────────────────────┤
│  [Close]                            │
└─────────────────────────────────────┘
```

## Running the App

### Standalone Mode

```bash
cd /home/user/tsyne
pnpm install
pnpm run build

# Run the Aranet app directly
npx tsx ported-apps/aranet/index.ts
```

### In Desktop Environment

The app is automatically discovered by the desktop launcher:

```bash
npx tsx examples/desktop-demo.ts
```

Find "Aranet4 Monitor" in the app grid, double-click to launch.

## Testing

### Unit Tests (Jest)

Tests for store functionality, state management, and business logic:

```bash
pnpm test -- ported-apps/aranet/index.test.ts
```

Coverage includes:
- **Connection Status** (8 tests) - State transitions, connect/disconnect
- **Readings** (5 tests) - Reading generation, validation, display
- **CO2 Levels** (5 tests) - Status calculation, color coding, icons
- **Settings** (6 tests) - Alert sound, auto-connect, refresh intervals
- **Observable Pattern** (5 tests) - Subscription, notification, cleanup
- **Auto-Refresh** (3 tests) - Timer management, interval configuration
- **Edge Cases** (3 tests) - Rapid cycles, concurrent operations

**Total: 40 Jest tests**

### UI Integration Tests (TsyneTest)

Tests for UI interactions and visual updates:

```bash
pnpm test -- ported-apps/aranet/index.tsyne.test.ts
```

Coverage includes:
- **Window Creation** (3 tests) - Widget creation, visibility
- **Connection States** (5 tests) - Button visibility, status updates
- **Readings Display** (3 tests) - Reading updates, clearing on disconnect
- **Refresh Button** (3 tests) - Visibility, functionality, hiding
- **Settings Window** (3 tests) - Open/close, control display
- **Alert Sound Settings** (3 tests) - Options display, selection change
- **Refresh Interval Settings** (5 tests) - Display, increment/decrement, bounds
- **UI Consistency** (2 tests) - State preservation through cycles
- **Auto-close** (1 test) - Multiple open/close cycles

**Total: 28 TsyneTest tests**

### Core Build Tests

```bash
pnpm test -- core/src/__tests__/ported-apps/aranet/index.test.ts
```

Same comprehensive unit tests running against the built distribution.

### Run All Tests

```bash
# Jest tests only
pnpm test -- ported-apps/aranet

# All tests (unit + integration)
TSYNE_HEADED=0 pnpm test
```

## Observable Store Pattern

This app demonstrates the recommended pattern for state management in Tsyne:

```typescript
export class AranetStore {
  private changeListeners: ChangeListener[] = [];

  // Subscribe to changes
  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    listener(); // Call immediately to initialize
    return () => {
      this.changeListeners = this.changeListeners.filter(l => l !== listener);
    };
  }

  private notifyChange() {
    this.changeListeners.forEach(listener => listener());
  }

  // Methods trigger notifications
  async connect(): Promise<void> {
    // ... state update ...
    this.notifyChange(); // UI automatically updates
  }
}

// UI subscribes and updates automatically
store.subscribe(async () => {
  updateStatusDisplay();
  await updateReadingsDisplay();
});
```

**Key Benefits:**
- ✅ One-way data flow (model → view)
- ✅ Predictable state management
- ✅ Easy to test (pure functions, no UI dependencies)
- ✅ Reactive UI updates (listeners called on state changes)
- ✅ Clean separation of concerns

## Architecture

### Data Models

```typescript
enum ConnectionStatus { Disconnected | Scanning | Connecting | Connected }
enum CO2Level { Good | Moderate | Poor }
enum AlertSoundType { Off | Gentle | Urgent }

interface Aranet4Reading {
  co2: number;         // ppm
  temperature: number; // °C
  pressure: number;    // hPa
  humidity: number;    // %
  battery: number;     // %
  timestamp: Date;
}

interface AppSettings {
  alertSound: AlertSoundType;
  autoConnect: boolean;
  refreshInterval: number; // minutes
}
```

### Store Methods

**Connection:**
- `getConnectionStatus()`: Get current connection state
- `connect()`: Connect to Aranet4 device
- `disconnect()`: Disconnect and cleanup

**Readings:**
- `getLastReading()`: Get most recent reading
- `refreshReading()`: Manually request new reading

**CO2 Status:**
- `getCO2Level()`: Current level (good/moderate/poor)
- `getCO2LevelColor()`: Hex color for UI display
- `getCO2LevelIcon()`: Emoji indicator (🟢/🟡/🔴)

**Settings:**
- `getSettings()`: Get current settings (defensive copy)
- `updateAlertSound(sound)`: Change alert sound
- `updateAutoConnect(enabled)`: Enable/disable auto-connect
- `updateRefreshInterval(minutes)`: Set polling interval

## Notes on the Port

### Original App

The original [Aranet4MenuBar](https://github.com/robjama/Aranet4MenuBar) is a native macOS application written in Swift that:
- Connects to Aranet4 sensors via CoreBluetooth
- Displays readings in the macOS menu bar
- Provides a menu bar dropdown with real-time data
- Shows system notifications for air quality changes

### Tsyne Adaptation

This port adapts the functionality to the Tsyne cross-platform framework:

1. **UI Changes** - Since Tsyne doesn't yet have a native menu bar, the app uses a standard window with:
   - Connection status and controls
   - Real-time readings display
   - Settings management in a separate window

2. **Bluetooth Simulation** - The actual Bluetooth implementation is simulated with realistic CO2 data patterns. A real implementation would:
   - Use the Bluetooth protocol stack available on the target platform
   - Implement the Aranet4 GATT protocol (service UUID: `f0cd1400-95da-4f4b-9ac8-aa55d312af0c`)
   - Read from characteristic `f0cd1503-95da-4f4b-9ac8-aa55d312af0c`

3. **Platform Independence** - The port runs unchanged on Linux, macOS, Windows, and browser environments via Tsyne's cross-platform support.

### Future Enhancements

- [ ] Real Bluetooth connectivity via platform-specific bridges
  - [@abandonware/noble](https://github.com/noble/noble) - Node.js BLE library (used by homebridge-aranet4)
  - [Aranet4-Python](https://github.com/Anrijs/Aranet4-Python) - Python client with protocol details in source code
- [ ] Menu bar integration (when Tsyne adds menu bar support)
- [ ] Historical data graphs (24-hour/7-day trends)
- [ ] Multiple device support
- [ ] CSV data export
- [ ] Custom alert thresholds
- [ ] Temperature unit preferences (°F/°C)
- [ ] Launch-at-login option
- [ ] System tray integration

## Code Quality

- **Type Safety**: Full TypeScript types for all interfaces
- **Error Handling**: Graceful connection state management
- **Testing**: 40 unit tests + 28 UI integration tests = 68 total tests
- **Immutability**: Defensive copies of data, no mutable leaks
- **Observable Pattern**: Clean state management, easy to test
- **No Global State**: All state encapsulated in AranetStore class

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 8/10 | Clean `vbox > hbox + separator + vbox` nesting in main window. Settings window is a separate `a.window()` with its own `setContent()` — cleanly composed but adds a second layout tree |
| **Core declarative** | Fluent method chaining | 8/10 | `.withId()` on all reading labels (`co2Level`, `temperature`, `humidity`, `pressure`, `battery`), connection controls, settings controls. `.when()` on connect/disconnect/refresh buttons for conditional visibility |
| **Core declarative** | Programmatic generation | 8/10 | Device selector buttons generated via `store.getAvailableDevices().forEach()` with per-device `.when()` for selection state. Alert sound buttons generated via `for...of` loop with `.when()` toggle pattern. Both show/hide button vs checkmark based on selection state |
| **State architecture** | Observable store | 8/10 | Full `AranetStore` with `subscribe()`/`notifyChange()`. `subscribe()` calls listener immediately on registration (eager initialization pattern). Defensive copies on `getSettings()`, `getAvailableDevices()`. File-based state persistence for device list |
| **Declarative updates** | `.when()` + `.bindTo()` | 6/10 | Multiple `.when()` calls for conditional button visibility (connect/disconnect/refresh, device selection, alert sound selection). No `.bindTo()` — device list and settings are built imperatively via loops inside `buildContent()`. Five `setText()` escapes for reading labels (`co2Label`, `tempLabel`, `humidityLabel`, `pressureLabel`, `batteryLabel`) + `statusLabel` + `connectionLabel` |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 1 | Two `setContent()` calls (main window + settings window). The `updateStatusDisplay()` function calls `refreshButton.when()` imperatively — mixing `.when()` as an update mechanism rather than using it declaratively in `buildContent()` |
| **Testing** | `.withId()` coverage | 8/10 | IDs on all reading labels, connection buttons, settings controls, device buttons (`device-btn-{id}`, `device-selected-{id}`), alert sound buttons (`sound-{type}`, `soundSelected-{type}`). 40 Jest + 28 TsyneTest = 68 total tests |
| **Design** | Separation of concerns | 8/10 | `AranetStore` is 300 lines of pure sensor/connection logic (no UI). `buildAranetApp()` is purely presentational. Settings window cleanly separated. File persistence in store only. Minor concern: `refreshButton.when()` called imperatively in `updateStatusDisplay()` blurs the boundary |
| | **Overall** | **7/10** | Good Observable store with defensive copies and file persistence. Programmatic loop generation for device/sound selectors is a strong point. The main gaps are: no `.bindTo()` usage (device list rebuilt via `setContent`), heavy use of `setText()` for reading updates (7 labels), and imperative `.when()` calls in `updateStatusDisplay()`. Moving reading labels to `.bindText()` and using `.bindTo()` for the device list would push this to 9/10 |

## Credits & Attribution

### Original Aranet4MenuBar

**Portions Copyright (c) 2026 Aranet4MenuBar Contributors**
- Original macOS menu bar app: [Aranet4MenuBar](https://github.com/robjama/Aranet4MenuBar)
- Author: [Rob James](https://github.com/robjama)
- Aranet4 protocol documentation: [Aranet4-Python](https://github.com/Anrijs/Aranet4-Python)

### Tsyne Port

**Portions Copyright Paul Hammant 2026**
- Ported to Tsyne framework demonstrating:
  - Observable store pattern
  - Pseudo-declarative UI composition
  - Cross-platform compatibility
  - Comprehensive testing (Jest + TsyneTest)

### Tsyne Framework

Built with [Tsyne](https://github.com/tsyne-project/tsyne) - TypeScript native GUI framework

## License

**MIT License** - See [LICENSE](LICENSE) file for full text

```
MIT License

Portions Copyright (c) 2026 Aranet4MenuBar Contributors
Portions Copyright Paul Hammant 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## See Also

- [Tsyne Pseudo-Declarative UI Composition](../../docs/pseudo-declarative-ui-composition.md)
- [Observable Store Pattern Examples](../../examples/todomvc.ts)
- [Testing Guide](../../docs/TESTING.md)
- [Original Aranet4MenuBar](https://github.com/robjama/Aranet4MenuBar)
