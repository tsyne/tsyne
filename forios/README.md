# Tsyne for iOS

Deploy Tsyne apps (phonetop + ported apps) to iOS using:
- **Fyne** for native UI (compiled for iOS)
- **nodejs-mobile** for running TypeScript/JavaScript

## Architecture

```
┌─────────────────────────────────────────────────┐
│              iOS App Bundle                      │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐      ┌─────────────────────┐  │
│  │ Fyne Bridge  │◄────►│   nodejs-mobile     │  │
│  │ (native UI)  │ UDS  │ (runs phonetop.js)  │  │
│  └──────────────┘      └─────────────────────┘  │
│         │                       │               │
│         ▼                       ▼               │
│  Native iOS widgets    Bundled JS + node_modules│
│                                                  │
└─────────────────────────────────────────────────┘
```

## Components

1. **bundle/** - Pre-built JavaScript bundle (phonetop + all apps)
2. **scripts/** - Build and deployment scripts
3. **ios-project/** - Xcode project (generated on Mac)

## Prerequisites

### On any machine (Chromebook/Linux/Mac):
- Node.js 18+
- npm

### On Mac only:
- Xcode 14+
- Go 1.21+
- Fyne CLI: `go install fyne.io/fyne/v2/cmd/fyne@latest`
- CocoaPods: `sudo gem install cocoapods`

## Build Steps

### Step 1: Bundle JavaScript (works anywhere)

```bash
# From tsyne root directory
./forios/scripts/bundle.sh
```

This creates `forios/bundle/` containing:
- `phonetop.bundle.js` - Bundled phonetop + dependencies
- `node_modules/` - Required native modules
- `ported-apps/` - All ported app sources

### Step 2: Build Fyne for iOS (Mac only)

```bash
# On Mac
./forios/scripts/build-fyne-ios.sh
```

### Step 3: Create iOS Project (Mac only)

```bash
# On Mac - creates Xcode project with nodejs-mobile
./forios/scripts/create-ios-project.sh
```

### Step 4: Deploy to Device (Mac only)

```bash
# Connect iPhone, then:
./forios/scripts/deploy.sh
```

## IPC Protocol

The Fyne bridge and nodejs-mobile communicate via Unix Domain Sockets (UDS):
- Socket path: `{app_sandbox}/tsyne-bridge.sock`
- Protocol: MessagePack (same as `TSYNE_BRIDGE_MODE=msgpack-uds`)

## App Signing

For development/personal use ($99/year Apple Developer):
1. Create an App ID in Apple Developer portal
2. Create a Development provisioning profile
3. Configure in Xcode project

## Directory Structure

```
forios/
├── README.md           # This file
├── bundle/             # Output: bundled JS (git-ignored)
│   ├── phonetop.bundle.js
│   ├── node_modules/
│   └── ported-apps/
├── scripts/
│   ├── bundle.sh       # Bundle JS (works anywhere)
│   ├── build-fyne-ios.sh    # Build Fyne (Mac only)
│   ├── create-ios-project.sh # Create Xcode proj (Mac only)
│   └── deploy.sh       # Deploy to device (Mac only)
└── ios-project/        # Xcode project (Mac only, git-ignored)
```

## Troubleshooting

### "nodejs-mobile not found"
Install via CocoaPods in the ios-project directory.

### "Code signing error"
Ensure you have a valid Apple Developer account and provisioning profile.

### "Bridge connection failed"
Check that the UDS socket path is accessible within the iOS sandbox.
