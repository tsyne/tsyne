# Pixel 3a XL: postmarketOS + i3 + Phonetop Setup Guide

**Last updated:** 28 Dec 2025

Complete guide to flash a Pixel 3a XL with postmarketOS, i3wm, and Phonetop (Tsyne phone launcher).

## Prerequisites

- Ubuntu host machine (tested on 24.04)
- Pixel 3a XL with unlocked bootloader
- USB cable
- pmbootstrap installed: https://wiki.postmarketos.org/wiki/Pmbootstrap

## Part 1: pmbootstrap Configuration

### 1.1 Initialize pmbootstrap

```bash
cd /home/paul/scm/pmbootstrap
./pmbootstrap.py init
```

Select:
- Channel: `systemd-edge`
- Device: `google-bonito` (Pixel 3a XL)
- Kernel: `sdc` (Samsung display panel) or `tianma` depending on your device
- Username: `paul` (or your preference)
- UI: `gnome-mobile` (we'll add i3 on top)

### 1.2 Verify configuration

```bash
./pmbootstrap.py config device    # should show google-bonito
./pmbootstrap.py config ui        # should show gnome-mobile
```

## Part 2: Install Packages in Chroot

### 2.1 Install i3wm and X11 dependencies

```bash
./pmbootstrap.py chroot -r -- apk add \
    i3wm i3status dmenu xterm \
    xorg-server xinit xhost \
    xf86-input-evdev evtest
```

**Important:** `xf86-input-evdev` is required for touch-to-click. The default libinput driver sends XI2 touch events that Fyne/GLFW doesn't handle.

### 2.2 Install Node.js and development tools

```bash
./pmbootstrap.py chroot -r -- apk add \
    nodejs npm \
    go mesa-dev libxrandr-dev libxcursor-dev libxinerama-dev \
    libxi-dev libxxf86vm-dev wayland-dev glfw-dev \
    pipewire-dev alsa-lib-dev pulseaudio-dev
```

## Part 3: Configure the Chroot Filesystem

### 3.1 Create touchscreen X11 config

```bash
CHROOT="/home/paul/pmwork/chroot_rootfs_google-bonito"

sudo mkdir -p "${CHROOT}/etc/X11/xorg.conf.d"
sudo tee "${CHROOT}/etc/X11/xorg.conf.d/99-touchscreen.conf" << 'EOF'
Section "InputClass"
    Identifier "touchscreen-evdev"
    MatchIsTouchscreen "on"
    MatchDevicePath "/dev/input/event*"
    Driver "evdev"
EndSection
EOF
```

### 3.2 Create autologin service

```bash
sudo mkdir -p "${CHROOT}/etc/systemd/system/getty@tty1.service.d"
sudo tee "${CHROOT}/etc/systemd/system/getty@tty1.service.d/autologin.conf" << 'EOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin paul --noclear %I linux
EOF
```

### 3.3 Create user profile (.profile)

```bash
sudo tee -a "${CHROOT}/home/paul/.profile" << 'EOF'

# Start X on tty1
if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
    exec startx
fi
EOF
```

### 3.4 Create .xinitrc

```bash
sudo tee "${CHROOT}/home/paul/.xinitrc" << 'EOF'
#!/bin/sh
xhost +local:
exec i3
EOF
sudo chmod +x "${CHROOT}/home/paul/.xinitrc"
```

### 3.5 Create i3 config

```bash
sudo mkdir -p "${CHROOT}/home/paul/.config/i3"
sudo tee "${CHROOT}/home/paul/.config/i3/config" << 'EOF'
# i3 config for Pixel 3a XL with Phonetop

set $mod Mod4

# Font for window titles
font pango:monospace 12

# Start phonetop on login
exec --no-startup-id ~/start-phonetop.sh

# Keybindings
bindsym $mod+Return exec xterm
bindsym $mod+Shift+q kill
bindsym $mod+d exec dmenu_run
bindsym $mod+f fullscreen toggle
bindsym $mod+Shift+c reload
bindsym $mod+Shift+r restart
bindsym $mod+Shift+e exec "i3-nagbar -t warning -m 'Exit i3?' -B 'Yes' 'i3-msg exit'"

# Focus
bindsym $mod+h focus left
bindsym $mod+j focus down
bindsym $mod+k focus up
bindsym $mod+l focus right

# Move
bindsym $mod+Shift+h move left
bindsym $mod+Shift+j move down
bindsym $mod+Shift+k move up
bindsym $mod+Shift+l move right

# Workspaces
bindsym $mod+1 workspace 1
bindsym $mod+2 workspace 2
bindsym $mod+3 workspace 3
bindsym $mod+Shift+1 move container to workspace 1
bindsym $mod+Shift+2 move container to workspace 2
bindsym $mod+Shift+3 move container to workspace 3

# Status bar
bar {
    status_command i3status
    position bottom
}
EOF
```

### 3.6 Create phonetop startup script

```bash
sudo tee "${CHROOT}/home/paul/start-phonetop.sh" << 'EOF'
#!/bin/sh
# Phonetop launcher for i3wm on Pixel 3a XL

sleep 3

# Find the X server auth file
XAUTHORITY=$(ls -t ~/.serverauth.* 2>/dev/null | head -1)
export XAUTHORITY

# Find the display
DISPLAY=$(ps aux | grep '[X]org.*:' | sed 's/.*:\([0-9]*\).*/:\1/' | head -1)
export DISPLAY

# Scale for high-DPI phone screen (1080x2160)
export FYNE_SCALE=2.5
export GDK_SCALE=2

echo "Using DISPLAY=$DISPLAY XAUTHORITY=$XAUTHORITY FYNE_SCALE=$FYNE_SCALE" > ~/phonetop.log

# Allow local X connections
xhost +local: >> ~/phonetop.log 2>&1 || true

# Start phonetop
cd ~/tsyne
npx tsx phone-apps/phonetop.ts >> ~/phonetop.log 2>&1 &

# Wait for window to appear
sleep 5

# Focus and fullscreen
i3-msg '[title="Tsyne Phone"] focus' >> ~/phonetop.log 2>&1
i3-msg 'fullscreen enable' >> ~/phonetop.log 2>&1

echo "Phonetop started and fullscreened" >> ~/phonetop.log
EOF
sudo chmod +x "${CHROOT}/home/paul/start-phonetop.sh"
```

### 3.7 Fix file ownership

```bash
sudo chown -R 10000:10000 "${CHROOT}/home/paul"
```

## Part 4: Build Tsyne Bridge (aarch64)

### 4.1 Sync bridge source to chroot

```bash
sudo rsync -av /home/paul/scm/tsyne/core/bridge/ "${CHROOT}/home/paul/tsyne/bridge/"
sudo mkdir -p "${CHROOT}/home/paul/tsyne/bin"
sudo chown -R 10000:10000 "${CHROOT}/home/paul/tsyne"
```

### 4.2 Build bridge in chroot

```bash
cd /home/paul/scm/pmbootstrap
./pmbootstrap.py chroot -r -- sh -c 'cd /home/paul/tsyne/bridge && CGO_ENABLED=1 go build -o /home/paul/tsyne/bin/tsyne-bridge .'
```

This takes ~15 minutes (qemu-emulated aarch64 build).

## Part 5: Flash the Device

### 5.1 Build the image

```bash
./pmbootstrap.py install --password 147147
```

### 5.2 Put device in fastboot mode

- Power off the Pixel
- Hold Power + Volume Down until fastboot screen appears
- Connect USB cable

### 5.3 Flash

```bash
./pmbootstrap.py flasher flash_rootfs
./pmbootstrap.py flasher flash_vbmeta
./pmbootstrap.py flasher flash_kernel

# Set active slot and reboot
fastboot --set-active=a
fastboot reboot
```

## Part 6: Post-Flash Setup

### 6.1 Set up USB networking on host

The Pixel appears as a USB network device at 172.16.42.1.

```bash
# Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1

# NAT for internet access (replace wlp0s20f3 with your wifi interface)
sudo iptables -t nat -A POSTROUTING -s 172.16.42.0/24 -o wlp0s20f3 -j MASQUERADE
```

### 6.2 SSH to device

```bash
ssh paul@172.16.42.1
# password: 147147
```

### 6.3 Sync Tsyne source and apps

From host machine:

```bash
cd /home/paul/scm/tsyne
./sync-to-pixel.sh
```

This syncs:
- `core/src/` - TypeScript framework
- `examples/` - Example apps
- `phone-apps/` - Phonetop and phone apps
- `bin/tsyne-bridge` - aarch64 bridge binary

### 6.4 Install npm dependencies on device (first time only)

```bash
ssh paul@172.16.42.1
cd ~/tsyne
npm install
```

### 6.5 Reboot to start phonetop

```bash
ssh paul@172.16.42.1
sudo reboot
```

The boot sequence:
1. Kernel boots, systemd starts
2. getty@tty1 autologins as paul
3. .profile runs startx
4. .xinitrc runs i3
5. i3 runs ~/start-phonetop.sh
6. Phonetop launches fullscreen with touch support

## Part 7: Development Workflow

### 7.1 Sync code changes

```bash
cd /home/paul/scm/tsyne

# Sync everything (source + bridge)
./sync-to-pixel.sh

# Sync only TypeScript changes (fast)
./sync-to-pixel.sh --src-only

# Sync only bridge binary
./sync-to-pixel.sh --bridge-only
```

### 7.2 Restart phonetop after changes

```bash
ssh paul@172.16.42.1 'pkill -f phonetop; pkill -f tsyne-bridge; sleep 1; ~/start-phonetop.sh &'
```

Or from host (using sshpass for non-interactive):

```bash
# Kill existing processes (pkill -f matches command line, more reliable than killall)
sshpass -p "147147" ssh paul@172.16.42.1 'pkill -f phonetop; pkill -f tsyne-bridge' 2>/dev/null || true

# Start phonetop (run in background on remote)
sshpass -p "147147" ssh paul@172.16.42.1 'cd ~/tsyne && DISPLAY=:0 XAUTHORITY=$(ls -t ~/.serverauth.* | head -1) FYNE_SCALE=2.5 npx tsx phone-apps/phonetop.ts &'

# Fullscreen after startup
sleep 5
sshpass -p "147147" ssh paul@172.16.42.1 'DISPLAY=:0 i3-msg "[title=\"Tsyne Phone\"] focus" && DISPLAY=:0 i3-msg "fullscreen enable"'
```

**Note:** The node process appears as `npm exec tsx` or `/usr/bin/node ... phonetop.ts`, so `pkill -f phonetop` is more reliable than `killall tsx`.

### 7.3 Rebuild bridge after Go changes

```bash
cd /home/paul/scm/pmbootstrap

# Sync source to chroot
CHROOT="/home/paul/pmwork/chroot_rootfs_google-bonito"
sudo rsync -av /home/paul/scm/tsyne/core/bridge/ "${CHROOT}/home/paul/tsyne/bridge/"

# Build in chroot
./pmbootstrap.py chroot -r -- sh -c 'cd /home/paul/tsyne/bridge && CGO_ENABLED=1 go build -o /home/paul/tsyne/bin/tsyne-bridge .'

# Sync to device
cd /home/paul/scm/tsyne
./sync-to-pixel.sh --bridge-only
```

## Troubleshooting

### Touch not working

Check evdev driver is loaded:
```bash
DISPLAY=:0 xinput list
grep -i touch /var/log/Xorg.*.log
```

Verify touch events reach kernel:
```bash
evtest /dev/input/event4
```

### Phonetop not starting

Check logs:
```bash
cat ~/phonetop.log
```

Run manually:
```bash
export DISPLAY=:0
export XAUTHORITY=$(ls -t ~/.serverauth.* | head -1)
export FYNE_SCALE=2.5
cd ~/tsyne
npx tsx phone-apps/phonetop.ts
```

### X11 auth errors

```bash
xhost +local:
```

### No network on device

Check USB network service:
```bash
systemctl status usb-network
ip addr show usb0
```

## Hardware Info

- **Display**: DSI-1, 1080x2160
- **Touchscreen**: Synaptics S3706B (event4)
- **Architecture**: aarch64
- **Kernel**: postmarketos-qcom-sdm670

## File Locations

| Location | Purpose |
|----------|---------|
| `/home/paul/.xinitrc` | Starts i3 |
| `/home/paul/.config/i3/config` | i3 configuration |
| `/home/paul/start-phonetop.sh` | Phonetop launcher |
| `/home/paul/tsyne/` | Tsyne framework + apps |
| `/home/paul/tsyne/bin/tsyne-bridge` | Go/Fyne bridge |
| `/home/paul/tsyne/phone-apps/phonetop.ts` | Phone launcher |
| `/etc/X11/xorg.conf.d/99-touchscreen.conf` | Touch driver config |
