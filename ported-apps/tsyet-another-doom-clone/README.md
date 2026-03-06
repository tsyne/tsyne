# Yet Another Doom Clone - Tsyne Port

A faithful port of Nicholas Carlini's **js13k 2019** entry "Yet Another Doom Clone" to the Tsyne framework using software raycasting rendering.

```
   ╔═══════════════════════════════════════════════════════════╗
   ║                                                           ║
   ║       ████████████████████████████████████████████        ║
   ║       ██                                        ██        ║
   ║       ██    ████████████  ████████████████████  ██        ║
   ║       ██    ██          ██                  ██  ██        ║
   ║       ██    ██  ████    ██  ████████████    ██  ██        ║
   ║       ██    ██  ██  ██  ██  ██          ██  ██  ██        ║
   ║       ██    ██  ██  ██  ██  ██  ██████  ██  ██  ██        ║
   ║       ██    ██  ████    ██  ██  ██  ██  ██  ██  ██        ║
   ║       ██    ██          ██  ██  ████    ██  ██  ██        ║
   ║       ██    ██████████████  ██          ██  ██  ██        ║
   ║       ██                    ██████████████  ██  ██        ║
   ║       ██████████████████████████████████████████          ║
   ║                    ╱──────╲                               ║
   ║                    │  ╳   │  ← You are here               ║
   ║                    ╲──────╱                               ║
   ║                                                           ║
   ║                  Score: 0    Health: █████               ║
   ╚═══════════════════════════════════════════════════════════╝
```

## Original Game

- **Original Repository**: https://github.com/carlini/js13k2019-yet-another-doom-clone
- **Development Writeup**: https://nicholas.carlini.com/writing/2019/javascript-doom-clone-13k.html
- **js13k 2019 Entry**: A complete DOOM-style FPS in 13KB of JavaScript

## Features

- **First-person 3D** raycasting engine (software rendering)
- **Classic DOOM-style** gameplay and controls
- **Multiple enemies** with basic AI
- **Health system** with visual HUD
- **Score tracking** for kills
- **Level geometry** from compressed map data

## Controls

| Key | Action |
|-----|--------|
| Arrow Keys | Move forward/back, turn left/right |
| W/S | Move forward/backward |
| A/D | Strafe left/right |
| Space | Shoot |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Tsyne UI Layer                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              TappableCanvasRaster                      │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │                                                  │ │ │
│  │  │            Raycasting Renderer                   │ │ │
│  │  │  ┌────────────────────────────────────────────┐ │ │ │
│  │  │  │                                            │ │ │ │
│  │  │  │    • Cast rays for each screen column     │ │ │ │
│  │  │  │    • Render walls with distance shading   │ │ │ │
│  │  │  │    • Render sprites (enemies)             │ │ │ │
│  │  │  │    • Draw HUD (crosshair, health bar)     │ │ │ │
│  │  │  │                                            │ │ │ │
│  │  │  └────────────────────────────────────────────┘ │ │ │
│  │  │                                                  │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Game Logic                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Player    │  │   Enemies   │  │     GameMap         │  │
│  │ • position  │  │ • AI states │  │ • regions/polygons  │  │
│  │ • rotation  │  │ • combat    │  │ • walls             │  │
│  │ • health    │  │ • movement  │  │ • collision         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Math & Utilities                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Vector3   │  │  Rotation   │  │   Ray-Line          │  │
│  │  operations │  │  functions  │  │   Intersection      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Technical Notes

### Raycasting Renderer

The renderer uses classic raycasting (like Wolfenstein 3D/DOOM) rather than the original WebGL shaders:

1. **Ray casting**: For each screen column, cast a ray from the player
2. **Wall detection**: Find the closest wall intersection
3. **Height calculation**: Calculate wall height based on distance (with fisheye correction)
4. **Depth shading**: Apply distance-based fog/shading
5. **Sprite rendering**: Sort enemies by distance, render as 2D sprites

### Map System

The original uses a "turtle graphics" encoded map format:
- Commands are encoded as 1-byte instructions (3-bit opcode, 5-bit argument)
- Turtle moves and creates polygon regions
- Regions define floor/ceiling heights and walkable areas
- Walls are automatically generated at region boundaries

### Original vs Port

| Feature | Original | Tsyne Port |
|---------|----------|------------|
| Rendering | WebGL shaders | Software raycasting |
| Resolution | HD (browser) | 400x300 (configurable) |
| 3D Engine | Full 3D with Z | 2.5D raycasting |
| Shadows | Dynamic shadowmaps | Distance shading |
| Audio | Web Audio API | Not implemented |

## Running

```bash
# From tsyne root
npx tsx ported-apps/tsyet-another-doom-clone/index.ts
```

## Testing

```bash
# Jest unit tests
pnpm test -- ported-apps/tsyet-another-doom-clone/index.test.ts

# TsyneTest integration tests
pnpm test -- ported-apps/tsyet-another-doom-clone/index.tsyne.test.ts
```

## Credits

- **Original Game**: Nicholas Carlini (https://nicholas.carlini.com)
- **Tsyne Port**: Paul Hammant

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 4/10 | Minimal UI chrome — primarily a full-screen `tappableCanvasRaster` with HUD rendered directly into the pixel buffer. Game state labels (score, health, level) are overlay text drawn in the render pass, not Tsyne widgets |
| **Core declarative** | Fluent method chaining | 3/10 | Limited `.withId()` usage on canvas and any wrapper elements. The game's UI is the rendered pixel buffer, not widget-based |
| **Core declarative** | Programmatic generation | 5/10 | Enemy spawning from level spawn point arrays (`for...of` loops). Body parts and hit particles generated procedurally from factory functions. Map geometry from encoded data |
| **State architecture** | Observable store | 7/10 | `DoomGame` with `subscribe()`/`notifyChange()`. Manages game state, enemies, particles, player, map. Multiple entity types (`Enemy`, `BodyPart`, `HitParticle`, `LightFlash`, `Chaingun`). Multi-level system with `loadLevel()` |
| **Declarative updates** | `.when()` + `.bindTo()` | 1/10 | No `.when()`, no `.bindTo()`, no `.bindText()`. All rendering via `setPixelBuffer()`. Store notifications used only for game state changes (won/gameover), not UI binding |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No penalty — canvas-only app with single initial setup |
| **Testing** | `.withId()` coverage | 3/10 | Minimal widget IDs needed — the game is a single canvas. Game logic tested via `DoomGame` class methods |
| **Design** | Separation of concerns | 8/10 | Excellent multi-file decomposition: `DoomGame` (orchestrator), `Player`, `Enemy`/`WalkingEnemy`/`FlyingEnemy`, `GameMap`, `RaycastRenderer`, `Chaingun`, `BodyPart`, `HitParticle`, `ScreenShake`. Each class is self-contained |
| | **Overall** | **4/10** | This is a full-screen raycasting FPS — the pixel buffer IS the entire UI. Pseudo-declarative patterns don't apply to software-rendered game engines. The Observable store exists for game state management, and the code separation is excellent, but there are no Tsyne widgets to bind to. Appropriate architecture for this type of app |

## License

This program is free software: you can redistribute it and/or modify it under the terms of the **GNU General Public License** as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

See [LICENSE](./LICENSE) for the full license text.
