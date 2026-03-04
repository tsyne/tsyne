# Charon Jr. HUD Overlay

## Goal
Restore the in-game stats HUD (countdown timer left, score/money right) that the
original browser version rendered as a 2D canvas overlay. Currently stats only
appear in the window title bar.

## Approach: CVG (preferred, deferred)
Use Cosyne-VG programmatic API targeting the existing `GLOverlayApp` overlay.
CVG's `bindText()` + `when()` + `refresh()` give reactive text with zero manual
change-tracking.

```ts
import { cvg } from '../../../../cosyne/src/cvg';
import type { CvgContext } from '../../../../cosyne/src/cvg';

// In onEnter, after hud.reset():
this.hudCtx = cvg(overlayApp, { viewBox: '0 0 960 540', width: 960, height: 540 }, (s) => {
  s.rect({ x: 0, y: 0, width: 960, height: 45, fill: 'rgba(48, 16, 48, 0.5)' });
  s.text({ x: 15, y: 30, fill: '#cccccc', 'font-size': 20 }, 'Time');
  s.text({ x: 70, y: 30, fill: '#ffffff', 'font-size': 28, 'font-weight': 'bold' }, '100.0')
    .bindText(() => hud.timeRemaining.toFixed(1));
  s.text({ x: 900, y: 30, fill: '#ffffff', 'font-size': 28, 'font-weight': 'bold', 'text-anchor': 'end' }, '$0')
    .bindText(() => '$' + (hud.score + (hud.isScoreBonusActive ? hud.currentScoreBonus : 0)));
  s.text({ x: 70, y: 42, fill: '#44ff44', 'font-size': 16 }, '')
    .bindText(() => '+' + hud.currentTimeBonus.toFixed(0))
    .when(() => hud.isTimeBonusActive);
  s.text({ x: 900, y: 42, fill: '#ffff44', 'font-size': 16, 'text-anchor': 'end' }, '')
    .bindText(() => '+$' + hud.currentScoreBonus)
    .when(() => hud.isScoreBonusActive);
});

// In onUpdate, after hud.draw():
if (this.hudCtx) this.hudCtx.refresh();

// In onLeave:
if (overlayApp) overlayApp.clear();
```

### Blockers for CVG approach
1. **Overlay update commands go directly to Go via bridge.send()** — not batched
   with GL commands. Each `updateCanvasText` / `hideWidget` / `showWidget` triggers
   a Fyne canvas refresh that can interfere with the GL shader's paint cycle.
   This caused white flashes on the terrain (exacerbated pre-existing rendering
   artifacts that appear even without the overlay, mostly at world perimeter).

2. **GLOverlayApp.canvasRectangle sizing shim bug** — CVG's `cvg()` factory
   creates a transparent sizing shim via `canvasRectangle({ fillColor: 'transparent' })`.
   The GLOverlayApp skip-check was `!opts.fillColor` which is falsy for the string
   `'transparent'`, so a real full-screen rectangle was created. Fixed in
   `gl-overlay.ts` to also check `=== 'transparent'`.

### Possible fixes to unblock CVG
- Batch overlay commands into the GL flush (send them as part of `executeBatch`)
- Or queue overlay updates in GLOverlayApp and flush them in a single burst
  synchronized with the GL paint cycle
- Or use `requestAnimationFrame`-style timing to send overlay updates only
  between GL frames

## Fallback: direct overlay API (tested, works)
Same pattern as `menu.state.ts` — create widgets once with `overlayApp.canvasText()`,
update in-place with `widget.update({ text })` only when displayed values change.
Lower bridge command rate (~10/sec vs ~60/sec with CVG refresh every 100ms).
Still triggers individual Fyne redraws per update.

## Pre-existing display issues (not overlay-related)
- **White terrain artifacts**: structured white patches on landscape geometry,
  mostly at world perimeter. Present with or without overlay. Likely texture
  binding or GL state issue. More visible under higher frame overhead.
- **Invisible collision barriers**: truck gets stuck moving forward, can reverse
  away. Wall collision faces may extend beyond visible geometry, or heightmap
  edge faces create invisible walls. Also pre-existing.
