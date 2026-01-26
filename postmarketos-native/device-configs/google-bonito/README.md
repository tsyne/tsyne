# Pixel 3a XL (google-bonito) Configuration

Device-specific configuration files for running PhoneTop on the Pixel 3a XL with postmarketOS.

## Hardware

- **Display:** 1080x2160 (DSI-1)
- **Touchscreen:** Synaptics S3706B (event4)
- **Architecture:** aarch64
- **Kernel:** postmarketos-qcom-sdm670

## Network

- **USB IP:** 172.16.42.1
- **User:** paul
- **Password:** 147147

## Installation

After flashing postmarketOS, copy these config files to the device:

```bash
# Touchscreen driver (requires root)
doas cp touchscreen.conf /etc/X11/xorg.conf.d/99-touchscreen.conf

# Autologin (requires root)
doas mkdir -p /etc/systemd/system/getty@tty1.service.d/
doas cp autologin.conf /etc/systemd/system/getty@tty1.service.d/

# Power menu permissions - allows PhoneTop Power app to reboot/shutdown
doas sh -c 'cat doas-power.conf >> /etc/doas.conf'

# User configs
cp xinitrc ~/.xinitrc
chmod +x ~/.xinitrc

mkdir -p ~/.config/i3
cp i3-config ~/.config/i3/config

cp start-phonetop.sh ~/start-phonetop.sh
chmod +x ~/start-phonetop.sh

# Add to profile
cat profile-snippet.sh >> ~/.profile
```

> **Note:** The doas-power.conf step enables the PhoneTop Power app to reboot/shutdown
> without password prompts. This is reset on each flash and must be re-applied.

## Boot Sequence

1. Kernel boots, systemd starts
2. getty@tty1 autologins as paul
3. .profile runs startx
4. .xinitrc runs i3
5. i3 runs ~/start-phonetop.sh
6. PhoneTop launches fullscreen with touch support
