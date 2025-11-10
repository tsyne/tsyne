# Page Inspector Design for Tsyne Browser

## Overview

A page inspector (like browser DevTools) for examining Tsyne page structure, widget properties, and page state.

## Inspiration

Web browser DevTools provide:
- **Elements tab** - Inspect DOM tree, attributes, styles
- **Console** - JavaScript execution, logging
- **Network** - HTTP requests, responses
- **Sources** - View source code
- **Performance** - Profiling, metrics

## Tsyne Inspector Design

### Core Concept

Instead of inspecting HTML DOM, inspect **Tsyne widget tree**.

```
Window
├── VBox (root container)
│   ├── Label ("Welcome to Tsyne!")
│   ├── Label (empty - spacing)
│   ├── Button ("Go to About")
│   │   └── onClick: () => browserContext.changePage('/about')
│   ├── Button ("Go to Contact")
│   │   └── onClick: () => browserContext.changePage('/contact')
│   └── Separator
└── Menu Bar
    ├── File
    │   └── Close Window
    └── View
        ├── Reload
        └── View Page Source
```

## Inspector UI

### Layout

```
┌─────────────────────────────────────────────────────┐
│ Tsyne Browser Inspector                             │
├──────────┬──────────────────────────────────────────┤
│          │                                           │
│  Widget  │  Widget Properties                        │
│  Tree    │                                           │
│          │  Type: Button                             │
│  □ Window│  Text: "Go to About"                      │
│  ▼ VBox  │  ID: widget_42                            │
│    Label │  Visible: true                            │
│    Label │  Enabled: true                            │
│  ▶ Button│  Position: (10, 50)                       │
│    Button│  Size: (200, 40)                          │
│          │  Parent: VBox (widget_1)                  │
│          │                                           │
│          │  Events:                                  │
│          │    onClick: function() { ... }            │
│          │                                           │
├──────────┴───────────────────────────────────────────┤
│  Console                                             │
│  > browserContext.currentUrl                         │
│  "http://localhost:3000/"                            │
│  > widget_42.getText()                               │
│  "Go to About"                                       │
└─────────────────────────────────────────────────────┘
```

### Tabs

1. **Widgets** - Widget tree inspector
2. **Page Source** - View current page TypeScript code
3. **Console** - Execute TypeScript, inspect variables
4. **Network** - HTTP requests for page loads
5. **State** - Page variables, browserContext state

## Implementation Approaches

### Approach 1: Separate Inspector Window

Open inspector in a separate Fyne window:

```typescript
// In Tsyne Browser
const inspector = new TsyneInspector(browser);
await inspector.open();
```

Inspector window shows:
- Widget tree (left panel)
- Selected widget properties (right panel)
- Console tab at bottom
- Live updates as widgets change

### Approach 2: Browser-Integrated Panel

Add inspector as a split pane in browser window:

```
┌────────────────────────────┬─────────────────┐
│                            │  Inspector      │
│  Browser Content           │                 │
│  (Current Page)            │  Widget Tree    │
│                            │                 │
│                            │  Properties     │
│                            │                 │
├────────────────────────────┴─────────────────┤
│  Console                                     │
└──────────────────────────────────────────────┘
```

Toggle with F12 or menu: View → Toggle Inspector

### Approach 3: Web-Based Inspector

Serve inspector as a separate web page:

```bash
# Browser runs on one port
npx tsyne-browser http://localhost:3000/

# Inspector runs on another port
npx tsyne-inspector --target=http://localhost:3000/
# Opens http://localhost:9000/ in web browser
```

Inspector communicates with browser via WebSocket or HTTP.

Benefits:
- Use web DevTools to debug the inspector itself
- Easier to build (HTML/CSS/JavaScript)
- Remote debugging possible

Drawbacks:
- Requires web browser alongside desktop app
- More complex architecture

## Widget Tree Inspector

### Widget Tree Display

Each widget shows:
- **Type** - Label, Button, VBox, etc.
- **ID** - Unique widget identifier
- **Text** - Current text content (if applicable)
- **Expand/collapse** - For containers

Example:
```
▼ Window (window_1)
  ▼ VBox (vbox_1)
    □ Label (label_1) "Welcome to Tsyne!"
    □ Label (label_2) ""
    ▶ HBox (hbox_1)
      □ Button (button_1) "Submit"
      □ Button (button_2) "Cancel"
    □ Separator (sep_1)
```

### Widget Selection

Click a widget in the tree to:
- Highlight it in the browser window (outline)
- Show its properties in the properties panel
- Enable console access via `$w` variable

### Widget Highlighting

When widget is selected in inspector, draw a red outline around it in the browser window.

Implementation:
- Send "highlightWidget" command to bridge
- Bridge draws overlay on selected widget
- Clear highlight when selection changes

## Properties Panel

### Widget Properties

Display all widget properties:

```yaml
Widget ID: button_42
Type: Button
Text: "Go to About"
Position: {X: 10, Y: 50}
Size: {Width: 200, Height: 40}
Visible: true
Enabled: true
Parent: vbox_1 (VBox)
Children: []

Event Handlers:
  onClick: function() { browserContext.changePage('/about'); }

Methods:
  setText(text: string): void
  getText(): Promise<string>
  setContextMenu(items: MenuItem[]): void
```

### Editable Properties

Allow editing some properties:
- **Text** - Change button/label text
- **Enabled** - Enable/disable widget
- **Visible** - Show/hide widget

Changes apply immediately to live page.

## Console Tab

### REPL Environment

Execute TypeScript expressions:

```typescript
// Access page variables
> browserContext.currentUrl
"http://localhost:3000/"

> browserContext
{ currentUrl: "...", changePage: function, back: function, ... }

// Access selected widget
> $w
Button { id: "button_42", text: "Go to About", ... }

> $w.getText()
"Go to About"

> $w.setText("New Text")
// Button text changes in browser window

// Access Tsyne API
> tsyne
{ vbox: function, button: function, label: function, ... }

// Execute arbitrary code
> let count = 0
> count++
1
```

### Special Variables

- **`$w`** - Currently selected widget
- **`browserContext`** - Browser context object
- **`tsyne`** - Tsyne API object
- **`window`** - Current window reference

## Page Source Tab

Display current page TypeScript code:

```typescript
// Home Page - TypeScript content for Tsyne Browser
// URL: http://localhost:3000/

const { vbox, label, button } = tsyne;

vbox(() => {
  label('Welcome to Tsyne Browser!');
  label('');

  button('Go to About', () => {
    browserContext.changePage('/about');
  });
});
```

Features:
- Syntax highlighting
- Line numbers
- Search within source
- Copy source code

## Network Tab

Track HTTP requests for page loads:

```
Method  URL                             Status  Time
GET     http://localhost:3000/          200     45ms
GET     http://localhost:3000/about     200     32ms
GET     http://localhost:3000/contact   200     38ms
```

For each request, show:
- Request headers
- Response headers
- Response body (TypeScript code)
- Timing breakdown

## State Tab

Show page-level state:

```javascript
Page Variables:
  counter: 0
  displayLabel: Label { id: "label_5", text: "Count: 0" }
  items: ['Item 1', 'Item 2', 'Item 3']

Browser Context:
  currentUrl: "http://localhost:3000/dynamic-demo"
  isLoading: false
  canGoBack: true
  canGoForward: false

History:
  [-2] http://localhost:3000/
  [-1] http://localhost:3000/hyperlinks
  [0]  http://localhost:3000/dynamic-demo  ← current
```

## Implementation Example

### Inspector Window

```typescript
// cli/inspector.ts
import { window, hsplit, vbox, tree, label, entry } from '../src/index';

export class TsyneInspector {
  private targetBrowser: Browser;
  private widgetTree: any;
  private propertiesPanel: any;

  constructor(browser: Browser) {
    this.targetBrowser = browser;
  }

  async open() {
    window({ title: 'Tsyne Inspector', width: 1200, height: 800 }, (win) => {
      hsplit(
        // Left: Widget tree
        () => {
          vbox(() => {
            label('Widget Tree');
            this.widgetTree = tree('Window');
            this.buildWidgetTree();
          });
        },
        // Right: Properties
        () => {
          vbox(() => {
            label('Properties');
            this.propertiesPanel = vbox(() => {
              label('Select a widget to view properties');
            });
          });
        },
        0.3 // 30% left, 70% right
      );

      win.show();
    });
  }

  private buildWidgetTree() {
    // Query browser for widget hierarchy
    const widgets = this.targetBrowser.getWidgetHierarchy();

    // Build tree structure
    this.widgetTree.clear();
    this.addWidgetsToTree(widgets, this.widgetTree.getRoot());
  }

  private addWidgetsToTree(widgets: any[], parent: any) {
    for (const widget of widgets) {
      const node = parent.addChild(`${widget.type} (${widget.id})`);

      if (widget.children && widget.children.length > 0) {
        this.addWidgetsToTree(widget.children, node);
      }
    }
  }
}
```

### Bridge API Extensions

Add to Tsyne bridge:

```go
// In bridge/main.go

// GetWidgetHierarchy returns widget tree
func GetWidgetHierarchy() WidgetHierarchy {
    // Walk widget tree
    // Return JSON structure
}

// HighlightWidget draws outline around widget
func HighlightWidget(widgetID string) {
    // Find widget by ID
    // Draw red outline overlay
}

// GetWidgetProperties returns all properties
func GetWidgetProperties(widgetID string) map[string]interface{} {
    // Return widget properties as JSON
}

// SetWidgetProperty updates a property
func SetWidgetProperty(widgetID string, property string, value interface{}) {
    // Update widget property
    // Refresh display
}
```

## Usage Scenarios

### Debugging Page Layout

1. Open inspector (F12 or View → Inspector)
2. Navigate to "Widgets" tab
3. Expand widget tree
4. Click on a widget to select it
5. Widget is highlighted in browser
6. Properties panel shows widget details
7. Adjust properties to test layout changes

### Testing Dynamic Updates

1. Navigate to `/dynamic-demo` page
2. Open inspector
3. Switch to "State" tab
4. Watch `counter` variable as you click buttons
5. See `displayLabel.text` property update
6. Use console to manually set counter: `counter = 100`

### Inspecting Event Handlers

1. Select a button in widget tree
2. Properties panel shows `onClick` function
3. See full function source code
4. Add breakpoint (future feature)
5. Execute function manually from console

### Viewing Network Requests

1. Navigate between pages
2. Open inspector → Network tab
3. See all page load requests
4. Click a request to see full details
5. View TypeScript source returned by server

## Advanced Features

### DOM-like querySelector

```typescript
// In console
> document.querySelector('Button')
Button { id: "button_42", ... }

> document.querySelectorAll('Label')
[Label { ... }, Label { ... }, ...]

> document.querySelector('VBox > Button')
Button { ... } // First button inside a VBox
```

### Live Editing

Edit page source in inspector:
1. Go to "Page Source" tab
2. Click "Edit" button
3. Modify TypeScript code
4. Click "Apply" to reload page with changes
5. Changes are temporary (not saved to server)

### Performance Profiling

Track widget render times:
```
Widget Render Times:
  VBox: 2ms
  Label (x10): 15ms
  Button (x5): 8ms
  Total: 25ms
```

### Accessibility Inspector

Check widget accessibility:
- Labels for inputs
- Keyboard navigation order
- Screen reader text
- Color contrast

## Comparison to Web DevTools

| Web DevTools | Tsyne Inspector |
|--------------|-----------------|
| Elements (DOM tree) | Widgets (widget tree) |
| HTML/CSS | Widget properties |
| JavaScript console | TypeScript console |
| Network (HTTP) | Network (page loads) |
| Sources | Page source |
| Performance | Widget render times |
| Application | State (variables) |

## Future Enhancements

- **Breakpoints** - Pause on widget events
- **Time travel debugging** - Rewind/replay page state
- **Hot reload** - Edit page code and auto-reload
- **Diff viewer** - Compare page versions
- **Export** - Save widget tree as JSON
- **Remote debugging** - Debug Tsyne apps on other machines
- **Plugin system** - Extend inspector with custom tools

## Implementation Priority

1. **Phase 1 (MVP)**
   - Widget tree viewer
   - Basic properties panel
   - Page source viewer

2. **Phase 2**
   - Console with REPL
   - Widget highlighting
   - Network tab

3. **Phase 3**
   - State viewer
   - Live editing
   - Performance profiling

4. **Phase 4**
   - Breakpoints
   - Remote debugging
   - Advanced features

## Example Inspector Session

```
User: Opens Tsyne Browser to http://localhost:3000/
User: Presses F12
→ Inspector window opens

User: Clicks on "Go to About" button in widget tree
→ Button is highlighted with red outline in browser
→ Properties panel shows:
   Type: Button
   Text: "Go to About"
   onClick: function() { browserContext.changePage('/about'); }

User: Switches to Console tab
User: Types: $w.getText()
→ Console output: "Go to About"

User: Types: $w.setText("Visit About Page")
→ Button text changes in browser window

User: Clicks button in browser
→ Browser navigates to /about
→ Network tab shows: GET /about 200 32ms
→ Widget tree updates to show new page structure

User: Switches to Page Source tab
→ Sees TypeScript source code of /about page
```

## Conclusion

A Tsyne Inspector would provide powerful debugging and exploration capabilities, bringing desktop UI development closer to the excellent developer experience of web browser DevTools, while being tailored specifically for Tsyne's widget-based architecture.
