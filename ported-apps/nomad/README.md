# Nomad - Time Zone Manager

A time conversion application for managing time across multiple timezones and locations.

Ported from [Fyne Labs' Nomad](https://github.com/fynelabs/nomad) (Go/Fyne) to TypeScript/Tsyne.

## Features

- Track current time in multiple cities/time zones
- Beautiful city cards with background images
- Add locations from 60+ world cities
- Calendar date picker and time slot selector
- Menu button for city actions (delete, photo info)
- Persistent settings across sessions

## Port Notes

### Programming Style Shift

The original Nomad is written in Go using Fyne's imperative widget API. This port uses Tsyne's pseudo-declarative builder pattern:

**Original Go (imperative):**
```go
btn := widget.NewButton("…", nil)
menu := fyne.NewMenu("",
    fyne.NewMenuItem("Delete Place", func() { removeCity(city.ID) }),
    fyne.NewMenuItem("Photo info", func() { showPhotoInfo(city) }),
)
btn.OnTapped = func() {
    pos := fyne.CurrentApp().Driver().AbsolutePositionForObject(btn)
    widget.ShowPopUpMenuAtPosition(menu, canvas, pos)
}
```

**Tsyne port (pseudo-declarative):**
```typescript
this.a.menuButton('…', (menu) => {
  menu.item('Delete Place', () => this.removeCity(city.id));
  menu.item('Photo info', () => this.showPhotoInfo(city));
});
```

The `menuButton` widget encapsulates button + popup menu positioning, reducing boilerplate while maintaining the declarative style used throughout Tsyne.

### Image Placeholders

The original Nomad uses Unsplash for city background images, which requires an API key. This port uses [Picsum Photos](https://picsum.photos/) as a drop-in placeholder service that needs no authentication:

```typescript
// Original would use: https://source.unsplash.com/400x200/?edinburgh
// Port uses: https://picsum.photos/seed/edinburgh/400/200
```

Seeded URLs ensure consistent images per city. For production use with real city photos, add Unsplash API integration with proper authentication.

## Running

```bash
npx tsx nomad.ts
# or
tsyne nomad.ts
```

## Testing

```bash
pnpm test
```

Tests cover:
- `nomad.test.ts` - Unit tests for timezone logic, city management, state
- `nomad-tsyne.test.ts` - TsyneTest UI rendering verification
- `nomad.tsyne-interactivity.test.ts` - Interactive UI flow tests

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 6/10 | `border > vbox(header) + stack(city cards)` nesting. Multiple layout containers |
| **Core declarative** | Fluent method chaining | 5/10 | `.withId()` on 8 elements. No `.when()` or `.bindTo()` |
| **Core declarative** | Programmatic generation | 7/10 | Loop-based city card generation — iterates timezone data to build card widgets dynamically |
| **State architecture** | Observable store | 3/10 | No Observable store. City/timezone data managed directly |
| **Declarative updates** | `.when()` + `.bindTo()` | 1/10 | No reactive bindings. 2 `setText()` calls for time updates |
| **Anti-declarative** | No `removeAll()`/`setContent()` | -2 | 2 `setContent()` calls for UI rebuilds |
| **Testing** | `.withId()` coverage | 5/10 | IDs on key elements but limited coverage |
| **Design** | Separation of concerns | 6/10 | Timezone logic somewhat separated from UI builder |
| | **Overall** | **4/10** | Good programmatic city card generation but no Observable store, no reactive bindings, and uses `setContent()` for rebuilds |

## License

Original: BSD 3-Clause (Fyne Labs)
Port additions: MIT
