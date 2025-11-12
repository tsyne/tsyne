# Fyne Feature Request: Keyboard Shortcuts for Menu Items

## Executive Summary

This document describes the need for keyboard shortcut (accelerator) support in Fyne menu items to enable standard browser keyboard shortcuts in the Tsyne Browser. This feature is common in desktop applications and would significantly improve the user experience.

## Use Case: Tsyne Browser

The Tsyne Browser is a desktop application built on Fyne that loads TypeScript pages from web servers (similar to how traditional browsers load HTML). Users expect standard browser keyboard shortcuts:

- **Ctrl+R / Cmd+R**: Reload current page
- **Alt+Left / Cmd+[**: Navigate back in history
- **Alt+Right / Cmd+]**: Navigate forward in history
- **Ctrl+W / Cmd+W**: Close tab/window
- **Ctrl+T / Cmd+T**: New tab
- **Ctrl+L / Cmd+L**: Focus address bar
- **Ctrl+F / Cmd+F**: Find in page
- **F5**: Reload (Windows standard)

Currently, these actions are only accessible via menu items or buttons, which is less efficient for power users.

## Current Fyne Limitation

Fyne's `fyne.MenuItem` struct does not expose a way to assign keyboard shortcuts to menu items. While Fyne has keyboard event handling via `fyne.KeyEvent`, there's no built-in mechanism to:

1. Associate keyboard shortcuts with menu items
2. Display shortcuts in menu UI (e.g., "Reload    Ctrl+R")
3. Handle platform-specific modifiers (Cmd on macOS vs Ctrl on Windows/Linux)
4. Manage shortcut conflicts automatically

## Proposed Fyne API Enhancement

### Option 1: Add Shortcut Field to MenuItem

```go
type MenuItem struct {
    Label      string
    Action     func()
    Checked    bool
    Disabled   bool
    Icon       fyne.Resource
    IsSeparator bool
    ChildMenu  *Menu
    Shortcut   Shortcut  // NEW: Keyboard shortcut for this item
}

type Shortcut struct {
    Key      fyne.KeyName
    Modifier fyne.KeyModifier  // Ctrl, Alt, Shift, Super (Cmd on Mac)
}
```

**Usage Example:**
```go
menuItem := fyne.NewMenuItem("Reload", func() {
    browser.reload()
})
menuItem.Shortcut = &fyne.Shortcut{
    Key:      fyne.KeyR,
    Modifier: fyne.KeyModifierControl,  // Auto-maps to Cmd on macOS
}
```

### Option 2: Use Existing desktop.Shortcut Interface

Fyne already has `desktop.Shortcut` and `desktop.CustomShortcut` in the `fyne.io/fyne/v2/driver/desktop` package. Extend `MenuItem` to support this:

```go
type MenuItem struct {
    // ... existing fields ...
    Shortcut desktop.Shortcut  // NEW: Use existing desktop shortcut interface
}
```

**Usage Example:**
```go
import "fyne.io/fyne/v2/driver/desktop"

menuItem := fyne.NewMenuItem("Reload", func() {
    browser.reload()
})
menuItem.Shortcut = &desktop.CustomShortcut{
    KeyName:  fyne.KeyR,
    Modifier: desktop.ControlModifier,
}
```

## Expected Behavior

When keyboard shortcuts are assigned to menu items:

1. **Visual Display**: Menu items show their shortcuts aligned to the right
   ```
   File
   ├─ New Tab          Ctrl+T
   ├─ Close Tab        Ctrl+W
   └─ Quit             Ctrl+Q

   View
   ├─ Reload           Ctrl+R
   ├─ Stop             Esc
   └─ Find in Page     Ctrl+F
   ```

2. **Global Shortcuts**: Shortcuts work even when focus is on other widgets (window-level capture)

3. **Platform Adaptation**:
   - Windows/Linux: Show "Ctrl"
   - macOS: Show "⌘" (Command symbol)
   - Auto-map Ctrl shortcuts to Cmd on macOS

4. **Conflict Detection**: Warn if multiple menu items use the same shortcut

5. **Disabled State**: When menu item is disabled, its shortcut is also disabled

## Implementation Notes for Tsyne Browser

Once Fyne supports menu shortcuts, the Tsyne Browser implementation would be:

### TypeScript API (window.ts)

```typescript
export interface MenuItemOptions {
  label: string;
  onSelected?: () => void;
  isSeparator?: boolean;
  disabled?: boolean;
  checked?: boolean;
  shortcut?: KeyboardShortcut;  // NEW
}

export interface KeyboardShortcut {
  key: string;           // "R", "T", "W", "F", "Left", "Right"
  ctrl?: boolean;        // Ctrl on Win/Linux, Cmd on Mac
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;        // Cmd on Mac, Win key on Windows
}
```

### Go Bridge (main.go)

```go
func (b *Bridge) handleSetMainMenu(msg Message) {
    // ... existing code ...

    // Parse shortcut if provided
    if shortcutData, ok := itemData["shortcut"].(map[string]interface{}); ok {
        key := shortcutData["key"].(string)

        var modifier desktop.Modifier
        if ctrl, _ := shortcutData["ctrl"].(bool); ctrl {
            modifier |= desktop.ControlModifier
        }
        if alt, _ := shortcutData["alt"].(bool); alt {
            modifier |= desktop.AltModifier
        }
        if shift, _ := shortcutData["shift"].(bool); shift {
            modifier |= desktop.ShiftModifier
        }

        menuItem.Shortcut = &desktop.CustomShortcut{
            KeyName:  parseKeyName(key),
            Modifier: modifier,
        }
    }
}

func parseKeyName(key string) fyne.KeyName {
    switch key {
    case "R": return fyne.KeyR
    case "T": return fyne.KeyT
    case "W": return fyne.KeyW
    case "F": return fyne.KeyF
    case "L": return fyne.KeyL
    case "Left": return fyne.KeyLeft
    case "Right": return fyne.KeyRight
    // ... etc
    default: return fyne.KeyUnknown
    }
}
```

### Browser Implementation (browser.ts)

```typescript
private async setupMenuBar(): Promise<void> {
    const menuDefinition: any[] = [
        {
            label: 'View',
            items: [
                {
                    label: 'Reload',
                    onSelected: () => this.reload(),
                    shortcut: { key: 'R', ctrl: true }  // NEW
                },
                {
                    label: 'Stop',
                    onSelected: () => this.stop(),
                    shortcut: { key: 'Escape' }
                },
                {
                    label: 'Find in Page',
                    onSelected: () => this.showFindDialog(),
                    shortcut: { key: 'F', ctrl: true }
                }
            ]
        },
        {
            label: 'History',
            items: [
                {
                    label: 'Back',
                    onSelected: () => this.back(),
                    shortcut: { key: 'Left', alt: true },
                    disabled: this.historyIndex <= 0
                },
                {
                    label: 'Forward',
                    onSelected: () => this.forward(),
                    shortcut: { key: 'Right', alt: true },
                    disabled: this.historyIndex >= this.history.length - 1
                }
            ]
        }
    ];

    await this.window.setMainMenu(menuDefinition);
}
```

## Workarounds (Current State)

Without native Fyne support, we've considered these workarounds:

1. **Canvas-level KeyEvent Handling**: Manually catch keyboard events at the canvas level
   - ❌ Complex to implement correctly
   - ❌ Doesn't show shortcuts in menus
   - ❌ Hard to avoid conflicts with widget focus

2. **Custom Window Wrapper**: Intercept keyboard events before they reach widgets
   - ❌ Platform-specific behavior is hard to match
   - ❌ Still no visual feedback in menus

3. **Documentation Only**: Tell users to use menus instead
   - ❌ Poor UX for power users
   - ❌ Doesn't meet user expectations for browser applications

## Similar Implementations

Other GUI frameworks provide this feature:

- **Electron**: Menu items have `accelerator` property (e.g., `accelerator: 'CommandOrControl+R'`)
- **Qt**: `QAction::setShortcut(QKeySequence::Refresh)`
- **GTK**: `gtk_accel_group_connect()` for menu accelerators
- **Swing**: `JMenuItem.setAccelerator(KeyStroke)`
- **WPF**: `MenuItem.InputGestureText` property

## Benefits to Fyne Ecosystem

This feature would benefit any Fyne application that uses menus:

- **Text Editors**: Ctrl+S (Save), Ctrl+O (Open), Ctrl+Z (Undo)
- **Image Viewers**: Ctrl++ (Zoom In), Ctrl+- (Zoom Out)
- **Email Clients**: Ctrl+N (New Message), Ctrl+R (Reply)
- **File Managers**: F5 (Refresh), Alt+Up (Parent Directory)
- **IDEs**: F5 (Run), F9 (Toggle Breakpoint), Ctrl+B (Build)

Standard keyboard shortcuts are a key part of desktop application UX.

## Testing Considerations

Once implemented, we would test:

1. **Cross-platform**: Verify Ctrl↔Cmd mapping works on macOS
2. **Visual Display**: Shortcuts appear correctly in menus
3. **Functionality**: Shortcuts trigger menu actions
4. **Disabled State**: Shortcuts respect menu item disabled state
5. **Conflicts**: Multiple shortcuts don't interfere
6. **Focus**: Shortcuts work regardless of widget focus

## References

- Tsyne Browser: https://github.com/paul-hammant/jyne
- Fyne Issue Tracker: https://github.com/fyne-io/fyne/issues
- Electron Accelerators: https://www.electronjs.org/docs/api/accelerator
- Qt Keyboard Shortcuts: https://doc.qt.io/qt-6/qkeysequence.html

## Questions for Fyne Team

1. Is this feature on the Fyne roadmap?
2. Which API approach (Option 1 vs Option 2) would you prefer?
3. Should shortcuts be window-scoped or application-scoped?
4. How should shortcut conflicts be handled?
5. Is there interest in a community contribution for this feature?

---

**Status**: Pending Fyne Support
**Priority**: Medium (P2 - Important but not blocking)
**Workaround Available**: No (without significant complexity)
**Contact**: paul-hammant (GitHub) for Tsyne Browser questions
