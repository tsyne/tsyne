/** Motion blur along an angle */
export function motionBlur(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  angle: number,
  distance: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);
  const radians = (angle * Math.PI) / 180;
  const dx = Math.cos(radians);
  const dy = Math.sin(radians);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;

      for (let d = -distance; d <= distance; d++) {
        const sx = Math.round(x + dx * d);
        const sy = Math.round(y + dy * d);

        if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
          const idx = (sy * width + sx) * 4;
          r += pixels[idx];
          g += pixels[idx + 1];
          b += pixels[idx + 2];
          a += pixels[idx + 3];
          count++;
        }
      }

      const outIdx = (y * width + x) * 4;
      output[outIdx] = r / count;
      output[outIdx + 1] = g / count;
      output[outIdx + 2] = b / count;
      output[outIdx + 3] = a / count;
    }
  }
  return output;
}
