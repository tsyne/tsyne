# PostmarketOS Native Deployment

Deploy and run Tsyne PhoneTop on postmarketOS devices.

## Supported Devices

| Device | Codename | Status |
|--------|----------|--------|
| Pixel 3a XL | google-bonito | Working |

## Quick Start

### 1. Setup Environment

```bash
cd postmarketos-native
./scripts/setup.sh
```

This clones pmbootstrap and runs initialization.

### 2. Install Chroot Packages

```bash
./scripts/install-chroot-packages.sh
```

### 3. Build Bridge

```bash
./scripts/build-bridge.sh
```

This builds the Go/Fyne bridge for aarch64 (~15 minutes via qemu).

### 4. Flash Device

Put device in fastboot mode (Power + Volume Down), then:

```bash
./scripts/flash-device.sh
```

### 5. Setup Device (after first boot)

After flashing, boot the device and run the setup script to apply configs:

```bash
./scripts/setup-device.sh
```

This applies:
- Touchscreen driver
- Autologin configuration
- Power app permissions (reboot/shutdown without password)
- i3 window manager config
- PhoneTop auto-start

> **Note:** This must be re-run after each flash as configs are reset.

### 6. Sync and Run

```bash
./scripts/sync-to-device.sh
./scripts/run-phonetop.sh
```

## Directory Structure

```
postmarketos-native/
├── pmbootstrap/          # Git clone (gitignored)
├── work/                 # pmbootstrap work dir (gitignored)
├── device-configs/       # Per-device configuration
│   └── google-bonito/    # Pixel 3a XL
│       ├── touchscreen.conf
│       ├── i3-config
│       ├── xinitrc
│       ├── start-phonetop.sh
│       └── autologin.conf
├── scripts/
│   ├── setup.sh                    # Initial setup
│   ├── install-chroot-packages.sh  # Install deps in chroot
│   ├── build-bridge.sh             # Build aarch64 bridge
│   ├── sync-to-device.sh           # Sync source/bridge
│   └── run-phonetop.sh             # Start PhoneTop
└── README.md
```

## Debug API

PhoneTop runs a debug server on port 9230.

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `/?token=TOKEN` | List all endpoints |
| `/state?token=TOKEN` | Get PhoneTop state (page, folder, front app) |
| `/screenshot?token=TOKEN` | Capture PNG screenshot (base64 in `.data`) |
| `/tree?token=TOKEN` | Get full widget tree |
| `/apps?token=TOKEN` | List running apps |
| `/click?id=WIDGET_ID&token=TOKEN` | Click widget by internal ID |
| `/phonetop/home?token=TOKEN` | Go to home screen |
| `/app/quit?token=TOKEN` | Quit front app |

### Authentication

The debug token is **randomly generated** on each startup for security. Find it in the logs:
```bash
ssh paul@172.16.42.1 'grep "Debug token:" ~/phonetop.log'
```

Or use `run-phonetop.sh` which extracts and displays the token automatically.

### Examples

```bash
# Get token from logs
TOKEN=$(ssh paul@172.16.42.1 "grep -o 'Debug token: [a-f0-9]*' ~/phonetop.log | tail -1 | cut -d' ' -f3")

# Screenshot
curl -s "http://172.16.42.1:9230/screenshot?token=$TOKEN" | jq -r '.data' | base64 -d > screenshot.png

# Click widget
curl -s "http://172.16.42.1:9230/click?id=_button_xxx&token=$TOKEN"

# Check state
curl -s "http://172.16.42.1:9230/state?token=$TOKEN"
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DEVICE_IP | 172.16.42.1 | Device IP (USB networking) |
| DEVICE_USER | paul | SSH username |
| DEVICE_PASS | 147147 | SSH password |
| TSYNE_DEBUG_TOKEN | (random) | Override debug token (optional) |

## Adding a New Device

1. Create `device-configs/<codename>/`
2. Add device-specific configs (touchscreen, display, etc.)
3. Update pmbootstrap init for the new device
4. Test and document

## Troubleshooting

### Touch not working

Check evdev driver:
```bash
ssh paul@172.16.42.1
DISPLAY=:0 xinput list
grep -i touch /var/log/Xorg.*.log
```

### PhoneTop not starting

Check logs:
```bash
ssh paul@172.16.42.1 'tail -f ~/phonetop.log'
```

### Bridge build fails

Ensure chroot packages are installed:
```bash
./scripts/install-chroot-packages.sh
```
