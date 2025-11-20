# Accessibility Features for Applications

Beyond Text-to-Speech (TTS), here are essential accessibility features to implement:

## 1. Keyboard Navigation & Shortcuts

**Why:** Many users cannot use a mouse due to motor disabilities, visual impairments, or preference.

**For Calculator:**
- `0-9` - Number entry
- `+`, `-`, `*`, `/` - Operators
- `=` or `Enter` - Calculate result
- `C` or `Escape` - Clear display
- `Tab` - Navigate between buttons
- `Space` - Activate focused button

**Implementation:**
```typescript
// Listen for keyboard events
window.addEventListener('keydown', (e) => {
  if (e.key >= '0' && e.key <= '9') handleNumber(e.key);
  if (e.key === 'Enter' || e.key === '=') calculate();
  if (e.key === 'Escape' || e.key === 'c') clear();
});
```

## 2. High Contrast Mode

**Why:** Users with low vision or color blindness need strong color contrast.

**Features:**
- High contrast colors (pure black/white or dark/light)
- Clear borders around interactive elements
- No color-only indicators (use text/icons too)

**Implementation:**
```typescript
const highContrastStyles = {
  button: {
    background: '#000000',
    foreground: '#FFFFFF',
    border: '2px solid #FFFFFF'
  },
  display: {
    background: '#000000',
    foreground: '#00FF00', // High visibility green
    font_style: FontStyle.BOLD
  }
};
```

## 3. Font Size Controls

**Why:** Users with low vision need larger text; some prefer compact displays.

**Levels:**
- Small (75% base size)
- Medium (100% base size)
- Large (150% base size)
- Extra Large (200% base size)

**Implementation:**
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
}
```

## 4. Audio/Haptic Feedback

**Why:** Confirms actions for users who can't see visual feedback; helpful for blind users.

**Features:**
- Button press sounds (different tones for numbers vs operators)
- Error sounds (for invalid operations)
- Success sounds (for successful calculations)
- Vibration on mobile devices

**Implementation:**
```typescript
function playClickSound(type: 'number' | 'operator' | 'result') {
  const frequencies = {
    number: 440,    // A4
    operator: 523,  // C5
    result: 659     // E5
  };

  // Play beep at specified frequency
  playTone(frequencies[type], 100); // 100ms duration
}
```

## 5. Focus Indicators

**Why:** Keyboard users need to see which element has focus.

**Features:**
- Visible focus outline (3px minimum)
- High contrast focus color
- Focus moves logically (top to bottom, left to right)
- Focus never hidden or invisible

**Implementation:**
```typescript
styles({
  button: {
    focus_border: '3px solid #0066FF',
    focus_background: '#E6F0FF'
  }
});
```

## 6. Calculation History

**Why:** Users may need to review past calculations; helpful for cognitive disabilities.

**Features:**
- Show last 5-10 calculations
- Scroll through history
- Copy history to clipboard
- Clear history option
- Announce history items with TTS

**Implementation:**
```typescript
const history: string[] = [];

function addToHistory(calculation: string, result: string) {
  history.unshift(`${calculation} = ${result}`);
  if (history.length > 10) history.pop();

  updateHistoryDisplay();
  announce(`Added to history: ${calculation} equals ${result}`);
}
```

## 7. Screen Reader Support (ARIA)

**Why:** Blind users rely on screen readers to navigate apps.

**Features:**
- Proper ARIA roles (`button`, `status`, `log`)
- ARIA labels (concise names)
- ARIA descriptions (detailed explanations)
- Live regions for dynamic updates

**Implementation:**
```typescript
display.accessibility({
  label: "Calculator Display",
  description: "Shows current value and calculation results",
  role: "status"  // Announces changes automatically
});

historyDisplay.accessibility({
  label: "Calculation History",
  role: "log"  // Live region for updates
});
```

## 8. Reduce Motion

**Why:** Users with vestibular disorders get sick from animations.

**Features:**
- Disable or reduce animations
- Instant transitions instead of smooth
- No auto-scrolling or parallax

**Implementation:**
```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function animate(element: any, duration: number) {
  if (prefersReducedMotion) {
    duration = 0; // Instant
  }
  // ... animation code
}
```

## 9. Error Recovery

**Why:** Users with cognitive disabilities need clear error messages and recovery paths.

**Features:**
- Clear error messages ("Cannot divide by zero")
- Suggest fixes ("Press Clear to start over")
- Don't clear input on error (let user fix it)
- Visual and auditory error indicators

**Implementation:**
```typescript
function handleError(message: string) {
  updateDisplay("Error");
  announce(`Error: ${message}. Press Clear to reset.`);
  playErrorSound();

  // Don't clear values - let user recover
  shouldResetDisplay = true;
}
```

## 10. Speech Input (Advanced)

**Why:** Hands-free operation for users with motor disabilities.

**Features:**
- Voice commands: "Seven plus three equals"
- "Clear", "Delete", "Repeat last"
- Natural language: "What's five times six?"

**Implementation:**
```typescript
const recognition = new webkitSpeechRecognition();

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript.toLowerCase();

  // Parse commands
  if (transcript.includes('clear')) clear();
  else if (transcript.match(/(\d+) plus (\d+)/)) {
    const [_, a, b] = transcript.match(/(\d+) plus (\d+)/);
    handleNumber(a);
    handleOperator('+', 'add');
    handleNumber(b);
    calculate();
  }
};
```

## 11. Customizable Color Schemes

**Why:** Color blind users and users with specific visual preferences.

**Options:**
- Default
- High Contrast (Black/White)
- Deuteranopia (Red-Green color blind)
- Protanopia (Red color blind)
- Tritanopia (Blue-Yellow color blind)
- Dark Mode
- Custom (user-defined colors)

## 12. Tooltips & Help Text

**Why:** Users need context about what buttons do.

**Features:**
- Hover tooltips (for mouse users)
- Focus tooltips (for keyboard users)
- Help mode (shows all tooltips)
- Keyboard shortcut hints

## Priority for Calculator

**High Priority:**
1. ✅ **TTS** - Announces button presses and results
2. ✅ **Keyboard shortcuts** - Full keyboard control
3. ✅ **High contrast mode** - Visual accessibility
4. ✅ **Font size controls** - Low vision support
5. ✅ **Audio feedback** - Click sounds
6. ✅ **ARIA labels** - Screen reader support
7. ✅ **Calculation history** - Review past work

**Medium Priority:**
8. Focus indicators (should be automatic in Fyne)
9. Error recovery with clear messages
10. Reduce motion option

**Low Priority (Advanced):**
11. Speech input
12. Customizable color schemes beyond high contrast

## Testing Accessibility

1. **Use only keyboard** - Can you perform all actions?
2. **Turn on screen reader** - Does it make sense?
3. **Zoom to 200%** - Is everything still readable?
4. **Turn off sound** - Do you get visual feedback?
5. **Use high contrast** - Can you still read everything?
6. **Test with color blind simulator** - Are colors sufficient?

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Best Practices](https://www.w3.org/TR/wai-aria-practices-1.1/)
- [Keyboard Accessibility](https://webaim.org/techniques/keyboard/)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)
