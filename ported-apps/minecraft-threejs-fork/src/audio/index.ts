// TSYNE: Original used THREE.Audio, THREE.AudioListener, THREE.AudioLoader,
// Vite .ogg imports, and document.addEventListener('pointerlockchange').
// Stubbed — tsyne has no audio support. Same interface so callers compile unchanged.

/* Original code preserved for reference — see git history */

import { BlockType } from '../terrain'

export default class Audio {
  constructor(_camera: any) {}

  disabled = false

  playSound(_type: BlockType) {
    // no-op
  }
}
