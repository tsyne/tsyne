# Web Browser & HTML Features → Tsyne Feature Mapping

This document maps traditional web browser and HTML features to their Tsyne equivalents.

## Core HTML Elements

| HTML Feature | Tsyne Equivalent | Example | Page Demo |
|--------------|-----------------|---------|-----------|
| `<p>` Paragraph | `label()` | `label('This is a paragraph')` | `/text-features` |
| `<h1>` - `<h6>` Headings | `label()` with styling | `label('Heading')` | `/text-features` |
| `<a href>` Hyperlink | `hyperlink()` or `button()` + `changePage()` | `hyperlink('Click', 'url')` | `/hyperlinks` |
| `<img>` Image | `image(path, fillMode)` | `image('/path/img.png')` | `/images` |
| `<button>` Button | `button(text, onClick)` | `button('Click', () => {})` | `/` |
| `<input type="text">` | `entry(placeholder)` | `entry('Name')` | `/form` |
| `<input type="password">` | `passwordentry(placeholder)` | `passwordentry('Password')` | `/form` |
| `<textarea>` | `multilineentry(placeholder)` | `multilineentry('Comments')` | `/form` |
| `<input type="checkbox">` | `checkbox(text, onChange)` | `checkbox('Subscribe')` | `/form` |
| `<select>` Dropdown | `select(options, onSelected)` | `select(['A', 'B'])` | `/form` |
| `<input type="range">` Slider | `slider(min, max, initial)` | `slider(0, 100, 50)` | `/form` |
| `<input type="radio">` | `radiogroup(options)` | `radiogroup(['A', 'B'])` | `/form` |
| `<table>` Table | `table(headers, data)` | `table(['Name'], [['John']])` | `/table-demo` |
| `<ul>` / `<ol>` List | `list(items, onSelected)` | `list(['Item 1', 'Item 2'])` | `/list-demo` |
| `<hr>` Separator | `separator()` | `separator()` | `/text-features` |
| `<div>` Container | `vbox()` or `hbox()` | `vbox(() => { ... })` | All pages |
| `<form>` Form | `form(items, onSubmit)` | `form([...], () => {})` | `/form-advanced` |

## Layout & Structure

| HTML/CSS Feature | Tsyne Equivalent | Example |
|-----------------|-----------------|---------|
| Vertical layout (`<div>` stacked) | `vbox(() => { ... })` | Container for vertical content |
| Horizontal layout (flexbox row) | `hbox(() => { ... })` | Container for horizontal content |
| Grid layout | `grid(columns, () => {})` | Multi-column grid |
| Grid wrap (flexbox wrap) | `gridwrap(width, height, () => {})` | Auto-wrapping grid |
| Centered content | `center(() => { ... })` | Centered container |
| Split panes | `hsplit()` / `vsplit()` | Resizable split view |
| Tabbed interface | `tabs([{title, builder}])` | Tab navigation |
| Scrollable content | `scroll(() => { ... })` | Scrollable container |
| Border layout | `border({top, bottom, left, right, center})` | Edge + center layout |

## Browser Navigation Features

| Browser Feature | Tsyne Browser Equivalent | API |
|----------------|-------------------------|-----|
| Address bar | Built-in address bar | Shows `currentUrl` |
| Navigate to URL | Type URL + Go button | `browserContext.changePage(url)` |
| Back button | ← Back button | `browserContext.back()` |
| Forward button | → Forward button | `browserContext.forward()` |
| Reload button | ⟳ Reload button | `browserContext.reload()` |
| Stop button | ✕ Stop button | `browserContext.stop()` |
| Hyperlinks | `button()` or `hyperlink()` | Click triggers `changePage()` |
| History stack | Automatic | Managed by browser |
| Current URL | `browserContext.currentUrl` | Read-only property |

## HTTP & Server Features

| HTTP Feature | Tsyne Browser Support | Implementation |
|-------------|----------------------|----------------|
| GET requests | ✅ Full support | `browserContext.changePage('/path')` |
| POST requests | ⚠️ Via server simulation | Form submits to server endpoint |
| POST-Redirect-GET | ✅ Supported | Server returns redirect or success page |
| 200 OK | ✅ Supported | Page loads normally |
| 301/302 Redirect | ✅ Supported | Browser follows redirects |
| 404 Not Found | ✅ Supported | Custom 404 page |
| Query parameters | ✅ Supported | `changePage('/page?id=123')` |
| URL hash/anchors | ⚠️ Limited | URLs can have `#` but no scrolling to anchor |

## Dynamic Features (AJAX / Web 2.0)

| Web Feature | Tsyne Equivalent | How It Works |
|-------------|-----------------|--------------|
| AJAX request | Server-side state + reload | Server maintains state, page reloads |
| Dynamic content update | `widget.setText()` | Update widget content without reload |
| Form submission | `changePage()` after submit | Navigate to result page |
| Live search | Entry + button + state | Filter/search updates on action |
| Auto-refresh | Timer + `reload()` | Periodic page refresh |
| Progressive loading | Multiple page loads | Load data incrementally |
| Client-side state | JavaScript variables | Variables within page scope |
| Server-side state | Session/database | Express server with sessions |

## Advanced UI Features

| Feature | Tsyne Equivalent | Notes |
|---------|-----------------|-------|
| Context menus (right-click) | `widget.setContextMenu([...])` | Right-click menus |
| Menu bar | `window.setMainMenu([...])` | Application menus |
| Toolbar | `toolbar([...])` | Action buttons |
| Dialog boxes | `window.showInfo()`, `showError()`, `showConfirm()` | Modal dialogs |
| File dialogs | `window.showFileOpen()`, `showFileSave()` | Native file pickers |
| Tooltips | Not yet implemented | Future feature |
| Drag & drop | Not yet implemented | Future feature |

## Styling & Theming

| CSS Feature | Tsyne Equivalent | How It Works |
|------------|-----------------|--------------|
| Stylesheets | `styles({ ... })` | Swiby-inspired styling |
| Font family | `font_family: FontFamily.SANS_SERIF` | Global or per-widget |
| Font size | `font_size: 12` | Points |
| Font weight | `font_weight: 'bold'` | Normal or bold |
| Font style | `font_style: FontStyle.ITALIC` | Normal, italic, bold |
| Color | `color: 0xRRGGBB` | Limited support |
| Dark mode | `setTheme('dark')` | Light/dark themes |

## Page Lifecycle

| Web Lifecycle | Tsyne Browser Lifecycle |
|--------------|------------------------|
| Page load | Server sends TypeScript → Browser executes code |
| DOM ready | Code executes immediately in page scope |
| User interaction | Event handlers (`onClick`, `onChange`, etc.) |
| Form submit | `changePage()` or server POST endpoint |
| Page unload | Navigate away → New page loads |
| Browser refresh | `reload()` → Re-fetch and re-execute page code |

## Data Flow Patterns

### Pattern 1: Static Pages (Like HTML)
```typescript
// Static content, no server state
const { vbox, label } = tsyne;
vbox(() => {
  label('Static content');
});
```

### Pattern 2: Navigation (Like Hyperlinks)
```typescript
// Link to another page
button('Next Page', () => {
  browserContext.changePage('/next');
});
```

### Pattern 3: Form Submission (Like POST-Redirect-GET)
```typescript
// Collect data → Submit to server → Redirect to success page
button('Submit', async () => {
  const data = await entry.getText();
  // Server processes data
  browserContext.changePage('/success');
});
```

### Pattern 4: Dynamic Updates (Like AJAX)
```typescript
// Update page content without navigation
let countLabel;
let count = 0;

vbox(() => {
  countLabel = label('Count: 0');
  button('+', () => {
    count++;
    countLabel.setText(`Count: ${count}`);
  });
});
```

### Pattern 5: Server-Side State (Like Sessions)
```typescript
// Server maintains state between requests
// Page 1: Submit data
browserContext.changePage('/submit?name=John');

// Page 2: Server remembers 'name' from session
// Server includes name in page response
label('Welcome, ' + userName); // userName from server
```

## Feature Demonstrations

Test pages demonstrating each feature:

- `/text-features` - Paragraphs, headings, separators, rich text
- `/hyperlinks` - Hyperlinks, navigation buttons, external links
- `/images` - Image display, different fill modes
- `/scrolling` - Long content with scrolling
- `/form` - Form inputs (text, password, checkbox, select, slider)
- `/form-advanced` - Form widget with submit/cancel
- `/table-demo` - Data tables
- `/list-demo` - Scrollable lists
- `/post-demo` - POST-Redirect-GET pattern
- `/dynamic-demo` - Dynamic content updates (AJAX-like)
- `/ajax-demo` - Live updates without page reload
- `/session-demo` - Server-side session state

## Key Differences from Web

| Web | Tsyne Browser |
|-----|--------------|
| HTML markup | TypeScript code |
| CSS styling | TypeScript styling API |
| JavaScript for logic | TypeScript for logic (same) |
| Browser renders HTML | Fyne renders native widgets |
| HTTP for pages | HTTP for TypeScript code |
| DOM manipulation | Widget method calls |
| Network requests (fetch) | Page navigation or server state |
| Web APIs (localStorage, etc.) | Not available (desktop app) |

## Advantages of Tsyne Browser

1. **Native widgets** - Real desktop UI, not web rendering
2. **Type-safe** - Full TypeScript with IDE support
3. **Server flexibility** - Any language can serve pages
4. **Seamless TypeScript** - No HTML/CSS/JS context switching
5. **Desktop integration** - File dialogs, native menus
6. **Cross-platform** - macOS, Windows, Linux from same code

## Example: Web vs Tsyne

### Traditional Web Page
```html
<!DOCTYPE html>
<html>
<head><title>Counter</title></head>
<body>
  <h1>Counter</h1>
  <p id="display">Count: 0</p>
  <button onclick="increment()">+</button>
  <script>
    let count = 0;
    function increment() {
      count++;
      document.getElementById('display').textContent = `Count: ${count}`;
    }
  </script>
</body>
</html>
```

### Tsyne Page
```typescript
const { vbox, label, button } = tsyne;

let countLabel;
let count = 0;

vbox(() => {
  label('Counter');
  countLabel = label('Count: 0');
  button('+', () => {
    count++;
    countLabel.setText(`Count: ${count}`);
  });
});
```

**Differences:**
- No HTML markup - pure TypeScript
- No CSS - styling via TypeScript API
- No DOM - direct widget manipulation
- Same logic - TypeScript in both cases
- Native UI - real desktop widgets, not browser rendering
