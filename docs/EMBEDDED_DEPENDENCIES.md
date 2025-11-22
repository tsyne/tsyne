# Embedded Dependencies (Grapes-alike for TypeScript)

This document describes how Tsyne can support embedding npm dependency declarations directly in TypeScript source files, similar to Groovy's [Grape](https://docs.groovy-lang.org/latest/html/documentation/grape.html) annotations.

## The Problem

Distributing a single-file TypeScript GUI application requires either:
1. A full `package.json` + `node_modules` alongside the source file
2. Pre-bundling everything into a massive single file
3. Asking users to manually `npm install` dependencies

None of these are ideal for simple, single-source-file distribution.

## The Solution: `@grab` Directives

Declare npm dependencies directly in your TypeScript file using triple-slash directives:

```typescript
#!/usr/bin/env tsyne

/// <grab package="axios" version="^1.6.0" />
/// <grab package="date-fns" version="^3.0.0" />
/// <grab package="lodash" version="^4.17.21" />

import axios from 'axios';
import { format } from 'date-fns';
import _ from 'lodash';

// Your application code...
```

## How It Works

### 1. The `tsyne` Executable

A `tsyne` executable (Tauri + Node.js + ts-node, or a shell wrapper) handles the complete lifecycle:

```
┌─────────────────────────────────────────────────────────┐
│                     tsyne myapp.ts                      │
├─────────────────────────────────────────────────────────┤
│  1. Parse @grab directives from source file             │
│  2. Check ~/.tsyne/packages/ for installed deps         │
│  3. npm install missing deps to cache directory         │
│  4. Set NODE_PATH to include cache                      │
│  5. Execute with ts-node (bridge starts automatically)  │
└─────────────────────────────────────────────────────────┘
```

### 2. Package Cache Location

Dependencies are installed to a shared cache:

```
~/.tsyne/
├── packages/
│   └── node_modules/
│       ├── axios/
│       ├── date-fns/
│       └── lodash/
├── package.json          # Auto-generated, tracks versions
└── package-lock.json     # Ensures reproducibility
```

### 3. Version Resolution

- Exact versions (`1.6.0`): Installed once, reused
- Range versions (`^1.6.0`): Uses highest compatible installed version, or installs
- Multiple apps can share the same cached packages

## Syntax Options

### Option A: Triple-Slash Directive (Recommended)

```typescript
/// <grab package="axios" version="^1.6.0" />
```

**Pros:**
- TypeScript-idiomatic (similar to `/// <reference>`)
- Survives compilation (treated as comments)
- IDE-friendly (can add syntax highlighting support)

### Option B: JSDoc-Style Comment

```typescript
/** @grab axios@^1.6.0 */
```

**Pros:**
- Familiar to JSDoc users
- Single line per dependency

### Option C: Block Declaration

```typescript
/*! @grapes
 * axios@^1.6.0
 * date-fns@^3.0.0
 * lodash@^4.17.21
 */
```

**Pros:**
- All dependencies in one place
- Groovy-like block style

## Reference Implementation

### Shell Wrapper (Development/POC)

A proof-of-concept shell script is provided at `scripts/tsyne`:

```bash
# Try it:
./scripts/tsyne examples/weather-viewer-standalone.ts
./scripts/tsyne examples/stock-ticker-standalone.ts
```

The script implementation:

```bash
#!/bin/bash
# tsyne - Grapes-alike TypeScript runner

TSYNE_CACHE="$HOME/.tsyne/packages"
SOURCE_FILE="$1"

# Parse @grab directives
PACKAGES=$(grep -oP '/// <grab package="\K[^"]+' "$SOURCE_FILE")
VERSIONS=$(grep -oP '/// <grab package="[^"]+" version="\K[^"]+' "$SOURCE_FILE")

# Install missing packages
mkdir -p "$TSYNE_CACHE"
cd "$TSYNE_CACHE"

paste <(echo "$PACKAGES") <(echo "$VERSIONS") | while read pkg ver; do
  if [ ! -d "node_modules/$pkg" ]; then
    echo "Installing $pkg@$ver..."
    npm install "$pkg@$ver" --save
  fi
done

# Run with NODE_PATH set
cd - > /dev/null
NODE_PATH="$TSYNE_CACHE/node_modules:$NODE_PATH" npx ts-node "$SOURCE_FILE"
```

### Tauri/Node.js Executable (Production)

A production `tsyne.exe` would be built with:

- **Tauri**: For native packaging and distribution
- **Node.js**: Embedded runtime (or use system Node)
- **ts-node**: For TypeScript execution
- **Go bridge**: Bundled `tsyne-bridge` for Fyne GUI

The executable would:
1. Parse the source file for `@grab` directives
2. Manage the package cache at `~/.tsyne/`
3. Handle version conflicts and upgrades
4. Provide offline mode for cached packages
5. Support `--update` flag to refresh dependencies

## Example Application

See `examples/weather-viewer-standalone.ts` for a complete example:

```typescript
#!/usr/bin/env tsyne

/// <grab package="axios" version="^1.6.0" />
/// <grab package="date-fns" version="^3.0.0" />

import axios from 'axios';
import { format } from 'date-fns';
import { app, styles, FontStyle } from 'tsyne';

// Weather viewer using Open-Meteo API (free, no key required)
// ... full implementation in examples/
```

## Command Line Interface

```bash
# Run an app (installs deps automatically)
tsyne weather-viewer.ts

# Update all cached dependencies
tsyne --update weather-viewer.ts

# List installed packages in cache
tsyne --list-cache

# Clear the package cache
tsyne --clear-cache

# Run without installing (offline mode)
tsyne --offline weather-viewer.ts

# Show what would be installed (dry run)
tsyne --dry-run weather-viewer.ts
```

## Comparison with Groovy Grapes

| Feature | Groovy Grapes | Tsyne @grab |
|---------|---------------|-------------|
| Syntax | `@Grab('group:artifact:version')` | `/// <grab package="name" version="ver" />` |
| Repository | Maven Central | npm registry |
| Cache | `~/.groovy/grapes/` | `~/.tsyne/packages/` |
| Resolution | Ivy/Maven | npm |
| Transitives | Automatic | Automatic (npm handles) |

## Security Considerations

1. **Package Verification**: npm's built-in checksums
2. **Version Pinning**: Support for exact versions and lockfiles
3. **Audit**: Can run `npm audit` on cache periodically
4. **Sandboxing**: Packages run in standard Node.js sandbox

## Future Enhancements

1. **TypeScript Plugin**: IDE support for `@grab` syntax
2. **Type Definitions**: Auto-fetch `@types/*` packages
3. **Private Registries**: Support for private npm registries
4. **Bundling**: Option to bundle deps for fully offline distribution
5. **Workspace Mode**: Share cache across multiple projects

## Philosophy

The goal is **zero-friction distribution** of single-file TypeScript GUI applications:

```
# End user experience:
curl -O https://example.com/my-weather-app.ts
tsyne my-weather-app.ts
# That's it! Dependencies auto-resolve.
```

This mirrors the simplicity of:
- Groovy's Grapes for JVM apps
- Python's `# /// script` (PEP 723)
- Deno's URL imports
- Go's module system (with `go run`)
