// TSYNE: Original used extensive DOM APIs (querySelector, classList, localStorage,
// pointerlockchange, fullscreen, contextmenu). All DOM code is bypassed.
// FPS stub still tracks frame count; HUD is rendered via window title in main.ts.

/* Original code preserved for reference — see git history */

import FPS from './fps'
import Terrain from '../terrain'
import Control from '../control'

export default class UI {
  constructor(_terrain: Terrain, _control: Control) {
    this.fps = new FPS()
  }

  fps: FPS

  update = () => {
    this.fps.update()
  }
}
