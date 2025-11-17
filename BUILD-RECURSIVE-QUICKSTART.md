# Build-All-Recursive: Quick Start Guide

## What Is It?

A comprehensive depth-first build orchestration script that automates the entire Tsyne monorepo build pipeline from installation through packaging and testing.

## Installation

The script is already created and ready to use:

```bash
ls -la build-all-recursive.sh
```

## Basic Usage

### Quick compile (30-60 seconds)
```bash
./build-all-recursive.sh --skip-tests
```

### Full build with tests (8-10 minutes)
```bash
./build-all-recursive.sh
```

### Verbose debugging
```bash
./build-all-recursive.sh --verbose
```

### Continue on errors
```bash
./build-all-recursive.sh --no-stop
```

## What It Does

The script executes in **4 phases** (depth-first):

### Phase 1: Root Setup (Compilation)
1. **npm install** → Installs dependencies + Go bridge
2. **npm run build:ts** → Compiles TypeScript to dist/
3. **npm run build:bridge** → Builds Go bridge binary

### Phase 2: Root Tests
4. **Unit tests** → 8 core unit tests from src/__tests__/
5. **Solitaire logic tests** → Game rules validation
6. **Example tests** → High-confidence example tests
7. **Calculator app tests** → Advanced calculator integration tests
8. **Integration tests** → Browser, widget, and calculator tests

### Phase 3: Designer Component
9. **Designer install** → npm install in designer/
10. **Designer build** → Compiles designer TypeScript
11. **Designer tests** → Unit and E2E tests

### Phase 4: Packaging
12. **Package creation** → Creates standalone executables with pkg

## Output

### Console (Color-Coded)
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶ PHASE 1: Root Dependencies and Compilation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Executing: npm install (root)
✓ npm install (root) completed
ℹ Executing: npm run build:ts
✓ npm run build:ts completed
...
✓ All steps completed successfully!
Total time: 0:05:42
```

### Log File
```bash
tail -f build-all-recursive.log  # Watch in real-time
cat build-all-recursive.log      # View complete log
```

## Command Options

| Flag | Purpose | Example |
|------|---------|---------|
| `--skip-tests` | Skip all tests (compile only) | `./build-all-recursive.sh --skip-tests` |
| `--verbose` | Show full command output | `./build-all-recursive.sh --verbose` |
| `--no-stop` | Continue on errors | `./build-all-recursive.sh --no-stop` |

## Exit Codes

- **0** = Success
- **1** = One or more steps failed

## Common Scenarios

### Clean rebuild
```bash
rm -rf dist/ bin/ node_modules/ designer/dist/
./build-all-recursive.sh --skip-tests
```

### Find all failing tests
```bash
./build-all-recursive.sh --no-stop --verbose
```

### Quick CI/CD validation
```bash
./build-all-recursive.sh --skip-tests
if [ $? -eq 0 ]; then npm test; fi
```

### Designer development
```bash
cd designer && npm run dev
```

## Troubleshooting

### Build fails at npm install
```bash
npm install --legacy-peer-deps
./build-all-recursive.sh --skip-tests
```

### Go bridge fails
Ensure Go 1.21+ is installed:
```bash
go version
# If not found:
apt-get install golang-go
```

### Tests timeout
Use `--skip-tests` to verify compilation, then run tests separately:
```bash
./build-all-recursive.sh --skip-tests
npm test
```

## Detailed Documentation

For comprehensive documentation, see:
- **BUILD-ALL-RECURSIVE.md** - Full reference guide with all phases, options, and customization

## What Gets Built

- ✅ `dist/` - Compiled TypeScript with type definitions
- ✅ `bin/tsyne-bridge` - Go bridge binary (38-40 MB)
- ✅ `designer/dist/` - Designer component compiled
- ✅ `pkg/` - Packaged executables (optional, requires dist/ + bin/)

## Tips

1. **First run takes longest** (npm downloads, Go compilation)
2. **Subsequent runs are faster** (uses cached node_modules and binaries)
3. **Use `--skip-tests`** for quick validation
4. **Check `build-all-recursive.log`** if something fails

## Next Steps

After successful build:

```bash
# Run examples
node examples/hello.js

# Run tests selectively
npm test examples/01-hello-world.test.ts --runInBand

# Start designer development
cd designer && npm run dev
```

## Help

For issues or questions:
- See **LLM.md** for project overview
- See **BUILD-ALL-RECURSIVE.md** for detailed reference
- Check `build-all-recursive.log` for error details
- Run with `--verbose` for debugging

---

**Version:** 1.0
**Created:** 2025-11-17
**Maintenance:** Part of Tsyne project build system
