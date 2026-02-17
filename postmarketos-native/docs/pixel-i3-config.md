# Working Pixel 3a XL Config: i3 + Phonetop

> **Note:** For the complete setup guide from scratch, see [PIXEL-I3-PHONETOP-SETUP.md](PIXEL-I3-PHONETOP-SETUP.md)
>
> This file documents the running configuration for reference/debugging.

## Device
- Device: google-bonito (Pixel 3a XL)
- Architecture: aarch64
- Display: DSI-1 (1080x2160)
- Touchscreen: Synaptics S3706B

## Installed Packages
```
i3wm i3status dmenu xterm xorg-server xinit xhost xf86-input-evdev evtest
```

## Touchscreen Configuration

### /etc/X11/xorg.conf.d/99-touchscreen.conf
```
Section "InputClass"
    Identifier "touchscreen-evdev"
    MatchIsTouchscreen "on"
    MatchDevicePath "/dev/input/event*"
    Driver "evdev"
EndSection
```
**Note:** The evdev driver is required for touch-to-click. libinput sends XI2 touch events that Fyne/GLFW doesn't handle properly.

## Key Files

### /etc/systemd/system/getty@tty1.service.d/autologin.conf
```
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin paul --noclear %I linux
```

### ~/.profile (appended)
```bash
# Start X on tty1
if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
    exec startx
fi
```

### ~/.xinitrc
```bash
#!/bin/sh
xhost +local:
exec i3
```

### ~/.config/i3/config (key parts)
```
set $mod Mod4
exec --no-startup-id ~/start-phonetop.sh
bindsym $mod+Return exec xterm
bindsym $mod+f fullscreen toggle
bar {
    status_command i3status
    position bottom
}
```

### ~/start-phonetop.sh
```bash
#!/bin/sh
# Phonetop launcher for i3wm on Pixel 3a XL
# Auto-detects display and auth file

sleep 3

# Find the X server auth file (most recent)
XAUTHORITY=$(ls -t ~/.serverauth.* 2>/dev/null | head -1)
export XAUTHORITY

# Find the display from Xorg process
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

# Focus and fullscreen the Tsyne Phone window
i3-msg '[title="Tsyne Phone"] focus' >> ~/phonetop.log 2>&1
i3-msg 'fullscreen enable' >> ~/phonetop.log 2>&1

echo "Phonetop started and fullscreened" >> ~/phonetop.log
```

### Required Symlinks
```bash
ln -sf ~/tsyne/examples ~/examples
ln -sf ~/tsyne/phone-apps ~/phone-apps
```

## USB Network Service
```
/etc/systemd/system/usb-network.service
/usr/local/bin/setup-usb-network.sh
```
Sets default route via 172.16.42.2 and DNS to 8.8.8.8

## Host-side NAT (run on Ubuntu)
```bash
sudo sysctl -w net.ipv4.ip_forward=1
sudo iptables -t nat -A POSTROUTING -s 172.16.42.0/24 -o wlp0s20f3 -j MASQUERADE
```

## Bridge Binary Location
The TypeScript code uses `~/tsyne/core/bin/tsyne-bridge` - make sure to copy rebuilt binaries there:
```bash
cp ~/tsyne/bin/tsyne-bridge ~/tsyne/core/bin/tsyne-bridge
```

## Sync from Host
```bash
cd /home/paul/scm/tsyne
./sync-to-pixel.sh           # sync source + bridge
./sync-to-pixel.sh --src-only  # sync TypeScript only
```

## Boot Sequence
1. Kernel boots, systemd starts
2. getty@tty1 autologins paul
3. .profile runs startx
4. .xinitrc runs xhost +local: then starts i3
5. i3 runs ~/start-phonetop.sh
6. Phonetop launches with FYNE_SCALE=2.5 and goes fullscreen
7. Touch input works via evdev driver

## SSH Access
```bash
ssh paul@172.16.42.1  # password: 147147
```

## Debugging Touch
```bash
# Check if touch events reach kernel
evtest /dev/input/event4

# Check X input devices
DISPLAY=:1 xinput list
DISPLAY=:1 xinput list-props "Synaptics S3706B"

# Check Xorg log for touchscreen
grep -i touch /var/log/Xorg.*.log
```
