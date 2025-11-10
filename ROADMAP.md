# Tsyne Roadmap

This document tracks Fyne features that have been implemented in Tsyne and what's still TODO.

## Implementation Status

### ✅ Implemented

#### Core Infrastructure
- [x] Go bridge with JSON-RPC communication
- [x] TypeScript client library
- [x] Declarative API with builder pattern
- [x] Event handling and callbacks
- [x] Headless testing mode
- [x] npm packaging with platform binaries

#### Widgets
- [x] Button
- [x] Label
- [x] Entry (text input)

#### Layouts/Containers
- [x] VBox (vertical box)
- [x] HBox (horizontal box)

#### Testing
- [x] TsyneTest framework (Playwright-like)
- [x] Headed/headless modes
- [x] Widget selectors (by text, type)
- [x] Assertions (toHaveText, toBeVisible, etc.)
- [x] Jest integration for business logic

#### Documentation
- [x] README with examples
- [x] QUICKSTART guide
- [x] TESTING guide
- [x] ARCHITECTURE documentation
- [x] PUBLISHING guide
- [x] Example applications (simple & advanced calculators)

---

## 📋 TODO - Fyne Features Not Yet Wrapped

### High Priority - Core Widgets

#### Input Widgets
- [ ] **Checkbox** - Boolean toggle with label
  ```typescript
  checkbox("Accept terms", (checked) => { ... })
  ```

- [ ] **Radio** - Radio button groups
  ```typescript
  radioGroup(["Option 1", "Option 2"], (selected) => { ... })
  ```

- [ ] **Select** - Dropdown/combobox
  ```typescript
  select(["Red", "Green", "Blue"], (value) => { ... })
  ```

- [ ] **Slider** - Value slider
  ```typescript
  slider(0, 100, 50, (value) => { ... })
  ```

- [ ] **MultiLineEntry** - Multi-line text input
  ```typescript
  multiLineEntry("Enter multiple lines...")
  ```

- [ ] **PasswordEntry** - Password input field
  ```typescript
  passwordEntry("Enter password...")
  ```

#### Display Widgets
- [ ] **ProgressBar** - Progress indicator
  ```typescript
  progressBar(0.5)  // 50%
  progressBar()     // Infinite/indeterminate
  ```

- [ ] **ProgressBarInfinite** - Indeterminate progress
  ```typescript
  progressBarInfinite()
  ```

- [ ] **Separator** - Visual separator line
  ```typescript
  separator()
  ```

- [ ] **Hyperlink** - Clickable URL
  ```typescript
  hyperlink("Click here", "https://example.com")
  ```

- [ ] **Icon** - Icon display
  ```typescript
  icon(theme.InfoIcon())
  ```

- [ ] **Image** - Image from file/URL
  ```typescript
  image("/path/to/image.png")
  imageFromURL("https://example.com/image.png")
  ```

#### Complex Widgets
- [ ] **List** - Scrollable list with templates
  ```typescript
  list(items, (item) => label(item.name))
  ```

- [ ] **Table** - Grid of data
  ```typescript
  table(data, columns)
  ```

- [ ] **Tree** - Hierarchical tree view
  ```typescript
  tree(rootNode)
  ```

- [ ] **FileIcon** - File with icon
  ```typescript
  fileIcon("/path/to/file.txt")
  ```

- [ ] **Accordion** - Collapsible sections
  ```typescript
  accordion([
    { title: "Section 1", content: vbox(...) },
    { title: "Section 2", content: vbox(...) }
  ])
  ```

- [ ] **Card** - Card container with title
  ```typescript
  card("Title", "Subtitle", () => {
    vbox(() => { ... })
  })
  ```

- [ ] **Form** - Labeled form fields
  ```typescript
  form([
    { label: "Name", widget: entry() },
    { label: "Age", widget: entry() }
  ])
  ```

- [ ] **RichText** - Formatted text
  ```typescript
  richText([
    { text: "Bold", bold: true },
    { text: "Italic", italic: true }
  ])
  ```

---

### High Priority - Containers & Layouts

#### Container Widgets
- [ ] **Scroll** - Scrollable container
  ```typescript
  scroll(() => {
    vbox(() => {
      // Long content...
    })
  })
  ```

- [ ] **Split** - Resizable split pane
  ```typescript
  splitHorizontal(() => label("Left"), () => label("Right"))
  splitVertical(() => label("Top"), () => label("Bottom"))
  ```

- [ ] **AppTabs** - Tabbed interface
  ```typescript
  tabs([
    { title: "Tab 1", content: () => vbox(...) },
    { title: "Tab 2", content: () => vbox(...) }
  ])
  ```

#### Layout Types
- [ ] **GridLayout** - Grid with equal cells
  ```typescript
  grid(2, () => {  // 2 columns
    button("1")
    button("2")
    button("3")
    button("4")
  })
  ```

- [ ] **GridWrap** - Wrapping grid
  ```typescript
  gridWrap(3, () => { ... })  // 3 items per row
  ```

- [ ] **BorderLayout** - Positioned at edges
  ```typescript
  border({
    top: label("Header"),
    left: label("Sidebar"),
    center: label("Content"),
    right: label("Right"),
    bottom: label("Footer")
  })
  ```

- [ ] **CenterLayout** - Centered content
  ```typescript
  center(() => button("Centered"))
  ```

- [ ] **MaxLayout** - Full size children
  ```typescript
  max(() => {
    // Children fill entire space
  })
  ```

- [ ] **FormLayout** - Two-column form
  ```typescript
  formLayout(() => {
    formRow("Name:", entry())
    formRow("Age:", entry())
  })
  ```

- [ ] **PaddedLayout** - Add padding
  ```typescript
  padded(() => vbox(...))
  ```

---

### High Priority - Dialogs

- [ ] **Information Dialog**
  ```typescript
  showInfo("Title", "Message")
  ```

- [ ] **Error Dialog**
  ```typescript
  showError("Error", "Something went wrong")
  ```

- [ ] **Confirm Dialog**
  ```typescript
  confirm("Are you sure?", (confirmed) => { ... })
  ```

- [ ] **File Open Dialog**
  ```typescript
  openFile((file) => { ... })
  ```

- [ ] **File Save Dialog**
  ```typescript
  saveFile((file) => { ... })
  ```

- [ ] **Folder Dialog**
  ```typescript
  openFolder((folder) => { ... })
  ```

- [ ] **Color Picker**
  ```typescript
  pickColor((color) => { ... })
  ```

- [ ] **Custom Dialog**
  ```typescript
  dialog("Title", () => {
    vbox(() => { ... })
  }, {
    onConfirm: () => { ... },
    onCancel: () => { ... }
  })
  ```

---

### Medium Priority - Advanced Features

#### Menus
- [ ] **Menu Bar**
  ```typescript
  menuBar([
    menu("File", [
      menuItem("New", () => { ... }),
      menuSeparator(),
      menuItem("Exit", () => { ... })
    ]),
    menu("Edit", [...])
  ])
  ```

- [ ] **Context Menu**
  ```typescript
  contextMenu(widget, [
    menuItem("Copy", () => { ... }),
    menuItem("Paste", () => { ... })
  ])
  ```

#### Toolbar
- [ ] **Toolbar**
  ```typescript
  toolbar([
    toolbarAction("New", icon, () => { ... }),
    toolbarSeparator(),
    toolbarAction("Save", icon, () => { ... })
  ])
  ```

#### Canvas & Drawing
- [ ] **Canvas** - Direct drawing
  ```typescript
  canvas((context) => {
    context.drawLine(x1, y1, x2, y2)
    context.drawRectangle(x, y, w, h)
    context.drawCircle(x, y, radius)
  })
  ```

- [ ] **Custom Renderer** - Custom widget rendering
  ```typescript
  customWidget((canvas, size) => {
    // Custom drawing code
  })
  ```

#### Themes & Styling
- [ ] **Theme Support**
  ```typescript
  setTheme('dark')
  setTheme('light')
  ```

- [ ] **Custom Colors**
  ```typescript
  setColor(widget, color)
  ```

- [ ] **Font Customization**
  ```typescript
  setFont(widget, font)
  ```

#### Animation
- [ ] **Animation API**
  ```typescript
  animate(widget, {
    from: 0,
    to: 100,
    duration: 1000,
    onUpdate: (value) => { ... }
  })
  ```

---

### Medium Priority - Window Features

- [ ] **Window Sizing**
  ```typescript
  window({
    title: "App",
    width: 800,
    height: 600,
    minWidth: 400,
    minHeight: 300,
    maxWidth: 1200,
    maxHeight: 900
  })
  ```

- [ ] **Window Position**
  ```typescript
  setWindowPosition(x, y)
  centerWindow()
  ```

- [ ] **Window State**
  ```typescript
  maximizeWindow()
  minimizeWindow()
  fullscreenWindow()
  ```

- [ ] **Multiple Windows**
  ```typescript
  const win1 = window({ title: "Window 1" }, ...)
  const win2 = window({ title: "Window 2" }, ...)
  ```

- [ ] **Window Events**
  ```typescript
  onWindowClose(() => { ... })
  onWindowResize((width, height) => { ... })
  onWindowFocus(() => { ... })
  ```

---

### Lower Priority - Platform-Specific

#### System Tray
- [ ] **System Tray Icon**
  ```typescript
  systemTray({
    icon: icon,
    menu: [
      menuItem("Show", () => { ... }),
      menuItem("Quit", () => { ... })
    ]
  })
  ```

#### Notifications
- [ ] **Desktop Notifications**
  ```typescript
  notify("Title", "Message")
  ```

#### Clipboard
- [ ] **Clipboard Access**
  ```typescript
  copyToClipboard(text)
  pasteFromClipboard((text) => { ... })
  ```

#### Drag & Drop
- [ ] **Drag and Drop**
  ```typescript
  onDrop(widget, (files) => { ... })
  ```

---

### Testing Enhancements

#### TsyneTest Extensions
- [ ] **Screenshot Capture**
  ```typescript
  await ctx.screenshot("test-result.png")
  ```

- [ ] **Visual Regression Testing**
  ```typescript
  await ctx.expectScreenshotToMatch("baseline.png")
  ```

- [ ] **Video Recording**
  ```typescript
  const test = new TsyneTest({ record: true })
  ```

- [ ] **Accessibility Testing**
  ```typescript
  await ctx.expectAccessible()
  ```

- [ ] **Performance Profiling**
  ```typescript
  const metrics = await ctx.getPerformanceMetrics()
  ```

- [ ] **Network Request Mocking**
  ```typescript
  await ctx.mockRequest("/api/data", { data: [...] })
  ```

- [ ] **Custom Selectors**
  ```typescript
  ctx.getByTestId("submit-button")
  ctx.getByRole("button")
  ctx.getByLabel("Email")
  ```

---

## 🎯 Suggested Implementation Order

### Phase 1: Essential Widgets (1-2 weeks)
1. Checkbox
2. Select/Dropdown
3. ProgressBar
4. Scroll container
5. Grid layout

### Phase 2: Common Dialogs (1 week)
1. Info/Error dialogs
2. Confirm dialog
3. File open/save dialogs

### Phase 3: Advanced Widgets (2-3 weeks)
1. Table
2. List
3. Tabs (AppTabs)
4. Split containers
5. Radio buttons

### Phase 4: Polish (1-2 weeks)
1. Menu bar
2. Toolbar
3. Window sizing/positioning
4. Theme support

### Phase 5: Advanced Features (ongoing)
1. Canvas/drawing
2. Drag & drop
3. System tray
4. Animations
5. Custom widgets

---

## 🤝 Contributing

Want to help implement missing features? See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Adding a new widget typically involves:**

1. **Go bridge** (`bridge/main.go`):
   - Add `handleCreate{Widget}` function
   - Register in `handleMessage` switch
   - Set up event handlers

2. **TypeScript widget** (`src/widgets.ts`):
   - Create widget class extending `Widget`
   - Implement constructor with bridge communication
   - Add to container stack

3. **Export** (`src/index.ts`):
   - Export factory function
   - Add TypeScript types

4. **Tests**:
   - Add TsyneTest integration tests
   - Update examples

5. **Documentation**:
   - Update README
   - Add to examples

---

## 📊 Feature Parity Tracking

| Category | Fyne Features | Tsyne Features | Coverage |
|----------|---------------|---------------|----------|
| **Basic Widgets** | 20+ | 3 | 15% |
| **Containers** | 10+ | 2 | 20% |
| **Layouts** | 8+ | 2 | 25% |
| **Dialogs** | 10+ | 0 | 0% |
| **Menus** | 5+ | 0 | 0% |
| **Canvas** | Full API | 0 | 0% |
| **Themes** | Full API | 0 | 0% |
| **Testing** | Basic | Advanced | 120% ⭐ |

**Overall Coverage: ~15%**

*(Tsyne excels at testing with TsyneTest, but has limited widget coverage)*

---

## 🎓 Learning Resources

To implement new features, refer to:

- [Fyne Widget Documentation](https://developer.fyne.io/widget/)
- [Fyne Container Documentation](https://developer.fyne.io/container/)
- [Fyne Layout Documentation](https://developer.fyne.io/container/layouts)
- [Tsyne Architecture Guide](ARCHITECTURE.md)
- [Existing Widget Examples](src/widgets.ts)

---

## 📝 Notes

- **Testing First**: TsyneTest is actually more advanced than Fyne's built-in testing
- **Focus on Common**: Implement commonly-used widgets first
- **API Design**: Keep declarative, terse syntax
- **Examples**: Each new widget should have an example
- **Tests**: Each widget needs both Jest (if applicable) and TsyneTest coverage

---

## Version Goals

### v0.2.0 - Essential Widgets
- Checkbox, Select, ProgressBar
- Scroll container
- Grid layout
- Basic dialogs

### v0.3.0 - Advanced Widgets
- Table, List, Tabs
- Split containers
- Menu bar

### v0.4.0 - Polish & Themes
- Theme support
- Window management
- Toolbar

### v1.0.0 - Production Ready
- All common widgets
- Comprehensive documentation
- Full test coverage
- Stable API

---

**Last Updated:** 2025-11-09
**Current Version:** 0.1.0
**Next Milestone:** v0.2.0 - Essential Widgets
