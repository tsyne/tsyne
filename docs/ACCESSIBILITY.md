# Tsyne Accessibility Guide

**Complete reference for building accessible Tsyne applications**

## Table of Contents

1. [Introduction](#introduction)
2. [Quick Start](#quick-start)
3. [Core API](#core-api)
4. [Essential Features](#essential-features)
5. [JavaScript Ecosystem Integration](#javascript-ecosystem-integration)
6. [Platform Support](#platform-support)
7. [Examples & Patterns](#examples--patterns)
8. [Testing](#testing)
9. [Resources](#resources)

---

## Introduction

Tsyne provides comprehensive accessibility support for building inclusive applications. Since Tsyne's authoring experience is **pure TypeScript/JavaScript**, you can leverage the entire web accessibility ecosystem while benefiting from native desktop performance through Fyne.

### Key Capabilities

- **Text-to-Speech (TTS)** - Web Speech API + native platform TTS
- **Screen Reader Support** - NVDA, VoiceOver, Orca integration
- **Braille Display Optimization** - Concise labels for refreshable braille
- **Internationalization** - RTL/LTR, non-Latin alphabets, phonetic guides
- **JavaScript Libraries** - Adapt focus-trap, aria-query, axe-core, react-aria
- **Keyboard Navigation** - Full keyboard control with custom shortcuts
- **High Contrast & Font Sizing** - Visual accessibility
- **Audio Feedback** - Non-visual interaction confirmation

---

## Quick Start

### 1. Basic TTS Example

```typescript
import { app, window, vbox, button, getAccessibilityManager } from 'tsyne';

const myApp = app({ title: "My App" }, (a) => {
  a.window({ title: "Accessible App" }, () => {
    a.vbox(() => {
      a.button("Click Me").onClick(() => { const manager = getAccessibilityManager((myApp as any).ctx);
        manager.announce("Button was clicked!"); });
    });
  });
});

// Enable accessibility
const manager = getAccessibilityManager((myApp as any).ctx);
manager.enable();
```

### 2. Adding Accessibility Metadata

```typescript
a.button("Submit").onClick(onSubmit)
  .withId('submitBtn')
  .accessibility({
    label: 'Submit Form',
    description: 'Submits the registration form',
    role: 'button',
    hint: 'Press Enter or click to submit'
  });
```

### 3. Toggle Accessibility On/Off

```typescript
function toggleAccessibility() {
  const manager = getAccessibilityManager((myApp as any).ctx);
  manager.toggle();

  const status = manager.isEnabled() ? "ON" : "OFF";
  toggleButton.setText(`Accessibility: ${status}`);
}
```

---

## Core API

### AccessibilityOptions Interface

```typescript
export interface AccessibilityOptions {
  // Basic ARIA
  label?: string;         // Concise widget name
  description?: string;   // Extended description for screen readers
  role?: string;         // ARIA role (button, textbox, navigation, etc.)
  hint?: string;         // Usage hint for assistive technologies

  // Extended properties (see International Accessibility)
  language?: string;           // ISO 639 code (e.g., 'en', 'ar', 'zh')
  direction?: 'ltr' | 'rtl';  // Text direction
  phonetic?: string;           // Pronunciation guide
  ruby?: Record<string, string>; // Ruby annotations for CJK
  row?: number;               // Grid row number
  column?: number;            // Grid column number
  rowcount?: number;          // Total rows
  colcount?: number;          // Total columns
  live?: 'polite' | 'assertive'; // Live region priority
}
```

### AccessibilityManager Methods

```typescript
class AccessibilityManager {
  enable(): void;                    // Enable accessibility mode
  disable(): void;                   // Disable accessibility mode
  toggle(): void;                    // Toggle on/off
  isEnabled(): boolean;              // Check status
  announce(text: string): void;      // TTS announcement
  stopSpeech(): void;                // Stop current speech
  announceWidget(widgetId: string): Promise<void>; // Announce with context
  registerWidget(widgetId: string, info: WidgetAccessibilityInfo): void;
  clear(): void;                     // Clear registered widgets
}
```

### Global Helper Functions

```typescript
import {
  getAccessibilityManager,
  enableAccessibility,
  disableAccessibility,
  toggleAccessibility
} from 'tsyne';

// Quick access
enableAccessibility(ctx);
disableAccessibility(ctx);
toggleAccessibility(ctx);
```

---

## Essential Features

Beyond basic TTS, comprehensive accessibility requires these features:

### 1. Keyboard Navigation & Shortcuts

**Why:** Many users cannot use a mouse due to motor disabilities, visual impairments, or preference.

**Implementation:**
```typescript
// Arrow key navigation for grids
function moveFocus(direction: 'up' | 'down' | 'left' | 'right') {
  const row = Math.floor(currentFocus / 3);
  const col = currentFocus % 3;

  let newRow = row, newCol = col;
  if (direction === 'up') newRow = Math.max(0, row - 1);
  if (direction === 'down') newRow = Math.min(2, row + 1);
  if (direction === 'left') newCol = Math.max(0, col - 1);
  if (direction === 'right') newCol = Math.min(2, col + 1);

  currentFocus = newRow * 3 + newCol;
  announce(`Focused on row ${newRow + 1}, column ${newCol + 1}`);
}

// Register keyboard shortcuts
widget.accessibility({
  label: 'Save Document',
  keyShortcuts: 'Ctrl+S'  // Announced to screen readers
});
```

### 2. High Contrast Mode

**Why:** Users with low vision or color blindness need strong color contrast.

```typescript
const highContrastStyles = {
  button: {
    background: '#000000',
    foreground: '#FFFFFF',
    border: '2px solid #FFFFFF'
  },
  display: {
    background: '#000000',
    foreground: '#00FF00',  // High visibility green
    font_style: FontStyle.BOLD
  }
};

function toggleHighContrast() {
  if (highContrastEnabled) {
    applyStyles(highContrastStyles);
    announce('High contrast mode enabled');
  } else {
    applyStyles(defaultStyles);
    announce('High contrast mode disabled');
  }
}
```

### 3. Font Size Controls

**Why:** Users with low vision need larger text.

```typescript
function setFontSize(size: 'small' | 'medium' | 'large' | 'xlarge') {
  const multiplier = {
    small: 0.75,
    medium: 1.0,
    large: 1.5,
    xlarge: 2.0
  }[size];

  styles({
    button: { font_size: 28 * multiplier },
    display: { font_size: 32 * multiplier }
  });

  announce(`Font size changed to ${size}`);
}
```

### 4. Audio/Haptic Feedback

**Why:** Confirms actions for users who can't see visual feedback.

```typescript
function playClickSound(type: 'number' | 'operator' | 'result') {
  const frequencies = {
    number: 440,    // A4
    operator: 523,  // C5
    result: 659     // E5
  };
  playTone(frequencies[type], 100); // 100ms duration
}

function handleButtonPress(value: string) {
  playClickSound('number');
  announce(value);
}
```

### 5. Live Regions (Dynamic Updates)

**Why:** Screen readers need to know about dynamic content changes.

```typescript
// Status updates (polite - doesn't interrupt)
statusLabel.accessibility({
  role: 'status',
  label: 'Game Status',
  live: 'polite'
});

// Urgent announcements (assertive - interrupts)
errorLabel.accessibility({
  role: 'alert',
  label: 'Error Message',
  live: 'assertive'
});

// Update content - screen reader auto-announces
statusLabel.setText('X wins!'); // Announced automatically
```

### 6. Focus Management & Trapping

**Why:** Modal dialogs need to trap focus and maintain keyboard navigation.

```typescript
// Use adapted focus-trap library (see JavaScript Ecosystem section)
import { createFocusTrap } from './accessibility/focus-trap';

const dialog = (ctx: Context) => {
  const trap = createFocusTrap(ctx, 'dialog-1', {
    escapeDeactivates: true,
    returnFocusOnDeactivate: true,
    onActivate: () => announce('Dialog opened'),
    onDeactivate: () => announce('Dialog closed')
  });

  return container(ctx, () => {
    label(ctx, 'Are you sure?');
    button(ctx, 'OK').withId('ok-btn').onClick(() => {
      trap.deactivate();
    });
    button(ctx, 'Cancel').withId('cancel-btn').onClick(() => {
      trap.deactivate();
    });
  });

  trap.updateTabbableWidgets();
  trap.activate();
};
```

### 7. ARIA Validation

**Why:** Ensure proper ARIA usage and WCAG compliance.

```typescript
import { getAriaValidator } from './accessibility/aria-validator';

const validator = getAriaValidator();

// Validate role and attributes
const result = validator.validate('gridcell', {
  row: 1,
  column: 2,
  ariaLabel: 'Cell at row 1, column 2'
});

if (!result.valid) {
  console.error('ARIA Errors:', result.errors);
  // ["Role 'gridcell' requires property 'aria-selected'"]
}

// Get required properties
const required = validator.getRequiredProps('gridcell');
```

### 8. Mouse Hover Announcements

**Why:** Users with low vision who use screen magnifiers or partial sight benefit from audio announcements when hovering over UI elements.

**Implementation:**

Use the `hoverable()` container to wrap widgets and provide custom hover callbacks.

**Option 1: Fluent API (Recommended)**

```typescript
import { app, getAccessibilityManager } from 'tsyne';

const myApp = app({ title: "App" }, (a) => {
  const manager = getAccessibilityManager((myApp as any).ctx);

  a.window({ title: "Hover Demo" }, () => {
    a.vbox(() => {
      // Fluent API - chain methods as needed
      a.hoverable(() => {
        a.button("Submit").onClick(() => submitForm())
          .accessibility({
            label: "Submit Form",
            description: "Click to submit the registration form",
            role: "button"
          });
      })
      .onMouseIn((event) => {
        // event.position contains { x, y } coordinates
        manager.announce("Submit button. Click to submit form.", 'polite');
      })
      .onMouseOut(() => {
        // Optional exit announcement
      })
      .onMouseMove((event) => {
        // Track mouse movement within the widget
        console.log(`Mouse at ${event.position.x}, ${event.position.y}`);
      });

      // Or use just the methods you need
      a.hoverable(() => {
        a.label("Hover over me");
      })
      .onMouseIn(() => {
        manager.announce("Label hovered", 'polite');
      });
    });
  });
});
```

**Option 2: Constructor Callbacks**

```typescript
// Pass callbacks directly to constructor
a.hoverable(
  () => {
    a.button("Submit").onClick(() => submitForm())
      .accessibility({
        label: "Submit Form",
        role: "button"
      });
  },
  () => {
    // On mouse enter
    manager.announce("Submit button", 'polite');
  },
  () => {
    // On mouse exit (optional)
  }
);

      // Hover announcements for grid cells (e.g., Tic-Tac-Toe)
      a.grid(3, () => {
        for (let i = 0; i < 9; i++) {
          const position = getPositionDescription(i);
          const cellState = board[i] || 'empty';

          a.hoverable(
            () => {
              a.button(board[i]).onClick(() => makeMove(i))
                .accessibility({
                  label: position,
                  description: `Cell at ${position}`,
                  role: "button"
                });
            },
            () => {
              // Announce position and current state on hover
              manager.announce(`${position}, currently ${cellState}`, 'polite');
            }
          );
        }
      });

      // Status label with hover announcement
      a.hoverable(
        () => {
          statusLabel = a.label("Player X's turn")
            .accessibility({
              label: "Game Status",
              role: "status"
            });
        },
        () => {
          // Read current status when user hovers
          const status = statusLabel.getText ? statusLabel.getText() : "Player X's turn";
          manager.announce(`Game status: ${status}`, 'polite');
        }
      );
    });
  });
});
```

**Key Points:**
- `hoverable(builder)` creates a container that wraps exactly one child widget
- **Fluent API methods:**
  - `.onMouseIn(callback)` - triggered when mouse enters, receives event with position
  - `.onMouseOut(callback)` - triggered when mouse exits
  - `.onMouseMove(callback)` - triggered when mouse moves, receives event with position
  - `.on(eventType, callback)` - catch-all for any event type
- All fluent methods are optional and chainable
- Works with any widget type (buttons, labels, entries, etc.)
- Combines with `.accessibility()` for comprehensive screen reader support
- Use `'polite'` announcements to avoid interrupting other speech
- Event data includes mouse position: `{ position: { x, y } }`
- Can access dynamic state (e.g., board positions, form values) in callbacks

**Example: Responsive Grid Cells**

```typescript
// Tic-Tac-Toe board with hover announcements using fluent API
a.grid(3, () => {
  for (let i = 0; i < 9; i++) {
    const position = getCellDescription(i);  // "top left", "center", etc.

    a.hoverable(() => {
      cellButtons[i] = a.button(" ", () => makeMove(i), "cell")
        .accessibility({
          label: position,
          role: "button",
          hint: "Use arrow keys to navigate, Space to select"
        });
    })
    .onMouseIn(() => {
      // Announce position and state dynamically
      const state = board[i] || 'empty';
      announce(`${position}, currently ${state}`, 'polite');
    });
  }
});
```

**Advanced Example: Custom Event Handling**

```typescript
// Use the catch-all .on() method for custom events
a.hoverable(() => {
  a.label("Drag me");
})
.on('mouseIn', (event) => {
  console.log('Mouse entered at', event.position);
})
.on('mouseMove', (event) => {
  console.log('Mouse moved to', event.position);
})
.on('mouseOut', () => {
  console.log('Mouse exited');
});
```

---

## JavaScript Ecosystem Integration

// Get supported properties
const supported = validator.getSupportedProps('gridcell');
// ['aria-readonly', 'aria-required', 'aria-selected', ...]
```

---

## JavaScript Ecosystem Integration

### Key Insight

Since Tsyne's authoring layer is **pure TypeScript/JavaScript**, we're not limited to Fyne's accessibility features. We can leverage the rich web accessibility ecosystem, adapting libraries to work through our bridge architecture.

### Architecture

```
┌─────────────────────────────────────────┐
│   TypeScript Application Layer          │
│  • Web a11y libraries (adapted)         │
│  • ARIA pattern implementations         │
│  • Focus management, keyboard nav       │
└──────────────┬──────────────────────────┘
               │ Enhanced metadata
               ▼
┌─────────────────────────────────────────┐
│   Tsyne Bridge Layer                    │
│  • Transforms web a11y concepts         │
│  • Maps ARIA to platform APIs           │
└──────────────┬──────────────────────────┘
               │ Platform-specific calls
               ▼
┌─────────────────────────────────────────┐
│   Fyne / Platform Native                │
│  • NVDA/VoiceOver/Orca                  │
└─────────────────────────────────────────┘
```

### Adaptable Libraries

#### 1. focus-trap (Focus Management)

**Original:** DOM-centric focus trapping for modals
**Adapted:** Works with Tsyne widget tree

See: `src/accessibility/focus-trap.ts`

```typescript
import { createFocusTrap } from './accessibility/focus-trap';

const trap = createFocusTrap(ctx, 'dialog-1', {
  initialFocus: 'ok-button',
  escapeDeactivates: true,
  returnFocusOnDeactivate: true
});

trap.activate();  // Trap focus in dialog
// User can only Tab between widgets inside dialog
trap.deactivate(); // Release focus
```

#### 2. aria-query (ARIA Specification Database)

**Original:** Complete ARIA role/property definitions
**Adapted:** Validate Tsyne widget accessibility

See: `src/accessibility/aria-validator.ts`

```typescript
import { getAriaValidator } from './accessibility/aria-validator';

const validator = getAriaValidator();

// Validate hierarchy
const hierarchyResult = validator.validateHierarchy(
  'gridcell',    // Widget role
  'row',         // Parent role
  []             // Child roles
);

// Check required context
const requiredContext = validator.getRequiredContext('menuitem');
// ['menu', 'menubar']

// Check required children
const requiredOwned = validator.getRequiredOwned('listbox');
// ['option']
```

#### 3. axe-core (Accessibility Testing)

**Original:** Automated accessibility auditing
**Future:** Adapt to audit Tsyne widget tree

```typescript
import { TsyneAccessibilityAuditor } from './accessibility/axe-adapter';

const auditor = new TsyneAccessibilityAuditor(ctx);
const results = await auditor.audit();

console.log('Violations:', results.violations.length);
results.violations.forEach(violation => {
  console.error(`[${violation.id}] ${violation.description}`);
});
```

#### 4. react-aria (ARIA Pattern Implementations)

**Original:** React hooks for ARIA patterns
**Future:** Adapt patterns to Tsyne widgets

```typescript
// Future: ARIA combobox pattern
import { useTsyneCombobox } from './tsyne-aria/combobox';

const { ariaProps, keyboardHandlers } = useTsyneCombobox({
  options: ['Apple', 'Banana', 'Cherry'],
  onSelect: (value) => console.log(value)
});

widget.accessibility(ariaProps);
widget.onKeyDown(keyboardHandlers.onKeyDown);
```

### Forking Strategy

When adapting DOM-centric libraries:

1. **Create abstraction layer** - `TsyneDOMAdapter` mimics DOM API
2. **Replace DOM references** - `HTMLElement` → `VirtualElement`
3. **Map events** - DOM events → Bridge events
4. **Preserve logic** - Keep accessibility algorithms intact

Example:

```typescript
// Original (DOM)
function focusFirstDescendant(element: HTMLElement): boolean {
  for (let i = 0; i < element.childNodes.length; i++) {
    if (attemptFocus(element.childNodes[i])) return true;
  }
  return false;
}

// Adapted (Tsyne)
function focusFirstDescendant(element: VirtualElement): boolean {
  for (let i = 0; i < element.children.length; i++) {
    if (attemptFocus(element.children[i])) return true;
  }
  return false;
}
```

---

## Platform Support

### Screen Readers

Tsyne supports the major screen readers through platform APIs:

#### Windows - NVDA & JAWS
- **Platform API:** UI Automation (UIA)
- **Fyne Integration:** Exposes widgets as UIA elements
- **ARIA Mapping:** `role="button"` → `UIA_ButtonControlTypeId`

#### macOS - VoiceOver
- **Platform API:** NSAccessibility
- **Fyne Integration:** Implements `NSAccessibility` protocol
- **ARIA Mapping:** `role="button"` → `NSAccessibilityButtonRole`

#### Linux - Orca
- **Platform API:** AT-SPI2 (Assistive Technology Service Provider Interface)
- **Fyne Integration:** D-Bus communication with AT-SPI2
- **ARIA Mapping:** `role="button"` → `ATSPI_ROLE_PUSH_BUTTON`

### Testing with Screen Readers

**Windows (NVDA):**
```bash
# 1. Download NVDA: https://www.nvaccess.org/download/
# 2. Run your Tsyne app
# 3. Start NVDA
# 4. Navigate with Tab/Arrow keys
# 5. Listen for announcements
```

**macOS (VoiceOver):**
```bash
# 1. System Settings → Accessibility → VoiceOver → Enable
# 2. Or press: Cmd + F5
# 3. Run your Tsyne app
# 4. Navigate with VO keys (Ctrl+Option + arrows)
```

**Linux (Orca):**
```bash
# 1. Install Orca
sudo apt-get install orca

# 2. Run your Tsyne app
# 3. Start Orca
orca

# 4. Navigate with Tab/Arrow keys
```

### Braille Display Optimization

Braille users read at **100-125 words per minute** (vs 250-400 wpm for audio). Labels must be concise.

#### Best Practices

```typescript
// ❌ TOO VERBOSE (33 characters)
.accessibility({
  label: 'Cell at top left has X placed'
})

// ✅ CONCISE (11 characters)
.accessibility({
  label: 'R1C1: X',
  description: 'Top left cell, X has been placed here'  // For audio
})
```

#### Braille-Optimized Labels

| Context | Verbose (Audio) | Concise (Braille) | Savings |
|---------|-----------------|-------------------|---------|
| Grid cell | "Cell at row 1, column 1" (26) | "R1C1" (4) | 85% |
| Game status | "Player X's turn" (15) | "Turn: X" (7) | 53% |
| Move | "X placed at top left" (21) | "X TL" (4) | 81% |
| Button | "Submit Registration Form" (26) | "Submit" (6) | 77% |

#### Implementation

```typescript
// Dual-mode labels
widget.accessibility({
  label: 'R1C1: X',                      // Braille-optimized
  description: 'Top left cell, X placed' // Screen reader details
});

// Grid structure for efficient navigation
grid.accessibility({
  role: 'grid',
  rowcount: 3,
  colcount: 3
});

cell.accessibility({
  role: 'gridcell',
  row: 1,
  column: 1,
  label: 'R1C1: X'  // Screen reader announces: "Row 1, column 1, R1C1: X"
});
```

### International Accessibility

#### RTL (Right-to-Left) Languages

Arabic, Hebrew, Persian, Urdu read right-to-left:

```typescript
// Arabic UI
widget.accessibility({
  label: 'إرسال',  // "Submit" in Arabic
  direction: 'rtl',
  language: 'ar'
});
```

#### Non-Latin Alphabets

**Problem:** Screen readers may mispronounce non-Latin text.

**Solution:** Provide phonetic guides and ruby annotations.

```typescript
// Chinese with pinyin
widget.accessibility({
  label: '提交',  // "Submit" in Chinese
  phonetic: 'tí jiāo',  // Pinyin pronunciation
  language: 'zh',
  ruby: {
    '提': 'tí',
    '交': 'jiāo'
  }
});

// Japanese with furigana
widget.accessibility({
  label: '送信',  // "Submit" in Japanese
  phonetic: 'そうしん',  // Hiragana
  language: 'ja',
  ruby: {
    '送': 'そう',
    '信': 'しん'
  }
});

// Thai with tone marks
widget.accessibility({
  label: 'ส่ง',  // "Submit" in Thai
  language: 'th',
  wordBoundaries: [0, 3]  // Thai has no spaces between words
});
```

#### Braille Codes by Language

| Language | Braille Code | Notes |
|----------|--------------|-------|
| English | Grade 2 Braille | Contracted (abbreviations) |
| Arabic | Arabic Braille | RTL direction |
| Chinese | Chinese Braille | Phonetic (Pinyin-based) |
| Japanese | Japanese Braille | Phonetic (Kana-based) |
| Russian | Russian Braille | Cyrillic alphabet |

```typescript
// Specify braille table
widget.accessibility({
  label: '提交',
  language: 'zh',
  brailleTable: 'zh-cn'  // Chinese braille
});
```

---

## Examples & Patterns

### Example 1: Accessible Calculator

**Features:** TTS, keyboard shortcuts, high contrast, font sizing

See: `examples/calculator-fully-accessible.ts`

```typescript
const calculator = window(ctx, 'Calculator', () => {
  vbox(() => {
    // Display with live region
    entry(display).accessibility({
      label: 'Calculator Display',
      description: 'Shows current value and calculation results',
      role: 'status',
      live: 'polite'
    });

    // Number buttons with keyboard shortcuts
    for (let i = 0; i <= 9; i++) {
      button(String(i), () => handleNumber(i))
        .accessibility({
          label: `Number ${i}`,
          keyShortcuts: String(i)
        });
    }

    // Operator buttons
    button('+', () => handleOperator('+'))
      .accessibility({
        label: 'Add',
        keyShortcuts: '+'
      });

    // Toggle accessibility
    button('TTS: OFF', toggleAccessibility)
      .accessibility({
        label: 'Toggle Accessibility',
        hint: 'Press T to toggle'
      });
  });
});
```

### Example 2: Accessible Tic-Tac-Toe

**Features:** 2D navigation, spatial context, move history, hints

See: `examples/tictactoe.ts`

**Why Tic-Tac-Toe?** Games demonstrate:
- **Spatial navigation** (2D grid with arrow keys)
- **Game state tracking** (whose turn, who won)
- **Position descriptions** (dual format: "top left" + "R1C1")
- **Move history** (full transcript)
- **Strategic hints** (AI suggestions)

```typescript
// Grid navigation
function getCellDescription(index: number): string {
  const positions = [
    'top left', 'top center', 'top right',
    'middle left', 'center', 'middle right',
    'bottom left', 'bottom center', 'bottom right'
  ];
  return positions[index];
}

function getCellCoordinates(index: number): string {
  const row = Math.floor(index / 3) + 1;
  const col = (index % 3) + 1;
  return `row ${row}, column ${col}`;
}

// Cell with rich ARIA
button(' ', () => makeMove(i), 'cell')
  .accessibility({
    label: `Cell at ${getCellDescription(i)}`,
    description: `${getCellCoordinates(i)}. Press Space to place your mark.`,
    role: 'gridcell',
    row: Math.floor(i / 3) + 1,
    column: (i % 3) + 1,
    hint: 'Use arrow keys to navigate grid'
  });

// Game status with priority
statusLabel.accessibility({
  label: 'Game Status',
  role: 'status',
  live: 'assertive'  // Interrupt for important updates (wins, errors)
});

// Move history
historyLabel.accessibility({
  label: 'Move History',
  role: 'log'  // Screen reader can review moves
});
```

### Example 3: Accessible Form

**Features:** Focus trap, validation, live regions

```typescript
import { createFocusTrap } from './accessibility/focus-trap';
import { getAriaValidator } from './accessibility/aria-validator';

const form = landmarkContainer(ctx, LandmarkRole.Form, 'Contact Form', () => {
  const trap = createFocusTrap(ctx, 'form-1');
  const validator = getAriaValidator();

  // Heading
  label(ctx, 'Contact Us').accessibility({
    role: 'heading',
    level: 1
  });

  // Name field
  const nameEntry = entry(ctx, '')
    .withId('name-field')
    .accessibility({
      label: 'Full Name',
      role: 'textbox',
      ariaRequired: true,
      ariaInvalid: false,
      hint: 'Enter your full name'
    });
  trap.addFocusableWidget('name-field');

  // Email with validation
  const emailEntry = entry(ctx, '')
    .withId('email-field')
    .accessibility({
      label: 'Email Address',
      role: 'textbox',
      ariaRequired: true,
      ariaDescribedBy: 'email-error'
    })
    .onChange((value) => {
      if (!isValidEmail(value)) {
        errorLabel.setText('Invalid email format');
        emailEntry.accessibility({ ariaInvalid: true });
        announce('Invalid email format');
      } else {
        errorLabel.setText('');
        emailEntry.accessibility({ ariaInvalid: false });
      }
    });
  trap.addFocusableWidget('email-field');

  // Error message (live region)
  const errorLabel = label(ctx, '')
    .withId('email-error')
    .accessibility({
      role: 'alert',
      live: 'polite'
    });

  // Submit button
  button(ctx, 'Submit')
    .withId('submit-btn')
    .accessibility({
      label: 'Submit Contact Form',
      keyShortcuts: 'Ctrl+Enter'
    })
    .onClick(() => {
      if (validator.validateForm('form-1')) {
        announce('Form submitted successfully');
        trap.deactivate();
      }
    });
  trap.addFocusableWidget('submit-btn');

  trap.trapFocus();
});
```

### Landmark Regions (Navigation)

**Why:** Screen reader users navigate by landmarks (header, nav, main, footer).

```typescript
export enum LandmarkRole {
  Banner = 'banner',          // Header/logo
  Navigation = 'navigation',  // Nav menus
  Main = 'main',             // Primary content
  Complementary = 'complementary', // Sidebars
  Contentinfo = 'contentinfo', // Footer
  Search = 'search',          // Search
  Form = 'form',             // Forms
  Region = 'region'          // Generic
}

function landmarkContainer(
  ctx: Context,
  role: LandmarkRole,
  label: string,
  build: () => void
): Widget {
  return container(ctx, build).accessibility({
    role: role,
    label: label
  });
}

// Usage
const app = window(ctx, 'App', () => {
  landmarkContainer(ctx, LandmarkRole.Banner, 'Header', () => {
    label(ctx, 'My App').accessibility({ role: 'heading', level: 1 });
  });

  landmarkContainer(ctx, LandmarkRole.Navigation, 'Main Navigation', () => {
    button(ctx, 'Home');
    button(ctx, 'About');
    button(ctx, 'Contact');
  });

  landmarkContainer(ctx, LandmarkRole.Main, 'Main Content', () => {
    // App content
  });

  landmarkContainer(ctx, LandmarkRole.Contentinfo, 'Footer', () => {
    label(ctx, '© 2025 My App');
  });
});
```

---

## Testing

### Automated Testing

#### Unit Tests

```typescript
import { getAccessibilityManager } from 'tsyne';

test('accessibility can be enabled', () => {
  const manager = getAccessibilityManager(ctx);
  manager.enable();
  expect(manager.isEnabled()).toBe(true);
});

test('announcements work', () => {
  const manager = getAccessibilityManager(ctx);
  manager.enable();

  const spy = jest.spyOn(manager, 'announce');
  manager.announce('Test announcement');

  expect(spy).toHaveBeenCalledWith('Test announcement');
});
```

#### ARIA Validation Tests

```typescript
import { getAriaValidator } from './accessibility/aria-validator';

test('validates required ARIA props', () => {
  const validator = getAriaValidator();

  const result = validator.validate('checkbox', {});
  expect(result.valid).toBe(false);
  expect(result.errors).toContain('Role "checkbox" requires property "aria-checked"');
});

test('validates ARIA hierarchy', () => {
  const validator = getAriaValidator();

  const result = validator.validateHierarchy('menuitem', 'button', []);
  expect(result.valid).toBe(false);
  expect(result.errors[0]).toContain('requires parent role: menu, menubar');
});
```

### Manual Testing

#### Keyboard Navigation Test

```
✓ Can you navigate the entire UI with Tab/Arrow keys?
✓ Can you activate all buttons with Space/Enter?
✓ Can you see which element has focus?
✓ Does Tab order make sense (left-to-right, top-to-bottom)?
✓ Can you exit modals with Escape?
```

#### Screen Reader Test (NVDA/VoiceOver/Orca)

```
✓ Does it announce widget labels?
✓ Does it announce widget roles?
✓ Does it announce state changes (selected, checked)?
✓ Can you navigate by landmarks (H/D/R keys)?
✓ Are dynamic updates announced (live regions)?
```

#### Low Vision Test

```
✓ Can you read everything at 200% zoom?
✓ Is high contrast mode clear (7:1 ratio)?
✓ Can you enlarge font size?
✓ Are focus indicators visible (3px minimum)?
```

#### Audio-Only Test

```
✓ Can you use the app with eyes closed?
✓ Do buttons have distinct sounds?
✓ Are errors audibly announced?
✓ Can you understand TTS announcements?
```

#### Braille Display Test

```
✓ Are labels under 40 characters (fit on display)?
✓ Is front-loaded information (status first)?
✓ Can you navigate grid by row/column?
✓ Is grid structure announced (role="grid")?
```

### Accessibility Checklist

- [ ] All interactive widgets have labels
- [ ] Keyboard navigation works everywhere
- [ ] Focus indicators are visible
- [ ] High contrast mode available
- [ ] Font size can be increased
- [ ] ARIA roles assigned correctly
- [ ] ARIA required props present
- [ ] Live regions for dynamic content
- [ ] Error messages are clear
- [ ] Forms have validation feedback
- [ ] Modals trap focus
- [ ] Landmarks for page structure
- [ ] Heading hierarchy (h1 → h2 → h3)
- [ ] Images have text alternatives
- [ ] Color not sole indicator
- [ ] TTS toggle available
- [ ] Screen reader tested (NVDA/VoiceOver/Orca)
- [ ] Braille labels optimized (<40 chars)
- [ ] International support (RTL/phonetics if needed)

---

## Resources

### Documentation

- **Tsyne Examples**
  - `examples/calculator-fully-accessible.ts` - Comprehensive calculator
  - `examples/tictactoe.ts` - Spatial game with 2D navigation
  - `examples/accessibility-demo.ts` - Basic TTS demo

- **Adapted Libraries**
  - `src/accessibility/focus-trap.ts` - Focus management
  - `src/accessibility/aria-validator.ts` - ARIA validation

### External Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) - Web Content Accessibility Guidelines
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) - ARIA design patterns
- [NVDA Screen Reader](https://www.nvaccess.org/) - Free Windows screen reader
- [WebAIM](https://webaim.org/) - Accessibility resources and tools
- [axe DevTools](https://www.deque.com/axe/devtools/) - Accessibility testing
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Braille Authority of North America](http://www.brailleauthority.org/)

### Screen Reader Commands

**NVDA (Windows):**
- `Insert + Down Arrow` - Read current item
- `H` - Next heading
- `D` - Next landmark
- `F` - Next form field
- `B` - Next button

**VoiceOver (macOS):**
- `VO + A` - Read item (VO = Ctrl+Option)
- `VO + Right/Left Arrow` - Navigate
- `VO + Shift + Down` - Enter group
- `VO + Command + H` - Next heading

**Orca (Linux):**
- `Insert + Up Arrow` - Read current line
- `H` - Next heading
- `D` - Next landmark
- `F` - Next form field

### Best Practices Summary

1. **Always provide labels** - Every interactive widget needs accessible name
2. **Use semantic roles** - Button, textbox, navigation, etc.
3. **Support keyboard** - Full functionality without mouse
4. **Announce changes** - Use live regions for dynamic updates
5. **Provide context** - Widgets announce parent/grandparent
6. **Allow customization** - Font size, contrast, TTS on/off
7. **Test with tools** - Screen readers, validators, real users
8. **Optimize for braille** - Concise labels (<40 chars)
9. **Support internationalization** - RTL, phonetics, braille codes
10. **Leverage JavaScript** - Adapt web a11y libraries for Tsyne

---

## Contributing

When adding accessibility features:

1. Update `.accessibility()` API if needed
2. Add tests for new features
3. Update this documentation
4. Test with screen readers (NVDA/VoiceOver/Orca)
5. Validate ARIA with aria-validator
6. Consider braille display users (concise labels)
7. Support international users (RTL, phonetics)
8. Follow WCAG 2.1 AA standards

## Designer Integration

The Tsyne Designer fully supports accessibility through:

- `/api/update-accessibility` endpoint
- Properties panel for editing accessibility metadata
- Code generation with `.accessibility()` calls
- Roundtrip preservation of accessibility attributes

---

**Complete. Comprehensive. Inclusive.**

Build accessible Tsyne applications that work for everyone.
