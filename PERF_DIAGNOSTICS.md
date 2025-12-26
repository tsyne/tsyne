# ARM64 Performance Diagnostics Guide

This guide explains how to use the real-time performance monitoring system to diagnose and debug performance issues on ARM64 devices (like Pixel 3a XL).

## Quick Start

### Enable Full Performance Monitoring

```bash
# Monitor both Node.js app and Go bridge
TSYNE_PERF_SAMPLE=true npx tsx phonetop.ts 2>&1 | tee /tmp/perf.log

# Or just monitor the app (on x86 Chromebook first to get baseline)
TSYNE_PERF_SAMPLE=true npx tsx ported-apps/boing/boing.ts

# Enable verbose bridge logging (every operation)
TSYNE_PERF_SAMPLE=true TSYNE_PERF_VERBOSE=true npx tsx phonetop.ts 2>&1
```

## Architecture

The performance monitoring system has **two layers**:

```
┌─────────────────────────────────────────────────────┐
│  TypeScript App (Node.js)                           │
│  - Frame timing (FPS, min/max/avg)                 │
│  - Per-operation timing (physics, render, etc)    │
│  - Memory usage                                      │
│  └─→ Display in UI + log to console                │
└────────────────────────────────────────────────────┘
           ↕ IPC (stdio, msgpack-uds, gRPC)
┌─────────────────────────────────────────────────────┐
│  Go Bridge                                           │
│  - Message handler latency                         │
│  - Per-operation type statistics                   │
│  └─→ Log to stderr (JSON every 10 sec)             │
└─────────────────────────────────────────────────────┘
```

## Metrics Explained

### Node.js App Metrics (from boing app stats label)

```
FPS 30 | Frame 33.2ms (avg 33.1ms, max 35.8ms) | Slow: flush 2.5ms | Mem 45.2MB
```

- **FPS**: Frames per second (updated every 1 sec)
- **Frame**: Current frame time in milliseconds
- **avg/max**: Rolling average and max over last 4 seconds
- **Slow**: Slowest operation in this frame (identifies bottleneck)
- **Mem**: JavaScript heap used (MB)

#### Per-Operation Timings (when TSYNE_PERF_SAMPLE=true):

The app tracks:
- `physics` - Ball position/velocity calculations
- `moveSprite.shadow` - Moving shadow to new position
- `moveSprite.ball` - Moving ball to new position
- `setSpriteResource` - Changing ball rotation frame
- `flush` - Dirty rectangle redraw (Go bridge call)

### Go Bridge Metrics (stderr JSON, every 10 seconds)

```json
{
  "uptime_sec": 12.5,
  "timestamp": 1735204800,
  "operations": [
    {
      "name": "moveRasterSprite",
      "count": 120,
      "min_ms": 0.2,
      "max_ms": 2.1,
      "avg_ms": 0.5,
      "median_ms": 0.45,
      "stddev_ms": 0.3,
      "total_ms": 60.0,
      "recent_dur_ms": 0.48
    },
    {
      "name": "flushRasterSprites",
      "count": 120,
      "min_ms": 1.2,
      "max_ms": 12.5,
      "avg_ms": 3.2,
      "median_ms": 3.0,
      "stddev_ms": 2.1,
      "total_ms": 384.0,
      "recent_dur_ms": 3.1
    }
  ]
}
```

**Key metrics:**
- `count` - How many times this operation ran
- `avg_ms` - Average latency (most important)
- `max_ms` - Peak latency (find spikes)
- `recent_dur_ms` - Last 30 seconds average (ignores startup jitter)
- `stddev_ms` - Consistency (low = predictable, high = variable)

## Diagnostic Workflow

### 1. Establish x86_64 Baseline (on Chromebook)

```bash
$ TSYNE_PERF_SAMPLE=true npx tsx ported-apps/boing/boing.ts 2>&1 | grep -E '\[PERF\]|FPS'

# Expected output:
# [PERF] {"uptime_sec": 10.0, "operations": [...]}
# FPS 30 | Frame 33.2ms (avg 33.1ms, max 35.8ms) | Slow: flush 2.5ms | Mem 45.2MB
```

Save baseline metrics:
- Note the FPS
- Record flush latency (typically 2-4ms on x86_64)
- Record moveSprite latency (typically 0.5ms)

### 2. Test on ARM64 (Pixel 3a XL)

Run the same command and compare:

```bash
$ TSYNE_PERF_SAMPLE=true npx tsx ported-apps/boing/boing.ts 2>&1 | grep -E '\[PERF\]|FPS'
```

### 3. Analyze Results - Performance Bottleneck Identification

#### Scenario A: High FPS, Slow Operations (IPC Overhead)

```
FPS 30 | Frame 33.2ms (avg 33.1ms, max 35.8ms) | Slow: flush 8.5ms
```

**Problem**: Bridge operations (moveSprite, flush) are 3-4x slower than x86

**Cause**: Likely IPC overhead (JSON serialization, msgpack encoding, or bridge execution)

**Solution**:
```bash
# Try faster bridge mode
TSYNE_BRIDGE_MODE=msgpack-uds TSYNE_PERF_SAMPLE=true npx tsx ported-apps/boing/boing.ts

# Compare flush times - should drop significantly
# If flush: 2-3ms with msgpack-uds, then IPC was bottleneck
```

#### Scenario B: Low FPS, Slow Flush (Bridge Rendering Bottleneck)

```
FPS 15 | Frame 67.2ms (avg 65.0ms, max 120.0ms) | Slow: flush 25.5ms
```

**Problem**: Flush operations are 10x slower than baseline

**Cause**: Go bridge dirty rectangle processing or image blitting is slow

**Diagnosis**:
```bash
# Enable verbose bridge logging
TSYNE_PERF_SAMPLE=true TSYNE_PERF_VERBOSE=true npx tsx ported-apps/boing/boing.ts 2>&1 | head -100

# Look for:
# [perf] flushRasterSprites: 25.5ms (msgID=abc-123)
```

**Root causes**:
- ARM64 architecture doesn't have vectorized image blitting
- SIMD instructions unavailable or different from x86

#### Scenario C: High Memory Usage, GC Pauses

```
FPS 8 | Frame 125.0ms (avg 100ms, max 500ms) | Slow: physics 400ms | Mem 512MB
```

**Problem**: Occasional huge frame times, memory keeps growing

**Cause**: Garbage collection pauses in JavaScript

**Solution**:
```bash
# Check Node.js version and flag options
node --version
# If old, update to latest

# Monitor GC with
node --expose-gc --max-old-space-size=512 /path/to/app.js
```

### 4. Test Different Bridge Modes

```bash
# Default (may use stdio)
TSYNE_PERF_SAMPLE=true npx tsx ported-apps/boing/boing.ts 2>&1 | grep "Slow:"

# MessagePack-UDS (Unix Domain Sockets, binary protocol)
TSYNE_BRIDGE_MODE=msgpack-uds TSYNE_PERF_SAMPLE=true npx tsx ported-apps/boing/boing.ts 2>&1 | grep "Slow:"

# gRPC (binary protocol, TCP)
TSYNE_BRIDGE_MODE=grpc TSYNE_PERF_SAMPLE=true npx tsx ported-apps/boing/boing.ts 2>&1 | grep "Slow:"
```

**Expected results:**
- **stdio (JSON)**: Slowest (JSON parsing overhead)
- **msgpack-uds**: 2-5x faster than stdio
- **gRPC**: Similar to msgpack-uds

### 5. Multi-Threaded Diagnostics (if using phonetop.ts)

```bash
# Run multiple apps simultaneously with different bridge modes
TSYNE_PERF_SAMPLE=true npx tsx phonetop.ts 2>&1 | tee /tmp/perf.log

# Parse JSON outputs
grep '^\[PERF\]' /tmp/perf.log | python3 -m json.tool
```

## Environment Variables

### Application-Level

```bash
# Enable per-operation timing collection
export TSYNE_PERF_SAMPLE=true

# Log every individual operation (verbose)
export TSYNE_PERF_VERBOSE=true
```

### Bridge-Level

```bash
# Select IPC protocol
export TSYNE_BRIDGE_MODE=msgpack-uds  # or: stdio, grpc

# gRPC port
export TSYNE_GRPC_PORT=50051
```

## Real Example: Diagnosing Boing on Pixel 3a

### Step 1: Run on Chromebook (x86_64)

```bash
$ TSYNE_PERF_SAMPLE=true npx tsx ported-apps/boing/boing.ts 2>&1 | head -50 &
sleep 15
pkill tsx

# Output shows:
# FPS 30 | Frame 33.2ms (avg 33.1ms, max 35.8ms) | Slow: flush 2.1ms
# [PERF] {"operations": [{"name": "moveRasterSprite", "avg_ms": 0.4}, {"name": "flushRasterSprites", "avg_ms": 2.1}]}
```

**Baseline:**
- FPS: 30 ✓
- Flush: 2.1ms ✓
- Move: 0.4ms ✓

### Step 2: Run on Pixel 3a (ARM64)

```bash
$ adb shell "cd /data/local/tmp && TSYNE_PERF_SAMPLE=true npx tsx ported-apps/boing/boing.ts 2>&1" | head -50 &
sleep 15

# Output shows:
# FPS 12 | Frame 83.2ms (avg 82.0ms, max 120.0ms) | Slow: flush 15.2ms
# [PERF] {"operations": [{"name": "moveRasterSprite", "avg_ms": 1.2}, {"name": "flushRasterSprites", "avg_ms": 15.2}]}
```

**ARM64 Results:**
- FPS: 12 (4x slower) ✗
- Flush: 15.2ms (7x slower) ✗
- Move: 1.2ms (3x slower) ✗

### Step 3: Try msgpack-uds Bridge

```bash
$ adb shell "cd /data/local/tmp && TSYNE_BRIDGE_MODE=msgpack-uds TSYNE_PERF_SAMPLE=true npx tsx ported-apps/boing/boing.ts 2>&1"

# Output shows:
# FPS 18 | Frame 55.6ms (avg 55.0ms, max 75.0ms) | Slow: flush 8.2ms
```

**With msgpack-uds:**
- FPS: 18 (30% improvement) ✓
- Flush: 8.2ms (46% improvement) ✓
- Conclusion: IPC was 7.0ms overhead (15.2 - 8.2), proving stdio JSON was slow

### Step 4: Profile Bridge Operations

```bash
TSYNE_BRIDGE_MODE=msgpack-uds TSYNE_PERF_SAMPLE=true TSYNE_PERF_VERBOSE=true npx tsx ported-apps/boing/boing.ts 2>&1 | grep "flush\|move" | head -50

# Output:
# [perf] flushRasterSprites: 8.2ms (msgID=msg-123)
# [perf] moveRasterSprite: 1.0ms (msgID=msg-122)
# [perf] flushRasterSprites: 7.8ms (msgID=msg-124)
```

**Finding**: Flush is still 8ms (vs 2ms on x86), meaning Go bridge dirty rect processing is slow

## Optimization Paths

### If IPC is the Bottleneck (flush 7.2ms / move 1.2ms)

```bash
# Already solved by using msgpack-uds
TSYNE_BRIDGE_MODE=msgpack-uds npx tsx ported-apps/boing/boing.ts
```

### If Bridge Operations are the Bottleneck (flush still 8ms+)

**Option 1: Reduce dirty rectangle redraw frequency**
- Current: Every frame
- Try: Every 2-3 frames

**Option 2: Batch IPC calls**
- Current: 3-4 calls per frame (moveSprite shadow, moveSprite ball, setResource, flush)
- Optimize: Combine into 1-2 calls

**Option 3: Hardware acceleration**
- Fyne uses Go's image/draw package (software rendering)
- ARM64 may lack SIMD support for alpha blending/color conversion

### If Node.js is the Bottleneck (physics still slow)

```bash
# Check Node.js version
node --version

# Use latest LTS
nvm install --lts
nvm use lts/*

# Or pre-compile physics simulation to WASM
```

## Parsing Bridge JSON Output

```bash
# Capture full log
TSYNE_PERF_SAMPLE=true npx tsx ported-apps/boing/boing.ts 2>&1 | tee perf.log

# Extract just JSON metrics
grep '^\[PERF\]' perf.log | sed 's/^\[PERF\] //' > metrics.json

# Analyze with jq
cat metrics.json | jq '.operations[] | {name, avg_ms, max_ms, count}'

# Find slowest operations
cat metrics.json | jq '.operations | sort_by(-.avg_ms) | .[0:5]'
```

## Related Files

- `ported-apps/boing/boing.ts` - Application-level monitoring (PerformanceMonitor class)
- `core/bridge/perf.go` - Bridge-level monitoring (PerfMonitor struct)
- `LLM.md` - Architecture and bridge mode selection

## See Also

- Bridge protocol reference: `docs/TROUBLESHOOTING.md`
- IPC modes: See "Bridge Protocols" in `LLM.md`
- Fyne performance: https://github.com/fyne-io/fyne/wiki/Performance
