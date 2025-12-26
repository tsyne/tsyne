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

**Supported Apps**:
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
```

Or launch from phonetop:

```bash
./scripts/tsyne phone-apps/phonetop.ts
# Tap "Native" folder, then "Camera (Native)"
```

## License

Native apps follow the same BSD 2-Clause license as Tsyne. See individual app files for copyright notices.
