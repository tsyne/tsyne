/**
 * Central registry of all Tsyne apps.
 *
 * Each environment (PhoneTop, TabletTop, Desktop) imports this and filters
 * based on compatibility before sorting into folders for presentation.
 *
 * Apps that fail to resolve (missing dependencies, not built, etc.) are
 * silently skipped - this is normal for environment-specific apps.
 *
 * Apps are categorized by license type:
 * - ALL_BSD_OR_MIT_APPS: Apps with permissive licenses (MIT, BSD, Apache 2.0, etc.)
 * - ALL_GPL_APPS: Apps with copyleft licenses (GPL-2.0, GPL-3.0, LGPL, etc.)
 */

function tryResolve(path: string): string | null {
  try { return require.resolve(path); } catch { return null; }
}

/**
 * Apps with permissive licenses (MIT, BSD, Apache 2.0, etc.)
 */
export const ALL_BSD_OR_MIT_APPS = [
  // ported-apps with MIT/BSD/Apache licenses
  tryResolve('./ported-apps/3d-cube/3d-cube'),           // MIT (from Qt3DCube)
  tryResolve('./ported-apps/aranet'),                    // MIT (Aranet4MenuBar Contributors)
  tryResolve('./ported-apps/boing/boing'),               // MIT (ChrysaLisp port - MIT relicensed)
  tryResolve('./ported-apps/calcudoku/calcudoku'),       // MIT (Paul Hammant)
  tryResolve('./ported-apps/chess/chess'),               // MIT (andydotxyz/chess)
  tryResolve('./ported-apps/duckduckgo'),                // Apache 2.0 (Duck Duck Go Inc)
  tryResolve('./ported-apps/edlin/edlin'),               // MIT (Bob Shofner)
  tryResolve('./ported-apps/element'),                   // MIT (Matrix Foundation)
  tryResolve('./ported-apps/expense-tracker'),           // MIT (Rafael Soh)
  tryResolve('./ported-apps/fyles/fyles'),               // MIT (FyshOS/fyles)
  tryResolve('./ported-apps/game-of-life/game-of-life'), // MIT (fyne-io/life)
  tryResolve('./ported-apps/image-viewer/image-viewer'), // MIT (Palexer)
  tryResolve('./ported-apps/nextcloud'),                 // MIT (NextCloud Inc port)
  tryResolve('./ported-apps/notes/notes'),               // MIT (fynelabs/notes)
  tryResolve('./ported-apps/pixeledit/pixeledit'),       // MIT (fynelabs/pixeledit)
  tryResolve('./ported-apps/prime-grid-visualizer/prime-grid-visualizer'), // MIT (Abhrankan Chakrabarti)
  tryResolve('./ported-apps/sample-food-truck'),         // MIT (Apple WWDC22)
  tryResolve('./ported-apps/slydes/slydes'),             // MIT (andydotxyz/slydes)
  tryResolve('./ported-apps/solitaire/solitaire'),       // MIT (fyne-io/solitaire)
  tryResolve('./ported-apps/spherical-snake/spherical-snake'), // MIT (Kevin Albertson)
  tryResolve('./ported-apps/tango-puzzle/tango-puzzle'), // MIT (Paul Hammant)
  tryResolve('./ported-apps/terminal/terminal'),         // MIT (fyne-io/terminal)
  tryResolve('./ported-apps/torus/torus'),               // MIT (Tsyne project)
  tryResolve('./ported-apps/wikipedia'),                 // MIT (Wikimedia Foundation port)
  tryResolve('./ported-apps/zip-puzzle/zip-puzzle'),     // MIT (Paul Hammant)

  // phone-apps (all MIT unless noted)
  tryResolve('./phone-apps/contacts'),
  tryResolve('./phone-apps/disk-tree'),
  tryResolve('./phone-apps/image-resizer'),
  tryResolve('./phone-apps/messages'),
  tryResolve('./phone-apps/nomad'),
  tryResolve('./phone-apps/pomodoro'),
  tryResolve('./phone-apps/settings'),

  // examples (all MIT)
  tryResolve('./examples/02-counter'),
  tryResolve('./examples/15-tip-calculator'),
  tryResolve('./examples/16-password-generator'),
  tryResolve('./examples/17-stopwatch'),
  tryResolve('./examples/18-dice-roller'),
  tryResolve('./examples/20-rock-paper-scissors'),
  tryResolve('./examples/21-quiz-app'),
  tryResolve('./examples/animation-elegant'),
  tryResolve('./examples/calculator'),
  tryResolve('./examples/daily-checklist-mvc'),
  tryResolve('./examples/daily-checklist'),
  tryResolve('./examples/full-calculator'),
  tryResolve('./examples/sandbox-breakout'),
  tryResolve('./examples/todomvc'),
].filter((p): p is string => p !== null);

/**
 * Apps with copyleft licenses (GPL-2.0, GPL-3.0, LGPL, etc.)
 */
export const ALL_GPL_APPS = [
  // ported-apps with GPL licenses
  tryResolve('./ported-apps/falling-blocks/falling-blocks'),   // GPL-3.0 (Sander Klootwijk)
  tryResolve('./ported-apps/falling-letters/falling-letters'), // GPL (from Dropping Letters)
  tryResolve('./ported-apps/find-pairs/find-pairs'),           // GPL-2.0 (ChrysaLisp by Chris Hinsley)
  tryResolve('./ported-apps/grand-perspective/grand-perspective'), // GPL-2.0 (Erwin Bonsma)
  tryResolve('./ported-apps/mahjongg/mahjongg'),               // GPL-3.0 (alaskalinuxuser)
  tryResolve('./ported-apps/peg-solitaire/peg-solitaire'),     // GPL-2.0 (ChrysaLisp by Chris Hinsley)
  tryResolve('./ported-apps/slider-puzzle/slider-puzzle'),     // GPL-2.0 (ChrysaLisp by Chris Hinsley)
  tryResolve('./ported-apps/sudoku/sudoku'),                   // GPL-3.0 (alaskalinuxuser)
  tryResolve('./ported-apps/tsyet-another-doom-clone'),        // GPL-3.0 (Nicholas Carlini)
].filter((p): p is string => p !== null);

/**
 * All apps combined (backward compatibility)
 */
export const ALL_APPS = [...ALL_BSD_OR_MIT_APPS, ...ALL_GPL_APPS];
