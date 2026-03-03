# Charon Jr. Performance Plan

**Background:** See [current_thinking.md](../../current_thinking.md) for the full 12-round
investigation log (2026-02-25 → 2026-03-03) covering GPU hangs, memory leaks, batch
coalescing, and the diagnostic infrastructure built along the way.

## Current State

The game runs without crashing (Rounds 1-11 fixed GPU hangs, batch coalescing, memory leaks).
Performance: **20-24fps for ~35 seconds**, then OS memory pressure causes RSS eviction,
GPU driver pages get faulted, and `drawElements` stalls for 0.1-1.6s each. FPS drops to 1-3.

The same game runs smoothly in Chrome on the same machine.

## Why Chrome Is Faster

Chrome's WebGL path: `gl.drawElements()` → C++ function call → GPU driver. Zero serialization.

Tsyne's path: `gl.drawElements()` → push JS object to array → msgpack serialize entire batch →
write to UDS → Go reads → msgpack deserialize (allocates ~1000 `map[string]interface{}`) →
`switch` on string cmd → type-assert each arg from `interface{}` → call OpenGL → `glFinish()` →
marshal response → write to UDS → JS reads.

**Per-frame overhead Tsyne adds that Chrome doesn't have:**
- ~1362 commands serialized+deserialized as msgpack (7.8MB/s Go allocations)
- 3-4 copies of vertex/uniform data (JS heap → arena → msgpack → Go heap → GL)
- ~95MB Go runtime overhead (heap + sys + GC metadata)
- String-keyed map lookups for every arg of every command
- `interface{}` boxing for every uniform value

**Result:** Tsyne process RSS ~350MB vs Chrome's ~200MB for the same scene.
When RSS hits the system's pressure threshold, page eviction causes a death spiral.

## The 1362 Commands Per Frame

Charon Jr. has ~20 meshes with shadow mapping = ~40 draw passes.
Each draw pass: `useProgram` + `bindVAO` + 3×`bindBuffer` + 3×`vertexAttribPointer` +
3×`enableVertexAttribArray` + 2×`activeTexture` + 2×`bindTexture` + ~10×`uniform*` +
`drawElements` = ~25-30 commands. Plus per-frame state: viewport, clear, FBO ops.

Many of these are **redundant** — same program, same projection/view matrix, same light
uniforms, same depth/blend state across consecutive draws. Chrome's ANGLE layer deduplicates
these internally. Tsyne faithfully serializes and transmits every one.

### What's Already Deduplicated (gl-proxy-state.ts)

`enable`/`disable`, `depthFunc`, `depthMask`, `cullFace`, `frontFace`, `blendFunc`,
`blendFuncSeparate`, `blendEquation`, `blendEquationSeparate`, `colorMask`, `stencilFunc`,
`lineWidth`. These track current state and `return` + increment `_commandsSkipped` when
the value hasn't changed.

### What's NOT Deduplicated (high frequency, easy wins)

| Command | Frequency/frame | Redundancy estimate |
|---------|----------------|---------------------|
| `useProgram` | ~40 calls | ~36 redundant (3-4 unique programs) |
| `bindTexture` | ~40+ calls | ~20 redundant (same tex rebound per pass) |
| `activeTexture` | ~40+ calls | ~20 redundant (tracked but not skipped) |
| `bindBuffer` | ~120 calls | ~40+ redundant (same buffer rebound) |
| `viewport` | ~4 calls | ~2 redundant (same viewport in same pass) |
| `uniformMatrix4fv` (projection) | ~40 calls | ~38 redundant (same per pass) |
| `uniformMatrix4fv` (view) | ~40 calls | ~38 redundant (same per pass) |
| `uniform3f` (light dir, etc.) | ~80+ calls | ~60+ redundant (same for all objects) |

**Conservative estimate: 30-40% of commands are redundant = 400-550 commands/frame eliminated.**

---

## Phase 1: JS-Side Command Deduplication

**Risk: Low. Changes only in gl-proxy-*.ts. No Go changes. No GPU risk.**

Add state tracking to skip redundant commands before they're serialized:

### 1a. Track and skip `useProgram` when program unchanged
```typescript
// In gl-proxy-core.ts
useProgram(program: WebGLProgram | null): void {
  const id = program ? this.programs.get(program)! : 0;
  if (id === this.boundProgram) { this._commandsSkipped++; return; }
  // ... existing code
}
```
Already tracks `boundProgram` but doesn't use it for skipping.

### 1b. Track and skip `activeTexture` when unit unchanged
Already tracks `activeTextureUnit`. Just add the early return.

### 1c. Track and skip `bindTexture` per target+unit
```typescript
// New: Map<`${unit}_${target}`, textureId>
private boundTextures = new Map<string, number>();
```

### 1d. Track and skip `bindBuffer` per target
Already tracks `boundArrayBuffer` and `boundElementArrayBuffer`. Just add early returns.

### 1e. Track and skip `viewport` when unchanged
```typescript
private currentViewport: [number, number, number, number] = [0, 0, 0, 0];
```

### 1f. Track and skip redundant uniforms (biggest win)
Per-location value cache. For scalar uniforms (1f, 1i, 2f, 3f, 4f), compare directly.
For matrix uniforms (mat4 = 16 floats), compare the typed array bytes.

```typescript
// Map<locationId, { type: string, values: number[] | Uint8Array }>
private uniformCache = new Map<number, { type: string, v: ArrayLike<number> }>();
```

The comparison cost (16 float compares for mat4) is negligible vs msgpack serialize +
UDS write + Go deserialize + map alloc + type assert + GL call.

### 1g. Track `bindVertexArray` when unchanged
```typescript
private boundVertexArray: number | null = null;
```

**Note on VAO invalidation:** When a VAO is bound, buffer/attrib state is per-VAO in real GL.
Our proxy doesn't use real VAOs (Go side ignores them), but Three.js expects binding a VAO
to "restore" its state. We can still skip redundant `bindVertexArray` commands since the Go
side doesn't use them — they're just forwarded as render commands for the painter loop,
which also doesn't use them (it tracks its own state).

### Expected Impact
- **Commands/frame:** 1362 → ~850 (37% reduction)
- **Msgpack payload:** ~35% smaller
- **Go allocations:** ~35% fewer maps, type assertions, uniform copies
- **RSS reduction:** 10-30MB from reduced Go allocation pressure
- **FPS:** Marginal improvement in steady state, significant improvement under memory pressure
  (fewer commands = faster cmdLoop = less time for page faults to cascade)

### Measurement
```bash
TSYNE_SHADER_PROFILE=1 ./scripts/tsyne ported-apps/roblouie_charonir/src/main.ts
```
Compare `cmds=` and `skipped=` before and after.

---

## Phase 2: Binary Command Protocol

**Risk: Medium. Changes in gl-proxy-core.ts + handlers_gl.go. Protocol change.**

Replace msgpack maps with a flat binary command buffer. Each command:
```
[2-byte opcode][fixed-format args]
```

No string keys, no variable-length encoding for common commands. Go-side parsing becomes
a `switch` on uint16 with fixed-size reads — **near-zero allocation**.

### Design

**JS side:** Instead of `pushCommand('uniform3f', { locationId, name, x, y, z })`, write:
```
opcode(0x0103)  // UNIFORM_3F
uint16(locId)
float32(x)
float32(y)
float32(z)
```
Total: 16 bytes. Current msgpack: ~60-80 bytes + map allocation on Go side.

**Go side:** Read opcode, switch, read fixed args directly from byte buffer. No `interface{}`
boxing, no map creation, no string comparisons.

### Command Categories

| Category | Opcodes | Args format |
|----------|---------|-------------|
| Uniform scalars (1f/2f/3f/4f/1i) | 0x0100-0x010F | locId(u16) + N×float32 or int32 |
| Uniform matrices (mat3/mat4) | 0x0110-0x011F | locId(u16) + 9 or 16×float32 |
| Uniform arrays (fv) | 0x0120-0x012F | locId(u16) + len(u32) + N×float32 |
| Buffer ops | 0x0200-0x020F | bufferId(u32) + target(u16) + data(var) |
| Draw calls | 0x0300-0x030F | mode(u16) + count(u32) + ... |
| Texture ops | 0x0400-0x040F | texId(u32) + target(u16) + unit(u16) |
| State ops | 0x0500-0x050F | cap(u16) or func(u16) + ... |
| Program/VAO | 0x0600-0x060F | id(u32) |
| FBO ops | 0x0700-0x070F | fboId(u32) + ... |

Variable-length data (bufferData, texImage2D) uses a length prefix.

### Backward Compatibility
Add a batch format byte at the start: `0x00` = legacy msgpack, `0x01` = binary.
Go side checks first byte and dispatches accordingly. Can roll out incrementally.

### Expected Impact
- **Go allocations:** ~90% reduction (no maps, no string keys, no interface{} boxing)
- **Serialization time:** ~60% faster (no msgpack encoding overhead)
- **Deserialization time:** ~80% faster (fixed reads vs map parsing)
- **Go totalAlloc rate:** 7.8MB/s → ~1-2MB/s
- **RSS reduction:** 20-40MB from reduced Go heap pressure
- **Page fault risk:** Dramatically lower (less heap churn = fewer pages to evict)

---

## Phase 3: Reduce Data Copies

**Risk: Low-Medium. Targeted changes in specific hot paths.**

### 3a. Skip unchanged buffer re-uploads in the painter

The render command loop currently re-uploads ALL attribute buffers for every draw call
via `BufferData()`, even when the geometry hasn't changed since last frame. The
generation-based VBO cache (`VBOUploadedGen`) is supposed to prevent this but may not
be working for all code paths.

**Audit:** Add counters for VBO cache hits vs misses. If miss rate is high, fix the
generation tracking.

### 3b. Eliminate uniform name strings from the wire

Currently every uniform command sends both `locationId` (int) and `name` (string).
The Go side uses `name` for the render command queue (uniforms keyed by name in the
Shader's uniform map). The name is redundant — Go already has the location→name mapping
from `getUniformLocation`.

**Change:** Send only `locationId`. Go looks up name from its existing map.
Saves ~10-20 bytes per uniform command × ~200 uniforms/frame = 2-4KB/frame.

### 3c. Share arena between JS uniform encoding and msgpack

Currently uniforms are encoded into the arena, then msgpack copies them into its output
buffer. If msgpack could reference arena memory directly (as raw bytes), we'd save one copy.

**Feasibility:** Depends on the msgpack library. May require a custom encoder.

---

## Phase 4: Go-Side Optimizations

**Risk: Low. Internal changes only.**

### 4a. Pre-allocate command slice

Instead of decoding `commandsRaw []interface{}` from msgpack (which allocates a new slice
every frame), pre-allocate and reuse. With the binary protocol (Phase 2) this becomes
moot — the entire batch is a single `[]byte`.

### 4b. Eliminate render command snapshots

Currently `QueueRenderCommand` creates `DrawElementsParams` with a cloned
`map[string]*AttributeBuffer`. With per-draw state fully tracked in the command stream,
the snapshot may be unnecessary — the painter loop already re-uploads from the command's
attribute data.

**Audit needed** to confirm snapshots can be eliminated without breaking multi-program
rendering.

### 4c. Reduce string interning

Many short strings (`"uniform"`, `"drawElements"`, `"bindTexture"`) are created repeatedly
during msgpack decode. With the binary protocol these become uint16 opcodes. Without it,
string interning (reusing a fixed set of cmd strings) could reduce allocations.

---

## Phase 5: Memory Footprint Reduction

**Risk: Low. Targeted changes.**

### 5a. Release JS-side geometry data after first upload

Three.js retains `BufferAttribute.array` (vertex positions, normals, UVs) in JS heap
even after uploading to the Go bridge. For static geometry (terrain, car body), call
`geometry.dispose()` or set `attribute.array = null` after first render.

**Caution:** Only for geometry that doesn't change. Animated/morphing geometry needs its data.

**TCP/IP caveat:** In a remote bridge configuration (Valve-style game streaming over
TCP/IP), releasing JS-side data means it cannot be re-uploaded on reconnect or GPU-side
restart. This optimization is local-only. For remote mode, the JS side must retain
geometry as the source of truth — or implement a persistent asset cache on the GPU side.

### 5b. Lower texture resolution

Check if Charon Jr. uses unnecessarily large textures. Halving texture dimensions = 4x less
memory across all three copies (JS, Go, GPU).

### 5c. Lazy-load distant geometry

Not all 20 meshes need to be loaded at startup. Load/unload based on camera distance.
This is a game-level optimization, not a bridge optimization.

---

## Priority Order

| Phase | Effort | Impact | Risk | TCP/IP safe? |
|-------|--------|--------|------|--------------|
| 1 (JS dedup) | 1-2 days | High | Low | Yes — fewer commands = less bandwidth |
| 2 (binary protocol) | 3-5 days | Very High | Medium | Yes — more compact on wire |
| 3a (VBO cache audit) | 0.5 days | Medium | Low | Yes — Go-side only |
| 3b (drop uniform names) | 0.5 days | Low | Low | Yes — saves bandwidth |
| 4b (eliminate snapshots) | 1-2 days | Medium | Medium | Yes — Go-side only |
| 5b (texture resolution) | 0.5 days | Medium | Low | Yes — less data everywhere |
| 3c (arena sharing) | 1-2 days | Low | Medium | Neutral — JS-local optimization |
| 5a (release JS geometry) | 0.5 days | Medium | Low | **No** — breaks reconnect/re-upload |

**Start with Phase 1.** It's the highest impact/risk ratio and will immediately
show results in the profiling output. Phase 2 is the long-term solution but requires
more careful design and testing.

5a is last because it's incompatible with a remote bridge (Valve-style TCP/IP) where
the JS side must retain geometry data as the authoritative source.

---

## Success Criteria

1. **Minimum:** Game runs 2+ minutes without FPS degradation on this machine
2. **Good:** Sustained 20+ fps for entire play session
3. **Great:** Performance parity with Chrome (30+ fps sustained)

## Measurement Commands

```bash
# Profile command counts (before/after Phase 1)
TSYNE_SHADER_PROFILE=1 ./scripts/tsyne ported-apps/roblouie_charonir/src/main.ts

# Full diagnostics
TSYNE_MEM_DIAG=1 ./scripts/tsyne ported-apps/roblouie_charonir/src/main.ts 2>&1 | tee /tmp/charon-log.txt

# Go heap profile (when TSYNE_MEM_DIAG=1 is set, pprof on :6060)
go tool pprof http://localhost:6060/debug/pprof/heap
```
