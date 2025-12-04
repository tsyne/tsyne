# International Accessibility: Non-Latin Alphabets

Screen readers and braille displays face unique challenges with non-Latin alphabets. This document explains the issues and solutions.

## The Challenge

Different writing systems have fundamentally different properties:

| Aspect | Latin | Arabic | Chinese | Hebrew | Thai |
|--------|-------|--------|---------|--------|------|
| **Direction** | LTR | RTL | LTR/Vertical | RTL | LTR |
| **Characters** | 26 letters | 28 letters + forms | 50,000+ characters | 22 letters | 44 letters |
| **Joining** | No | Yes (4 forms) | No | No | Yes (complex) |
| **Vowels** | Explicit | Optional diacritics | Tone marks | Optional points | Explicit |
| **Spacing** | Word-based | Word-based | No spaces | Word-based | No spaces |

## Problems for Screen Readers

### 1. **Text Direction (RTL vs LTR)**

**The Problem:**
```
English (LTR): "Submit Form"
Arabic (RTL):  "نموذج إرسال"  (reads right-to-left)
Hebrew (RTL):  "טופס שליחה"   (reads right-to-left)

// Screen reader might announce in wrong order!
// Expected: "إرسال نموذج" (Submit Form)
// Actual:   "نموذج إرسال" (Form Submit) ← backwards!
```

**The Solution:**
```typescript
// Set text direction explicitly
.accessibility({
  label: "إرسال نموذج",      // Arabic: Submit Form
  direction: "rtl",           // Right-to-left
  language: "ar"              // Arabic
})

// Platform APIs handle direction:
// Windows UIA: FlowDirection property
// macOS: NSWritingDirection
// Linux: AT-SPI text direction
```

### 2. **Character Pronunciation**

**The Problem:**
```
Chinese: 提交 (tí jiāo - submit)
- Screen reader might say: "ti submit" (half Chinese, half English)
- Or: "character 25552, character 20132" (unhelpful!)
- Or: Wrong pronunciation based on context

Japanese: 送信 (sōshin - submit)
- Has multiple readings:
  - 送 can be "sō", "oku(ru)", "okuri"
  - 信 can be "shin", "shinjiru", "tayori"
- Context determines correct reading!
```

**The Solution:**
```typescript
// Provide phonetic reading
.accessibility({
  label: "提交",              // Visual text (Chinese)
  phonetic: "tí jiāo",        // Pronunciation guide
  language: "zh-CN"           // Simplified Chinese
})

// For Japanese
.accessibility({
  label: "送信",              // Kanji
  phonetic: "そうしん",       // Hiragana reading
  language: "ja"
})

// Screen reader uses phonetic for TTS
```

### 3. **Contextual Forms (Arabic)**

**The Problem:**
```
Arabic letter "baa" (ب) has 4 forms:
- Isolated: ب
- Initial:   بـ
- Medial:    ـبـ
- Final:     ـب

Word: كتاب (kitāb - book)
- ك (kaf - initial form)
- ت (ta - medial form)
- ا (alif - medial form)
- ب (ba - final form)

// Screen reader needs to recognize this is ONE word,
// not 4 separate characters!
```

**The Solution:**
```typescript
// Platform handles contextual forms automatically
// when language is set correctly

.accessibility({
  label: "كتاب",              // Arabic word
  language: "ar"              // Arabic - platform knows forms
})

// Windows: Uses Uniscribe/DirectWrite
// macOS: Uses Core Text
// Linux: Uses Pango
// All handle contextual shaping correctly
```

### 4. **No Word Boundaries (Chinese, Japanese, Thai)**

**The Problem:**
```
Chinese: "这是一个按钮" (This is a button)
- No spaces between words!
- Screen reader must segment: "这是" "一个" "按钮"
- Wrong segmentation: "这" "是一" "个按" "钮" ← nonsense!

Thai: "นี่คือปุ่ม" (This is a button)
- No spaces!
- Must segment: "นี่" "คือ" "ปุ่ม"

Japanese: "これはボタンです" (This is a button)
- Mix of hiragana, katakana, kanji
- Must parse correctly
```

**The Solution:**
```typescript
// Provide word boundaries explicitly
.accessibility({
  label: "这是一个按钮",
  language: "zh-CN",
  wordBoundaries: [0, 2, 4, 6]  // Positions of word breaks
})

// Or use Ruby annotations (Japanese)
.accessibility({
  label: "送信ボタン",           // Submit button
  ruby: {                        // Reading hints
    "送信": "そうしん",          // sōshin
    "ボタン": "ぼたん"           // botan
  },
  language: "ja"
})
```

### 5. **Tone Marks and Diacritics**

**The Problem:**
```
Thai: มา (maa)
- Without tone mark: "to come"
- With tone mark: ม้า (máa - "horse")
- Wrong tone = wrong meaning!

Vietnamese: thơ (poem) vs thở (breathe) vs thờ (to worship)
- Tone marks are essential for meaning
- Screen reader must pronounce correctly

Arabic: كتب (kataba - he wrote) vs كُتب (kutiba - it was written)
- Vowel points (diacritics) change meaning
- Often omitted in text, but needed for pronunciation
```

**The Solution:**
```typescript
// Platform TTS engines handle tones if language is set
.accessibility({
  label: "ม้า",                 // Thai: horse
  language: "th"                // Thai - TTS knows tones
})

// For Arabic, include vowel points when needed
.accessibility({
  label: "كُتب",                // With vowel points
  language: "ar"
})

// Vietnamese tones
.accessibility({
  label: "thơ",                 // Poem
  language: "vi"                // Vietnamese - TTS knows tones
})
```

## Braille Challenges

Different languages use different braille codes:

### English Braille (Grade 1 & 2)
```
"Submit" → ⠎⠥⠃⠍⠊⠞ (6 cells, Grade 1)
"Submit" → ⠎⠃⠍ (3 cells, Grade 2 with contractions)
```

### Arabic Braille
```
"إرسال" → ⠁⠗⠎⠁⠇ (5 cells, Arabic braille code)
- Different cell patterns than English
- Reads right-to-left on display
```

### Chinese Braille (双拼)
```
"提交" → ⠞⠊⠁⠕ (tí jiāo in pinyin braille)
- Phonetic, not logographic
- Two cells per syllable
```

### Japanese Braille (点字)
```
"送信" → ⠎⠥⠎⠊⠝ (sōshin in hiragana braille)
- Based on kana, not kanji
- About twice as long as kanji
```

### Hebrew Braille
```
"שלח" → ⠱⠇⠹ (3 cells)
- Reads right-to-left
- Different patterns than English
```

**Solution: Specify language for braille**
```typescript
.accessibility({
  label: "提交",
  language: "zh-CN",      // System uses Chinese braille
  brailleTable: "zh-CN"   // Explicit braille code
})
```

## Complete Internationalization Solution

### 1. **Accessibility with Language Support**

```typescript
// Extended AccessibilityOptions interface
interface InternationalAccessibilityOptions extends AccessibilityOptions {
  label: string;
  description?: string;
  role?: string;
  hint?: string;

  // Internationalization
  language?: string;           // ISO 639 language code
  direction?: 'ltr' | 'rtl';  // Text direction
  phonetic?: string;           // Pronunciation guide
  ruby?: Record<string, string>;  // Ruby annotations (Japanese)
  wordBoundaries?: number[];   // Word break positions
  brailleTable?: string;       // Braille code to use
}
```

### 2. **Example: Multilingual Tic-Tac-Toe**

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

// Chinese (Simplified)
.accessibility({
  label: "行1列1: X",         // Row 1, Column 1
  language: "zh-CN",
  direction: "ltr",
  phonetic: "háng yī liè yī: X"
})

// Japanese
.accessibility({
  label: "1行1列: X",
  language: "ja",
  direction: "ltr",
  ruby: {
    "行": "ぎょう",         // gyō
    "列": "れつ"           // retsu
  }
})

// Hebrew
.accessibility({
  label: "ש1ט1: X",          // Row 1, Column 1
  language: "he",
  direction: "rtl"
})

// Thai
.accessibility({
  label: "แถว1คอลัมน์1: X",  // Row 1, Column 1
  language: "th",
  direction: "ltr"
})
```

### 3. **i18n Framework Integration**

```typescript
// Using i18next or similar
import i18n from 'i18next';

// Translation files
const translations = {
  en: {
    cell: "R{{row}}C{{col}}: {{value}}",
    turn: "Turn: {{player}}",
    winner: "Winner: {{player}}"
  },
  ar: {
    cell: "ص{{row}}ع{{col}}: {{value}}",
    turn: "دور: {{player}}",
    winner: "الفائز: {{player}}"
  },
  zh: {
    cell: "行{{row}}列{{col}}: {{value}}",
    turn: "轮到: {{player}}",
    winner: "赢家: {{player}}"
  }
};

// Use in accessibility
const currentLang = i18n.language;
const direction = ['ar', 'he'].includes(currentLang) ? 'rtl' : 'ltr';

cellButton.accessibility({
  label: i18n.t('cell', { row: 1, col: 1, value: 'X' }),
  language: currentLang,
  direction: direction
});
```

## Platform-Specific TTS Engines

Different platforms have different TTS quality for languages:

### Windows (SAPI/Microsoft Speech Platform)
```
✅ Excellent: English, Spanish, French, German, Italian
✅ Good: Chinese, Japanese, Portuguese, Russian
⚠️  Fair: Arabic, Hebrew, Thai, Vietnamese
❌ Poor: Many minority languages
```

### macOS (AVSpeechSynthesizer)
```
✅ Excellent: English, Spanish, French, German, Italian, Japanese, Chinese
✅ Good: Portuguese, Russian, Arabic, Hebrew, Thai
⚠️  Fair: Korean, Vietnamese, Hindi
❌ Poor: Many minority languages
```

### Linux (eSpeak, Festival, Piper)
```
✅ Good: English, Spanish, French, German
⚠️  Fair: Most other languages (robotic but understandable)
✨ eSpeak supports 100+ languages (varying quality)
```

### Solution: Language-Specific Configuration

```typescript
// Configure TTS per language
const ttsConfig = {
  'en': { engine: 'auto', voice: 'default' },
  'zh-CN': { engine: 'auto', voice: 'Huihui' },  // Windows
  'ja': { engine: 'auto', voice: 'Kyoko' },      // macOS
  'ar': { engine: 'auto', voice: 'Hoda' },
  'he': { engine: 'espeak', voice: 'he' }        // Linux fallback
};

accessibilityManager.configure({
  language: currentLanguage,
  tts: ttsConfig[currentLanguage]
});
```

## Testing International Accessibility

### 1. **Test with Native Speakers**

```typescript
// Test matrix
const testLanguages = [
  { code: 'en', name: 'English', direction: 'ltr', script: 'Latin' },
  { code: 'ar', name: 'Arabic', direction: 'rtl', script: 'Arabic' },
  { code: 'zh-CN', name: 'Chinese', direction: 'ltr', script: 'Han' },
  { code: 'ja', name: 'Japanese', direction: 'ltr', script: 'Han+Kana' },
  { code: 'he', name: 'Hebrew', direction: 'rtl', script: 'Hebrew' },
  { code: 'th', name: 'Thai', direction: 'ltr', script: 'Thai' },
  { code: 'ru', name: 'Russian', direction: 'ltr', script: 'Cyrillic' },
  { code: 'hi', name: 'Hindi', direction: 'ltr', script: 'Devanagari' }
];

// For each language:
// 1. Enable screen reader in that language
// 2. Navigate app with keyboard
// 3. Verify correct pronunciation
// 4. Check braille output (if available)
// 5. Verify text direction
```

### 2. **Automated Testing**

```typescript
// Test text direction
describe('RTL Languages', () => {
  it('should set RTL direction for Arabic', () => {
    const button = a.button("إرسال").onClick(onClick)
      .accessibility({
        label: "إرسال",
        language: "ar",
        direction: "rtl"
      });

    expect(button.getAccessibilityDirection()).toBe('rtl');
  });

  it('should set RTL direction for Hebrew', () => {
    const button = a.button("שלח").onClick(onClick)
      .accessibility({
        label: "שלח",
        language: "he",
        direction: "rtl"
      });

    expect(button.getAccessibilityDirection()).toBe('rtl');
  });
});

// Test language codes
describe('Language Codes', () => {
  it('should set correct language for Chinese', () => {
    const button = a.button("提交").onClick(onClick)
      .accessibility({
        label: "提交",
        language: "zh-CN"
      });

    expect(button.getAccessibilityLanguage()).toBe('zh-CN');
  });
});
```

## Best Practices

### 1. **Always Set Language**
```typescript
// ✅ GOOD
.accessibility({
  label: "提交",
  language: "zh-CN"
})

// ❌ BAD
.accessibility({
  label: "提交"
  // No language - screen reader guesses wrong!
})
```

### 2. **Set Direction for RTL**
```typescript
// ✅ GOOD
.accessibility({
  label: "إرسال",
  language: "ar",
  direction: "rtl"
})

// ❌ BAD
.accessibility({
  label: "إرسال",
  language: "ar"
  // No direction - might display backwards!
})
```

### 3. **Provide Phonetics for Complex Scripts**
```typescript
// ✅ GOOD (Chinese)
.accessibility({
  label: "提交",
  language: "zh-CN",
  phonetic: "tí jiāo"
})

// ✅ GOOD (Japanese)
.accessibility({
  label: "送信",
  language: "ja",
  ruby: { "送信": "そうしん" }
})
```

### 4. **Use Unicode Normalization**
```typescript
// Characters can have multiple representations
const label = "café";
// NFD: c + a + f + e + ´ (5 code points)
// NFC: c + a + f + é (4 code points)

// Normalize to NFC (composed form)
.accessibility({
  label: label.normalize('NFC'),
  language: "fr"
})
```

### 5. **Test with Actual Devices**
```
- Arabic Windows with NVDA
- Chinese macOS with VoiceOver
- Japanese Linux with Orca
- Hebrew Windows with JAWS
- Thai macOS with VoiceOver
```

## Implementation Roadmap

### Phase 1: Language Detection
```typescript
// Detect language from label
function detectLanguage(text: string): string {
  // Use Unicode ranges
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';  // Chinese
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';  // Arabic
  if (/[\u0590-\u05FF]/.test(text)) return 'he';  // Hebrew
  if (/[\u0E00-\u0E7F]/.test(text)) return 'th';  // Thai
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja';  // Japanese
  return 'en';  // Default
}
```

### Phase 2: Direction Detection
```typescript
function detectDirection(text: string): 'ltr' | 'rtl' {
  // RTL languages
  const rtlLangs = ['ar', 'he', 'fa', 'ur'];
  const lang = detectLanguage(text);
  return rtlLangs.includes(lang) ? 'rtl' : 'ltr';
}
```

### Phase 3: Phonetic Generation
```typescript
// For Chinese: convert to pinyin
import { pinyin } from 'pinyin';

function generatePhonetic(text: string, lang: string): string {
  if (lang === 'zh' || lang === 'zh-CN') {
    return pinyin(text, { style: 'tone' }).join(' ');
  }
  // Similar for other languages
  return '';
}
```

### Phase 4: Integration
```typescript
// Auto-detect and set properties
function smartAccessibility(label: string, options: any = {}) {
  const lang = options.language || detectLanguage(label);
  const dir = options.direction || detectDirection(label);
  const phonetic = options.phonetic || generatePhonetic(label, lang);

  return {
    label,
    language: lang,
    direction: dir,
    phonetic: phonetic || undefined,
    ...options
  };
}

// Usage
a.button("提交").onClick(onClick)
  .accessibility(smartAccessibility("提交"));

// Automatically sets:
// language: "zh"
// direction: "ltr"
// phonetic: "tí jiāo"
```

## Resources

### Language Support
- [ISO 639 Language Codes](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)
- [Unicode Scripts](https://www.unicode.org/standard/supported.html)
- [Unihan Database](https://www.unicode.org/charts/unihan.html) (Chinese)

### TTS Engines
- [eSpeak NG](https://github.com/espeak-ng/espeak-ng) (100+ languages)
- [SAPI](https://docs.microsoft.com/en-us/previous-versions/windows/desktop/ms723627(v=vs.85)) (Windows)
- [AVSpeechSynthesizer](https://developer.apple.com/documentation/avfoundation/avspeechsynthesizer) (macOS/iOS)

### Braille Codes
- [Unified English Braille](https://www.ukaaf.org/ueb/)
- [Arabic Braille](https://en.wikipedia.org/wiki/Arabic_Braille)
- [Chinese Braille](https://en.wikipedia.org/wiki/Taiwanese_Braille)
- [Japanese Braille](https://en.wikipedia.org/wiki/Japanese_Braille)

### Testing
- [Google Translate](https://translate.google.com/) - Verify translations
- [Narrator in Different Languages](https://support.microsoft.com/en-us/windows/narrator-languages-and-voices-f1fd32a1-8793-7777-6f9f-eae6c97f8664)
- [VoiceOver Languages](https://support.apple.com/guide/voiceover/change-voiceover-language-mchlp2864/mac)

International accessibility is critical for making Tsyne apps usable worldwide. Proper language, direction, and phonetic support ensures screen readers and braille displays work correctly for all users.
