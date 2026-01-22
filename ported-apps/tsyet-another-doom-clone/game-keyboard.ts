/**
 * Mobile Game Keyboard for Doom Clone
 * Touch-friendly controls for movement, rotation, and firing
 *
 * Note: Currently uses onClick (tap) since the Button widget doesn't support
 * touch start/end events yet. For continuous movement, users can tap repeatedly
 * or a future version can add proper touch hold support via bridge events.
 */

import type { App } from '../../core/src/app';
import type { Button } from '../../core/src/widgets/inputs';

export type OnKeyCallback = (key: string, pressed: boolean) => void;

/**
 * Game Keyboard Controller
 * Sends key down/up events to the game
 */
export class GameKeyboardController {
  private onKey: OnKeyCallback;
  private holdIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();

  constructor(onKey: OnKeyCallback) {
    this.onKey = onKey;
  }

  /** Flash button and send a short key press */
  tap(key: string, btn: Button): void {
    this.onKey(key, true);
    btn.withStyle({ importance: 'warning' });
    setTimeout(() => {
      this.onKey(key, false);
      btn.withStyle({ importance: 'medium' });
    }, 80);
  }

  /** Start holding a key (repeated presses) */
  startHold(key: string, btn: Button): void {
    if (this.holdIntervals.has(key)) return;

    this.onKey(key, true);
    btn.withStyle({ importance: 'warning' });

    // Keep sending key-down events while held
    const interval = setInterval(() => {
      this.onKey(key, true);
    }, 50);
    this.holdIntervals.set(key, interval);
  }

  /** Stop holding a key */
  stopHold(key: string, btn: Button): void {
    const interval = this.holdIntervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.holdIntervals.delete(key);
    }
    this.onKey(key, false);
    btn.withStyle({ importance: 'medium' });
  }

  /** Toggle hold state (for tap-to-toggle behavior) */
  toggleHold(key: string, btn: Button): void {
    if (this.holdIntervals.has(key)) {
      this.stopHold(key, btn);
    } else {
      this.startHold(key, btn);
    }
  }

  /** Release all held keys */
  releaseAll(): void {
    this.holdIntervals.forEach((interval, key) => {
      clearInterval(interval);
      this.onKey(key, false);
    });
    this.holdIntervals.clear();
  }

  /** Check if a key is being held */
  isHolding(key: string): boolean {
    return this.holdIntervals.has(key);
  }
}

/**
 * Build the Doom game keyboard UI
 * Layout:
 *       [^]            [FIRE]
 *    [<][v][>]       [<<][>>]
 *
 * - Left D-pad: Movement (tap for single step, or toggle to hold)
 * - Right side: Turn + Fire (tap for single action)
 *
 * Tap a movement key once for a small step.
 * Double-tap or long-press behavior can be added later with touch events.
 */
export function buildGameKeyboard(a: App, k: GameKeyboardController): void {
  a.vbox(() => {
    // Top row: Forward and Fire
    a.hbox(() => {
      // Left spacer
      a.label('');
      // Forward
      a.button('^').onClick((b) => k.tap('w', b));
      // Middle spacers
      a.label('');
      a.label('');
      // Fire button
      a.button('FIRE').onClick((b) => k.tap('Space', b)).withStyle({ importance: 'high' });
    });

    // Bottom row: Left, Back, Right and Turn buttons
    a.hbox(() => {
      // Strafe left
      a.button('<').onClick((b) => k.tap('a', b));
      // Backward
      a.button('v').onClick((b) => k.tap('s', b));
      // Strafe right
      a.button('>').onClick((b) => k.tap('d', b));
      // Spacer
      a.label('');
      // Turn left
      a.button('<<').onClick((b) => k.tap('Left', b));
      // Turn right
      a.button('>>').onClick((b) => k.tap('Right', b));
    });
  });
}

/**
 * Build extended game keyboard with toggle-hold buttons
 * Layout:
 *       [^]            [FIRE]
 *    [<][v][>]       [<<][>>]
 *    -------------------
 *    [FWD] [BACK] [STOP]
 *
 * Top section: Tap controls for fine movement
 * Bottom section: Toggle buttons for continuous movement
 */
export function buildExtendedGameKeyboard(a: App, k: GameKeyboardController): void {
  a.vbox(() => {
    // Tap controls section
    a.hbox(() => {
      a.label('');
      a.button('^').onClick((b) => k.tap('w', b));
      a.label('');
      a.label('');
      a.button('FIRE').onClick((b) => k.tap('Space', b)).withStyle({ importance: 'high' });
    });

    a.hbox(() => {
      a.button('<').onClick((b) => k.tap('a', b));
      a.button('v').onClick((b) => k.tap('s', b));
      a.button('>').onClick((b) => k.tap('d', b));
      a.label('');
      a.button('<<').onClick((b) => k.tap('Left', b));
      a.button('>>').onClick((b) => k.tap('Right', b));
    });

    a.separator();

    // Toggle hold buttons for continuous movement
    a.hbox(() => {
      a.button('FWD').onClick((b) => k.toggleHold('w', b));
      a.button('BACK').onClick((b) => k.toggleHold('s', b));
      a.button('STOP').onClick(() => k.releaseAll()).withStyle({ importance: 'warning' });
      a.label('');
      a.button('<TRN').onClick((b) => k.toggleHold('Left', b));
      a.button('TRN>').onClick((b) => k.toggleHold('Right', b));
    });
  });
}
