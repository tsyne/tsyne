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
npx ts-node ported-apps/pixeledit/pixeledit.ts

# Load a file from command line
npx ts-node ported-apps/pixeledit/pixeledit.ts /path/to/image.png
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

## See Also

- [PLAN.md](./PLAN.md) - Detailed implementation plan and test coverage
- [Original pixeledit](https://github.com/fyne-io/pixeledit) - Source project
- [Fyne.io](https://fyne.io/) - Cross-platform GUI toolkit
