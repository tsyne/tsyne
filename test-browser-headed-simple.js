/**
 * Test that EXACTLY mimics what Browser does
 * Create a Browser instance and navigate to a simple page
 */

const { Browser } = require('./dist/src/browser');
const http = require('http');

// Create simple test server
const server = http.createServer((req, res) => {
  console.log('Server request:', req.url);

  if (req.url === '/simple') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`
const { vbox, label, button } = tsyne;

browserContext.setPageTitle('Simple Test');

vbox(() => {
  label('=== TEST PAGE ===');
  label('');
  label('This is line 1');
  label('This is line 2');
  label('This is line 3');
  label('');
  button('Test Button', () => {
    console.log('Button clicked!');
  });
});
    `);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

async function main() {
  const port = 39123;

  await new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`Server listening on port ${port}`);
      resolve(null);
    });
  });

  console.log('\n=== Creating Browser in HEADED mode ===');
  console.log('testMode = false (so window will be visible)');
  console.log('');

  const browser = new Browser({
    title: 'Black Screen Test Browser',
    width: 800,
    height: 600,
    testMode: false  // HEADED mode
  });

  console.log('Browser created');
  console.log('LOOK: Window should be visible now');
  console.log('Is the content area BLACK? Or can you see placeholder?');
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('');
  console.log('Now navigating to /simple page...');
  await browser.changePage(`http://localhost:${port}/simple`);

  console.log('Navigation complete');
  console.log('LOOK: Content area should show:');
  console.log('  - "=== TEST PAGE ==="');
  console.log('  - "This is line 1/2/3"');
  console.log('  - A button');
  console.log('');
  console.log('What do you actually see?');
  console.log('  a) The test page content (correct!)');
  console.log('  b) Still showing placeholder text');
  console.log('  c) BLACK content area');
  console.log('  d) Something else');

  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('');
  console.log('Test complete - closing');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
