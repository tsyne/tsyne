# Designer Icons

This directory should contain the application icons for the Tsyne Designer.

## Required Icons

For Tauri to build properly, you need the following icon files:

- `32x32.png` - Small icon (32x32 pixels)
- `128x128.png` - Medium icon (128x128 pixels)
- `128x128@2x.png` - Retina medium icon (256x256 pixels)
- `icon.icns` - macOS icon bundle
- `icon.ico` - Windows icon file

## Generating Icons

You can use the Tauri CLI to generate all required icon formats from a single source image:

```bash
npm run tauri icon path/to/source-icon.png
```

The source icon should be at least 512x512 pixels for best results.

## Placeholder Icons

Until proper icons are created, you can use simple placeholder images or generate them using the Tauri CLI with a basic logo.
