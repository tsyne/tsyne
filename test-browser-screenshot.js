/**
 * Test that takes a screenshot to verify visual rendering
 */

const { createBrowser } = require('./dist/src/browser');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Create a simple test server
const server = http.createServer((req, res) => {
  if (req.url === '/test') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`
const { vbox, label, button, separator } = tsyne;

browserContext.setPageTitle('Screenshot Test Page');

vbox(() => {
  label('=== SCREENSHOT TEST ===');
  label('');
  label('Line 1: This should be visible');
  label('Line 2: So should this');
  label('Line 3: And this too');
  separator();
  label('');
  button('Test Button', () => {});
});
    `);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

async function main() {
  const port = 38500;

  await new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`Test server on port ${port}`);
      resolve(null);
    });
  });

  console.log('Creating browser...');
  const browser = await createBrowser(`http://localhost:${port}/test`, {
    title: 'Screenshot Test',
    width: 800,
    height: 600,
    testMode: true  // Use test mode
  });

  console.log('Browser created and page loaded');

  // Wait a moment for rendering
  await new Promise(resolve => setTimeout(resolve, 500));

  // Check widget tree
  const widgets = browser.getApp().getAllWidgets();
  const labels = widgets.filter(w => w.type === 'Label');
  console.log('\nWidget tree check:');
  console.log('Total widgets:', widgets.length);
  console.log('Label widgets:', labels.length);
  console.log('Label texts:', labels.map(l => l.props?.text).filter(t => t));

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
