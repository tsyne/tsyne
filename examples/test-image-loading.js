/**
 * Debug script to test image loading outside of test framework
 * Run with: npm run build && node examples/test-image-loading.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('=== Testing Image Loading Debug ===\n');

// Start a simple test server
const server = http.createServer((req, res) => {
  const url = req.url || '/';
  console.log(`[Server] Request: ${req.method} ${url}`);

  // Serve /images page
  if (url === '/images') {
    const pageCode = fs.readFileSync(path.join(__dirname, 'pages/images.ts'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/typescript' });
    res.end(pageCode);
    console.log(`[Server] Served /images page (${pageCode.length} bytes)`);
    return;
  }

  // Serve static files
  if (url.startsWith('/assets/')) {
    const filePath = path.join(__dirname, url);
    console.log(`[Server] Looking for file: ${filePath}`);

    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      const ext = path.extname(filePath);
      const contentType = ext === '.svg' ? 'image/svg+xml' : 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
      console.log(`[Server] Served ${url} (${content.length} bytes, ${contentType})`);
      return;
    } else {
      console.log(`[Server] File not found: ${filePath}`);
      res.writeHead(404);
      res.end('Not found');
      return;
    }
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(0, async () => {
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  console.log(`\n[Test] Server started on ${baseUrl}`);
  console.log(`[Test] Testing URL resolution and fetching...\n`);

  // Test 1: Fetch the /images page
  console.log('--- Test 1: Fetch /images page ---');
  try {
    const pageUrl = `${baseUrl}/images`;
    console.log(`[Test] Fetching: ${pageUrl}`);

    const pageResponse = await fetch(pageUrl);
    const pageCode = await pageResponse.text();
    console.log(`[Test] ✓ Got page code (${pageCode.length} bytes)`);
  } catch (error) {
    console.error(`[Test] ✗ Failed to fetch page:`, error.message);
  }

  // Test 2: Fetch the image asset
  console.log('\n--- Test 2: Fetch image asset ---');
  try {
    const imageUrl = `${baseUrl}/assets/test-image.svg`;
    console.log(`[Test] Fetching: ${imageUrl}`);

    const imageResponse = await fetch(imageUrl);
    const imageData = await imageResponse.text();
    console.log(`[Test] ✓ Got image data (${imageData.length} bytes)`);
    console.log(`[Test] Content-Type: ${imageResponse.headers.get('content-type')}`);
  } catch (error) {
    console.error(`[Test] ✗ Failed to fetch image:`, error.message);
  }

  // Test 3: Test ResourceFetcher
  console.log('\n--- Test 3: Test ResourceFetcher ---');
  try {
    const { ResourceFetcher } = require('../dist/src/resource-fetcher');
    const fetcher = new ResourceFetcher();

    console.log(`[Test] Using ResourceFetcher to fetch /assets/test-image.svg`);
    console.log(`[Test] Base URL: ${baseUrl}/images`);

    const localPath = await fetcher.fetchResource('/assets/test-image.svg', `${baseUrl}/images`);
    console.log(`[Test] ✓ ResourceFetcher succeeded!`);
    console.log(`[Test] Local path: ${localPath}`);

    // Check if file exists
    if (fs.existsSync(localPath)) {
      const size = fs.statSync(localPath).size;
      console.log(`[Test] ✓ Cached file exists (${size} bytes)`);
    } else {
      console.log(`[Test] ✗ Cached file does not exist!`);
    }
  } catch (error) {
    console.error(`[Test] ✗ ResourceFetcher failed:`, error.message);
    console.error(error.stack);
  }

  console.log('\n=== Test Complete ===');
  server.close();
  process.exit(0);
});

// Add fetch polyfill for Node.js < 18
async function fetch(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode === 200,
          status: res.statusCode,
          text: async () => data,
          headers: {
            get: (name) => res.headers[name.toLowerCase()]
          }
        });
      });
    }).on('error', reject);
  });
}
