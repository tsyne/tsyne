# HTTP Image Fetching - Architecture Design

## Problem Statement

**Current State:** The `image(path)` function expects a **local filesystem path** and passes it directly to Fyne, which loads the image from disk.

**What's Broken:** Pages loaded from HTTP servers cannot use HTTP URLs for images:
```typescript
// This doesn't work:
image('/assets/logo.png', 'contain');
image('http://localhost:3000/assets/logo.png', 'contain');
```

**Why This Matters:** Real browsers fetch images over HTTP. A browser-like system should:
1. Allow pages to reference images via URLs (absolute or relative)
2. Fetch those images from the web server
3. Display them in the UI

---

## How Real Browsers Work

### Web Browser Flow:
1. HTML page contains: `<img src="/assets/logo.png">`
2. Browser parses HTML, finds image reference
3. Browser makes HTTP GET request to `/assets/logo.png`
4. Server responds with image bytes
5. Browser renders image in page

### Tsyne Browser Current Flow:
1. TypeScript page contains: `image('/assets/logo.png')`
2. Browser executes page code
3. `image()` function creates widget, passes path to Fyne
4. **Fyne tries to load from filesystem** → fails (path doesn't exist locally)

---

## Architectural Solution: Dual-Execution Discovery Pattern

**Core Insight:** Don't parse the TypeScript - execute it twice in different contexts.

This approach is inspired by [Interface Builders Alternative](https://paulhammant.com/2013/03/28/interface-builders-alternative-lisp-timeline/) - the idea that executing code in different contexts can serve different purposes.

### How It Works:

**Pass 1: Discovery Execution**
```typescript
// Browser creates a "discovery context" with same API as fyne-bridge
// but this context doesn't render - it just records what gets called

const discoveryContext = new ResourceDiscoveryContext();
globalContext = discoveryContext;

// Execute the page code
eval(pageCode);

// Discovery context has now built a map of all resources:
// { images: ['/assets/logo.png', '/assets/banner.jpg'], ... }
const resources = discoveryContext.getDiscoveredResources();
```

**Between Passes: Fetch Resources**
```typescript
// Now fetch all discovered images via HTTP GET
for (const imageUrl of resources.images) {
  const fullUrl = resolveUrl(imageUrl, pageUrl);
  const localPath = await downloadToTemp(fullUrl);
  resourceMap.set(imageUrl, localPath);
}
```

**Pass 2: Real Execution**
```typescript
// Now execute again with the REAL fyne-bridge context
// But this time, when image(path) is called, we intercept:
const realContext = new FyneBridgeContext(resourceMap);
globalContext = realContext;

// Execute the same page code again
eval(pageCode);

// This time image() calls use locally-cached files
```

### Key Benefits:

✅ **No parsing required** - Just execute TypeScript naturally
✅ **Transparent to page authors** - They just call `image('/assets/logo.png')`
✅ **Maintains sync API** - No async/await needed in pages
✅ **Extensible** - Same pattern works for CSS, fonts, any resource
✅ **Elegant** - Reuses the same execution engine twice

### Implementation Details:

**ResourceDiscoveryContext:**
```typescript
class ResourceDiscoveryContext implements TsyneAPI {
  private images: string[] = [];

  image(path: string, mode?: string): Image {
    this.images.push(path);  // Record it
    return new NullImage();   // Return dummy object
  }

  label(text: string): Label {
    return new NullLabel();   // All widgets return dummies
  }

  // ... implement all other API methods as no-ops

  getDiscoveredResources() {
    return { images: this.images };
  }
}
```

**RealContext with Resource Map:**
```typescript
class FyneBridgeContext implements TsyneAPI {
  constructor(private resourceMap: Map<string, string>) {}

  image(path: string, mode?: string): Image {
    // Check if this path was discovered and fetched
    const localPath = this.resourceMap.get(path) || path;

    // Use local file path for Fyne
    return this.bridge.createImage(localPath, mode);
  }

  // ... normal implementations for other methods
}
```

### Execution Flow Diagram:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Fetch page.ts from server                               │
│    GET http://localhost:3000/page                          │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. PASS 1: Execute in Discovery Context                    │
│    - vbox(() => { ... })  → NullVBox                       │
│    - label('text')  → NullLabel                            │
│    - image('/logo.png')  → Record '/logo.png', return Null │
│                                                             │
│    Result: { images: ['/logo.png', '/banner.jpg'] }        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Fetch discovered images                                 │
│    GET http://localhost:3000/logo.png → /tmp/cache/logo    │
│    GET http://localhost:3000/banner.jpg → /tmp/cache/banner│
│                                                             │
│    Map: { '/logo.png' → '/tmp/cache/logo', ... }           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. PASS 2: Execute in Real Fyne Context                    │
│    - vbox(() => { ... })  → Create real Fyne VBox          │
│    - label('text')  → Create real Fyne Label               │
│    - image('/logo.png')  → Lookup map, get /tmp/cache/logo │
│                          → Create Fyne Image widget         │
│                                                             │
│    Result: Rendered UI with images                         │
└─────────────────────────────────────────────────────────────┘
```

### Why This Works:

1. **Deterministic Execution:** Same page code produces same resource references
2. **Side-Effect Free Discovery:** First pass doesn't render anything
3. **Transparent Resolution:** Second pass automatically uses cached resources
4. **No Code Modification:** Page code remains unchanged

---

## Implementation Roadmap

### Phase 1: Static Resource Serving (DONE ✅)
- [x] Test server serves static files from `examples/` directory
- [x] URLs like `/assets/test-image.svg` map to `examples/assets/test-image.svg`
- [x] Proper MIME types for images

### Phase 2: Discovery Context (Next)
- [ ] Implement `ResourceDiscoveryContext` class
- [ ] Null implementations for all Tsyne API methods
- [ ] Resource tracking (images first, then CSS/fonts/etc)

### Phase 3: Resource Fetching (Next)
- [ ] Download resources to temp directory
- [ ] Build resource map (URL → local path)
- [ ] Handle relative URL resolution
- [ ] Implement caching

### Phase 4: Dual Execution (Next)
- [ ] Modify Browser.renderPage() to execute twice
- [ ] Pass resource map to real context
- [ ] Image widget uses mapped paths

### Phase 5: Extensions (Future)
- [ ] CSS stylesheets
- [ ] Web fonts
- [ ] Other resource types

---

## Current Workaround for Tests

**For now**, the images test is **documentation-only** because:
1. HTTP image fetching requires dual-execution architecture
2. Discovery context not yet implemented
3. Pages execute only once currently

**Test Strategy:**
- `/images` page shows documentation of image API
- Test verifies documentation labels exist
- Actual HTTP image display is marked as TODO

---

## Security Considerations (Future)

When implementing HTTP image fetching:

### Same-Origin Policy
- Images from same origin as page: ✅ allowed
- Images from different origin: ❌ blocked (unless CORS headers present)

### CORS Support
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Origin: http://example.com
```

### Mixed Content
- HTTPS page loading HTTP image: ❌ blocked
- HTTPS page loading HTTPS image: ✅ allowed
- HTTP page loading HTTP/HTTPS: ✅ allowed

---

## Potential Extensions

Once dual-execution discovery pattern is implemented, these become possible:

- **Images** - `image('/logo.png')` ← Current focus
- **CSS/Stylesheets** - `stylesheet('/styles.css')` (future)
- **Fonts** - `font('/fonts/custom.ttf')` (future)
- **fetch() API** - Standard Web API for AJAX requests
- **XMLHttpRequest** - Legacy AJAX API
- **WebSocket** - Real-time bidirectional communication
- **Service Workers** - Offline support, request interception

The discovery pattern naturally extends to any resource type by adding tracking to the discovery context.

---

## References

- [Paul Hammant: Interface Builders Alternative (2013)](https://paulhammant.com/2013/03/28/interface-builders-alternative-lisp-timeline/) - Dual-execution concept
- [MDN: How browsers work](https://developer.mozilla.org/en-US/docs/Web/Performance/How_browsers_work)
- [Same-Origin Policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)
- [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

*This document tracks the architectural work needed to support HTTP image fetching in Tsyne Browser using a dual-execution discovery pattern. See Browser_TODO.md for the full feature roadmap.*
