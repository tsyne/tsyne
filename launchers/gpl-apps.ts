/**
 * Apps with copyleft licenses (GPL-2.0, GPL-3.0, LGPL, etc.)
 */

import { tryResolve } from './app-resolver';

export const ALL_GPL_APPS = [
  // ported-apps with GPL licenses
  tryResolve('../ported-apps/falling-blocks/falling-blocks'),   // GPL-3.0 (Sander Klootwijk)
  tryResolve('../ported-apps/falling-letters/falling-letters'), // GPL (from Dropping Letters)
  tryResolve('../ported-apps/find-pairs/find-pairs'),           // GPL-2.0 (ChrysaLisp by Chris Hinsley)
  tryResolve('../ported-apps/grand-perspective/grand-perspective'), // GPL-2.0 (Erwin Bonsma)
  tryResolve('../ported-apps/mahjongg/mahjongg'),               // GPL-3.0 (alaskalinuxuser)
  tryResolve('../ported-apps/peg-solitaire/peg-solitaire'),     // GPL-2.0 (ChrysaLisp by Chris Hinsley)
  tryResolve('../ported-apps/slider-puzzle/slider-puzzle'),     // GPL-2.0 (ChrysaLisp by Chris Hinsley)
  tryResolve('../ported-apps/sudoku/sudoku'),                   // GPL-3.0 (alaskalinuxuser)
  tryResolve('../ported-apps/tsyet-another-doom-clone'),        // GPL-3.0 (Nicholas Carlini)
].filter((p): p is string => p !== null);
