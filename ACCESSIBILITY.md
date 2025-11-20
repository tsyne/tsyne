# Accessibility Support in Tsyne

For complete accessibility documentation, see **[docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md)**

## Quick Links

- **[Complete Guide](docs/ACCESSIBILITY.md)** - Comprehensive accessibility reference
- **[Quick Start](docs/ACCESSIBILITY.md#quick-start)** - Get started in 5 minutes
- **[Core API](docs/ACCESSIBILITY.md#core-api)** - AccessibilityOptions & AccessibilityManager
- **[Essential Features](docs/ACCESSIBILITY.md#essential-features)** - Beyond TTS
- **[JavaScript Ecosystem](docs/ACCESSIBILITY.md#javascript-ecosystem-integration)** - Leverage web a11y libraries
- **[Platform Support](docs/ACCESSIBILITY.md#platform-support)** - Screen readers, braille, international
- **[Examples](docs/ACCESSIBILITY.md#examples--patterns)** - Calculator, Tic-Tac-Toe, Forms
- **[Testing](docs/ACCESSIBILITY.md#testing)** - Automated & manual testing

## Examples

- `examples/calculator-fully-accessible.ts` - Full calculator with TTS, keyboard, contrast
- `examples/tictactoe.ts` - Spatial game with 2D navigation and move history
- `examples/accessibility-demo.ts` - Basic TTS demonstration

## Run Examples

```bash
npm run build
npx ts-node examples/calculator-fully-accessible.ts
npx ts-node examples/tictactoe.ts
```

## Key Features

✅ **Text-to-Speech** - Web Speech API + native platform TTS
✅ **Screen Readers** - NVDA, VoiceOver, Orca support
✅ **Braille Displays** - Optimized concise labels
✅ **Keyboard Navigation** - Full keyboard control
✅ **High Contrast** - Visual accessibility
✅ **Internationalization** - RTL, non-Latin alphabets, phonetics
✅ **JavaScript Libraries** - Adapt focus-trap, aria-query, axe-core
✅ **Designer Integration** - Edit accessibility in visual designer

---

**See [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md) for complete documentation.**
