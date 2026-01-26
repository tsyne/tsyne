#!/bin/sh
# PhoneTop launcher for i3wm on Pixel 3a XL
# Install to: ~/start-phonetop.sh

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

# Debug token is randomly generated - check ~/phonetop.log for the token

echo "Using DISPLAY=$DISPLAY XAUTHORITY=$XAUTHORITY FYNE_SCALE=$FYNE_SCALE" > ~/phonetop.log

# Allow local X connections
xhost +local: >> ~/phonetop.log 2>&1 || true

# Start phonetop (using bundle - tsx doesn't work on device)
cd ~/tsyne
node phonetop.bundle.js >> ~/phonetop.log 2>&1 &

# Wait for window to appear
sleep 5

# Focus and fullscreen the Tsyne Phone window
i3-msg '[title="Tsyne Phone"] focus' >> ~/phonetop.log 2>&1
i3-msg 'fullscreen enable' >> ~/phonetop.log 2>&1

echo "Phonetop started and fullscreened" >> ~/phonetop.log
