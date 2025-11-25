# Buildkite CI Setup

## One-Time Container Setup

After starting your Buildkite agent container:

```bash
# Use Ubuntu-based image (recommended for Fyne builds)
podman run -d -t --name buildkite-agent buildkite/agent:3-ubuntu start --token "<your-agent-token>" --tags 'queue=default-queue'
```

Run these commands **once** to prepare the container:

### 1. Install Base Dependencies

**IMPORTANT**: Use the Ubuntu-based image (`buildkite/agent:3-ubuntu`) for better compatibility with Fyne/OpenGL.

```bash
podman exec -it buildkite-agent bash
```

Inside the container:

```bash
# Update package lists
apt-get update -qq

# Install build essentials
apt-get install -y \
  build-essential \
  git \
  curl \
  wget \
  ca-certificates

# Install Node.js 24 LTS (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs

# Install Go
cd /tmp
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/profile
export PATH=$PATH:/usr/local/go/bin

# Verify installations
node --version
npm --version
go version
```

### 2. Configure Git (if needed for your builds)

```bash
git config --global user.email "buildkite@example.com"
git config --global user.name "Buildkite Agent"
```

### 3. Pre-download systray dependency (optional, speeds up builds)

```bash
cd /tmp
wget -q https://github.com/fyne-io/systray/archive/refs/heads/master.tar.gz -O systray-master.tar.gz
tar -xzf systray-master.tar.gz
```

This will be reused across builds. The `ci.sh` script will download it if missing.

### 4. Exit container

```bash
exit
```

## Pipeline Configuration

The CI pipeline is defined in `.buildkite/pipeline.yml`:

```yaml
steps:
  - label: ":golang: :nodejs: Build and Test"
    command: "./ci.sh"
    agents:
      queue: "default"
    timeout_in_minutes: 10
    artifact_paths:
      - "bin/tsyne-bridge"
      - "dist/**/*"
```

## CI Script (`ci.sh`)

The `ci.sh` script handles:

1. **System dependencies** - Installs X11, OpenGL, Xvfb for headless GUI testing
2. **Go workarounds** - Downloads `fyne.io/systray` manually (bypasses Google proxy)
3. **Bridge build** - Compiles Go bridge with `GOPROXY=direct`
4. **npm install** - Installs Node dependencies
5. **TypeScript build** - Compiles TypeScript to `dist/`
6. **Tests** - Runs unit tests with Xvfb for headless GUI support

## Environment Variables

The script uses:
- `BUILDKITE_BUILD_CHECKOUT_PATH` - Automatically set by Buildkite
- `DISPLAY=:99` - Virtual X display for headless testing
- `GOPROXY=direct` - Bypasses Google's Go module proxy

## Expected Build Time

- Fresh build: ~3-5 minutes
- Cached dependencies: ~2-3 minutes

## Artifacts

After successful builds, these artifacts are uploaded:
- `bin/tsyne-bridge` - Compiled Go bridge binary
- `dist/**/*` - Compiled TypeScript distribution

## Troubleshooting

### Build fails with "cannot find package fyne.io/systray"

The script downloads this manually. If it fails:

```bash
docker exec -it buildkite-agent bash
cd /tmp
rm -rf systray-master*
wget https://github.com/fyne-io/systray/archive/refs/heads/master.tar.gz -O systray-master.tar.gz
tar -xzf systray-master.tar.gz
```

### Tests timeout

Increase `timeout_in_minutes` in `.buildkite/pipeline.yml` if tests need more time.

### Xvfb fails to start

Ensure the container has enough memory (at least 1GB recommended).

### Screenshots are blank

This is expected in containerized environments - see `LLM.md` section on screenshots. Tests verify functionality; screenshots are supplementary.

## Persistent Agent vs Ephemeral

This setup assumes a **persistent agent** container. For ephemeral agents (Docker plugin), you'd need:

1. A custom Dockerfile based on `buildkite/agent:3`
2. Pre-installed dependencies in the image
3. Different pipeline configuration

Let me know if you need the ephemeral agent setup instead!

## Testing Locally

To test the CI script locally in the container:

```bash
docker exec -it buildkite-agent bash
cd /path/to/your/checkout
./ci.sh
```
