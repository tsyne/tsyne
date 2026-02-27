/**
 * Software-rasterized CanvasRenderingContext2D polyfill for Node.js.
 * Supports the subset needed by Charon Jr.'s texture-maker.ts and helpers.ts:
 *   fillStyle, fillRect, clearRect, getImageData, putImageData,
 *   drawImage (canvas-to-canvas blit), globalCompositeOperation
 *   (source-over, screen, color-dodge, difference),
 *   filter (contrast), save/restore, resetTransform, scale,
 *   fillText (simplified solid rect), textAlign, font, textBaseline
 */

interface SavedState {
  fillStyle: string;
  globalCompositeOperation: string;
  filter: string;
  scaleX: number;
  scaleY: number;
  translateX: number;
  translateY: number;
  textAlign: string;
  font: string;
  textBaseline: string;
}

export class SoftCanvas2D {
  canvas: { width: number; height: number; style: any; getContext: (t: string) => SoftCanvas2D | null };
  private _imageData: Uint8ClampedArray;
  private _width: number;
  private _height: number;

  fillStyle: string = '#000';
  strokeStyle: string = '#000';
  lineWidth: number = 1;
  globalCompositeOperation: string = 'source-over';
  filter: string = 'none';
  textAlign: string = 'start';
  font: string = '10px sans-serif';
  textBaseline: string = 'alphabetic';

  private _scaleX = 1;
  private _scaleY = 1;
  private _translateX = 0;
  private _translateY = 0;
  private _stateStack: SavedState[] = [];

  constructor(width: number, height: number) {
    this._width = width;
    this._height = height;
    this._imageData = new Uint8ClampedArray(width * height * 4);
    const self = this;
    this.canvas = {
      width,
      height,
      style: {},
      getContext(type: string) { return type === '2d' ? self : null; },
    };
  }

  /** Resize the backing buffer (called when canvas.width/height changes) */
  _resize(w: number, h: number) {
    this._width = w;
    this._height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this._imageData = new Uint8ClampedArray(w * h * 4);
  }

  save() {
    this._stateStack.push({
      fillStyle: this.fillStyle,
      globalCompositeOperation: this.globalCompositeOperation,
      filter: this.filter,
      scaleX: this._scaleX,
      scaleY: this._scaleY,
      translateX: this._translateX,
      translateY: this._translateY,
      textAlign: this.textAlign,
      font: this.font,
      textBaseline: this.textBaseline,
    });
  }

  restore() {
    const s = this._stateStack.pop();
    if (s) {
      this.fillStyle = s.fillStyle;
      this.globalCompositeOperation = s.globalCompositeOperation;
      this.filter = s.filter;
      this._scaleX = s.scaleX;
      this._scaleY = s.scaleY;
      this._translateX = s.translateX;
      this._translateY = s.translateY;
      this.textAlign = s.textAlign;
      this.font = s.font;
      this.textBaseline = s.textBaseline;
    }
  }

  resetTransform() {
    this._scaleX = 1;
    this._scaleY = 1;
    this._translateX = 0;
    this._translateY = 0;
  }

  scale(sx: number, sy: number) {
    this._scaleX *= sx;
    this._scaleY *= sy;
  }

  translate(tx: number, ty: number) {
    this._translateX += tx * this._scaleX;
    this._translateY += ty * this._scaleY;
  }

  rotate(_angle: number) {
    // No-op for this simplified polyfill
  }

  clearRect(x: number, y: number, w: number, h: number) {
    const [x0, y0, x1, y1] = this._clampRect(x, y, w, h);
    for (let py = y0; py < y1; py++) {
      const base = py * this._width * 4;
      for (let px = x0; px < x1; px++) {
        const i = base + px * 4;
        this._imageData[i] = 0;
        this._imageData[i + 1] = 0;
        this._imageData[i + 2] = 0;
        this._imageData[i + 3] = 0;
      }
    }
  }

  fillRect(x: number, y: number, w: number, h: number) {
    const [r, g, b, a] = parseColor(this.fillStyle);
    const [x0, y0, x1, y1] = this._clampRect(x, y, w, h);
    const blend = getBlendFunc(this.globalCompositeOperation);
    for (let py = y0; py < y1; py++) {
      const base = py * this._width * 4;
      for (let px = x0; px < x1; px++) {
        const i = base + px * 4;
        this._blendPixel(i, r, g, b, a, blend);
      }
    }
  }

  fillText(_text: string, _x: number, _y: number, _maxWidth?: number) {
    // Simplified: draw a small colored rectangle as a placeholder
    // Real text rendering isn't feasible in pure JS without a font engine
    const fontSize = parseInt(this.font) || 10;
    const textWidth = Math.min(_text.length * fontSize * 0.6, this._width);
    let tx = _x;
    if (this.textAlign === 'center') tx -= textWidth / 2;
    else if (this.textAlign === 'right') tx -= textWidth;

    // Apply transforms
    const sx = this._scaleX;
    const sy = this._scaleY;
    const rx = Math.round(tx * sx + this._translateX);
    const ry = Math.round(_y * sy + this._translateY - fontSize * Math.abs(sy));
    const rw = Math.round(textWidth * Math.abs(sx));
    const rh = Math.round(fontSize * Math.abs(sy));

    const [r, g, b, a] = parseColor(this.fillStyle);
    const [x0, y0, x1, y1] = this._clampRectRaw(rx, ry, rw, rh);
    const blend = getBlendFunc(this.globalCompositeOperation);
    for (let py = y0; py < y1; py++) {
      const base = py * this._width * 4;
      for (let px = x0; px < x1; px++) {
        const i = base + px * 4;
        this._blendPixel(i, r, g, b, a, blend);
      }
    }
  }

  strokeText(_text: string, _x: number, _y: number, _maxWidth?: number) {
    // No-op
  }

  getImageData(sx: number, sy: number, sw: number, sh: number): any {
    const ImageDataCtor = (globalThis as any).ImageData;
    const result = ImageDataCtor
      ? new ImageDataCtor(sw, sh)
      : { width: sw, height: sh, data: new Uint8ClampedArray(sw * sh * 4) };
    for (let y = 0; y < sh; y++) {
      const srcY = sy + y;
      if (srcY < 0 || srcY >= this._height) continue;
      for (let x = 0; x < sw; x++) {
        const srcX = sx + x;
        if (srcX < 0 || srcX >= this._width) continue;
        const si = (srcY * this._width + srcX) * 4;
        const di = (y * sw + x) * 4;
        result.data[di] = this._imageData[si];
        result.data[di + 1] = this._imageData[si + 1];
        result.data[di + 2] = this._imageData[si + 2];
        result.data[di + 3] = this._imageData[si + 3];
      }
    }
    // Apply filter if active
    if (this.filter !== 'none') {
      applyFilter(result.data, this.filter);
    }
    return result;
  }

  putImageData(imageData: any, dx: number, dy: number, dirtyX?: number, dirtyY?: number, dirtyWidth?: number, dirtyHeight?: number) {
    const sx = dirtyX ?? 0;
    const sy = dirtyY ?? 0;
    const sw = dirtyWidth ?? imageData.width;
    const sh = dirtyHeight ?? imageData.height;
    for (let y = 0; y < sh; y++) {
      const dstY = dy + y;
      if (dstY < 0 || dstY >= this._height) continue;
      for (let x = 0; x < sw; x++) {
        const dstX = dx + x;
        if (dstX < 0 || dstX >= this._width) continue;
        const si = ((sy + y) * imageData.width + (sx + x)) * 4;
        const di = (dstY * this._width + dstX) * 4;
        this._imageData[di] = imageData.data[si];
        this._imageData[di + 1] = imageData.data[si + 1];
        this._imageData[di + 2] = imageData.data[si + 2];
        this._imageData[di + 3] = imageData.data[si + 3];
      }
    }
  }

  drawImage(source: any, sx: number, sy: number, sw?: number, sh?: number) {
    // source is another SoftCanvas2D.canvas or SoftCanvas2D
    const srcCtx: SoftCanvas2D | undefined = source.getContext?.('2d') ?? source;
    if (!srcCtx || !srcCtx._imageData) return;

    const srcW = sw ?? source.width ?? srcCtx._width;
    const srcH = sh ?? source.height ?? srcCtx._height;
    // When called as drawImage(canvas, dx, dy, dw, dh), sx/sy are actually dx/dy
    const dx = sx;
    const dy = sy;
    const dw = srcW;
    const dh = srcH;

    const blend = getBlendFunc(this.globalCompositeOperation);

    // Simple blit (no scaling between src and dst, or nearest-neighbor if sizes differ)
    for (let y = 0; y < dh; y++) {
      const srcY = Math.floor(y * srcCtx._height / dh);
      const dstY = dy + y;
      if (dstY < 0 || dstY >= this._height || srcY < 0 || srcY >= srcCtx._height) continue;
      for (let x = 0; x < dw; x++) {
        const srcX = Math.floor(x * srcCtx._width / dw);
        const dstX = dx + x;
        if (dstX < 0 || dstX >= this._width || srcX < 0 || srcX >= srcCtx._width) continue;
        const si = (srcY * srcCtx._width + srcX) * 4;
        const di = (dstY * this._width + dstX) * 4;
        const sr = srcCtx._imageData[si];
        const sg = srcCtx._imageData[si + 1];
        const sb = srcCtx._imageData[si + 2];
        const sa = srcCtx._imageData[si + 3];
        this._blendPixel(di, sr, sg, sb, sa, blend);
      }
    }
  }

  measureText(text: string) {
    const fontSize = parseInt(this.font) || 10;
    return { width: text.length * fontSize * 0.6 };
  }

  // --- internal helpers ---

  private _clampRect(x: number, y: number, w: number, h: number): [number, number, number, number] {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this._width, Math.ceil(x + w));
    const y1 = Math.min(this._height, Math.ceil(y + h));
    return [x0, y0, x1, y1];
  }

  private _clampRectRaw(x: number, y: number, w: number, h: number): [number, number, number, number] {
    const x0 = Math.max(0, Math.min(this._width, x));
    const y0 = Math.max(0, Math.min(this._height, y));
    const x1 = Math.max(0, Math.min(this._width, x + w));
    const y1 = Math.max(0, Math.min(this._height, y + h));
    return [x0, y0, x1, y1];
  }

  private _blendPixel(
    i: number,
    sr: number, sg: number, sb: number, sa: number,
    blend: BlendFunc
  ) {
    const dr = this._imageData[i];
    const dg = this._imageData[i + 1];
    const db = this._imageData[i + 2];
    const da = this._imageData[i + 3];
    const [r, g, b, a] = blend(sr, sg, sb, sa, dr, dg, db, da);
    this._imageData[i] = r;
    this._imageData[i + 1] = g;
    this._imageData[i + 2] = b;
    this._imageData[i + 3] = a;
  }
}

// Blend function type: (sr, sg, sb, sa, dr, dg, db, da) => [r, g, b, a]
type BlendFunc = (sr: number, sg: number, sb: number, sa: number,
                  dr: number, dg: number, db: number, da: number) => [number, number, number, number];

function getBlendFunc(mode: string): BlendFunc {
  switch (mode) {
    case 'screen':
      return (sr, sg, sb, sa, dr, dg, db, da) => {
        const af = sa / 255;
        return [
          Math.round(dr + (255 - ((255 - dr) * (255 - sr)) / 255 - dr) * af),
          Math.round(dg + (255 - ((255 - dg) * (255 - sg)) / 255 - dg) * af),
          Math.round(db + (255 - ((255 - db) * (255 - sb)) / 255 - db) * af),
          Math.min(255, da + sa - (da * sa / 255)),
        ];
      };
    case 'color-dodge':
      return (sr, sg, sb, sa, dr, dg, db, da) => {
        const dodge = (d: number, s: number) => Math.min(255, Math.round(d * 255 / Math.max(1, 255 - s)));
        const af = sa / 255;
        return [
          Math.round(dr + (dodge(dr, sr) - dr) * af),
          Math.round(dg + (dodge(dg, sg) - dg) * af),
          Math.round(db + (dodge(db, sb) - db) * af),
          Math.min(255, da + sa - (da * sa / 255)),
        ];
      };
    case 'difference':
      return (sr, sg, sb, sa, dr, dg, db, da) => {
        const af = sa / 255;
        return [
          Math.round(dr + (Math.abs(dr - sr) - dr) * af),
          Math.round(dg + (Math.abs(dg - sg) - dg) * af),
          Math.round(db + (Math.abs(db - sb) - db) * af),
          Math.min(255, da + sa - (da * sa / 255)),
        ];
      };
    default: // source-over
      return (sr, sg, sb, sa, dr, dg, db, da) => {
        if (sa === 255) return [sr, sg, sb, 255];
        if (sa === 0) return [dr, dg, db, da];
        const af = sa / 255;
        const invAf = 1 - af;
        const outA = sa + da * invAf;
        if (outA === 0) return [0, 0, 0, 0];
        return [
          Math.round((sr * af + dr * da / 255 * invAf) * 255 / outA),
          Math.round((sg * af + dg * da / 255 * invAf) * 255 / outA),
          Math.round((sb * af + db * da / 255 * invAf) * 255 / outA),
          Math.round(outA),
        ];
      };
  }
}

function applyFilter(data: Uint8ClampedArray, filter: string) {
  // Parse contrast(N%)
  const contrastMatch = filter.match(/contrast\((\d+)%?\)/);
  if (contrastMatch) {
    const factor = parseInt(contrastMatch[1]) / 100;
    for (let i = 0; i < data.length; i += 4) {
      data[i]     = Math.max(0, Math.min(255, Math.round((data[i] - 128) * factor + 128)));
      data[i + 1] = Math.max(0, Math.min(255, Math.round((data[i + 1] - 128) * factor + 128)));
      data[i + 2] = Math.max(0, Math.min(255, Math.round((data[i + 2] - 128) * factor + 128)));
    }
  }
  // Parse grayscale(N%)
  const grayscaleMatch = filter.match(/grayscale\((\d+)%?\)/);
  if (grayscaleMatch) {
    const amount = parseInt(grayscaleMatch[1]) / 100;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i]     = Math.round(data[i] + (gray - data[i]) * amount);
      data[i + 1] = Math.round(data[i + 1] + (gray - data[i + 1]) * amount);
      data[i + 2] = Math.round(data[i + 2] + (gray - data[i + 2]) * amount);
    }
  }
}

/** Parse CSS color string to [r, g, b, a] (0-255) */
function parseColor(color: string): [number, number, number, number] {
  if (!color) return [0, 0, 0, 255];

  // rgba(r,g,b,a) or rgb(r,g,b)
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    return [
      parseInt(rgbaMatch[1]),
      parseInt(rgbaMatch[2]),
      parseInt(rgbaMatch[3]),
      rgbaMatch[4] ? Math.round(parseFloat(rgbaMatch[4]) * 255) : 255,
    ];
  }

  // Named colors
  if (color === 'black') return [0, 0, 0, 255];
  if (color === 'white') return [255, 255, 255, 255];
  if (color === 'red') return [255, 0, 0, 255];
  if (color === 'transparent') return [0, 0, 0, 0];

  // Hex: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return [r, g, b, 255];
    }
    if (hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const a = parseInt(hex[3] + hex[3], 16);
      return [r, g, b, a];
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return [r, g, b, 255];
    }
    if (hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = parseInt(hex.slice(6, 8), 16);
      return [r, g, b, a];
    }
  }

  return [0, 0, 0, 255];
}
