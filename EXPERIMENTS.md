# Tsyne Experiments Container

A Podman container for running Tsyne experiments on bazzite with Node.js 24 and all required dependencies.

## Quick Start

### 1. Set up workspace on bazzite

```bash
# Create workspace directory on bazzite
ssh bazzite@bazzite "mkdir -p ~/tsyne-workspace"

# Copy Dockerfile
scp Dockerfile.experiments bazzite@bazzite:~/tsyne-workspace/

# Clone Tsyne repo on bazzite (keeps SSH keys secure on host)
ssh bazzite@bazzite "cd ~/tsyne-workspace && git clone git@github.com:paul-hammant/tsyne.git"
```

**Security Note:** We clone on the host (not inside the container) to keep SSH keys out of the container, protecting against supply chain attacks.

### 2. Build and run container

```bash
# Build the image
ssh bazzite@bazzite "cd ~/tsyne-workspace && podman build -f Dockerfile.experiments -t tsyne-experiments ."

# Run the container (with volume mount)
ssh bazzite@bazzite "podman run -d \
  --name tsyne-exp \
  -v ~/tsyne-workspace:/workspace:Z \
  -e DISPLAY=:99 \
  tsyne-experiments \
  tail -f /dev/null"
```

### 3. Use the container

```bash
# Enter the container
ssh bazzite@bazzite "podman exec -it tsyne-exp /bin/bash"

# Or run commands directly
ssh bazzite@bazzite "podman exec -it tsyne-exp bash -c 'cd /workspace && npm install'"
ssh bazzite@bazzite "podman exec -it tsyne-exp bash -c 'cd /workspace && npm test'"
```

## What's Included

- **Node.js 24** - Latest LTS version
- **Go 1.24** - For building the Fyne bridge
- **Build tools** - gcc, build-essential, pkg-config
- **Graphics libraries** - libgl1-mesa-dev, xorg-dev, libglfw3-dev (for Fyne)
- **X11 support** - Xvfb for headless GUI testing
- **Utilities** - git, wget, curl, jq, rsync, python3

## Container Management

```bash
# Stop the container
ssh bazzite@bazzite "podman stop tsyne-exp"

# Start the container
ssh bazzite@bazzite "podman start tsyne-exp"

# View logs
ssh bazzite@bazzite "podman logs tsyne-exp"

# Remove the container
ssh bazzite@bazzite "podman rm -f tsyne-exp"

# Remove the image
ssh bazzite@bazzite "podman rmi tsyne-experiments"
```

## Running Tests with Xvfb

```bash
# Start Xvfb in the container
ssh bazzite@bazzite "podman exec -d tsyne-exp Xvfb :99 -screen 0 1024x768x24"

# Run tests
ssh bazzite@bazzite "podman exec -it tsyne-exp bash -c 'export DISPLAY=:99 && cd /workspace/tsyne && npm test'"
```

## Git Workflow (Secure)

The container is set up for secure git operations:

**✅ Works inside container:**
- `git status`, `git diff`, `git log` - View changes
- `git add` - Stage files
- `git commit` - Create commits locally

**❌ Intentionally disabled:**
- `git push` / `git pull` - No SSH keys in container (security)

**Workflow:**

```bash
# 1. Work inside the container
ssh bazzite@bazzite "podman exec -it tsyne-exp /bin/bash"
# Inside container:
cd /workspace/tsyne
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
# Make changes, commit them
git add .
git commit -m "feat: my changes"
exit

# 2. Push from the bazzite host (has SSH keys)
ssh bazzite@bazzite "cd ~/tsyne-workspace/tsyne && git push"
```

This keeps your SSH private keys on the host, protecting them from supply chain attacks.

## Auto-start on Boot

**Important:** Set up systemd to auto-start the container when bazzite boots:

```bash
# Create systemd user directory if it doesn't exist
ssh bazzite@bazzite "mkdir -p ~/.config/systemd/user"

# Generate systemd service
ssh bazzite@bazzite "podman generate systemd --new --name tsyne-exp > ~/.config/systemd/user/tsyne-exp.service"

# Reload systemd
ssh bazzite@bazzite "systemctl --user daemon-reload"

# Enable auto-start
ssh bazzite@bazzite "systemctl --user enable tsyne-exp"

# Enable linger (allows services to run when user is not logged in)
ssh bazzite@bazzite "loginctl enable-linger bazzite"

# Verify it's enabled
ssh bazzite@bazzite "systemctl --user status tsyne-exp"
```

## Differences from Buildkite Container

| Feature | Buildkite Container | Experiments Container |
|---------|-------------------|---------------------|
| **Purpose** | CI/CD pipeline | Development experiments |
| **User** | buildkite | tsyne (non-root) |
| **Auto-start** | Yes (systemd) | Yes (systemd) |
| **Volume mount** | Build checkout path | ~/tsyne-workspace |
| **Networking** | CI network | Default bridge |
| **Languages** | Node.js + Go | Node.js 24 + Go 1.24 |

## Troubleshooting

### Container exits immediately
Check if it's running with `tail -f /dev/null` to keep it alive:
```bash
ssh bazzite@bazzite "podman ps -a | grep tsyne-exp"
```

### Permission issues with volume mount
Make sure to use `:Z` flag for SELinux contexts:
```bash
-v ~/tsyne-workspace:/workspace:Z
```

### Node modules not found
Install dependencies inside the container:
```bash
ssh bazzite@bazzite "podman exec -it tsyne-exp bash -c 'cd /workspace && npm install'"
```
