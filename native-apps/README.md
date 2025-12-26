# Native Apps

Native apps are system applications that run outside of Tsyne's Fyne bridge. Instead of using the Tsyne UI toolkit, they spawn external processes directly on the host system.

## Purpose

Native apps enable Tsyne phone deployments to access system-level functionality that would be better served by existing native applications:

- **postmarketOS**: Launch bundled system apps (camera, video player, etc.)
- **Linux**: Execute system commands and launch desktop applications
- **Other platforms**: Delegate to platform-specific native apps

## Structure

```
native-apps/
├── pmOS/               # postmarketOS native apps
│   ├── camera/
│   │   └── camera.ts   # Launch gnome-camera or megapixels
│   └── ...
├── linux/              # Generic Linux system apps (future)
└── README.md
```

## Creating a Native App

### Basic Structure

Create a `.ts` file in `native-apps/<platform>/<appname>/` with the following metadata:

```typescript
/**
 * App Description
 *
 * @tsyne-app:name Display Name
 * @tsyne-app:category native
 * @tsyne-app:builder buildMyNativeApp
 * @tsyne-app:args app
 * @tsyne-app:count one
 */

import type { App } from '../../../core/src';

export function buildMyNativeApp(a: App): void {
  // Spawn external process, show minimal UI if needed
  launchNativeApp(a);
}

async function launchNativeApp(a: App): Promise<void> {
  const { spawn } = await import('child_process');
  // ...
}

if (require.main === module) {
  const { app, resolveTransport } = require('../../../core/src/index');
  app(resolveTransport(), { title: 'App Name' }, buildMyNativeApp);
}
```

### Key Points

1. **Metadata Required**:
   - `@tsyne-app:name` - Display name in phone launcher
   - `@tsyne-app:category native` - Groups app in "Native" folder
   - `@tsyne-app:builder` - Export function name
   - `@tsyne-app:args app` - Receives App instance

2. **No Tsyne UI Required**:
   - Native apps can create a minimal window or none at all
   - Focus is on launching the external process
   - Window can show status or launch confirmation

3. **Process Management**:
   - Use `spawn()` with `detached: true` and `stdio: 'ignore'`
   - Call `unref()` so parent process doesn't block
   - Handle process errors gracefully

4. **Error Handling**:
   - If native app not found, show user-friendly message
   - Try multiple command names (e.g., `gnome-camera`, `megapixels`, `camera`)
   - Don't crash if system app is unavailable

## Current Apps

### Camera (postmarketOS)

**Location**: `native-apps/pmOS/camera/camera.ts`

Launches the system camera application on postmarketOS devices.

**Supported Apps** (tried in order):
- `gnome-camera` - GNOME Camera (primary)
- `megapixels` - Megapixels camera app
- `camera` - Generic camera command

**Features**:
- Shows minimal "Launching camera..." UI
- Auto-closes when camera app exits
- Graceful fallback if no camera app found

**Usage**:
- Appears in "Native" folder on phone home screen
- Tap to launch system camera
- Returns to home when camera is closed

### Dialer (postmarketOS)

**Location**: `native-apps/pmOS/dialer/dialer.ts`

Launches the system phone dialer on postmarketOS devices.

**Supported Apps** (tried in order):
- `gnome-calls` - GNOME Calls (primary)
- `calls` - Generic calls command
- `phosh-dialer` - Phosh dialer
- `jolla-dialer` - Jolla dialer (SailfishOS compatibility)

**Features**:
- Shows "Launching native dialer app..." UI
- Detached process spawning
- Fallback handling for missing apps

### Messages (postmarketOS)

**Location**: `native-apps/pmOS/messages/messages.ts`

Launches the system SMS/messaging application on postmarketOS devices.

**Supported Apps** (tried in order):
- `chatty` - Chatty (primary - most popular on pmOS)
- `gnome-messages` - GNOME Messages
- `messages` - Generic messages command
- `geary` - Geary mail+messaging client
- `conversations` - Conversations messaging app

**Features**:
- Shows "Launching native messages app..." UI
- Multiple fallback options for different pmOS configurations
- Graceful error handling

## Integration with PhoneTop

Native apps are automatically discovered by `phone-apps/phonetop.ts`:

1. Directory scanning: `native-apps/` is scanned for `.ts` files
2. Metadata parsing: `@tsyne-app:*` comments are extracted
3. Categorization: Apps with `category: native` go in "Native" folder
4. Display: Folder appears on home screen with native icon

## Platform Conventions

### postmarketOS

- Directory: `native-apps/pmOS/`
- Focus: System bundled apps (camera, video, gallery, etc.)
- Typical commands: `gnome-camera`, `megapixels`, `mpv`, `gedit`

### Linux (Future)

- Directory: `native-apps/linux/`
- Focus: XDG Desktop launcher, system commands
- Examples: Open files with default app, launch desktop apps

## Testing

Run a native app standalone:

```bash
npx tsx native-apps/pmOS/camera/camera.ts
npx tsx native-apps/pmOS/dialer/dialer.ts
npx tsx native-apps/pmOS/messages/messages.ts
```

Or launch from phonetop:

```bash
./scripts/tsyne phone-apps/phonetop.ts
# Tap "Native" folder, then select an app
```

## Troubleshooting & Debugging

Native apps provide solid debugging output through multiple channels:

### 1. **Console Logging** (stdout/stderr)

Each native app emits detailed logs:

```
[native-camera] Launched: gnome-camera
[native-dialer] Launched: gnome-calls
[native-messages] Launched: chatty
```

When launching from phonetop:
```bash
./scripts/tsyne phone-apps/phonetop.ts 2>&1 | grep "native-"
```

### 2. **UI Status Messages**

Each native app shows a status window with:
- Launch status: "📷 Launching native camera app..."
- Success message: "Started: gnome-camera"
- Error message: "No camera app found on this system"

The status label updates as the app attempts different command names in order.

### 3. **Error Diagnostics**

When a native app fails to spawn:

```
Failed to launch gnome-camera: ENOENT
Failed to spawn megapixels: Error...
No postmarketOS camera app found
```

This tells you:
- Which command names were tried (in fallback order)
- Why each failed (ENOENT = app not installed)
- That no compatible apps exist on the system

### 4. **Common Issues**

| Issue | Cause | Solution |
|-------|-------|----------|
| "No camera app found" | Camera app not installed | Install gnome-camera, megapixels, or compatible app |
| App launches but invisible | Running in detached mode | Check if app is running: `ps aux \| grep gnome-camera` |
| "Failed to import child_process" | Non-Node environment | Native apps only work in Node.js contexts |
| App not appearing in Native folder | Metadata parse error | Check `@tsyne-app:name`, `@tsyne-app:category native`, `@tsyne-app:builder` |
| Launch hangs | stdio not set to 'ignore' | Verify `spawn()` uses `stdio: 'ignore'` |

### 5. **Debugging a Specific App**

To debug why a native app isn't launching:

1. **Check if app is installed**:
   ```bash
   which gnome-camera
   which chatty
   which gnome-calls
   ```

2. **Try spawning directly**:
   ```bash
   gnome-camera &   # Should open camera
   chatty &         # Should open messages
   gnome-calls &    # Should open dialer
   ```

3. **Run the native app directly**:
   ```bash
   npx tsx native-apps/pmOS/camera/camera.ts 2>&1
   ```

4. **Check phonetop logs**:
   ```bash
   ./scripts/tsyne phone-apps/phonetop.ts 2>&1 | tee phonetop.log
   # Tap the Native folder and app, then check phonetop.log for [native-*] messages
   ```

### 6. **Adding More Fallback Apps**

To support additional apps, edit the `*Commands` array in each app's source:

```typescript
const cameraCommands = [
  'gnome-camera',    // Primary
  'megapixels',      // Fallback 1
  'camera',          // Fallback 2
  'my-custom-camera' // Add here
];
```

The spawn loop tries each command in order and logs which ones fail.

## License

Native apps follow the same BSD 2-Clause license as Tsyne. See individual app files for copyright notices.
