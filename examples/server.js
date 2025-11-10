/**
 * Tsyne Page Server - Filesystem-based server for Tsyne TypeScript pages
 *
 * This server demonstrates serving Tsyne pages from .ts files on the filesystem.
 * Pages are TypeScript code that use the Tsyne API to build UI content.
 *
 * URL Mapping:
 *   /           → pages/index.ts
 *   /about      → pages/about.ts
 *   /contact    → pages/contact.ts
 *   /foo        → pages/foo.ts
 *   /foo/bar    → pages/foo/bar.ts (or pages/foo/bar/index.ts)
 *   (not found) → pages/404.ts
 *
 * Usage:
 *   node examples/server.js
 *
 * Then in another terminal:
 *   npx tsyne-browser http://localhost:3000/
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PAGES_DIR = path.join(__dirname, 'pages');

/**
 * Map URL to filesystem path
 */
function urlToFilePath(url) {
  // Remove query string and hash
  const cleanUrl = url.split('?')[0].split('#')[0];

  // Remove leading slash
  let filePath = cleanUrl.replace(/^\//, '');

  // Default to index.ts for root
  if (filePath === '') {
    filePath = 'index.ts';
  } else if (!filePath.endsWith('.ts')) {
    // Try exact match first (e.g., /about → about.ts)
    const exactMatch = filePath + '.ts';
    const exactPath = path.join(PAGES_DIR, exactMatch);

    if (fs.existsSync(exactPath)) {
      return exactPath;
    }

    // Try directory index (e.g., /foo → foo/index.ts)
    const indexMatch = path.join(filePath, 'index.ts');
    const indexPath = path.join(PAGES_DIR, indexMatch);

    if (fs.existsSync(indexPath)) {
      return indexPath;
    }

    // Default to .ts extension
    filePath = exactMatch;
  }

  return path.join(PAGES_DIR, filePath);
}

/**
 * Serve a Tsyne page
 */
function servePage(filePath, res) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', filePath, err);
      serve404(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/typescript',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}

/**
 * Serve 404 error page
 */
function serve404(res) {
  const notFoundPath = path.join(PAGES_DIR, '404.ts');

  fs.readFile(notFoundPath, 'utf8', (err, data) => {
    if (err) {
      // Fallback if 404.ts doesn't exist
      res.writeHead(404, { 'Content-Type': 'text/typescript' });
      res.end(`
const { vbox, label, button } = tsyne;

vbox(() => {
  label('404 - Page Not Found');
  label('');
  label('URL: ' + browserContext.currentUrl);
  label('');
  button('Home', () => browserContext.changePage('/'));
});
      `);
      return;
    }

    res.writeHead(404, {
      'Content-Type': 'text/typescript',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}

/**
 * Create and start HTTP server
 */
const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // Only handle GET requests
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Allow': 'GET' });
    res.end('Method Not Allowed');
    return;
  }

  // Map URL to file path
  const filePath = urlToFilePath(req.url);
  console.log(`  → ${path.relative(PAGES_DIR, filePath)}`);

  // Check if file exists
  fs.access(filePath, fs.constants.R_OK, (err) => {
    if (err) {
      console.log('  → File not found, serving 404');
      serve404(res);
      return;
    }

    // Serve the page
    servePage(filePath, res);
  });
});

server.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║                                                        ║');
  console.log('║         Tsyne Page Server - Serving TypeScript Pages   ║');
  console.log('║                                                        ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Pages directory: ${PAGES_DIR}`);
  console.log('');
  console.log('Available pages:');
  console.log('  http://localhost:3000/         → pages/index.ts');
  console.log('  http://localhost:3000/about    → pages/about.ts');
  console.log('  http://localhost:3000/contact  → pages/contact.ts');
  console.log('  http://localhost:3000/form     → pages/form.ts');
  console.log('  http://localhost:3000/thanks   → pages/thanks.ts');
  console.log('');
  console.log('To browse these pages:');
  console.log('  npx tsyne-browser http://localhost:3000/');
  console.log('');
  console.log('Press Ctrl+C to stop the server');
  console.log('');
});
