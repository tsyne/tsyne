# Snowflake App

A festive snowflake visualization application for enjoying animated snowflakes with customizable settings.

## Features

- **Snowflake visualization** - Display animated snowflakes
- **Density control** - Adjust number of snowflakes (10-100)
- **Speed control** - Adjust snowflake speed (0.5x-3x)
- **Animation toggle** - Start/stop snowflake animation
- **Persistent settings** - Remember user preferences

## How to Use

1. Launch the app to see snowflakes
2. Use density buttons to add/remove snowflakes
3. Use speed buttons to make them faster/slower
4. Toggle animation on/off as desired

## Architecture

- Model: Snowflake array with animation state
- View: Visualization and control panel
- Controller: Animation and settings handlers

## Testing

**8 Jest tests** covering density, speed, and animation controls.

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 6/10 | `vbox > hbox(controls) + canvasStack(snowflakes)` nesting |
| **Core declarative** | Fluent method chaining | 6/10 | `.withId()` on 16 elements: density/speed sliders, animation controls. No `.when()` or `.bindTo()` |
| **Core declarative** | Programmatic generation | 7/10 | Loop generating snowflake particles with per-flake canvasPath elements |
| **State architecture** | Observable store | 3/10 | No Observable store. Animation state managed directly |
| **Declarative updates** | `.when()` + `.bindTo()` | 1/10 | No reactive bindings. Updates via `refreshUI()` |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No `removeAll()`/`setContent()` |
| **Testing** | `.withId()` coverage | 6/10 | Good coverage on controls |
| **Design** | Separation of concerns | 5/10 | Animation and UI in single file |
| | **Overall** | **5/10** | Good programmatic snowflake generation with `.withId()` coverage. No reactive bindings |

## License

MIT - Portions copyright Paul Hammant 2025
This is a port of Snowflake (https://github.com/fynelabs/snowflake) to Tsyne.
