#!/bin/bash
# Run three.js integration tests with the real display
# This requires a running Gnome/X11 session

export DISPLAY=:0
export XDG_RUNTIME_DIR=/run/user/1000
export XAUTHORITY=/run/user/1000/.mutter-Xwaylandauth.42LJK3

pnpm test "$@"
