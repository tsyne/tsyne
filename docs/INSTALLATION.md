# Installation

Tsyne provides multiple installation methods depending on your use case.

## Quick Start (Development)

If you're developing with Tsyne or contributing to the project:

```bash
git clone https://github.com/yourusername/tsyne.git
cd tsyne
npm install
npm run build
```

Then run examples directly:
```bash
./scripts/tsyne examples/calculator.ts
```

## Standalone Installation (Recommended for Users)

For users who want `tsyne` available system-wide:

### Linux/macOS

```bash
# Download the installer
curl -O https://raw.githubusercontent.com/yourusername/tsyne/main/scripts/install.sh
chmod +x install.sh

# Install to ~/.local/bin (user install)
./install.sh

# OR install to /usr/local/bin (system-wide, requires sudo)
sudo ./install.sh /usr/local/bin
```

Then add to your PATH if needed:
```bash
# Add to ~/.bashrc or ~/.zshrc
export PATH="$HOME/.local/bin:$PATH"
```

### What Gets Installed

The installer creates:
- **Executable script**: `~/.local/bin/tsyne` (or custom path)
- **Runtime cache**: `~/.tsyne/runtime/0.1.0/`
  - Tsyne library (~5 MB)
  - Node modules (~249 MB)
  - tsyne-bridge binary (~40 MB)

Total disk usage: ~294 MB

### Usage After Installation

```bash
# Run any TypeScript GUI app
tsyne my-app.ts

# With @Grab dependencies (see INLINE_DEPENDENCY_DECLARATIONS.md)
tsyne weather-viewer.ts  # Automatically installs chalk, axios, etc.
```

## npm Package (Coming Soon)

When tsyne is published to npm, you'll be able to install via:

```bash
npm install -g tsyne
# Or in a project
npm install tsyne
```

**Status**: Not yet published. Use the standalone installer above for now.

## Prerequisites

All installation methods require:

- **Node.js**: Version 18 or higher
- **npm**: Usually bundled with Node.js
- **Operating System**: Linux, macOS, or Windows (WSL)

### Installing Node.js

If you don't have Node.js installed:

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**macOS:**
```bash
brew install node
```

**Other systems**: Visit [nodejs.org](https://nodejs.org/)

## Verifying Installation

```bash
# Check tsyne is in PATH
which tsyne

# Check version
tsyne --version

# List cached packages
tsyne --list-cache
```

## Uninstallation

```bash
# Remove the executable
rm ~/.local/bin/tsyne  # Or /usr/local/bin/tsyne if system install

# Remove runtime cache (optional)
rm -rf ~/.tsyne/runtime

# Remove @Grab package cache (optional)
tsyne --clear-cache
# Or manually:
rm -rf ~/.tsyne/packages
```

## Troubleshooting

### "Node.js is required but not found"

Install Node.js as described in the Prerequisites section above.

### "npm install fails for @Grab dependencies"

This usually indicates network issues or npm configuration problems:

```bash
# Clear npm cache
npm cache clean --force

# Configure npm proxy (if behind corporate firewall)
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# Use offline mode (requires dependencies already cached)
tsyne --offline my-app.ts
```

### "tsyne: command not found" after installation

Make sure `~/.local/bin` is in your PATH:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Permission denied when installing to /usr/local/bin

Use `sudo`:

```bash
sudo ./install.sh /usr/local/bin
```

## Alternative Installation Methods

### For Contributors

If you're contributing to tsyne development:

```bash
git clone https://github.com/yourusername/tsyne.git
cd tsyne
npm install
npm run build

# Run without installing
./scripts/tsyne examples/hello.ts

# Or install locally for testing
./scripts/install.sh
```

### Standalone Binary (Future)

We explored creating a fully standalone executable (single file, no Node.js required), but the size constraints make it impractical:

- Fully embedded binary would be ~483 MB uncompressed (~150-200 MB compressed)
- Current shell installer is only 7 KB and leverages system Node.js
- See [STANDALONE_BINARY_ASSESSMENT.md](STANDALONE_BINARY_ASSESSMENT.md) for full analysis

The current shell script installer provides the best balance of:
- ✅ Small download size (7 KB)
- ✅ Easy installation
- ✅ System-wide availability
- ⚠️ Requires Node.js pre-installed (tradeoff)

## Directory Structure

After installation, tsyne uses these directories:

```
~/.tsyne/
├── runtime/
│   └── 0.1.0/              # Version-specific runtime
│       ├── tsyne/          # Tsyne library (dist + package.json)
│       ├── node_modules/   # Tsyne's dependencies
│       └── tsyne-bridge    # Go/Fyne GUI bridge binary
└── packages/               # @Grab dependency cache
    ├── package.json
    └── node_modules/       # User app dependencies (chalk, axios, etc.)
```

## Platform Support

| Platform | Support | Notes |
|----------|---------|-------|
| Linux x64 | ✅ Full | Tested on Ubuntu, Debian, Fedora |
| macOS (Intel) | ✅ Full | Tested on macOS 12+ |
| macOS (Apple Silicon) | ✅ Full | Rosetta 2 or native |
| Windows WSL | ✅ Full | Use WSL2 for best performance |
| Windows (native) | ⚠️ Experimental | Requires manual Go/Fyne setup |

## Next Steps

After installation:

1. **Try an example**: `tsyne examples/calculator.ts`
2. **Read the quickstart**: [QUICKSTART.md](QUICKSTART.md)
3. **Learn about @Grab**: [INLINE_DEPENDENCY_DECLARATIONS.md](INLINE_DEPENDENCY_DECLARATIONS.md)
4. **Explore the API**: [API_REFERENCE.md](API_REFERENCE.md)

---

**Last Updated**: 2025-11-24
**Installer Version**: scripts/install.sh v0.1.0
