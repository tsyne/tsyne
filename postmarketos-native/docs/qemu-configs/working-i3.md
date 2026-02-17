# Working QEMU Config 2: i3 + Phonetop

## Setup
- Device: qemu-amd64
- Kernel: lts
- UI: gnome-mobile (with i3 installed on top)
- Image size: 8GB
- Memory: 4096MB
- Display: SDL

## Launch Command
```bash
./pmbootstrap.py qemu --display sdl --memory 4096 --tablet --image-size 8G
```

## Key Differences from Config 1
- GDM disabled and masked
- i3wm running via startx on tty1 autologin
- Xorg on display :2 (not :0)

## Installed Packages
```
i3wm i3status dmenu xterm xorg-server xinit
```

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
exec i3
```

### ~/.config/i3/config
- Mod key: Mod4 (Super)
- Phonetop auto-start on login
- i3bar at bottom with i3status

### ~/start-phonetop-i3.sh
```bash
#!/bin/sh
export DISPLAY=:2
cd ~/tsyne
exec npx tsx phone-apps/phonetop.ts
```

## Start Phonetop
```bash
systemd-run --user --unit=phonetop ~/start-phonetop-i3.sh
```

## Notes
- i3 doesn't register with GDM, so we use startx instead
- DISPLAY is :2 (startx picks next available)
- Fullscreen phonetop works well in i3
- 3D Cube app tested and working
