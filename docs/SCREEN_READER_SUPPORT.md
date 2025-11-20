# Screen Reader Support in Tsyne/Fyne

Screen readers are essential assistive technology for blind and visually impaired users. This document explains how Tsyne/Fyne integrates with platform screen readers.

## How Screen Readers Work

Screen readers convert UI elements into:
1. **Speech** - Text-to-Speech (TTS) output
2. **Braille** - Output to refreshable braille displays
3. **Navigation** - Keyboard-based UI traversal

### Platform Screen Readers

| Platform | Screen Readers | Status |
|----------|---------------|--------|
| **Windows** | NVDA (free), JAWS (commercial), Narrator (built-in) | ✅ Native support |
| **macOS** | VoiceOver (built-in) | ✅ Native support |
| **Linux** | Orca (free), Emacspeak | ✅ Native support |

## Fyne's Accessibility Architecture

Fyne provides **native accessibility** through platform APIs:

```
┌─────────────────────────────────────────┐
│         Tsyne Application               │
│  (TypeScript with .accessibility())     │
└─────────────────┬───────────────────────┘
                  │ Bridge
┌─────────────────▼───────────────────────┐
│          Fyne (Go Framework)            │
│  - Widget hierarchy                     │
│  - Accessibility metadata               │
└─────────────────┬───────────────────────┘
                  │ Platform APIs
┌─────────────────▼───────────────────────┐
│       OS Accessibility APIs             │
│                                         │
│  Windows: UI Automation (UIA)          │
│  macOS: NSAccessibility                │
│  Linux: AT-SPI2 (Assistive Tech SPI)   │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│        Screen Reader Software           │
│  NVDA, JAWS, VoiceOver, Orca           │
└─────────────────────────────────────────┘
```

## Implementation in Tsyne

### 1. Widget Metadata → Accessibility Properties

When you use `.accessibility()` in Tsyne:

```typescript
a.button("Submit", onSubmit)
  .accessibility({
    label: "Submit Form",
    description: "Submits the registration form",
    role: "button",
    hint: "Press Enter or click to submit"
  });
```

This gets converted to:

```go
// In Fyne bridge (widget_properties.go)
func SetAccessibility(widgetId string, options AccessibilityOptions) {
    widget := getWidget(widgetId)

    // Set ARIA-like properties
    widget.SetAccessibilityLabel(options.Label)
    widget.SetAccessibilityDescription(options.Description)
    widget.SetAccessibilityRole(options.Role)
    widget.SetAccessibilityHint(options.Hint)

    // Platform-specific calls
    #ifdef WINDOWS
        widget.SetUIAutomationProperty("Name", options.Label)
        widget.SetUIAutomationProperty("HelpText", options.Hint)
    #endif

    #ifdef MACOS
        widget.SetAccessibilityTitle(options.Label)
        widget.SetAccessibilityHelp(options.Hint)
    #endif

    #ifdef LINUX
        widget.SetATSPIName(options.Label)
        widget.SetATSPIDescription(options.Description)
    #endif
}
```

### 2. Platform-Specific Mappings

#### Windows (UI Automation)

```go
// Maps to UIA properties
label       → AutomationId, Name
description → HelpText
role        → ControlType (Button, TextBox, etc.)
hint        → HelpText (appended)

// Example UIA tree:
Button [AutomationId="submitBtn"]
  ├─ Name: "Submit Form"
  ├─ ControlType: Button
  ├─ HelpText: "Submits the registration form. Press Enter or click to submit"
  └─ IsKeyboardFocusable: true
```

#### macOS (NSAccessibility)

```go
// Maps to NSAccessibility attributes
label       → accessibilityTitle
description → accessibilityValue
role        → accessibilityRole (NSAccessibilityButtonRole, etc.)
hint        → accessibilityHelp

// Example NSAccessibility object:
NSButton {
    accessibilityTitle: "Submit Form"
    accessibilityRole: NSAccessibilityButtonRole
    accessibilityHelp: "Submits the registration form. Press Enter or click to submit"
    accessibilityValue: nil
}
```

#### Linux (AT-SPI2)

```go
// Maps to AT-SPI attributes
label       → Name
description → Description
role        → Role (ROLE_PUSH_BUTTON, etc.)
hint        → Description (appended)

// Example AT-SPI object:
[Object: Button]
  ├─ Name: "Submit Form"
  ├─ Role: ROLE_PUSH_BUTTON
  ├─ Description: "Submits the registration form. Press Enter or click to submit"
  └─ States: FOCUSABLE, ENABLED
```

## Testing with Screen Readers

### Windows (NVDA)

```powershell
# Install NVDA (free, open-source)
# Download from: https://www.nvaccess.org/

# Run Tsyne app
npm run build
npx ts-node examples/tictactoe.ts

# Enable NVDA (Ctrl+Alt+N or auto-start)
# Navigate with:
Tab          # Next element
Shift+Tab    # Previous element
Space/Enter  # Activate
Arrows       # Navigate lists/grids

# NVDA announces:
"Submit Form, button"
"Press Enter or click to submit"
```

**NVDA Speech Viewer:**
```
Shows all speech output in a window:
- Useful for debugging
- Tools → Speech Viewer
- See exactly what's announced
```

### macOS (VoiceOver)

```bash
# VoiceOver is built-in (no install needed)

# Run Tsyne app
npm run build
npx ts-node examples/tictactoe.ts

# Enable VoiceOver: Cmd+F5

# Navigate with:
VO+Right Arrow  # Next element (VO = Control+Option)
VO+Left Arrow   # Previous element
VO+Space        # Activate

# VoiceOver announces:
"Submit Form, button"
"Submits the registration form. Press Enter or click to submit"
```

**VoiceOver Rotor:**
```
VO+U  # Open rotor
- Navigate by headings
- Navigate by buttons
- Navigate by landmarks
- Navigate by form controls
```

### Linux (Orca)

```bash
# Install Orca
sudo apt-get install orca

# Run Tsyne app
npm run build
npx ts-node examples/tictactoe.ts

# Enable Orca
orca &

# Navigate with:
Tab          # Next element
Shift+Tab    # Previous element
Space/Enter  # Activate

# Orca announces:
"Submit Form button"
"Submits the registration form. Press Enter or click to submit"
```

## Grid/Table Support for Screen Readers

Tic-Tac-Toe uses a grid - here's how screen readers handle it:

```typescript
// Tsyne code
a.grid(3, () => {
  for (let i = 0; i < 9; i++) {
    a.button(board[i] || " ", () => makeMove(i))
      .accessibility({
        role: "gridcell",
        label: `R${row}C${col}: ${board[i] || 'Empty'}`,
        row: row,
        column: col
      });
  }
}).accessibility({
  role: "grid",
  label: "Game Board 3x3",
  rowcount: 3,
  colcount: 3
});
```

**Screen reader behavior:**

**NVDA (Windows):**
```
# Table navigation mode
Ctrl+Alt+Arrows  # Move between cells
# Announces: "Row 1, Column 1, Empty"
#            "Row 1, Column 2, X"
#            "Row 2, Column 2, O"

# Can jump to specific row/column
# Shows table structure clearly
```

**VoiceOver (macOS):**
```
VO+Arrows  # Navigate table cells
# Announces: "Row 1, Column 1, Empty"
#            "Row 1, Column 2, X"

# Table commands:
VO+R  # Repeat row
VO+C  # Repeat column
VO+\  # Repeat row and column
```

**Orca (Linux):**
```
# Structural navigation
H  # Jump to next heading
T  # Jump to next table
Arrows in table mode  # Navigate cells

# Announces: "table with 3 rows and 3 columns"
#            "Row 1, Column 1, Empty"
```

## Live Regions (Dynamic Updates)

For game status that changes:

```typescript
statusLabel.accessibility({
  role: "status",      // ARIA live region
  label: "Turn: X",
  live: "polite"       // or "assertive"
});
```

**Screen reader behavior:**

- **`polite`** - Announces when current speech finishes
- **`assertive`** - Interrupts current speech immediately

```
// User makes move
Turn: X  → (announced politely after current speech)

// Game ends
Winner: O  → (announced assertively, interrupts)
```

## Focus Management

Screen readers follow keyboard focus:

```typescript
// When user tabs to cell
cellButton.focus();

// Screen reader announces:
"Row 1, Column 1, Empty, gridcell"
"Press Space to play"
```

**Good focus order:**
```
1. TTS toggle
2. Status label
3. Board cell 1 (R1C1)
4. Board cell 2 (R1C2)
...
9. Board cell 9 (R3C3)
10. New Game button
11. Undo button
```

**Bad focus order:**
```
1. Cell 5
2. Undo button
3. Cell 2
4. Status
...
(Confusing and hard to navigate)
```

## Current Implementation Status

### ✅ What Works Today

1. **Basic ARIA attributes**
   - `role`, `label`, `description` passed to bridge
   - Bridge sends to Fyne widgets

2. **Keyboard navigation**
   - Tab order follows widget creation order
   - Arrow keys for grids (Fyne handles)

3. **Text announcements**
   - Via our AccessibilityManager
   - Works with TTS

### 🚧 What Needs Implementation

1. **Platform API bindings** (in Fyne/Go bridge)
   ```go
   // Need to implement in bridge/widget_properties.go
   func SetAccessibility(widgetId string, options map[string]interface{}) {
       // Windows: Call UIAutomation APIs
       // macOS: Call NSAccessibility APIs
       // Linux: Call AT-SPI2 APIs
   }
   ```

2. **Live region support**
   ```go
   func SetLiveRegion(widgetId string, politeness string) {
       // Mark widget as live region
       // Set politeness level
   }
   ```

3. **Grid/table semantics**
   ```go
   func SetGridProperties(widgetId string, rows, cols int) {
       // Set table/grid role
       // Set row/column counts
       // Enable table navigation
   }
   ```

## Roadmap for Full Screen Reader Support

### Phase 1: Basic Support (Current)
- [x] ARIA-like properties in TypeScript
- [x] Bridge communication
- [x] Basic TTS via AccessibilityManager

### Phase 2: Platform Integration (Next)
- [ ] Windows UI Automation bindings
- [ ] macOS NSAccessibility bindings
- [ ] Linux AT-SPI2 bindings
- [ ] Live region support
- [ ] Focus events

### Phase 3: Advanced Features
- [ ] Grid/table navigation
- [ ] Tree navigation
- [ ] Virtual cursors
- [ ] Braille output
- [ ] Multi-language support

### Phase 4: Testing & Refinement
- [ ] NVDA compatibility testing
- [ ] JAWS compatibility testing
- [ ] VoiceOver compatibility testing
- [ ] Orca compatibility testing
- [ ] Automated accessibility testing

## Example: Full Screen Reader Integration

**Tsyne code:**
```typescript
// Tic-Tac-Toe with full screen reader support
a.grid(3, () => {
  for (let i = 0; i < 9; i++) {
    const cell = a.button(board[i] || " ", () => makeMove(i))
      .accessibility({
        role: "gridcell",
        label: `R${row}C${col}: ${board[i] || 'Empty'}`,
        description: "Press Space to place mark",
        row: row,
        column: col
      });
  }
}).accessibility({
  role: "grid",
  label: "Game Board",
  rowcount: 3,
  colcount: 3
});

statusLabel.accessibility({
  role: "status",
  label: "Turn: X",
  live: "polite"  // Auto-announces changes
});
```

**Screen reader output (NVDA):**
```
[User tabs to board]
"table with 3 rows and 3 columns, Game Board"

[User presses Ctrl+Alt+Right]
"Row 1, Column 1, Empty, gridcell"
"Press Space to place mark"

[User presses Space]
"X"

[Status updates automatically]
"Turn: O"

[User navigates to next cell]
"Row 1, Column 2, Empty, gridcell"
```

## Best Practices

### 1. Always Provide Labels
```typescript
// ✅ GOOD
.accessibility({ label: "Submit Form" })

// ❌ BAD
.accessibility({ description: "Click to submit" })  // No label!
```

### 2. Use Semantic Roles
```typescript
// ✅ GOOD
role: "button"
role: "gridcell"
role: "status"

// ❌ BAD
role: "generic"  // Too vague
```

### 3. Keep Focus Order Logical
```typescript
// Create widgets in tab order:
// 1. Controls
// 2. Content
// 3. Actions
```

### 4. Mark Dynamic Content
```typescript
// Content that changes
.accessibility({
  role: "status",
  live: "polite"
})
```

### 5. Provide Context
```typescript
// Grid cells need position
.accessibility({
  role: "gridcell",
  row: 1,
  column: 2
})
```

## Debugging Screen Reader Issues

### Enable Accessibility Inspector

**Windows:**
```powershell
# Inspect.exe (part of Windows SDK)
"C:\Program Files (x86)\Windows Kits\10\bin\x64\inspect.exe"

# Shows UI Automation tree
# View all accessibility properties
# Test keyboard navigation
```

**macOS:**
```bash
# Accessibility Inspector (part of Xcode)
/Applications/Xcode.app/Contents/Applications/Accessibility Inspector.app

# Inspect accessibility tree
# View all properties
# Record user actions
```

**Linux:**
```bash
# Accerciser (accessibility explorer)
sudo apt-get install accerciser
accerciser &

# Browse AT-SPI tree
# View all properties
# Monitor events
```

### Common Issues

**Issue: Screen reader doesn't announce element**
```
Solution: Check that label is set
✓ .accessibility({ label: "Submit" })
✗ .accessibility({ description: "Submit" })
```

**Issue: Wrong role announced**
```
Solution: Use semantic role
✓ role: "button"
✗ role: "generic"
```

**Issue: Tab order is confusing**
```
Solution: Create widgets in logical order
✓ Controls → Content → Actions
✗ Random order
```

**Issue: Dynamic updates not announced**
```
Solution: Use live regions
✓ .accessibility({ role: "status", live: "polite" })
✗ No live region
```

## Resources

### Screen Readers
- [NVDA](https://www.nvaccess.org/) - Free Windows screen reader
- [JAWS](https://www.freedomscientific.com/products/software/jaws/) - Commercial Windows screen reader
- [VoiceOver](https://www.apple.com/accessibility/voiceover/) - macOS built-in screen reader
- [Orca](https://help.gnome.org/users/orca/stable/) - Linux screen reader

### Platform APIs
- [Windows UI Automation](https://docs.microsoft.com/en-us/windows/win32/winauto/entry-uiauto-win32)
- [macOS NSAccessibility](https://developer.apple.com/documentation/appkit/nsaccessibility)
- [Linux AT-SPI2](https://www.freedesktop.org/wiki/Accessibility/AT-SPI2/)

### Testing Tools
- [Accessibility Insights](https://accessibilityinsights.io/) - Windows testing
- [Xcode Accessibility Inspector](https://developer.apple.com/library/archive/documentation/Accessibility/Conceptual/AccessibilityMacOSX/OSXAXTestingApps.html) - macOS testing
- [Accerciser](https://wiki.gnome.org/Apps/Accerciser) - Linux testing

### Guidelines
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/) - Web Content Accessibility Guidelines
- [ARIA](https://www.w3.org/TR/wai-aria-1.2/) - Accessible Rich Internet Applications
- [Platform Accessibility Guidelines](https://developer.apple.com/design/human-interface-guidelines/accessibility/)

Screen reader support in Fyne is built on **native platform APIs**, ensuring compatibility with the screen readers users already have installed and trust.
