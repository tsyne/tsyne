# Visual Editor Screenshots

This document explains how to capture and use screenshots of the Tsyne WYSIWYG Visual Editor for documentation.

## Directory Structure

```
visual-editor/
├── screenshots/           # Screenshot images go here
│   ├── .gitkeep
│   ├── README.md
│   └── *.png             # Screenshot files
├── capture-screenshots.js # Automated screenshot script
└── SCREENSHOTS.md        # This file
```

## Capturing Screenshots

### Method 1: Automated (Recommended)

Uses Puppeteer to automatically capture screenshots of key editor states.

**Prerequisites:**
```bash
npm install --save-dev puppeteer
```

**Run:**
```bash
# Terminal 1: Start the server
cd visual-editor
node server.js

# Terminal 2: Capture screenshots
TAKE_SCREENSHOTS=1 node visual-editor/capture-screenshots.js
```

This will create 8 screenshots showing:
1. Initial editor view
2. Load file dialog
3. File loaded with widget tree
4. Widget selected (properties panel visible)
5. Property being edited
6. Widget palette
7. After adding new widget
8. Save changes confirmation

### Method 2: Manual

For custom screenshots or if Puppeteer isn't available:

1. **Start the server:**
   ```bash
   cd visual-editor && node server.js
   ```

2. **Open browser:**
   - Navigate to http://localhost:3000
   - Set viewport to 1400x900 (recommended)

3. **Capture states:**
   - Open DevTools (F12) → More Tools → Capture screenshot
   - Or use your OS screenshot tool

4. **Save to:**
   ```
   visual-editor/screenshots/descriptive-name.png
   ```

## Screenshot Guidelines

### Viewport Size
- **Width:** 1400px (shows all 3 panels comfortably)
- **Height:** 900px (shows widget tree without scrolling)

### What to Capture

**Essential screenshots:**
- [ ] Initial blank editor
- [ ] File loaded showing widget tree structure
- [ ] Widget selected with properties panel populated
- [ ] Widget palette visible and highlighted
- [ ] Before/after of add operation
- [ ] Before/after of delete operation

**Optional screenshots:**
- Property editing in action
- Multiple widgets selected
- Different widget types (containers, inputs, display)
- Save confirmation dialog

### File Naming

Use descriptive, sequential names:
```
01-initial-view.png
02-file-loaded.png
03-widget-selected.png
04-property-editing.png
05-widget-palette.png
06-add-widget.png
07-delete-widget.png
08-save-changes.png
```

## Using Screenshots in Documentation

### README.md

```markdown
## Visual Editor

The WYSIWYG Visual Editor provides a graphical interface for editing Tsyne applications:

![Visual Editor](visual-editor/screenshots/03-file-loaded.png)

### Features

- **Widget Tree:** Navigate your app's component hierarchy
- **Live Preview:** See changes in real-time
- **Properties Panel:** Edit widget properties visually
- **Widget Palette:** Add new widgets with drag-and-drop

![Widget Palette](visual-editor/screenshots/06-widget-palette.png)
```

### In Commit Messages

Reference screenshots when describing visual changes:

```
feat: Add widget palette to visual editor

Adds a categorized widget palette allowing users to add
new widgets by clicking palette items.

Screenshot: visual-editor/screenshots/06-widget-palette.png
```

## Troubleshooting

### "Puppeteer fails to launch browser"

**Cause:** Chrome/Chromium not found or network issues downloading browser

**Solutions:**
1. Use `PUPPETEER_SKIP_DOWNLOAD=1 npm install puppeteer` if Chrome is installed
2. Set `PUPPETEER_EXECUTABLE_PATH=/path/to/chrome`
3. Use manual screenshot method instead

### "Server not running" error

**Cause:** Visual editor server isn't started

**Solution:**
```bash
# Start server first
cd visual-editor && node server.js &

# Then run screenshot script
TAKE_SCREENSHOTS=1 node capture-screenshots.js
```

### "Screenshots are blank"

**Cause:** Page elements not loaded before screenshot

**Solution:**
- Increase `waitForTimeout` values in capture-screenshots.js
- Add explicit `waitForSelector` for dynamic content
- Use `waitUntil: 'networkidle2'` for page loads

## Screenshot Checklist

Before committing screenshots:

- [ ] All screenshots at consistent viewport size (1400x900)
- [ ] Images compressed/optimized (use ImageOptim, pngquant, etc.)
- [ ] File names are descriptive and sequential
- [ ] README.md in screenshots/ directory is updated
- [ ] Screenshots referenced in main documentation
- [ ] No sensitive data visible in screenshots

## Examples from Other Projects

See how other Tsyne examples handle screenshots:
- `examples/screenshots/` - Example app screenshots
- `examples/01-hello-world.test.ts` - Test with `TAKE_SCREENSHOTS=1`
- `docs/SCREENSHOTS.md` - Main screenshot documentation
