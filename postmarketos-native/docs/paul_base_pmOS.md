# Pixel 3a XL postmarketOS Base Configuration

> **Note:** For the complete i3 + Phonetop setup guide, see [PIXEL-I3-PHONETOP-SETUP.md](PIXEL-I3-PHONETOP-SETUP.md)

Working deployment configuration for reference (gnome-mobile base).

## Device Details

- **Device**: Google Pixel 3a XL
- **Codename**: google-bonito
- **Architecture**: aarch64
- **Display panel**: Samsung (sdc)
- **Active slot**: a

## pmbootstrap Configuration

```bash
pmbootstrap config device google-bonito
pmbootstrap config kernel sdc
```

## Deployment Commands

```bash
# Build the image
pmbootstrap install --password <password>

# Flash to device (device must be in fastboot mode)
pmbootstrap flasher flash_rootfs
pmbootstrap flasher flash_vbmeta
pmbootstrap flasher flash_kernel

# Set active slot and reboot
fastboot --set-active=a
fastboot reboot
```

## Installed Software

- **Base**: postmarketos-base-systemd
- **UI**: gnome-mobile
- **SSH**: enabled by default

## Post-boot Access

```bash
ssh paul@172.16.42.1
```

## Notes

- The device has two kernel variants based on display panel manufacturer:
  - `sdc` - Samsung panel
  - `tianma` - Tianma panel
- This device uses the `sdc` (Samsung) variant
- Channel: systemd-edge (pmaports: master)

## Tsyne Development Setup

The aarch64 chroot has Tsyne (TypeScript + Go/Fyne bridge) pre-configured.

### Installed Dependencies

```
# Go + Fyne requirements
go mesa-dev libxrandr-dev libxcursor-dev libxinerama-dev
libxi-dev libxxf86vm-dev wayland-dev glfw-dev

# Sound
pipewire-dev alsa-lib-dev pulseaudio-dev

# Node.js for TypeScript
nodejs npm
```

### Chroot Paths

- Bridge binary: `/home/paul/tsyne/bin/tsyne-bridge`
- TypeScript source: `/home/paul/tsyne/src/`
- Phone apps: `/home/paul/tsyne/phone-apps/`

### Iteration Workflow

From `/home/paul/scm/tsyne`:

```bash
# Sync source + bridge to device (after boot)
./sync-to-pixel.sh

# Sync only TypeScript changes
./sync-to-pixel.sh --src-only

# Rebuild bridge after Go changes (slow - qemu emulated)
./rebuild-bridge-aarch64.sh
./sync-to-pixel.sh --bridge-only
```

### Running on Device

```bash
ssh paul@172.16.42.1
cd ~/tsyne

# Need X11 auth for Fyne/GLFW (find the mutter auth file)
export DISPLAY=:0
export XAUTHORITY=$(find /run/user -name '.mutter-Xwaylandauth*' 2>/dev/null | head -1)

npx tsx examples/01-hello-world.ts
```

### Notes

- Fyne prefers X11 over Wayland for now (runs under XWayland on GNOME Mobile)
- Sound via PipeWire/PulseAudio
- Bridge build is slow (~15min) due to qemu aarch64 emulation
