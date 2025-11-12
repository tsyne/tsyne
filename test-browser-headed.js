/**
 * Simple headed browser test - opens visible window
 * Run with: node test-browser-headed.js
 */

const { createBrowser } = require('./dist/src/browser');
const http = require('http');

// Create a simple test server with a basic page
const server = http.createServer((req, res) => {
  console.log('Server received request for:', req.url);

  if (req.url === '/test') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`
const { vbox, label, button, separator } = tsyne;

browserContext.setPageTitle('Simple Test Page');

vbox(() => {
  label('=== SIMPLE TEST PAGE ===');
  label('');
  label('This is a test to verify page content renders correctly.');
  label('');
  separator();
  label('');
  label('If you can see this text, the browser is working!');
  label('');
  button('Click Me', () => {
    console.log('Button clicked!');
  });
});
    `);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

async function main() {
  const port = 39000;

  await new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`Test server listening on port ${port}`);
      resolve(null);
    });
  });

  console.log('\n=================================================');
  console.log('Creating HEADED browser - window will be visible');
  console.log('=================================================\n');

  const browser = await createBrowser(`http://localhost:${port}/test`, {
    title: 'Visual Test Browser',
    width: 800,
    height: 600
  });

  console.log('\n=================================================');
  console.log('Browser window should now be visible!');
  console.log('=================================================');
  console.log('PLEASE CHECK THE WINDOW:');
  console.log('- Do you see the browser chrome (address bar, buttons)?');
  console.log('- In the content area, do you see:');
  console.log('    "=== SIMPLE TEST PAGE ==="');
  console.log('    "This is a test to verify page content renders correctly."');
  console.log('    "If you can see this text, the browser is working!"');
  console.log('    A "Click Me" button');
  console.log('');
  console.log('OR do you see:');
  console.log('    Black/empty content area');
  console.log('    OR placeholder text ("Tsyne Browser", "Enter a URL...")');
  console.log('=================================================');
  console.log('Press Ctrl+C when done observing...');
  console.log('=================================================\n');

  await browser.run();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
