# Tsyne Browser - TODO and Future Enhancements

This document catalogs potential improvements to the Tsyne Browser system, inspired by 25+ years of web browser evolution from Web 1.0 through Web 2.0 and beyond.

## Critical Issues - ALL RESOLVED ✅

### ✅ Window Management - FIXED
**Was**: Each page created a new window instead of rendering into the existing browser window.

**Fixed**:
- Browser creates ONE persistent window at startup
- Pages render INTO the browser window (like web browsers)
- Window size is controlled by user (900x700 default), not by individual pages
- Pages define content only, not windows
- No more `tsyne.window()` calls in pages - just content builders

---

## Web 1.0 Fundamentals (1990s-2000s)

### Navigation and Address Bar

- [x] **Address bar widget** - Display current URL in the browser window
- [x] **Editable address bar** - Allow typing URLs to navigate
- [ ] **URL validation** - Check URL format before navigation
- [x] **Protocol support** - http://, https:// (file:// and custom protocols TODO)
- [x] **Back button UI** - Visual button in browser chrome (←)
- [x] **Forward button UI** - Visual button in browser chrome (→)
- [x] **Stop button** - Cancel page loading in progress (✕, visible when loading)
- [x] **Reload/Refresh button** - Re-fetch current page (⟳)
- [ ] **Home button** - Navigate to configured home page

### History and Bookmarks

- [ ] **History persistence** - Save history across browser sessions
- [ ] **History UI** - View browsing history with dates/times
- [ ] **Clear history** - Delete browsing history
- [ ] **Bookmarks/Favorites** - Save frequently visited URLs
- [ ] **Bookmark management** - Add, edit, delete, organize bookmarks
- [ ] **Bookmark UI** - Sidebar or menu for bookmarks
- [ ] **Bookmark import/export** - Share bookmarks across browsers

### Window and View

- [ ] **Status bar** - Show loading status, URL hover info
- [x] **Progress indicator** - Visual feedback during page load (text-based "Loading...")
- [ ] **Loading spinner** - Animated indicator for async operations
- [ ] **Title bar updates** - Show page title in window title
- [ ] **Favicon support** - (if pages could specify icons)
- [x] **View source** - Display raw page TypeScript code (View menu → View Page Source)
- [ ] **Page info dialog** - Show URL, load time, size, etc.
- [ ] **Find in page** - Search for text in current page
- [ ] **Print page** - (complex - would need page rendering)
- [ ] **Zoom controls** - Increase/decrease text/widget size
- [ ] **Full-screen mode** - Toggle fullscreen display

### Navigation Behavior

- [x] **Link following** - Click hyperlinks to navigate (hyperlink widget available)
- [ ] **External links** - Handle links to external websites
- [ ] **Middle-click = new tab** - (when tabs are implemented)
- [ ] **Ctrl+Click = new tab** - Keyboard modifiers for navigation
- [x] **Right-click context menu** - widget.setContextMenu() on all widgets
- [ ] **Keyboard shortcuts** - Ctrl+R (reload), Alt+Left (back), etc.
- [ ] **Mouse gestures** - Optional navigation via mouse movement

### Loading and Caching

- [ ] **Page caching** - Cache fetched pages to avoid re-downloading
- [ ] **Cache control** - Respect cache headers (if servers send them)
- [ ] **Cache expiration** - Time-based or size-based cache eviction
- [ ] **Force reload** - Bypass cache (Ctrl+Shift+R)
- [ ] **Offline mode** - View cached pages when offline
- [ ] **Resource loading** - If pages reference images/data separately
- [ ] **Lazy loading** - Load resources on demand
- [ ] **Preloading** - Fetch likely next pages in background
- [ ] **Connection pooling** - Reuse HTTP connections

### Forms and Data

- [ ] **POST requests** - Support HTTP POST for form submissions
- [ ] **Form data encoding** - application/x-www-form-urlencoded
- [ ] **Multipart forms** - File uploads (if supported)
- [ ] **Form validation** - Client-side validation before submit
- [ ] **Form autofill** - Save and restore form data
- [ ] **Password manager** - Save/fill passwords (security concern!)
- [ ] **Cookies** - Store server-sent cookies, send with requests
- [ ] **Cookie management UI** - View, delete cookies
- [ ] **Session persistence** - Maintain session across restarts

### Security

- [ ] **HTTPS validation** - Check SSL certificates
- [ ] **Certificate warnings** - Warn on invalid certificates
- [ ] **Security indicators** - Lock icon for HTTPS
- [ ] **Mixed content warnings** - HTTP resources on HTTPS pages
- [ ] **Pop-up blocker** - Block unwanted new windows
- [ ] **Download safety** - Warn about executable downloads
- [ ] **Phishing detection** - Basic URL pattern matching
- [ ] **Content Security Policy** - Limit what pages can execute
- [ ] **Same-origin policy** - Prevent cross-origin data access

### User Experience

- [ ] **Keyboard navigation** - Tab through focusable elements
- [ ] **Focus indicators** - Show which element has focus
- [ ] **Accessibility** - Screen reader support, high contrast
- [ ] **Text selection** - Select and copy text from pages
- [ ] **Clipboard operations** - Copy, paste, cut
- [ ] **Drag and drop** - (if Fyne supports it)
- [ ] **Smooth scrolling** - Animated scroll transitions
- [ ] **Scroll position restoration** - Remember scroll on back/forward
- [ ] **Auto-scroll** - Middle-click drag to scroll (optional)

---

## Web 2.0 and Modern Features (2000s-present)

### Tabbed Browsing

- [ ] **Multiple tabs** - Multiple pages in one window
- [ ] **Tab bar UI** - Visual tab strip at top
- [ ] **Tab creation** - Ctrl+T, middle-click link, etc.
- [ ] **Tab closing** - Ctrl+W, close button on tabs
- [ ] **Tab switching** - Ctrl+Tab, Ctrl+1-9
- [ ] **Tab reordering** - Drag tabs to reorder
- [ ] **Tab pinning** - Keep important tabs open
- [ ] **Tab groups** - Organize tabs into groups
- [ ] **Tab session restore** - Restore tabs on crash/restart
- [ ] **Recently closed tabs** - Undo close tab

### Dynamic Content

- [ ] **AJAX-style updates** - Partial page updates without full reload
- [ ] **Server push** - WebSocket-like real-time updates
- [ ] **Polling** - Periodic page refresh/update
- [ ] **Event system** - Pages can emit/listen to events
- [ ] **State preservation** - Keep widget state during updates
- [ ] **Transition animations** - Smooth page/content transitions
- [ ] **Loading states** - Show loading indicators during updates
- [ ] **Error recovery** - Graceful handling of failed updates

### Developer Tools

- [ ] **Developer console** - View logs, errors, warnings
- [ ] **Network inspector** - View HTTP requests/responses
- [ ] **Widget inspector** - Inspect widget tree (like DOM inspector)
- [ ] **Performance profiler** - Measure page load times
- [ ] **Memory profiler** - Track memory usage
- [ ] **JavaScript console** - REPL for running code (if relevant)
- [ ] **Breakpoints** - Debug page code
- [ ] **Network throttling** - Simulate slow connections
- [ ] **Device emulation** - Test different window sizes

### Storage and State

- [ ] **Local storage** - Persistent key-value storage per origin
- [ ] **Session storage** - Temporary storage for current session
- [ ] **IndexedDB-style** - Structured data storage
- [ ] **Storage quotas** - Limit storage per origin
- [ ] **Storage UI** - View/delete stored data
- [ ] **Import/export** - Backup/restore application data
- [ ] **Offline support** - Service worker-like offline pages
- [ ] **Background sync** - Sync data when connection restored

### Advanced Navigation

- [ ] **Search integration** - Search from address bar
- [ ] **Search suggestions** - Auto-complete search queries
- [ ] **Search engines** - Configure default search engine
- [ ] **URL suggestions** - Auto-complete from history/bookmarks
- [ ] **Smart address bar** - Detect URLs vs. search queries
- [ ] **QR code support** - Scan QR codes to navigate
- [ ] **Deep linking** - Support app-specific URL schemes

### Performance

- [ ] **Rendering optimization** - Efficient widget tree updates
- [ ] **Virtual scrolling** - For long lists/tables
- [ ] **Code splitting** - Load page code incrementally
- [ ] **Compression** - gzip/brotli for page code transfer
- [ ] **Resource hints** - Prefetch, preconnect, dns-prefetch
- [ ] **Request prioritization** - Critical resources first
- [ ] **Memory limits** - Kill tabs using too much memory
- [ ] **Battery awareness** - Reduce activity on battery power

### Customization

- [ ] **Extensions/Plugins** - User-installed browser extensions
- [ ] **Themes** - Customize browser appearance (already have theme support)
- [ ] **User scripts** - Run custom code on pages
- [ ] **User styles** - Override page styles (already have styling system)
- [ ] **Settings UI** - Configure browser behavior
- [ ] **Profiles** - Multiple user profiles with separate data
- [ ] **Sync** - Sync bookmarks/history across devices

### Media and Files

- [ ] **Image loading** - Fetch and display images (already have image widget)
- [ ] **Image caching** - Cache images locally
- [ ] **Video playback** - Embedded video (if Fyne supports)
- [ ] **Audio playback** - Embedded audio
- [ ] **File downloads** - Save files from server
- [ ] **Download manager** - View/manage downloads
- [ ] **Upload support** - Send files to server (POST multipart)
- [ ] **Drag-drop upload** - Drag files to upload

### Responsive Design

- [ ] **Window resize handling** - Pages adapt to window size
- [ ] **Responsive layouts** - Different layouts for different sizes
- [ ] **Mobile viewport** - Simulate mobile device sizes
- [ ] **Orientation changes** - Handle portrait/landscape
- [ ] **DPI scaling** - Support high-DPI displays
- [ ] **Touch input** - Support touch gestures (if platform supports)

### Internationalization

- [ ] **Unicode support** - Display international characters
- [ ] **RTL text** - Right-to-left languages (Arabic, Hebrew)
- [ ] **Character encoding** - Support multiple encodings
- [ ] **Language detection** - Auto-detect page language
- [ ] **Translation** - Built-in page translation (advanced)
- [ ] **Locale settings** - Date/time/number formatting

---

## Tsyne-Specific Considerations

### Page Format Evolution

- [ ] **Page metadata** - Title, description, keywords in page code
- [ ] **Page configuration** - Declare required window size, orientation
- [ ] **Component libraries** - Shared widgets across pages
- [ ] **Page templates** - Reusable page structures
- [ ] **Layout systems** - Grid, flexbox-like layouts for pages
- [ ] **Routing** - Client-side routing without server requests
- [ ] **Page lifecycle** - onLoad, onUnload, onResize events

### Server Protocol

- [ ] **Content negotiation** - Request specific page formats
- [ ] **Conditional requests** - If-Modified-Since, ETags
- [ ] **Range requests** - Partial content downloads
- [ ] **Streaming** - Stream page code for large pages
- [ ] **Server-sent events** - Push updates from server
- [ ] **WebSocket protocol** - Bi-directional communication
- [ ] **API versioning** - Support multiple protocol versions

### TypeScript Integration

- [ ] **TypeScript compilation** - Compile .ts to .js on server
- [ ] **Type checking** - Validate page code before execution
- [ ] **Intellisense** - Code completion in address bar (advanced!)
- [ ] **Source maps** - Debug original TypeScript, not compiled
- [ ] **Module system** - Import/export between page modules
- [ ] **NPM packages** - Use npm packages in pages (bundling?)
- [ ] **Polyfills** - Support older Tsyne API versions

### Security Model

- [ ] **Sandboxing** - Isolate page code from browser code
- [ ] **Permissions** - Pages request permissions (file access, etc.)
- [ ] **Origin isolation** - Separate storage/state per origin
- [ ] **Code signing** - Verify page code signatures
- [ ] **Content filtering** - Block malicious code patterns
- [ ] **Safe mode** - Disable extensions/scripts for debugging

### Testing and Quality

- [ ] **Browser testing mode** - Headless browser for tests
- [ ] **Page validation** - Lint/validate page code
- [ ] **Performance testing** - Benchmark page load times
- [ ] **Accessibility testing** - Automated a11y checks
- [ ] **Visual regression** - Screenshot comparison tests
- [ ] **Fuzz testing** - Test with malformed inputs

---

## Architecture Improvements

### Current Issues

```typescript
// PROBLEM: Each page creates a new window
tsyne.window({ title: 'Page Title' }, (win) => {
  // This creates a NEW window, doesn't reuse browser window!
});
```

### Proposed Architecture

```typescript
// BETTER: Browser manages the window, pages define content only
class Browser {
  private browserWindow: Window;  // Single persistent window

  async renderPage(pageCode: string): Promise<void> {
    // Pages receive a ContentBuilder, not full window control
    const pageBuilder = new Function('browserContext', 'content', pageCode);

    // Update browser window content
    this.browserWindow.setContent(() => {
      vbox(() => {
        // Browser chrome: address bar, toolbar, etc.
        this.renderBrowserChrome();

        // Page content area
        this.renderPageContent(pageBuilder);
      });
    });
  }

  renderBrowserChrome(): void {
    hbox(() => {
      button('←', () => this.back());
      button('→', () => this.forward());
      button('⟳', () => this.reload());
      this.addressBar = entry(this.currentUrl);
      button('Go', () => this.changePage(this.addressBar.getText()));
    });
  }
}
```

### Page API Changes

**Old API (current - creates window):**
```typescript
// Server sends this:
tsyne.window({ title: 'My Page' }, (win) => {
  win.setContent(() => {
    vbox(() => {
      label('Hello');
    });
  });
  win.show();
});
```

**New API (proposed - builds content only):**
```typescript
// Server sends this:
content.build(() => {
  vbox(() => {
    label('Hello');
  });
});

// Or even simpler:
vbox(() => {
  label('Hello');
});
```

Pages should:
- Not create windows
- Not control window properties
- Only define content layout
- Adapt to browser window size

---

## Priority Levels

### P0 - Critical (Breaks basic browser metaphor)
- [x] Fix window management (ONE browser window, pages render into it)
- [x] Browser chrome UI (address bar, back/forward buttons)
- [x] Window size persistence across page navigation
- [x] Proper page content isolation

### P1 - Essential (Basic browser functionality)
- [x] Address bar with manual URL entry
- [x] Reload/refresh button
- [x] Stop button for canceling loads (✕ button, visible when loading)
- [x] Loading progress indicator (text-based "Loading...")
- [x] Menu bar with standard items (File, View, History, Help)
- [x] Page menu API (pages can add custom menus via browserContext.addPageMenu)
- [ ] History persistence (save across sessions)
- [ ] Basic page caching

### P2 - Important (Expected browser features)
- [ ] Tabbed browsing
- [ ] Bookmarks
- [x] Right-click context menu (widget.setContextMenu() implemented)
- [ ] Keyboard shortcuts (Enter in address bar, Ctrl+R reload, Alt+Left back, etc.)
- [ ] Find in page
- [x] View source (View menu → View Page Source, prints to console)

### P3 - Nice to have (Enhanced UX)
- [ ] Developer tools
- [ ] Download manager
- [ ] Extensions support
- [ ] Settings UI
- [ ] Search from address bar

### P4 - Advanced (Future considerations)
- [ ] Offline support
- [ ] Service workers
- [ ] Background sync
- [ ] Push notifications
- [ ] Advanced security features

---

## References and Inspiration

- **Web 1.0 browsers**: Mosaic, Netscape Navigator, Internet Explorer 3-6
- **Web 2.0 browsers**: Firefox 1.0+, Chrome, Safari, Opera
- **Modern browsers**: Edge, Brave, Arc, Vivaldi
- **Desktop app browsers**: Electron webview, CEF (Chromium Embedded Framework)
- **Swiby browser**: Original Ruby/Swing implementation
- **HyperCard**: Apple's hypermedia system (pre-web inspiration)
- **Gemini protocol**: Modern minimalist web alternative

---

## Open Questions

1. **Page API design**: Should pages have NO window control? Or some configuration?
2. **Chrome vs Content**: How much browser UI vs page content in window?
3. **Multi-window support**: Allow pages to open new browser windows?
4. **Tab API**: Should pages know about tabs? Create new tabs?
5. **Security model**: How to sandbox page code from browser code?
6. **State sharing**: Can pages share state across navigations?
7. **Background tabs**: How to handle multiple tabs efficiently?
8. **Platform integration**: Deep links, file associations, default browser?
9. **Tsyne updates**: How to handle browser using older Tsyne than pages expect?
10. **Mixed content**: Can Tsyne pages load from HTTP and HTTPS in same session?

---

## Migration Path

For existing examples:

1. **Short term**: Document current limitation (creates new windows)
2. **Medium term**: Introduce `content.build()` API alongside `tsyne.window()`
3. **Long term**: Deprecate window creation in pages, browser controls window

Breaking changes can be minimized with compatibility layer.

---

*This document is a living roadmap. Contributions and discussion welcome!*
