# Standalone Binary Assessment

This document analyzes distribution options for Tsyne and outlines the pragmatic path forward.

## Goal

Provide easy installation and distribution of Tsyne for different user audiences, balancing download size, ease of use, and maintenance complexity.

## Size Analysis (Measured)

We measured the actual size requirements for various distribution approaches:

| Component | Size | Notes |
|-----------|------|-------|
| Node.js binary | 116 MB | Just the `node` executable from v22.17.0 |
| Node.js distribution | 189 MB | Full distribution with npm, lib/, etc. |
| Tsyne runtime (dist/) | 72 MB | Compiled TypeScript code |
| Tsyne node_modules/ | 145 MB | Dependencies: ts-node, TypeScript, etc. |
| tsyne-bridge binary | 40 MB | Go/Fyne GUI bridge (per platform) |

**Total for fully embedded binary**: ~372 MB uncompressed (~100-130 MB compressed)

### Download Size Comparison

| Approach | Download Size | User Requirements |
|----------|---------------|-------------------|
| Shell script installer (current) | 7 KB | Node.js ≥18, npm, Go 1.21+ |
| npm package with binaries | ~150 MB | Node.js ≥18, npm |
| Standalone binary (all embedded) | ~100-130 MB | None |
| Platform-specific tarball | ~80 MB | None |

## Distribution Strategy

### Phase 1: Current (Pre-Release) ✅

**Approach**: Shell script installer (`scripts/install.sh`)

**How it works:**
- User installs Node.js ≥18 and Go 1.21+
- Downloads 7 KB install script
- Script installs tsyne runtime to `~/.tsyne/runtime/<version>/`
- Creates `~/.local/bin/tsyne` wrapper
- User runs `tsyne my-app.ts` anywhere

**Why this works now:**
- ✅ Target audience is developers (already have Node.js)
- ✅ Tiny distribution (7 KB)
- ✅ Easy to iterate during development
- ✅ Leverages existing ecosystem tools
- ✅ No binary distribution complexity

**Trade-offs:**
- Requires Node.js/npm pre-installed
- Requires Go for building bridge
- May fail if system Node.js is outdated/broken

### Phase 2: First Public Release (v0.5-v1.0)

**Approach**: npm package with pre-built binaries

**How it works:**
```bash
npm install -g tsyne
```

**Package contents:**
```
tsyne-1.0.0.tgz (~150 MB)
├── dist/                          # Compiled TypeScript
├── bin/
│   ├── tsyne-bridge-linux-x64      # 40 MB
│   ├── tsyne-bridge-darwin-arm64   # 40 MB
│   ├── tsyne-bridge-darwin-amd64   # 40 MB
│   └── tsyne-bridge-windows-x64.exe # 40 MB
├── node_modules/                   # Dependencies
└── scripts/postinstall.js          # Selects correct binary
```

**Installation flow:**
1. User runs `npm install -g tsyne`
2. npm downloads package (~150 MB with all platform binaries)
3. postinstall script detects OS/arch and copies appropriate binary to `bin/tsyne-bridge`
4. Makes binary executable
5. Ready to use!

**Why this works for v1.0:**
- ✅ Standard npm distribution (familiar to developers)
- ✅ No manual binary building required
- ✅ Works on all platforms
- ✅ Automatic updates via `npm update -g tsyne`
- ✅ Similar to esbuild, @swc/core, sharp, puppeteer

**Trade-offs:**
- ~150 MB download (includes all platform binaries)
- Still requires Node.js runtime

### Phase 3: Optional GitHub Releases

For users who don't want npm or want standalone distribution:

**Release assets:**
```
tsyne-v1.0.0-linux-x64.tar.gz        (~80 MB compressed)
├── bin/tsyne-bridge                  (40 MB)
├── runtime/
│   ├── dist/                         (72 MB)
│   └── node_modules/                 (145 MB)
└── bin/tsyne                         (shell wrapper)

tsyne-v1.0.0-darwin-arm64.tar.gz
tsyne-v1.0.0-darwin-amd64.tar.gz
tsyne-v1.0.0-windows-x64.zip
```

**Usage:**
```bash
curl -L -O https://github.com/paul-hammant/tsyne/releases/download/v1.0.0/tsyne-v1.0.0-linux-x64.tar.gz
tar -xzf tsyne-v1.0.0-linux-x64.tar.gz
sudo mv tsyne-v1.0.0-linux-x64/bin/tsyne /usr/local/bin/
```

**Why offer this:**
- ✅ No npm required
- ✅ Single platform download (~80 MB vs 150 MB)
- ✅ Can be bundled with applications
- ✅ Works in restricted environments (no npm registry access)

**Trade-offs:**
- Still requires Node.js runtime on system
- Manual installation
- Manual updates

## What We're NOT Doing

### ❌ Fully Embedded Standalone Binary

**What it would be:**
- Single executable with Node.js + all dependencies embedded
- No external requirements
- ~100-130 MB download per platform

**Why we're not doing this:**
- **Impractical size**: Even compressed, 100-130 MB is large for a CLI tool
- **Maintenance burden**: Custom module resolution, bundling complexity
- **Poor ROI**: Target audience (developers) already has Node.js
- **Update overhead**: Users re-download 100+ MB for every update
- **Duplicates Node.js**: Wastes disk space if user already has Node.js

**The key insight:** Distribution size matters more than "single file". Users would rather:
- Use existing Node.js + download 7 KB script (current)
- Or install via npm with pre-built binaries (future)

Than download a 100+ MB monolithic binary.

## Alternative: Bun Runtime (Future Consideration)

If we want to reduce size in the far future:

**Bun advantages:**
- Bun binary: ~90 MB (vs Node.js 116 MB)
- Built-in TypeScript support (no ts-node needed)
- Built-in bundler (smaller dependencies)
- Single executable

**Potential size with Bun:**
- Bun binary: 90 MB
- Tsyne code: 72 MB
- Minimal dependencies: ~20 MB
- tsyne-bridge: 40 MB
- **Total: ~222 MB** (vs 372 MB with Node.js)

**Trade-offs:**
- Would require porting from ts-node to Bun's runtime
- Smaller ecosystem than Node.js (for now)
- Still ~80-100 MB compressed

**Verdict:** Worth evaluating for v2.0+, but Node.js is the right choice for v1.0.

## Module Resolution Strategy (If Standalone Ever Pursued)

For any future standalone approach, avoid NODE_PATH conflicts with system Node.js by using a custom ESM loader:

```rust
// In Rust launcher (if ever built)
Command::new("bundled/node")
    .arg("--experimental-loader")
    .arg("file:///bundled/tsyne-esm-loader.mjs")
    .env("TSYNE_RUNTIME", bundled_runtime_path)
    .env("TSYNE_CACHE", cache_path)
    .env_remove("NODE_PATH")  // Don't interfere with system Node.js
    .arg("user-app.ts")
    .spawn()?;
```

The ESM loader would:
- Read `TSYNE_RUNTIME` and `TSYNE_CACHE` env vars
- Resolve `import 'tsyne'` to bundled runtime
- Resolve `@Grab` dependencies to cache directory
- No pollution of system NODE_PATH

## Recommendations

### ✅ Now (v0.1.0 - Pre-Release)

**Use shell script installer (`scripts/install.sh`)**

Rationale:
- Perfect for developer audience
- Minimal distribution size (7 KB)
- Easy to iterate and debug
- Leverages existing tools

### ⏭️ Next (v0.5-v1.0 - First Public Release)

**Publish to npm with pre-built binaries**

Tasks:
1. Set up CI/CD to build `tsyne-bridge` for all platforms (Linux, macOS Intel/ARM, Windows)
2. Create `scripts/postinstall.js` to select correct binary
3. Update `package.json` with binary paths
4. Test installation on all platforms
5. Publish to npm registry

See [PUBLISHING.md](PUBLISHING.md) for implementation details.

### 🔮 Future (v2.0+)

**Optional: Platform-specific GitHub releases**

If demand exists for non-npm distribution:
- Create release tarballs per platform (~80 MB each)
- Include pre-built bridge + runtime
- Provide installation script
- Document manual installation process

## Conclusion

The pragmatic approach is:
1. **Now**: 7 KB shell script requiring Node.js (perfect for current developer audience)
2. **v1.0**: npm package with pre-built binaries (~150 MB, standard Node.js packaging)
3. **Optional**: GitHub release tarballs (~80 MB per platform, for non-npm users)

A fully standalone embedded binary (~100-130 MB) is **technically feasible but impractical**:
- Too large compared to alternatives
- High maintenance burden
- Poor return on investment
- Target audience already has Node.js

The current shell script approach is the right choice for now. We can revisit distribution options as the project matures and user needs evolve.

---

**Last Updated:** 2025-11-24
**Measurements:** Node.js v22.17.0, tsyne v0.1.0, Linux x64
**Status:** Phase 1 (Shell Script) Implemented ✅
