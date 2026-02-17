# Working QEMU Config 1: GNOME Mobile + Phonetop

## Setup
- Device: qemu-amd64
- Kernel: lts
- UI: gnome-mobile
- Image size: 8GB
- Memory: 4096MB
- Display: SDL (GTK has rendering issues)

## Launch Command
```bash
./pmbootstrap.py qemu --display sdl --memory 4096 --tablet --image-size 8G
```

## Key Files in VM
- `/home/paul/start-phonetop.sh` - launcher script
- `/home/paul/tsyne/` - synced source
- `/home/paul/tsyne/core/bin/tsyne-bridge` - musl build

## GDM Autologin
`/etc/gdm/custom.conf`:
```
[daemon]
AutomaticLoginEnable=true
AutomaticLogin=paul
```

## Start Phonetop
```bash
systemd-run --user --unit=phonetop ~/start-phonetop.sh
```

## Notes
- SDL display works, GTK shows "display output not active"
- tsyne-bridge must be built for musl (Alpine)
- Need `npm install --ignore-scripts` in core/ for deps
