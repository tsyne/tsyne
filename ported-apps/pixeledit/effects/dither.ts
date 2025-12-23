/** Floyd-Steinberg dithering */
export function dither(pixels: Uint8ClampedArray, width: number, height: number): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const old = pixels[i + c];
        const newVal = old < 128 ? 0 : 255;
        pixels[i + c] = newVal;
        const error = old - newVal;
        if (x + 1 < width) pixels[i + 4 + c] += error * 7 / 16;
        if (y + 1 < height) {
          if (x > 0) pixels[i + width * 4 - 4 + c] += error * 3 / 16;
          pixels[i + width * 4 + c] += error * 5 / 16;
          if (x + 1 < width) pixels[i + width * 4 + 4 + c] += error * 1 / 16;
        }
      }
    }
  }
}
