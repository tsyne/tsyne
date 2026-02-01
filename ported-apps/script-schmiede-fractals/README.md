# Fractal Explorer

A comprehensive fractal visualization app ported from [script-schmiede.de/labs/fractals/r3/](https://script-schmiede.de/labs/fractals/r3/).

Original author: Jochen Renner (web@jochen-renner.de)

## Features

- **7 Fractal Types**: Mandelbrot, Julia, Tricorn, Burning Ship, Newton, Mandelbrot^3, Phoenix
- **Interactive Navigation**: Click to center and zoom, mouse wheel zooming
- **8 Color Palettes**: Classic, Fire, Ice, Rainbow, Ocean, Psychedelic, Grayscale, Copper
- **Julia/Phoenix Parameters**: Adjustable constants for Julia and Phoenix fractals
- **Keyboard Controls**: Full keyboard navigation support

## Screenshot

```
┌─────────────────────────────────────────────┐
│ Fractal: [Mandelbrot ▼]                     │
├─────────────────────────────────────────────┤
│                                             │
│          ╭──────────────────╮               │
│          │                  │               │
│          │   Mandelbrot     │               │
│          │   Fractal        │               │
│          │   Rendering      │               │
│          │                  │               │
│          ╰──────────────────╯               │
│                                             │
│ Mandelbrot | Zoom: 1.0x | classic           │
│                                             │
│ [Zoom +] [Zoom -] [Reset]                   │
│ [<] [^] [v] [>]                             │
│ [Palette]                                   │
│ [c.r-] [c.r+] [c.i-] [c.i+]                │
│─────────────────────────────────────────────│
│ Click to center & zoom, scroll to zoom      │
│ Keys: +/- zoom, arrows pan, P palette       │
└─────────────────────────────────────────────┘
```

## Controls

### Mouse
- **Click**: Center on point and zoom in 2x
- **Scroll Wheel**: Zoom in/out at cursor position

### Keyboard
| Key | Action |
|-----|--------|
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| Arrow keys | Pan view |
| `R` | Reset to defaults |
| `P` / `Space` | Next color palette |
| `Q` / `W` | Adjust Julia c.real |
| `A` / `S` | Adjust Julia c.imag |

## Supported Fractals

### Mandelbrot Set
The classic Mandelbrot set: z_{n+1} = z_n^2 + c

### Julia Set
Parameterized Julia set with adjustable constant c.
Default: c = -0.7 + 0.27015i

### Tricorn (Mandelbar)
Conjugate Mandelbrot: z_{n+1} = conj(z_n)^2 + c

### Burning Ship
Dramatic fractal using absolute values:
z_{n+1} = (|Re(z_n)| + i|Im(z_n)|)^2 + c

### Newton Fractal
Newton-Raphson iteration for z^3 - 1 = 0

### Mandelbrot^3
Third power Mandelbrot: z_{n+1} = z_n^3 + c

### Phoenix Fractal
Includes previous iteration term with parameters p and q.
Default: p = 0.5667, q = -0.5

## Architecture

```
index.ts
├── FractalState        # State management for fractal visualization
│   ├── View state (center, zoom)
│   ├── Fractal parameters
│   ├── Pixel buffer
│   └── Render/update methods
│
├── FractalsUI          # UI layer using Tsyne widgets
│   ├── TappableCanvasRaster for rendering
│   ├── Fractal type selector
│   └── Control buttons
│
└── fractalTypes        # Fractal type definitions
    ├── name
    ├── fn (iteration function)
    └── defaultCenter/zoom
```

## Dependencies

Uses shared fractal utilities from `phone-apps/fractal-utils.ts`:
- Palette definitions (8 palettes)
- Fractal iteration functions
- Color mapping

## Running

```bash
# Run standalone
npx tsx ported-apps/script-schmiede-fractals/index.ts

# Run tests
pnpm test ported-apps/script-schmiede-fractals/index.test.ts
```

## License

BSD-3-Clause

Original application by Jochen Renner.
Tsyne port by Paul Hammant.
