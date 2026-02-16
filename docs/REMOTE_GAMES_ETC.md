# Remote Games & Network-Transparent Rendering

Tsyne-bridge can act as a **language-agnostic display server**. The Go+Fyne process runs on the machine with the screen and speakers, while game logic runs elsewhere — in any language that can speak gRPC (or raw TCP+JSON). This is network transparency at a semantic level: you send "create button" not "draw 400 pixels", so bandwidth stays low for most game types.

This document tracks the design and open questions across issues [#172](#172-audio)–[#182](#182-tri-chess).

## Architecture

```
Display Machine (Chromebook/Desktop       Remote Machine (Game Server / Cloud)
  or Phone or tablet)                             
┌──────────────────────────┐              ┌──────────────────────────┐
│ tsyne-bridge (Go+Fyne)   │ ◄── gRPC ─── │ Game Engine              │
│ • Native GUI rendering   │   (TCP/IP)   │ (C, Rust, Go, Python...) │
│ • Audio playback         │              │ • Physics, AI, logic     │
│ • Keyboard/mouse input   │              │ • Sends render commands  │
│ • GPU + speakers         │              │ • Receives input events  │
└──────────────────────────┘              └──────────────────────────┘
```

The bridge is a **retained-mode smart terminal**, not a dumb framebuffer. It remembers widget state, renders locally at 60fps, and handles hover/animation/theme without network traffic. Only state changes cross the wire.

## Comparison to X11

X11 pioneered network-transparent GUIs in the 1980s. Tsyne's approach differs fundamentally in abstraction level:

| Aspect | X11 | Tsyne |
|--------|-----|-------|
| Wire protocol | Drawing primitives ("draw line 0,0→10,10") or full bitmaps | Semantic intent ("create button with ID btn1") |
| Rendering engine | Runs on the app machine (client-side) | Runs on the display machine (bridge-side) |
| Bandwidth | High — sends pixels/commands constantly | Low — sends state changes only |
| Theme/appearance | Determined by the app | Determined by the bridge/OS |
| Network stall behavior | UI freezes or goes blank | UI stays crisp, just stops responding to clicks |
| Canvas exception | PutImage (heavy) | `updateCanvasRaster` (equally heavy — same problem) |

The key advantage: for non-raster content, Tsyne sends a 50-byte message ("create button") where X11 would send thousands of draw commands. Hover animations, click ripples, and gradient rendering all happen locally on the GPU without network traffic.

## Multi-Bridge Architecture

For running a game alongside the Tsyne desktop, **two separate bridge processes** is the right design:

- **Bridge A** (local): Runs the desktop/launcher via stdio, owned by local Node.js
- **Bridge B** (networked): Runs in server mode via gRPC, owned by remote game engine

The OS window manager handles focus/input routing natively — no event-stealing race conditions, no proxy logic needed. If the game crashes, the desktop is unaffected.

The desktop launcher spawns Bridge B when the user launches a remote game, then notifies the remote server to connect.

## GitHub Issues

### #172: Audio Channel {#172-audio}

**Status:** Design complete, not implemented.

The bridge currently has no native audio playback. Audio must be played by the Go bridge process (it's the one with speakers), not by the remote app.

**Two levels:**
- **Level 1 — Resource-based:** Upload WAV/OGG/MP3 files as resources, play/pause/seek via bridge messages. Covers music, SFX, UI sounds. Go implementation via [hajimehoshi/oto](https://github.com/hajimehoshi/oto).
- **Level 2 — Streaming:** Remote engine sends PCM chunks for procedural/spatial audio. Needs a separate channel (second UDS socket locally, separate TCP port remotely) to avoid head-of-line blocking on the widget message queue.

**Existing audio code** (not "zero capabilities"):
- `phone-apps/audio-recorder/` — Full UI with `IRecordingService` interface (mocked). Could be backed by real bridge audio capture.
- `examples/waveform-visualizer/` — Uses ffmpeg/ffplay/mpv externally. Could switch to native bridge playback.

**Open questions:**
- Positional/spatial audio API (needed for Quake-class games — attenuation, stereo panning)?
- Audio capture (recording) as the inverse of playback — same plumbing?

### #173: Server Mode for tsyne-bridge {#173-server-mode}

**Status:** Design complete, not implemented. Prerequisite for everything else.

Currently the bridge only runs as a child process spawned by Node.js on localhost. Server mode adds:

| Flag | Default | Purpose |
|------|---------|---------|
| `--host` | `localhost` | Bind interface (`0.0.0.0` for network) |
| `--port` | `0` (random) | Fixed port for firewall/pre-sharing |
| `--token` | auto-generated | Pre-shared auth secret |
| `--server` | `false` | Stay alive when stdin closes (daemon mode) |

TypeScript side: `TSYNE_BRIDGE_HOST`, `TSYNE_BRIDGE_PORT`, `TSYNE_BRIDGE_TOKEN` env vars skip spawn and connect directly.

**Open questions:**
- TLS for gRPC? (Not needed for home LAN MVP, but needed for cloud gaming)
- Should the bridge also accept the stdio frame protocol (length+CRC32+JSON) over TCP? This would let C clients avoid gRPC entirely — just `socket()` + `send()` + JSON. Much simpler than grpc-c.

### #174: PoC Games Overview {#174-poc-games}

Four proof-of-concept games, each in a different language, each targeting a different rendering tier. All are forks/ports of existing open-source games.

| Priority | Game | Language | Rendering Tier | Bridge Bandwidth |
|----------|------|----------|---------------|-----------------|
| 1 | Chess | Python | Sprites/text | ~0 (turn-based) |
| 2 | Asteroids | Go | Vector primitives | 2-5 KB/frame |
| 3 | Roguelike RPG | Rust | Sprites | ~0 (tile updates only) |
| 4 | Wolf3D raycaster | C | Raw framebuffer | ~7 MB/s at 320x200 |

### #175: Quake Port (C) {#175-quake}

**The forcing function.** Quake is well-understood enough that any problems are ours, not the game's. It systematically exposes every gap in the bridge:

1. **Server mode** (#173) — Quake's C process can't spawn the bridge as a child
2. **Raw TCP for C** — grpc-c is impractical; needs the stdio frame protocol over TCP
3. **Audio** (#172) — Quake without sound is a non-starter; its WAV SFX + CD music are a perfect Level 1 test case; its positional audio (distance attenuation, stereo panning) pushes the spatial audio API
4. **High-frequency framebuffer updates** — exposes head-of-line blocking immediately; a 64KB pixel buffer blocking a keyboard event response by 20ms makes input laggy
5. **Mouse delta events** — FPS needs `onMouseMove(dx, dy)` with relative coordinates, not just click positions; current `onTap(x, y)` is insufficient
6. **Pointer lock / mouse capture** — cursor must be hidden and confined; needs a new `setPointerLock(widgetId, true)` message; unclear if Fyne supports this natively
7. **Frame pacing / backpressure** — Quake renders as fast as it can; without "latest wins" semantics for `updateCanvasRaster`, the socket buffer fills with stale frames

**What changes in the Quake source:** Rip out `vid_*.c` (video drivers), `snd_*.c` (sound drivers), `in_*.c` (input drivers). Replace with a thin bridge client (~200 lines of C using cJSON + raw TCP). Keep everything else: BSP renderer, network code, QuakeC VM, console.

**Bandwidth:** 320x200x4 @ 30fps = ~7.3 MB/s (LAN feasible). 640x480 needs gigabit. Quake originally ran at 320x200 — authentic.

### #176: ClassiCube / Minecraft Classic Port (C) {#176-minecraft}

Fork [ClassiCube](https://github.com/ClassiCube/ClassiCube) — a clean C reimplementation of Minecraft Classic with an already-abstracted rendering backend (`Window_*.c`, `Graphics_*.c`, `Audio_*.c`).

Same integration pattern as Quake: replace platform layer, keep game engine. Same bandwidth constraints (full framebuffer streaming = Tier 3).

**Hybrid approach:** Render chunks server-side into 2D isometric tile sprites, upload as resources, composite via `blitToCanvasRaster`. Converts a 3D game into a Tier 1 sprite game from a bandwidth perspective. Looks different but plays fine.

### #177: Roguelike RPG Tile Walker (Rust) {#177-roguelike-rust}

Tier 1 sprite-based 2D game. Upload tileset once via `registerResource`, then send `blitToCanvasRaster` / sprite move commands at ~10Hz. Turn-based = zero latency sensitivity. Near-zero bandwidth during gameplay.

Rust + [tonic](https://github.com/hyperium/tonic) for gRPC.

### #178: Asteroids (Go) {#178-asteroids-go}

Tier 2 vector arcade game. All rendering via `createCanvasLine` / `createCanvasPolygon` — ships, rocks, and bullets are geometry. ~20-50 `moveCanvasObject` commands per frame at 60Hz. Bandwidth: 2-5 KB/frame, works flawlessly over WiFi. Vectors render crisply at any resolution (Fyne/OpenGL).

Go-to-Go gRPC, trivially generated from the existing `bridge.proto`.

### #179–#182: CVG-Idiomatic Games {#179-182-cvg-games}

Four games built entirely in CVG, exercising the reactive scene-graph tier (Tier 1b). These run locally but demonstrate the patterns that would make CVG games work remotely with near-zero ongoing bandwidth.

| Issue | Game | CVG Features Exercised |
|-------|------|----------------------|
| #179 | Reversi/Othello | `onClick`, `bindFill` (piece flips), `.when()` (legal move hints), `.transition()` (flip animation) |
| #180 | 2048 | `bindTo` (D3-style enter/update/exit), `.transition()` (slide + merge), `onKeyDown`, `bindFill` (tile colors) |
| #181 | Chess (CVG) | `onClick`, `onDrag`, `.when()` (legal moves), `.transition()` (piece movement), `bindTo` (pieces collection) |
| #182 | Star Trek Tri-Dimensional Chess | `cosynePerspective` (isometric multi-level board), `bindPos` (attack board movement), inverse perspective hit-testing, `.transition()` (pieces moving between levels) |

**#182 is the showcase.** Three stacked 4x4 boards with four movable 2x2 "attack boards", rendered with perspective transforms. Exercises every CVG feature simultaneously — perspective hit-testing through overlapping tilted planes is the hardest test of the CVG pipeline. Uses the formalized "Federation Standard" ruleset.

These games don't require #173 (server mode) — they run locally. But they validate the Tier 1b pattern: if the entire game renders and interacts through CVG bindings and `refresh()`, then making it remote is just a matter of where the game state lives.

**Pattern compliance:** CVG games should follow the same [pseudo-declarative UI composition](pseudo-declarative-ui-composition.md) patterns as ported apps. Each game's README should include a scorecard:

| Pattern | Expectation |
|---------|-------------|
| Observable Store | Game state in a dedicated store class with `subscribe()` / `notifyChange()` |
| Defensive copies | `getBoard()` returns `[...this.board]`, not `this.board` |
| `.when()` visibility | Legal moves, game-over overlays, turn indicators — all declarative |
| `.bindFill()` / `.bindPos()` | Piece colors and positions driven by bindings, not imperative `set` calls |
| `.bindTo()` + `trackBy` | Piece collections managed via D3-style enter/update/exit |
| Counter-based IDs | `piece-001`, `piece-002` — not `Date.now()` |
| `.withId()` for testing | All interactive elements queryable by ID |
| Co-located tests | `index.test.ts` for game logic (40-60 tests), `index.tsyne.test.ts` for integration |
| One-way data flow | Click handler calls `store.makeMove()`, store notifies, CVG `refresh()` re-evaluates bindings |

The game logic should be fully testable without CVG — the store is pure TypeScript with no rendering dependency. The CVG scene is a thin reactive view over the store.

**Testing with CosyneTest:** Integration tests (`index.tsyne.test.ts`) should use `CosyneTest` with `{ headed: true }` for full visual testing:

- **Interactive clicks** — Use `svgCtx.dispatchTap(x, y)` to simulate player moves, then assert game state changed and bindings updated. Element positions via `el.getBounds()` keep tests independent of layout constants.
- **Screenshot verification** — `ctx.captureScreenshot('reversi-opening.png')` at key game states. Claude (or any multimodal LLM reviewing tests) can visually verify the board looks correct — pieces in the right squares, colors right, legal-move indicators showing. Screenshots also serve as regression snapshots.
- **Event journaling** — `cosyneTest.createJournal(app, svgCtx)` logs every tap-hit, hover-in, when-show event. The journal makes test failures debuggable and validates that event routing hits the right named elements (`.name('cell-3-4')`).
- **Deterministic time** — Games with animations or timers should accept an injectable clock (e.g., `{ now: () => number }` or a `getElapsedTime` function). Tests provide a mock clock that advances on demand, so `.transition()` animations complete instantly and frame-rate-dependent logic is reproducible.
- **Deterministic randomness** — Games with random elements (2048 tile spawns, initial board shuffles) should accept a seed or a `random: () => number` function. Tests inject a fixed sequence so board states are predictable and assertions are exact. Example: `new GameStore({ random: seedrandom('test-seed') })`.
- **Hover and drag** — `svgCtx.dispatchHover(x, y)` for legal-move highlighting tests, `svgCtx.dispatchDrag()` for chess piece dragging. Assert that `bindFill` reacts (element color changes) and `.when()` toggles (legal move indicators appear/disappear).

## CVG: A Scene-Graph Tier for Games

[CVG (Cosyne Vector Graphics)](../cosyne/src/cvg/README.md) is an SVG-peer system with reactive bindings, animations, hit-testing, and perspective transforms — all rendering through Tsyne's canvas primitives. It creates a rendering tier that doesn't exist in the raw bridge primitives: **declarative scene graphs with bridge-side reactivity**.

For remote games, CVG is significant because it pushes work to the display machine:

| What | Without CVG (raw bridge) | With CVG |
|------|--------------------------|----------|
| Move a game piece | Send `moveCanvasObject` every frame | Send `bindPos()` once with velocity; bridge interpolates locally |
| Hover highlight | Remote engine receives hover event, sends color change back | `onHover` + `bindFill()` runs entirely on display machine |
| Animate explosion | Remote engine sends 30 sprite frames | `.transition({ opacity: 0 }, { duration: 500 })` — one message, bridge animates |
| Hit testing | Remote engine receives click coords, does geometry math, responds | CVG hit-tests locally, fires `onClick` on the right element |
| Conditional visibility | Remote engine sends show/hide commands | `.when(() => health > 0)` evaluated locally on `refresh()` |
| Data-driven lists | Remote engine manages add/remove of canvas objects | `.bindTo(items, render, { trackBy })` with D3-style enter/update/exit |

**The pattern for a CVG-based remote game:**

1. Remote engine sends the initial scene description (CVG elements with bindings, event handlers, animations)
2. Bridge-side CVG handles rendering, animation, hit-testing, hover effects locally at 60fps
3. Remote engine only receives high-level events ("player clicked tile 5,3") and sends state updates ("move piece from 5,3 to 5,5")
4. `refresh()` re-evaluates all bindings — positions, colors, visibility update in one call

This is the most network-efficient approach: the remote engine sends **intent** ("piece moves to here over 300ms"), not **frames** ("here are 18 intermediate positions"). The bridge does the interpolation, easing, and rendering locally.

**CVG perspective transforms** (`cosynePerspective` on groups) also enable pseudo-3D board games (isometric views, card-flip animations) without a real 3D pipeline or framebuffer streaming.

**Current limitation:** CVG is TypeScript-only. For non-Node.js game engines (C, Rust, Go), the remote engine would need to either:
- Send CVG scene descriptions as data (JSON/protobuf) that a thin TypeScript shim on the display machine interprets — a "CVG server" pattern
- Or use raw bridge primitives directly and miss the reactive features

This is an open design question — whether CVG's grammar should have a wire-format representation that non-TypeScript clients can emit.

## Game Rendering Tiers

| Tier | Strategy | Bandwidth | Examples | Suitability |
|------|----------|-----------|----------|-------------|
| 1. Sprites | Upload assets once, send move commands | Near zero | RPGs, strategy, cards, chess | Excellent |
| 1b. CVG scene graph | Send scene description once, bridge animates/hit-tests locally | Near zero after setup | Reversi (#179), 2048 (#180), Chess (#181), Tri-Chess (#182) | Excellent |
| 2. Vectors | Send geometry, bridge renders via OpenGL | 2-5 KB/frame | Asteroids, Geometry Wars | Very good |
| 3. Software framebuffer | Stream raw pixels per frame | 7-35 MB/s | Quake, Wolf3D, ClassiCube | Retro/experimental |
| 4. Modern 3D | Would need H.264/WebRTC video widget | N/A | Modern FPS, AAA games | Not feasible currently |

Tier 1b is the sweet spot for network transparency. After the initial scene setup, ongoing bandwidth approaches zero — only game-state deltas cross the wire, and the bridge handles all visual feedback (hover, animation, transitions) locally.

For Tiers 1-2, Tsyne is **superior to pixel streaming** (Stadia/GeForce Now): text is crisp, no compression artifacts, a fraction of the bandwidth.

For Tier 3, render at low resolution (320x200) and let the bridge upscale with nearest-neighbor. Authentic retro aesthetic, feasible over LAN.

Tier 4 would require a fundamentally different approach (video codec widget) that is out of scope for now.

## Bridge Capabilities Relevant to Games

| Feature | Status | Impact |
|---------|--------|--------|
| Sprite system | Implemented (`registerResource`, `blitToCanvasRaster`, sprite commands) | Perfect for 2D games, low bandwidth |
| Vector primitives | Implemented (`canvasLine`, `canvasCircle`, `canvasPolygon`) | Great for arcade games, rendered locally by OpenGL |
| Raw pixel buffers | Implemented (`updateCanvasRaster`) but uncompressed | Only for low-res retro games; bandwidth hog |
| CVG scene graphs | Implemented (`cosyne/src/cvg/`) | Declarative scenes with bindings, animation, hit-testing — all bridge-side; near-zero ongoing bandwidth |
| GLSL shaders | Implemented (`createCanvasShader`) | Send shader source once, renders locally at 60fps; great for backgrounds/effects |
| Audio | Not implemented (#172) | Critical blocker for any game |
| Server mode | Not implemented (#173) | Prerequisite for all remote games |
| Mouse deltas / pointer lock | Not implemented | Required for FPS games (#175) |
| Frame backpressure | Not implemented | Needed for high-frequency framebuffer streaming (#175) |
| Input latency | Fast (gRPC/TCP, TCP_NODELAY) | Good enough for everything except competitive eSports |

## Open Questions (Cross-Cutting)

1. **Stdio-over-TCP mode** — Should the bridge accept the existing stdio frame protocol (length+CRC32+JSON) over a TCP socket? This would let C/C++ clients avoid gRPC entirely. Much simpler integration for Quake/ClassiCube.

2. **Pointer lock** — Does Fyne support hiding and confining the cursor? If not, this needs a Fyne-level change or a platform-specific workaround (GLFW `SetInputMode`).

3. **Frame pacing** — "Latest wins" semantics for `updateCanvasRaster` (bridge drops queued stale frames, only renders the most recent)? Or explicit flow control ("ready for next frame" signal)?

4. **Separate data channels** — Both audio (#172) and video (Tier 3 games) suffer from head-of-line blocking when mixed with widget commands. A unified solution (priority queues? separate sockets per data type?) would be better than solving it twice.

5. **Client-side prediction** — For sprite games, should the bridge support interpolation between received positions? ("Sprite X is at position A moving toward B at velocity V" rather than discrete position updates.) This would smooth out network jitter for Tier 1 games.

6. **CVG wire format** — CVG's reactive scene graph is TypeScript-only. Should there be a JSON/protobuf representation of CVG scenes that non-TypeScript game engines (C, Rust, Go) can emit? Or is a thin TypeScript shim on the display machine (interpreting scene descriptions from the remote engine) sufficient?

## Implementation Order

```
CVG games (no bridge changes needed, can start immediately)
  ├── #179 Reversi             ← smallest complete CVG game
  ├── #180 2048                ← proves bindTo + complex transitions
  ├── #181 Chess (CVG)         ← proves drag + legal move highlighting
  └── #182 Tri-Chess           ← CVG showcase, stress-tests perspective hit-testing

#173 Server Mode             ← prerequisite for remote games
  ├── #178 Asteroids (Go)        ← simplest remote PoC, proves vector rendering
  ├── #172 Audio Channel         ← needed before any game is shippable
  │     └── #177 Roguelike (Rust)    ← proves sprites + audio together
  └── #175 Quake (C)             ← forcing function, exposes all remaining gaps
        └── #176 ClassiCube (C)      ← same pattern, different game
```

The CVG games (#179–#182) and remote infrastructure (#173) are independent tracks. CVG games validate the Tier 1b patterns locally; #173 enables running them (and everything else) remotely.

Chess (#174 item 1, Python) can be done in parallel at any point — it proves the "any language" story with Python + grpcio.
