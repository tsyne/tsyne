# Tsyne Examples

A comprehensive collection of showcase applications demonstrating Tsyne's capabilities, ranging from simple "Hello World" to complex multi-feature applications.

![Examples Banner](https://img.shields.io/badge/Examples-100+-blue) ![Tests](https://img.shields.io/badge/Tests-Comprehensive-green)

## Overview

These examples are designed to:
- Help developers learn Tsyne's API and patterns
- Demonstrate best practices for building desktop GUIs
- Showcase the framework's widget library
- Provide test coverage examples
- Serve as starting points for new applications

## Running Examples

```bash
# Run an example directly with ts-node (recommended)
npx ts-node examples/01-hello-world.ts

# Run tests for an example
npm test examples/01-hello-world.test.ts

# Run tests in headed mode (see the GUI)
TSYNE_HEADED=1 npm test examples/01-hello-world.test.ts
```

---

## Numbered Tutorial Examples (01-21)

Progressive learning examples from basic to advanced concepts.

### Beginner (Basic Concepts)

| Example | Description | Widgets | Attribution | Screenshot |
|---------|-------------|---------|-------------|------------|
| [**01-hello-world.ts**](01-hello-world.ts) | Minimal Tsyne app structure | Label, VBox | Ryelang (Apache 2.0) | [📷](screenshots/01-hello-world.png) |
| [**02-counter.ts**](02-counter.ts) | State management, event handling | Label, Button, HBox, VBox | Original | [📷](screenshots/02-counter.png) |
| [**03-button-spacer.ts**](03-button-spacer.ts) | Button interaction, layout spacing | Label, Button, VBox | Ryelang (Apache 2.0) | [📷](screenshots/03-button-spacer.png) |

### Intermediate (Multi-Widget Apps)

| Example | Description | Widgets | Attribution | Screenshot |
|---------|-------------|---------|-------------|------------|
| [**04-feedback-form.ts**](04-feedback-form.ts) | Multi-input forms, dropdowns, dialogs | Label, Select, MultilineEntry, Button, Dialog | Ryelang (Apache 2.0) | [📷](screenshots/04-feedback-form.png) |
| [**05-live-clock.ts**](05-live-clock.ts) | Real-time updates with intervals | Label, VBox | Ryelang (Apache 2.0) | [📷](screenshots/05-live-clock.png) |
| [**07-signup-form.ts**](07-signup-form.ts) | Form validation, conditional UI | Entry, PasswordEntry, Checkbox, Button, Form, Dialog | Ryelang (Apache 2.0) | [📷](screenshots/07-signup-form.png) |
| [**09-players-list.ts**](09-players-list.ts) | Data display, list rendering | Label, List, HBox, VBox | Ryelang (Apache 2.0) | [📷](screenshots/09-players-list.png) |

### Advanced (Complex Features)

| Example | Description | Widgets | Attribution | Screenshot |
|---------|-------------|---------|-------------|------------|
| [**10-multiplication-table.ts**](10-multiplication-table.ts) | Table widget, dynamic cell population | Table, Label | Ryelang (Apache 2.0) | [📷](screenshots/10-multiplication-table.png) |
| [**11-percentage-clock.ts**](11-percentage-clock.ts) | Progress bars, time calculations | Label, ProgressBar, VBox | Ryelang (Apache 2.0) | [📷](screenshots/11-percentage-clock.png) |
| [**12-shopping-list.ts**](12-shopping-list.ts) | Dynamic list management, CRUD operations | Entry, Checkbox, Button, Scroll, VBox, HBox | Ryelang (Apache 2.0) | [📷](screenshots/12-shopping-list.png) |
| [**13-tabbed-settings.ts**](13-tabbed-settings.ts) | Tabbed interface, settings panel | Tabs, Slider, Checkbox, Label, VBox | Ryelang (Apache 2.0) | [📷](screenshots/13-tabbed-settings.png) |

### Interactive Apps (14-21)

| Example | Description | Key Features | Attribution |
|---------|-------------|--------------|-------------|
| [**14-color-mixer.ts**](14-color-mixer.ts) | RGB color mixing | Sliders, hex/RGB conversion, random generation | Original |
| [**15-tip-calculator.ts**](15-tip-calculator.ts) | Financial calculations | Entry validation, radio buttons, bill splitting | Original |
| [**16-password-generator.ts**](16-password-generator.ts) | Random generation | Character type toggles, length slider, validation | Original |
| [**17-stopwatch.ts**](17-stopwatch.ts) | Time tracking | Start/Stop/Reset, lap times, millisecond precision | Original |
| [**18-dice-roller.ts**](18-dice-roller.ts) | Random dice rolling | Configurable dice types (d4-d100), roll history | Original |
| [**19-bmi-calculator.ts**](19-bmi-calculator.ts) | Health calculations | Metric/imperial units, BMI categories | Original |
| [**20-rock-paper-scissors.ts**](20-rock-paper-scissors.ts) | Game with score tracking | Win/loss logic, score persistence | Original |
| [**21-quiz-app.ts**](21-quiz-app.ts) | Multi-screen quiz | State machines, screen transitions, scoring | Original |

---

## Full Applications

### Games

| Application | Description | Attribution |
|-------------|-------------|-------------|
| [**chess/**](chess/) | Classic chess game with computer opponent | [andydotxyz/chess](https://github.com/andydotxyz/chess) |
| [**solitaire/**](solitaire/) | Klondike solitaire card game | [fyne-io/solitaire](https://github.com/fyne-io/solitaire) |
| [**game-of-life/**](game-of-life/) | Conway's Game of Life cellular automaton | Original |
| [**tictactoe.ts**](tictactoe.ts) | Tic-Tac-Toe game | Original |
| [**tictactoe-accessible.ts**](tictactoe-accessible.ts) | Accessible Tic-Tac-Toe with screen reader support | Original |
| [**tictactoe-braille.ts**](tictactoe-braille.ts) | Tic-Tac-Toe with Braille display | Original |

### Productivity

| Application | Description | Attribution | Screenshot |
|-------------|-------------|-------------|------------|
| [**todomvc.ts**](todomvc.ts) | Full TodoMVC implementation with MVC pattern | Original | [📷](screenshots/todomvc.png) |
| [**todomvc-when.ts**](todomvc-when.ts) | TodoMVC with declarative when() visibility | Original | |
| [**calculator.ts**](calculator.ts) | Calculator with full operations | Original | [📷](screenshots/calculator.png) |
| [**calculator-accessible.ts**](calculator-accessible.ts) | Accessible calculator with screen reader | Original | |
| [**calculator-fully-accessible.ts**](calculator-fully-accessible.ts) | Fully accessible calculator | Original | |
| [**text-editor.ts**](text-editor.ts) | Text editor with file operations | Original | |
| [**kanban-board.ts**](kanban-board.ts) | Kanban-style task board | Original | |
| [**clipboard-manager.ts**](clipboard-manager.ts) | Clipboard history manager | Original | |
| [**reminder-app.ts**](reminder-app.ts) | Reminder/notification app | Original | |
| [**appointment-scheduler.ts**](appointment-scheduler.ts) | Appointment scheduling app | Original | |
| [**diagram-editor.ts**](diagram-editor.ts) | Diagram/flowchart editor | Original | |
| [**whiteboard.ts**](whiteboard.ts) | Collaborative whiteboard | Original | |
| [**slydes/**](slydes/) | Presentation slides application | Original | |

### Tools

| Application | Description | Attribution |
|-------------|-------------|-------------|
| [**terminal/**](terminal/) | Terminal emulator demonstration | [fyne-io/terminal](https://github.com/fyne-io/terminal) |
| [**terminal-emulator.ts**](terminal-emulator.ts) | Standalone terminal emulator example | Original |
| [**pixeledit/**](pixeledit/) | Pixel-based image editor | [fyne-io/pixeledit](https://github.com/fyne-io/pixeledit) |
| [**fyles/**](fyles/) | File manager application | Original |
| [**image-viewer/**](image-viewer/) | Image viewer with navigation | Original |
| [**svg-rendering/**](svg-rendering/) | SVG rendering utilities | Original |
| [**drawing-app.ts**](drawing-app.ts) | Freehand drawing application | Original |
| [**pixel-art.ts**](pixel-art.ts) | Pixel art editor | Original |
| [**photo-gallery.ts**](photo-gallery.ts) | Photo gallery viewer | Original |

### Utilities

| Application | Description | Attribution |
|-------------|-------------|-------------|
| [**settings-app.ts**](settings-app.ts) | Settings/preferences panel | Original |
| [**preferences.ts**](preferences.ts) | User preferences management | Original |
| [**file-browser.ts**](file-browser.ts) | File system browser | Original |
| [**download-manager.ts**](download-manager.ts) | Download queue manager | Original |
| [**font-preview.ts**](font-preview.ts) | Font preview and selection | Original |
| [**project-opener.ts**](project-opener.ts) | Project file opener | Original |
| [**country-picker.ts**](country-picker.ts) | Country selection widget | Original |
| [**stock-ticker-standalone.ts**](stock-ticker-standalone.ts) | Stock price ticker | Original |
| [**weather-viewer-standalone.ts**](weather-viewer-standalone.ts) | Weather information viewer | Original |

---

## Architectural Pattern Examples

Examples demonstrating different software architecture patterns.

| Example | Pattern | Description |
|---------|---------|-------------|
| [**mvc-counter.ts**](mvc-counter.ts) | MVC | Model-View-Controller with counter app |
| [**mvp-login.ts**](mvp-login.ts) | MVP | Model-View-Presenter login form |
| [**mvvm-todo.ts**](mvvm-todo.ts) | MVVM | Model-View-ViewModel todo list |
| [**data-binding.ts**](data-binding.ts) | Data Binding | Two-way data binding with ObservableState |
| [**reactive-form.ts**](reactive-form.ts) | Reactive | Reactive form with validation |

---

## Widget Demonstrations

Individual examples showcasing specific widgets.

### Layout Containers

| Example | Widgets Demonstrated |
|---------|---------------------|
| [**hbox-example.ts**](hbox-example.ts) | HBox horizontal layout |
| [**grid.ts**](grid.ts) | Grid layout for calculator-style UIs |
| [**grid-example.ts**](grid-example.ts) | Additional grid examples |
| [**scroll.ts**](scroll.ts) | Scrollable containers |
| [**split.ts**](split.ts) | Split panes |
| [**tabs.ts**](tabs.ts) | Tabbed containers |
| [**form.ts**](form.ts) | Form layout |
| [**form-styled.ts**](form-styled.ts) | Styled form layouts |
| [**form-unstyled.ts**](form-unstyled.ts) | Unstyled form layouts |
| [**padded-demo.ts**](padded-demo.ts) | Padded container with spacing |
| [**clip-demo.ts**](clip-demo.ts) | Clipped container demo |
| [**card-stack.ts**](card-stack.ts) | Stacked card layout |

### Input Widgets

| Example | Widgets Demonstrated |
|---------|---------------------|
| [**counter.ts**](counter.ts) | Button clicks, label updates |
| [**checkbox.ts**](checkbox.ts) | Checkbox state management |
| [**radiogroup.ts**](radiogroup.ts) | Radio button groups |
| [**slider.ts**](slider.ts) | Slider value changes |
| [**select.ts**](select.ts) | Dropdown selection |
| [**input-widgets.ts**](input-widgets.ts) | Various input widgets |

### Display Widgets

| Example | Widgets Demonstrated |
|---------|---------------------|
| [**hello.ts**](hello.ts) | Basic label with styling |
| [**list.ts**](list.ts) | List widget with selection |
| [**table.ts**](table.ts) | Table widget with rows/columns |
| [**progressbar.ts**](progressbar.ts) | Progress bar updates |
| [**loading-states.ts**](loading-states.ts) | Loading indicators and states |
| [**icon-gallery.ts**](icon-gallery.ts) | Icon display and selection |
| [**gradient-picker.ts**](gradient-picker.ts) | Gradient color picker |

### Advanced Widgets

| Example | Widgets Demonstrated |
|---------|---------------------|
| [**advanced-widgets.ts**](advanced-widgets.ts) | Card, Accordion, Form, Center layout |
| [**specialized-widgets.ts**](specialized-widgets.ts) | Specialized widget usage |
| [**toolbar.ts**](toolbar.ts) | Toolbar with actions and separators |
| [**menu-bar.ts**](menu-bar.ts) | Menu bar with File/Edit/Help menus |
| [**tooltip-demo.ts**](tooltip-demo.ts) | Tooltip display and positioning |
| [**command-palette.ts**](command-palette.ts) | Command palette (Ctrl+P style) |
| [**mdi-demo.ts**](mdi-demo.ts) | Multi-document interface |
| [**theme-zones.ts**](theme-zones.ts) | Theme override zones |

---

## Dialog Examples

| Example | Dialog Types |
|---------|-------------|
| [**dialogs-info.ts**](dialogs-info.ts) | Information and error dialogs |
| [**dialogs-confirm.ts**](dialogs-confirm.ts) | Confirmation dialogs (Yes/No) |
| [**dialogs-file.ts**](dialogs-file.ts) | File open and save dialogs |
| [**dialog-state.ts**](dialog-state.ts) | Dialog state management |
| [**about-dialog.ts**](about-dialog.ts) | About dialog pattern |
| [**rename-dialog.ts**](rename-dialog.ts) | Rename dialog with validation |
| [**unsaved-changes.ts**](unsaved-changes.ts) | Unsaved changes confirmation |

---

## Form Examples

| Example | Description |
|---------|-------------|
| [**new-contact.ts**](new-contact.ts) | New contact entry form |
| [**event-form.ts**](event-form.ts) | Event creation form |
| [**registration-form.ts**](registration-form.ts) | User registration form |
| [**wizard.ts**](wizard.ts) | Multi-step wizard form |
| [**form-styles.ts**](form-styles.ts) | Form styling patterns |

---

## Browser Mode Examples

Tsyne's page-by-page browser mode inspired by the web.

### Browser Runner

| Example | Description |
|---------|-------------|
| [**run-browser.ts**](run-browser.ts) | Launch Tsyne Browser for manual testing |

### Page Examples (pages/)

| Page | Description |
|------|-------------|
| [**pages/index.ts**](pages/index.ts) | Browser home page |
| [**pages/about.ts**](pages/about.ts) | About page |
| [**pages/contact.ts**](pages/contact.ts) | Contact form |
| [**pages/form.ts**](pages/form.ts) | Form example page |
| [**pages/404.ts**](pages/404.ts) | Not found page |
| [**pages/thanks.ts**](pages/thanks.ts) | Thank you page |
| [**pages/hyperlinks.ts**](pages/hyperlinks.ts) | Navigation with hyperlinks |
| [**pages/scrolling.ts**](pages/scrolling.ts) | Scrollable content |
| [**pages/images.ts**](pages/images.ts) | Image display |
| [**pages/table-demo.ts**](pages/table-demo.ts) | Table widget demo |
| [**pages/list-demo.ts**](pages/list-demo.ts) | List widget demo |
| [**pages/fyne-widgets.ts**](pages/fyne-widgets.ts) | Fyne widget showcase |
| [**pages/layout-demo.ts**](pages/layout-demo.ts) | Layout examples |
| [**pages/text-features.ts**](pages/text-features.ts) | Text formatting features |
| [**pages/widget-interactions.ts**](pages/widget-interactions.ts) | Widget interaction demos |
| [**pages/alerts-demo.ts**](pages/alerts-demo.ts) | Alert demonstrations |
| [**pages/custom-alert.ts**](pages/custom-alert.ts) | Custom alert dialogs |
| [**pages/dynamic-demo.ts**](pages/dynamic-demo.ts) | Dynamic content updates |
| [**pages/context-menu-demo.ts**](pages/context-menu-demo.ts) | Context menus |
| [**pages/menu-demo.ts**](pages/menu-demo.ts) | Menu demonstrations |
| [**pages/post-demo.ts**](pages/post-demo.ts) | POST request handling |
| [**pages/post-success.ts**](pages/post-success.ts) | POST success page |
| [**pages/url-fragments.ts**](pages/url-fragments.ts) | URL fragment handling |

---

## Accessibility Examples

| Example | Description |
|---------|-------------|
| [**accessibility-demo.ts**](accessibility-demo.ts) | Accessibility features demo |
| [**tictactoe-accessible.ts**](tictactoe-accessible.ts) | Accessible game implementation |
| [**tictactoe-braille.ts**](tictactoe-braille.ts) | Tic-Tac-Toe with Braille display |
| [**calculator-accessible.ts**](calculator-accessible.ts) | Accessible calculator |
| [**calculator-fully-accessible.ts**](calculator-fully-accessible.ts) | Full accessibility support |

---

## Theme and Styling

| Example | Description |
|---------|-------------|
| [**theme.ts**](theme.ts) | Light/dark theme switching |
| [**theme-creator.ts**](theme-creator.ts) | Theme creation and customization |
| [**theme-zones.ts**](theme-zones.ts) | Theme override zones |
| [**form-styled.ts**](form-styled.ts) | Styled form examples |
| [**form-styles.ts**](form-styles.ts) | Form styling patterns |
| [**shopping-cart-styles.ts**](shopping-cart-styles.ts) | Shopping cart with styles |

---

## Event Handling

### Desktop Interface Demos

Focused demos showcasing Fyne's `driver/desktop` interfaces without accessibility coupling.

| Example | Interface | Description |
|---------|-----------|-------------|
| [**hoverable-demo.ts**](hoverable-demo.ts) | Hoverable | Heat map with hover tracking (onMouseIn, onMouseMoved, onMouseOut) |
| [**mouseable-demo.ts**](mouseable-demo.ts) | Mouseable | Click timing, button detection (onMouseDown, onMouseUp) |
| [**keyable-demo.ts**](keyable-demo.ts) | Keyable | Keyboard tracker, arrow navigation (onKeyDown, onKeyUp) |
| [**cursorable-demo.ts**](cursorable-demo.ts) | Cursorable | Cursor gallery with all 6 types (setCursor) |
| [**focusable-demo.ts**](focusable-demo.ts) | Focusable | Focus tracking, navigation game (onFocusChange) |

### Other Event Examples

| Example | Description |
|---------|-------------|
| [**mouse-events-demo.ts**](mouse-events-demo.ts) | Mouse events (onMouseIn, onMouseOut, etc.) |
| [**test_click_card.ts**](test_click_card.ts) | Click event handling |
| [**test_drag_card.ts**](test_drag_card.ts) | Drag event handling |
| [**test_card.ts**](test_card.ts) | Card widget event testing |

---

## Window Management

| Example | Description |
|---------|-------------|
| [**window-sizing.ts**](window-sizing.ts) | Window size configuration |
| [**multi-window.ts**](multi-window.ts) | Multiple window management |
| [**background-app.ts**](background-app.ts) | Background/system tray app |

---

## Image Handling

| Example | Description |
|---------|-------------|
| [**test-http-images.ts**](test-http-images.ts) | Loading images from HTTP |
| [**test-updateimage.ts**](test-updateimage.ts) | Dynamic image updates |
| [**image-viewer/**](image-viewer/) | Full image viewer application |

---

## Testing Examples

Examples focused on testing patterns and utilities.

### Test Utilities

| Example | Description |
|---------|-------------|
| [**locators.test.ts**](locators.test.ts) | Test locator patterns |
| [**fluent-api.test.ts**](fluent-api.test.ts) | Fluent API testing |
| [**fluent-properties.test.ts**](fluent-properties.test.ts) | Fluent property testing |
| [**entry-submit.test.ts**](entry-submit.test.ts) | Entry submit testing |
| [**checkbox-test.test.ts**](checkbox-test.test.ts) | Checkbox testing |
| [**advanced-interactions.test.ts**](advanced-interactions.test.ts) | Advanced interaction testing |
| [**capture-screenshots.ts**](capture-screenshots.ts) | Screenshot capture utility |
| [**capture-screenshots-v2.ts**](capture-screenshots-v2.ts) | Screenshot capture v2 |

### Application Tests

| Test | Description |
|------|-------------|
| [**calculator.test.ts**](calculator.test.ts) | Calculator functionality tests |
| [**calculator-designer.test.ts**](calculator-designer.test.ts) | Calculator design verification |
| [**todomvc.test.ts**](todomvc.test.ts) | TodoMVC tests |
| [**todomvc-when.test.ts**](todomvc-when.test.ts) | TodoMVC when() feature tests |
| [**todomvc-designer.test.ts**](todomvc-designer.test.ts) | TodoMVC design verification |
| [**tictactoe.test.ts**](tictactoe.test.ts) | Tic-Tac-Toe game tests |
| [**tictactoe-accessible.test.ts**](tictactoe-accessible.test.ts) | Accessible Tic-Tac-Toe tests |
| [**tictactoe-high-contrast.test.ts**](tictactoe-high-contrast.test.ts) | High contrast mode tests |
| [**tictactoe-mespeak.test.ts**](tictactoe-mespeak.test.ts) | MeSpeak integration tests |

### Visual and Accessibility Tests

| Test | Description |
|------|-------------|
| [**visual-regression.test.ts**](visual-regression.test.ts) | Visual regression testing |
| [**accessibility-audit.test.ts**](accessibility-audit.test.ts) | Accessibility audit tests |
| [**mouse-events-designer.test.ts**](mouse-events-designer.test.ts) | Mouse events verification |
| [**toolbar-isolation.test.ts**](toolbar-isolation.test.ts) | Toolbar isolation tests |
| [**window-title.test.ts**](window-title.test.ts) | Window title tests |
| [**window-features.test.ts**](window-features.test.ts) | Window feature tests |
| [**status-bar.test.ts**](status-bar.test.ts) | Status bar tests |
| [**home-button.test.ts**](home-button.test.ts) | Home button tests |
| [**web-features.test.ts**](web-features.test.ts) | Web features tests |
| [**widget-interactions.test.js**](widget-interactions.test.js) | Widget interaction tests |

---

## Browser Feature Tests

Test files for browser mode features.

| Test | Feature |
|------|---------|
| [**browser.test.ts**](browser.test.ts) | Core browser functionality |
| [**browser-home.test.ts**](browser-home.test.ts) | Home page navigation |
| [**browser-enter-key.test.ts**](browser-enter-key.test.ts) | Enter key handling |
| [**browser-status-bar.test.ts**](browser-status-bar.test.ts) | Status bar functionality |
| [**browser-page-cache.test.ts**](browser-page-cache.test.ts) | Page caching |
| [**browser-page-title.test.ts**](browser-page-title.test.ts) | Page title updates |
| [**browser-find.test.ts**](browser-find.test.ts) | Find in page |
| [**browser-bookmarks.test.ts**](browser-bookmarks.test.ts) | Bookmark functionality |
| [**browser-bookmark-import-export.test.ts**](browser-bookmark-import-export.test.ts) | Bookmark import/export |
| [**browser-history-ui.test.ts**](browser-history-ui.test.ts) | History UI |
| [**browser-history-persistence.test.ts**](browser-history-persistence.test.ts) | History persistence |
| [**browser-clear-history.test.ts**](browser-clear-history.test.ts) | Clear history |
| [**browser-url-validation.test.ts**](browser-url-validation.test.ts) | URL validation |

---

## Server Examples

| Example | Description |
|---------|-------------|
| [**server.js**](server.js) | Basic server |
| [**server-express.js**](server-express.js) | Express server |
| [**demo-server.ts**](demo-server.ts) | Demo server for testing |

---

## Utility Files

| File | Purpose |
|------|---------|
| [**minimal-test.js**](minimal-test.js) | Minimal test setup |
| [**browser-globals-test.ts**](browser-globals-test.ts) | Browser globals testing |

---

## Sub-Project Documentation

Several examples are full sub-projects with their own documentation:

| Directory | Description | README |
|-----------|-------------|--------|
| [**fyles/**](fyles/) | File manager application | [fyles/README.md](fyles/README.md) |
| [**slydes/**](slydes/) | Presentation slides app | See source files |
| [**svg-rendering/**](svg-rendering/) | SVG rendering utilities | [svg-rendering/README.md](svg-rendering/README.md) |
| [**terminal/**](terminal/) | Terminal emulator | [terminal/README.md](terminal/README.md) |
| [**image-viewer/**](image-viewer/) | Image viewer application | See source files |
| [**game-of-life/**](game-of-life/) | Conway's Game of Life | See source files |
| [**chess/**](chess/) | Chess game | See source files |
| [**solitaire/**](solitaire/) | Solitaire card game | See source files |
| [**pixeledit/**](pixeledit/) | Pixel editor | See source files |

---

## Screenshots

Screenshots are stored in `examples/screenshots/` for visual reference.

### Generating Screenshots

```bash
# Capture screenshot for a single example
TSYNE_HEADED=1 TAKE_SCREENSHOTS=1 npm test examples/01-hello-world.test.ts

# Capture all screenshots
for test in examples/{01..21}-*.test.ts; do
  TSYNE_HEADED=1 TAKE_SCREENSHOTS=1 npm test "$test"
done
```

---

## Attribution Summary

| Source | Examples | License |
|--------|----------|---------|
| **Original Tsyne** | 02-counter, 14-21, calculator, todomvc, tictactoe, MVC/MVP/MVVM patterns, widget demos, all utilities | MIT |
| **Ryelang/rye-fyne** | 01, 03, 04, 05, 07, 09, 10, 11, 12, 13 | Apache 2.0 |
| **fyne-io/terminal** | terminal/ | See original |
| **fyne-io/pixeledit** | pixeledit/ | See original |
| **fyne-io/solitaire** | solitaire/ | See original |
| **andydotxyz/chess** | chess/ | See original |

---

## Contributing

When adding new examples:
1. Include comprehensive tests
2. Add proper attribution if ported from another project
3. Document what the example demonstrates
4. Update this README with the new example
5. Keep examples simple and focused on specific concepts

---

## Learn More

- [Tsyne Documentation](../README.md)
- [LLM Quick Reference](../LLM.md)
- [MVC Pattern Guide](../more_mvc_like_for_todomvc_app.md)
- [Widget Reference](../src/widgets.ts)
