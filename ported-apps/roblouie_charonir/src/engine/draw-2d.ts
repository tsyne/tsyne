// Stub DrawEngine for Tsyne — HUD is rendered via window title instead
class DrawEngine {
  context: any;

  constructor() {
    // Create a minimal stub context that won't crash if accessed
    this.context = {
      clearRect() {},
      fillRect() {},
      fillText() {},
      strokeText() {},
      save() {},
      restore() {},
      translate() {},
      rotate() {},
      scale() {},
      resetTransform() {},
      getImageData(x: number, y: number, w: number, h: number) {
        return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
      },
      putImageData() {},
      drawImage() {},
      measureText() { return { width: 0 }; },
      filter: 'none',
      fillStyle: '#000',
      strokeStyle: '#000',
      lineWidth: 1,
      globalCompositeOperation: 'source-over',
      textAlign: 'start',
      font: '10px sans-serif',
      textBaseline: 'alphabetic',
      canvas: { style: {}, width: 1280, height: 720 },
    };
  }

  clear() {}

  drawText(text: string, font: string, size: number, x: number, y: number, lineWidth = 1, textAlign: 'center' | 'left' | 'right' = 'center', isItalic = true, fill = 'black') {
    // No-op
  }
}

export const draw2d = new DrawEngine();
