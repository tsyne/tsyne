# Screenshot Support for Tsyne Browser

## Overview

Taking screenshots of Tsyne Browser pages for documentation, testing, and debugging.

## Requirements

### Linux (Headless Environment)
For headless Linux environments (like CI/CD, Docker, or terminal-only systems), you need Xvfb (X Virtual Framebuffer):

```bash
# Install Xvfb
sudo apt-get update
sudo apt-get install -y xvfb

# Install additional dependencies for Fyne
sudo apt-get install -y libgl1-mesa-dev xorg-dev
```

## Taking Screenshots

### Method 1: Built-in Screenshot Capability

Tsyne Browser already has screenshot capability (as mentioned in git log). You can trigger it via:

```typescript
// In Tsyne Browser
await browser.screenshot('/path/to/screenshot.png');
```

### Method 2: Using Xvfb for Headless Screenshots

Run Tsyne Browser in a virtual display:

```bash
# Start Xvfb on display :99
Xvfb :99 -screen 0 1920x1080x24 &

# Set DISPLAY environment variable
export DISPLAY=:99

# Run Tsyne Browser (will render to virtual display)
npx tsyne-browser http://localhost:3000/

# Take screenshot with xwd or import
xwd -root -display :99 | convert - screenshot.png
```

### Method 3: Using xvfb-run Wrapper

Simpler one-liner approach:

```bash
# Run Tsyne Browser with xvfb-run
xvfb-run --auto-servernum --server-args='-screen 0 1920x1080x24' \
  npx tsyne-browser http://localhost:3000/
```

### Method 4: Automated Screenshot Script

Create `take-screenshot.sh`:

```bash
#!/bin/bash

# Configuration
URL=$1
OUTPUT=$2
DISPLAY_NUM=99

# Start Xvfb
Xvfb :$DISPLAY_NUM -screen 0 1920x1080x24 &
XVFB_PID=$!

# Wait for Xvfb to start
sleep 2

# Set display
export DISPLAY=:$DISPLAY_NUM

# Start server
node examples/server.js &
SERVER_PID=$!

# Wait for server
sleep 2

# Launch browser and wait
timeout 10 npx tsyne-browser $URL &
BROWSER_PID=$!

# Wait a bit for page to load
sleep 5

# Take screenshot
xwd -root -display :$DISPLAY_NUM | convert - $OUTPUT

# Cleanup
kill $BROWSER_PID $SERVER_PID $XVFB_PID

echo "Screenshot saved to $OUTPUT"
```

Usage:
```bash
chmod +x take-screenshot.sh
./take-screenshot.sh http://localhost:3000/ homepage.png
```

## Integration with Testing

### TsyneTest Screenshot API

If using TsyneTest framework:

```typescript
import { TsyneTest } from 'tsyne/test';

const test = new TsyneTest({ headed: false });

// Create app
const app = test.createApp((app) => {
  // ... build UI
});

await app.run();

// Take screenshot
await test.screenshot('/tmp/test-screenshot.png');

await test.cleanup();
```

### TsyneBrowserTest Screenshots

For browser pages:

```typescript
import { TsyneBrowserTest } from 'tsyne';

const bt = new TsyneBrowserTest();

bt.addPages([
  { path: '/', code: '...' }
]);

await bt.createBrowser('/');

// Navigate and screenshot
await bt.screenshot('/tmp/homepage.png');

await bt.navigate('/about');
await bt.screenshot('/tmp/about.png');

await bt.cleanup();
```

## Screenshot Utilities

### Automated Screenshot Generator

Create `generate-screenshots.js`:

```javascript
const { TsyneBrowserTest } = require('tsyne');
const fs = require('fs');
const path = require('path');

async function generateScreenshots() {
  const pages = [
    { path: '/', name: 'homepage' },
    { path: '/text-features', name: 'text-features' },
    { path: '/hyperlinks', name: 'hyperlinks' },
    { path: '/scrolling', name: 'scrolling' },
    { path: '/images', name: 'images' },
    { path: '/table-demo', name: 'table-demo' },
    { path: '/list-demo', name: 'list-demo' },
    { path: '/dynamic-demo', name: 'dynamic-demo' },
    { path: '/post-demo', name: 'post-demo' },
    { path: '/fyne-widgets', name: 'fyne-widgets' }
  ];

  const bt = new TsyneBrowserTest();

  // Add all pages
  for (const page of pages) {
    const filePath = path.join(__dirname, 'examples/pages', page.path === '/' ? 'index.ts' : page.path.slice(1) + '.ts');
    const code = fs.readFileSync(filePath, 'utf8');
    bt.addPages([{ path: page.path, code }]);
  }

  await bt.createBrowser('/');

  // Generate screenshots
  for (const page of pages) {
    console.log(`Capturing ${page.name}...`);
    await bt.navigate(page.path);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for render
    await bt.screenshot(`screenshots/${page.name}.png`);
  }

  await bt.cleanup();
  console.log('All screenshots generated!');
}

// Create screenshots directory
if (!fs.existsSync('screenshots')) {
  fs.mkdirSync('screenshots');
}

generateScreenshots().catch(console.error);
```

Run with:
```bash
xvfb-run node generate-screenshots.js
```

## Docker Support

Create `Dockerfile.screenshots`:

```dockerfile
FROM node:20

# Install Xvfb and dependencies
RUN apt-get update && apt-get install -y \
    xvfb \
    libgl1-mesa-dev \
    xorg-dev \
    imagemagick \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Screenshot generation script
CMD ["xvfb-run", "node", "generate-screenshots.js"]
```

Build and run:
```bash
docker build -f Dockerfile.screenshots -t tsyne-screenshots .
docker run -v $(pwd)/screenshots:/app/screenshots tsyne-screenshots
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Generate Screenshots

on: [push]

jobs:
  screenshots:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y xvfb libgl1-mesa-dev xorg-dev
          npm install

      - name: Build
        run: npm run build

      - name: Generate screenshots
        run: xvfb-run node generate-screenshots.js

      - name: Upload screenshots
        uses: actions/upload-artifact@v3
        with:
          name: screenshots
          path: screenshots/
```

## Troubleshooting

### Error: "Cannot open display"

Solution: Ensure Xvfb is running and DISPLAY is set:
```bash
export DISPLAY=:99
Xvfb :99 &
```

### Error: "No protocol specified"

Solution: Allow X11 connections:
```bash
xhost +local:
```

### Screenshots are blank/black

Solutions:
- Wait longer before taking screenshot (increase sleep time)
- Ensure Xvfb screen size is sufficient (1920x1080x24)
- Check that browser fully loaded before screenshot

### Performance Issues

Solutions:
- Use headless mode for faster screenshots
- Reduce screen resolution if needed
- Kill Xvfb between screenshot batches

## Best Practices

1. **Consistent dimensions** - Always use same screen size for consistency
2. **Wait for render** - Add delays to ensure page fully renders
3. **Cleanup processes** - Always kill Xvfb, browser, server after screenshots
4. **Automate** - Use scripts for reproducible screenshot generation
5. **Version control** - Don't commit screenshots, generate them in CI/CD
6. **Documentation** - Use screenshots in README, docs, blog posts

## Example Output

After running screenshot generation:

```
screenshots/
├── homepage.png
├── text-features.png
├── hyperlinks.png
├── scrolling.png
├── images.png
├── table-demo.png
├── list-demo.png
├── dynamic-demo.png
├── post-demo.png
└── fyne-widgets.png
```

Use these in SCREENSHOTS.md, README.md, or blog posts about Tsyne.
