# Remote Control API

Tsyne environments (PhoneTop, Desktop, TabletTop) include an optional HTTP debug server for remote inspection and control. This enables gray-box testing, debugging, and automation from any machine that can reach the target.

## Enabling the Debug Server

**Via environment variable:**
```bash
TSYNE_DEBUG_PORT=9229 ./scripts/tsyne phone-apps/phonetop.ts
TSYNE_DEBUG_PORT=9229 ./scripts/tsyne core/src/desktop.ts
TSYNE_DEBUG_PORT=9229 ./scripts/tsyne phone-apps/tablet-top.ts
```

**Programmatically:**
```typescript
await buildPhoneTop(a, { debugPort: 9229 });
await buildDesktop(a, { debugPort: 9229 });
await buildTabletTop(a, { debugPort: 9229 });
```

The server binds to `0.0.0.0` so it's accessible from other machines.

## Endpoints

### `GET /`
List all available endpoints.

### `GET /screenshot`
Capture window screenshot as base64 PNG.

### `GET /windows`
List all window IDs.
```bash
curl http://phone:9229/windows
```
```json
{ "windows": ["main", "settings"] }
```

### `GET /tree`
Get widget tree for the main window.
```bash
curl http://phone:9229/tree
```
```json
{
  "tree": {
    "id": "_vbox_main",
    "type": "Container",
    "widgetType": "vbox",
    "x": 0, "y": 0,
    "absX": 0, "absY": 0,
    "w": 540, "h": 960,
    "minW": 100, "minH": 50,
    "visible": true,
    "children": [...]
  }
}
```

### `GET /tree/:windowId`
Get widget tree for a specific window.
```bash
curl http://phone:9229/tree/settings
```

### `GET /widget/:id`
Get a single widget by its internal ID or custom ID.
```bash
# By internal ID
curl http://phone:9229/widget/_entry_abc123

# By custom ID (set via withId())
curl http://phone:9229/widget/username-field
```
```json
{
  "widget": {
    "id": "_entry_abc123",
    "customId": "username-field",
    "type": "Entry",
    "widgetType": "entry",
    "text": "current text value",
    "absX": 50,
    "absY": 200,
    "w": 200,
    "h": 36,
    "visible": true
  }
}
```

### `GET /widget-at?x=N&y=N`
Find the deepest widget at absolute coordinates.
```bash
curl "http://phone:9229/widget-at?x=150&y=300"
```
```json
{
  "x": 150,
  "y": 300,
  "widget": {
    "id": "_button_abc123",
    "customId": "submit-btn",
    "type": "Button",
    "widgetType": "button",
    "text": "Submit",
    "absX": 100,
    "absY": 280,
    "w": 120,
    "h": 40,
    "visible": true
  }
}
```

### `GET /click?x=N&y=N` or `GET /click?id=widgetId`
Click a widget by coordinates or ID.
```bash
# By coordinates (black-box)
curl "http://phone:9229/click?x=150&y=300"

# By ID (white-box)
curl "http://phone:9229/click?id=_button_abc123"
```
```json
{
  "success": true,
  "clicked": "_button_abc123",
  "widget": { "id": "_button_abc123", "type": "Button", "text": "Submit" }
}
```

### `GET /type?x=N&y=N&text=...` or `GET /type?id=widgetId&text=...`
Type text into a widget.
```bash
# By coordinates
curl "http://phone:9229/type?x=200&y=400&text=hello%20world"

# By ID
curl "http://phone:9229/type?id=_entry_xyz&text=mypassword"
```
```json
{
  "success": true,
  "typed": "hello world",
  "into": "_entry_xyz",
  "widget": { "id": "_entry_xyz", "type": "Entry" }
}
```

### `GET /screenshot`
Capture window screenshot as base64-encoded PNG.
```bash
curl http://phone:9229/screenshot
```
```json
{
  "success": true,
  "format": "png",
  "encoding": "base64",
  "width": 540,
  "height": 960,
  "data": "iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Save to file:**
```bash
curl -s http://phone:9229/screenshot | jq -r '.data' | base64 -d > screenshot.png
```

**Use with capture-device-screenshots.sh:**
```bash
# Automatically uses /screenshot when debug server is running
./capture-device-screenshots.sh pixel
./capture-device-screenshots.sh android
```

## PhoneTop-Specific Endpoints

These endpoints are only available in PhoneTop.

### `GET /apps`
List running apps.
```bash
curl http://phone:9229/apps
```
```json
{
  "apps": [
    { "id": "clock_1", "name": "Clock", "isFront": true, "resourceScope": "clock_1" }
  ],
  "frontAppId": "clock_1"
}
```

### `GET /state`
Get PhoneTop state (current page, open folder, etc.).
```bash
curl http://phone:9229/state
```
```json
{
  "currentPage": 0,
  "totalPages": 3,
  "openFolder": null,
  "frontAppId": null,
  "runningAppCount": 0,
  "gridItemCount": 24,
  "folderCount": 5,
  "isLandscape": false,
  "windowSize": { "width": 540, "height": 960 }
}
```

### `GET /phonetop/home`
Go to home screen (hide current app, show launcher).
```bash
curl http://phone:9229/phonetop/home
```
```json
{
  "success": true,
  "action": "home",
  "frontAppId": null
}
```

### `GET /app/quit`
Quit the front app (or a specific app by ID).
```bash
# Quit front app
curl http://phone:9229/app/quit

# Quit specific app by ID
curl "http://phone:9229/app/quit?id=clock_1"
```
```json
{
  "success": true,
  "action": "quit",
  "quitAppId": "clock_1",
  "quitAppName": "Clock"
}
```

## Common App Endpoints (PhoneTop & Desktop)

These endpoints work in both PhoneTop and Desktop environments.

### `GET /app/switchTo?id=appId`
Bring a running app to the front.
```bash
curl "http://device:9229/app/switchTo?id=clock_1"
```
```json
{
  "success": true,
  "action": "switchTo",
  "appId": "clock_1",
  "appName": "Clock"
}
```

In PhoneTop, this switches the visible app. In Desktop, this raises the inner window to the front.

### `GET /app/quit?id=appId`
Quit a running app by ID.
```bash
curl "http://device:9229/app/quit?id=clock_1"
```
```json
{
  "success": true,
  "action": "quit",
  "quitAppId": "clock_1",
  "quitAppName": "Clock"
}
```

## Widget Tree Structure

Each node in the widget tree includes:

| Field | Description |
|-------|-------------|
| `id` | Internal widget ID |
| `customId` | Custom ID set via `withId()` (optional) |
| `type` | Fyne type name (Container, Label, Button, etc.) |
| `widgetType` | Tsyne type (vbox, hbox, label, button, etc.) |
| `text` | Text content if applicable |
| `x`, `y` | Position relative to parent |
| `absX`, `absY` | Absolute position from window origin |
| `w`, `h` | Current size |
| `minW`, `minH` | Minimum size |
| `visible` | Whether widget is currently visible |
| `children` | Child widgets (for containers) |

## Example: Remote Test Script

```bash
#!/bin/bash
PHONE="http://192.168.1.100:9229"

# Wait for app to be ready
sleep 2

# Check initial state
curl "$PHONE/state"

# Click the Clock app icon (assuming it's at these coordinates)
curl "$PHONE/click?x=90&y=150"

# Wait for app to open
sleep 1

# Verify Clock is now the front app
curl "$PHONE/apps" | grep '"isFront": true'

# Go back home
curl "$PHONE/click?x=270&y=920"  # Back button

# Open Settings folder
curl "$PHONE/click?x=270&y=150"

# Type in a search field
curl "$PHONE/type?x=270&y=100&text=wifi"
```

## Security Considerations

The debug server requires token authentication. A random token is generated on startup unless `TSYNE_DEBUG_TOKEN` is set.

**Authentication:**
- Token is printed to console: `[phonetop] Debug token: abc123...`
- Pass token via query param: `/screenshot?token=abc123...`
- Or via header: `X-Debug-Token: abc123...`

**Using a pre-shared token (for automation):**
```bash
# Set same token on device and client
export TSYNE_DEBUG_TOKEN="my-dev-token"
TSYNE_DEBUG_PORT=9229 ./scripts/tsyne phone-apps/phonetop.ts

# Client can now use known token
curl "http://phone:9229/screenshot?token=my-dev-token"
```

For production, do not set `TSYNE_DEBUG_PORT`.

## Testing Approaches

| Approach | Locator | Knows Internals? |
|----------|---------|------------------|
| Black-box | `/click?x=N&y=N` | No - just coordinates |
| Gray-box | `/click?id=submit-btn` | Custom test IDs via `withId()` |
| White-box | `/click?id=_button_abc123` | Internal widget IDs |

The `/widget-at` endpoint bridges black-box to gray-box: find what's at a coordinate, then interact by ID.

### Remote Control vs TsyneTest

| | Remote Control API | TsyneTest |
|---|---|---|
| **Access** | HTTP over network | In-process |
| **Style** | Gray-box (custom IDs) | White-box (direct widget refs) |
| **Use case** | Tethered device testing, CI automation | Unit/integration tests |
| **Latency** | Network round-trip | Immediate |
