# Publishing Tsyne to npm

This guide explains how Tsyne handles native binaries and how to publish to npm.

## How It Works

Tsyne uses the **same approach as Java JNI libraries** - all platform-specific binaries are bundled into a single npm package, similar to how JNI `.so`/`.dll`/`.dylib` files are bundled in a JAR and published to Maven Central.

### Package Contents

When published to npm, the package contains:

```
tsyne/
├── dist/                          # Compiled TypeScript
├── bin/
│   ├── tsyne-bridge-darwin-amd64   # macOS Intel
│   ├── tsyne-bridge-darwin-arm64   # macOS Apple Silicon
│   ├── tsyne-bridge-linux-amd64    # Linux x64
│   └── tsyne-bridge-windows-amd64.exe  # Windows x64
├── bridge/                        # Go source (for building from source)
├── scripts/
│   └── postinstall.js            # Selects correct binary
└── package.json
```

### Installation Flow

When a user runs `npm install tsyne`:

1. **npm downloads** the package (~50-100MB with all binaries)
2. **postinstall runs** and detects platform (e.g., `darwin-arm64`)
3. **Binary is copied** from `bin/tsyne-bridge-darwin-arm64` to `bin/tsyne-bridge`
4. **Made executable** (Unix only)
5. **Ready to use** - no compilation needed!

If no pre-built binary exists for the platform:
- Falls back to building from source (requires Go 1.21+)
- Or fails with helpful error message

## Building for All Platforms

Before publishing, build binaries for all platforms:

```bash
# Requires Go 1.21+ with cross-compilation support
npm run build:bridge:all
```

This creates:
- `bin/tsyne-bridge-darwin-amd64` (macOS Intel)
- `bin/tsyne-bridge-darwin-arm64` (macOS Apple Silicon)
- `bin/tsyne-bridge-linux-amd64` (Linux x64)
- `bin/tsyne-bridge-windows-amd64.exe` (Windows x64)

### Platform Requirements for Building

The build machine needs:
- Go 1.21 or higher
- CGO support for cross-compilation
- Platform-specific dependencies (if not cross-compiling)

**Note**: Cross-compilation from one platform can build for all others, but some Fyne features may require native compilation. Consider using CI/CD with matrix builds.

## Publishing to npm

### First Time Setup

1. Create npm account: https://www.npmjs.com/signup
2. Login: `npm login`
3. Verify: `npm whoami`

### Publishing Process

```bash
# 1. Update version in package.json
npm version patch  # or minor, or major

# 2. Build all platform binaries
npm run build:bridge:all

# 3. Build TypeScript
npm run build

# 4. Test the package locally
npm pack
# This creates tsyne-X.Y.Z.tgz - install it elsewhere to test:
# cd /tmp/test-project && npm install /path/to/tsyne-X.Y.Z.tgz

# 5. Publish to npm
npm publish
```

### Pre-publish Checklist

The `prepublishOnly` script automatically:
- ✓ Builds all platform binaries
- ✓ Compiles TypeScript to dist/

Before publishing, verify:
- [ ] All binaries exist in `bin/tsyne-bridge-*`
- [ ] `dist/` contains compiled JavaScript
- [ ] Version updated in `package.json`
- [ ] CHANGELOG updated (if you have one)
- [ ] Tests pass: `npm test`
- [ ] README is current
- [ ] License is correct

### What Gets Published

The `.npmignore` file controls what's included:

**Included:**
- `dist/` - Compiled TypeScript
- `bin/tsyne-bridge-*` - All platform binaries
- `bridge/` - Go source (for fallback builds)
- `scripts/postinstall.js` - Binary selection script
- Documentation (README, QUICKSTART, TESTING, ARCHITECTURE)

**Excluded:**
- `src/` - TypeScript source
- `examples/` - Example code
- `test-apps/` - Test applications
- `.git/` - Git metadata
- Development scripts

## CI/CD for Multi-Platform Builds

For production, use GitHub Actions to build binaries:

```yaml
# .github/workflows/publish.yml
name: Publish to npm

on:
  push:
    tags:
      - 'v*'

jobs:
  build-binaries:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'

      - name: Build binary
        run: npm run build:bridge

      - name: Upload binary
        uses: actions/upload-artifact@v3
        with:
          name: binaries
          path: bin/tsyne-bridge*

  publish:
    needs: build-binaries
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Download binaries
        uses: actions/download-artifact@v3
        with:
          name: binaries
          path: bin/

      - name: Build TypeScript
        run: npm run build

      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Package Size

Typical sizes:
- Each binary: ~10-20 MB (Go + Fyne + dependencies)
- All binaries: ~50-80 MB total
- npm package: ~50-100 MB (with compression)

This is comparable to packages like:
- `@electron/get` (~85 MB)
- `puppeteer` (~170 MB with Chromium)
- `sharp` (~50 MB with libvips binaries)

## Alternative: Separate Platform Packages

If package size is a concern, consider platform-specific packages:

```
tsyne                     # Meta-package
tsyne-darwin-x64         # macOS Intel binary
tsyne-darwin-arm64       # macOS Apple Silicon binary
tsyne-linux-x64          # Linux binary
tsyne-win32-x64          # Windows binary
```

This is how `esbuild` and `@swc/core` work. Each platform downloads only what it needs (~10-20 MB instead of ~50-80 MB).

However, this adds complexity:
- Multiple packages to maintain
- More complex installation
- Need `optionalDependencies` logic

For Tsyne, the **single package approach is recommended** for simplicity.

## Testing Installation

Test the full installation flow:

```bash
# Pack the package
npm pack

# Install in a fresh project
mkdir /tmp/test-tsyne
cd /tmp/test-tsyne
npm init -y
npm install /path/to/tsyne-0.1.0.tgz

# Verify binary exists and runs
ls -lh node_modules/tsyne/bin/
node_modules/tsyne/bin/tsyne-bridge --help

# Test a simple example
cat > test.js << 'EOF'
const { app, window, vbox, label, button } = require('tsyne');

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("Hello from npm!");
      button("Exit", () => process.exit(0));
    });
  });
});
EOF

node test.js
```

## Version Management

Follow semantic versioning:

- **Patch** (0.1.0 → 0.1.1): Bug fixes, no breaking changes
- **Minor** (0.1.0 → 0.2.0): New features, no breaking changes
- **Major** (0.1.0 → 1.0.0): Breaking changes

Update version:
```bash
npm version patch -m "Fix button click handling"
npm version minor -m "Add checkbox widget"
npm version major -m "Breaking: Change API structure"
```

## Support and Compatibility

### Supported Platforms

✓ **Tier 1** (pre-built binaries included):
- macOS x64 (Intel)
- macOS arm64 (Apple Silicon)
- Linux x64
- Windows x64

⚠ **Tier 2** (must build from source):
- Linux arm64 (Raspberry Pi, etc.)
- Other Unix variants

❌ **Not supported**:
- 32-bit platforms
- Mobile platforms (use Fyne directly)

### Node.js Versions

- Minimum: Node.js 16.0.0
- Recommended: Node.js 18+ LTS
- Tested: 16, 18, 20

## Summary

Tsyne's approach mirrors Java's JNI model:
- ✓ All platform binaries in one package
- ✓ Automatic platform detection
- ✓ Easy npm install (no Go required for users)
- ✓ Fallback to source build if needed
- ✓ Similar to how JARs include native libs for Maven Central

This provides the best user experience while maintaining flexibility for developers.
