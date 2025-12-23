/** Rotate image 90 degrees counter-clockwise */
export function rotate90CCW(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): { pixels: Uint8ClampedArray; width: number; height: number } {
  const result = new Uint8ClampedArray(pixels.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcI = (y * width + x) * 4;
      const dstX = y;
      const dstY = width - 1 - x;
      const dstI = (dstY * height + dstX) * 4;
      for (let c = 0; c < 4; c++) {
        result[dstI + c] = pixels[srcI + c];
      }
    }
  }
  return { pixels: result, width: height, height: width };
}
