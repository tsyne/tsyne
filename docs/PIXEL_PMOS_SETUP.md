# Tsyne on Pixel 3a XL with postmarketOS

Running Tsyne natively on a phone via postmarketOS.

## Hardware

- **Device**: Google Pixel 3a XL (codename: `google-bonito`)
- **Display**: Samsung panel (kernel variant: `sdc`)
- **Architecture**: aarch64

## postmarketOS Setup

Using pmbootstrap from `/home/paul/scm/pmbootstrap`:

```bash
# Configure device
pmbootstrap config device google-bonito
pmbootstrap config kernel sdc

# Build image with Tsyne dependencies
pmbootstrap install --password <password> --add "nodejs,npm,rsync"

# Flash (device in fastboot mode)
pmbootstrap flasher flash_rootfs
pmbootstrap flasher flash_vbmeta
pmbootstrap flasher flash_kernel
fastboot --set-active=a
fastboot reboot
```

## Building the Bridge for aarch64

The Go/Fyne bridge must be compiled for aarch64. We use the pmbootstrap chroot with qemu emulation:

```bash
# From /home/paul/scm/tsyne
./rebuild-bridge-aarch64.sh
```

This:
1. Copies bridge source to the aarch64 chroot
2. Builds via `go build` under qemu emulation (~15 min)
3. Outputs to chroot at `/home/paul/tsyne/bin/tsyne-bridge`

### Chroot Dependencies

The aarch64 chroot needs these packages for building:

```
go mesa-dev libxrandr-dev libxcursor-dev libxinerama-dev
libxi-dev libxxf86vm-dev wayland-dev glfw-dev
pipewire-dev alsa-lib-dev pulseaudio-dev
```

## Syncing to Device

After the device boots and you unlock the screen:

```bash
# From /home/paul/scm/tsyne
./sync-to-pixel.sh              # Full sync (src + bridge)
./sync-to-pixel.sh --src-only   # Just TypeScript changes
./sync-to-pixel.sh --bridge-only # Just the bridge binary
./sync-to-pixel.sh --node-modules # Resync node_modules
```

The sync script uses `sshpass` and `rsync` over USB networking (172.16.42.1).

## Running Apps on Device

SSH to the device and set up the X11 environment:

```bash
ssh paul@172.16.42.1
cd ~/tsyne

# Fyne needs X11 via XWayland
export DISPLAY=:0
export XAUTHORITY=$(find /run/user -name '.mutter-Xwaylandauth*' 2>/dev/null | head -1)

# Run an app
npx tsx examples/01-hello-world.ts
npx tsx examples/02-counter.ts
```

## Directory Structure on Device

```
~/tsyne/
├── bin/
│   └── tsyne-bridge      # aarch64 Fyne bridge (40MB)
├── src/                  # TypeScript source
├── core/
│   └── src -> ../src     # Symlink for import paths
├── examples/             # Example apps
├── node_modules/         # npm dependencies
├── package.json
└── tsconfig.json
```

## Technical Notes

### Display Stack

- GNOME Mobile runs on Wayland
- Fyne/GLFW requires X11
- XWayland provides X11 compatibility
- Must set `DISPLAY=:0` and `XAUTHORITY` for X11 auth

### USB Networking

- postmarketOS exposes USB NCM gadget
- Device IP: 172.16.42.1
- Host gets IP via DHCP (172.16.42.x)
- SSH enabled by default

### Auto-Resize Root Filesystem

The default pmbootstrap image creates a small (~4.4GB) filesystem even though the
partition is much larger (~50GB). A systemd service auto-resizes on first boot:

```
/etc/systemd/system/resize-rootfs.service
```

If you need to manually resize (e.g., on an existing install):

```bash
# On device with doas
doas resize2fs $(findmnt -n -o SOURCE /)
```

### Known Issues

- Bridge build is slow (~15 min) due to qemu aarch64 emulation
- npm install can fail on device due to memory constraints - use chroot instead
- XAUTHORITY path changes on reboot (mutter generates new auth file)

## Iteration Workflow

1. Edit TypeScript on host
2. `./sync-to-pixel.sh --src-only`
3. SSH to device, run app
4. Repeat

For Go bridge changes:
1. Edit Go on host
2. `./rebuild-bridge-aarch64.sh` (slow)
3. `./sync-to-pixel.sh --bridge-only`
4. Test on device
