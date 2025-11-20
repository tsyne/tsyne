# Accessibility Support in Tsyne

Tsyne provides comprehensive accessibility support including Text-to-Speech (TTS), screen reader compatibility, and assistive technology integration.

## Quick Start

### 1. Simple TTS Example

```typescript
import { app, window, vbox, button, getAccessibilityManager } from 'tsyne';

const myApp = app({ title: "My App" }, (a) => {
  a.window({ title: "Accessible App" }, () => {
    a.vbox(() => {
      a.button("Click Me", () => {
        const manager = getAccessibilityManager((myApp as any).ctx);
        manager.announce("Button was clicked!");
      });
    });
  });
});

// Get the accessibility manager
const manager = getAccessibilityManager((myApp as any).ctx);

// Enable accessibility
manager.enable();
```

### 2. Adding Accessibility to Widgets

Use the `.accessibility()` fluent API method on any widget:

```typescript
a.button("Submit", onSubmit)
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
let toggleButton: any;

function toggleAccessibility() {
  const manager = getAccessibilityManager((myApp as any).ctx);
  manager.toggle();

  const status = manager.isEnabled() ? "ON" : "OFF";
  toggleButton.setText(`Accessibility: ${status}`);
}

toggleButton = a.button("Accessibility: OFF", toggleAccessibility);
```

## Accessibility Options

The `.accessibility()` method accepts the following options:

| Option | Type | Description |
|--------|------|-------------|
| `label` | `string` | Concise name for the widget (ARIA label) |
| `description` | `string` | Extended description for screen readers |
| `role` | `string` | ARIA role (e.g., 'button', 'textbox', 'navigation') |
| `hint` | `string` | Usage hint for assistive technologies |

## AccessibilityManager API

### Methods

- **`enable()`** - Enable accessibility mode (TTS and assistive tools)
- **`disable()`** - Disable accessibility mode
- **`toggle()`** - Toggle accessibility on/off
- **`isEnabled()`** - Check if accessibility mode is enabled
- **`announce(text: string)`** - Announce text using TTS
- **`stopSpeech()`** - Stop any current speech
- **`announceWidget(widgetId: string)`** - Announce widget with parent/grandparent context
- **`registerWidget(widgetId, info)`** - Register widget accessibility information

### Global Functions

```typescript
import { enableAccessibility, disableAccessibility, toggleAccessibility } from 'tsyne';

// Enable globally
enableAccessibility(ctx);

// Disable globally
disableAccessibility(ctx);

// Toggle globally
toggleAccessibility(ctx);
```

## Complete Examples

### Calculator with Accessibility

See `examples/calculator-accessible.ts` for a full calculator implementation with:
- Toggle button for accessibility on/off
- Announcements for all button presses
- Result announcements
- Comprehensive accessibility labels on all widgets

Run it:
```bash
npm run build
npx ts-node examples/calculator-accessible.ts
```

### Simple Demo

See `examples/accessibility-demo.ts` for a minimal example with:
- Basic toggle control
- Multiple announcement buttons
- Status display

Run it:
```bash
npm run build
npx ts-node examples/accessibility-demo.ts
```

## TTS Platforms

Tsyne's accessibility features work across platforms:

### Browser/Electron
- Uses Web Speech API (`SpeechSynthesisUtterance`)
- Automatic voice selection
- Configurable rate, pitch, and volume

### Native Desktop
- Sends commands to the Fyne bridge
- Uses native platform TTS:
  - **macOS**: `say` command
  - **Linux**: `espeak` or `festival`
  - **Windows**: SAPI

### Console Fallback
- When TTS is not available, announcements are logged to console
- Useful for testing and debugging

## Designer Support

The Tsyne Designer fully supports accessibility:

### Adding Accessibility in Designer

1. Select a widget in the designer
2. Open the properties panel
3. Add accessibility options via the API endpoint:

```typescript
// Via HTTP API
fetch('http://localhost:3000/api/update-accessibility', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    widgetId: 'widget-123',
    accessibility: {
      label: 'Submit Button',
      description: 'Submits the form',
      role: 'button',
      hint: 'Click or press Enter'
    }
  })
});
```

### Code Generation

The designer generates proper accessibility code:

```typescript
// Before
button("Submit", onSubmit);

// After adding accessibility
button("Submit", onSubmit).accessibility({
  "label": "Submit Button",
  "description": "Submits the form",
  "role": "button",
  "hint": "Click or press Enter"
});
```

## Best Practices

### 1. Always Provide Labels

```typescript
// Good
a.button("Save", onSave).accessibility({
  label: "Save Document",
  description: "Saves the current document to disk"
});

// Not recommended
a.button("Save", onSave);  // No accessibility info
```

### 2. Use Descriptive Roles

```typescript
// Container widgets
a.vbox(() => { /* content */ }).accessibility({
  role: 'navigation',  // or 'main', 'region', etc.
  label: 'Main Navigation'
});

// Form inputs
a.entry("Enter name").accessibility({
  role: 'textbox',
  label: 'Name Input',
  hint: 'Enter your full name'
});
```

### 3. Announce Important Changes

```typescript
function saveDocument() {
  // ... save logic ...

  const manager = getAccessibilityManager(ctx);
  if (manager.isEnabled()) {
    manager.announce("Document saved successfully");
  }
}
```

### 4. Provide Context for Nested Widgets

The `announceWidget()` method automatically includes parent and grandparent context:

```typescript
// When pointer enters a button in a form in a sidebar:
// Announces: "Submit Button. Role: button. In Registration Form. Within Sidebar"
```

### 5. Allow Users to Toggle

Always provide a way for users to enable/disable accessibility:

```typescript
a.button("Accessibility: OFF", toggleAccessibility)
  .accessibility({
    label: "Toggle Accessibility",
    description: "Enable or disable screen reader announcements",
    hint: "Click to toggle, or press Ctrl+A"
  });
```

## Testing Accessibility

### Unit Tests

```typescript
import { getAccessibilityManager } from 'tsyne';

test('accessibility can be enabled', () => {
  const manager = getAccessibilityManager(ctx);
  manager.enable();
  expect(manager.isEnabled()).toBe(true);
});
```

### Integration Tests

See `src/__tests__/accessibility.test.ts` for comprehensive test examples.

## Troubleshooting

### TTS Not Working

1. **Check if enabled**: Ensure `manager.isEnabled()` returns `true`
2. **Browser check**: Open browser console, verify no errors
3. **System TTS**: On Linux, install `espeak`: `sudo apt-get install espeak`
4. **Console fallback**: Look for `[Accessibility]` messages in console

### Announcements Not Heard

- Volume may be muted in system settings
- Browser may block autoplay/speech (check permissions)
- Try `manager.stopSpeech()` then announce again

### Widget Context Missing

- Ensure widgets are registered: `manager.registerWidget(id, info)`
- Check parent relationships are set correctly in metadata

## Contributing

When adding new widgets or features:

1. Add `.accessibility()` support to new widget classes
2. Update the designer's facsimile ABI
3. Add tests for accessibility features
4. Document accessibility options in JSDoc comments

## Resources

- [ARIA Roles Reference](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
