# Buildkite Agent Deployment

This directory contains scripts and configuration for deploying a secure, pre-configured Buildkite agent container to `bazzite@bazzite`.

## Overview

The custom Buildkite agent image:
- ✅ **Pre-installs** Node.js 24.x, Go 1.24.10, and all system dependencies
- ✅ **No sudo** - all packages baked into image at build time
- ✅ **Xvfb included** - starts automatically for headless GUI testing
- ✅ **Systray workaround** - pre-downloaded for restricted network environments
- ✅ **Security restrictions** - CPU/memory/process limits applied via podman runtime
- ⚠️ Still runs as **root** inside container (but isolated with restrictions)

## Files

- `Dockerfile.buildkite-agent` - Custom Buildkite agent image definition
- `deploy-buildkite-agent.sh` - Build and test the image on bazzite
- `create-buildkite-systemd.sh` - Create systemd service with security restrictions
- `ci.sh` - Updated to skip installation if packages already present

## Deployment Workflow

### 1. Build and Test Image

```bash
./deploy-buildkite-agent.sh
```

This will:
1. Copy Dockerfile to `bazzite@bazzite`
2. Build image as `localhost/buildkite-agent-tsyne`
3. Stop existing container
4. Test that Node.js, Go, and Xvfb work
5. Show package count

### 2. Create Systemd Service

```bash
# Export your Buildkite token first
export BUILDKITE_AGENT_TOKEN="bkct_xxxxx"

./create-buildkite-systemd.sh
```

This will:
1. Create `~/.config/systemd/user/buildkite-agent.service` on bazzite
2. Configure security restrictions:
   - CPU limit: 4 cores
   - Memory limit: 8 GB
   - Process limit: 200
   - No new privileges
3. Reload systemd

### 3. Start the Agent

```bash
ssh bazzite@bazzite 'systemctl --user start buildkite-agent'
ssh bazzite@bazzite 'systemctl --user status buildkite-agent'
ssh bazzite@bazzite 'systemctl --user enable buildkite-agent'  # Auto-start on boot
```

### 4. Monitor Logs

```bash
ssh bazzite@bazzite 'journalctl --user -u buildkite-agent -f'
```

## Iterative Development

To test changes:

1. Edit `Dockerfile.buildkite-agent` locally
2. Run `./deploy-buildkite-agent.sh` to rebuild and test
3. Repeat until satisfied
4. Run `./create-buildkite-systemd.sh` to update systemd service
5. Restart: `ssh bazzite@bazzite 'systemctl --user restart buildkite-agent'`

## Security Model

### Image Build Time (trusted)
- Install all packages as root
- No sudo binary included in final image

### Container Runtime (restricted)
- Runs as root (for Buildkite agent compatibility)
- **But isolated with:**
  - CPU limits (4 cores)
  - Memory limits (8 GB)
  - Process limits (200 max)
  - No new privileges flag
  - Container namespaces (network, PID, mount, UTS)

### Risk Mitigation
- ❌ **No runtime package installation** - supply chain attacks can't install backdoors
- ❌ **No sudo** - can't escalate or modify system
- ✅ **Resource limits** - can't DoS host
- ✅ **Podman rootless** - container escape doesn't give host root
- ⚠️ **Network access** - still needed for git/npm (could restrict further if needed)

## What Changed from Current Setup

### Before (current on bazzite)
- Base image: `buildkite/agent:3-ubuntu` (246 packages)
- Runtime installation via ci.sh (adds 225 packages)
- Running as root with no restrictions
- Packages lost on reboot, reinstalled every time
- ~2-3 minutes overhead per reboot

### After (this deployment)
- Custom image: `localhost/buildkite-agent-tsyne` (471 packages pre-installed)
- No runtime installation (ci.sh skips if detected)
- Running as root **with restrictions** (CPU/mem/process limits)
- Packages persist across reboots
- Fast startup, no installation overhead

## Comparison with ci.sh

The ci.sh script now has smart detection:
- ✅ Checks if packages already installed
- ✅ Skips apt-get if present
- ✅ Skips Node.js/Go if present
- ✅ Skips Xvfb if already running
- ✅ Works in both custom image AND bare containers

## Next Steps (Optional)

1. **Tighter network isolation**: Add `--network=slirp4netns` if builds don't need direct network
2. **Read-only root**: Add `--read-only --tmpfs /tmp` if builds work with it
3. **Non-root user**: Investigate if buildkite-agent can run as non-root (would need permission changes)
4. **Secrets management**: Move BUILDKITE_AGENT_TOKEN to podman secrets instead of environment variable

## Troubleshooting

### Image build fails
```bash
# Build manually on bazzite to see full output
ssh bazzite@bazzite
cd /tmp
podman build -t localhost/buildkite-agent-tsyne -f Dockerfile.buildkite-agent .
```

### Container won't start
```bash
# Check systemd logs
ssh bazzite@bazzite 'journalctl --user -u buildkite-agent -n 50'

# Test manually
ssh bazzite@bazzite 'podman run --rm localhost/buildkite-agent-tsyne bash -c "node --version && go version"'
```

### Builds fail in new container
- Check if ci.sh detects packages correctly
- Verify DISPLAY=:99 is set
- Check Xvfb is running: `podman exec buildkite-agent pgrep Xvfb`

## Cleanup Old Setup

After verifying the new setup works:

```bash
# Remove old base image (saves 377 MB)
ssh bazzite@bazzite 'podman rmi buildkite/agent:3-ubuntu'

# Or keep it as backup until confident
```
