# Remote Bridge: Distributed Tsyne Architecture

## Vision

Tsyne-bridge runs on local hardware (display, keyboard, mouse, speakers, GPU). A remote "driver" — TypeScript/Node.js today, but potentially a C++ game engine, a cloud gaming backend (Epic EOS, GeForce NOW, Xbox Cloud), or a Rust server — sends widget/GL commands over TCP/IP to the bridge. The bridge renders locally and sends events back.

```
┌──────────────────────────┐          TCP/IP            ┌──────────────────────────┐
│  REMOTE DRIVER           │  ◄─────────────────────►   │  LOCAL BRIDGE CLIENT     │
│                          │    msgpack-tcp / grpc /     │                          │
│  • App logic             │    quic / websocket         │  • tsyne-bridge binary   │
│  • Game server           │                             │  • Fyne GUI + OpenGL     │
│  • Cloud compute         │  commands ──────────────►   │  • Keyboard/Mouse input  │
│  • AI inference          │  ◄──────────────── events   │  • Audio output          │
│  • Physics engine        │                             │  • Screenshot capture    │
│                          │                             │                          │
│  (Docker, bare metal,    │                             │  (Pixel 3a/pmOS, Linux   │
│   cloud VM, game server) │                             │   desktop, Raspberry Pi) │
└──────────────────────────┘                             └──────────────────────────┘
```

Today the bridge is always a **child process** of the TypeScript driver. The remote bridge inverts this: the bridge is a **long-running service** on local hardware, and remote drivers connect to it.

---

## Current State Assessment

### What already works over a network boundary

| Transport | Network-ready? | Notes |
|-----------|---------------|-------|
| `stdio` | No | stdin/stdout, process-local only |
| `msgpack-uds` | **Almost** | Unix socket — swap `net.Listen("unix",...)` for `net.Listen("tcp",...)` and it works |
| `grpc` | **Yes** | Already TCP on port 50051, but binds `localhost` only |
| `ffi` | No | In-process, not applicable |
| `web-renderer` | **Yes** | WebSocket on port 9876, already network-capable |

### Key insight: `msgpack-uds` and `grpc` are 90% there

The msgpack protocol is already framed (`[uint32 len][msgpack bytes]`), bidirectional, and handles concurrent clients. The gRPC server is already TCP. The main gaps are:

1. **Bind address** — both bind `localhost` only
2. **Authentication** — gRPC has a token but it's ephemeral (generated per spawn)
3. **Connection lifecycle** — bridge assumes single-session (driver spawns bridge, uses it, kills it)
4. **Service discovery** — bridge announces its socket/port to stdout (only parent process reads this)
5. **Reconnection** — no reconnect logic; bridge state is lost if connection drops
6. **Latency tolerance** — fire-and-forget assumes negligible latency
7. **Binary data** — screenshots, pixel buffers, textures flow as base64-in-JSON (huge overhead)

---

## Phase 1: `msgpack-tcp` Transport (Core Networking)

**Goal:** Bridge listens on a TCP port. Remote TypeScript driver connects over the network. All 180+ message types work unchanged.

### 1.1 Go side: `msgpack_tcp_server.go`

New file, parallel to `msgpack_server.go`. Differences:

- `net.Listen("tcp", bindAddr)` instead of `net.Listen("unix", socketPath)`
- Bind address from `--bind=0.0.0.0:9800` flag (default `localhost:9800`)
- Shared-secret authentication: first message from client must be `{type: "auth", token: "<secret>"}` — bridge validates against `--token=<secret>` flag or `TSYNE_TOKEN` env var
- TLS optional: `--tls-cert` and `--tls-key` flags → `tls.Listen()` wrapper
- Multiple concurrent clients (already supported by msgpack server's `sync.Map` of clients)
- Announce `{tcpPort, protocol, protocolVersion, bridgeVersion}` to stdout on startup (for orchestration tooling)

### 1.2 TypeScript side: `msgpacktcpbridge.ts`

New file, parallel to `msgpackbridge.ts`. Differences:

- `net.connect(port, host)` instead of `net.connect(socketPath)`
- Constructor takes `{host, port, token}` instead of spawning a child process
- Auth handshake after TCP connect
- Reconnection logic with exponential backoff (optional, default off)
- TLS support via `tls.connect()`

### 1.3 Transport selection

```typescript
export type BridgeMode = 'stdio' | 'grpc' | 'msgpack-uds' | 'msgpack-tcp' | 'ffi' | 'web-renderer';
```

Env vars: `TSYNE_BRIDGE_MODE=msgpack-tcp`, `TSYNE_BRIDGE_HOST=192.168.1.42`, `TSYNE_BRIDGE_PORT=9800`, `TSYNE_TOKEN=secret`

### 1.4 Bridge startup mode

```bash
# Local mode (existing): bridge is child process
npx tsx my-app.ts

# Remote mode: bridge is standalone service
tsyne-bridge --mode=msgpack-tcp --bind=0.0.0.0:9800 --token=mysecret

# Remote driver connects
TSYNE_BRIDGE_MODE=msgpack-tcp TSYNE_BRIDGE_HOST=192.168.1.42 \
  TSYNE_BRIDGE_PORT=9800 TSYNE_TOKEN=mysecret npx tsx my-app.ts
```

### 1.5 Testing (Docker)

```
┌────────────────────┐     docker network     ┌────────────────────┐
│  Container: bridge │  ◄──────────────────►   │  Container: driver │
│  tsyne-bridge      │     port 9800           │  npx tsx app.ts    │
│  --mode=msgpack-tcp│                         │  BRIDGE_MODE=      │
│  --headless        │                         │   msgpack-tcp      │
│  Xvfb :99          │                         │                    │
└────────────────────┘                         └────────────────────┘
```

- `docker-compose.yml` with two services on a shared network
- Bridge container: Ubuntu + Xvfb + tsyne-bridge (headless for CI, headed for manual testing)
- Driver container: Node.js + app code
- Test: run the test suite with `TsyneTest({ headed: true })` — screenshots taken on bridge side, transferred back via a `captureWindow` response (already returns PNG bytes)

### 1.6 Testing (Pixel 3a / postmarketOS)

```
┌────────────────────┐       USB tether        ┌────────────────────┐
│  Dev machine       │  ◄──────────────────►   │  Pixel 3a (pmOS)   │
│  npx tsx app.ts    │     192.168.x.x:9800    │  tsyne-bridge      │
│  BRIDGE_MODE=      │                         │  --mode=msgpack-tcp│
│   msgpack-tcp      │                         │  --bind=0.0.0.0:   │
│                    │   commands ──────────►   │   9800             │
│                    │   ◄──────── events       │  Real display +    │
│                    │                         │  touchscreen       │
└────────────────────┘                         └────────────────────┘
```

- Bridge pre-compiled on Pixel 3a (pmOS already has this)
- USB tethering provides IP connectivity
- Driver on dev machine sends commands; bridge renders on phone screen
- Touch events flow back as mouse/pointer events
- Screenshot verification: `captureWindow` returns PNG over the wire

---

## Phase 2: Binary Data Optimization

**Goal:** Screenshots, pixel buffers, and textures transfer efficiently over the wire without base64 bloat.

### 2.1 Binary frames in msgpack-tcp

Extend the framing protocol with a type byte:

```
[uint32 length][uint8 frame_type][payload]

frame_type:
  0x01 = msgpack message/response/event (existing)
  0x02 = binary blob (referenced by blob_id in subsequent msgpack messages)
```

Binary blobs are sent out-of-band and referenced by ID:

```
← {type: "captureWindow", result: {blobId: "ss-001", width: 800, height: 600, format: "png"}}
← [binary frame: blob_id="ss-001", 47KB PNG data]
```

### 2.2 Streaming pixel buffers

For `setPixelBuffer` (TappableCanvasRaster), send raw RGBA bytes as binary frames instead of base64-encoded strings. 800x600x4 = 1.9MB raw vs 2.5MB base64.

### 2.3 GL texture uploads

`texImage2D` and `texSubImage2D` payloads become binary references. The GL batch command format already accumulates commands — extend it with a binary attachment table.

---

## Phase 3: Latency Tolerance & Resilience

**Goal:** Work reliably over high-latency links (50-200ms RTT) and survive brief disconnections.

### 3.1 Command batching on driver side

Group multiple commands into a single TCP write. The msgpack format already supports this conceptually (each message is self-contained), but the TypeScript side currently sends one message at a time and waits for the response.

New API:

```typescript
bridge.batch(async (b) => {
  b.send('createLabel', { id: 'l1', text: 'Hello' });
  b.send('createButton', { id: 'b1', text: 'Click' });
  b.send('setContent', { windowId: 'w1', children: ['l1', 'b1'] });
});
// Sends all three as one TCP write, waits for all three responses
```

This is especially important for initial UI construction where 50-100 widget creation commands happen in sequence.

### 3.2 Fire-and-forget over TCP

`sendFireAndForget` currently skips the response queue. Over TCP, also skip waiting for ACK. Use a separate "unreliable" channel or simply don't track the message ID. Good for:
- Canvas animation updates (drag events, 60fps updates)
- Progress bar updates
- Non-critical UI refreshes

### 3.3 Event coalescing on bridge side

High-frequency events (mouseMove, drag) should be coalesced before sending over the wire. The bridge already has `batchWindow` for msgpack events — make this configurable and default to a larger window (5-10ms) for TCP connections.

### 3.4 Reconnection & state replay

When a TCP connection drops and reconnects:
1. Bridge keeps all widget state in memory (it already does)
2. Driver re-authenticates
3. Bridge sends a `stateSnapshot` event with all current widget IDs and their types
4. Driver reconciles (marks widgets as "remote-exists" instead of recreating)

This is optional/advanced — initial implementation can just fail on disconnect.

---

## Phase 4: gRPC over WAN (Existing Transport, Extended)

**Goal:** The existing gRPC transport works over real networks, not just localhost.

### 4.1 Bind address

Change `grpc_server.go` from `fmt.Sprintf(":%s", port)` to accept `--bind` flag. Already listens on TCP so this is minimal.

### 4.2 TLS for gRPC

gRPC has native TLS support. Add `--tls-cert` and `--tls-key` flags. The TypeScript gRPC client already supports TLS channel credentials.

### 4.3 Persistent token

Replace the ephemeral random token with a configurable `--token` flag. The gRPC interceptor already checks the `authorization` metadata — just make the token configurable.

### 4.4 Streaming events

Already implemented via `SubscribeEvents(EventSubscription) returns (stream Event)`. Works over TCP natively.

### 4.5 Pros/cons vs msgpack-tcp

| | msgpack-tcp | gRPC |
|---|---|---|
| Serialization overhead | Lower (msgpack is smaller) | Higher (protobuf, but typed) |
| Schema evolution | Schemaless (flexible) | Schema-enforced (safe) |
| Client generation | Manual | Auto-generated for any language |
| Streaming | Custom framing | Built-in bidirectional streams |
| Tooling | Wireshark + custom | grpcurl, grpcui, built-in reflection |
| Language support | Need custom client per language | Every major language has gRPC libs |

**Recommendation:** gRPC is the better choice for third-party integration (game engines, cloud platforms) because clients can be auto-generated from `bridge.proto`. msgpack-tcp is better for TypeScript-only scenarios due to lower overhead.

---

## Phase 5: Audio Channel

**Goal:** Bridge can play audio locally, driven by remote commands.

### 5.1 Audio messages

```
playAudio     {id, format: "wav"|"mp3"|"ogg", blobId}  — play a blob
playTone      {frequency, duration, volume}              — synthesized beep
stopAudio     {id}                                       — stop playback
setVolume     {id, volume: 0.0-1.0}                      — adjust volume
```

### 5.2 Go implementation

Use `github.com/faiface/beep` or `github.com/gopxl/beep` (maintained fork) for audio playback. Supports WAV, MP3, OGG, FLAC.

### 5.3 Streaming audio

For continuous audio (music, game audio), use the binary frame channel (Phase 2) to stream PCM chunks. Bridge buffers and plays with minimal latency.

This is lower priority than visual rendering but important for game scenarios.

---

## Phase 6: Protocol-Agnostic Driver SDK

**Goal:** Non-TypeScript drivers can control tsyne-bridge. A C++ game engine or Python ML pipeline sends commands to the bridge.

### 6.1 gRPC client generation

`bridge.proto` already defines the full API. Generate clients for:
- **C++** — for Unreal Engine / custom game engines
- **Python** — for ML/AI pipelines, Jupyter notebook UIs
- **Rust** — for high-performance servers
- **C#** — for Unity

```bash
protoc --cpp_out=. --grpc_out=. bridge.proto
protoc --python_out=. --grpc_python_out=. bridge.proto
```

### 6.2 Thin client library pattern

Each language gets a thin wrapper around the generated gRPC client:

```python
# Python example
from tsyne import TsyneBridge

bridge = TsyneBridge("192.168.1.42:50051", token="secret")
win = bridge.create_window(title="ML Dashboard", width=800, height=600)
label = bridge.create_label(text="Training progress: 0%")
bridge.set_content(win, [label])
bridge.show_window(win)

# Update from training loop
for epoch in range(100):
    train()
    bridge.set_text(label, f"Training progress: {epoch}%")
```

### 6.3 Cloud gaming integration points

For Epic EOS / GeForce NOW / Xbox Cloud scenarios:

```
┌────────────────────────┐                    ┌─────────────────────┐
│  Cloud Game Server     │     gRPC/TCP       │  Player's Device    │
│                        │  ◄──────────────►  │                     │
│  • Game logic (C++)    │                    │  • tsyne-bridge     │
│  • Physics (Unreal)    │  GL commands ───►  │  • GPU rendering    │
│  • AI opponents        │  ◄─── input events │  • Display          │
│  • Session mgmt        │                    │  • Input devices    │
│                        │                    │  • Audio output     │
│  (AWS GameLift /       │                    │  (Desktop / Phone / │
│   Azure PlayFab)       │                    │   Console)          │
└────────────────────────┘                    └─────────────────────┘
```

The bridge's GL proxy layer (WebGL commands → OpenGL rendering) means game servers can send standard WebGL draw calls and the bridge renders them locally with hardware acceleration. This is the **opposite** of cloud gaming's usual video-streaming approach — it's **command streaming**, which means:
- No video encoding/decoding latency
- No bandwidth for video frames (just command deltas)
- Full local frame rate (bridge renders at display refresh rate)
- Local input latency (events sent back, but rendering doesn't wait)

Trade-off: requires the bridge to have a capable GPU. Perfect for Tsyne's target of native apps on real hardware.

---

## Phase 7: Security Hardening

### 7.1 Authentication

- **Shared secret** (Phase 1): simple `--token` flag, good for trusted networks
- **mTLS**: mutual TLS with client certificates, good for production
- **OAuth2/JWT**: for cloud platforms that issue tokens via their auth systems

### 7.2 Authorization

Message-level permissions. A remote driver might be allowed to create widgets but not capture screenshots or access the clipboard:

```json
{
  "allow": ["create*", "set*", "show*"],
  "deny": ["clipboardGet", "clipboardSet", "captureWindow", "preferencesGet"]
}
```

Configured via `--permissions=<file.json>` on the bridge.

### 7.3 Rate limiting

Protect against runaway drivers:
- Max messages per second (default: 10,000)
- Max binary blob size (default: 50MB)
- Max concurrent widgets (default: 10,000)

### 7.4 Network exposure

- Default bind: `localhost` (safe)
- `--bind=0.0.0.0` requires explicit `--token` or `--tls-*` (refuse to start without auth on public interfaces)

---

## Phase 8: Testing Infrastructure

### 8.1 Docker-based integration tests

```yaml
# docker-compose.test.yml
services:
  bridge:
    build:
      context: .
      dockerfile: Dockerfile.bridge
    command: >
      tsyne-bridge --mode=msgpack-tcp --bind=0.0.0.0:9800
      --token=test-token --headless
    environment:
      - DISPLAY=:99
    ports:
      - "9800:9800"

  driver:
    build:
      context: .
      dockerfile: Dockerfile.driver
    command: >
      npx jest --config remote-tests/jest.config.js
    environment:
      - TSYNE_BRIDGE_MODE=msgpack-tcp
      - TSYNE_BRIDGE_HOST=bridge
      - TSYNE_BRIDGE_PORT=9800
      - TSYNE_TOKEN=test-token
    depends_on:
      - bridge
```

**Dockerfile.bridge:**
```dockerfile
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y xvfb libgl1-mesa-dev
COPY bin/tsyne-bridge /usr/local/bin/
ENTRYPOINT ["xvfb-run", "--auto-servernum"]
CMD ["tsyne-bridge"]
```

**Dockerfile.driver:**
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install
COPY . .
```

### 8.2 Test categories

| Category | What it tests | How |
|----------|--------------|-----|
| **Smoke** | Basic connectivity, auth, ping | Connect, auth, send `ping`, verify response |
| **Widget CRUD** | All 180+ message types work remotely | Run existing TsyneTest suite with `msgpack-tcp` transport |
| **Latency** | Commands work with simulated latency | `tc qdisc add` in Docker to add 50/100/200ms delay |
| **Binary data** | Screenshots, pixel buffers over TCP | `captureWindow` returns valid PNG, `setPixelBuffer` renders correctly |
| **Reconnect** | Recovery after brief disconnect | Kill and restart driver, verify bridge state preserved |
| **Concurrent** | Multiple drivers | Two driver containers connect to one bridge |
| **GL proxy** | WebGL commands over TCP | Three.js cube test with remote driver |
| **Phone** | Real hardware rendering | Manual: driver on laptop, bridge on Pixel 3a over USB tether |

### 8.3 Pixel 3a test script

```bash
#!/bin/bash
# test-remote-pixel3a.sh
# Prerequisites: Pixel 3a running pmOS, USB tethered, tsyne-bridge installed

PHONE_IP=$(adb shell ip addr show usb0 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)
# Or if using SSH over USB:
# PHONE_IP=172.16.42.1  # typical USB tethering IP

# Start bridge on phone
ssh user@$PHONE_IP "tsyne-bridge --mode=msgpack-tcp --bind=0.0.0.0:9800 --token=test" &

sleep 2

# Run tests from dev machine
TSYNE_BRIDGE_MODE=msgpack-tcp \
TSYNE_BRIDGE_HOST=$PHONE_IP \
TSYNE_BRIDGE_PORT=9800 \
TSYNE_TOKEN=test \
npx jest remote-tests/smoke.test.ts

# Capture screenshot from phone
TSYNE_BRIDGE_MODE=msgpack-tcp \
TSYNE_BRIDGE_HOST=$PHONE_IP \
TSYNE_BRIDGE_PORT=9800 \
TSYNE_TOKEN=test \
npx tsx remote-tests/screenshot-demo.ts
```

### 8.4 Latency simulation

```bash
# In Docker bridge container, add 100ms latency
tc qdisc add dev eth0 root netem delay 100ms

# Run latency-sensitive tests
# Verify fire-and-forget still works
# Verify event coalescing kicks in
# Verify batch commands reduce round trips
```

---

## Implementation Order & Dependencies

```
Phase 1: msgpack-tcp transport ─────────────┐
  1.1 Go TCP server                          │
  1.2 TypeScript TCP client                  │
  1.3 Transport selection (env vars)         │
  1.4 Bridge standalone mode                 │
  1.5 Docker test setup                      ├── Minimum viable remote bridge
  1.6 Pixel 3a test                          │
                                             │
Phase 2: Binary data optimization ───────────┤
  (can be deferred; base64 works initially)  │
                                             │
Phase 3: Latency tolerance ──────────────────┤
  3.1 Command batching                       │
  3.2 Fire-and-forget over TCP               │
  3.3 Event coalescing                       │
  3.4 Reconnection (optional/advanced)       │
                                             │
Phase 4: gRPC over WAN ─────────────────────┤
  (parallel to Phase 1; mostly config)       │
                                             │
Phase 5: Audio channel ──────────────────────┤
  (independent; can start any time)          │
                                             │
Phase 6: Multi-language SDK ─────────────────┤
  (depends on Phase 4 for proto stability)   │
                                             │
Phase 7: Security hardening ─────────────────┤
  (Phase 1 includes basic token auth;        │
   mTLS/OAuth2 can come later)              │
                                             │
Phase 8: Test infrastructure ────────────────┘
  (starts with Phase 1, grows incrementally)
```

### Estimated scope per phase

| Phase | New Go code | New TS code | New files | Modifies |
|-------|------------|------------|-----------|----------|
| 1 | ~300 lines | ~250 lines | 4 new | main.go, app.ts |
| 2 | ~150 lines | ~100 lines | 0 new | msgpack_tcp_server.go, msgpacktcpbridge.ts, protocol |
| 3 | ~100 lines | ~200 lines | 0 new | bridge classes, event dispatch |
| 4 | ~50 lines  | ~20 lines  | 0 new | grpc_server.go, grpcbridge.ts |
| 5 | ~400 lines | ~150 lines | 2 new | main.go (new handler registrations) |
| 6 | 0          | 0          | 3+ new | proto file, build scripts |
| 7 | ~200 lines | ~50 lines  | 1 new | server startup, auth middleware |
| 8 | 0          | ~300 lines | 5+ new | docker, test scripts |

---

## Key Design Decisions

### 1. Why msgpack-tcp as the primary remote transport (not gRPC)?

- **Lower overhead**: msgpack is ~30% smaller than protobuf for our message shapes (lots of string maps)
- **Simpler framing**: `[len][bytes]` vs HTTP/2 multiplexing
- **Already proven**: the UDS version handles all 180+ message types
- **Less dependency**: no protoc toolchain needed for TypeScript-only use
- **gRPC for multi-language**: when C++/Python/Rust clients need generated stubs, gRPC is the right choice

### 2. Why not WebSocket for everything?

WebSocket (web-renderer) works but adds HTTP upgrade overhead and doesn't support binary framing natively (requires packing into WebSocket frames). For high-frequency GL commands, raw TCP with msgpack is more efficient. WebSocket remains the right choice for browser-based renderers (Tauri).

### 3. Why command-streaming instead of video-streaming?

Traditional cloud gaming (GeForce NOW, Xbox Cloud) encodes video on the server and streams it to a thin client. Tsyne's approach is different:

| | Video streaming | Command streaming (Tsyne) |
|---|---|---|
| Server GPU needed | Yes (encoding) | No |
| Client GPU needed | No (just decode) | Yes (rendering) |
| Bandwidth | High (10-50 Mbps video) | Low (1-5 Mbps commands) |
| Latency | encode + network + decode | network only |
| Client quality | Fixed by encoder | Native (full GPU) |
| Use case | AAA games, thin clients | Native apps, Fyne UI, WebGL |

Command streaming is ideal when the client has real hardware (phone, desktop, Pi) and the server is doing compute/logic, not rendering.

### 4. Bridge as server vs bridge as client?

**Bridge as server** (our approach): bridge listens, driver connects.
- Pro: bridge starts once, multiple drivers can connect/reconnect
- Pro: natural for "device as display" scenarios
- Con: needs port forwarding / network config

**Bridge as client** (alternative): driver listens, bridge connects.
- Pro: easier NAT traversal (bridge initiates outbound connection)
- Pro: cloud server doesn't need to know bridge's IP
- Con: bridge needs to know server address upfront

**Recommendation:** Support both. Default is bridge-as-server (simpler). Add `--connect=host:port` flag for bridge-as-client mode in a later phase.

---

## Non-Goals (Explicitly Out of Scope)

- **Video streaming**: not replacing GeForce NOW — this is command streaming for native rendering
- **NAT traversal / hole punching**: use VPN, SSH tunnel, or direct connectivity
- **Multi-tenant**: one bridge instance serves one logical application (multiple drivers can connect, but they share the same widget tree)
- **State serialization / persistence**: bridge state is ephemeral (lives in memory, dies with the process)
- **Hot code reload**: driver can reconnect, but can't "resume" a previous session with different code
