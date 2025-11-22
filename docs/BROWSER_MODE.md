# Tsyne Browser Mode

Tsyne includes a Swiby-inspired browser system that loads **Tsyne TypeScript pages** from web servers dynamically, similar to how Mosaic, Firefox, or Chrome load HTML pages. This enables server-side page generation from any language or framework (Spring, Sinatra, Flask, Express, etc.).

**Important:** Tsyne's page grammar is **TypeScript** (not JavaScript or HTML). Pages are TypeScript code that use the Tsyne API.

## Table of Contents

- [Why a Browser?](#why-a-browser)
- [Quick Start](#quick-start)
- [Creating a Server](#creating-a-server)
- [Page Format](#page-format)
- [Browser API](#browser-api)
- [BrowserContext](#browsercontext)
- [Navigation Flow](#navigation-flow)
- [HTTP Support](#http-support)
- [Page File Structure](#page-file-structure)
- [Server Implementations](#server-implementations)
- [Use Cases](#use-cases)
- [Comparison to Web Browsers](#comparison-to-web-browsers)
- [Examples](#examples)
- [Testing Browser Pages](#testing-browser-pages)

## Why a Browser?

Unlike HTML+JavaScript which mixes declarative markup with imperative scripts, Tsyne pages are seamless pseudo-declarative TypeScript. The browser:

- **Loads pages from HTTP/HTTPS servers** - Standard GET requests with 200, 302, 404 support
- **Provides navigation functions** - `back()`, `forward()`, `changePage(url)`
- **Server-agnostic** - Any language can serve Tsyne pages (Node.js, Java, Ruby, Python, Go)
- **Pseudo-declarative** - Pages are pure TypeScript using the Tsyne API

## Quick Start

### Run the browser

```bash
# With a URL parameter
npx tsyne-browser http://localhost:3000/

# Or any other URL serving Tsyne TypeScript pages
npx tsyne-browser https://example.com/tsyne/index
```

### Create a browser in code

```typescript
import { createBrowser } from 'tsyne';

async function main() {
  const browser = await createBrowser('http://localhost:3000/', {
    title: 'Tsyne Browser',
    width: 900,
    height: 700
  });

  await browser.run();
}

main();
```

## Creating a Server

### Node.js filesystem-based example

```javascript
const http = require('http');
const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, 'pages');

// Map URL to filesystem path (/ → pages/index.ts, /about → pages/about.ts)
function urlToFilePath(url) {
  const cleanUrl = url.split('?')[0].split('#')[0].replace(/^\//, '');
  const filePath = cleanUrl === '' ? 'index.ts' : cleanUrl + '.ts';
  return path.join(PAGES_DIR, filePath);
}

http.createServer((req, res) => {
  const filePath = urlToFilePath(req.url);

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/typescript' });
      res.end(fs.readFileSync(path.join(PAGES_DIR, '404.ts'), 'utf8'));
    } else {
      res.writeHead(200, { 'Content-Type': 'text/typescript' });
      res.end(data);
    }
  });
}).listen(3000);
```

### Example page (`pages/index.ts`)

```typescript
// Home Page - TypeScript content for Tsyne Browser
const { vbox, label, button } = tsyne;

vbox(() => {
  label('Welcome to Tsyne Browser!');
  label('');
  label('Current URL: ' + browserContext.currentUrl);
  label('');

  button('Go to About', () => {
    browserContext.changePage('/about');
  });
});
```

### Another page (`pages/about.ts`)

```typescript
// About Page
const { vbox, label, button, separator } = tsyne;

vbox(() => {
  label('About Tsyne Browser');
  separator();
  label('');
  label('Pages are TypeScript code served from the server.');
  label('');

  button('Back', () => {
    browserContext.back();
  });
});
```

## Page Format

**Tsyne pages are TypeScript code** (not HTML or JavaScript) that execute in the browser context. They receive two parameters:

1. **`browserContext`** - Navigation and browser functions
2. **`tsyne`** - All Tsyne API functions (window, vbox, label, button, etc.)

### Example page (`pages/contact.ts`)

```typescript
// Contact Page - TypeScript content for Tsyne Browser
const { vbox, hbox, label, button, entry } = tsyne;

let nameEntry;
let emailEntry;

vbox(() => {
  label('Contact Us');
  label('');

  label('Name:');
  nameEntry = entry('Your name');
  label('');

  label('Email:');
  emailEntry = entry('your@email.com');
  label('');

  hbox(() => {
    button('Submit', async () => {
      const name = await nameEntry.getText();
      const email = await emailEntry.getText();
      console.log('Submitted:', name, email);

      // Navigate to thank you page
      browserContext.changePage('/thanks');
    });

    button('Cancel', () => {
      browserContext.back();
    });
  });
});
```

## Browser API

### Browser Class

**Constructor:**
```typescript
new Browser(options?: {
  title?: string;
  width?: number;
  height?: number;
})
```

**Methods:**
- **`changePage(url: string): Promise<void>`** - Navigate to a URL and load the page
- **`back(): Promise<void>`** - Navigate back in history
- **`forward(): Promise<void>`** - Navigate forward in history
- **`reload(): Promise<void>`** - Reload current page
- **`stop(): void`** - Stop loading current page
- **`run(): Promise<void>`** - Start the browser application
- **`getApp(): App`** - Get the underlying App instance

**Browser Chrome:**
The browser window includes:
- **Address bar** - Entry widget showing current URL (editable)
- **← Back button** - Navigate to previous page in history
- **→ Forward button** - Navigate to next page in history
- **⟳ Reload button** - Refresh current page
- **✕ Stop button** - Cancel loading (visible only when loading)
- **Go button** - Navigate to URL in address bar
- **Loading indicator** - "Loading..." text (visible when loading)

**Menu Bar:**
Standard browser menus are provided:
- **File** - Close Window
- **View** - Reload, Stop, View Page Source
- **History** - Back, Forward (disabled when not available)
- **Help** - About Tsyne Browser
- **[Page Menus]** - Custom menus added by pages

**Factory Function:**
```typescript
createBrowser(
  initialUrl?: string,
  options?: {
    title?: string;
    width?: number;
    height?: number;
  }
): Promise<Browser>
```

## BrowserContext

Every loaded page receives a `browserContext` object with navigation functions:

```typescript
interface BrowserContext {
  back: () => Promise<void>;
  forward: () => Promise<void>;
  changePage: (url: string) => Promise<void>;
  reload: () => Promise<void>;
  stop: () => void;
  addPageMenu: (menuLabel: string, items: PageMenuItem[]) => void;
  currentUrl: string;
  isLoading: boolean;
  browser: Browser;
}
```

**Navigation functions:**
- `back()` - Navigate to previous page
- `forward()` - Navigate to next page
- `changePage(url)` - Navigate to a new URL
- `reload()` - Refresh current page
- `stop()` - Stop loading

**Page Menu API:**
Pages can add custom menus to the browser menu bar:

```typescript
browserContext.addPageMenu('Tools', [
  {
    label: 'Say Hello',
    onSelected: () => { console.log('Hello!'); }
  },
  {
    label: 'Disabled Item',
    onSelected: () => {},
    disabled: true
  },
  {
    label: 'Checked Item',
    checked: true,
    onSelected: () => {}
  }
]);
```

Custom menus appear in the menu bar and are removed when navigating away from the page.

Pages also receive a `tsyne` object with all Tsyne API functions.

## Navigation Flow

1. **Browser loads initial URL** via `createBrowser(url)`
2. **Server returns TypeScript code** for the page
3. **Browser executes code** with `browserContext` and `tsyne` parameters
4. **Page builds UI** using Tsyne API
5. **User clicks navigation** button calling `browserContext.changePage(url)`
6. **Process repeats** for new page

History is maintained automatically with back/forward support.

## HTTP Support

The browser supports standard HTTP features:

- **GET requests** - Only GET is used (pages are code, not data)
- **Status codes:**
  - `200` - Success, page is rendered
  - `301/302` - Redirects are followed automatically
  - `404` - Can serve custom 404 error pages
- **Content-Type** - Pages should be served as `text/typescript` or `text/plain`
- **Timeouts** - 10 second timeout for requests

## Page File Structure

Pages are stored as `.ts` files with URL mapping:

```
pages/
├── index.ts          # / → Home page
├── about.ts          # /about → About page
├── contact.ts        # /contact → Contact form
├── form.ts           # /form → Form demo
├── thanks.ts         # /thanks → Thank you page
└── 404.ts            # (not found) → Error page
```

For nested URLs, use directories:
```
pages/
├── products/
│   ├── index.ts      # /products → Products listing
│   └── detail.ts     # /products/detail → Product detail
└── admin/
    ├── index.ts      # /admin → Admin dashboard
    └── users.ts      # /admin/users → User management
```

## Server Implementations

Servers can be implemented in any language. The only requirement is to serve TypeScript code that uses the Tsyne API from `.ts` files.

### Node.js/Express

```javascript
app.get('/page', (req, res) => {
  res.type('text/typescript');
  res.send('const { vbox, label } = tsyne; ...');
});
```

### Python/Flask

```python
@app.route('/page')
def page():
    return '''
        const { vbox, label } = tsyne;
        // ... page code
    ''', 200, {'Content-Type': 'text/typescript'}
```

### Ruby/Sinatra

```ruby
get '/page' do
  content_type 'text/typescript'
  <<~TSYNE
    const { vbox, label } = tsyne;
    // ... page code
  TSYNE
end
```

### Java/Spring

```java
@GetMapping("/page")
public ResponseEntity<String> page() {
    return ResponseEntity.ok()
        .contentType(MediaType.valueOf("text/typescript"))
        .body("const { vbox, label } = tsyne; ...");
}
```

## Use Cases

- **Desktop applications with remote pages** - Centrally managed UI served to desktop browsers
- **Dynamic UIs** - Update pages server-side without redeploying desktop apps
- **Multi-language backends** - Use your preferred server language (Java, Ruby, Python, etc.)
- **Content management** - Serve different pages based on user permissions or data
- **Progressive enhancement** - Start with static pages, add server logic later

## Comparison to Web Browsers

| Feature | Web Browsers (HTML) | Tsyne Browser |
|---------|-------------------|--------------|
| **Content Format** | HTML + CSS + JS | **TypeScript** (Tsyne API) |
| **Declarative/Imperative** | Mixed (HTML declarative, JS imperative) | **Seamless pseudo-declarative TypeScript** |
| **Navigation** | `<a>` tags, `window.location` | `browserContext.changePage()` |
| **Back/Forward** | Browser built-in | `browserContext.back/forward()` |
| **Server Language** | Any (serves HTML) | Any (serves TypeScript) |
| **Rendering** | Browser engine (Blink, Gecko) | Tsyne/Fyne (native widgets) |
| **Platform** | Web | Desktop (macOS, Windows, Linux) |

## Examples

### Browser Application

- **`cli/tsynebrowser.ts`** - Tsyne Browser executable

### Sample Server

- **`examples/server.js`** - Filesystem-based Node.js HTTP server
  - Reads `.ts` files from `pages/` directory
  - Maps URLs to files (/ → index.ts, /about → about.ts)
  - Serves TypeScript code with proper Content-Type
  - Custom 404 handling with 404.ts

### Sample Pages

- **`examples/pages/index.ts`** - Home page with navigation
- **`examples/pages/about.ts`** - About page with information
- **`examples/pages/contact.ts`** - Contact form with input fields
- **`examples/pages/form.ts`** - Form demo with various widgets
- **`examples/pages/thanks.ts`** - Thank you confirmation page
- **`examples/pages/404.ts`** - Custom 404 error page

### Run the examples

```bash
npm run build

# Terminal 1: Start the sample server
node examples/server.js

# Terminal 2: Run Tsyne Browser with URL parameter
npx tsyne-browser http://localhost:3000/
```

The browser will connect to the specified URL and load the Tsyne TypeScript page. The browser window includes:
- **Address bar** - Shows current URL, type new URLs to navigate
- **Navigation buttons** - Back (←), Forward (→), Reload (⟳)
- **Content area** - Displays the loaded Tsyne page (scrollable)

Click navigation buttons or type URLs to explore different pages served by the server.

## Testing Browser Pages

For testing browser pages, Tsyne provides **TsyneBrowserTest** - a Playwright-inspired testing framework specifically designed for testing Tsyne Browser pages.

See **[BROWSER_TESTING.md](BROWSER_TESTING.md)** for complete documentation including:
- Automatic test server setup
- Playwright-style locators and actions
- Fluent-selenium style API (within, without, shouldBe, shouldContain)
- Integration with Jest, Mocha, Vitest
- Complete API reference

### Quick Example

```typescript
import { browserTest } from 'tsyne';

browserTest(
  'Test /home',
  [
    {
      path: '/',
      code: `
        const { vbox, label, button } = tsyne;
        vbox(() => {
          label('Home Page');
          button('Go to About', () => {
            browserContext.changePage('/about');
          });
        });
      `
    },
    {
      path: '/about',
      code: `
        const { vbox, label } = tsyne;
        vbox(() => {
          label('About Page');
        });
      `
    }
  ],
  async (bt) => {
    await bt.createBrowser('/');
    const ctx = bt.getContext();
    bt.assertUrl('/');

    // Find and click navigation button
    const aboutButton = await ctx.findWidget({ text: 'Go to About' });
    await ctx.clickWidget(aboutButton.id);

    // Verify navigation occurred
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/about');
  }
);
```

## See Also

- **[BROWSER_TESTING.md](BROWSER_TESTING.md)** - Complete browser testing documentation
- **[../README.md](../README.md)** - Main Tsyne documentation
- **[TESTING.md](TESTING.md)** - TsyneTest framework for non-browser apps
