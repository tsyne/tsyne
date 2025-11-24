# Standalone Binary Assessment

This document analyzes the feasibility and tradeoffs of creating a truly standalone tsyne executable.

## Goal

Create a single executable file (`tsyne` or `tsyne.exe`) that users can download and run without installing Node.js, npm, or any other dependencies.

## User Experience Target

```bash
# Ideal workflow
curl -O https://releases.tsyne.dev/tsyne-linux-x64
chmod +x tsyne-linux-x64
sudo mv tsyne-linux-x64 /usr/local/bin/tsyne

# Run any TypeScript GUI app with @Grab dependencies
tsyne my-weather-app.ts
```

## Size Analysis (Measured)

We measured the actual size requirements for embedding all necessary components:

| Component | Size | Notes |
|-----------|------|-------|
| Node.js v22 binary | 189 MB | Full Node.js distribution for Linux x64 |
| Tsyne runtime (dist/) | ~5 MB | Compiled TypeScript code |
| Tsyne node_modules/ | 249 MB | Dependencies: ts-node, TypeScript, buffer-crc32, etc. |
| tsyne-bridge binary | 40 MB | Go/Fyne GUI bridge |
| **Total (uncompressed)** | **483 MB** | |
| **Total (compressed)** | **~150-200 MB** | Estimated with gzip/UPX |

### Initial Estimate vs Reality

- **Initial estimate**: 100-150 MB uncompressed, 50-70 MB compressed
- **Actual measurement**: 483 MB uncompressed, ~150-200 MB compressed
- **Discrepancy**: Underestimated node_modules size significantly (249 MB vs estimated 10-20 MB)

The node_modules are large because they include:
- TypeScript compiler (~50 MB)
- ts-node and dependencies
- All of tsyne's npm dependencies
- Many transitive dependencies

## Implementation Approaches Considered

### Approach 1: Fully Embedded Binary (Rust + rust-embed)

**How it works:**
- Use Rust with `rust-embed` or `include_bytes!` macro
- Embed Node.js binary, tsyne runtime, and bridge into Rust executable
- Extract to temp directory on first run or run from memory

**Pros:**
- True single-file distribution
- No external dependencies
- Works offline completely

**Cons:**
- **483 MB uncompressed binary** - impractical for distribution
- Even compressed (~150-200 MB) is very large for a CLI tool
- Binary bloat makes compilation slow
- Updates require downloading entire binary again

**Verdict:** ❌ **Not practical** due to size

### Approach 2: Self-Extracting Installer

**How it works:**
- Rust binary (~45 MB: bridge + small launcher)
- On first run, downloads Node.js from nodejs.org
- Extracts runtime to `~/.tsyne/runtime/<version>/`
- Subsequent runs use cached runtime

**Pros:**
- Reasonable initial download (~45 MB)
- One-time setup
- Feels standalone to users after first run

**Cons:**
- Requires internet connection on first run
- Not truly standalone
- Still downloads 483 MB total (just deferred)
- Adds complexity for error handling (download failures, etc.)

**Verdict:** ⚠️ **Possible but complex** - doesn't fully solve the problem

### Approach 3: Shell Script Installer (Current Solution)

**How it works:**
- `scripts/install.sh` (~7 KB shell script)
- Copies tsyne runtime to `~/.tsyne/runtime/<version>/`
- Creates executable wrapper in `~/.local/bin/tsyne`
- Uses system Node.js/npm

**Pros:**
- ✅ Tiny installer (7 KB)
- ✅ Fast installation
- ✅ Easy to update (just reinstall)
- ✅ Leverages existing Node.js installation
- ✅ No binary bloat

**Cons:**
- Requires Node.js/npm pre-installed
- Brittle if system Node.js is broken/outdated
- Not truly standalone

**Verdict:** ✅ **Most practical** - best tradeoff

### Approach 4: Hybrid - Bundled Node.js (Optional)

**How it works:**
- Shell script checks for system Node.js
- If missing or outdated, downloads Node.js to `~/.tsyne/node/`
- Falls back to bundled Node.js if system Node.js fails

**Pros:**
- Works even without system Node.js
- Smaller than fully embedded approach
- Graceful degradation

**Cons:**
- Still downloads 189 MB for Node.js
- More complex installation logic
- Need to handle Node.js version detection

**Verdict:** ⚠️ **Future enhancement** - worth considering if brittleness becomes an issue

## Brittleness Analysis

The current shell script solution depends on:

| Dependency | Risk | Impact if Broken |
|------------|------|------------------|
| Node.js installed | Medium | Script fails immediately with clear error |
| Node.js version ≥18 | Low | Most systems have recent Node.js |
| npm installed | Low | Usually bundled with Node.js |
| npm can download packages | Medium | @Grab dependencies fail, but clear error |
| npx available | Low | Standard with npm ≥5.2.0 |
| ts-node compatible | Low | We pin compatible versions |

### Common Failure Scenarios

1. **Missing Node.js**
   - Error: `Node.js is required but not found`
   - Solution: User installs Node.js from nodejs.org or package manager
   - Frequency: Low (developers usually have Node.js)

2. **Outdated Node.js**
   - Error: May fail during ts-node execution
   - Solution: Upgrade Node.js
   - Frequency: Medium (LTS versions are common but can be old)

3. **Corrupted npm cache**
   - Error: `npm install` fails with cryptic errors
   - Solution: `npm cache clean --force`
   - Frequency: Low but hard to debug

4. **Corporate firewall blocks npm**
   - Error: Cannot download @Grab dependencies
   - Solution: Configure npm proxy or use offline mode
   - Frequency: Medium in enterprise environments

## Alternative: Bun Runtime

Bun is a modern JavaScript runtime that's much smaller and faster than Node.js:

- Bun binary: ~90 MB (vs Node.js 189 MB)
- Built-in TypeScript support (no ts-node needed)
- Built-in bundler (reduces node_modules size)
- Single executable

**Potential size with Bun:**
- Bun binary: 90 MB
- Tsyne code: 5 MB
- Minimal dependencies: ~20 MB
- tsyne-bridge: 40 MB
- **Total: ~155 MB** (vs 483 MB with Node.js)

**Tradeoff:** Would require porting from ts-node to Bun's TypeScript runtime.

## Module Resolution Strategy

For any standalone approach (if pursued in future), we should avoid NODE_PATH conflicts with system Node.js:

```rust
// In Rust launcher (Tauri/standalone)
Command::new("bundled/node")
    .arg("--experimental-loader")
    .arg("file:///bundled/tsyne-esm-loader.mjs")
    .env("TSYNE_RUNTIME", bundled_runtime_path)
    .env("TSYNE_CACHE", cache_path)
    .env_remove("NODE_PATH")  // Don't interfere with system Node.js
    .arg("user-app.ts")
    .spawn()?;
```

The ESM loader (`tsyne-esm-loader.mjs`) would:
- Read `TSYNE_RUNTIME` and `TSYNE_CACHE` env vars
- Resolve `import 'tsyne'` to bundled runtime
- Resolve `@Grab` dependencies to cache directory
- No pollution of system NODE_PATH

## Recommendations

### Short Term (Current)

✅ **Stick with shell script installer (`scripts/install.sh`)**

Rationale:
- 7 KB installer vs 150-483 MB binary
- Leverages existing Node.js installation
- Easy to understand and debug
- Fast installation
- Most developers already have Node.js

### Medium Term (v0.2.0+)

⚠️ **Consider hybrid approach** if brittleness becomes problematic:
- Detect system Node.js
- Download Node.js to `~/.tsyne/node/` if missing/broken
- Provide `--use-bundled-node` flag for users who want isolation

### Long Term (v1.0+)

🔮 **Evaluate Bun runtime** if we want true standalone:
- Smaller binary (155 MB vs 483 MB)
- Built-in TypeScript support
- Faster execution
- Growing ecosystem

## Conclusion

A truly standalone binary with embedded Node.js is **impractical** due to the 483 MB size (150-200 MB compressed). The current shell script installer is the most pragmatic solution, trading the "standalone" dream for a 7 KB installer that leverages system Node.js.

The key insight: **Distribution size matters more than "single file"**. Users would rather download a 7 KB script + use existing Node.js than download a 150 MB binary.

If we encounter significant brittleness issues with system Node.js in the wild, we can implement the hybrid approach (download Node.js on demand). For now, the shell script is the right choice.

---

**Last Updated:** 2025-11-24
**Size Measurements:** Based on Node.js v22.17.0, tsyne v0.1.0, Linux x64
