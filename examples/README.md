# Tsyne Examples

A comprehensive collection of showcase applications demonstrating Tsyne's capabilities, ranging from simple "Hello World" to complex multi-feature applications.

![Examples Banner](https://img.shields.io/badge/Examples-50+-blue) ![Tests](https://img.shields.io/badge/Tests-Comprehensive-green)

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

| Example | Description | Widgets | Attribution |
|---------|-------------|---------|-------------|
| **01-hello-world.ts** | Minimal Tsyne app structure | Label, VBox | Ryelang (Apache 2.0) |
| **02-counter.ts** | State management, event handling | Label, Button, HBox, VBox | Original |
| **03-button-spacer.ts** | Button interaction, layout spacing | Label, Button, VBox | Ryelang (Apache 2.0) |

### Intermediate (Multi-Widget Apps)

| Example | Description | Widgets | Attribution |
|---------|-------------|---------|-------------|
| **04-feedback-form.ts** | Multi-input forms, dropdowns, dialogs | Label, Select, MultilineEntry, Button, Dialog | Ryelang (Apache 2.0) |
| **05-live-clock.ts** | Real-time updates with intervals | Label, VBox | Ryelang (Apache 2.0) |
| **07-signup-form.ts** | Form validation, conditional UI | Entry, PasswordEntry, Checkbox, Button, Form, Dialog | Ryelang (Apache 2.0) |
| **09-players-list.ts** | Data display, list rendering | Label, List, HBox, VBox | Ryelang (Apache 2.0) |

### Advanced (Complex Features)

| Example | Description | Widgets | Attribution |
|---------|-------------|---------|-------------|
| **10-multiplication-table.ts** | Table widget, dynamic cell population | Table, Label | Ryelang (Apache 2.0) |
| **11-percentage-clock.ts** | Progress bars, time calculations | Label, ProgressBar, VBox | Ryelang (Apache 2.0) |
| **12-shopping-list.ts** | Dynamic list management, CRUD operations | Entry, Checkbox, Button, Scroll, VBox, HBox | Ryelang (Apache 2.0) |
| **13-tabbed-settings.ts** | Tabbed interface, settings panel | Tabs, Slider, Checkbox, Label, VBox | Ryelang (Apache 2.0) |

### Interactive Apps (14-21)

| Example | Description | Key Features | Attribution |
|---------|-------------|--------------|-------------|
| **14-color-mixer.ts** | RGB color mixing | Sliders, hex/RGB conversion, random generation | Original |
| **15-tip-calculator.ts** | Financial calculations | Entry validation, radio buttons, bill splitting | Original |
| **16-password-generator.ts** | Random generation | Character type toggles, length slider, validation | Original |
| **17-stopwatch.ts** | Time tracking | Start/Stop/Reset, lap times, millisecond precision | Original |
| **18-dice-roller.ts** | Random dice rolling | Configurable dice types (d4-d100), roll history | Original |
| **19-bmi-calculator.ts** | Health calculations | Metric/imperial units, BMI categories | Original |
| **20-rock-paper-scissors.ts** | Game with score tracking | Win/loss logic, score persistence | Original |
| **21-quiz-app.ts** | Multi-screen quiz | State machines, screen transitions, scoring | Original |

---

## Full Applications

### Games

| Application | Description | Attribution |
|-------------|-------------|-------------|
| **chess/** | Classic chess game with computer opponent | [andydotxyz/chess](https://github.com/andydotxyz/chess) |
| **solitaire/** | Klondike solitaire card game | [fyne-io/solitaire](https://github.com/fyne-io/solitaire) |
| **tictactoe.ts** | Tic-Tac-Toe game | Original |
| **tictactoe-accessible.ts** | Accessible Tic-Tac-Toe with screen reader support | Original |
| **tictactoe-braille.ts** | Tic-Tac-Toe with Braille display | Original |

### Productivity

| Application | Description | Attribution |
|-------------|-------------|-------------|
| **todomvc.ts** | Full TodoMVC implementation with MVC pattern | Original |
| **todomvc-when.ts** | TodoMVC with declarative when() visibility | Original |
| **calculator.ts** | Calculator with full operations | Original |
| **calculator-accessible.ts** | Accessible calculator with screen reader | Original |
| **calculator-fully-accessible.ts** | Fully accessible calculator | Original |

### Tools

| Application | Description | Attribution |
|-------------|-------------|-------------|
| **terminal/** | Terminal emulator demonstration | [fyne-io/terminal](https://github.com/fyne-io/terminal) |
| **pixeledit/** | Pixel-based image editor | [fyne-io/pixeledit](https://github.com/fyne-io/pixeledit) |

---

## Architectural Pattern Examples

Examples demonstrating different software architecture patterns.

| Example | Pattern | Description |
|---------|---------|-------------|
| **mvc-counter.ts** | MVC | Model-View-Controller with counter app |
| **mvp-login.ts** | MVP | Model-View-Presenter login form |
| **mvvm-todo.ts** | MVVM | Model-View-ViewModel todo list |
| **data-binding.ts** | Data Binding | Two-way data binding with ObservableState |

---

## Widget Demonstrations

Individual examples showcasing specific widgets.

### Layout Containers

| Example | Widgets Demonstrated |
|---------|---------------------|
| **hbox-example.ts** | HBox horizontal layout |
| **grid.ts** | Grid layout for calculator-style UIs |
| **grid-example.ts** | Additional grid examples |
| **scroll.ts** | Scrollable containers |
| **split.ts** | Split panes |
| **tabs.ts** | Tabbed containers |
| **form.ts** | Form layout |
| **form-styled.ts** | Styled form layouts |
| **form-unstyled.ts** | Unstyled form layouts |

### Input Widgets

| Example | Widgets Demonstrated |
|---------|---------------------|
| **counter.ts** | Button clicks, label updates |
| **checkbox.ts** | Checkbox state management |
| **radiogroup.ts** | Radio button groups |
| **slider.ts** | Slider value changes |
| **select.ts** | Dropdown selection |
| **input-widgets.ts** | Various input widgets |

### Display Widgets

| Example | Widgets Demonstrated |
|---------|---------------------|
| **hello.ts** | Basic label with styling |
| **list.ts** | List widget with selection |
| **table.ts** | Table widget with rows/columns |
| **progressbar.ts** | Progress bar updates |

### Advanced Widgets

| Example | Widgets Demonstrated |
|---------|---------------------|
| **advanced-widgets.ts** | Card, Accordion, Form, Center layout |
| **specialized-widgets.ts** | Specialized widget usage |
| **toolbar.ts** | Toolbar with actions and separators |
| **menu-bar.ts** | Menu bar with File/Edit/Help menus |

---

## Dialog Examples

| Example | Dialog Types |
|---------|-------------|
| **dialogs-info.ts** | Information and error dialogs |
| **dialogs-confirm.ts** | Confirmation dialogs (Yes/No) |
| **dialogs-file.ts** | File open and save dialogs |
| **dialog-state.ts** | Dialog state management |

---

## Browser Mode Examples

Tsyne's page-by-page browser mode inspired by the web.

### Browser Runner

| Example | Description |
|---------|-------------|
| **run-browser.ts** | Launch Tsyne Browser for manual testing |

### Page Examples (pages/)

| Page | Description |
|------|-------------|
| **pages/index.ts** | Browser home page |
| **pages/about.ts** | About page |
| **pages/contact.ts** | Contact form |
| **pages/form.ts** | Form example page |
| **pages/404.ts** | Not found page |
| **pages/thanks.ts** | Thank you page |
| **pages/hyperlinks.ts** | Navigation with hyperlinks |
| **pages/scrolling.ts** | Scrollable content |
| **pages/images.ts** | Image display |
| **pages/table-demo.ts** | Table widget demo |
| **pages/list-demo.ts** | List widget demo |
| **pages/fyne-widgets.ts** | Fyne widget showcase |
| **pages/layout-demo.ts** | Layout examples |
| **pages/text-features.ts** | Text formatting features |
| **pages/widget-interactions.ts** | Widget interaction demos |
| **pages/alerts-demo.ts** | Alert demonstrations |
| **pages/custom-alert.ts** | Custom alert dialogs |
| **pages/dynamic-demo.ts** | Dynamic content updates |
| **pages/context-menu-demo.ts** | Context menus |
| **pages/menu-demo.ts** | Menu demonstrations |
| **pages/post-demo.ts** | POST request handling |
| **pages/post-success.ts** | POST success page |
| **pages/url-fragments.ts** | URL fragment handling |

---

## Accessibility Examples

| Example | Description |
|---------|-------------|
| **accessibility-demo.ts** | Accessibility features demo |
| **tictactoe-accessible.ts** | Accessible game implementation |
| **calculator-accessible.ts** | Accessible calculator |
| **calculator-fully-accessible.ts** | Full accessibility support |

---

## Theme and Styling

| Example | Description |
|---------|-------------|
| **theme.ts** | Light/dark theme switching |
| **form-styled.ts** | Styled form examples |
| **form-styles.ts** | Form styling patterns |
| **shopping-cart-styles.ts** | Shopping cart with styles |

---

## Event Handling

| Example | Description |
|---------|-------------|
| **mouse-events-demo.ts** | Mouse events (onMouseIn, onMouseOut, etc.) |
| **test_click_card.ts** | Click event handling |
| **test_drag_card.ts** | Drag event handling |

---

## Window Management

| Example | Description |
|---------|-------------|
| **window-sizing.ts** | Window size configuration |

---

## Image Handling

| Example | Description |
|---------|-------------|
| **test-http-images.ts** | Loading images from HTTP |
| **test-updateimage.ts** | Dynamic image updates |

---

## Testing Examples

Examples focused on testing patterns and utilities.

| Example | Description |
|---------|-------------|
| **locators.test.ts** | Test locator patterns |
| **fluent-api.test.ts** | Fluent API testing |
| **fluent-properties.test.ts** | Fluent property testing |
| **entry-submit.test.ts** | Entry submit testing |
| **checkbox-test.test.ts** | Checkbox testing |
| **advanced-interactions.test.ts** | Advanced interaction testing |
| **capture-screenshots.ts** | Screenshot capture utility |
| **capture-screenshots-v2.ts** | Screenshot capture v2 |

---

## Browser Feature Tests

Test files for browser mode features.

| Test | Feature |
|------|---------|
| **browser.test.ts** | Core browser functionality |
| **browser-home.test.ts** | Home page navigation |
| **browser-enter-key.test.ts** | Enter key handling |
| **browser-status-bar.test.ts** | Status bar functionality |
| **browser-page-cache.test.ts** | Page caching |
| **browser-page-title.test.ts** | Page title updates |
| **browser-find.test.ts** | Find in page |
| **browser-bookmarks.test.ts** | Bookmark functionality |
| **browser-bookmark-import-export.test.ts** | Bookmark import/export |
| **browser-history-ui.test.ts** | History UI |
| **browser-history-persistence.test.ts** | History persistence |
| **browser-clear-history.test.ts** | Clear history |
| **browser-url-validation.test.ts** | URL validation |

---

## Server Examples

| Example | Description |
|---------|-------------|
| **server.js** | Basic server |
| **server-express.js** | Express server |
| **demo-server.ts** | Demo server for testing |

---

## Utility Files

| File | Purpose |
|------|---------|
| **minimal-test.js** | Minimal test setup |
| **browser-globals-test.ts** | Browser globals testing |

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
| **Original Tsyne** | 02-counter, 14-21, calculator, todomvc, tictactoe, MVC/MVP/MVVM patterns, widget demos | MIT |
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
