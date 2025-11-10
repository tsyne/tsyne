/**
 * Tsyne Express Server - Dynamic server for Tsyne TypeScript pages
 *
 * This server demonstrates serving Tsyne pages with dynamic content
 * using Express.js. It supports:
 *   - Session state management
 *   - Dynamic page generation
 *   - Query parameters
 *   - POST-Redirect-GET pattern
 *
 * Usage:
 *   npm install express express-session
 *   node examples/server-express.js
 *
 * Then in another terminal:
 *   npx tsyne-browser http://localhost:3000/
 */

const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const PAGES_DIR = path.join(__dirname, 'pages');

// Session middleware
app.use(session({
  secret: 'tsyne-demo-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

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
 * Dynamic page: Session counter demo
 */
app.get('/session-demo', (req, res) => {
  // Initialize session counter
  if (!req.session.counter) {
    req.session.counter = 0;
  }

  // Increment on each visit
  req.session.counter++;

  const pageCode = `
// Session Demo Page - Demonstrates server-side state
// URL: http://localhost:3000/session-demo

const { vbox, label, button, separator } = tsyne;

vbox(() => {
  label('Session State Demo');
  label('This page demonstrates server-side session state');
  separator();
  label('');
  label('Session Counter: ${req.session.counter}');
  label('');
  label('This counter is stored on the server.');
  label('Each time you visit this page, it increments.');
  label('');
  label('Try these actions:');
  label('');

  button('Reload Page (Counter Increments)', () => {
    browserContext.reload();
  });

  button('Reset Counter', () => {
    browserContext.changePage('/session-reset');
  });

  button('Back to Home', () => {
    browserContext.changePage('/');
  });

  label('');
  separator();
  label('');
  label('How this works:');
  label('  1. Server maintains session data');
  label('  2. Each page visit increments counter');
  label('  3. Server generates page with current counter value');
  label('  4. Page displays dynamic content from server');
  label('');
  label('This is similar to:');
  label('  • PHP sessions');
  label('  • Express sessions');
  label('  • Ruby on Rails sessions');
  label('  • Java Servlets sessions');
});
  `;

  res.type('text/typescript');
  res.send(pageCode);
});

/**
 * Dynamic page: Reset session counter
 */
app.get('/session-reset', (req, res) => {
  req.session.counter = 0;

  const pageCode = `
const { vbox, label, button, separator } = tsyne;

vbox(() => {
  label('✓ Session Reset');
  separator();
  label('');
  label('The session counter has been reset to 0.');
  label('');

  button('Back to Session Demo', () => {
    browserContext.changePage('/session-demo');
  });

  button('Back to Home', () => {
    browserContext.changePage('/');
  });
});
  `;

  res.type('text/typescript');
  res.send(pageCode);
});

/**
 * Serve static pages from filesystem
 */
app.get('*', (req, res) => {
  const filePath = urlToFilePath(req.url);
  console.log(`  → ${path.relative(PAGES_DIR, filePath)}`);

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.log('  → File not found, serving 404');
      // Try to serve 404 page
      const notFoundPath = path.join(PAGES_DIR, '404.ts');
      fs.readFile(notFoundPath, 'utf8', (err404, data404) => {
        if (err404) {
          // Fallback 404
          res.status(404).type('text/typescript').send(`
const { vbox, label, button } = tsyne;

vbox(() => {
  label('404 - Page Not Found');
  label('');
  label('URL: ' + browserContext.currentUrl);
  label('');
  button('Home', () => browserContext.changePage('/'));
});
          `);
        } else {
          res.status(404).type('text/typescript').send(data404);
        }
      });
      return;
    }

    res.type('text/typescript');
    res.send(data);
  });
});

app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║                                                        ║');
  console.log('║   Tsyne Express Server - Dynamic TypeScript Pages     ║');
  console.log('║                                                        ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Pages directory: ${PAGES_DIR}`);
  console.log('');
  console.log('Available pages:');
  console.log('  http://localhost:3000/              → pages/index.ts');
  console.log('  http://localhost:3000/about         → pages/about.ts');
  console.log('  http://localhost:3000/contact       → pages/contact.ts');
  console.log('  http://localhost:3000/scrolling     → pages/scrolling.ts');
  console.log('  http://localhost:3000/images        → pages/images.ts');
  console.log('  http://localhost:3000/hyperlinks    → pages/hyperlinks.ts');
  console.log('  http://localhost:3000/text-features → pages/text-features.ts');
  console.log('  http://localhost:3000/table-demo    → pages/table-demo.ts');
  console.log('  http://localhost:3000/list-demo     → pages/list-demo.ts');
  console.log('  http://localhost:3000/dynamic-demo  → pages/dynamic-demo.ts');
  console.log('  http://localhost:3000/post-demo     → pages/post-demo.ts');
  console.log('  http://localhost:3000/session-demo  → Dynamic (server-generated)');
  console.log('');
  console.log('To browse these pages:');
  console.log('  npx tsyne-browser http://localhost:3000/');
  console.log('');
  console.log('Press Ctrl+C to stop the server');
  console.log('');
});
