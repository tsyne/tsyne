# Pixel Editor for Tsyne

A pixel-based image editor ported to Tsyne from the original Fyne implementation.

## Credits & Attribution

**Original Project:** [fyne-io/pixeledit](https://github.com/fyne-io/pixeledit)
**Original Authors:** Fyne.io Contributors
**Original Framework:** [Fyne](https://fyne.io/) - Cross-platform GUI toolkit for Go

This TypeScript port was created for the Tsyne framework (TypeScript → Go → Fyne.io bridge).

## License

Portions of this code are derived from the original pixeledit project by Fyne.io contributors.

The original pixeledit repository does not specify an explicit license. Fyne.io projects typically follow the BSD-3-Clause license used by the main [Fyne framework](https://github.com/fyne-io/fyne).

```
Portions Copyright (c) 2019-2024 Fyne.io Contributors
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors
   may be used to endorse or promote products derived from this software
   without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
```

## Features

### From Original pixeledit
- Pencil tool (draw with foreground color)
- Picker/Eyedropper tool (sample colors)
- Power-of-2 zoom (100% to 1600%)
- File open/save/reload
- Recent files history (preferences-based)
- Foreground color preview
- Tool button highlighting (▶ prefix on active tool)
- Command-line file loading

### Tsyne Port Enhancements
- **Additional Tools:** Eraser, Bucket Fill, Line, Rectangle, Circle, Selection
- **Undo/Redo System:** 50-operation history
- **Background Color:** BG color picker and swap FG/BG
- **Clipboard:** Copy, Cut, Paste operations with selection
- **Layer System:** Multiple layers with visibility, opacity, and alpha compositing
- **Enhanced Status Bar:** Coordinates, tool name, selection info, layer info, unsaved indicator

## Usage

```bash
# Run the pixel editor
npx tsx ported-apps/pixeledit/pixeledit.ts

# Load a file from command line
npx tsx ported-apps/pixeledit/pixeledit.ts /path/to/image.png
```

## Testing

```bash
# Run all pixeledit tests
npm test -- pixeledit/

# Run specific test files
npm test -- pixeledit/pixeledit-tools.test.ts          # Bucket fill, line tool
npm test -- pixeledit/pixeledit-new-features.test.ts   # Rectangle, circle, color
npm test -- pixeledit/pixeledit-advanced-features.test.ts  # Selection, clipboard, layers

# Run with visual debugging
TSYNE_HEADED=1 npm test -- pixeledit/
```

## Architecture

The port follows the original pixeledit structure:

| Original (Go) | Port (TypeScript) |
|---------------|-------------------|
| `internal/api/editor.go` | `PixelEditor` class |
| `internal/api/tool.go` | `Tool` interface |
| `internal/tool/pencil.go` | `PencilTool` class |
| `internal/tool/picker.go` | `PickerTool` class |
| `internal/ui/palette.go` | `buildPalette()` method |
| `internal/ui/raster.go` | `TappableCanvasRaster` |
| `internal/ui/history.go` | `loadRecentFiles()` / `saveRecentFiles()` |
| `internal/ui/status.go` | `buildStatusBar()` method |
| `main.go loadFileArgs()` | `process.argv[2]` handling |

## Implementation Status

All features from the original pixeledit have been ported:
- ✅ Pencil and Picker tools
- ✅ Power-of-2 zoom
- ✅ File open/save/reload
- ✅ Recent files history
- ✅ FG color preview and picker
- ✅ Tool button highlighting
- ✅ Command-line file loading

Plus significant enhancements not in the original:
- ✅ 6 additional tools (Eraser, Bucket, Line, Rectangle, Circle, Select)
- ✅ Undo/Redo system
- ✅ Background color support
- ✅ Clipboard operations
- ✅ Layer system

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 7/10 | Complex menu-driven layout with toolbar, canvas, color palette, layers panel. Programmatic menu construction |
| **Core declarative** | Fluent method chaining | 4/10 | `.withId()` on 5 elements. No `.when()` or `.bindTo()`. Limited IDs for a 5000+ line app |
| **Core declarative** | Programmatic generation | 7/10 | Extensive programmatic menu generation. Color palette grid built from loops |
| **State architecture** | Observable store | 3/10 | No Observable store. Canvas/layer state managed directly. 5000+ line monolithic class |
| **Declarative updates** | `.when()` + `.bindTo()` | 1/10 | No reactive bindings. 17 `setText()` calls for tool/color/layer status |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No `removeAll()`/`setContent()` |
| **Testing** | `.withId()` coverage | 3/10 | Only 5 IDs despite being the largest app |
| **Design** | Separation of concerns | 5/10 | 51 `showForm()`/dialog calls for CRUD operations — good dialog pattern but all in one massive class |
| | **Overall** | **4/10** | Impressive scope (5000+ lines, 51 dialogs) with good programmatic menu generation, but monolithic architecture with no Observable store or reactive bindings |

## See Also

- [PLAN.md](./PLAN.md) - Detailed implementation plan and test coverage
- [Original pixeledit](https://github.com/fyne-io/pixeledit) - Source project
- [Fyne.io](https://fyne.io/) - Cross-platform GUI toolkit
