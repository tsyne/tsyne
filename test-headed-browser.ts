/**
 * Headed browser test - actually displays window so we can see what renders
 */

const { createBrowser } = require('./dist/src/browser');
const http = require('http');

// Create a simple test server
const server = http.createServer((req, res) => {
  if (req.url === '/test-page') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`
const { vbox, label, button, separator } = tsyne;

browserContext.setPageTitle('Test Page');

vbox(() => {
  label('THIS IS THE TEST PAGE');
  label('');
  label('If you can see this, page rendering works!');
  separator();
  label('');
  button('Test Button', () => {
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
  const port = 38000 + Math.floor(Math.random() * 1000);

  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      console.log(`Test server listening on port ${port}`);
      resolve();
    });
  });

  console.log('Creating HEADED browser (window will be visible)...');
  const browser = await createBrowser(`http://localhost:${port}/test-page`, {
    title: 'Headed Test Browser',
    width: 800,
    height: 600
  });

  console.log('Browser created and page loaded');
  console.log('Window should be visible now');
  console.log('Look at the content area - do you see:');
  console.log('  1. "THIS IS THE TEST PAGE"');
  console.log('  2. "If you can see this, page rendering works!"');
  console.log('  3. A "Test Button"');
  console.log('OR do you see:');
  console.log('  1. "Tsyne Browser"');
  console.log('  2. "Enter a URL in the address bar and click Go to navigate."');
  console.log('');
  console.log('Press Ctrl+C when done observing...');

  await browser.run();
}

main().catch(console.error);
