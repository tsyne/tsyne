/** CMYK halftone effect - color separation with angled dot screens */
export function cmykHalftone(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  dotSize: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);

  // CMYK angles (traditional print angles)
  const angles = {
    c: 15,
    m: 75,
    y: 0,
    k: 45
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];

      // Convert RGB to CMYK
      const k = 1 - Math.max(r, g, b) / 255;
      const c = k < 1 ? (1 - r / 255 - k) / (1 - k) : 0;
      const m = k < 1 ? (1 - g / 255 - k) / (1 - k) : 0;
      const yy = k < 1 ? (1 - b / 255 - k) / (1 - k) : 0;

      // Apply halftone to each channel
      let outC = 0, outM = 0, outY = 0, outK = 0;

      for (const [channel, angle] of Object.entries(angles)) {
        const cos = Math.cos(angle * Math.PI / 180);
        const sin = Math.sin(angle * Math.PI / 180);
        const rx = x * cos - y * sin;
        const ry = x * sin + y * cos;

        const dotX = ((rx % dotSize) + dotSize) % dotSize;
        const dotY = ((ry % dotSize) + dotSize) % dotSize;
        const dist = Math.sqrt((dotX - dotSize / 2) ** 2 + (dotY - dotSize / 2) ** 2);

        let value = 0;
        if (channel === 'c') value = c;
        else if (channel === 'm') value = m;
        else if (channel === 'y') value = yy;
        else value = k;

        const dotRadius = value * (dotSize / 2);
        const dot = dist < dotRadius ? 1 : 0;

        if (channel === 'c') outC = dot;
        else if (channel === 'm') outM = dot;
        else if (channel === 'y') outY = dot;
        else outK = dot;
      }

      // Convert back to RGB
      const outR = 255 * (1 - outC) * (1 - outK);
      const outG = 255 * (1 - outM) * (1 - outK);
      const outB = 255 * (1 - outY) * (1 - outK);

      output[idx] = Math.round(outR);
      output[idx + 1] = Math.round(outG);
      output[idx + 2] = Math.round(outB);
      output[idx + 3] = 255;
    }
  }

  return output;
}
