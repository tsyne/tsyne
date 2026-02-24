// TSYNE: Original used DOM (document.createElement, document.body.appendChild).
// Stubbed — FPS tracking is handled in main.ts via window title.

/* Original code:
export default class FPS {
  constructor() {
    this.fps.className = 'fps'
    this.fps.innerHTML = `FPS: 60`
    document.body.appendChild(this.fps)
  }
  p1 = performance.now()
  p2 = performance.now()
  gap = performance.now()
  fps = document.createElement('div')
  count = 0
  update = () => { ... }
}
*/

export default class FPS {
  count = 0
  fps = 0
  private gap = performance.now()

  update = () => {
    this.count++
    if (performance.now() - this.gap > 1000) {
      this.fps = this.count
      this.gap = performance.now()
      this.count = 0
    }
  }
}
