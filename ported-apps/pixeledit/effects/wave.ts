/** Apply wave distortion */
export function wave(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  amplitude: number,
  frequency: number
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(pixels.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = Math.round(amplitude * Math.sin(2 * Math.PI * y * frequency / height));
      const srcX = (x + offset + width) % width;
      const srcI = (y * width + srcX) * 4;
      const dstI = (y * width + x) * 4;
      for (let c = 0; c < 4; c++) {
        result[dstI + c] = pixels[srcI + c];
      }
    }
  }
  return result;
}
