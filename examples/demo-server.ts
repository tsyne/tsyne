/**
 * Demo Server - Simple HTTP server for manually testing Tsyne Browser
 *
 * Run: npm run build && npx tsx examples/demo-server.ts
 */

import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 3000;

// Define the pages
const pages: { [key: string]: string } = {
  '/': `
const { vbox, label, button, hyperlink } = tsyne;
vbox(() => {
  label('🏠 Welcome to Tsyne Browser Demo');
  label('');
  label('This is a demo server with several test pages.');
  label('');

  button('Go to Counter Demo').onClick(() => {
    browserContext.changePage('/counter');
  });

  button('Go to Form Demo').onClick(() => {
    browserContext.changePage('/form');
  });

  button('Go to Navigation Demo').onClick(() => {
    browserContext.changePage('/nav');
  });

  label('');
  label('Current URL: ' + browserContext.currentUrl);
});
  `,

  '/counter': `
const { vbox, label, button, hbox } = tsyne;

let count = 0;
let countLabel;

vbox(() => {
  label('🔢 Counter Demo');
  label('');

  hbox(() => {
    button('-').onClick(() => {
      count--;
      countLabel.setText('Count: ' + count);
    });

    countLabel = label('Count: 0');

    button('+').onClick(() => {
      count++;
      countLabel.setText('Count: ' + count);
    });
  });

  label('');
  button('← Back to Home').onClick(() => {
    browserContext.changePage('/');
  });
});
  `,

  '/form': `
const { vbox, label, entry, button } = tsyne;

let nameEntry;
let emailEntry;
let resultLabel;

vbox(() => {
  label('📝 Form Demo');
  label('');

  label('Name:');
  nameEntry = entry('Enter your name');

  label('');
  label('Email:');
  emailEntry = entry('Enter your email');

  label('');
  button('Submit').onClick(async () => {
    const name = await nameEntry.getText();
    const email = await emailEntry.getText();
    resultLabel.setText('Submitted: ' + name + ' (' + email + ')');
  });

  label('');
  resultLabel = label('');

  label('');
  button('← Back to Home').onClick(() => {
    browserContext.changePage('/');
  });
});
  `,

  '/nav': `
const { vbox, label, button, hbox } = tsyne;

vbox(() => {
  label('🧭 Navigation Demo');
  label('');
  label('This page demonstrates browser navigation.');
  label('');

  button('Go to Page 2').onClick(() => {
    browserContext.changePage('/nav2');
  });

  label('');
  label('Try using the browser back/forward buttons!');
  label('');

  button('← Back to Home').onClick(() => {
    browserContext.changePage('/');
  });
});
  `,

  '/nav2': `
const { vbox, label, button } = tsyne;

vbox(() => {
  label('🧭 Navigation Demo - Page 2');
  label('');
  label('You made it to page 2!');
  label('');

  button('Go to Page 3').onClick(() => {
    browserContext.changePage('/nav3');
  });

  label('');
  button('← Back to Nav Home').onClick(() => {
    browserContext.changePage('/nav');
  });

  label('');
  button('← Back to Main Home').onClick(() => {
    browserContext.changePage('/');
  });
});
  `,

  '/nav3': `
const { vbox, label, button } = tsyne;

vbox(() => {
  label('🧭 Navigation Demo - Page 3');
  label('');
  label('Final page! Use browser back/forward buttons.');
  label('');

  button('← Back to Page 2').onClick(() => {
    browserContext.changePage('/nav2');
  });

  label('');
  button('← Back to Main Home').onClick(() => {
    browserContext.changePage('/');
  });
});
  `
};

// Create HTTP server
const server = http.createServer((req, res) => {
  const url = req.url || '/';
// console.log(`[${new Date().toISOString()}] ${req.method} ${url}`);

  // Serve static assets from /assets/ directory
  if (url.startsWith('/assets/')) {
    const assetPath = path.join(__dirname, url);

    // Check if file exists
    if (fs.existsSync(assetPath)) {
      const ext = path.extname(assetPath).toLowerCase();
      const contentTypes: { [key: string]: string } = {
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp'
      };

      const contentType = contentTypes[ext] || 'application/octet-stream';

      fs.readFile(assetPath, (err, data) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error reading asset file');
          return;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Asset not found');
      return;
    }
  }

  // Serve page code
  const pageCode = pages[url];

  if (pageCode) {
    res.writeHead(200, { 'Content-Type': 'text/typescript' });
    res.end(pageCode);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/typescript' });
    res.end(`
const { vbox, label, button } = tsyne;
vbox(() => {
  label('404 - Page Not Found');
  label('');
  label('URL: ' + browserContext.currentUrl);
  label('');
  button('← Back to Home').onClick(() => {
    browserContext.changePage('/');
  });
});
    `);
  }
});

server.listen(PORT, () => {
// console.log(`
╔════════════════════════════════════════════════════════════╗
║  Tsyne Browser Demo Server                                  ║
╚════════════════════════════════════════════════════════════╝

Server running at: http://localhost:${PORT}

To browse:
  1. Open another terminal
  2. Run: npm run build && npx tsx examples/run-browser.ts

The browser will start and you can type the URL in the address bar.

Available pages:
  • http://localhost:${PORT}/         - Home page
  • http://localhost:${PORT}/counter  - Counter demo
  • http://localhost:${PORT}/form     - Form demo
  • http://localhost:${PORT}/nav      - Navigation demo

Press Ctrl+C to stop the server.
  `);
});
