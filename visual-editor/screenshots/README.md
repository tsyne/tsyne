# Visual Editor Screenshots

This directory contains screenshots of the Tsyne WYSIWYG Visual Editor for documentation purposes.

## Capturing Screenshots

### Automated (Recommended)
Run the screenshot capture script:
```bash
# Start the server first
cd visual-editor && node server.js &

# Then capture screenshots
TAKE_SCREENSHOTS=1 node visual-editor/capture-screenshots.js
```

### Manual
1. Start the server: `node visual-editor/server.js`
2. Open http://localhost:3000 in your browser
3. Use browser dev tools (F12) to capture screenshots at 1400x900 resolution

## Screenshot List

1. **01-initial-view.png** - Editor on first load
2. **02-load-dialog.png** - File loading dialog
3. **03-file-loaded.png** - File loaded with widget tree visible
4. **04-widget-selected.png** - Widget selected showing properties panel
5. **05-property-editing.png** - Editing a widget property
6. **06-widget-palette.png** - Widget palette with available widgets
7. **07-widget-added.png** - After adding a new widget from palette
8. **08-save-changes.png** - Saving changes confirmation

