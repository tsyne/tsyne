# Boing Ball Demo

A port of the classic Boing Ball demo from ChrysaLisp to Tsyne.

## Summary

This is a recreation of the classic Amiga Boing Ball demo, originally created by Dale Luck and R.J. Mical for the Amiga in 1984/1985. The demo was famous for showcasing the Amiga's graphics capabilities at CES 1984.

Chris Hinsley created the ChrysaLisp version and previously did a TaOS version in 1992.

## Features

- Classic red and white checkered rotating sphere (12 animation frames)
- Smooth bouncing animation with gravity physics
- Shadow that follows the ball
- Grid background (64px spacing, like the original)

## Implementation

- Uses `CanvasRaster` for pixel-level rendering (640x480 canvas)
- Pre-generates all 12 rotation frames of the ball at startup
- Implements dirty rect optimization to only update changed pixels each frame
- Ball physics match the original: gravity of 1 unit/frame, bounce velocity of -22

### Data Files

The original ChrysaLisp version uses `.cpm` (ChrysaLisp pixel map) files for the ball images. Since this is a proprietary format, the ball is recreated programmatically using the classic red/white checkered sphere pattern with 3D shading.

## Notes

**Audio**: The original ChrysaLisp version plays `boing.wav` when the ball hits the bottom. This is not implemented since Tsyne doesn't currently have audio playback support. A TODO comment is in place for future implementation.

## Running

```bash
npx tsx ported-apps/boing/boing.ts
```

## Source

Ported from: https://github.com/vygr/ChrysaLisp/blob/master/apps/boing/app.lisp

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 3/10 | `vbox > canvasRaster(ball animation)`. Minimal widget chrome |
| **Core declarative** | Fluent method chaining | 2/10 | `.withId()` on 1 element. No `.when()` or `.bindTo()` |
| **Core declarative** | Programmatic generation | 5/10 | Loops for grid rendering and sprite composition, but these are pixel-level operations not widget generation |
| **State architecture** | Observable store | 2/10 | No Observable store. Animation state in local variables |
| **Declarative updates** | `.when()` + `.bindTo()` | 1/10 | No reactive bindings. 1 `setText()`. All updates via sprite system (`moveSprite`, `setSpriteResource`, `flush`) |
| **Anti-declarative** | No `removeAll()`/`setContent()` | -1 | 1 `setContent()` call |
| **Testing** | `.withId()` coverage | 1/10 | Only 1 ID |
| **Design** | Separation of concerns | 5/10 | Ball physics and rendering in single file. Sprite-based animation system |
| | **Overall** | **2/10** | Classic Amiga ball demo — entirely raster-based with sprite system. The canvas IS the UI; pseudo-declarative patterns don't naturally apply |

## License

This program is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License version 2 as published by the Free Software Foundation.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

Portions copyright Chris Hinsley. All rights reserved under the GPL v2 license.
