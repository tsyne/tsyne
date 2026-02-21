# Remote Bridge: Distributed Tsyne Architecture

## Progress Summary

| Phase | Status | Notes |
|-------|--------|-------|
| 1. msgpack-tcp transport | **DONE** | Go server, TS client, auth, `Bridge.connect()` URL factory, integration tests |
| 2. Binary data optimization | **DONE** | Native binary for msgpack/gRPC; base64 only for stdio/FFI (JSON) |
| 3. Latency tolerance | **DONE** | Command pipelining, fire-and-forget, event coalescing (auto-enabled for TCP), transparent reconnection |
| 4. gRPC over WAN | **DONE** | `GrpcTcpBridgeConnection`, `--bind`/`--token`, auth interceptors, `Ping` RPC |
| 5. Audio channel | Not started | |
| 6. Multi-language SDK | Proto ready | `bridge.proto` has 180+ RPCs; no generated clients yet |
| 7. Security hardening | ~50% | Token auth for both transports; server-side TLS for gRPC and msgpack-tcp; no mTLS, permissions, or rate limiting |
| 8. Testing infrastructure | ~60% | Integration + pipelining tests with real bridge processes; no Docker multi-container or latency sim |

---

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
| `msgpack-uds` | Local only | Unix domain socket — child process mode |
| `msgpack-tcp` | **Yes** | TCP with auth, `--bind`/`--token` flags |
| `grpc` (local) | Local only | Child process mode, random port + auto token |
| `grpc` (remote) | **Yes** | TCP with auth, `--bind`/`--token` flags |
| `ffi` | No | In-process, not applicable |
| `web-renderer` | **Yes** | WebSocket on port 9876, already network-capable |

### Unified URL scheme (implemented)

Both TCP transports use a single URL format for connection:

```
<scheme>://[host][:port][#token]
```

| URL | Transport | Auth |
|-----|-----------|------|
| `msgpack-tcp://192.168.1.42:9800#secret` | msgpack over TCP | token |
| `msgpack-tcp://localhost:9800` | msgpack over TCP | none (localhost) |
| `grpc://192.168.1.42:50051#secret` | gRPC over TCP | token |
| `grpc://localhost:50051` | gRPC over TCP | none (localhost) |
| `grpcs://192.168.1.42:50051#secret` | gRPC over TLS | token |
| `grpcs://localhost:50051` | gRPC over TLS | none (localhost) |
| `msgpack-tcp+tls://192.168.1.42:9800#secret` | msgpack over TLS | token |
| `msgpack-tcp+tls://localhost:9800` | msgpack over TLS | none (localhost) |
| `msgpack-uds` | msgpack over UDS | child process |
| `grpc` | gRPC | child process |

### Bridge factory API (implemented)

```typescript
// Explicit URL:
const bridge = Bridge.connect('msgpack-tcp://192.168.1.42:9800#secret');

// From CLI args (--bridge=<url>), falling back to TSYNE_BRIDGE env var:
const bridge = Bridge.fromArgsOrEnv(process.argv);

// From env var only:
const bridge = Bridge.fromEnv();

// All produce a BridgeInterface. Pass to app():
app(bridge, { title: 'Chess' }, (a) => { ... });
```

---

## Phase 1: `msgpack-tcp` Transport (Core Networking) — DONE

**Goal:** Bridge listens on a TCP port. Remote TypeScript driver connects over the network. All 180+ message types work unchanged.

### 1.1 Go side — DONE

Implemented in `msgpack_server.go` (reused for both UDS and TCP) and `main.go`:

- `runMsgpackTcpMode()` in `main.go` — standalone TCP server
- `--bind=0.0.0.0:9800` flag (default `localhost:9800`), `--bind=localhost:0` for OS-assigned port
- `--token=<secret>` flag — shared-secret auth via first message `{type: "auth", token: "<secret>"}`
- Empty token on localhost = no auth required (matches developer ergonomics)
- Security guard: refuses `--bind=0.0.0.0` without `--token`
- Multiple concurrent clients via `sync.Map`
- Logs `LISTEN msgpack-tcp on <addr>` to stderr on startup

### 1.2 TypeScript side — DONE

Implemented in `core/src/msgpacktcpbridge.ts`:

- `MsgpackTcpBridgeConnection` class implementing `BridgeInterface`
- Constructor accepts `(testMode, host?, port?, token?, reconnectConfig?, tlsConfig?)` — env vars as fallback
- Auth handshake after TCP connect (when token is set)
- 5-second connect timeout with clear error messages
- Auth error detection with actionable diagnostics
- TLS via `MsgpackTlsConfig` — `tls.connect()` with optional CA cert, `secureConnect` event
- Transparent reconnection with exponential backoff (see Phase 3.4)

### 1.3 Transport selection — DONE

```typescript
export type BridgeMode = 'stdio' | 'grpc' | 'grpcs' | 'msgpack-uds' | 'msgpack-tcp' | 'msgpack-tcp+tls' | 'ffi' | 'web-renderer';
```

`Bridge.parse()` handles URL → `BridgeConfig { mode, host?, port?, token? }`.
`createBridge()` routes config to the appropriate connection class.

Env vars still work as fallback: `TSYNE_BRIDGE_HOST`, `TSYNE_BRIDGE_PORT`, `TSYNE_TOKEN`.

### 1.4 Bridge startup mode — DONE

```bash
# Local mode (existing): bridge is child process
npx tsx my-app.ts

# Remote mode: bridge is standalone service
bin/tsyne-bridge --mode=msgpack-tcp --bind=0.0.0.0:9800 --token=mysecret

# Remote driver connects via CLI arg
node my-app.js --bridge=msgpack-tcp://192.168.1.42:9800#mysecret

# Or via env var
TSYNE_BRIDGE=msgpack-tcp://192.168.1.42:9800#mysecret npx tsx my-app.ts
```

### 1.5 Testing (Docker) — NOT DONE

No `docker-compose.test.yml` or multi-container setup yet. Integration tests run locally by spawning bridge processes.

### 1.6 Testing (Pixel 3a / postmarketOS) — NOT DONE

No automated test script. Manual testing is possible with the implemented `--bind`/`--token` flags.

### 1.7 Integration tests — DONE

`core/src/__tests__/bridge-tcp.test.ts` — 27 tests covering:
- Raw msgpack TCP ping-pong (with and without auth)
- Auth rejection with wrong token
- `Bridge.parse()` URL parsing (10 cases, including `msgpack-tcp+tls://`)
- `Bridge.fromArgsOrEnv()` argv extraction + env fallback
- Symmetric `describe.each` tests for both TCP transports: spawn server → connect → ping → shutdown
- TLS integration tests for `grpcs://` (connect + auth)
- TLS integration tests for `msgpack-tcp+tls://` (connect + auth)

---

## Phase 2: Binary Data Optimization — DONE

**Goal:** Screenshots, pixel buffers, and textures transfer efficiently over the wire without base64 bloat.

### Approach: Transport-agnostic widgets

Widget code (`canvas.ts`) always sends raw `Uint8Array`. The transport layer handles encoding:

- **Msgpack bridges**: pass binary through natively (`Uint8Array` → msgpack bin → Go `[]byte`)
- **gRPC bridges**: pass binary through natively via protobuf `bytes` fields
- **Stdio/FFI bridges**: `encodeBinaryFields()` in `send()` auto-converts `Uint8Array`/`Buffer` to base64 before `JSON.stringify`

### 2.1 Go `extractBinary()` helper — DONE

Added to `types.go`. Accepts `[]byte` (msgpack/gRPC native) or base64 `string` (stdio/JSON), with optional `data:` URI prefix. All 10 binary-handling internal handlers use it, making them transport-agnostic.

### 2.2 Native binary in msgpack — DONE

Msgpack already supports binary natively. The GL proxy (`trine/integration/gl-proxy-textures.ts`) was already sending raw `Uint8Array` through msgpack. Now all canvas/image operations do the same: `setPixelBuffer`, `setPixelRect`, `setImageFromPNG`, `updateCanvasSphereBuffer`, `setTextureUniform`, `setCubemapUniform`, `registerResource`.

### 2.3 Native binary in gRPC — DONE

gRPC server handlers no longer `base64.StdEncoding.EncodeToString()` protobuf `bytes` fields. They pass `req.Data`, `req.Buffer`, `req.Image`, etc. as `[]byte` directly into the payload.

Added 4 new gRPC RPCs with proto messages: `SetTappableCanvasBuffer`, `UpdateCanvasSphereBuffer`, `SetShaderTextureUniform`, `SetShaderCubemapUniform`. Total gRPC canvas binary operations: 6 (+ the 2 pre-existing `SetTappableCanvasImage`, `SetTappableCanvasRect`).

TS gRPC mapper (`mapMessageToGrpc`) updated with `toBuffer()` helper and all 6 new cases.

### 2.4 GL texture uploads — NOT YET DONE

`texImage2D` and `texSubImage2D` payloads in the GL batch command format still use the existing path. These go through the GL proxy layer (`gl-proxy-textures.ts`) which already sends raw `Uint8Array` via msgpack, so they're already binary-native on that transport. gRPC GL batching is out of scope for now.

---

## Phase 3: Latency Tolerance & Resilience — DONE

**Goal:** Work reliably over high-latency links (50-200ms RTT) and survive brief disconnections.

### 3.1 Command pipelining — DONE

Removed `messageQueue` serialization from all four bridge classes that had it. Previously, each `send()` chained through a promise queue — message B couldn't even be *written to the socket* until message A's response arrived. Over a 100ms RTT link, creating 50 widgets took 5 seconds.

Now `send()` calls the underlying transport method directly (`sendMsgpackMessage` / `sendGrpcCall`), writing frames to the socket immediately. Multiple frames can be in-flight simultaneously. The Go server's `bufio.Reader` loop processes them sequentially and responses come back in order. The TS `handleData()` already matches responses by message ID.

**Changed classes:**
- `MsgpackTcpBridgeConnection` (`msgpacktcpbridge.ts`)
- `MsgpackBridgeConnection` (`msgpackbridge.ts`)
- `GrpcBridgeConnection` (`grpcbridge.ts`)
- `GrpcTcpBridgeConnection` (`grpcbridge.ts`)

**Not changed:** `FyneBridgeConnection` (`fynebridge.ts`) — already pipelined (never had `messageQueue`).

**Tests:** `core/src/__tests__/bridge-batch.test.ts` — 9 tests covering all four transports: pipelined pings, error isolation, response ordering, widget creation burst, `Promise.all` concurrency for each class, pipelined-vs-sequential timing.

**Bug fix:** `--bind` flag default changed from `"localhost:9800"` to `""` in `main.go`. The old default made `runGrpcMode()` always enter standalone mode, making the child-process path (with `findFreePort()` + stdout JSON handshake) dead code. Now `msgpack-tcp` applies its own default internally when `--bind` is empty.

### 3.2 Fire-and-forget over TCP — DONE

`sendFireAndForget()` implemented in all bridge connections (`MsgpackTcpBridgeConnection`, `GrpcBridgeConnection`, `GrpcTcpBridgeConnection`). Skips response queue and message ID tracking. Used for:
- Canvas animation updates (drag events, 60fps updates)
- Progress bar updates
- Non-critical UI refreshes

### 3.3 Event coalescing on bridge side — DONE

`msgpack_server.go` has batching infrastructure (`EnableBatching(window)`, `SendEventBatched()`). Auto-enabled for TCP connections with a 2ms batch window — multiple events arriving within the window are coalesced into a single write. UDS mode keeps batching disabled (immediate flush) since per-write overhead is negligible on local sockets. The `Bridge.sendEvent()` path routes through `SendEventBatched()` for all msgpack transports, which falls back to immediate flush when batching is disabled.

### 3.4 Transparent reconnection — DONE

When a TCP connection drops unexpectedly:
1. Bridge keeps all widget state in memory (it already does)
2. TS client enters RECONNECTING state with exponential backoff (500ms → 1s → 2s → ... capped at 10s)
3. `send()` calls block (await new `connectionPromise`) until reconnected
4. `sendFireAndForget()` silently drops during reconnection
5. `pendingRequests` from the old socket are rejected immediately
6. `eventHandlers` are NEVER cleared during reconnection — only on intentional `shutdown()`
7. `messageId` counter never resets — IDs stay unique across reconnections
8. After max retries (default 10), connection fails permanently
9. `quit()` and `shutdown()` set `intentionalShutdown = true` — no reconnect attempt

Implemented for both `MsgpackTcpBridgeConnection` and `GrpcTcpBridgeConnection`.

State replay (stateSnapshot event + driver reconciliation) is not yet implemented — the current approach assumes the Go bridge's widget state survives the reconnect, and the driver's event handlers + widget IDs remain valid.

---

## Phase 4: gRPC over WAN (Existing Transport, Extended) — DONE

**Goal:** The existing gRPC transport works over real networks, not just localhost.

### 4.1 Bind address — DONE

`runGrpcMode()` in `main.go` accepts `bindAddr` and `token` parameters. When `bindAddr` is set, runs as standalone TCP server. When empty, runs as child process with random port and auto-generated token.

### 4.2 TLS for gRPC — DONE

Server-side TLS via `--tls-cert` and `--tls-key` flags. TypeScript connects with `grpcs://` scheme using `grpc.credentials.createSsl()`. Self-signed test cert in `core/testdata/`. Integration tests verify TLS connect+ping with and without auth token.

**Transport layer details:**

gRPC uses HTTP/2 as its wire protocol, but this is an implementation detail — not a constraint on payloads. Protobuf `bytes` fields carry raw binary with zero encoding overhead. The path is: `Uint8Array` → protobuf `bytes` → HTTP/2 DATA frames → TLS records — three binary layers, no base64 or text encoding anywhere. HTTP/2 frames are binary themselves (unlike HTTP/1.1 text headers), so pixel buffers, textures, and screenshots transfer at full efficiency.

**Network traversal implications:**

| Network path | gRPC (HTTP/2) | msgpack-tcp (raw TCP) |
|---|---|---|
| Direct LAN / USB tether | Works | Works |
| SSH tunnel / VPN / WireGuard | Works | Works |
| L4/TCP proxy (HAProxy TCP mode) | Works | Works |
| TLS-terminating LB (AWS NLB, HAProxy gRPC mode) | Works | Works (with TLS) |
| HTTP/1.1 forward proxy (Squid, corporate) | **Blocked** — doesn't speak HTTP/2 | **Blocked** — not HTTP at all |
| L7 load balancer expecting REST | **May fail** — tries to parse HTTP/2 as REST | N/A |
| Port 80/443 with HTTP inspection | **May fail** | **Blocked** |

For Tsyne's primary use cases (bridge on phone/Pi/desktop, driver on dev machine or cloud), the connection is typically direct LAN, USB tether, or VPN — no HTTP proxies in the path. Both transports behave identically in these scenarios.

**Future option — WebSocket tunneling:**

For hostile network paths (corporate proxies, port-restricted environments), the solution would be wrapping gRPC or msgpack frames inside WebSocket. WebSocket traverses any HTTP proxy via the standard `Upgrade` mechanism. The `web-renderer` transport already uses WebSocket on port 9876, so the infrastructure exists. This would be a separate phase if the need arises — it's not required for current WAN use cases where direct TCP is available.

### 4.3 Persistent token — DONE

`--token` flag configures a persistent token. The gRPC `tokenAuthInterceptor` and `tokenStreamInterceptor` validate the `authorization` metadata. When token is empty (localhost), auth is skipped.

### 4.4 Streaming events — DONE (pre-existing)

Already implemented via `SubscribeEvents(EventSubscription) returns (stream Event)`. Works over TCP natively.

### 4.5 Ping RPC — DONE

Added `Ping` RPC to `bridge.proto` and Go server for connectivity testing. Used by integration tests.

### 4.6 GrpcTcpBridgeConnection — DONE

New class in `core/src/grpcbridge.ts`:
- Connects to `host:port` with optional token
- Shares `mapMessageToGrpc()` mapping function with `GrpcBridgeConnection`
- `waitForReady()` with 5-second deadline
- Clear error messages on connection failure

### 4.7 Pros/cons vs msgpack-tcp

| | msgpack-tcp | gRPC |
|---|---|---|
| Serialization overhead | Lower (msgpack is smaller) | Higher (protobuf, but typed) |
| Schema evolution | Schemaless (flexible) | Schema-enforced (safe) |
| Client generation | Manual | Auto-generated for any language |
| Streaming | Custom framing | Built-in bidirectional streams |
| Tooling | Wireshark + custom | grpcurl, grpcui, built-in reflection |
| Language support | Need custom client per language | Every major language has gRPC libs |
| Binary payloads | Native (msgpack bin type) | Native (protobuf `bytes`) — no base64 anywhere |
| Wire protocol | Raw TCP + length-prefix framing | HTTP/2 (binary frames, not text) |
| Proxy traversal | Blocked by HTTP proxies | Blocked by HTTP/1.1 proxies; works through L4/TCP proxies |

**Recommendation:** gRPC is the better choice for third-party integration (game engines, cloud platforms) because clients can be auto-generated from `bridge.proto`. msgpack-tcp is better for TypeScript-only scenarios due to lower overhead.

---

## Phase 5: Audio Channel — NOT STARTED

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

## Phase 6: Protocol-Agnostic Driver SDK — PROTO READY

**Goal:** Non-TypeScript drivers can control tsyne-bridge. A C++ game engine or Python ML pipeline sends commands to the bridge.

### 6.1 gRPC client generation — NOT DONE

`bridge.proto` already defines the full API (180+ RPCs including the new `Ping`). Generate clients for:
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

## Phase 7: Security Hardening — BASIC AUTH DONE

### 7.1 Authentication

- **Shared secret** (Phase 1): **DONE** — `--token` flag for both msgpack-tcp and gRPC
- **mTLS**: NOT DONE — mutual TLS with client certificates, good for production
- **OAuth2/JWT**: NOT DONE — for cloud platforms that issue tokens via their auth systems

### 7.2 Authorization — NOT DONE

Message-level permissions. A remote driver might be allowed to create widgets but not capture screenshots or access the clipboard:

```json
{
  "allow": ["create*", "set*", "show*"],
  "deny": ["clipboardGet", "clipboardSet", "captureWindow", "preferencesGet"]
}
```

Configured via `--permissions=<file.json>` on the bridge.

### 7.3 Rate limiting — NOT DONE

Protect against runaway drivers:
- Max messages per second (default: 10,000)
- Max binary blob size (default: 50MB)
- Max concurrent widgets (default: 10,000)

### 7.4 Network exposure — DONE

- Default bind: `localhost` (safe)
- `--bind=0.0.0.0` requires explicit `--token` (refuses to start without auth on public interfaces)
- Applies to both msgpack-tcp and gRPC transports

---

## Phase 8: Testing Infrastructure — PARTIAL

### 8.1 Local integration tests — DONE

`core/src/__tests__/bridge-tcp.test.ts` — 27 tests:
- Spawns real `tsyne-bridge` process with `--headless --bind=localhost:0` (OS-assigned port)
- Parses `LISTEN <mode> on <host>:<port>` from stderr
- Tests both msgpack-tcp and gRPC symmetrically via `describe.each`
- Each test: spawn → connect → ping → assert → shutdown → kill (releases port)
- Tests auth handshake, auth rejection, URL parsing (10 cases), argv extraction
- TLS tests for both `grpcs://` and `msgpack-tcp+tls://` (self-signed cert in `core/testdata/`)

`core/src/__tests__/bridge-batch.test.ts` — 9 tests:
- Command pipelining across all four transports (msgpack-tcp, msgpack-uds, grpc-tcp, grpc local)
- Raw socket tests: pipelined pings, error isolation, response ordering, widget creation burst
- Class-level tests: `Promise.all` concurrent sends for each bridge class
- Timing test: pipelined vs sequential performance comparison

### 8.2 Docker-based integration tests — NOT DONE

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
      - TSYNE_BRIDGE=msgpack-tcp://bridge:9800#test-token
    depends_on:
      - bridge
```

### 8.3 Test categories

| Category | What it tests | Status |
|----------|--------------|--------|
| **Smoke** | Basic connectivity, auth, ping | **DONE** (bridge-tcp.test.ts) |
| **TLS** | TLS for grpcs:// and msgpack-tcp+tls:// | **DONE** (bridge-tcp.test.ts) |
| **Pipelining** | Concurrent commands, ordering, error isolation | **DONE** (bridge-batch.test.ts) |
| **Widget CRUD** | All 180+ message types work remotely | Not done |
| **Latency** | Commands work with simulated latency | Not done |
| **Binary data** | Screenshots, pixel buffers over TCP | Native binary path implemented; integration tests not yet written |
| **Reconnect** | Recovery after brief disconnect | **DONE** (bridge-reconnect.test.ts) |
| **Concurrent** | Multiple drivers | Not done |
| **GL proxy** | WebGL commands over TCP | Not done |
| **Phone** | Real hardware rendering | Not done (manual possible) |

### 8.4 Pixel 3a test script — NOT DONE

```bash
#!/bin/bash
# test-remote-pixel3a.sh
PHONE_IP=172.16.42.1  # typical USB tethering IP

# Start bridge on phone
ssh user@$PHONE_IP "tsyne-bridge --mode=msgpack-tcp --bind=0.0.0.0:9800 --token=test" &
sleep 2

# Run app from dev machine
node my-app.js --bridge=msgpack-tcp://$PHONE_IP:9800#test
```

### 8.5 Latency simulation — NOT DONE

```bash
# In Docker bridge container, add 100ms latency
tc qdisc add dev eth0 root netem delay 100ms
```

---

## Implementation Order & Dependencies

```
Phase 1: msgpack-tcp transport ─────────────┐
  1.1 Go TCP server                    DONE  │
  1.2 TypeScript TCP client            DONE  │
  1.3 Transport selection (URL+env)    DONE  │
  1.4 Bridge standalone mode           DONE  │
  1.5 Docker test setup                      ├── Minimum viable remote bridge
  1.6 Pixel 3a test                          │
                                             │
Phase 2: Binary data optimization ───────────┤
  2.1 extractBinary() Go helper        DONE  │
  2.2 Native binary in msgpack         DONE  │
  2.3 Native binary in gRPC           DONE  │
  2.4 GL texture uploads (batch)             │
                                             │
Phase 3: Latency tolerance ──────────────────┤
  3.1 Command pipelining              DONE  │
  3.2 Fire-and-forget over TCP        DONE  │
  3.3 Event coalescing (TCP auto)     DONE  │
  3.4 Transparent reconnection        DONE  │
                                             │
Phase 4: gRPC over WAN ───────────────────── ┤
  4.1 Bind address                     DONE  │
  4.2 TLS for gRPC                     DONE  │
  4.3 Persistent token                 DONE  │
  4.4 Streaming events                 DONE  │
  4.5 Ping RPC                         DONE  │
  4.6 GrpcTcpBridgeConnection         DONE  │
                                             │
Phase 5: Audio channel ──────────────────────┤
  (independent; can start any time)          │
                                             │
Phase 6: Multi-language SDK ─────────────────┤
  (depends on Phase 4 for proto stability)   │
                                             │
Phase 7: Security hardening ─────────────────┤
  7.1 Token auth                       DONE  │
  7.4 Network exposure guard           DONE  │
  7.2 Authorization / permissions            │
  7.3 Rate limiting                          │
  7.1 mTLS / OAuth2                          │
                                             │
Phase 8: Test infrastructure ────────────────┘
  8.1 Local integration tests          DONE
  8.2 Docker multi-container
  8.3-8.5 Latency, phone, etc.
```

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
