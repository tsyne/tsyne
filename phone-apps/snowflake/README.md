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

## License

MIT - Portions copyright Paul Hammant 2025
This is a port of Snowflake (https://github.com/fynelabs/snowflake) to Tsyne.
