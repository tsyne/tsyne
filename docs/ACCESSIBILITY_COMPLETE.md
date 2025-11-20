# Complete Accessibility Guide for Tsyne

This comprehensive guide covers screen readers, braille displays, and international accessibility for Tsyne applications.

## Table of Contents

1. [Screen Reader Support](#screen-reader-support)
2. [Braille Display Optimization](#braille-display-optimization)
3. [International Accessibility](#international-accessibility)
4. [Best Practices](#best-practices)
5. [Testing](#testing)
6. [Implementation](#implementation)

---

## Screen Reader Support

Screen readers convert UI elements into speech and braille for blind and visually impaired users.

### Platform Screen Readers

| Platform | Screen Readers | Status |
|----------|---------------|--------|
| **Windows** | NVDA (free), JAWS (commercial), Narrator (built-in) | ✅ Native support |
| **macOS** | VoiceOver (built-in) | ✅ Native support |
| **Linux** | Orca (free), Emacspeak | ✅ Native support |

### How It Works

```
Tsyne (.accessibility())
  ↓ Bridge
Fyne (Go widgets)
  ↓ Platform APIs
OS Accessibility (UIA/NSAccessibility/AT-SPI2)
  ↓
Screen Reader (NVDA/VoiceOver/Orca)
```

### Platform API Mappings

**Windows (UI Automation):**
```
label       → AutomationId, Name
description → HelpText
role        → ControlType (Button, TextBox, etc.)
```

**macOS (NSAccessibility):**
```
label       → accessibilityTitle
description → accessibilityValue
role        → accessibilityRole
```

**Linux (AT-SPI2):**
```
label       → Name
description → Description
role        → Role (ROLE_PUSH_BUTTON, etc.)
```

### Testing with Screen Readers

**Windows (NVDA):**
```bash
# Navigate
Tab          # Next element
Shift+Tab    # Previous element
Space/Enter  # Activate

# NVDA announces:
"Submit Form, button"
"Press Enter or click to submit"
```

**macOS (VoiceOver):**
```bash
# Enable: Cmd+F5

# Navigate
VO+Right Arrow  # Next (VO = Ctrl+Option)
VO+Left Arrow   # Previous
VO+Space        # Activate
```

**Linux (Orca):**
```bash
# Install
sudo apt-get install orca

# Navigate
Tab          # Next element
Space/Enter  # Activate
```

---

## Braille Display Optimization

Braille users read via **refreshable braille displays** - hardware devices with 40-80 cells that form braille characters.

### Key Difference: Reading Speed

| Mode | Speed | Implication |
|------|-------|-------------|
| **Audio** | 250-400 wpm | Can be verbose |
| **Braille** | 100-125 wpm | Must be concise |

**Braille is 2-3× slower** - every character counts!

### What Braille Users Need

#### 1. Concise Labels (Under 20 Characters)

```typescript
// ❌ TOO VERBOSE (35 chars)
label: "Cell at top left, currently empty"

// ✅ BRAILLE-OPTIMIZED (11 chars - 69% shorter!)
label: "R1C1: Empty"
```

#### 2. Front-Loaded Information

```typescript
// ❌ BAD: Important info at end
label: "The cell at row 1 column 1 has X"

// ✅ GOOD: State first
label: "R1C1: X"
```

#### 3. Standard Abbreviations

```typescript
"btn"    → button
"chk"    → checkbox
"R1C1"   → row 1, column 1
"Turn: X" → Player X's turn
```

#### 4. Proper Grid Structure

```typescript
a.grid(3, () => {
  // cells...
}).accessibility({
  role: "grid",      // Enables grid navigation
  label: "Board 3x3",
  rowcount: 3,
  colcount: 3
});

// Each cell
.accessibility({
  role: "gridcell",
  label: "R1C1: X",
  row: 1,
  column: 1
})
```

#### 5. State in Labels (Not Descriptions)

```typescript
// ❌ BAD: Braille user must read description
.accessibility({
  label: "Cell",
  description: "Currently has X"
})

// ✅ GOOD: State visible immediately
.accessibility({
  label: "R1C1: X"    // State in label
})
```

### Label Length Comparison

| Context | Audio | Braille | Savings |
|---------|-------|---------|---------|
| **Cell** | "Cell at top left, currently empty" (35) | "R1C1: Empty" (11) | **69%** |
| **Status** | "Player X's turn to make a move" (29) | "Turn: X" (7) | **76%** |
| **Winner** | "Player O has won the game!" (27) | "Winner: O" (9) | **67%** |
| **Move** | "Player X placed at top left" (27) | "X R1C1" (6) | **78%** |

**Average reduction: 73%** - braille users can read **3-4× faster**!

### Braille Display Constraints

**Typical displays:** 40-80 braille cells

**Audio-Optimized (overflows 40-cell display):**
```
"Player X's turn to make a move, Cell at..."
[************ 40+ cells, truncated ***********]
```

**Braille-Optimized (fits comfortably):**
```
"Turn: X | R1C1: Empty"
[******* 20 cells *******]
```

### Dual-Mode Support

Support both audio and braille users:

```typescript
.accessibility({
  label: "R1C1: X",                    // Braille (brief)
  description: "Row 1, Column 1 has X" // Audio (context)
})
```

**Result:**
- Braille users read just the **label** (8 chars)
- Audio users hear **both** for full context

---

## International Accessibility

Different writing systems require different accessibility strategies.

### The Challenge

| Aspect | Latin | Arabic | Chinese | Hebrew | Thai |
|--------|-------|--------|---------|--------|------|
| **Direction** | LTR | RTL | LTR | RTL | LTR |
| **Characters** | 26 | 28 + forms | 50,000+ | 22 | 44 |
| **Joining** | No | Yes (4 forms) | No | No | Complex |
| **Spacing** | Words | Words | None | Words | None |

### Problem 1: Text Direction (RTL vs LTR)

**The Problem:**
```
English (LTR): "Submit Form"
Arabic (RTL):  "إرسال نموذج"  (reads right-to-left)

// Screen reader might announce backwards!
```

**The Solution:**
```typescript
.accessibility({
  label: "إرسال نموذج",      // Arabic: Submit Form
  direction: "rtl",           // Right-to-left
  language: "ar"              // Arabic
})
```

### Problem 2: Character Pronunciation

**The Problem:**
```
Chinese: 提交 (tí jiāo - submit)
- Screen reader might say: "character 25552, character 20132" (unhelpful!)

Japanese: 送信 (sōshin - submit)
- Multiple possible readings
- Context determines correct pronunciation
```

**The Solution:**
```typescript
// Chinese with phonetic
.accessibility({
  label: "提交",              // Visual text
  phonetic: "tí jiāo",        // Pronunciation
  language: "zh-CN"
})

// Japanese with ruby
.accessibility({
  label: "送信",              // Kanji
  phonetic: "そうしん",       // Hiragana
  language: "ja"
})
```

### Problem 3: No Word Boundaries (Chinese, Japanese, Thai)

**The Problem:**
```
Chinese: "这是一个按钮" (This is a button)
- No spaces between words!
- Must segment: "这是" "一个" "按钮"
```

**The Solution:**
```typescript
.accessibility({
  label: "这是一个按钮",
  language: "zh-CN",
  wordBoundaries: [0, 2, 4, 6]  // Word break positions
})
```

### Problem 4: Braille Codes Vary by Language

Different languages use different braille:

```typescript
// English Braille
"Submit" → ⠎⠥⠃⠍⠊⠞ (6 cells)

// Arabic Braille
"إرسال" → ⠁⠗⠎⠁⠇ (5 cells, different patterns, RTL)

// Chinese Braille (Pinyin-based)
"提交" → ⠞⠊⠁⠕ (4 cells, phonetic)

// Specify language for correct braille
.accessibility({
  label: "提交",
  language: "zh-CN"    // Uses Chinese braille code
})
```

### Complete International Example

```typescript
// English
.accessibility({
  label: "R1C1: X",
  language: "en",
  direction: "ltr"
})

// Arabic
.accessibility({
  label: "ص1ع1: X",          // Row 1, Column 1
  language: "ar",
  direction: "rtl"
})

// Chinese
.accessibility({
  label: "行1列1: X",
  language: "zh-CN",
  direction: "ltr",
  phonetic: "háng yī liè yī: X"
})

// Japanese
.accessibility({
  label: "1行1列: X",
  language: "ja",
  ruby: {
    "行": "ぎょう",         // gyō
    "列": "れつ"           // retsu
  }
})

// Hebrew
.accessibility({
  label: "ש1ט1: X",
  language: "he",
  direction: "rtl"
})
```

---

## Best Practices

### For Screen Readers

```typescript
// ✅ GOOD
.accessibility({
  label: "Submit Form",
  description: "Submits the registration form",
  role: "button",
  hint: "Press Enter or click"
})

// ❌ BAD
.accessibility({
  description: "Click to submit"  // No label!
})
```

### For Braille Displays

```typescript
// ✅ GOOD: Concise, state first
.accessibility({
  label: "R1C1: X",              // 8 chars
  description: "Row 1, Column 1 has X"  // Audio context
})

// ❌ BAD: Verbose
.accessibility({
  label: "Cell at top left has X"  // 24 chars
})
```

### For International Users

```typescript
// ✅ GOOD: Full i18n support
.accessibility({
  label: "提交",
  language: "zh-CN",
  direction: "ltr",
  phonetic: "tí jiāo"
})

// ❌ BAD: No language
.accessibility({
  label: "提交"  // Screen reader guesses wrong
})
```

### Combined Best Practices

```typescript
// Support all users: screen reader, braille, international
function makeAccessible(text: string, lang: string) {
  const isRTL = ['ar', 'he', 'fa', 'ur'].includes(lang);
  const phonetic = generatePhonetic(text, lang);
  const brief = abbreviate(text);  // For braille

  return {
    label: brief,              // Concise for braille
    description: text,         // Full for audio
    language: lang,
    direction: isRTL ? 'rtl' : 'ltr',
    phonetic: phonetic || undefined
  };
}

// Usage
a.button("提交", onClick)
  .accessibility(makeAccessible("提交", "zh-CN"));
```

---

## Testing

### Screen Reader Testing

**Windows (NVDA):**
```bash
# Install NVDA
# https://www.nvaccess.org/

# Run app
npm run build
npx ts-node examples/tictactoe.ts

# Test
Tab through all elements
Verify all labels are announced
Check focus order is logical
Test keyboard shortcuts
```

**macOS (VoiceOver):**
```bash
# Enable: Cmd+F5

# Test
VO+A (read all)
VO+U (navigate by type)
Verify pronunciation correct
Check language switching
```

**Linux (Orca):**
```bash
sudo apt-get install orca
orca &

# Test
Tab navigation
Check AT-SPI properties
Verify speech output
```

### Braille Testing

**NVDA Braille Viewer:**
```
Tools → Braille Viewer
See exactly what's on braille display
Verify labels are concise
Check cell count (aim for <20)
```

**VoiceOver Braille:**
```
Connect braille display
Verify correct braille code
Test RTL languages
Check navigation
```

### International Testing

```bash
# Test matrix
Languages: en, ar, zh, ja, he, th, ru, hi

For each language:
1. Enable screen reader in that language
2. Navigate app with keyboard
3. Verify pronunciation
4. Check text direction
5. Test braille output
```

### Accessibility Inspector Tools

**Windows:**
```powershell
# Inspect.exe (Windows SDK)
"C:\Program Files (x86)\Windows Kits\10\bin\x64\inspect.exe"

# Shows UI Automation tree
# View all properties
```

**macOS:**
```bash
# Accessibility Inspector (Xcode)
/Applications/Xcode.app/Contents/Applications/Accessibility Inspector.app

# Browse NSAccessibility tree
```

**Linux:**
```bash
# Accerciser
sudo apt-get install accerciser
accerciser &

# Browse AT-SPI tree
```

---

## Implementation

### Extended Accessibility Interface

```typescript
interface CompletAccessibilityOptions {
  // Basic (required)
  label: string;
  role?: string;

  // Detailed
  description?: string;
  hint?: string;

  // International
  language?: string;           // ISO 639 code (en, ar, zh, etc.)
  direction?: 'ltr' | 'rtl';  // Text direction
  phonetic?: string;           // Pronunciation guide
  ruby?: Record<string, string>;  // Ruby annotations (Japanese)
  wordBoundaries?: number[];   // Word breaks (Chinese, Thai)

  // Grid/Table
  row?: number;
  column?: number;
  rowcount?: number;
  colcount?: number;

  // Live regions
  live?: 'polite' | 'assertive';

  // Navigation
  current?: 'page' | 'step' | 'location';

  // Braille
  brailleTable?: string;       // Specific braille code
}
```

### Example: Multilingual Tic-Tac-Toe

```typescript
// i18n with full accessibility
import i18n from 'i18next';

const translations = {
  en: {
    cell: "R{{row}}C{{col}}: {{value}}",
    cellLong: "Row {{row}}, Column {{col}}, {{value}}",
    turn: "Turn: {{player}}",
    winner: "Winner: {{player}}"
  },
  ar: {
    cell: "ص{{row}}ع{{col}}: {{value}}",
    cellLong: "صف {{row}}، عمود {{col}}، {{value}}",
    turn: "دور: {{player}}",
    winner: "الفائز: {{player}}"
  },
  zh: {
    cell: "{{row}}行{{col}}列: {{value}}",
    cellLong: "第{{row}}行第{{col}}列，{{value}}",
    turn: "轮到: {{player}}",
    winner: "赢家: {{player}}"
  }
};

// Create accessible cell
function createCell(row: number, col: number, value: string) {
  const lang = i18n.language;
  const isRTL = ['ar', 'he'].includes(lang);

  return a.button(value, () => makeMove(row, col))
    .accessibility({
      // Concise for braille
      label: i18n.t('cell', { row, col, value: value || 'Empty' }),

      // Detailed for audio
      description: i18n.t('cellLong', { row, col, value: value || 'Empty' }),

      // Grid structure
      role: "gridcell",
      row: row,
      column: col,

      // International
      language: lang,
      direction: isRTL ? 'rtl' : 'ltr'
    });
}
```

### Auto-Detection Helper

```typescript
// Automatically detect language properties
function smartAccessibility(label: string, options: any = {}): CompleteAccessibilityOptions {
  // Detect language from Unicode ranges
  function detectLang(text: string): string {
    if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';     // Chinese
    if (/[\u0600-\u06FF]/.test(text)) return 'ar';     // Arabic
    if (/[\u0590-\u05FF]/.test(text)) return 'he';     // Hebrew
    if (/[\u0E00-\u0E7F]/.test(text)) return 'th';     // Thai
    if (/[\u3040-\u30FF]/.test(text)) return 'ja';     // Japanese
    return 'en';
  }

  // Detect direction
  function detectDirection(lang: string): 'ltr' | 'rtl' {
    return ['ar', 'he', 'fa', 'ur'].includes(lang) ? 'rtl' : 'ltr';
  }

  // Abbreviate for braille
  function abbreviate(text: string): string {
    // Keep under 20 chars for braille
    return text.length > 20 ? text.substring(0, 17) + '...' : text;
  }

  const lang = options.language || detectLang(label);
  const dir = options.direction || detectDirection(lang);
  const brief = abbreviate(label);

  return {
    label: brief,                    // Concise for braille
    description: options.description || label,  // Full for audio
    language: lang,
    direction: dir,
    ...options
  };
}

// Usage
a.button("提交", onClick)
  .accessibility(smartAccessibility("提交"));

// Automatically sets:
// label: "提交"
// language: "zh"
// direction: "ltr"
```

---

## Resources

### Screen Readers
- [NVDA](https://www.nvaccess.org/) - Free Windows
- [JAWS](https://www.freedomscientific.com/) - Commercial Windows
- [VoiceOver](https://www.apple.com/accessibility/voiceover/) - macOS
- [Orca](https://help.gnome.org/users/orca/stable/) - Linux

### Platform APIs
- [Windows UI Automation](https://docs.microsoft.com/en-us/windows/win32/winauto/entry-uiauto-win32)
- [macOS NSAccessibility](https://developer.apple.com/documentation/appkit/nsaccessibility)
- [Linux AT-SPI2](https://www.freedesktop.org/wiki/Accessibility/AT-SPI2/)

### Braille
- [Braille Authority](http://www.brailleauthority.org/)
- [Unified English Braille](https://www.ukaaf.org/ueb/)
- [International Braille Codes](https://en.wikipedia.org/wiki/Braille)

### i18n
- [ISO 639 Language Codes](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)
- [Unicode Scripts](https://www.unicode.org/standard/supported.html)
- [i18next](https://www.i18next.com/) - i18n framework

### Testing
- [Accessibility Insights](https://accessibilityinsights.io/)
- [Accerciser](https://wiki.gnome.org/Apps/Accerciser)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## Summary

**Screen Readers:**
- Use native platform APIs (UIA, NSAccessibility, AT-SPI2)
- Provide label, description, role, hint
- Test with NVDA, VoiceOver, Orca

**Braille Displays:**
- Reading is 2-3× slower than audio
- Keep labels under 20 characters
- Front-load state ("R1C1: X" not "X at R1C1")
- Use abbreviations ("btn", "Turn: X")
- Provide both brief label and detailed description

**International:**
- Always set language code
- Set direction for RTL languages (Arabic, Hebrew)
- Provide phonetics for complex scripts (Chinese, Japanese)
- Different braille codes per language
- Test with native speakers

**Best Practice:**
```typescript
.accessibility({
  label: "R1C1: X",                    // Concise (braille)
  description: "Row 1, Column 1 has X", // Detailed (audio)
  role: "gridcell",                     // Semantic
  row: 1, column: 1,                    // Structure
  language: "en",                       // i18n
  direction: "ltr"                      // Direction
})
```

Making Tsyne apps accessible to screen reader users, braille users, and international users ensures everyone can use your applications regardless of language or disability.
